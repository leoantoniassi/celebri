// ============================================================
// Controller: Garçom e Cozinha (app mobile)
// ============================================================
// Todas as rotas passam por exigirAcessoAoEvento (req.evento já carregado).
// O app atualiza as telas por consulta periódica (polling), então as
// respostas trazem tudo o que cada tela precisa numa chamada só.
// ============================================================
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Mesa, Pedido, PedidoItem, ServicoEvento, EventoProduto, Produto } = require('../models');
const { isValidUUID } = require('../utils/validators');

const STATUS_ABERTOS = ['enviado', 'preparando', 'pronto'];
const MAX_ITENS = 30;

// Quem pode levar o pedido de um status para o outro.
const TRANSICOES = {
  enviado: ['preparando', 'pronto', 'cancelado'],
  preparando: ['pronto', 'cancelado'],
  pronto: ['entregue', 'preparando'],
  entregue: [],
  cancelado: [],
};

const includeItens = [{
  model: PedidoItem,
  as: 'itens',
  attributes: ['id', 'descricao', 'quantidade', 'observacao', 'alerta'],
}];
const includeMesa = [{ model: Mesa.unscoped(), as: 'mesa', attributes: ['id', 'numero'] }];

function serializarPedido(pedido) {
  const json = pedido.toJSON();
  return {
    id: json.id,
    mesaId: json.mesaId,
    mesa: json.mesa?.numero ?? null,
    status: json.status,
    observacao: json.observacao,
    criadoEm: json.criadoEm,
    atualizadoEm: json.atualizadoEm,
    itens: json.itens || [],
    temAlerta: (json.itens || []).some((i) => i.alerta),
  };
}

