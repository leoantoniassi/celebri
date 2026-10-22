// ============================================================
// Sonda de banco para a suite de integração
// ============================================================
// Os callbacks de `describe` rodam na fase de coleta do Jest, antes de
// qualquer `beforeAll` — então decidir ali se um teste roda ou é pulado
// exige saber da disponibilidade do banco ANTES disso. globalSetup roda
// uma vez, antes dos workers, e o process.env é herdado por eles.
// ============================================================
require('dotenv').config();
// O .env do projeto vive na raiz do repo (celebri/.env), um nível acima do
// backend: sem esta segunda leitura a sonda não acharia DB_USER/DB_PASS e a
// suíte de integração seria pulada mesmo com o Postgres no ar. O dotenv não
// sobrescreve variáveis já definidas, então no CI as variáveis do workflow
// continuam prevalecendo.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { Client } = require('pg');

module.exports = async function sondarBanco() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectionTimeoutMillis: 3000,
  });

  try {
    await client.connect();
    await client.end();
    process.env.BANCO_DISPONIVEL = '1';
  } catch {
    process.env.BANCO_DISPONIVEL = '';
    console.warn(
      '\n  PostgreSQL indisponível — a suite de isolamento entre tenants será pulada.' +
      '\n  Para executá-la: docker compose up -d db && npm run migrate\n'
    );
  }
};
