// ============================================================
// Testes: dataEvento e horarioTermino no Orçamento
// ============================================================
const request = require('supertest');
const express = require('express');
const { Orcamento, Cliente, Local, Evento, OrcamentoProduto } = require('../models');

// ── Mock do usuário autenticado (alterável por teste) ──────
let mockUser = { id: 'user-1', role: 'gerente' };

jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = mockUser;
  return next();
});

// ── Mock do middleware de roles (verifica role real) ──────
jest.mock('../middleware/roles', () => (...allowedRoles) => (req, res, next) => {
  if (req.user && allowedRoles.includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: `Acesso negado. Apenas ${allowedRoles.join(', ')} podem realizar esta ação.`,
  });
});

// ── Mock dos models ────────────────────────────────────────
const mockScope = { findAndCountAll: jest.fn() };

jest.mock('../models', () => ({
  Orcamento: {
    create: jest.fn(),
    findOne: jest.fn(),
    scope: jest.fn(() => mockScope),
  },
  Cliente: { findOne: jest.fn() },
  Local: { findOne: jest.fn() },
  Evento: { create: jest.fn() },
  OrcamentoProduto: { bulkCreate: jest.fn() },
}));

// ── Helper: validação de UUID (usada nos testes de segurança) ──
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUUID(str) {
  return UUID_REGEX.test(str);
}

