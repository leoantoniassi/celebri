if (process.env.NODE_ENV === 'production') {
  console.error('Recusado: script de desenvolvimento, não use com NODE_ENV=production.');
  process.exit(1);
}

const { Orcamento, Cliente, Local, OrcamentoProduto, Produto } = require('../../src/models');
const sequelize = require('../../src/config/database');

const includesOrcamentoDetalhado = [
  { model: Cliente, as: "cliente", attributes: ["id", "nome"] },
  { model: Local,   as: "local",   attributes: ["id", "nome", "cidade", "estado"] },
  { model: OrcamentoProduto, as: "orcamentoProdutos", separate: true, include: [{ model: Produto, as: "produto" }] },
];

async function test() {
  try {
    console.log('Testing reload query...');
    const orc = await Orcamento.findOne();
    if (orc) {
      await orc.reload({ include: includesOrcamentoDetalhado });
      console.log('Success reloading!');
    } else {
      console.log('No budget found to reload');
    }
  } catch (err) {
    console.error('Erro:', err.name, err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

test();
