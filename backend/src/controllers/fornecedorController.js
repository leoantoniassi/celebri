// ============================================================
// Controller: Fornecedores
// ============================================================
const { Op } = require('sequelize');
const { Fornecedor, CategoriaFornecedor } = require('../models');
const { gerarLinkWhatsApp } = require('../utils/whatsapp');
const { saudacaoWhatsapp } = require('../utils/brand');
const { contem } = require('../utils/escapeLike');
const { garantirExistenciaNoTenant, erroFiltroUuid } = require('../utils/tenantFk');

// GET /api/fornecedores
async function listar(req, res, next) {
  try {
    const { page = 1, limit = 20, busca, categoriaId } = req.query;
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
      where[Op.or] = [
        { nome:  { [Op.iLike]: contem(busca) } },
        { email: { [Op.iLike]: contem(busca) } },
        { cnpj:  { [Op.iLike]: contem(busca) } },
      ];
    }
    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    const { count, rows } = await Fornecedor.findAndCountAll({
      where,
      include: [{ model: CategoriaFornecedor, as: 'categoria', attributes: ['id', 'nome'] }],
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

// GET /api/fornecedores/:id
async function buscarPorId(req, res, next) {
  try {
    const fornecedor = await Fornecedor.findOne({
      where: { id: req.params.id },
      include: [{ model: CategoriaFornecedor, as: 'categoria', attributes: ['id', 'nome'] }],
    });

    if (!fornecedor) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado.',
      });
    }

    return res.json({ success: true, data: fornecedor });
  } catch (error) {
    return next(error);
  }
}

// POST /api/fornecedores
async function criar(req, res, next) {
  try {
    const { nome, email, cnpj, telefone, categoriaId } = req.body;

    if (!nome || !email || !cnpj || !telefone || !categoriaId) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email, CNPJ, telefone e categoria são obrigatórios.',
      });
    }

    await garantirExistenciaNoTenant(CategoriaFornecedor, categoriaId, 'Categoria');

    const fornecedor = await Fornecedor.create({ nome, email, cnpj, telefone, categoriaId });
    const fornecedorCompleto = await Fornecedor.findOne({
      where: { id: fornecedor.id },
      include: [{ model: CategoriaFornecedor, as: 'categoria', attributes: ['id', 'nome'] }],
    });

    return res.status(201).json({
      success: true,
      message: 'Fornecedor criado com sucesso!',
      data: fornecedorCompleto,
    });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/fornecedores/:id
async function atualizar(req, res, next) {
  try {
    const fornecedor = await Fornecedor.findOne({ where: { id: req.params.id } });
    if (!fornecedor) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado.',
      });
    }

    const { nome, email, cnpj, telefone, categoriaId } = req.body;

    await garantirExistenciaNoTenant(CategoriaFornecedor, categoriaId, 'Categoria');

    await fornecedor.update({
      nome:        nome        || fornecedor.nome,
      email:       email       || fornecedor.email,
      cnpj:        cnpj        || fornecedor.cnpj,
      telefone:    telefone    || fornecedor.telefone,
      categoriaId: categoriaId || fornecedor.categoriaId,
      atualizadoEm: new Date(),
    });

    return res.json({
      success: true,
      message: 'Fornecedor atualizado com sucesso!',
      data: fornecedor,
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/fornecedores/:id (soft delete)
async function remover(req, res, next) {
  try {
    const fornecedor = await Fornecedor.findOne({ where: { id: req.params.id } });
    if (!fornecedor) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado.',
      });
    }

    await fornecedor.update({ deletadoEm: new Date() });

    return res.json({
      success: true,
      message: 'Fornecedor removido com sucesso!',
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/fornecedores/:id/whatsapp
async function whatsapp(req, res, next) {
  try {
    const fornecedor = await Fornecedor.findOne({ where: { id: req.params.id } });
    if (!fornecedor) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado.',
      });
    }

    const link = gerarLinkWhatsApp(
      fornecedor.telefone,
      await saudacaoWhatsapp(fornecedor.nome)
    );

    return res.json({
      success: true,
      data: { link, telefone: fornecedor.telefone },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, whatsapp };
