// ============================================================
// Model: Pedido (tabela: pedidos) — comanda do garçom para a cozinha
// ============================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pedido = sequelize.define('Pedido', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, field: 'ped_id' },
  empresaId: { type: DataTypes.UUID, allowNull: false, field: 'ped_emp_id' },
  eventoId: { type: DataTypes.UUID, allowNull: false, field: 'ped_evt_id' },
  mesaId: { type: DataTypes.UUID, allowNull: false, field: 'ped_mes_id' },
  usuarioId: { type: DataTypes.UUID, allowNull: true, field: 'ped_usr_id' },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'enviado',
    field: 'ped_status',
    validate: { isIn: [['enviado', 'preparando', 'pronto', 'entregue', 'cancelado']] },
  },
  observacao: { type: DataTypes.TEXT, allowNull: true, field: 'ped_observacao' },
  criadoEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'ped_criado_em' },
  atualizadoEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'ped_atualizado_em' },
}, {
  tableName: 'pedidos',
  timestamps: false,
});

module.exports = Pedido;
