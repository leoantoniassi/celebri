// ============================================================
// Controller: Mesas (layout do salão) — painel web
// ============================================================
const { Mesa, Local } = require('../models');
const { isValidUUID } = require('../utils/validators');

const naoEncontrado = (res, oque) => res.status(404).json({ success: false, message: `${oque} não encontrado(a).` });

/** Valida numero/lugares/posição; devolve { dados } ou { erro }. */
function lerDadosMesa(body, { parcial = false } = {}) {
  const dados = {};

  if (body.numero !== undefined || !parcial) {
    const numero = String(body.numero ?? '').trim();
    if (!numero || numero.length > 10) return { erro: 'Informe o número da mesa (até 10 caracteres).' };
    dados.numero = numero;
  }
  if (body.lugares !== undefined) {
    const lugares = Number(body.lugares);
    if (!Number.isInteger(lugares) || lugares < 1 || lugares > 50) return { erro: 'Lugares deve ser de 1 a 50.' };
    dados.lugares = lugares;
  }
  for (const [campo, chave] of [['posX', 'posX'], ['posY', 'posY']]) {
    if (body[campo] === undefined) continue;
    const valor = Number(body[campo]);
    if (!Number.isFinite(valor) || valor < 0 || valor > 100) return { erro: 'Posição da mesa inválida.' };
    dados[chave] = Math.round(valor * 100) / 100;
  }
  return { dados };
}

// GET /api/locais/:localId/mesas
async function listar(req, res, next) {
  try {
    if (!isValidUUID(req.params.localId)) return naoEncontrado(res, 'Local');
    const mesas = await Mesa.findAll({ where: { localId: req.params.localId }, order: [['numero', 'ASC']] });
    return res.json({ success: true, data: mesas });
  } catch (error) {
    return next(error);
  }
}

// POST /api/locais/:localId/mesas
async function criar(req, res, next) {
  try {
    if (!isValidUUID(req.params.localId)) return naoEncontrado(res, 'Local');
    const local = await Local.findOne({ where: { id: req.params.localId } });
    if (!local) return naoEncontrado(res, 'Local');

    const { dados, erro } = lerDadosMesa(req.body);
    if (erro) return res.status(400).json({ success: false, message: erro });

    const mesa = await Mesa.create({ ...dados, localId: local.id });
    return res.status(201).json({ success: true, message: 'Mesa criada!', data: mesa });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Já existe uma mesa com esse número neste local.' });
    }
    return next(error);
  }
}

// PUT /api/mesas/:id
async function atualizar(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) return naoEncontrado(res, 'Mesa');
    const mesa = await Mesa.findOne({ where: { id: req.params.id } });
    if (!mesa) return naoEncontrado(res, 'Mesa');

    const { dados, erro } = lerDadosMesa(req.body, { parcial: true });
    if (erro) return res.status(400).json({ success: false, message: erro });

    await mesa.update({ ...dados, atualizadoEm: new Date() });
    return res.json({ success: true, message: 'Mesa atualizada!', data: mesa });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Já existe uma mesa com esse número neste local.' });
    }
    return next(error);
  }
}

// DELETE /api/mesas/:id
async function remover(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) return naoEncontrado(res, 'Mesa');
    const mesa = await Mesa.findOne({ where: { id: req.params.id } });
    if (!mesa) return naoEncontrado(res, 'Mesa');

    await mesa.update({ deletadoEm: new Date() });
    return res.json({ success: true, message: 'Mesa removida.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, criar, atualizar, remover };
