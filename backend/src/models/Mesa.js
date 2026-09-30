// ============================================================
// Model: Mesa (tabela: mesas) — layout do salão, por local
// ============================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Mesa = sequelize.define('Mesa', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true, field: 'mes_id' },
  empresaId: { type: DataTypes.UUID, allowNull: false, field: 'mes_emp_id' },
  localId: { type: DataTypes.UUID, allowNull: false, field: 'mes_loc_id' },
  numero: { type: DataTypes.STRING(10), allowNull: false, field: 'mes_numero' },
  lugares: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 4, field: 'mes_lugares' },
  // Posição no mapa em % da largura/altura do salão.
  posX: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 50, field: 'mes_pos_x' },
  posY: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 50, field: 'mes_pos_y' },
  criadoEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'mes_criado_em' },
  atualizadoEm: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, field: 'mes_atualizado_em' },
  deletadoEm: { type: DataTypes.DATE, allowNull: true, field: 'mes_deletado_em' },
}, {
  tableName: 'mesas',
  timestamps: false,
  defaultScope: { where: { deletadoEm: null } },
});

module.exports = Mesa;
