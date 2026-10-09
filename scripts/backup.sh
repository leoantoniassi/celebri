#!/usr/bin/env bash
# ============================================================
# Backup do Celebri: banco (pg_dump -Fc) + uploads/documentos (tar.gz)
# ============================================================
# Uso:   scripts/backup.sh [--sem-uploads] [--ajuda]
# Saída: $BACKUP_DIR/celebri-db-AAAAMMDD-HHMMSS.dump[.enc] (+ .sha256)
#        $BACKUP_DIR/celebri-uploads-AAAAMMDD-HHMMSS.tar.gz[.enc]
# Variáveis:
#   BACKUP_DIR              destino (padrão: ./backups; mantenha FORA do servidor da aplicação)
#   BACKUP_RETENCAO_DIAS    apaga backups mais antigos que N dias (padrão 30; 0 desliga)
#   BACKUP_PASSPHRASE       se definida, criptografa (AES-256-CBC + PBKDF2) e grava *.enc
#   DATABASE_URL            usa pg_dump do host; senão, `docker compose exec` no serviço db
#   UPLOADS_DIR             pasta local de uploads no modo DATABASE_URL (padrão backend/uploads)
# Arquivos saem com permissão 600 (diretório 700). Agende via cron (docs/lgpd/politica-de-backup.md).
# ============================================================
set -euo pipefail
umask 077
shopt -s lastpipe # a função gravar roda no shell principal (registra parciais para limpeza)
# shellcheck source=scripts/_comum.sh
. "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"

COM_UPLOADS=1
for arg in "$@"; do
  case "$arg" in
    --sem-uploads) COM_UPLOADS=0;;
    --ajuda|-h|--help) sed -n '2,17p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0;;
    *) falhar "argumento desconhecido: $arg (use --ajuda)";;
  esac
done

RETENCAO="${BACKUP_RETENCAO_DIAS:-30}"
[[ "$RETENCAO" =~ ^[0-9]+$ ]] || falhar "BACKUP_RETENCAO_DIAS deve ser um inteiro >= 0."

exigir_ferramentas
carregar_config_db
[ -z "${BACKUP_PASSPHRASE:-}" ] || command -v openssl >/dev/null || falhar "'openssl' não encontrado (necessário para criptografar)."

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
SUFIXO=""; [ -z "${BACKUP_PASSPHRASE:-}" ] || SUFIXO=".enc"
[ -n "${BACKUP_PASSPHRASE:-}" ] || info "aviso: BACKUP_PASSPHRASE não definida; backup SEM criptografia (guarde em local protegido)."

PARCIAIS=()
limpar_parciais() { [ "${#PARCIAIS[@]}" -eq 0 ] || rm -f -- "${PARCIAIS[@]}"; }
trap limpar_parciais EXIT

# grava <destino> : lê o conteúdo do stdin, cifra se houver senha, grava de forma atômica e gera o .sha256
gravar() {
  local destino="$1" parcial="$1.partial"
  PARCIAIS+=("$parcial")
  if [ -n "${BACKUP_PASSPHRASE:-}" ]; then cifrar > "$parcial"; else cat > "$parcial"; fi
  [ -s "$parcial" ] || falhar "backup vazio: $destino"
  chmod 600 "$parcial"
  mv -f -- "$parcial" "$destino"
  (cd "$BACKUP_DIR" && sha256sum "$(basename "$destino")" > "$(basename "$destino").sha256")
  chmod 600 "$destino.sha256"
  info "gerado: $destino ($(du -h "$destino" | cut -f1))"
}

# ── Banco ────────────────────────────────────────────────────
info "Backup do banco '$DB_NAME' (modo $(modo_db))..."
db_dump "$DB_NAME" | gravar "$BACKUP_DIR/celebri-db-$TS.dump$SUFIXO"

# ── Uploads / documentos ─────────────────────────────────────
if [ "$COM_UPLOADS" -eq 1 ]; then
  info "Backup dos uploads/documentos..."
  if [ "$(modo_db)" = url ]; then
    PASTA="${UPLOADS_DIR:-$RAIZ/backend/uploads}"
    if [ -d "$PASTA" ]; then tar -C "$PASTA" -czf - . | gravar "$BACKUP_DIR/celebri-uploads-$TS.tar.gz$SUFIXO"
    else info "aviso: pasta de uploads '$PASTA' não existe; pulando."; fi
  else
    (cd "$RAIZ" && docker compose exec -T "$SERVICO_API" tar -C /app/uploads -czf - .) | gravar "$BACKUP_DIR/celebri-uploads-$TS.tar.gz$SUFIXO"
  fi
fi

# ── Retenção ─────────────────────────────────────────────────
if [ "$RETENCAO" -gt 0 ]; then
  REMOVIDOS="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'celebri-*' -mtime "+$RETENCAO" -print -delete | wc -l)"
  info "Retenção de $RETENCAO dia(s): $REMOVIDOS arquivo(s) antigo(s) removido(s)."
fi
info "Backup concluído."
