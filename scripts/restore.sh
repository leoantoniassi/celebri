#!/usr/bin/env bash
# ============================================================
# Restauração de backup do Celebri
# ============================================================
# Uso:
#   scripts/restore.sh --arquivo <db.dump[.enc]> --banco <alvo> [--confirmar]
#                      [--uploads <uploads.tar.gz[.enc]> --uploads-destino <pasta>]
#
# Segurança:
#   - Banco alvo NOVO (não existe): é criado e restaurado, sem --confirmar.
#   - Banco alvo JÁ EXISTENTE: exige --confirmar (apaga e recria os objetos).
#   - Alvo = banco de PRODUÇÃO (DB_NAME / banco do DATABASE_URL): exige --confirmar e
#     digitar "RESTAURAR <banco>" (ou RESTORE_CONFIRMA_PRODUCAO=<banco> sem terminal).
#     Antes disso, rode backup.sh. Recomendado: restaurar num banco novo e conferir.
#   - Uploads são extraídos só em --uploads-destino (nunca direto no volume da aplicação).
# Arquivos .enc exigem BACKUP_PASSPHRASE. Modos de conexão: ver scripts/_comum.sh.
# ============================================================
set -euo pipefail
umask 077
# shellcheck source=scripts/_comum.sh
. "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"

ARQUIVO=""; ALVO=""; CONFIRMAR=0; UPLOADS=""; UPLOADS_DEST=""
while [ $# -gt 0 ]; do
  case "$1" in
    --arquivo) ARQUIVO="${2:-}"; shift 2;;
    --banco) ALVO="${2:-}"; shift 2;;
    --confirmar) CONFIRMAR=1; shift;;
    --uploads) UPLOADS="${2:-}"; shift 2;;
    --uploads-destino) UPLOADS_DEST="${2:-}"; shift 2;;
    --ajuda|-h|--help) sed -n '2,19p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0;;
    *) falhar "argumento desconhecido: $1 (use --ajuda)";;
  esac
done

[ -n "$ARQUIVO" ] || falhar "informe --arquivo."
[ -n "$ALVO" ] || falhar "informe --banco (nome do banco alvo)."
validar_nome_banco "$ALVO"
[ -z "$UPLOADS" ] || [ -n "$UPLOADS_DEST" ] || falhar "--uploads exige --uploads-destino <pasta>."

exigir_ferramentas
carregar_config_db
conferir_checksum "$ARQUIVO"

# Confere a senha/arquivo ANTES de criar ou alterar qualquer banco (dump -Fc começa com "PGDMP").
MAGICO="$(ler_arquivo_backup "$ARQUIVO" 2>/dev/null | head -c 5 || true)"
[ "$MAGICO" = PGDMP ] || falhar "arquivo ilegível: não é um dump do PostgreSQL ou a BACKUP_PASSPHRASE está errada."

EXISTE=0; banco_existe "$ALVO" && EXISTE=1

if [ "$ALVO" = "$DB_NAME" ]; then
  [ "$CONFIRMAR" -eq 1 ] || falhar "'$ALVO' é o banco de PRODUÇÃO. Use --confirmar (e prefira restaurar num banco novo)."
  FRASE="RESTAURAR $ALVO"
  if [ -t 0 ]; then
    echo "ATENÇÃO: isto SOBRESCREVE o banco de produção '$ALVO'. Digite: $FRASE"
    read -r RESPOSTA
    [ "$RESPOSTA" = "$FRASE" ] || falhar "confirmação não confere; nada foi alterado."
  else
    [ "${RESTORE_CONFIRMA_PRODUCAO:-}" = "$ALVO" ] || falhar "sem terminal: defina RESTORE_CONFIRMA_PRODUCAO=$ALVO para confirmar a restauração em produção."
  fi
elif [ "$EXISTE" -eq 1 ] && [ "$CONFIRMAR" -ne 1 ]; then
  falhar "o banco '$ALVO' já existe. Use --confirmar para sobrescrevê-lo ou escolha outro nome."
fi

OPCOES=()
if [ "$EXISTE" -eq 1 ]; then
  OPCOES=(--clean --if-exists)
  info "Sobrescrevendo objetos do banco existente '$ALVO'..."
else
  info "Criando banco '$ALVO'..."
  db_psql postgres -c "CREATE DATABASE \"$ALVO\"" >/dev/null
fi

info "Restaurando $(basename "$ARQUIVO") em '$ALVO'..."
if ! ler_arquivo_backup "$ARQUIVO" | db_restore "$ALVO" ${OPCOES[@]+"${OPCOES[@]}"}; then
  erro "falha na restauração."
  if [ "$EXISTE" -eq 0 ]; then
    db_psql postgres -c "DROP DATABASE IF EXISTS \"$ALVO\"" >/dev/null 2>&1 && erro "banco novo '$ALVO' removido (estava incompleto)."
  else
    erro "o banco '$ALVO' pode estar incompleto; restaure de novo ou use outro backup."
  fi
  exit 1
fi
info "Banco restaurado em '$ALVO'."

if [ -n "$UPLOADS" ]; then
  mkdir -p "$UPLOADS_DEST"
  info "Extraindo uploads em '$UPLOADS_DEST'..."
  conferir_checksum "$UPLOADS"
  ler_arquivo_backup "$UPLOADS" | tar -xzf - -C "$UPLOADS_DEST"
  info "Uploads extraídos. Copie para o volume da aplicação conforme docs/lgpd/politica-de-backup.md."
fi
info "Restauração concluída. Valide com: scripts/verificar-backup.sh"
