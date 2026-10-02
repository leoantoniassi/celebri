// ============================================================
// Testes: Garçom e Cozinha (app) + mesas e cardápio (painel)
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
  const Mesa = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() };
  Mesa.unscoped = () => Mesa;
  return {
    Evento: { findOne: jest.fn() },
    Escala: { findOne: jest.fn() },
    Local: { findOne: jest.fn() },
    Mesa,
    Pedido: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() },
    PedidoItem: { bulkCreate: jest.fn() },
    ServicoEvento: { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn() },
    EventoProduto: { findAll: jest.fn() },
    Produto: {},
  };
});

const { Evento, Escala, Local, Mesa, Pedido, PedidoItem, ServicoEvento, EventoProduto } = require('../models');

const EVENTO_ID = '11111111-1111-4111-8111-111111111111';
const LOCAL_ID = '33333333-3333-4333-8333-333333333333';
const MESA_ID = '44444444-4444-4444-8444-444444444444';
const PEDIDO_ID = '55555555-5555-4555-8555-555555555555';

const pedidoJson = (extra = {}) => ({
  toJSON: () => ({
    id: PEDIDO_ID, mesaId: MESA_ID, mesa: { numero: '5' }, status: 'enviado',
    itens: [{ descricao: 'Suco', quantidade: 2, alerta: false }], ...extra,
  }),
});

function criarApp() {
  const app = express();
  app.use(express.json());
  const { operacaoRouter, mesasRouter } = require('../routes/operacao.routes');
  app.use('/api/operacao', operacaoRouter);
  app.use('/api/mesas', mesasRouter);
  app.use('/api/locais', require('../routes/locais.routes'));
  app.use('/api/eventos', require('../routes/eventos.routes'));
  app.use((err, _req, res, _next) => res.status(500).json({ success: false, message: err.message }));
  return app;
}

