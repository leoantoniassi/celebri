// ============================================================
// Controller: Lookup Tables (funcoes, categorias_fornecedor, categorias_produto)
// ============================================================
const { Funcao, CategoriaFornecedor, CategoriaProduto } = require('../models');

// ── FUNCOES ──────────────────────────────────────────────────

// GET /api/lookup/funcoes
async function listarFuncoes(req, res, next) {
  try {
    const funcoes = await Funcao.findAll({ order: [['nome', 'ASC']] });
    return res.json({ success: true, data: funcoes });
  } catch (error) {
    return next(error);
  }
}

const MODULOS_APP = ['cozinha', 'portaria', 'garcom'];

/** Módulo do app: undefined = não informado, null = nenhum, false = inválido. */
function lerModulo(valor) {
  if (valor === undefined) return undefined;
  if (valor === null || valor === '') return null;
  return MODULOS_APP.includes(valor) ? valor : false;
}

// POST /api/lookup/funcoes
async function criarFuncao(req, res, next) {
  try {
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ success: false, message: 'Nome é obrigatório.' });
    const modulo = lerModulo(req.body.modulo);
    if (modulo === false) return res.status(400).json({ success: false, message: 'Módulo do app inválido.' });
    const funcao = await Funcao.create({ nome, descricao, modulo: modulo ?? null });
    return res.status(201).json({ success: true, data: funcao });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/lookup/funcoes/:id
async function atualizarFuncao(req, res, next) {
  try {
    const funcao = await Funcao.findOne({ where: { id: req.params.id } });
    if (!funcao) return res.status(404).json({ success: false, message: 'Função não encontrada.' });
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ success: false, message: 'Nome é obrigatório.' });
    const modulo = lerModulo(req.body.modulo);
    if (modulo === false) return res.status(400).json({ success: false, message: 'Módulo do app inválido.' });
    await funcao.update({
      nome,
      descricao: descricao !== undefined ? descricao : funcao.descricao,
      modulo: modulo !== undefined ? modulo : funcao.modulo,
    });
    return res.json({ success: true, data: funcao, message: 'Função atualizada com sucesso!' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/lookup/funcoes/:id
async function removerFuncao(req, res, next) {
  try {
    const funcao = await Funcao.findOne({ where: { id: req.params.id } });
    if (!funcao) return res.status(404).json({ success: false, message: 'Função não encontrada.' });
    await funcao.destroy();
    return res.json({ success: true, message: 'Função removida com sucesso!' });
  } catch (error) {
    return next(error);
  }
}

// ── CATEGORIAS FORNECEDOR ─────────────────────────────────────

// GET /api/lookup/categorias-fornecedor
async function listarCategoriasFornecedor(req, res, next) {
  try {
    const categorias = await CategoriaFornecedor.findAll({ order: [['nome', 'ASC']] });
    return res.json({ success: true, data: categorias });
  } catch (error) {
    return next(error);
  }
}

// POST /api/lookup/categorias-fornecedor
async function criarCategoriaFornecedor(req, res, next) {
  try {
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ success: false, message: 'Nome é obrigatório.' });
    const categoria = await CategoriaFornecedor.create({ nome, descricao });
    return res.status(201).json({ success: true, data: categoria });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/lookup/categorias-fornecedor/:id
async function atualizarCategoriaFornecedor(req, res, next) {
  try {
    const categoria = await CategoriaFornecedor.findOne({ where: { id: req.params.id } });
    if (!categoria) return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ success: false, message: 'Nome é obrigatório.' });
    await categoria.update({ nome, descricao: descricao !== undefined ? descricao : categoria.descricao });
    return res.json({ success: true, data: categoria, message: 'Categoria atualizada com sucesso!' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/lookup/categorias-fornecedor/:id
async function removerCategoriaFornecedor(req, res, next) {
  try {
    const categoria = await CategoriaFornecedor.findOne({ where: { id: req.params.id } });
    if (!categoria) return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
    await categoria.destroy();
    return res.json({ success: true, message: 'Categoria removida com sucesso!' });
  } catch (error) {
    return next(error);
  }
}

// ── CATEGORIAS PRODUTO ────────────────────────────────────────

// GET /api/lookup/categorias-produto
async function listarCategoriasProduto(req, res, next) {
  try {
    const categorias = await CategoriaProduto.findAll({ order: [['nome', 'ASC']] });
    return res.json({ success: true, data: categorias });
  } catch (error) {
    return next(error);
  }
}

// POST /api/lookup/categorias-produto
async function criarCategoriaProduto(req, res, next) {
  try {
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ success: false, message: 'Nome é obrigatório.' });
    const categoria = await CategoriaProduto.create({ nome, descricao });
    return res.status(201).json({ success: true, data: categoria });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/lookup/categorias-produto/:id
async function atualizarCategoriaProduto(req, res, next) {
  try {
    const categoria = await CategoriaProduto.findOne({ where: { id: req.params.id } });
    if (!categoria) return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
    const { nome, descricao } = req.body;
    if (!nome) return res.status(400).json({ success: false, message: 'Nome é obrigatório.' });
    await categoria.update({ nome, descricao: descricao !== undefined ? descricao : categoria.descricao });
    return res.json({ success: true, data: categoria, message: 'Categoria atualizada com sucesso!' });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/lookup/categorias-produto/:id
async function removerCategoriaProduto(req, res, next) {
  try {
    const categoria = await CategoriaProduto.findOne({ where: { id: req.params.id } });
    if (!categoria) return res.status(404).json({ success: false, message: 'Categoria não encontrada.' });
    await categoria.destroy();
    return res.json({ success: true, message: 'Categoria removida com sucesso!' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listarFuncoes, criarFuncao, atualizarFuncao, removerFuncao,
  listarCategoriasFornecedor, criarCategoriaFornecedor, atualizarCategoriaFornecedor, removerCategoriaFornecedor,
  listarCategoriasProduto, criarCategoriaProduto, atualizarCategoriaProduto, removerCategoriaProduto,
};
