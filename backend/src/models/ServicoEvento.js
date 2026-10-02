// ============================================================
// Model: ServicoEvento (tabela: evento_servico) — cronograma da cozinha
// ============================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ServicoEvento = sequelize.define('ServicoEvento', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, field: 'svc_id' },
  empresaId: { type: DataTypes.UUID, allowNull: false, field: 'svc_emp_id' },
  eventoId: { type: DataTypes.UUID, allowNull: false, field: 'svc_evt_id' },
  item: { type: DataTypes.STRING(150), allowNull: false, field: 'svc_item' },
  quantidade: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'svc_quantidade' },
  unidade: { type: DataTypes.STRING(30), allowNull: true, field: 'svc_unidade' },
  horario: { type: DataTypes.DATE, allowNull: true, field: 'svc_horario' },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pendente',
    field: 'svc_status',
    validate: { isIn: [['pendente', 'preparando', 'servido']] },
  },
  observacao: { type: DataTypes.TEXT, allowNull: true, field: 'svc_observacao' },
  criadoEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'svc_criado_em' },
  atualizadoEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'svc_atualizado_em' },
  deletadoEm: { type: DataTypes.DATE, allowNull: true, field: 'svc_deletado_em' },
}, {
  tableName: 'evento_servico',
  timestamps: false,
  defaultScope: { where: { deletadoEm: null } },
});

module.exports = ServicoEvento;
