// ============================================================
// Testes de Paginação — Validação do parâmetro limit
// Clientes, Locais e Orçamentos
// ============================================================
const request = require('supertest');
const express = require('express');

// ── Mocks de autenticação ──────────────────────────────────
jest.mock('../middleware/auth', () => (req, res, next) => { req.user = { id: 'u-1', role: 'gerente' }; next(); });
jest.mock('../middleware/roles', () => () => (req, res, next) => next());

// ── Mocks dos models ───────────────────────────────────────
jest.mock('../models', () => ({
  Cliente: { findAndCountAll: jest.fn() },
  Local: { findAndCountAll: jest.fn() },
  Orcamento: {
    scope: jest.fn(),
    findAndCountAll: jest.fn(),
  },
}));

// ============================================================
describe('Pagination — validação do limit', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/clientes', require('../routes/clientes.routes'));
    app.use('/api/locais', require('../routes/locais.routes'));
    app.use('/api/orcamentos', require('../routes/orcamentos.routes'));
    app.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, message: err.message });
    });
  });

  // ==========================================================
  // 1. ClienteController — GET /api/clientes
  // ==========================================================
  describe('ClienteController — GET /api/clientes', () => {
    const { Cliente } = require('../models');

    test('limit padrão deve ser 20 quando não enviado', async () => {
      Cliente.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const res = await request(app).get('/api/clientes');

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(20);
      expect(Cliente.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20 }),
      );
    });

    test('limit=5 deve retornar no máximo 5 clientes', async () => {
      const clientes = Array.from({ length: 5 }, (_, i) => ({
        id: `cli-${i + 1}`,
        nome: `Cliente ${i + 1}`,
        email: `cliente${i + 1}@teste.com`,
        rgCpf: `${String(i + 1).padStart(3, '0')}.000.000-00`,
        telefone: '(11) 90000-0000',
      }));
      Cliente.findAndCountAll.mockResolvedValue({ count: 5, rows: clientes });

      const res = await request(app).get('/api/clientes?limit=5');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      expect(res.body.pagination.limit).toBe(5);
      expect(Cliente.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 5 }),
      );
    });

    test('limit=999 deve ser limitado a 100 (cap de segurança)', async () => {
      const clientes = Array.from({ length: 100 }, (_, i) => ({
        id: `cli-${i + 1}`,
        nome: `Cliente ${i + 1}`,
        email: `cliente${i + 1}@teste.com`,
        rgCpf: `${String(i + 1).padStart(3, '0')}.000.000-00`,
        telefone: '(11) 90000-0000',
      }));
      Cliente.findAndCountAll.mockResolvedValue({ count: 100, rows: clientes });

      const res = await request(app).get('/api/clientes?limit=999');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(100);
      expect(res.body.pagination.limit).toBe(100);
      expect(Cliente.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
      );
    });

    test('limit=abc (inválido) deve usar o valor padrão 20', async () => {
      Cliente.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const res = await request(app).get('/api/clientes?limit=abc');

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(20);
      expect(Cliente.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20 }),
      );
    });

    test('page=abc (inválido) deve usar página 1', async () => {
      Cliente.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const res = await request(app).get('/api/clientes?page=abc');

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(Cliente.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 0 }),
      );
    });
  });

  // ==========================================================
  // 2. LocalController — GET /api/locais
  // ==========================================================
  describe('LocalController — GET /api/locais', () => {
    const { Local } = require('../models');

    test('limit padrão deve ser 50 quando não enviado', async () => {
      Local.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const res = await request(app).get('/api/locais');

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(50);
      expect(Local.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });

    test('limit=999 deve ser limitado a 100', async () => {
      const locais = Array.from({ length: 100 }, (_, i) => ({
        id: `loc-${i + 1}`,
        nome: `Local ${i + 1}`,
        logradouro: 'Rua Exemplo',
        numero: `${i + 1}`,
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '00000-000',
      }));
      Local.findAndCountAll.mockResolvedValue({ count: 100, rows: locais });

      const res = await request(app).get('/api/locais?limit=999');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(100);
      expect(res.body.pagination.limit).toBe(100);
      expect(Local.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
      );
    });

    test('limit=abc (inválido) deve usar o valor padrão 50', async () => {
      Local.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const res = await request(app).get('/api/locais?limit=abc');

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(50);
      expect(Local.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });
  });

  // ==========================================================
  // 3. OrcamentoController — GET /api/orcamentos
  // ==========================================================
  describe('OrcamentoController — GET /api/orcamentos', () => {
    const { Orcamento } = require('../models');

    beforeEach(() => {
      // Orcamento.scope deve retornar o próprio Orcamento para
      // encadear .findAndCountAll()
      Orcamento.scope.mockReturnValue(Orcamento);
    });

    test('limit padrão deve ser 20 quando não enviado', async () => {
      Orcamento.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const res = await request(app).get('/api/orcamentos');

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(20);
      expect(Orcamento.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20 }),
      );
    });

    test('limit=999 deve ser limitado a 100', async () => {
      const orcamentos = Array.from({ length: 100 }, (_, i) => ({
        id: `orc-${i + 1}`,
        clienteId: `cli-${i + 1}`,
        valorTotal: 1000 + i,
        status: 'pendente',
      }));
      Orcamento.findAndCountAll.mockResolvedValue({ count: 100, rows: orcamentos });

      const res = await request(app).get('/api/orcamentos?limit=999');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(100);
      expect(res.body.pagination.limit).toBe(100);
      expect(Orcamento.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
      );
    });

    test('limit=abc (inválido) deve usar o valor padrão 20', async () => {
      Orcamento.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });

      const res = await request(app).get('/api/orcamentos?limit=abc');

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(20);
      expect(Orcamento.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 20 }),
      );
    });
  });
});
