// ============================================================
// Testes: Controle de Acesso por Papel (role) — Orçamentos
// ============================================================
// Cobre os cenários de autorização alterados para que operador
// possa criar, editar, confirmar e rejeitar, mas NÃO excluir.
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
jest.mock('../models', () => ({
  Orcamento: {
    create: jest.fn(),
    findOne: jest.fn(),
    scope: jest.fn(() => ({ findAndCountAll: jest.fn() })),
  },
  Cliente: { findOne: jest.fn() },
  Local: { findOne: jest.fn() },
  Evento: { create: jest.fn() },
  OrcamentoProduto: { bulkCreate: jest.fn() },
}));

describe('Roles — Orçamentos (operador)', () => {
  let app;

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'user-2', role: 'operador' };

    app = express();
    app.use(express.json());
    app.use('/api/orcamentos', require('../routes/orcamentos.routes'));
    app.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, message: err.message });
    });
  });

  // ==========================================================
  // 1. OPERADOR PODE CRIAR — POST /api/orcamentos
  // ==========================================================
  describe('POST /api/orcamentos (operador)', () => {
    test('deve permitir que operador crie orçamento → 201', async () => {
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
  // 2. OPERADOR PODE EDITAR — PUT /api/orcamentos/:id
  // ==========================================================
  describe('PUT /api/orcamentos/:id (operador)', () => {
    test('deve permitir que operador edite orçamento → 200', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento());

      const res = await request(app)
        .put('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000')
        .send({ nome: 'Festa Editada' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================
  // 3. OPERADOR PODE CONFIRMAR — POST /api/orcamentos/:id/confirmar
  // ==========================================================
  describe('POST /api/orcamentos/:id/confirmar (operador)', () => {
    test('deve permitir que operador confirme orçamento → 200', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento());
      Evento.create.mockResolvedValue({ id: 'evt-1', orcamentoId: 'orc-1' });

      const res = await request(app)
        .post('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000/confirmar');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Evento.create).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================
  // 4. OPERADOR PODE REJEITAR — POST /api/orcamentos/:id/rejeitar
  // ==========================================================
  describe('POST /api/orcamentos/:id/rejeitar (operador)', () => {
    test('deve permitir que operador rejeite orçamento → 200', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento());

      const res = await request(app)
        .post('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000/rejeitar');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================
  // 5. OPERADOR NÃO PODE EXCLUIR — DELETE /api/orcamentos/:id
  // ==========================================================
  describe('DELETE /api/orcamentos/:id (operador)', () => {
    test('deve NEGAR exclusão para operador → 403', async () => {
      const res = await request(app)
        .delete('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/acesso negado|apenas gerente/i);
    });

    test('deve permitir exclusão para gerente → 200', async () => {
      mockUser = { id: 'user-1', role: 'gerente' };
      Orcamento.findOne.mockResolvedValue(makeOrcamento());

      const res = await request(app)
        .delete('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================
  // 6. ORÇAMENTO APROVADO NÃO PODE SER REJEITADO
  // ==========================================================
  describe('POST /api/orcamentos/:id/rejeitar — validação de fluxo', () => {
    test('deve retornar 400 se orçamento já estiver aprovado', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento({ status: 'aprovado' }));

      const res = await request(app)
        .post('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000/rejeitar');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/já aprovado|não pode ser rejeitado/i);
    });

    test('deve permitir rejeitar orçamento pendente → 200', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento({ status: 'pendente' }));

      const res = await request(app)
        .post('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000/rejeitar');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('deve permitir rejeitar orçamento reprovado → 200', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento({ status: 'reprovado' }));

      const res = await request(app)
        .post('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000/rejeitar');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================
  // 7. UUID INVÁLIDO RETORNA 400
  // ==========================================================
  describe('Validação de UUID — endpoints que validam', () => {
    test('mudarStatus — UUID inválido → 400', async () => {
      const res = await request(app)
        .patch('/api/orcamentos/id-invalido/status')
        .send({ status: 'aprovado' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/inválido/i);
    });

    test('remover — UUID inválido → 400', async () => {
      mockUser = { id: 'user-1', role: 'gerente' };
      const res = await request(app)
        .delete('/api/orcamentos/id-invalido');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/inválido/i);
    });

    test('rejeitarOrcamento — UUID inválido → 400', async () => {
      const res = await request(app)
        .post('/api/orcamentos/id-invalido/rejeitar');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/inválido/i);
    });

    test('confirmarOrcamento — UUID inválido → 400', async () => {
      const res = await request(app)
        .post('/api/orcamentos/id-invalido/confirmar');

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/inválido/i);
    });

    test('atualizar — UUID inválido → 400', async () => {
      const res = await request(app)
        .put('/api/orcamentos/id-invalido')
        .send({ nome: 'Teste' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/inválido/i);
    });
  });

  // ==========================================================
  // 8. GERENTE TAMBÉM PODE ACESSAR TODAS AS ROTAS (REGRESSÃO)
  // ==========================================================
  describe('Gerente ainda tem acesso a todas as rotas (regressão)', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1', role: 'gerente' };
    });

    test('POST /api/orcamentos → 201', async () => {
      Cliente.findOne.mockResolvedValue(mockCliente);
      Orcamento.create.mockResolvedValue(makeOrcamento());

      const res = await request(app)
        .post('/api/orcamentos')
        .send(orcamentoPayload);

      expect(res.status).toBe(201);
    });

    test('PUT /api/orcamentos/:id → 200', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento());

      const res = await request(app)
        .put('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000')
        .send({ nome: 'Editado' });

      expect(res.status).toBe(200);
    });

    test('DELETE /api/orcamentos/:id → 200', async () => {
      Orcamento.findOne.mockResolvedValue(makeOrcamento());

      const res = await request(app)
        .delete('/api/orcamentos/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
    });
  });
});
