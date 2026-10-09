#!/usr/bin/env bash
# ============================================================
# Verificação de backup: restaura o dump mais recente (ou o informado) num banco
# TEMPORÁRIO, confere a contagem de tabelas e as tabelas-chave, e remove o banco.
# Uso:   scripts/verificar-backup.sh [arquivo.dump[.enc]]
# Variáveis: BACKUP_DIR, BACKUP_PASSPHRASE (se .enc), TABELAS_MINIMO (padrão: nº de
#            tabelas do banco de produção; se inacessível, 15).
# Faça isto TODO TRIMESTRE e anote o resultado (docs/lgpd/politica-de-backup.md).
# Nunca toca no banco de produção: só cria/remove 'celebri_verifica_<data>'.
# ============================================================
set -euo pipefail
umask 077
# shellcheck source=scripts/_comum.sh
. "$(dirname "${BASH_SOURCE[0]}")/_comum.sh"

case "${1:-}" in --ajuda|-h|--help) sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0;; esac

exigir_ferramentas
carregar_config_db

ARQUIVO="${1:-}"
if [ -z "$ARQUIVO" ]; then
  ARQUIVO="$(find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'celebri-db-*.dump' -o -name 'celebri-db-*.dump.enc' \) 2>/dev/null | sort | tail -n1)"
  [ -n "$ARQUIVO" ] || falhar "nenhum backup 'celebri-db-*' em $BACKUP_DIR."
fi
info "Verificando: $ARQUIVO"

TEMP="celebri_verifica_$(date +%Y%m%d%H%M%S)"
validar_nome_banco "$TEMP"
[ "$TEMP" != "$DB_NAME" ] || falhar "banco temporário igual ao de produção; abortando."

remover_temp() { db_psql postgres -c "DROP DATABASE IF EXISTS \"$TEMP\"" >/dev/null 2>&1 || erro "não foi possível remover o banco temporário '$TEMP'; remova manualmente."; }
trap remover_temp EXIT

"$(dirname "${BASH_SOURCE[0]}")/restore.sh" --arquivo "$ARQUIVO" --banco "$TEMP"

CONSULTA_TABELAS="SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
OBTIDAS="$(db_psql "$TEMP" -c "$CONSULTA_TABELAS")"
if [ -n "${TABELAS_MINIMO:-}" ]; then
  [[ "$TABELAS_MINIMO" =~ ^[0-9]+$ ]] || falhar "TABELAS_MINIMO deve ser inteiro."
  ESPERADAS="$TABELAS_MINIMO"
else
  ESPERADAS="$(db_psql "$DB_NAME" -c "$CONSULTA_TABELAS" 2>/dev/null || echo 15)"
fi

FALHAS=0
info "Tabelas no backup restaurado: $OBTIDAS (esperado >= $ESPERADAS)"
if [ "$OBTIDAS" -lt "$ESPERADAS" ]; then erro "contagem de tabelas menor que a esperada."; FALHAS=1; fi

for tabela in usuarios clientes empresas schema_migrations; do
  if [ "$(db_psql "$TEMP" -c "SELECT to_regclass('public.$tabela') IS NOT NULL")" != t ]; then erro "tabela ausente no backup: $tabela"; FALHAS=1; fi
done
USUARIOS="$(db_psql "$TEMP" -c 'SELECT count(*) FROM usuarios' 2>/dev/null || echo 0)"
info "Usuários no backup: $USUARIOS"

if [ "$FALHAS" -ne 0 ]; then erro "VERIFICAÇÃO FALHOU."; exit 1; fi
info "VERIFICAÇÃO OK: backup restaurável. Anote data/arquivo/resultado no registro de testes."
