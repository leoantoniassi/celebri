// ============================================================
// Purge de retenção (LGPD) — anonimiza titulares com prazo vencido
// ============================================================
// Uso:
//   npm run purge:retencao                 simulação (--dry-run, padrão): só conta
//   npm run purge:retencao -- --executar   anonimiza de verdade
// Variáveis: RETENCAO_DIAS (padrão 1825), RETENCAO_CONVITES_DIAS (padrão 180).
// NÃO é agendado automaticamente: rode manualmente ou por cron após revisar o dry-run.
// ============================================================
require('dotenv').config();

function lerArgumentos(argv) {
  const executar = argv.includes('--executar');
  const dryRun = argv.includes('--dry-run');
  if (executar && dryRun) throw new Error('Use --dry-run OU --executar, não os dois.');
  const desconhecidos = argv.filter((a) => !['--executar', '--dry-run'].includes(a));
  if (desconhecidos.length) throw new Error(`Argumento desconhecido: ${desconhecidos[0]}`);
  return { dryRun: !executar };
}

async function main() {
  const { dryRun } = lerArgumentos(process.argv.slice(2));
  const sequelize = require('../src/config/database');
  const { executarRetencao, lerConfig } = require('../src/services/retencaoService');

  const config = lerConfig();
  console.log(`Retenção: titulares excluídos > ${config.retencaoDias} dias; convites de eventos encerrados > ${config.retencaoConvitesDias} dias.`);
  console.log(dryRun ? 'Modo SIMULAÇÃO (nada será alterado). Use --executar para aplicar.' : 'Modo EXECUÇÃO: anonimização irreversível.');

  try {
    await sequelize.authenticate();
    await executarRetencao({ dryRun, config, log: (m) => console.log(m) });
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Erro: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { lerArgumentos };
