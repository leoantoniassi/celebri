// ============================================================
// Controller: Produtos (Estoque)
// ============================================================
const { Op } = require('sequelize');
const { Produto, CategoriaProduto } = require('../models');
const { contem } = require('../utils/escapeLike');
const { garantirExistenciaNoTenant, erroFiltroUuid } = require('../utils/tenantFk');

// GET /api/produtos
async function listar(req, res, next) {
  try {
    const { page = 1, limit = 20, busca, categoriaId, estoqueBaixo } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    if (busca !== undefined && typeof busca !== 'string') {
      return res.status(400).json({ success: false, message: 'Busca inválida.' });
    }
    const erroCategoria = erroFiltroUuid(categoriaId, 'Categoria');
    if (erroCategoria) {
      return res.status(400).json({ success: false, message: erroCategoria });
    }

    const where = {};
    if (busca) {
      where.nome = { [Op.iLike]: contem(busca) };
    }
    if (categoriaId) {
      where.categoriaId = categoriaId;
    }
    // Filtra apenas itens com estoque abaixo do mínimo
    if (estoqueBaixo === 'true') {
      where[Op.and] = [
        Op.where(Op.col('prd_quantidade'), Op.lte, Op.col('prd_estoque_minimo'))
      ];
    }

    const { count, rows } = await Produto.findAndCountAll({
      where,
      include: [{ model: CategoriaProduto, as: 'categoria', attributes: ['id', 'nome'] }],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      order: [['nome', 'ASC']],
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/produtos/:id
async function buscarPorId(req, res, next) {
  try {
    const produto = await Produto.findOne({
      where: { id: req.params.id },
      include: [{ model: CategoriaProduto, as: 'categoria', attributes: ['id', 'nome'] }],
    });
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado.',
      });
    }

    return res.json({ success: true, data: produto });
  } catch (error) {
    return next(error);
  }
}

// POST /api/produtos
async function criar(req, res, next) {
  try {
    const { nome, categoriaId, quantidade, estoqueMinimo, unidadeMedida, custoUnitario } = req.body;

    if (!nome || !categoriaId || !unidadeMedida) {
      return res.status(400).json({
        success: false,
        message: 'Nome, categoria e unidade de medida são obrigatórios.',
      });
    }

    await garantirExistenciaNoTenant(CategoriaProduto, categoriaId, 'Categoria');

    const produto = await Produto.create({
      nome,
      categoriaId,
      quantidade:     Number(quantidade)     || 0,
      estoqueMinimo:  Number(estoqueMinimo)  || 0,
      unidadeMedida,
      custoUnitario:  Number(custoUnitario)  || 0,
    });

    const produtoCompleto = await Produto.findOne({
      where: { id: produto.id },
      include: [{ model: CategoriaProduto, as: 'categoria', attributes: ['id', 'nome'] }],
    });

    return res.status(201).json({
      success: true,
      message: 'Produto criado com sucesso!',
      data: produtoCompleto,
    });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/produtos/:id
async function atualizar(req, res, next) {
  try {
    const produto = await Produto.findOne({ where: { id: req.params.id } });
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado.',
      });
    }

    const { nome, categoriaId, quantidade, estoqueMinimo, unidadeMedida, custoUnitario } = req.body;

    await garantirExistenciaNoTenant(CategoriaProduto, categoriaId, 'Categoria');

    await produto.update({
      nome:          nome          || produto.nome,
      categoriaId:   categoriaId   || produto.categoriaId,
      quantidade:    quantidade    !== undefined ? Number(quantidade)    : produto.quantidade,
      estoqueMinimo: estoqueMinimo !== undefined ? Number(estoqueMinimo) : produto.estoqueMinimo,
      unidadeMedida: unidadeMedida || produto.unidadeMedida,
      custoUnitario: custoUnitario !== undefined ? Number(custoUnitario) : produto.custoUnitario,
      atualizadoEm: new Date(),
    });

    return res.json({
      success: true,
      message: 'Produto atualizado com sucesso!',
      data: produto,
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/produtos/:id (soft delete)
async function remover(req, res, next) {
  try {
    const produto = await Produto.findOne({ where: { id: req.params.id } });
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado.',
      });
    }

    await produto.update({ deletadoEm: new Date() });

    return res.json({
      success: true,
      message: 'Produto removido com sucesso!',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
