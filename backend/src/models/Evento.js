// ============================================================
// Model: Evento (tabela: eventos)
// ============================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Evento = sequelize.define('Evento', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'evt_id',
  },
  // FK para empresas (tenant)
  empresaId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'evt_emp_id',
  },
  clienteId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'evt_cli_id',
  },
  orcamentoId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'evt_orc_id',
  },
  // FK para locais
  localId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'evt_loc_id',
  },
  nome: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'evt_nome',
  },
  dataEvento: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'evt_data_evento',
  },
  horarioTermino: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'evt_horario_termino',
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'pendente',
    field: 'evt_status',
    validate: {
      isIn: [['pendente', 'concluido', 'cancelado']],
    },
  },
  qtdPessoas: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'evt_qtd_pessoas',
  },
  qtdAdultos: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'evt_qtd_adultos',
  },
  qtdCriancas: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'evt_qtd_criancas',
  },
  qtdBebes: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'evt_qtd_bebes',
  },
  valorOrcamento: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'evt_orcamento',
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'evt_observacoes',
  },
  // Portaria: lista de convidados com QR (opcional) e entradas sem convite.
  usaConvites: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'evt_usa_convites',
  },
  qtdAvulsos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'evt_qtd_avulsos',
  },
  criadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'evt_criado_em',
  },
  atualizadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'evt_atualizado_em',
  },
  deletadoEm: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'evt_deletado_em',
  },
}, {
  tableName: 'eventos',
  timestamps: false,
  defaultScope: {
    where: { deletadoEm: null },
  },
  scopes: {
    comDeletados: {},
  },
});

module.exports = Evento;
