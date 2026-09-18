// ============================================================
// Runner de Migrations — aplica database/migrations/*.sql em ordem
// ============================================================
// Uso:
//   npm run migrate           aplica as migrations pendentes
//   npm run migrate -- status lista o que já foi aplicado e o que falta
//   npm run migrate -- baseline <versao>  marca como aplicada sem executar
//
// Cada arquivo roda dentro de uma transação: ou aplica inteiro, ou nada.
// O controle fica na tabela schema_migrations, criada automaticamente.
// ============================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DIR_MIGRATIONS = path.resolve(__dirname, '..', '..', 'database', 'migrations');

function conectar() {
  return new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
}

function listarArquivos() {
  if (!fs.existsSync(DIR_MIGRATIONS)) return [];
  return fs
    .readdirSync(DIR_MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // ordem lexicográfica — por isso o prefixo numérico é obrigatório
}

async function garantirTabelaControle(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     VARCHAR(255) PRIMARY KEY,
      aplicada_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function versoesAplicadas(client) {
  const { rows } = await client.query('SELECT version FROM schema_migrations');
  return new Set(rows.map((r) => r.version));
}

async function aplicar(client, arquivo) {
  const sql = fs.readFileSync(path.join(DIR_MIGRATIONS, arquivo), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [arquivo]);
    await client.query('COMMIT');
    console.log(`  ✓ ${arquivo}`);
  } catch (erro) {
    await client.query('ROLLBACK');
    console.error(`  ✗ ${arquivo}\n    ${erro.message}`);
    throw erro;
  }
}

async function rodarMigrations() {
  const client = conectar();
  await client.connect();
  try {
    await garantirTabelaControle(client);
    const aplicadas = await versoesAplicadas(client);
    const arquivos = listarArquivos();
    const pendentes = arquivos.filter((a) => !aplicadas.has(a));

    if (pendentes.length > 0) {
      console.log(`📦 Aplicando ${pendentes.length} migration(s) pendente(s):`);
      for (const arquivo of pendentes) {
        await aplicar(client, arquivo);
      }
      console.log('✅ Migrations aplicadas com sucesso.');
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const [comando, argumento] = process.argv.slice(2);
  const client = conectar();
  await client.connect();

  try {
    await garantirTabelaControle(client);
    const aplicadas = await versoesAplicadas(client);
    const arquivos = listarArquivos();

    if (comando === 'status') {
      console.log(`\nMigrations em ${DIR_MIGRATIONS}\n`);
      for (const arquivo of arquivos) {
        console.log(`  ${aplicadas.has(arquivo) ? '[aplicada] ' : '[pendente] '}${arquivo}`);
      }
      console.log('');
      return;
    }

    if (comando === 'baseline') {
      if (!argumento) throw new Error('Informe o arquivo: npm run migrate -- baseline 001_x.sql');
      if (!arquivos.includes(argumento)) throw new Error(`Arquivo não encontrado: ${argumento}`);
      await client.query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
        [argumento]
      );
      console.log(`Marcada como aplicada (sem executar): ${argumento}`);
      return;
    }

    const pendentes = arquivos.filter((a) => !aplicadas.has(a));
    if (pendentes.length === 0) {
      console.log('Nenhuma migration pendente.');
      return;
    }

    console.log(`Aplicando ${pendentes.length} migration(s):`);
    for (const arquivo of pendentes) {
      await aplicar(client, arquivo);
    }
    console.log('Concluído.');
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch((erro) => {
    console.error(`\nMigration falhou: ${erro.message}`);
    process.exit(1);
  });
}

module.exports = { rodarMigrations, conectar, listarArquivos, garantirTabelaControle, versoesAplicadas };

