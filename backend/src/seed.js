// ============================================================
// FESTIFY — Seed (popular banco via seed.sql de forma multitenant)
// ============================================================
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const fs = require("fs");
const sequelize = require("./config/database");
const { rodarMigrations } = require("../scripts/migrate");

const TABELAS_TENANT = [
  ['usuarios', 'usr_emp_id'],
  ['locais', 'loc_emp_id'],
  ['funcoes', 'fnc_emp_id'],
  ['categorias_fornecedor', 'caf_emp_id'],
  ['categorias_produto', 'cap_emp_id'],
  ['clientes', 'cli_emp_id'],
  ['fornecedores', 'for_emp_id'],
  ['funcionarios', 'fun_emp_id'],
  ['produtos', 'prd_emp_id'],
  ['orcamentos', 'orc_emp_id'],
  ['eventos', 'evt_emp_id'],
  ['documentos', 'doc_emp_id'],
  ['catalogos', 'cat_emp_id'],
  ['escala', 'esc_emp_id'],
  ['evento_produto', 'evp_emp_id'],
  ['orcamento_produto', 'orp_emp_id'],
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conectado ao banco.");

    // 1. Garante que todas as migrations estão aplicadas
    try {
      await rodarMigrations();
    } catch (migErr) {
      console.warn("⚠️ Aviso durante migrations no seed:", migErr.message);
    }

    // 2. Garante que a empresa padrão inaugural existe
    await sequelize.query(`
      INSERT INTO empresas (emp_nome, emp_nome_fantasia, emp_slug)
      VALUES ('Mais Alegria', 'Mais Alegria', 'mais-alegria')
      ON CONFLICT (emp_slug) DO NOTHING;
    `);

    const [empRows] = await sequelize.query(
      `SELECT emp_id FROM empresas WHERE emp_slug = 'mais-alegria' LIMIT 1;`
    );
    const empId = empRows[0]?.emp_id;

    if (!empId) {
      throw new Error("Não foi possível resolver a empresa padrão 'mais-alegria'.");
    }

    // 3. Aplica temporariamente o DEFAULT empId para compatibilidade com os inserts do seed.sql
    for (const [tabela, coluna] of TABELAS_TENANT) {
      try {
        await sequelize.query(`ALTER TABLE ${tabela} ALTER COLUMN ${coluna} SET DEFAULT '${empId}';`);
      } catch (colErr) {
        // Se a coluna ainda não existir em ambiente de teste sem migrações completas, ignora
      }
    }

    // 4. Executa seed.sql
    const sqlPath = path.join(__dirname, "../../database/seed.sql");
    console.log(`📖 Lendo arquivo SQL de: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("⏳ Executando comandos SQL...");
    await sequelize.query(sql);

    // 5. Remove os defaults temporários para manter a integridade da aplicação
    for (const [tabela, coluna] of TABELAS_TENANT) {
      try {
        await sequelize.query(`ALTER TABLE ${tabela} ALTER COLUMN ${coluna} DROP DEFAULT;`);
      } catch (colErr) {
        // Ignora
      }
    }

    console.log("✅ Seed concluído com sucesso!");
    console.log("");
    console.log("📌 Credenciais de acesso:");
    console.log("   Gerente:  gerente@celebri.com  / 123456");
    console.log("   Operador: operador@celebri.com / 123456");
    console.log("");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro no seed:", error.message);
    if (error.original) {
      console.error("Original error:", error.original.message);
    }
    process.exit(1);
  }
}

seed();
