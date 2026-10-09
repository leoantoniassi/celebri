const request = require('supertest');
const express = require('express');
const { Evento, Cliente, Local, Orcamento } = require('../models');

jest.mock('../middleware/auth', () => (req, res, next) => { req.user = { id: 'u-1', role: 'gerente' }; next(); });
jest.mock('../middleware/roles', () => () => (req, res, next) => next());

jest.mock('../models', () => ({
  Evento: { create: jest.fn(), findOne: jest.fn(), findAndCountAll: jest.fn(), update: jest.fn() },
  Cliente: { findOne: jest.fn() },
  Local: { findOne: jest.fn() },
  Orcamento: { findOne: jest.fn() },
}));

describe('EventoController — verificação de capacidade', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/eventos', require('../routes/eventos.routes'));
    app.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, message: err.message });
    });
  });

  const EVT_ID = '550e8400-e29b-41d4-a716-446655440001';
  const CLI_ID = '550e8400-e29b-41d4-a716-446655440010';
  const LOC_1  = '550e8400-e29b-41d4-a716-446655440020';
  const LOC_2  = '550e8400-e29b-41d4-a716-446655440021';

  const mockCliente = { id: CLI_ID, nome: 'Cliente Teste' };
  const mockLocalComCapacidade = { id: LOC_1, nome: 'Salão Festas', capacidadeMaxima: 100 };
  const mockLocalSemCapacidade = { id: LOC_2, nome: 'Salão Sem Cap', capacidadeMaxima: null };
  const mockEvento = {
    id: EVT_ID,
    clienteId: CLI_ID,
    localId: LOC_1,
    nome: 'Evento Teste',
    dataEvento: '2026-12-31',
    qtdPessoas: 80,
    qtdAdultos: 60,
    qtdCriancas: 15,
    qtdBebes: 5,
    status: 'pendente',
  };

  const eventoPayload = {
    clienteId: CLI_ID,
    nome: 'Evento Teste',
    dataEvento: '2026-12-31',
    horarioTermino: '2026-12-31T23:59:59.000Z',
  };

  describe('POST /api/eventos', () => {
    test('deve criar evento com qtdPessoas dentro da capacidade (sem warning)', async () => {
      Cliente.findOne.mockResolvedValue(mockCliente);
      Local.findOne.mockResolvedValue(mockLocalComCapacidade);
      Evento.create.mockResolvedValue({ ...mockEvento, qtdPessoas: 40 });

      const res = await request(app)
        .post('/api/eventos')
        .send({ ...eventoPayload, localId: LOC_1, qtdPessoas: 40, qtdAdultos: 40 });

      expect(res.status).toBe(201);
      expect(res.body.warning).toBeUndefined();
    });

    test('deve criar evento com qtdPessoas EXCEDENDO capacidade (retornar warning)', async () => {
      Cliente.findOne.mockResolvedValue(mockCliente);
      Local.findOne.mockResolvedValue(mockLocalComCapacidade);
      Evento.create.mockResolvedValue({ ...mockEvento, qtdPessoas: 150 });

      const res = await request(app)
        .post('/api/eventos')
        .send({ ...eventoPayload, localId: LOC_1, qtdPessoas: 150, qtdAdultos: 100, qtdCriancas: 40, qtdBebes: 10 });

      expect(res.status).toBe(201);
      expect(res.body.warning).toBeTruthy();
      expect(res.body.warning).toContain('excede a capacidade máxima');
      expect(res.body.warning).toContain('Salão Festas');
      expect(res.body.warning).toContain('150');
    });

    test('deve criar evento sem localId (sem warning de capacidade)', async () => {
      Cliente.findOne.mockResolvedValue(mockCliente);
      Evento.create.mockResolvedValue(mockEvento);

      const res = await request(app)
        .post('/api/eventos')
        .send({ ...eventoPayload, qtdPessoas: 80, qtdAdultos: 80 });

      expect(res.status).toBe(201);
      expect(res.body.warning).toBeUndefined();
    });

    test('deve criar evento com local sem capacidade definida (sem warning)', async () => {
      Cliente.findOne.mockResolvedValue(mockCliente);
      Local.findOne.mockResolvedValue(mockLocalSemCapacidade);
      Evento.create.mockResolvedValue({ ...mockEvento, localId: 'loc-2', qtdPessoas: 150 });

      const res = await request(app)
        .post('/api/eventos')
        .send({ ...eventoPayload, localId: LOC_2, qtdPessoas: 150, qtdAdultos: 100, qtdCriancas: 40, qtdBebes: 10 });

      expect(res.status).toBe(201);
      expect(res.body.warning).toBeUndefined();
    });

    test('deve criar evento com horarioTermino válido', async () => {
      Cliente.findOne.mockResolvedValue(mockCliente);
      Evento.create.mockResolvedValue({ ...mockEvento, horarioTermino: '2026-12-31T23:59:59.000Z' });

      const res = await request(app)
        .post('/api/eventos')
        .send({ ...eventoPayload, horarioTermino: '2026-12-31T23:59:59.000Z', qtdPessoas: 50 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('deve retornar 400 se horarioTermino não for informado', async () => {
      const res = await request(app)
        .post('/api/eventos')
        .send({ clienteId: CLI_ID, nome: 'Evento Teste', dataEvento: '2026-12-31', qtdPessoas: 50 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('horário de término');
    });

    test('deve retornar 400 se horarioTermino for anterior a dataEvento', async () => {
      const res = await request(app)
        .post('/api/eventos')
        .send({ ...eventoPayload, horarioTermino: '2026-12-30T10:00:00.000Z', qtdPessoas: 50 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('deve ser maior');
    });

    test('deve retornar 400 se horarioTermino for inválido (string não-datável)', async () => {
      const res = await request(app)
        .post('/api/eventos')
        .send({ ...eventoPayload, horarioTermino: 'invalido', qtdPessoas: 50 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('data válida');
    });
  });

  describe('PUT /api/eventos/:id', () => {
    test('deve atualizar evento excedendo capacidade (retornar warning)', async () => {
      Evento.findOne.mockResolvedValue({ ...mockEvento, update: jest.fn().mockResolvedValue(true) });
      Local.findOne.mockResolvedValue(mockLocalComCapacidade);

      const res = await request(app)
        .put('/api/eventos/' + EVT_ID)
        .send({ localId: LOC_1, qtdPessoas: 150, qtdAdultos: 100, qtdCriancas: 40, qtdBebes: 10 });

      expect(res.status).toBe(200);
      expect(res.body.warning).toBeTruthy();
      expect(res.body.warning).toContain('excede a capacidade máxima');
    });

    test('deve atualizar evento com qtdPessoas = 0 (sem warning)', async () => {
      Evento.findOne.mockResolvedValue({ ...mockEvento, update: jest.fn().mockResolvedValue(true) });
      Local.findOne.mockResolvedValue(mockLocalComCapacidade);

      const res = await request(app)
        .put('/api/eventos/' + EVT_ID)
        .send({ localId: LOC_1, qtdPessoas: 0, qtdAdultos: 0, qtdCriancas: 0, qtdBebes: 0 });

      expect(res.status).toBe(200);
      expect(res.body.warning).toBeUndefined();
    });

    test('deve atualizar evento sem localId (sem warning)', async () => {
      const updateMock = jest.fn().mockResolvedValue(true);
      Evento.findOne.mockResolvedValue({ ...mockEvento, update: updateMock });

      const res = await request(app)
        .put('/api/eventos/' + EVT_ID)
        .send({ nome: 'Evento Atualizado' });

      expect(res.status).toBe(200);
      expect(res.body.warning).toBeUndefined();
    });

    test('deve atualizar evento com horarioTermino válido', async () => {
      Evento.findOne.mockResolvedValue({ ...mockEvento, update: jest.fn().mockResolvedValue(true) });

      const res = await request(app)
        .put('/api/eventos/' + EVT_ID)
        .send({ horarioTermino: '2026-12-31T23:59:59.000Z' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('deve retornar 400 se horarioTermino for inválido no PUT', async () => {
      Evento.findOne.mockResolvedValue({ ...mockEvento, update: jest.fn().mockResolvedValue(true) });

      const res = await request(app)
        .put('/api/eventos/' + EVT_ID)
        .send({ horarioTermino: 'invalido' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('data válida');
    });
  });
});
