// ============================================================
// Model: Convite (tabela: convites) — convidado ou grupo com um QR
// ============================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Convite = sequelize.define('Convite', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'cnv_id',
  },
  empresaId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'cnv_emp_id',
  },
  eventoId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'cnv_evt_id',
  },
  nome: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'cnv_nome',
  },
  telefone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'cnv_telefone',
  },
  qtdPessoas: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    field: 'cnv_qtd_pessoas',
    validate: { min: 1 },
  },
  qtdEntrou: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'cnv_qtd_entrou',
    validate: { min: 0 },
  },
  token: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    field: 'cnv_token',
  },
  criadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'cnv_criado_em',
  },
  atualizadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'cnv_atualizado_em',
  },
  deletadoEm: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'cnv_deletado_em',
  },
}, {
  tableName: 'convites',
  timestamps: false,
  defaultScope: {
    where: { deletadoEm: null },
  },
});

module.exports = Convite;
