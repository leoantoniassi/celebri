// ============================================================
// Model: Auditoria (tabela: auditoria) — trilha de ações sensíveis (LGPD)
// ============================================================
// `detalhes` nunca recebe dado pessoal: a gravação passa por
// services/auditoriaService.js, que sanitiza. Sem FK para usuário/empresa
// (o log sobrevive à remoção deles); empresaId segue o escopo de tenant.
// ============================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Auditoria = sequelize.define('Auditoria', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'aud_id',
  },
  empresaId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'aud_emp_id',
  },
  usuarioId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'aud_usr_id',
  },
  acao: {
    type: DataTypes.STRING(80),
    allowNull: false,
    field: 'aud_acao',
  },
  entidade: {
    type: DataTypes.STRING(60),
    allowNull: true,
    field: 'aud_entidade',
  },
  entidadeId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'aud_entidade_id',
  },
  ip: {
    type: DataTypes.STRING(64),
    allowNull: true,
    field: 'aud_ip',
  },
  detalhes: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'aud_detalhes',
  },
  criadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'aud_criado_em',
  },
}, {
  tableName: 'auditoria',
  timestamps: false,
});

module.exports = Auditoria;
