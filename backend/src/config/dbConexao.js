// ============================================================
// CELEBRI — Parâmetros de conexão com o PostgreSQL (fonte única)
// ============================================================
// Usado pelo Sequelize (config/database.js) e pelo runner de migrations
// (scripts/migrate.js), para host/porta/credenciais não divergirem.
// ============================================================
const PORTA_PADRAO = 5432;

function lerConexao(env = process.env) {
  return {
    host: env.DB_HOST,
    port: env.DB_PORT || PORTA_PADRAO,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
  };
}

module.exports = { lerConexao, PORTA_PADRAO };