describe('Garçom e cozinha', () => {
  let app;
  const base = `/api/operacao/eventos/${EVENTO_ID}`;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsuario = { id: 'usr-1', role: 'operador', empresaId: 'emp-1', funcionarioId: 'fun-1' };
    Evento.findOne.mockResolvedValue({
      id: EVENTO_ID, nome: 'Festa', localId: LOCAL_ID, qtdPessoas: 80, qtdAdultos: 50, qtdCriancas: 30,
    });
    Escala.findOne.mockResolvedValue({ id: 'esc-1' });
    app = criarApp();
  });

  describe('mapa de mesas', () => {
    test('marca mesa com pedido pronto, aguardando e livre', async () => {
      Mesa.findAll.mockResolvedValue([
        { id: 'm1', numero: '1', lugares: 4, posX: '10.00', posY: '20.00' },
        { id: 'm2', numero: '2', lugares: 6, posX: '50', posY: '50' },
        { id: 'm3', numero: '3', lugares: 8, posX: '90', posY: '80' },
      ]);
      Pedido.findAll.mockResolvedValue([
        { mesaId: 'm1', status: 'pronto' },
        { mesaId: 'm1', status: 'enviado' },
        { mesaId: 'm2', status: 'preparando' },
      ]);

      const res = await request(app).get(`${base}/mesas`);

      expect(res.status).toBe(200);
      expect(res.body.data.map((m) => m.situacao)).toEqual(['pronto', 'aguardando', 'livre']);
      expect(res.body.data[0]).toMatchObject({ posX: 10, posY: 20, pedidosAbertos: 2, pedidosProntos: 1 });
    });

    test('evento sem local devolve lista vazia com aviso', async () => {
      Evento.findOne.mockResolvedValue({ id: EVENTO_ID, localId: null });
      const res = await request(app).get(`${base}/mesas`);
      expect(res.body.data).toEqual([]);
      expect(res.body.message).toContain('não tem local');
    });

    test('garçom não escalado no evento recebe 403', async () => {
      Escala.findOne.mockResolvedValue(null);
      const res = await request(app).get(`${base}/mesas`);
      expect(res.status).toBe(403);
    });
  });

  describe('novo pedido', () => {
    const itens = [
      { descricao: 'Suco de laranja', quantidade: 2 },
      { descricao: 'Mini pizza', quantidade: 1, observacao: 'sem glúten', alerta: true },
    ];

    test('cria pedido com itens na mesma transação', async () => {
      Mesa.findOne.mockResolvedValue({ id: MESA_ID, localId: LOCAL_ID });
      Pedido.create.mockResolvedValue({ id: PEDIDO_ID, empresaId: 'emp-1' });
      Pedido.findOne.mockResolvedValue(pedidoJson());

      const res = await request(app).post(`${base}/pedidos`).send({ mesaId: MESA_ID, itens });

      expect(res.status).toBe(201);
      expect(Pedido.create).toHaveBeenCalledWith(
        expect.objectContaining({ eventoId: EVENTO_ID, mesaId: MESA_ID, usuarioId: 'usr-1' }),
        { transaction: 'tx' }
      );
      expect(PedidoItem.bulkCreate).toHaveBeenCalledWith(
        [
          expect.objectContaining({ descricao: 'Suco de laranja', quantidade: 2, alerta: false, empresaId: 'emp-1' }),
          expect.objectContaining({ descricao: 'Mini pizza', observacao: 'sem glúten', alerta: true }),
        ],
        { transaction: 'tx' }
      );
      expect(res.body.data.mesa).toBe('5');
    });

    test('mesa de outro salão é recusada', async () => {
      Mesa.findOne.mockResolvedValue({ id: MESA_ID, localId: 'outro-local' });
      const res = await request(app).post(`${base}/pedidos`).send({ mesaId: MESA_ID, itens });
      expect(res.status).toBe(400);
      expect(Pedido.create).not.toHaveBeenCalled();
    });

    test.each([
      [[], 'pelo menos um item'],
      [[{ descricao: '' }], 'descrição'],
      [[{ descricao: 'Suco', quantidade: 0 }], 'Quantidade'],
      [Array.from({ length: 31 }, () => ({ descricao: 'x' })), 'No máximo'],
    ])('itens inválidos (%#) devolvem 400', async (lista, trecho) => {
      Mesa.findOne.mockResolvedValue({ id: MESA_ID, localId: LOCAL_ID });
      const res = await request(app).post(`${base}/pedidos`).send({ mesaId: MESA_ID, itens: lista });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain(trecho);
    });
  });

  describe('status do pedido', () => {
    const mudar = (status) => request(app).patch(`${base}/pedidos/${PEDIDO_ID}/status`).send({ status });

    test('cozinha marca como pronto', async () => {
      const pedido = { id: PEDIDO_ID, status: 'preparando', update: jest.fn() };
      Pedido.findOne.mockResolvedValueOnce(pedido).mockResolvedValueOnce(pedidoJson({ status: 'pronto' }));

      const res = await mudar('pronto');

      expect(res.status).toBe(200);
      expect(pedido.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'pronto' }));
      expect(Pedido.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PEDIDO_ID, eventoId: EVENTO_ID } })
      );
    });

    test('pedido entregue não volta para a cozinha', async () => {
      Pedido.findOne.mockResolvedValue({ id: PEDIDO_ID, status: 'entregue', update: jest.fn() });
      const res = await mudar('preparando');
      expect(res.status).toBe(409);
    });

    test('status desconhecido devolve 400', async () => {
      const res = await mudar('pago');
      expect(res.status).toBe(400);
    });
  });

  describe('painel da cozinha', () => {
    test('junta cardápio, pedidos abertos e estoque com alerta de mínimo', async () => {
      ServicoEvento.findAll.mockResolvedValue([{ id: 's1', item: 'Salgados', status: 'pendente' }]);
      Pedido.findAll.mockResolvedValue([pedidoJson({ itens: [{ descricao: 'Bolo', alerta: true }] })]);
      EventoProduto.findAll.mockResolvedValue([
        { quantidade: '10', produto: { id: 'p1', nome: 'Refrigerante', quantidade: '5', estoqueMinimo: '8', unidadeMedida: 'L' } },
        { quantidade: '2', produto: { id: 'p2', nome: 'Guardanapo', quantidade: '100', estoqueMinimo: '10', unidadeMedida: 'pct' } },
      ]);

      const res = await request(app).get(`${base}/cozinha`);

      expect(res.status).toBe(200);
      expect(res.body.data.evento).toMatchObject({ qtdAdultos: 50, qtdCriancas: 30 });
      expect(res.body.data.pedidos[0].temAlerta).toBe(true);
      expect(res.body.data.estoque.map((e) => e.estoqueBaixo)).toEqual([true, false]);
    });

    test('muda status de item do cardápio só dentro do evento', async () => {
      const servico = { id: 's1', status: 'pendente', update: jest.fn() };
      ServicoEvento.findOne.mockResolvedValue(servico);

      const res = await request(app)
        .patch(`${base}/servicos/66666666-6666-4666-8666-666666666666`).send({ status: 'servido' });

      expect(res.status).toBe(200);
      expect(servico.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'servido' }));
      expect(ServicoEvento.findOne).toHaveBeenCalledWith({
        where: { id: '66666666-6666-4666-8666-666666666666', eventoId: EVENTO_ID },
      });
    });
  });

  describe('painel web: mesas e cardápio', () => {
    beforeEach(() => {
      mockUsuario = { id: 'usr-g', role: 'gerente', empresaId: 'emp-1' };
    });

    test('cria mesa no local com posição em %', async () => {
      Local.findOne.mockResolvedValue({ id: LOCAL_ID });
      Mesa.create.mockImplementation(async (d) => d);

      const res = await request(app).post(`/api/locais/${LOCAL_ID}/mesas`)
        .send({ numero: '12', lugares: 8, posX: 33.333, posY: 70 });

      expect(res.status).toBe(201);
      expect(Mesa.create).toHaveBeenCalledWith({ numero: '12', lugares: 8, posX: 33.33, posY: 70, localId: LOCAL_ID });
    });

    test('número de mesa repetido no local devolve 409', async () => {
      Local.findOne.mockResolvedValue({ id: LOCAL_ID });
      Mesa.create.mockRejectedValue(Object.assign(new Error('dup'), { name: 'SequelizeUniqueConstraintError' }));
      const res = await request(app).post(`/api/locais/${LOCAL_ID}/mesas`).send({ numero: '12' });
      expect(res.status).toBe(409);
    });

    test.each([{ numero: '' }, { numero: '1', lugares: 0 }, { numero: '1', posX: 120 }])(
      'mesa inválida %p devolve 400', async (body) => {
        Local.findOne.mockResolvedValue({ id: LOCAL_ID });
        const res = await request(app).post(`/api/locais/${LOCAL_ID}/mesas`).send(body);
        expect(res.status).toBe(400);
      }
    );

    test('adiciona item ao cardápio da cozinha', async () => {
      ServicoEvento.create.mockImplementation(async (d) => d);

      const res = await request(app).post(`/api/eventos/${EVENTO_ID}/servicos`)
        .send({ item: 'Salgados fritos', quantidade: 800, unidade: 'un', horario: '2026-10-01T19:30:00-03:00' });

      expect(res.status).toBe(201);
      expect(ServicoEvento.create).toHaveBeenCalledWith(expect.objectContaining({
        item: 'Salgados fritos', quantidade: 800, unidade: 'un', eventoId: EVENTO_ID, horario: expect.any(Date),
      }));
    });

    test('horário inválido no cardápio devolve 400', async () => {
      const res = await request(app).post(`/api/eventos/${EVENTO_ID}/servicos`).send({ item: 'Bolo', horario: 'amanhã' });
      expect(res.status).toBe(400);
    });
  });
});
