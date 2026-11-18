// ============================================================
// Controller: Produtos reservados para o evento — painel web
// Alimenta a aba "Estoque" da cozinha no app (GET /operacao/.../cozinha).
// ============================================================
const { EventoProduto, Evento, Produto } = require('../models');
const { isValidUUID } = require('../utils/validators');
const { garantirExistenciaNoTenant } = require('../utils/tenantFk');

const naoEncontrado = (res, oque) => res.status(404).json({ success: false, message: `${oque} não encontrado.` });
const erro400 = (res, message) => res.status(400).json({ success: false, message });

const includeProduto = [{
  model: Produto,
  as: 'produto',
  attributes: ['id', 'nome', 'unidadeMedida', 'quantidade', 'estoqueMinimo'],
}];

/** Quantidade reservada: número > 0; devolve o número ou null se inválida. */
function lerQuantidade(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const qtd = Number(valor);
  if (!Number.isFinite(qtd) || qtd <= 0 || qtd > 99999999) return null;
  return qtd;
}

// GET /api/eventos/:eventoId/produtos
async function listar(req, res, next) {
  try {
    if (!isValidUUID(req.params.eventoId)) return naoEncontrado(res, 'Evento');
    const itens = await EventoProduto.findAll({
      where: { eventoId: req.params.eventoId },
      include: includeProduto,
      order: [[{ model: Produto, as: 'produto' }, 'nome', 'ASC']],
    });
    return res.json({ success: true, data: itens });
  } catch (error) {
    return next(error);
  }
}

// POST /api/eventos/:eventoId/produtos { produtoId, quantidade }
async function adicionar(req, res, next) {
  try {
    if (!isValidUUID(req.params.eventoId)) return naoEncontrado(res, 'Evento');
    const { produtoId } = req.body || {};
    if (!produtoId) return erro400(res, 'Selecione um produto.');
    const quantidade = lerQuantidade(req.body.quantidade);
    if (quantidade === null) return erro400(res, 'Informe uma quantidade maior que zero.');

    const evento = await garantirExistenciaNoTenant(Evento, req.params.eventoId, 'Evento');
    await garantirExistenciaNoTenant(Produto, produtoId, 'Produto');

    // A tabela tem UNIQUE (evento, produto) e a remoção é soft delete:
    // se o produto já esteve no evento, reativa a linha em vez de duplicar.
    const existente = await EventoProduto.scope('comDeletados').findOne({
      where: { eventoId: evento.id, produtoId },
    });

    let item;
    if (existente) {
      item = await existente.update({ quantidade, deletadoEm: null, atualizadoEm: new Date() });
    } else {
      item = await EventoProduto.create({ eventoId: evento.id, produtoId, quantidade });
    }
    return res.status(201).json({ success: true, message: 'Produto reservado para o evento!', data: item });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/evento-produtos/:id { quantidade }
async function atualizar(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) return naoEncontrado(res, 'Item');
    const quantidade = lerQuantidade(req.body?.quantidade);
    if (quantidade === null) return erro400(res, 'Informe uma quantidade maior que zero.');

    const item = await EventoProduto.findOne({ where: { id: req.params.id } });
    if (!item) return naoEncontrado(res, 'Item');

    await item.update({ quantidade, atualizadoEm: new Date() });
    return res.json({ success: true, message: 'Quantidade atualizada!', data: item });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/evento-produtos/:id
async function remover(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) return naoEncontrado(res, 'Item');
    const item = await EventoProduto.findOne({ where: { id: req.params.id } });
    if (!item) return naoEncontrado(res, 'Item');

    await item.update({ deletadoEm: new Date() });
    return res.json({ success: true, message: 'Produto removido do evento.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, adicionar, atualizar, remover, lerQuantidade };
