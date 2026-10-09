// ============================================================
// Controller: Locais
// ============================================================
const { Op } = require('sequelize');
const { Local } = require('../models');
const { contem } = require('../utils/escapeLike');

// GET /api/locais
async function listar(req, res, next) {
  try {
    const { page = 1, limit = 50, busca, cidade } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    if ((busca !== undefined && typeof busca !== 'string') || (cidade !== undefined && typeof cidade !== 'string')) {
      return res.status(400).json({ success: false, message: 'Filtro inválido.' });
    }

    const where = {};
    if (busca) {
      where[Op.or] = [
        { nome:       { [Op.iLike]: contem(busca) } },
        { logradouro: { [Op.iLike]: contem(busca) } },
        { bairro:     { [Op.iLike]: contem(busca) } },
      ];
    }
    if (cidade) {
      where.cidade = { [Op.iLike]: contem(cidade) };
    }

    const { count, rows } = await Local.findAndCountAll({
      where,
      limit: limitNum,
      offset,
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

// GET /api/locais/:id
async function buscarPorId(req, res, next) {
  try {
    const local = await Local.findOne({ where: { id: req.params.id } });
    if (!local) {
      return res.status(404).json({ success: false, message: 'Local não encontrado.' });
    }
    return res.json({ success: true, data: local });
  } catch (error) {
    return next(error);
  }
}

// POST /api/locais
async function criar(req, res, next) {
  try {
    const { nome, logradouro, numero, complemento, bairro, cidade, estado, cep, observacoes, capacidadeMaxima } = req.body;

    if (!nome || !logradouro || !numero || !bairro || !cidade || !estado || !cep) {
      return res.status(400).json({
        success: false,
        message: 'Nome, logradouro, número, bairro, cidade, estado e CEP são obrigatórios.',
      });
    }

    if (capacidadeMaxima !== undefined && capacidadeMaxima !== null && (!Number.isInteger(capacidadeMaxima) || capacidadeMaxima < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Capacidade máxima deve ser um número inteiro não negativo ou vazio.',
      });
    }

    const local = await Local.create({ nome, logradouro, numero, complemento, bairro, cidade, estado, cep, observacoes, capacidadeMaxima });
    return res.status(201).json({ success: true, message: 'Local criado com sucesso!', data: local });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/locais/:id
async function atualizar(req, res, next) {
  try {
    const local = await Local.findOne({ where: { id: req.params.id } });
    if (!local) {
      return res.status(404).json({ success: false, message: 'Local não encontrado.' });
    }

    const { nome, logradouro, numero, complemento, bairro, cidade, estado, cep, observacoes, capacidadeMaxima } = req.body;

    if (capacidadeMaxima !== undefined && capacidadeMaxima !== null && (!Number.isInteger(capacidadeMaxima) || capacidadeMaxima < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Capacidade máxima deve ser um número inteiro não negativo ou vazio.',
      });
    }

    await local.update({
      nome:             nome                    || local.nome,
      logradouro:       logradouro              || local.logradouro,
      numero:           numero                  || local.numero,
      complemento:      complemento !== undefined ? complemento : local.complemento,
      bairro:           bairro                  || local.bairro,
      cidade:           cidade                  || local.cidade,
      estado:           estado                  || local.estado,
      cep:              cep                     || local.cep,
      observacoes:      observacoes !== undefined ? observacoes : local.observacoes,
      capacidadeMaxima: capacidadeMaxima !== undefined ? capacidadeMaxima : local.capacidadeMaxima,
      atualizadoEm: new Date(),
    });

    return res.json({ success: true, message: 'Local atualizado com sucesso!', data: local });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/locais/:id (soft delete)
async function remover(req, res, next) {
  try {
    const local = await Local.findOne({ where: { id: req.params.id } });
    if (!local) {
      return res.status(404).json({ success: false, message: 'Local não encontrado.' });
    }

    await local.update({ deletadoEm: new Date() });
    return res.json({ success: true, message: 'Local removido com sucesso!' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };
