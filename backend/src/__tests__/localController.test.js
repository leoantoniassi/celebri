const request = require('supertest');
const express = require('express');
const { Local } = require('../models');

jest.mock('../middleware/auth', () => (req, res, next) => { req.user = { id: 'u-1', role: 'gerente' }; next(); });

jest.mock('../models', () => ({
  Local: {
    create: jest.fn(),
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
  },
}));

describe('LocalController — capacidadeMaxima', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/locais', require('../routes/locais.routes'));
    app.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, message: err.message });
    });
  });

  const validLocalPayload = {
    nome: 'Salão Teste',
    logradouro: 'Rua Exemplo',
    numero: '123',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    cep: '00000-000',
  };

  describe('POST /api/locais', () => {
    test('deve criar local com capacidadeMaxima válida (150)', async () => {
      const mockCreated = { id: '1', ...validLocalPayload, capacidadeMaxima: 150 };
      Local.create.mockResolvedValue(mockCreated);

      const res = await request(app)
        .post('/api/locais')
        .send({ ...validLocalPayload, capacidadeMaxima: 150 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.capacidadeMaxima).toBe(150);
    });

    test('deve criar local sem capacidadeMaxima (aceitar null/undefined)', async () => {
      const mockCreated = { id: '2', ...validLocalPayload, capacidadeMaxima: null };
      Local.create.mockResolvedValue(mockCreated);

      const res = await request(app)
        .post('/api/locais')
        .send(validLocalPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('deve rejeitar capacidadeMaxima com número negativo', async () => {
      const res = await request(app)
        .post('/api/locais')
        .send({ ...validLocalPayload, capacidadeMaxima: -5 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Capacidade máxima');
    });

    test('deve rejeitar capacidadeMaxima com string', async () => {
      const res = await request(app)
        .post('/api/locais')
        .send({ ...validLocalPayload, capacidadeMaxima: 'abc' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Capacidade máxima');
    });

    test('deve rejeitar capacidadeMaxima com float (número não inteiro)', async () => {
      const res = await request(app)
        .post('/api/locais')
        .send({ ...validLocalPayload, capacidadeMaxima: 3.5 });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Capacidade máxima');
    });
  });

  describe('GET /api/locais', () => {
    test('deve listar locais retornando capacidadeMaxima', async () => {
      const mockLocais = [
        { id: '1', nome: 'Salão A', capacidadeMaxima: 100 },
        { id: '2', nome: 'Salão B', capacidadeMaxima: null },
      ];
      Local.findAndCountAll.mockResolvedValue({ count: 2, rows: mockLocais });

      const res = await request(app).get('/api/locais');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].capacidadeMaxima).toBe(100);
      expect(res.body.data[1].capacidadeMaxima).toBeNull();
    });

    test('deve buscar local por id retornando capacidadeMaxima', async () => {
      const mockLocal = { id: '1', nome: 'Salão A', capacidadeMaxima: 150 };
      Local.findOne.mockResolvedValue(mockLocal);

      const res = await request(app).get('/api/locais/00000000-0000-4000-8000-000000000001');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.capacidadeMaxima).toBe(150);
    });
  });
});
