// ============================================================
// CELEBRI — Configuração Sequelize + escopo automático de tenant
// ============================================================
const { Sequelize, Op } = require('sequelize');
const { getEmpresaId } = require('../utils/tenantContext');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    timezone: '-03:00',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: false,   // gerenciamos timestamps manualmente conforme DDL
      underscored: true,
      freezeTableName: true,
    },
    dialectOptions: {
      useUTC: false,
      ...(process.env.NODE_ENV === 'production' && {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      })
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  }
);

// ============================================================
// Escopo automático de tenant
// ============================================================
// Em vez de repetir `where: { empresaId }` nos ~169 pontos de query dos
// controllers, o filtro é injetado aqui, uma vez, para todo model que
// tenha o campo `empresaId`.
//
// Duas decisões importantes:
//
//  1. O filtro é combinado com Op.and, nunca por spread. Se um controller
//     passar seu próprio empresaId, o AND prevalece — não há como escapar
//     do escopo sobrescrevendo a chave. Falha fechada, não aberta.
//
//  2. Fora de uma requisição (seed, migrations, testes unitários) e para
//     super_admin, getEmpresaId() devolve null e nada é filtrado.
//
// Escape hatch: passar `ignoraTenant: true` nas options. Uso restrito a
// consultas que precisam ser globais por natureza (busca de usuário por
// token de convite/reset, resolução de tenant no login).
// ============================================================

function temTenant(model) {
  return Boolean(model && model.rawAttributes && model.rawAttributes.empresaId);
}

function aplicarEscopo(options, model) {
  if (!options || options.ignoraTenant) return;
  if (!temTenant(model)) return;

  const empresaId = getEmpresaId();
  if (!empresaId) return;

  const filtro = { empresaId };
  options.where = options.where
    ? { [Op.and]: [options.where, filtro] }
    : filtro;
}

// Atenção: estes hooks precisam ser `function`, não arrow. Em vários
// caminhos do Sequelize o model não vem em `options.model` e só está
// disponível como `this` — com arrow function o escopo é silenciosamente
// ignorado, que é a pior falha possível aqui.
function comEscopo(options) {
  aplicarEscopo(options, options.model || this);
}

sequelize.addHook('beforeFind', comEscopo);
sequelize.addHook('beforeCount', comEscopo);
sequelize.addHook('beforeBulkUpdate', comEscopo);
sequelize.addHook('beforeBulkDestroy', comEscopo);

// Na escrita, carimba a empresa do contexto quando o controller não define.
sequelize.addHook('beforeValidate', function (instance, options) {
  if (options && options.ignoraTenant) return;
  if (!temTenant(instance.constructor)) return;
  if (instance.empresaId) return;

  const empresaId = getEmpresaId();
  if (empresaId) instance.empresaId = empresaId;
});

module.exports = sequelize;
