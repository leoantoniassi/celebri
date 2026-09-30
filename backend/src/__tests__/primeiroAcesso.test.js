// ============================================================
// Testes: entrada só com e-mail + primeiro acesso com código (app mobile)
// ============================================================
const crypto = require('crypto');
const request = require('supertest');
const express = require('express');

jest.mock('../models', () => ({
  Usuario: { findOne: jest.fn(), findAll: jest.fn() },
  Empresa: { findOne: jest.fn(), findAll: jest.fn() },
  Funcionario: { findOne: jest.fn() },
  Funcao: {},
}));

jest.mock('../services/emailService', () => ({
  enviarEmailRecuperacaoSenha: jest.fn(),
  enviarCodigoPrimeiroAcesso: jest.fn().mockResolvedValue(undefined),
}));

const { Usuario, Empresa, Funcionario } = require('../models');
const { enviarCodigoPrimeiroAcesso } = require('../services/emailService');

const empresa = { id: 'emp-1', nomeFantasia: 'Buffet Teste', slug: 'buffet-teste', status: 'ativo', logoUrl: null };
const hash = (c) => crypto.createHash('sha256').update(c).digest('hex');

function criarApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/auth.routes'));
  app.use((err, _req, res, _next) => res.status(500).json({ success: false, message: err.message }));
  return app;
}

describe('Primeiro acesso pelo app mobile', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = 'segredo-teste';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Empresa.findOne.mockResolvedValue(empresa);
    Empresa.findAll.mockResolvedValue([empresa]);
    Funcionario.findOne.mockResolvedValue(null);
    app = criarApp();
  });

  describe('POST /api/auth/identificar', () => {
    test('lista os buffets do e-mail e indica primeiro acesso', async () => {
      Usuario.findAll.mockResolvedValue([{ empresaId: 'emp-1', senha: null }]);

      const res = await request(app).post('/api/auth/identificar').send({ email: 'ana@teste.com' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { slug: 'buffet-teste', nomeFantasia: 'Buffet Teste', logoUrl: null, primeiroAcesso: true },
      ]);
    });

    test('devolve lista vazia para e-mail desconhecido', async () => {
      Usuario.findAll.mockResolvedValue([]);

      const res = await request(app).post('/api/auth/identificar').send({ email: 'x@teste.com' });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    test('rejeita e-mail inválido', async () => {
      const res = await request(app).post('/api/auth/identificar').send({ email: 'invalido' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/primeiro-acesso/codigo', () => {
    test('gera código de 6 dígitos, guarda só o hash e envia por e-mail', async () => {
      const usuario = { nome: 'Ana', email: 'ana@teste.com', update: jest.fn() };
      Usuario.findOne.mockResolvedValue(usuario);

      const res = await request(app)
        .post('/api/auth/primeiro-acesso/codigo')
        .set('X-Tenant-Slug', 'buffet-teste')
        .send({ email: 'ana@teste.com' });

      expect(res.status).toBe(200);
      const { codigo } = enviarCodigoPrimeiroAcesso.mock.calls[0][0];
      expect(codigo).toMatch(/^\d{6}$/);
      expect(usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({ codigoHash: hash(codigo), codigoTentativas: 0 })
      );
    });

    test('resposta genérica sem enviar e-mail se não houver conta pendente', async () => {
      Usuario.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/primeiro-acesso/codigo')
        .set('X-Tenant-Slug', 'buffet-teste')
        .send({ email: 'ana@teste.com' });

      expect(res.status).toBe(200);
      expect(enviarCodigoPrimeiroAcesso).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/primeiro-acesso/confirmar', () => {
    const pendente = (extra = {}) => ({
      id: 'usr-1',
      nome: 'Ana',
      email: 'ana@teste.com',
      role: 'operador',
      empresaId: 'emp-1',
      funcionarioId: null,
      codigoHash: hash('123456'),
      codigoExpiracao: new Date(Date.now() + 60000),
      codigoTentativas: 0,
      update: jest.fn(),
      ...extra,
    });

    const enviar = (body) =>
      request(app)
        .post('/api/auth/primeiro-acesso/confirmar')
        .set('X-Tenant-Slug', 'buffet-teste')
        .send({ email: 'ana@teste.com', senha: 'senha123', ...body });

    test('com código certo cria a senha, ativa a conta e devolve token', async () => {
      const usuario = pendente();
      Usuario.findOne.mockResolvedValue(usuario);

      const res = await enviar({ codigo: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.data.email).toBe('ana@teste.com');
      expect(usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({ senha: expect.any(String), status: 'ativo', codigoHash: null })
      );
    });

    test('com código errado soma uma tentativa', async () => {
      const usuario = pendente();
      Usuario.findOne.mockResolvedValue(usuario);

      const res = await enviar({ codigo: '000000' });

      expect(res.status).toBe(400);
      expect(usuario.update).toHaveBeenCalledWith({ codigoTentativas: 1 });
    });

    test('bloqueia após 5 tentativas mesmo com código certo', async () => {
      Usuario.findOne.mockResolvedValue(pendente({ codigoTentativas: 5 }));
      const res = await enviar({ codigo: '123456' });
      expect(res.status).toBe(400);
    });

    test('rejeita código expirado', async () => {
      Usuario.findOne.mockResolvedValue(pendente({ codigoExpiracao: new Date(Date.now() - 1000) }));
      const res = await enviar({ codigo: '123456' });
      expect(res.status).toBe(400);
    });

    test('rejeita senha curta', async () => {
      const res = await enviar({ codigo: '123456', senha: '123' });
      expect(res.status).toBe(400);
    });
  });
});
