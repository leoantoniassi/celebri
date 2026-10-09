// ============================================================
// Model: Funcionario (tabela: funcionarios)
// ============================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Funcionario = sequelize.define('Funcionario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'fun_id',
  },
  // FK para empresas (tenant)
  empresaId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'fun_emp_id',
  },
  nome: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'fun_nome',
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: true,
    unique: true,
    field: 'fun_email',
  },
  telefone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'fun_telefone',
  },
  telefoneResidencial: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'fun_telefone_residencial',
  },
  // FK para funcoes
  funcaoId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'fun_fnc_id',
  },
  criadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fun_criado_em',
  },
  atualizadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'fun_atualizado_em',
  },
  // LGPD: preenchido quando os dados pessoais do titular foram anonimizados.
  anonimizadoEm: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fun_anonimizado_em',
  },
  deletadoEm: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'fun_deletado_em',
  },
}, {
  tableName: 'funcionarios',
  timestamps: false,
  defaultScope: {
    where: { deletadoEm: null },
  },
  scopes: {
    comDeletados: {},
  },
});

module.exports = Funcionario;
