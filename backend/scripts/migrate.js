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
//
// ORDEM: lexicográfica pelo NOME COMPLETO do arquivo (Array.sort padrão), não
// só pelo prefixo numérico. Existem dois pares com o mesmo prefixo, já aplicados
// em bases existentes (schema_migrations guarda o nome, por isso NÃO renomear):
//   006_expand_logo_url.sql        -> 006_usuario_funcionario_link.sql
//   008_codigo_primeiro_acesso.sql -> 008_update_empresa_celebri.sql
// Novas migrations devem usar prefixos únicos e crescentes (013_, 014_...).
// Nomes exatos nunca se repetem (garantido por teste em migrateOrdem.test.js).
// ============================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { resolverSsl } = require('../src/config/dbSsl');
const { lerConexao } = require('../src/config/dbConexao');

const DIR_MIGRATIONS = path.resolve(__dirname, '..', '..', 'database', 'migrations');

function conectar() {
  return new Client({
    ...lerConexao(),
    ssl: resolverSsl() || undefined,
  });
}

function listarArquivos() {
  if (!fs.existsSync(DIR_MIGRATIONS)) return [];
  return fs
    .readdirSync(DIR_MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // ordem lexicográfica — por isso o prefixo numérico é obrigatório
}

// Chave do advisory lock da sessão: serializa dois processos (ex.: dois
// containers subindo juntos) para não aplicarem a mesma migration em paralelo.
const LOCK_MIGRATIONS = 727301;

async function adquirirLock(client) {
  await client.query('SELECT pg_advisory_lock($1)', [LOCK_MIGRATIONS]);
}

async function liberarLock(client) {
  try {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_MIGRATIONS]);
  } catch (_) {
    // conexão já caiu: o Postgres libera o lock de sessão sozinho
  }
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
    await client.query(
      'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT (version) DO NOTHING',
      [arquivo]
    );
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
  let comLock = false;
  try {
    await adquirirLock(client);
    comLock = true;
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
    if (comLock) await liberarLock(client);
    await client.end();
  }
}

async function main() {
  const [comando, argumento] = process.argv.slice(2);
  const client = conectar();
  await client.connect();
  const aplicando = comando !== 'status' && comando !== 'baseline';
  let comLock = false;

  try {
    if (aplicando) {
      await adquirirLock(client);
      comLock = true;
    }
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
    if (comLock) await liberarLock(client);
    await client.end();
  }
}

if (require.main === module) {
  main().catch((erro) => {
    console.error(`\nMigration falhou: ${erro.message}`);
    process.exit(1);
  });
}

module.exports = { LOCK_MIGRATIONS, rodarMigrations, conectar, listarArquivos, garantirTabelaControle, versoesAplicadas };

