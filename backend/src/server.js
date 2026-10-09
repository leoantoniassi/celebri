// ============================================================
// CELEBRI — Entry Point
// ============================================================
require('dotenv').config();

const { exigirConfiguracao } = require('./config/seguranca');

// Falha cedo (antes de abrir porta/banco) se NODE_ENV for desconhecido ou os
// segredos (JWT_SECRET, DB_PASS em produção) forem fracos/placeholders.
try {
  exigirConfiguracao();
} catch (error) {
  console.error('❌ Configuração inválida:', error.message);
  process.exit(1);
}

const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Testa conexão com o banco
    await sequelize.authenticate();
    console.log('✅ Conexão com o PostgreSQL estabelecida com sucesso!');

    // Aplica migrations pendentes. Se falhar, o schema está inconsistente com
    // o código: derruba o processo (exit 1) em vez de subir a API quebrada.
    try {
      const { rodarMigrations } = require('../scripts/migrate');
      await rodarMigrations();
    } catch (migError) {
      console.error('❌ Falha ao aplicar migrations; abortando a inicialização:', migError.message);
      process.exit(1);
      return;
    }

    // Importa modelos e associações (registra tudo no Sequelize)
    require('./models');
    console.log('✅ Modelos carregados.');

    // Inicia o servidor
    app.listen(PORT, () => {
      console.log(`🚀 API Celebri rodando em http://localhost:${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error.message);
    process.exit(1);
  }
}

start();
