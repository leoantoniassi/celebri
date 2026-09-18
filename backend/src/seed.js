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

    // 2. Garante que a empresa padrão inaugural existe como Celebri
    await sequelize.query(`
      DO $$
      DECLARE
        v_celebri_id UUID;
        v_antigo_id  UUID;
      BEGIN
        IF EXISTS (SELECT 1 FROM empresas WHERE emp_slug = 'mais-alegria') AND NOT EXISTS (SELECT 1 FROM empresas WHERE emp_slug = 'celebri') THEN
          UPDATE empresas
          SET emp_nome = 'Celebri', emp_nome_fantasia = 'Celebri', emp_slug = 'celebri'
          WHERE emp_slug = 'mais-alegria';
        ELSIF EXISTS (SELECT 1 FROM empresas WHERE emp_slug = 'mais-alegria') AND EXISTS (SELECT 1 FROM empresas WHERE emp_slug = 'celebri') THEN
          SELECT emp_id INTO v_celebri_id FROM empresas WHERE emp_slug = 'celebri';
          SELECT emp_id INTO v_antigo_id  FROM empresas WHERE emp_slug = 'mais-alegria';

          UPDATE usuarios SET usr_emp_id = v_celebri_id WHERE usr_emp_id = v_antigo_id;
          UPDATE locais SET loc_emp_id = v_celebri_id WHERE loc_emp_id = v_antigo_id;
          UPDATE funcoes SET fnc_emp_id = v_celebri_id WHERE fnc_emp_id = v_antigo_id;
          UPDATE categorias_fornecedor SET caf_emp_id = v_celebri_id WHERE caf_emp_id = v_antigo_id;
          UPDATE categorias_produto SET cap_emp_id = v_celebri_id WHERE cap_emp_id = v_antigo_id;
          UPDATE clientes SET cli_emp_id = v_celebri_id WHERE cli_emp_id = v_antigo_id;
          UPDATE fornecedores SET for_emp_id = v_celebri_id WHERE for_emp_id = v_antigo_id;
          UPDATE funcionarios SET fun_emp_id = v_celebri_id WHERE fun_emp_id = v_antigo_id;
          UPDATE produtos SET prd_emp_id = v_celebri_id WHERE prd_emp_id = v_antigo_id;
          UPDATE orcamentos SET orc_emp_id = v_celebri_id WHERE orc_emp_id = v_antigo_id;
          UPDATE eventos SET evt_emp_id = v_celebri_id WHERE evt_emp_id = v_antigo_id;
          UPDATE documentos SET doc_emp_id = v_celebri_id WHERE doc_emp_id = v_antigo_id;
          UPDATE escala SET esc_emp_id = v_celebri_id WHERE esc_emp_id = v_antigo_id;
          UPDATE evento_produto SET evp_emp_id = v_celebri_id WHERE evp_emp_id = v_antigo_id;
          UPDATE orcamento_produto SET orp_emp_id = v_celebri_id WHERE orp_emp_id = v_antigo_id;
          UPDATE catalogos SET cat_emp_id = v_celebri_id WHERE cat_emp_id = v_antigo_id;

          DELETE FROM empresas WHERE emp_id = v_antigo_id;
        ELSE
          INSERT INTO empresas (emp_nome, emp_nome_fantasia, emp_slug)
          VALUES ('Celebri', 'Celebri', 'celebri')
          ON CONFLICT (emp_slug) DO UPDATE SET emp_nome_fantasia = 'Celebri', emp_nome = 'Celebri';
        END IF;
      END $$;
    `);

    const [empRows] = await sequelize.query(
      `SELECT emp_id FROM empresas WHERE emp_slug = 'celebri' LIMIT 1;`
    );
    const empId = empRows[0]?.emp_id;

    if (!empId) {
      throw new Error("Não foi possível resolver a empresa padrão 'celebri'.");
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
