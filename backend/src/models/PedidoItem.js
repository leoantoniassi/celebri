// ============================================================
// Model: PedidoItem (tabela: pedido_itens)
// ============================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PedidoItem = sequelize.define('PedidoItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, field: 'pit_id' },
  empresaId: { type: DataTypes.UUID, allowNull: false, field: 'pit_emp_id' },
  pedidoId: { type: DataTypes.UUID, allowNull: false, field: 'pit_ped_id' },
  descricao: { type: DataTypes.STRING(150), allowNull: false, field: 'pit_descricao' },
  quantidade: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: 'pit_quantidade' },
  observacao: { type: DataTypes.STRING(300), allowNull: true, field: 'pit_observacao' },
  // Alergia ou restrição alimentar: destacado na tela da cozinha.
  alerta: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'pit_alerta' },
}, {
  tableName: 'pedido_itens',
  timestamps: false,
});

module.exports = PedidoItem;
