// ============================================================
// CELEBRI — Entry Point
// ============================================================
require('dotenv').config();

const app = require('./app');
const sequelize = require('./config/database');

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Testa conexão com o banco
    await sequelize.authenticate();
    console.log('✅ Conexão com o PostgreSQL estabelecida com sucesso!');

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
