const request = require('supertest');
const express = require('express');
const { Documento, Cliente, Evento } = require('../models');

let mockRole = 'operador';

// Mock do middleware de autenticação para controle dinâmico da role do usuário
jest.mock('../middleware/auth', () => (req, res, next) => {
  req.user = { id: 'uuid-usuario', email: 'teste@exemplo.com', role: mockRole };
  next();
});

jest.mock('../models', () => ({
  Documento: {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  Cliente: { findOne: jest.fn() },
  Evento: { findOne: jest.fn() },
}));

describe('DocumentosController e Rotas', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/documentos', require('../routes/documentos.routes'));
    app.use((err, _req, res, _next) => {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    });
  });

  describe('GET /api/documentos (listar)', () => {
    test('deve permitir acesso a um operador', async () => {
      mockRole = 'operador';
      Documento.findAll.mockResolvedValue([]);

      const res = await request(app).get('/api/documentos');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Documento.findAll).toHaveBeenCalled();
    });

    test('deve permitir acesso a um gerente', async () => {
      mockRole = 'gerente';
      Documento.findAll.mockResolvedValue([]);

      const res = await request(app).get('/api/documentos');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('deve negar acesso a uma role inválida', async () => {
      mockRole = 'invalido';

      const res = await request(app).get('/api/documentos');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Acesso negado');
    });
  });

  describe('POST /api/documentos (criar)', () => {
    const payload = {
      nomeArquivo: 'Contrato.pdf',
      caminhoUrl: 'https://drive.google.com/contrato.pdf',
    };

    test('deve permitir a criação por um operador', async () => {
      mockRole = 'operador';
      const created = { id: 'uuid-doc', ...payload, tipoArquivo: 'pdf', clienteId: null, eventoId: null };
      Documento.create.mockResolvedValue(created);

      const res = await request(app)
        .post('/api/documentos')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Documento.create).toHaveBeenCalled();
    });

    test('deve permitir a criação por um gerente', async () => {
      mockRole = 'gerente';
      const created = { id: 'uuid-doc', ...payload, tipoArquivo: 'pdf', clienteId: null, eventoId: null };
      Documento.create.mockResolvedValue(created);

      const res = await request(app)
        .post('/api/documentos')
        .send(payload);

      expect(res.status).toBe(201);
    });
  });

  describe('POST /api/documentos — validações de segurança', () => {
    const base = { nomeArquivo: 'Doc' };
    const OUTRO_TENANT_ID = '33333333-3333-4333-8333-333333333333';

    beforeEach(() => {
      mockRole = 'gerente';
    });

    test.each([
      ['caminho absoluto', '/etc/passwd.pdf'],
      ['caminho absoluto windows', 'C:\\Users\\x\\doc.pdf'],
      ['parent traversal', '../../segredo.pdf'],
      ['extensão inválida', 'script.sh'],
    ])('rejeita %s com 400', async (_n, caminhoUrl) => {
      const res = await request(app).post('/api/documentos').send({ ...base, caminhoUrl });
      expect(res.status).toBe(400);
      expect(Documento.create).not.toHaveBeenCalled();
    });

    test('aceita caminho relativo válido', async () => {
      Documento.create.mockResolvedValue({ id: 'x' });
      const res = await request(app).post('/api/documentos').send({ ...base, caminhoUrl: 'contratos/a.pdf' });
      expect(res.status).toBe(201);
    });

    test('cliente de outro tenant (não encontrado pelo escopo) retorna 404', async () => {
      Cliente.findOne.mockResolvedValue(null);
      const res = await request(app).post('/api/documentos')
        .send({ ...base, caminhoUrl: 'https://x.com/a.pdf', clienteId: OUTRO_TENANT_ID });
      expect(res.status).toBe(404);
      expect(Documento.create).not.toHaveBeenCalled();
    });

    test('evento de outro tenant retorna 404', async () => {
      Evento.findOne.mockResolvedValue(null);
      const res = await request(app).post('/api/documentos')
        .send({ ...base, caminhoUrl: 'https://x.com/a.pdf', eventoId: OUTRO_TENANT_ID });
      expect(res.status).toBe(404);
      expect(Documento.create).not.toHaveBeenCalled();
    });

    test('clienteId malformado retorna 400', async () => {
      const res = await request(app).post('/api/documentos')
        .send({ ...base, caminhoUrl: 'https://x.com/a.pdf', clienteId: 'abc' });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/documentos/:id — validações de segurança', () => {
    const OUTRO_TENANT_ID = '33333333-3333-4333-8333-333333333333';
    let doc;

    beforeEach(() => {
      mockRole = 'gerente';
      doc = { id: 'd', update: jest.fn().mockResolvedValue(true) };
      Documento.findOne.mockResolvedValue(doc);
    });

    test.each(['/etc/passwd.pdf', '../x.pdf', 'C:\\a\\b.pdf', 'a.exe'])('rejeita caminhoUrl %s', async (caminhoUrl) => {
      const res = await request(app).put('/api/documentos/00000000-0000-4000-8000-0000000000d1').send({ caminhoUrl });
      expect(res.status).toBe(400);
      expect(doc.update).not.toHaveBeenCalled();
    });

    test('clienteId de outro tenant retorna 404', async () => {
      Cliente.findOne.mockResolvedValue(null);
      const res = await request(app).put('/api/documentos/00000000-0000-4000-8000-0000000000d1').send({ clienteId: OUTRO_TENANT_ID });
      expect(res.status).toBe(404);
      expect(doc.update).not.toHaveBeenCalled();
    });

    test('eventoId de outro tenant retorna 404', async () => {
      Evento.findOne.mockResolvedValue(null);
      const res = await request(app).put('/api/documentos/00000000-0000-4000-8000-0000000000d1').send({ eventoId: OUTRO_TENANT_ID });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/documentos/:id (atualizar)', () => {
    const payload = {
      nomeArquivo: 'Contrato Novo.pdf',
    };

    test('deve permitir a atualização por um operador', async () => {
      mockRole = 'operador';
      const mockDoc = {
        id: 'uuid-doc',
        nomeArquivo: 'Contrato.pdf',
        caminhoUrl: 'https://drive.google.com/contrato.pdf',
        update: jest.fn().mockResolvedValue(true),
      };
      Documento.findOne.mockResolvedValue(mockDoc);

      const res = await request(app)
        .put('/api/documentos/00000000-0000-4000-8000-0000000000d2')
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockDoc.update).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/documentos/:id (remover)', () => {
    test('deve permitir a exclusão por um gerente', async () => {
      mockRole = 'gerente';
      const mockDoc = {
        id: 'uuid-doc',
        update: jest.fn().mockResolvedValue(true),
      };
      Documento.findOne.mockResolvedValue(mockDoc);

      const res = await request(app).delete('/api/documentos/00000000-0000-4000-8000-0000000000d2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('deve negar a exclusão por um operador', async () => {
      mockRole = 'operador';

      const res = await request(app).delete('/api/documentos/00000000-0000-4000-8000-0000000000d2');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
