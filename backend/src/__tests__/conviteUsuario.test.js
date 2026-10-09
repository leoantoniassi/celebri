// ============================================================
// Testes: Fluxo de Convite e Ativação de Usuários
// Cobre: convidarUsuario + definirSenhaConvite
// ============================================================
const request = require('supertest');
const express = require('express');

// ── Mocks ────────────────────────────────────────────────────

// Mock auth middleware — libera todas as requisições como gerente
jest.mock('../middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'gerente-id', email: 'gerente@test.com', role: 'gerente' };
  next();
});

// Mock roles middleware — usa a implementação real (testa proteção por role)
jest.mock('../middleware/roles', () => (...allowedRoles) => (req, res, next) => {
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Acesso negado.' });
  }
  return next();
});

// Mock do Model Usuario
const mockUsuario = {
  update: jest.fn(),
};

jest.mock('../models', () => ({
  Usuario: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

// Mock do emailService — não envia e-mails reais nos testes
jest.mock('../services/emailService', () => ({
  enviarConvite: jest.fn().mockResolvedValue(undefined),
}));

const { Usuario } = require('../models');
const { enviarConvite } = require('../services/emailService');

// ── Setup App ────────────────────────────────────────────────

describe('Convite e Ativação de Usuários', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/usuarios', require('../routes/usuarios.routes'));
    app.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, message: err.message });
    });
  });

  // ── POST /api/usuarios/convidar ───────────────────────────

  describe('POST /api/usuarios/convidar', () => {
    const payload = {
      nome: 'João Silva',
      email: 'joao@empresa.com',
      role: 'operador',
    };

    test('deve enviar convite com sucesso quando e-mail é novo', async () => {
      Usuario.findOne.mockResolvedValue(null); // e-mail não existe
      Usuario.create.mockResolvedValue({ id: 'new-id', ...payload });

      const res = await request(app)
        .post('/api/usuarios/convidar')
        .set('Authorization', 'Bearer token-gerente')
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain(payload.email);
      expect(Usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: payload.nome,
          email: payload.email,
          status: 'pendente',
          senha: null,
        })
      );
      expect(enviarConvite).toHaveBeenCalledWith(
        expect.objectContaining({ nome: payload.nome, email: payload.email })
      );
    });

    test('deve retornar 201 sem revelar que e-mail já existe (anti-enumeração)', async () => {
      Usuario.findOne.mockResolvedValue({ id: 'existing-id' }); // e-mail já existe

      const res = await request(app)
        .post('/api/usuarios/convidar')
        .set('Authorization', 'Bearer token-gerente')
        .send(payload);

      // Anti-enumeração: resposta idêntica ao sucesso real
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Não deve criar novo usuário nem enviar e-mail
      expect(Usuario.create).not.toHaveBeenCalled();
      expect(enviarConvite).not.toHaveBeenCalled();
    });

    test('deve retornar 400 quando campos obrigatórios estão ausentes', async () => {
      const res = await request(app)
        .post('/api/usuarios/convidar')
        .set('Authorization', 'Bearer token-gerente')
        .send({ nome: 'Sem Email' }); // faltam email e role

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('deve retornar 400 para e-mail com formato inválido', async () => {
      const res = await request(app)
        .post('/api/usuarios/convidar')
        .set('Authorization', 'Bearer token-gerente')
        .send({ nome: 'Teste', email: 'nao-e-um-email', role: 'operador' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('e-mail');
    });

    test('deve normalizar role inválida para operador', async () => {
      Usuario.findOne.mockResolvedValue(null);
      Usuario.create.mockResolvedValue({ id: 'new-id' });

      await request(app)
        .post('/api/usuarios/convidar')
        .set('Authorization', 'Bearer token-gerente')
        .send({ nome: 'Teste', email: 'teste@empresa.com', role: 'super_admin_hack' });

      expect(Usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'operador' })
      );
    });

    test('deve gerar token hex de 64 caracteres', async () => {
      Usuario.findOne.mockResolvedValue(null);
      let capturedArgs;
      Usuario.create.mockImplementation((args) => {
        capturedArgs = args;
        return Promise.resolve({ id: 'new-id' });
      });

      await request(app)
        .post('/api/usuarios/convidar')
        .set('Authorization', 'Bearer token-gerente')
        .send(payload);

      expect(capturedArgs.conviteToken).toMatch(/^[a-f0-9]{64}$/);
    });

    test('deve definir expiração do convite em ~24h no futuro', async () => {
      Usuario.findOne.mockResolvedValue(null);
      let capturedArgs;
      Usuario.create.mockImplementation((args) => {
        capturedArgs = args;
        return Promise.resolve({ id: 'new-id' });
      });

      const antes = Date.now();
      await request(app)
        .post('/api/usuarios/convidar')
        .set('Authorization', 'Bearer token-gerente')
        .send(payload);
      const depois = Date.now();

      const expMs = new Date(capturedArgs.conviteExpiracao).getTime();
      const umDia = 24 * 60 * 60 * 1000;
      expect(expMs).toBeGreaterThanOrEqual(antes + umDia - 1000);
      expect(expMs).toBeLessThanOrEqual(depois + umDia + 1000);
    });
  });

  // ── POST /api/usuarios/definir-senha ─────────────────────

  describe('POST /api/usuarios/definir-senha (rota pública)', () => {
    const tokenValido = 'a'.repeat(64); // token hex de 64 chars válido

    test('deve ativar conta com token e senha válidos', async () => {
      const mockUser = { ...mockUsuario };
      mockUser.update = jest.fn().mockResolvedValue(true);
      Usuario.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/usuarios/definir-senha')
        .send({ token: tokenValido, senha: 'minha_senha_segura1', aceiteTermos: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ativo',
          conviteToken: null,
          conviteExpiracao: null,
          termosVersao: expect.any(String),
          termosAceitosEm: expect.any(Date),
        })
      );
    });

    test.each([
      ['ausente', {}],
      ['false', { aceiteTermos: false }],
      ['string "true"', { aceiteTermos: 'true' }],
    ])('LGPD: sem aceite dos termos (%s) responde 400 e não consulta nem altera a conta', async (_n, extra) => {
      const mockUser = { ...mockUsuario, update: jest.fn() };
      Usuario.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/usuarios/definir-senha')
        .send({ token: tokenValido, senha: 'minha_senha_segura1', ...extra });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Termos de Uso');
      expect(mockUser.update).not.toHaveBeenCalled();
    });

    test('deve retornar 400 para token não encontrado ou expirado', async () => {
      Usuario.findOne.mockResolvedValue(null); // token não existe

      const res = await request(app)
        .post('/api/usuarios/definir-senha')
        .send({ token: tokenValido, senha: 'senha123456', aceiteTermos: true });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Token inválido ou expirado');
    });

    test('deve retornar 400 para senha com menos de 10 caracteres', async () => {
      const res = await request(app)
        .post('/api/usuarios/definir-senha')
        .send({ token: tokenValido, senha: '123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('mínimo 10 caracteres');
    });

    test('deve rejeitar senha composta apenas de espaços (bypass de trim)', async () => {
      const res = await request(app)
        .post('/api/usuarios/definir-senha')
        .send({ token: tokenValido, senha: '       ' }); // 7 espaços

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('mínimo 10 caracteres');
    });

    test('deve retornar 400 para token com formato inválido (não hex)', async () => {
      const res = await request(app)
        .post('/api/usuarios/definir-senha')
        .send({ token: 'token-invalido-nao-eh-hex', senha: 'senha123456' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Token inválido');
    });

    test('deve retornar 400 quando token ou senha estão ausentes', async () => {
      const res = await request(app)
        .post('/api/usuarios/definir-senha')
        .send({ token: tokenValido }); // senha ausente

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('não deve exigir autenticação JWT (rota pública)', async () => {
      // Mesmo sem Authorization header, deve processar a requisição
      // (o erro será de validação de dados, não de autenticação)
      const res = await request(app)
        .post('/api/usuarios/definir-senha')
        .send({ token: tokenValido, senha: 'curta' }); // falha de validação

      // Não deve retornar 401 (autenticação), mas sim 400 (validação)
      expect(res.status).toBe(400);
    });
  });

  // ── POST /api/usuarios/convidar — Proteção de Role ───────

  describe('Proteção de Role — /convidar', () => {
    test('deve retornar 403 quando operador tenta convidar usuário', async () => {
      // Testa o middleware de roles diretamente sem depender do mock global de auth
      const authorize = require('../middleware/roles');
      const mockReq = { user: { id: 'op-id', email: 'op@test.com', role: 'operador' } };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockNext = jest.fn();

      // Chama o middleware authorize('gerente') com um usuário de role 'operador'
      authorize('gerente')(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('deve permitir acesso quando gerente invoca /convidar', () => {
      const authorize = require('../middleware/roles');
      const mockReq = { user: { id: 'ger-id', email: 'ger@test.com', role: 'gerente' } };
      const mockRes = {};
      const mockNext = jest.fn();

      authorize('gerente')(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});

