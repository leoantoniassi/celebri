#!/usr/bin/env bash
# ============================================================
# CELEBRI — sobe o ambiente de dev inteiro em um único comando
# ============================================================
# Uso: ./dev-up.sh  (ou: bash dev-up.sh)
#
# Faz, em ordem: build + subida dos containers, migrations pendentes
# e seed dos dados fictícios. Para no primeiro erro (set -e) em vez de
# seguir com o ambiente pela metade.
# ============================================================
set -e

cd "$(dirname "${BASH_SOURCE[0]}")"

if [ ! -f .env ]; then
  echo "Erro: arquivo .env não encontrado."
  echo "Copie o template antes de continuar:  cp .env.example .env"
  echo "Depois ajuste DB_PASS e gere um JWT_SECRET (ex: openssl rand -hex 32)."
  exit 1
fi

echo "==> Subindo containers (build)..."
docker compose up -d --build

echo "==> Aplicando migrations pendentes..."
docker compose exec backend npm run migrate

echo "==> Rodando seed..."
docker compose exec backend npm run seed

echo ""
echo "Ambiente no ar:"
echo "  API:      http://localhost:3001/api/health"
echo "  Frontend: http://localhost:8080"
echo ""
echo "Credenciais de teste (tenant: mais-alegria):"
echo "  Gerente:  gerente@celebri.com  / 123456"
echo "  Operador: operador@celebri.com / 123456"