// GET /api/operacao/eventos/:eventoId/mesas — mapa do garçom
async function mapaMesas(req, res, next) {
  try {
    const evento = req.evento;
    if (!evento.localId) {
      return res.json({
        success: true,
        message: 'Este evento não tem local definido. Cadastre o local e as mesas no painel.',
        data: [],
      });
    }

    const [mesas, abertos] = await Promise.all([
      Mesa.findAll({ where: { localId: evento.localId }, order: [['numero', 'ASC']] }),
      Pedido.findAll({
        where: { eventoId: evento.id, status: { [Op.in]: STATUS_ABERTOS } },
        attributes: ['mesaId', 'status'],
      }),
    ]);

    const data = mesas.map((m) => {
      const daMesa = abertos.filter((p) => p.mesaId === m.id);
      const prontos = daMesa.filter((p) => p.status === 'pronto').length;
      return {
        id: m.id,
        numero: m.numero,
        lugares: m.lugares,
        posX: Number(m.posX),
        posY: Number(m.posY),
        pedidosAbertos: daMesa.length,
        pedidosProntos: prontos,
        situacao: prontos > 0 ? 'pronto' : daMesa.length > 0 ? 'aguardando' : 'livre',
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

// GET /api/operacao/eventos/:eventoId/pedidos?mesaId=&abertos=true
async function listarPedidos(req, res, next) {
  try {
    const where = { eventoId: req.evento.id };
    if (req.query.mesaId) {
      if (!isValidUUID(req.query.mesaId)) return res.json({ success: true, data: [] });
      where.mesaId = req.query.mesaId;
    }
    if (req.query.abertos === 'true') where.status = { [Op.in]: STATUS_ABERTOS };

    const pedidos = await Pedido.findAll({
      where,
      include: [...includeItens, ...includeMesa],
      order: [['criadoEm', 'DESC']],
      limit: 100,
    });
    return res.json({ success: true, data: pedidos.map(serializarPedido) });
  } catch (error) {
    return next(error);
  }
}

/** Valida os itens do pedido; devolve { itens } ou { erro }. */
function lerItens(lista) {
  if (!Array.isArray(lista) || lista.length === 0) return { erro: 'Adicione pelo menos um item ao pedido.' };
  if (lista.length > MAX_ITENS) return { erro: `No máximo ${MAX_ITENS} itens por pedido.` };

  const itens = [];
  for (const bruto of lista) {
    const descricao = String(bruto?.descricao ?? '').trim();
    const quantidade = bruto?.quantidade === undefined ? 1 : Number(bruto.quantidade);
    if (!descricao || descricao.length > 150) return { erro: 'Cada item precisa de uma descrição (até 150 caracteres).' };
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 100) return { erro: 'Quantidade do item deve ser de 1 a 100.' };
    const observacao = String(bruto?.observacao ?? '').trim().slice(0, 300) || null;
    itens.push({ descricao, quantidade, observacao, alerta: bruto?.alerta === true });
  }
  return { itens };
}

// POST /api/operacao/eventos/:eventoId/pedidos { mesaId, observacao, itens[] }
async function criarPedido(req, res, next) {
  try {
    const { mesaId } = req.body || {};
    if (!isValidUUID(mesaId)) return res.status(400).json({ success: false, message: 'Escolha a mesa do pedido.' });

    const mesa = await Mesa.findOne({ where: { id: mesaId } });
    if (!mesa || mesa.localId !== req.evento.localId) {
      return res.status(400).json({ success: false, message: 'Mesa não pertence ao salão deste evento.' });
    }

    const { itens, erro } = lerItens(req.body.itens);
    if (erro) return res.status(400).json({ success: false, message: erro });

    const observacao = String(req.body.observacao ?? '').trim().slice(0, 500) || null;

    const pedido = await sequelize.transaction(async (transaction) => {
      const novo = await Pedido.create(
        { eventoId: req.evento.id, mesaId, usuarioId: req.user.id, observacao },
        { transaction }
      );
      await PedidoItem.bulkCreate(
        itens.map((i) => ({ ...i, pedidoId: novo.id, empresaId: novo.empresaId })),
        { transaction }
      );
      return novo;
    });

    const completo = await Pedido.findOne({ where: { id: pedido.id }, include: [...includeItens, ...includeMesa] });
    return res.status(201).json({ success: true, message: 'Pedido enviado para a cozinha!', data: serializarPedido(completo) });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/operacao/eventos/:eventoId/pedidos/:pedidoId/status { status }
async function mudarStatusPedido(req, res, next) {
  try {
    const { status } = req.body || {};
    if (!TRANSICOES[status] || !isValidUUID(req.params.pedidoId)) {
      return res.status(400).json({ success: false, message: 'Status inválido.' });
    }

    const pedido = await Pedido.findOne({ where: { id: req.params.pedidoId, eventoId: req.evento.id } });
    if (!pedido) return res.status(404).json({ success: false, message: 'Pedido não encontrado.' });

    if (!TRANSICOES[pedido.status].includes(status)) {
      return res.status(409).json({
        success: false,
        message: `Um pedido "${pedido.status}" não pode passar para "${status}".`,
      });
    }

    await pedido.update({ status, atualizadoEm: new Date() });
    const completo = await Pedido.findOne({ where: { id: pedido.id }, include: [...includeItens, ...includeMesa] });
    return res.json({ success: true, data: serializarPedido(completo) });
  } catch (error) {
    return next(error);
  }
}

// GET /api/operacao/eventos/:eventoId/cozinha — painel da cozinha
async function painelCozinha(req, res, next) {
  try {
    const evento = req.evento;
    const [servicos, pedidos, estoque] = await Promise.all([
      ServicoEvento.findAll({
        where: { eventoId: evento.id },
        order: [['horario', 'ASC NULLS LAST'], ['item', 'ASC']],
      }),
      Pedido.findAll({
        where: { eventoId: evento.id, status: { [Op.in]: STATUS_ABERTOS } },
        include: [...includeItens, ...includeMesa],
        order: [['criadoEm', 'ASC']],
      }),
      EventoProduto.findAll({
        where: { eventoId: evento.id },
        include: [{
          model: Produto,
          as: 'produto',
          attributes: ['id', 'nome', 'quantidade', 'estoqueMinimo', 'unidadeMedida'],
        }],
      }),
    ]);

    return res.json({
      success: true,
      data: {
        evento: {
          id: evento.id,
          nome: evento.nome,
          qtdPessoas: evento.qtdPessoas || 0,
          qtdAdultos: evento.qtdAdultos || 0,
          qtdCriancas: evento.qtdCriancas || 0,
        },
        servicos,
        pedidos: pedidos.map(serializarPedido),
        estoque: estoque
          .filter((ep) => ep.produto)
          .map((ep) => {
            const emEstoque = Number(ep.produto.quantidade);
            const minimo = Number(ep.produto.estoqueMinimo);
            return {
              produtoId: ep.produto.id,
              nome: ep.produto.nome,
              unidade: ep.produto.unidadeMedida,
              reservadoParaEvento: Number(ep.quantidade),
              emEstoque,
              estoqueMinimo: minimo,
              estoqueBaixo: emEstoque <= minimo,
            };
          }),
      },
    });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/operacao/eventos/:eventoId/servicos/:servicoId { status }
async function mudarStatusServico(req, res, next) {
  try {
    const { status } = req.body || {};
    if (!['pendente', 'preparando', 'servido'].includes(status) || !isValidUUID(req.params.servicoId)) {
      return res.status(400).json({ success: false, message: 'Status inválido.' });
    }

    const servico = await ServicoEvento.findOne({ where: { id: req.params.servicoId, eventoId: req.evento.id } });
    if (!servico) return res.status(404).json({ success: false, message: 'Item do cardápio não encontrado.' });

    await servico.update({ status, atualizadoEm: new Date() });
    return res.json({ success: true, data: servico });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  mapaMesas,
  listarPedidos,
  criarPedido,
  mudarStatusPedido,
  painelCozinha,
  mudarStatusServico,
  TRANSICOES,
};
