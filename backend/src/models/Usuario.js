// ============================================================
// Model: Usuario (tabela: usuarios)
// ============================================================
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Usuario = sequelize.define('Usuario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'usr_id',
  },
  // FK para empresas (tenant)
  empresaId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'usr_emp_id',
  },
  // FK opcional para funcionarios — vincula a conta de login a um
  // colaborador de campo, usado pelo app mobile Celebri Staff.
  funcionarioId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'usr_fun_id',
  },
  nome: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: 'usr_nome',
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    field: 'usr_email',
  },
  senha: {
    type: DataTypes.STRING(255),
    allowNull: true, // null enquanto o usuário convidado ainda não definiu senha
    field: 'usr_senha',
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'operador',
    field: 'usr_role',
    validate: {
      isIn: [['admin', 'gerente', 'operador']],
    },
  },
  status: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: 'ativo',
    field: 'usr_status',
    validate: {
      isIn: [['pendente', 'ativo']],
    },
  },
  conviteToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'usr_convite_token',
  },
  conviteExpiracao: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'usr_convite_expiracao',
  },
  resetToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'usr_reset_token',
  },
  resetExpiracao: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'usr_reset_expiracao',
  },
  criadoEm: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'usr_criado_em',
  },
}, {
  tableName: 'usuarios',
  timestamps: false,
});

module.exports = Usuario;
