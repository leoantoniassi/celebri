// ============================================================
// Model: Empresa (tabela: empresas) — tenant do SaaS
// ============================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Empresa = sequelize.define('Empresa', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'emp_id',
  },
  nome: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'emp_nome',
  },
  nomeFantasia: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'emp_nome_fantasia',
  },
  // Identificador público — é o "código da empresa" informado no login
  slug: {
    type: DataTypes.STRING(60),
    allowNull: false,
    unique: true,
    field: 'emp_slug',
    validate: {
      is: /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/,
    },
  },
  logoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'emp_logo_url',
  },
  corPrimaria: {
    type: DataTypes.CHAR(7),
    allowNull: false,
    defaultValue: '#1CEAFF',
    field: 'emp_cor_primaria',
    validate: { is: /^#[0-9a-fA-F]{6}$/ },
  },
  corSecundaria: {
    type: DataTypes.CHAR(7),
    allowNull: false,
    defaultValue: '#FF45FF',
    field: 'emp_cor_secundaria',
    validate: { is: /^#[0-9a-fA-F]{6}$/ },
  },
  corTerciaria: {
    type: DataTypes.CHAR(7),
    allowNull: false,
    defaultValue: '#1F357F',
    field: 'emp_cor_terciaria',
    validate: { is: /^#[0-9a-fA-F]{6}$/ },
  },
  emailContato: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'emp_email_contato',
  },
  telefone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'emp_telefone',
  },
  plano: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'basico',
    field: 'emp_plano',
    validate: {
      isIn: [['basico', 'profissional', 'enterprise']],
    },
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'ativo',
    field: 'emp_status',
    validate: {
      isIn: [['ativo', 'suspenso', 'cancelado']],
    },
  },
  criadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'emp_criado_em',
  },
  atualizadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'emp_atualizado_em',
  },
  deletadoEm: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'emp_deletado_em',
  },
}, {
  tableName: 'empresas',
  timestamps: false,
  defaultScope: {
    where: { deletadoEm: null },
  },
  scopes: {
    comDeletados: {},
  },
});

module.exports = Empresa;
