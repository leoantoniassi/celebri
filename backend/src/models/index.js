// ============================================================
// Models Index — Registra todos os modelos e suas associações
// ============================================================
const Empresa = require('./Empresa');
const Usuario = require('./Usuario');
const Cliente = require('./Cliente');
const Local = require('./Local');
const Funcao = require('./Funcao');
const CategoriaFornecedor = require('./CategoriaFornecedor');
const CategoriaProduto = require('./CategoriaProduto');
const Funcionario = require('./Funcionario');
const Fornecedor = require('./Fornecedor');
const Produto = require('./Produto');
const Orcamento = require('./Orcamento');
const Evento = require('./Evento');
const Documento = require('./Documento');
const Catalogo = require('./Catalogo');
const Escala = require('./Escala');
const EventoProduto = require('./EventoProduto');
const OrcamentoProduto = require('./OrcamentoProduto');

// ── Empresa (tenant) 1:N todas as entidades de negócio ───────
// Toda linha do sistema pertence a um buffet contratante. O filtro por
// empresaId é injetado automaticamente pelos hooks em config/database.js.
[
  Usuario, Cliente, Local, Funcao, CategoriaFornecedor, CategoriaProduto,
  Funcionario, Fornecedor, Produto, Orcamento, Evento, Documento, Catalogo,
  Escala, EventoProduto, OrcamentoProduto,
].forEach((Model) => {
  Empresa.hasMany(Model, { foreignKey: 'empresaId' });
  Model.belongsTo(Empresa, { foreignKey: 'empresaId', as: 'empresa' });
});

// ── Funcao 1:N Funcionario ────────────────────────────────────
Funcao.hasMany(Funcionario, { foreignKey: 'funcaoId', as: 'funcionarios' });
Funcionario.belongsTo(Funcao, { foreignKey: 'funcaoId', as: 'funcao' });

// ── Funcionario 1:1 Usuario (conta de login do app mobile) ───
Usuario.belongsTo(Funcionario, { foreignKey: 'funcionarioId', as: 'funcionario' });
Funcionario.hasOne(Usuario, { foreignKey: 'funcionarioId', as: 'usuario' });

// ── CategoriaFornecedor 1:N Fornecedor ───────────────────────
CategoriaFornecedor.hasMany(Fornecedor, { foreignKey: 'categoriaId', as: 'fornecedores' });
Fornecedor.belongsTo(CategoriaFornecedor, { foreignKey: 'categoriaId', as: 'categoria' });

// ── CategoriaProduto 1:N Produto ─────────────────────────────
CategoriaProduto.hasMany(Produto, { foreignKey: 'categoriaId', as: 'produtos' });
Produto.belongsTo(CategoriaProduto, { foreignKey: 'categoriaId', as: 'categoria' });

// ── Local 1:N Orcamento ───────────────────────────────────────
Local.hasMany(Orcamento, { foreignKey: 'localId', as: 'orcamentos' });
Orcamento.belongsTo(Local, { foreignKey: 'localId', as: 'local' });

// ── Local 1:N Evento ──────────────────────────────────────────
Local.hasMany(Evento, { foreignKey: 'localId', as: 'eventos' });
Evento.belongsTo(Local, { foreignKey: 'localId', as: 'local' });

// ── Cliente 1:N Orcamento ─────────────────────────────────────
Cliente.hasMany(Orcamento, { foreignKey: 'clienteId', as: 'orcamentos' });
Orcamento.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

// ── Cliente 1:N Evento ────────────────────────────────────────
Cliente.hasMany(Evento, { foreignKey: 'clienteId', as: 'eventos' });
Evento.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

// ── Orcamento 1:N Evento ──────────────────────────────────────
Orcamento.hasMany(Evento, { foreignKey: 'orcamentoId', as: 'eventos' });
Evento.belongsTo(Orcamento, { foreignKey: 'orcamentoId', as: 'orcamento' });

// ── Cliente 1:N Documento ─────────────────────────────────────
Cliente.hasMany(Documento, { foreignKey: 'clienteId', as: 'documentos' });
Documento.belongsTo(Cliente, { foreignKey: 'clienteId', as: 'cliente' });

// ── Evento 1:N Documento ──────────────────────────────────────
Evento.hasMany(Documento, { foreignKey: 'eventoId', as: 'documentos' });
Documento.belongsTo(Evento, { foreignKey: 'eventoId', as: 'evento' });

// ── Evento N:M Funcionario (via Escala) ───────────────────────
Evento.belongsToMany(Funcionario, {
  through: Escala,
  foreignKey: 'eventoId',
  otherKey: 'funcionarioId',
  as: 'funcionarios',
});
Funcionario.belongsToMany(Evento, {
  through: Escala,
  foreignKey: 'funcionarioId',
  otherKey: 'eventoId',
  as: 'eventos',
});

// Associações diretas na tabela Escala (para queries diretas)
Escala.belongsTo(Evento, { foreignKey: 'eventoId', as: 'evento' });
Escala.belongsTo(Funcionario, { foreignKey: 'funcionarioId', as: 'funcionario' });
Evento.hasMany(Escala, { foreignKey: 'eventoId', as: 'escala' });
Funcionario.hasMany(Escala, { foreignKey: 'funcionarioId', as: 'escala' });

// ── Evento N:M Produto (via EventoProduto) ────────────────────
Evento.belongsToMany(Produto, {
  through: EventoProduto,
  foreignKey: 'eventoId',
  otherKey: 'produtoId',
  as: 'produtos',
});
Produto.belongsToMany(Evento, {
  through: EventoProduto,
  foreignKey: 'produtoId',
  otherKey: 'eventoId',
  as: 'eventos',
});

EventoProduto.belongsTo(Evento, { foreignKey: 'eventoId', as: 'evento' });
EventoProduto.belongsTo(Produto, { foreignKey: 'produtoId', as: 'produto' });
Evento.hasMany(EventoProduto, { foreignKey: 'eventoId', as: 'eventoProdutos' });
Produto.hasMany(EventoProduto, { foreignKey: 'produtoId', as: 'eventoProdutos' });

// ── Orcamento N:M Produto (via OrcamentoProduto) ─────────────
Orcamento.belongsToMany(Produto, {
  through: OrcamentoProduto,
  foreignKey: 'orcamentoId',
  otherKey: 'produtoId',
  as: 'produtos',
});
Produto.belongsToMany(Orcamento, {
  through: OrcamentoProduto,
  foreignKey: 'produtoId',
  otherKey: 'orcamentoId',
  as: 'orcamentos',
});

OrcamentoProduto.belongsTo(Orcamento, { foreignKey: 'orcamentoId', as: 'orcamento' });
OrcamentoProduto.belongsTo(Produto, { foreignKey: 'produtoId', as: 'produto' });
Orcamento.hasMany(OrcamentoProduto, { foreignKey: 'orcamentoId', as: 'orcamentoProdutos' });
Produto.hasMany(OrcamentoProduto, { foreignKey: 'produtoId', as: 'orcamentoProdutos' });

module.exports = {
  Empresa,
  Usuario,
  Cliente,
  Local,
  Funcao,
  CategoriaFornecedor,
  CategoriaProduto,
  Funcionario,
  Fornecedor,
  Produto,
  Orcamento,
  Evento,
  Documento,
  Catalogo,
  Escala,
  EventoProduto,
  OrcamentoProduto,
};
