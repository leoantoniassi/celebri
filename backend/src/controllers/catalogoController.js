// ============================================================
// Controller: Catálogos de Buffet
// ============================================================
const { Catalogo } = require('../models');
const { validarUrlHttp } = require('../utils/validators');

const MSG_URL_INVALIDA = 'O link do catálogo deve começar com http:// ou https://.';

/** Vazio -> null; http(s) válido -> URL; qualquer outra coisa -> undefined (inválido). */
function lerUrlExterna(valor) {
  if (valor === null || valor === undefined || String(valor).trim() === '') return null;
  return validarUrlHttp(valor) || undefined;
}

// GET /api/catalogos
async function listar(req, res, next) {
  try {
    const catalogos = await Catalogo.findAll({
      order: [['criadoEm', 'DESC']],
    });
    return res.json({ success: true, data: catalogos });
  } catch (error) {
    return next(error);
  }
}

// POST /api/catalogos
async function criar(req, res, next) {
  try {
    const { titulo, descricao, precoBase, urlExterna } = req.body;

    if (!titulo) {
      return res.status(400).json({ success: false, message: 'O título é obrigatório.' });
    }

    const url = lerUrlExterna(urlExterna);
    if (url === undefined) {
      return res.status(400).json({ success: false, message: MSG_URL_INVALIDA });
    }

    const catalogo = await Catalogo.create({
      titulo,
      descricao: descricao || null,
      precoBase: precoBase ? parseFloat(precoBase) : null,
      urlExterna: url,
    });

    return res.status(201).json({
      success: true,
      message: 'Catálogo criado com sucesso!',
      data: catalogo,
    });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/catalogos/:id
async function atualizar(req, res, next) {
  try {
    const catalogo = await Catalogo.findOne({ where: { id: req.params.id } });
    if (!catalogo) {
      return res.status(404).json({ success: false, message: 'Catálogo não encontrado.' });
    }

    const { titulo, descricao, precoBase, urlExterna, ativo } = req.body;

    const url = urlExterna !== undefined ? lerUrlExterna(urlExterna) : catalogo.urlExterna;
    if (url === undefined) {
      return res.status(400).json({ success: false, message: MSG_URL_INVALIDA });
    }

    await catalogo.update({
      titulo: titulo || catalogo.titulo,
      descricao: descricao !== undefined ? descricao : catalogo.descricao,
      precoBase: precoBase !== undefined ? (precoBase ? parseFloat(precoBase) : null) : catalogo.precoBase,
      urlExterna: url,
      ativo: ativo !== undefined ? (ativo === 'true' || ativo === true) : catalogo.ativo,
      atualizadoEm: new Date(),
    });

    return res.json({
      success: true,
      message: 'Catálogo atualizado com sucesso!',
      data: catalogo,
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/catalogos/:id (soft delete)
async function remover(req, res, next) {
  try {
    const catalogo = await Catalogo.findOne({ where: { id: req.params.id } });
    if (!catalogo) {
      return res.status(404).json({ success: false, message: 'Catálogo não encontrado.' });
    }

    await catalogo.update({ deletadoEm: new Date() });

    return res.json({
      success: true,
      message: 'Catálogo removido com sucesso!',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, criar, atualizar, remover };
