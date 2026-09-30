// ============================================================
// Model: Funcao (tabela: funcoes) — lookup de funções de colaboradores
// ============================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Funcao = sequelize.define('Funcao', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'fnc_id',
  },
  // FK para empresas (tenant)
  empresaId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'fnc_emp_id',
  },
  nome: {
    type: DataTypes.STRING(80),
    allowNull: false,
    unique: true,
    field: 'fnc_nome',
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'fnc_descricao',
  },
  // Tela do app mobile aberta por quem trabalha nesta função.
  modulo: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'fnc_modulo',
    validate: { isIn: [['cozinha', 'portaria', 'garcom']] },
  },
  criadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fnc_criado_em',
  },
}, {
  tableName: 'funcoes',
  timestamps: false,
});

module.exports = Funcao;
