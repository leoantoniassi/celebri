#!/usr/bin/env bash
# ============================================================
# Funções compartilhadas por backup.sh, restore.sh e verificar-backup.sh
# (não executar diretamente). Modos de acesso ao banco:
#   - DATABASE_URL definida -> usa pg_dump/pg_restore/psql do host;
#   - caso contrário        -> `docker compose exec` no serviço "db".
# ============================================================

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$RAIZ/backups}"
SERVICO_DB="${SERVICO_DB:-db}"
SERVICO_API="${SERVICO_API:-backend}"
PBKDF2_ITER=600000

erro() { echo "ERRO: $*" >&2; }
info() { echo "[$(date +%H:%M:%S)] $*"; }
falhar() { erro "$*"; exit 1; }

# Lê CHAVE do ambiente ou do .env da raiz (sem executar o arquivo).
ler_env() {
  local chave="$1" valor="${!1:-}"
  if [ -z "$valor" ] && [ -f "$RAIZ/.env" ]; then
    valor="$(grep -E "^${chave}=" "$RAIZ/.env" | tail -n1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")" || true
  fi
  printf '%s' "$valor"
}

modo_db() { if [ -n "${DATABASE_URL:-}" ]; then echo url; else echo compose; fi; }

exigir_ferramentas() {
  if [ "$(modo_db)" = url ]; then
    for f in pg_dump pg_restore psql; do command -v "$f" >/dev/null || falhar "'$f' não encontrado (instale o cliente PostgreSQL ou use o modo docker compose)."; done
  else
    command -v docker >/dev/null || falhar "'docker' não encontrado (ou defina DATABASE_URL)."
  fi
}

carregar_config_db() {
  if [ "$(modo_db)" = compose ]; then
    DB_USER="$(ler_env DB_USER)"; DB_NAME="$(ler_env DB_NAME)"
    [ -n "$DB_USER" ] && [ -n "$DB_NAME" ] || falhar "defina DB_USER e DB_NAME (ambiente ou .env) ou use DATABASE_URL."
  else
    DB_NAME="${DATABASE_URL%%\?*}"; DB_NAME="${DB_NAME##*/}"
    [ -n "$DB_NAME" ] || falhar "DATABASE_URL sem nome de banco."
  fi
}

# URL com outro nome de banco (preserva credenciais e ?sslmode=...).
url_com_banco() {
  local base="${DATABASE_URL%%\?*}" resto=""
  case "$DATABASE_URL" in *\?*) resto="?${DATABASE_URL#*\?}";; esac
  printf '%s/%s%s' "${base%/*}" "$1" "$resto"
}

# Comandos de banco; o 1º argumento é o banco alvo.
db_dump()    { local banco="$1"; if [ "$(modo_db)" = url ]; then pg_dump -Fc --no-owner --dbname "$(url_com_banco "$banco")"; else (cd "$RAIZ" && docker compose exec -T "$SERVICO_DB" pg_dump -U "$DB_USER" -d "$banco" -Fc --no-owner); fi; }
db_restore() { local banco="$1"; shift; if [ "$(modo_db)" = url ]; then pg_restore --no-owner --exit-on-error ${1+"$@"} --dbname "$(url_com_banco "$banco")"; else (cd "$RAIZ" && docker compose exec -T "$SERVICO_DB" pg_restore -U "$DB_USER" -d "$banco" --no-owner --exit-on-error ${1+"$@"}); fi; }
db_psql()    { local banco="$1"; shift; if [ "$(modo_db)" = url ]; then psql -X -v ON_ERROR_STOP=1 -At --dbname "$(url_com_banco "$banco")" "$@"; else (cd "$RAIZ" && docker compose exec -T "$SERVICO_DB" psql -X -v ON_ERROR_STOP=1 -At -U "$DB_USER" -d "$banco" "$@"); fi; }

# Nome seguro de banco: evita injeção em CREATE/DROP DATABASE.
validar_nome_banco() { [[ "$1" =~ ^[a-zA-Z_][a-zA-Z0-9_]{0,62}$ ]] || falhar "nome de banco inválido: '$1' (use letras, números e _)."; }

banco_existe() { [ "$(db_psql postgres -c "SELECT 1 FROM pg_database WHERE datname = '$1'")" = 1 ]; }

# Criptografia opcional (AES-256-CBC + PBKDF2). A senha vai por variável de ambiente, nunca por argumento.
cifrar()    { openssl enc -aes-256-cbc -pbkdf2 -iter "$PBKDF2_ITER" -salt -pass env:BACKUP_PASSPHRASE; }
decifrar()  { openssl enc -d -aes-256-cbc -pbkdf2 -iter "$PBKDF2_ITER" -pass env:BACKUP_PASSPHRASE; }

# Emite o conteúdo (decifrado, se .enc) de um arquivo de backup.
ler_arquivo_backup() {
  local arq="$1"
  [ -f "$arq" ] || falhar "arquivo não encontrado: $arq"
  case "$arq" in
    *.enc)
      [ -n "${BACKUP_PASSPHRASE:-}" ] || falhar "arquivo criptografado: defina BACKUP_PASSPHRASE."
      command -v openssl >/dev/null || falhar "'openssl' não encontrado."
      decifrar < "$arq";;
    *) cat "$arq";;
  esac
}

# Confere o .sha256 ao lado do arquivo, quando existir.
conferir_checksum() {
  local arq="$1"
  if [ -f "$arq.sha256" ]; then
    if (cd "$(dirname "$arq")" && sha256sum -c --status "$(basename "$arq").sha256"); then info "checksum SHA-256 confere."; else falhar "checksum SHA-256 NÃO confere: $arq"; fi
  else
    info "aviso: sem arquivo .sha256 para conferir."
  fi
}
