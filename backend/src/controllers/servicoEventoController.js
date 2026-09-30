// ============================================================
// Controller: Cardápio/cronograma da cozinha por evento — painel web
// ============================================================
const { ServicoEvento, Evento } = require('../models');
const { isValidUUID } = require('../utils/validators');

const naoEncontrado = (res, oque) => res.status(404).json({ success: false, message: `${oque} não encontrado.` });

/** Valida item/quantidade/unidade/horário; devolve { dados } ou { erro }. */
function lerDadosServico(body, { parcial = false } = {}) {
  const dados = {};

  if (body.item !== undefined || !parcial) {
    const item = String(body.item ?? '').trim();
    if (!item || item.length > 150) return { erro: 'Informe o que será servido (até 150 caracteres).' };
    dados.item = item;
  }
  if (body.quantidade !== undefined) {
    if (body.quantidade === null || body.quantidade === '') {
      dados.quantidade = null;
    } else {
      const qtd = Number(body.quantidade);
      if (!Number.isFinite(qtd) || qtd < 0 || qtd > 99999999) return { erro: 'Quantidade inválida.' };
      dados.quantidade = qtd;
    }
  }
  if (body.unidade !== undefined) {
    const unidade = String(body.unidade ?? '').trim();
    if (unidade.length > 30) return { erro: 'Unidade deve ter até 30 caracteres.' };
    dados.unidade = unidade || null;
  }
  if (body.horario !== undefined) {
    if (body.horario === null || body.horario === '') {
      dados.horario = null;
    } else {
      const horario = new Date(body.horario);
      if (Number.isNaN(horario.getTime())) return { erro: 'Horário inválido.' };
      dados.horario = horario;
    }
  }
  if (body.observacao !== undefined) dados.observacao = body.observacao ? String(body.observacao).slice(0, 1000) : null;
  if (body.status !== undefined) {
    if (!['pendente', 'preparando', 'servido'].includes(body.status)) return { erro: 'Status inválido.' };
    dados.status = body.status;
  }
  return { dados };
}

// GET /api/eventos/:eventoId/servicos
async function listar(req, res, next) {
  try {
    if (!isValidUUID(req.params.eventoId)) return naoEncontrado(res, 'Evento');
    const servicos = await ServicoEvento.findAll({
      where: { eventoId: req.params.eventoId },
      order: [['horario', 'ASC NULLS LAST'], ['item', 'ASC']],
    });
    return res.json({ success: true, data: servicos });
  } catch (error) {
    return next(error);
  }
}

// POST /api/eventos/:eventoId/servicos
async function criar(req, res, next) {
  try {
    if (!isValidUUID(req.params.eventoId)) return naoEncontrado(res, 'Evento');
    const evento = await Evento.findOne({ where: { id: req.params.eventoId } });
    if (!evento) return naoEncontrado(res, 'Evento');

    const { dados, erro } = lerDadosServico(req.body);
    if (erro) return res.status(400).json({ success: false, message: erro });

    const servico = await ServicoEvento.create({ ...dados, eventoId: evento.id });
    return res.status(201).json({ success: true, message: 'Item adicionado ao cardápio!', data: servico });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/servicos/:id
async function atualizar(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) return naoEncontrado(res, 'Item');
    const servico = await ServicoEvento.findOne({ where: { id: req.params.id } });
    if (!servico) return naoEncontrado(res, 'Item');

    const { dados, erro } = lerDadosServico(req.body, { parcial: true });
    if (erro) return res.status(400).json({ success: false, message: erro });

    await servico.update({ ...dados, atualizadoEm: new Date() });
    return res.json({ success: true, message: 'Item atualizado!', data: servico });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/servicos/:id
async function remover(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) return naoEncontrado(res, 'Item');
    const servico = await ServicoEvento.findOne({ where: { id: req.params.id } });
    if (!servico) return naoEncontrado(res, 'Item');

    await servico.update({ deletadoEm: new Date() });
    return res.json({ success: true, message: 'Item removido.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, criar, atualizar, remover, lerDadosServico };
