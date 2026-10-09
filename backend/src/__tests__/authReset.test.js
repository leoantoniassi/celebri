// ============================================================
// Testes: Fluxo de Recuperação e Redefinição de Senha
// Cobre: solicitarRecuperacaoSenha + redefinirSenha
// ============================================================
const request = require('supertest');
const express = require('express');

// ── Mocks ────────────────────────────────────────────────────

// Mock do Model Usuario
const mockUsuario = {
  update: jest.fn(),
};

jest.mock('../models', () => ({
  Usuario: {
    findOne: jest.fn(),
  },
  // Multilocação: recuperar-senha resolve o tenant antes de buscar o usuário
  Empresa: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
}));

// Empresa única e ativa — resolverTenant a assume quando nenhum slug é informado
const empresaPadrao = {
  id: 'empresa-teste',
  nomeFantasia: 'Buffet Teste',
  slug: 'buffet-teste',
  status: 'ativo',
};

// Mock do emailService — não envia e-mails reais nos testes
jest.mock('../services/emailService', () => ({
  enviarEmailRecuperacaoSenha: jest.fn().mockResolvedValue(undefined),
}));

const { Usuario, Empresa } = require('../models');
const { enviarEmailRecuperacaoSenha } = require('../services/emailService');

// ── Setup App ────────────────────────────────────────────────

describe('Recuperação e Redefinição de Senha', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    Empresa.findAll.mockResolvedValue([empresaPadrao]);
    Empresa.findOne.mockResolvedValue(empresaPadrao);
    app = express();
    app.use(express.json());
    app.use('/api/auth', require('../routes/auth.routes'));
    app.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, message: err.message });
    });
  });

  // ── POST /api/auth/recuperar-senha ────────────────────────

  describe('POST /api/auth/recuperar-senha', () => {
    const emailValido = 'usuario@empresa.com';

    test('deve retornar sucesso genérico e enviar email se usuario existe', async () => {
      const mockUser = {
        id: 'user-id',
        nome: 'Usuario Teste',
        email: emailValido,
        update: jest.fn().mockResolvedValue(true),
      };
      Usuario.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/recuperar-senha')
        .send({ email: emailValido });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Se o e-mail estiver cadastrado');
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          resetToken: expect.any(String),
          resetExpiracao: expect.any(Date),
        })
      );
      expect(enviarEmailRecuperacaoSenha).toHaveBeenCalledWith(
        expect.objectContaining({
          nome: mockUser.nome,
          email: mockUser.email,
          token: expect.any(String),
        })
      );
    });

    test('deve retornar sucesso genérico sem enviar e-mail se usuario nao existe (anti-enumeração)', async () => {
      Usuario.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/recuperar-senha')
        .send({ email: 'inexistente@empresa.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Se o e-mail estiver cadastrado');
      expect(enviarEmailRecuperacaoSenha).not.toHaveBeenCalled();
    });

    test('deve retornar 400 se e-mail não for fornecido', async () => {
      const res = await request(app)
        .post('/api/auth/recuperar-senha')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('obrigatório');
    });

    test('deve retornar 400 se formato de e-mail for inválido', async () => {
      const res = await request(app)
        .post('/api/auth/recuperar-senha')
        .send({ email: 'formato-invalido' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('inválido');
    });
  });

  // ── POST /api/auth/redefinir-senha ────────────────────────

  describe('POST /api/auth/redefinir-senha', () => {
    const tokenValido = 'a'.repeat(64); // token hex de 64 chars

    test('deve redefinir senha com sucesso usando token válido', async () => {
      const mockUser = {
        id: 'user-id',
        update: jest.fn().mockResolvedValue(true),
      };
      Usuario.findOne.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/redefinir-senha')
        .send({ token: tokenValido, senha: 'nova_senha_segura1' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('sucesso');
      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          senha: expect.any(String),
          resetToken: null,
          resetExpiracao: null,
        })
      );
    });

    test('deve retornar 400 se o token não existir ou estiver expirado', async () => {
      Usuario.findOne.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/redefinir-senha')
        .send({ token: tokenValido, senha: 'senha_valida_123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Token inválido ou expirado');
    });

    test('deve retornar 400 para senha menor que 10 caracteres', async () => {
      const res = await request(app)
        .post('/api/auth/redefinir-senha')
        .send({ token: tokenValido, senha: '123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('mínimo 10 caracteres');
    });

    test('deve redefinir falhando se a senha for composta apenas de espaços', async () => {
      const res = await request(app)
        .post('/api/auth/redefinir-senha')
        .send({ token: tokenValido, senha: '      ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('mínimo 10 caracteres');
    });

    test('deve retornar 400 para token com formato inválido (não hex)', async () => {
      const res = await request(app)
        .post('/api/auth/redefinir-senha')
        .send({ token: 'nao-e-um-hex-valido', senha: 'senha_valida_123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Token inválido');
    });

    test('deve retornar 400 se token ou senha estiverem ausentes', async () => {
      const res = await request(app)
        .post('/api/auth/redefinir-senha')
        .send({ token: tokenValido }); // senha ausente

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