// ============================================================
describe('OrcamentoDatas — dataEvento e horarioTermino', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restaura role padrão para gerente
    mockUser = { id: 'user-1', role: 'gerente' };

    app = express();
    app.use(express.json());
    app.use('/api/orcamentos', require('../routes/orcamentos.routes'));
    app.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, message: err.message });
    });
  });

  // ── Fixtures ─────────────────────────────────────────────
  const mockCliente = {
    id: '00000000-0000-4000-8000-0000000000c1',
    nome: 'Cliente Teste',
    email: 'cliente@teste.com',
    telefone: '11999999999',
  };

  const makeOrcamento = (overrides = {}) => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    clienteId: '00000000-0000-4000-8000-0000000000c1',
    nome: 'Festa de aniversário',
    localId: null,
    valorTotal: 1000,
    dataEvento: '2026-12-31T10:00:00.000Z',
    horarioTermino: '2026-12-31T18:00:00.000Z',
    qtdPessoas: 100,
    qtdAdultos: 80,
    qtdCriancas: 20,
    qtdBebes: 0,
    status: 'pendente',
    observacoes: null,
    cliente: mockCliente,
    update: jest.fn().mockResolvedValue(true),
    reload: jest.fn().mockImplementation(function () {
      return Promise.resolve(this);
    }),
    ...overrides,
  });

  const orcamentoPayload = {
    clienteId: '00000000-0000-4000-8000-0000000000c1',
    nome: 'Festa de aniversário',
    dataEvento: '2026-12-31T10:00:00.000Z',
    horarioTermino: '2026-12-31T18:00:00.000Z',
    qtdPessoas: 100,
  };

  // ==========================================================
  // 1. CRIAÇÃO — POST /api/orcamentos
  // ==========================================================
  describe('POST /api/orcamentos', () => {
    test('deve criar orçamento com dataEvento e horarioTermino válidos → 201', async () => {
      Cliente.findOne.mockResolvedValue(mockCliente);
      Orcamento.create.mockResolvedValue(makeOrcamento());

      const res = await request(app)
        .post('/api/orcamentos')
        .send(orcamentoPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('criado');
    });

    test('deve retornar 400 se faltar dataEvento ou horarioTermino', async () => {
      Cliente.findOne.mockResolvedValue(mockCliente);

      const res = await request(app)
        .post('/api/orcamentos')
        .send({ clienteId: '00000000-0000-4000-8000-0000000000c1', nome: 'Festa' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/obrigatórios/i);
    });

    test('deve retornar 400 se horarioTermino for anterior a dataEvento', async () => {
      const res = await request(app)
        .post('/api/orcamentos')
        .send({
          clienteId: '00000000-0000-4000-8000-0000000000c1',
          nome: 'Festa',
          dataEvento: '2026-12-31T10:00:00.000Z',
          horarioTermino: '2026-12-30T18:00:00.000Z',
          qtdPessoas: 100,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/posterior|término/i);
    });

    test('deve permitir que operador crie orçamento (role alterada)', async () => {
      mockUser = { id: 'user-2', role: 'operador' };
      Cliente.findOne.mockResolvedValue(mockCliente);
      Orcamento.create.mockResolvedValue(makeOrcamento());

      const res = await request(app)
        .post('/api/orcamentos')
        .send(orcamentoPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================
  // 2. ATUALIZAÇÃO — PUT /api/orcamentos/:id
  // ==========================================================
  describe('PUT /api/orcamentos/:id', () => {
    test('deve atualizar orçamento com novas datas válidas → 200', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento());

      const res = await request(app)
        .put('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000')
        .send({
          dataEvento: '2027-01-15T10:00:00.000Z',
          horarioTermino: '2027-01-15T20:00:00.000Z',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('atualizado');
    });

    test('deve retornar 400 se horarioTermino for anterior a dataEvento no PUT', async () => {
      Orcamento.findOne.mockResolvedValue(
        makeOrcamento({
          dataEvento: '2026-12-31T10:00:00.000Z',
          horarioTermino: '2026-12-31T18:00:00.000Z',
        })
      );

      const res = await request(app)
        .put('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000')
        .send({
          dataEvento: '2026-12-31T10:00:00.000Z',
          horarioTermino: '2026-12-30T18:00:00.000Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/posterior|término/i);
    });

    test('deve retornar 400 se UUID do orçamento for inválido no PUT', async () => {
      const res = await request(app)
        .put('/api/orcamentos/id-invalido')
        .send({ dataEvento: '2026-12-31T10:00:00.000Z' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/inválido/i);
    });
  });

  // ==========================================================
  // 3. CONVERSÃO ORÇAMENTO → EVENTO — POST /api/orcamentos/:id/confirmar
  // ==========================================================
  describe('POST /api/orcamentos/:id/confirmar', () => {
    test('deve converter orçamento com dataEvento e horarioTermino válidos → 200', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento());
      Evento.create.mockResolvedValue({ id: 'evt-1', orcamentoId: 'orc-1' });

      const res = await request(app)
        .post('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000/confirmar');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('sucesso');
      expect(Evento.create).toHaveBeenCalledTimes(1);
    });

    test('deve retornar 400 se orçamento não tiver dataEvento', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento({ dataEvento: null }));

      const res = await request(app)
        .post('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000/confirmar');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/data|início/i);
    });

    test('deve retornar 400 se orçamento não tiver horarioTermino', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento({ horarioTermino: null }));

      const res = await request(app)
        .post('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000/confirmar');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/término|horário/i);
    });

    test('deve retornar 400 se dataEvento e horarioTermino estiverem invertidos', async () => {
      Orcamento.findOne.mockResolvedValue(
        makeOrcamento({
          dataEvento: '2026-12-31T18:00:00.000Z',
          horarioTermino: '2026-12-31T10:00:00.000Z',
        })
      );

      const res = await request(app)
        .post('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000/confirmar');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/posterior|término/i);
    });

    test('deve retornar 400 se UUID do orçamento for inválido no confirmar', async () => {
      const res = await request(app)
        .post('/api/orcamentos/id-invalido/confirmar');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/inválido/i);
    });

    test('deve permitir que operador confirme orçamento (role alterada)', async () => {
      mockUser = { id: 'user-2', role: 'operador' };
      Orcamento.findOne.mockResolvedValue(makeOrcamento());
      Evento.create.mockResolvedValue({ id: 'evt-1', orcamentoId: 'orc-1' });

      const res = await request(app)
        .post('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000/confirmar');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
