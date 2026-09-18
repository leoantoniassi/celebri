// ============================================================
// PROJETO MAIS ALEGRIA — Seed (popular banco via seed.sql)
// ============================================================
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const fs = require("fs");
const sequelize = require("./config/database");

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conectado ao banco.");

    // Caminho para o arquivo SQL
    const sqlPath = path.join(__dirname, "../../database/seed.sql");
    console.log(`📖 Lendo arquivo SQL de: ${sqlPath}`);
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("⏳ Executando comandos SQL...");
    await sequelize.query(sql);

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
