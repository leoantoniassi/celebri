// ============================================================
// Testes: Produtos reservados para o evento (painel web)
// São eles que aparecem na aba Estoque da cozinha no app.
// ============================================================
const request = require('supertest');
const express = require('express');

let mockUsuario;
jest.mock('../middleware/auth', () => (req, _res, next) => { req.user = mockUsuario; next(); });

jest.mock('../config/database', () => ({
  transaction: jest.fn((fn) => fn('tx')),
  define: jest.fn(),
}));

jest.mock('../models', () => {
  const EventoProduto = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() };
  const comDeletados = { findOne: jest.fn() };
  EventoProduto.scope = jest.fn(() => comDeletados);
  EventoProduto.__comDeletados = comDeletados;
  // operacao.routes carrega o operacaoController, que monta includes com Mesa.unscoped().
  const Mesa = {};
  Mesa.unscoped = () => Mesa;
  return {
    Evento: { findOne: jest.fn() },
    Produto: { findOne: jest.fn() },
    EventoProduto,
    Mesa,
  };
});

const { Evento, Produto, EventoProduto } = require('../models');
const errorHandler = require('../middleware/errorHandler');

const EVENTO_ID = '11111111-1111-4111-8111-111111111111';
const PRODUTO_ID = '22222222-2222-4222-8222-222222222222';
const ITEM_ID = '33333333-3333-4333-8333-333333333333';

function criarApp() {
  const app = express();
  app.use(express.json());
  const { eventoProdutosRouter } = require('../routes/operacao.routes');
  app.use('/api/eventos', require('../routes/eventos.routes'));
  app.use('/api/evento-produtos', eventoProdutosRouter);
  app.use(errorHandler);
  return app;
}

describe('Produtos do evento (painel)', () => {
  let app;
  const base = `/api/eventos/${EVENTO_ID}/produtos`;
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  afterAll(() => log.mockRestore());

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsuario = { id: 'usr-1', role: 'operador', empresaId: 'emp-1', funcionarioId: null };
    Evento.findOne.mockResolvedValue({ id: EVENTO_ID });
    Produto.findOne.mockResolvedValue({ id: PRODUTO_ID });
    EventoProduto.__comDeletados.findOne.mockResolvedValue(null);
    app = criarApp();
  });

  test('GET lista os produtos reservados com os dados do produto', async () => {
    EventoProduto.findAll.mockResolvedValue([{ id: ITEM_ID, quantidade: '5.00', produto: { nome: 'Refrigerante' } }]);

    const res = await request(app).get(base);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(EventoProduto.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { eventoId: EVENTO_ID } }));
  });

  test('POST cria a reserva quando o produto ainda não está no evento', async () => {
    EventoProduto.create.mockResolvedValue({ id: ITEM_ID });

    const res = await request(app).post(base).send({ produtoId: PRODUTO_ID, quantidade: '12.5' });

    expect(res.status).toBe(201);
    expect(EventoProduto.create).toHaveBeenCalledWith({ eventoId: EVENTO_ID, produtoId: PRODUTO_ID, quantidade: 12.5 });
  });

  test('POST reativa a linha removida (UNIQUE evento+produto) em vez de duplicar', async () => {
    const existente = { id: ITEM_ID, update: jest.fn().mockImplementation(function () { return Promise.resolve(this); }) };
    EventoProduto.__comDeletados.findOne.mockResolvedValue(existente);

    const res = await request(app).post(base).send({ produtoId: PRODUTO_ID, quantidade: 3 });

    expect(res.status).toBe(201);
    expect(EventoProduto.scope).toHaveBeenCalledWith('comDeletados');
    expect(existente.update).toHaveBeenCalledWith(expect.objectContaining({ quantidade: 3, deletadoEm: null }));
    expect(EventoProduto.create).not.toHaveBeenCalled();
  });

  test.each([[0], [-1], ['abc'], [''], [null]])('POST com quantidade %p -> 400', async (quantidade) => {
    const res = await request(app).post(base).send({ produtoId: PRODUTO_ID, quantidade });

    expect(res.status).toBe(400);
    expect(EventoProduto.create).not.toHaveBeenCalled();
  });

  test('POST sem produto -> 400', async () => {
    const res = await request(app).post(base).send({ quantidade: 2 });
    expect(res.status).toBe(400);
  });

  test('POST com produto de outro buffet/inexistente -> 404', async () => {
    Produto.findOne.mockResolvedValue(null);

    const res = await request(app).post(base).send({ produtoId: PRODUTO_ID, quantidade: 2 });

    expect(res.status).toBe(404);
    expect(EventoProduto.create).not.toHaveBeenCalled();
  });

  test('PUT atualiza a quantidade', async () => {
    const item = { id: ITEM_ID, update: jest.fn().mockResolvedValue(true) };
    EventoProduto.findOne.mockResolvedValue(item);

    const res = await request(app).put(`/api/evento-produtos/${ITEM_ID}`).send({ quantidade: 7 });

    expect(res.status).toBe(200);
    expect(item.update).toHaveBeenCalledWith(expect.objectContaining({ quantidade: 7 }));
  });

  test('DELETE faz soft delete', async () => {
    const item = { id: ITEM_ID, update: jest.fn().mockResolvedValue(true) };
    EventoProduto.findOne.mockResolvedValue(item);

    const res = await request(app).delete(`/api/evento-produtos/${ITEM_ID}`);

    expect(res.status).toBe(200);
    expect(item.update).toHaveBeenCalledWith({ deletadoEm: expect.any(Date) });
  });

  test('DELETE de item inexistente -> 404', async () => {
    EventoProduto.findOne.mockResolvedValue(null);
    const res = await request(app).delete(`/api/evento-produtos/${ITEM_ID}`);
    expect(res.status).toBe(404);
  });

  test('funcionário de campo (cozinha) não gerencia a reserva -> 403', async () => {
    mockUsuario = { id: 'usr-2', role: 'operador', empresaId: 'emp-1', funcionarioId: 'fun-1' };

    const res = await request(app).post(base).send({ produtoId: PRODUTO_ID, quantidade: 2 });

    expect(res.status).toBe(403);
  });
});
