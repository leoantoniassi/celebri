// ============================================================
// Testes: Fase 3 — endurecimento de autenticação e sessão
// Rate limit / bloqueio, login sem oráculo, política de senha,
// tokenVersion e hash de tokens de uso único.
// ============================================================
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

jest.mock('../models', () => ({
  Usuario: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  Empresa: { findOne: jest.fn(), findAll: jest.fn() },
  Funcionario: { findOne: jest.fn() },
  Funcao: {},
}));

jest.mock('../services/emailService', () => ({
  enviarEmailRecuperacaoSenha: jest.fn().mockResolvedValue(undefined),
  enviarCodigoPrimeiroAcesso: jest.fn().mockResolvedValue(undefined),
  enviarConvite: jest.fn().mockResolvedValue(undefined),
}));

const { Usuario, Empresa, Funcionario } = require('../models');
const emailService = require('../services/emailService');
const { validarSenha } = require('../utils/validators');
const { hashToken } = require('../utils/tokens');
const { criarBloqueio } = require('../middleware/bloqueioConta');
const { limitarRequisicoes } = require('../middleware/rateLimit');
const seguranca = require('../config/seguranca');

const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const empresa = { id: 'emp-1', nomeFantasia: 'Buffet', slug: 'buffet', status: 'ativo', logoUrl: null };
const SEGREDO = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';

// Carrega a rota com módulos novos (cada teste ganha contadores zerados).
function criarApp(rotas = ['auth']) {
  const app = express();
  app.use(express.json());
  if (rotas.includes('auth')) app.use('/api/auth', require('../routes/auth.routes'));
  if (rotas.includes('usuarios')) app.use('/api/usuarios', require('../routes/usuarios.routes'));
  app.use((err, _req, res, _next) => res.status(500).json({ success: false, message: err.message }));
  return app;
}

beforeEach(() => {
  process.env.JWT_SECRET = SEGREDO;
  delete process.env.JWT_EXPIRES_IN;
  Empresa.findOne.mockResolvedValue(empresa);
  Empresa.findAll.mockResolvedValue([empresa]);
  Funcionario.findOne.mockResolvedValue(null);
});

// Cada teste que depende de contador isola os módulos.
let bcryptIsolado; // instância de bcryptjs vista pelo app isolado (para espiar)
function appIsolado(rotas) {
  let app;
  jest.isolateModules(() => {
    app = criarApp(rotas);
    bcryptIsolado = require('bcryptjs');
  });
  return app;
}

describe('Política de senha (validarSenha)', () => {
  test.each([
    ['curta1', /mínimo 10/],
    ['somenteletrassss', /letras e números/],
    ['1234567890123', /letras e números/],
    ['', /mínimo 10/],
    [undefined, /mínimo 10/],
    [{ a: 1 }, /mínimo 10/],
    ['a1'.repeat(40), /máximo 72/],
  ])('rejeita %p', (senha, msg) => {
    expect(validarSenha(senha)).toMatch(msg);
  });

  test.each(['senhaforte12', 'Abcdefghi1', 'ação-forte-2026'])('aceita %p', (senha) => {
    expect(validarSenha(senha)).toBeNull();
  });
});

describe('Login', () => {
  const senhaSeed = '123456'; // contas de seed: política NÃO se aplica ao login
  let hashSeed;
  beforeAll(() => {
    hashSeed = bcrypt.hashSync(senhaSeed, 4);
  });

  const usuario = (extra = {}) => ({
    id: 'u1', nome: 'Ana', email: 'ana@x.com', role: 'gerente', empresaId: 'emp-1',
    funcionarioId: null, tokenVersion: 3, senha: hashSeed, ...extra,
  });
  const login = (app, body) => request(app).post('/api/auth/login').send(body);

  test('conta de seed com senha curta (123456) ainda entra', async () => {
    Usuario.findOne.mockResolvedValue(usuario());
    const res = await login(appIsolado(), { email: 'ana@x.com', senha: senhaSeed });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  test('token sai com HS256, tv e expiração padrão de 8h', async () => {
    Usuario.findOne.mockResolvedValue(usuario());
    const res = await login(appIsolado(), { email: 'ana@x.com', senha: senhaSeed });
    const { header, payload } = jwt.decode(res.body.token, { complete: true });
    expect(header.alg).toBe('HS256');
    expect(payload.tv).toBe(3);
    expect(payload.exp - payload.iat).toBe(8 * 3600);
  });

  test('usuário inexistente: roda bcrypt.compare contra o hash dummy e responde igual', async () => {
    Usuario.findOne.mockResolvedValue(null);
    const app = appIsolado();
    const spy = jest.spyOn(bcryptIsolado, 'compare');
    const res = await login(app, { email: 'fantasma@x.com', senha: 'qualquer1234' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciais inválidas.');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][1]).toMatch(/^\$2a\$10\$/);
  });

  test('conta sem senha (convite pendente) também compara contra o dummy', async () => {
    Usuario.findOne.mockResolvedValue(usuario({ senha: null }));
    const app = appIsolado();
    const spy = jest.spyOn(bcryptIsolado, 'compare');
    const res = await login(app, { email: 'ana@x.com', senha: senhaSeed });
    expect(res.status).toBe(401);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('empresa suspensa: senha errada -> 401 genérico (não revela suspensão)', async () => {
    Empresa.findOne.mockResolvedValue({ ...empresa, status: 'suspenso' });
    Usuario.findOne.mockResolvedValue(usuario());
    const res = await login(appIsolado(), { email: 'ana@x.com', senha: 'errada12345' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciais inválidas.');
  });

  test('empresa suspensa: senha correta -> 403 e sem token', async () => {
    Empresa.findOne.mockResolvedValue({ ...empresa, status: 'suspenso' });
    Usuario.findOne.mockResolvedValue(usuario());
    const res = await login(appIsolado(), { email: 'ana@x.com', senha: senhaSeed });
    expect(res.status).toBe(403);
    expect(res.body.token).toBeUndefined();
  });

  test('5 falhas bloqueiam a conta por 15 min, mesmo com a senha certa (429 genérico)', async () => {
    Usuario.findOne.mockResolvedValue(usuario());
    const app = appIsolado();
    for (let i = 0; i < 5; i += 1) {
      const r = await login(app, { email: 'ana@x.com', senha: 'errada12345' });
      expect(r.status).toBe(401);
    }
    const bloqueado = await login(app, { email: 'ana@x.com', senha: senhaSeed });
    expect(bloqueado.status).toBe(429);
    expect(bloqueado.body.token).toBeUndefined();
    // outra conta do mesmo IP não é afetada
    Usuario.findOne.mockResolvedValue(usuario({ id: 'u2', email: 'bia@x.com' }));
    const outra = await login(app, { email: 'bia@x.com', senha: senhaSeed });
    expect(outra.status).toBe(200);
  });

  test('o bloqueio vale também para e-mail inexistente (não vira oráculo)', async () => {
    Usuario.findOne.mockResolvedValue(null);
    const app = appIsolado();
    for (let i = 0; i < 5; i += 1) await login(app, { email: 'nada@x.com', senha: 'errada12345' });
    const r = await login(app, { email: 'nada@x.com', senha: 'errada12345' });
    expect(r.status).toBe(429);
  });

  test('login correto zera o contador de falhas', async () => {
    Usuario.findOne.mockResolvedValue(usuario());
    const app = appIsolado();
    for (let i = 0; i < 4; i += 1) await login(app, { email: 'ana@x.com', senha: 'errada12345' });
    expect((await login(app, { email: 'ana@x.com', senha: senhaSeed })).status).toBe(200);
    for (let i = 0; i < 4; i += 1) await login(app, { email: 'ana@x.com', senha: 'errada12345' });
    expect((await login(app, { email: 'ana@x.com', senha: senhaSeed })).status).toBe(200);
  });

  test('limite por IP: a 31ª tentativa de login em 15 min recebe 429', async () => {
    Usuario.findOne.mockResolvedValue(null);
    const app = appIsolado();
    let ultimo;
    for (let i = 0; i < 31; i += 1) {
      ultimo = await login(app, { email: `u${i}@x.com`, senha: 'errada12345' });
    }
    expect(ultimo.status).toBe(429);
  });

  test('corpo com tipos inesperados é rejeitado (400)', async () => {
    const res = await login(appIsolado(), { email: { $ne: null }, senha: ['x'] });
    expect(res.status).toBe(400);
  });
});

describe('Rate limit por IP nas rotas públicas', () => {
  test('recuperar-senha, redefinir-senha e definir-senha limitam a 10 por 15 min', async () => {
    Usuario.findOne.mockResolvedValue(null);
    const app = appIsolado(['auth', 'usuarios']);
    const token = 'a'.repeat(64);
    const casos = [
      ['/api/auth/recuperar-senha', { email: 'a@x.com' }],
      ['/api/auth/redefinir-senha', { token, senha: 'senhaforte12' }],
      ['/api/usuarios/definir-senha', { token, senha: 'senhaforte12' }],
    ];
    for (const [url, body] of casos) {
      let ultimo;
      for (let i = 0; i < 11; i += 1) ultimo = await request(app).post(url).send(body);
      expect(ultimo.status).toBe(429);
    }
  });

  test('limitarRequisicoes conta por req.ip (respeita trust proxy)', async () => {
    const app = express();
    app.set('trust proxy', 1);
    app.use(limitarRequisicoes({ janelaMs: 60000, max: 1 }));
    app.get('/', (_req, res) => res.json({ ok: true }));
    const a = { 'X-Forwarded-For': '1.1.1.1' };
    expect((await request(app).get('/').set(a)).status).toBe(200);
    expect((await request(app).get('/').set(a)).status).toBe(429);
    expect((await request(app).get('/').set({ 'X-Forwarded-For': '2.2.2.2' })).status).toBe(200);
  });
});

describe('Bloqueio por conta (unidade)', () => {
  test('expira após o período e recomeça a contagem', () => {
    const b = criarBloqueio({ maxFalhas: 2, bloqueioMs: 1000 });
    const t0 = 1_000_000;
    b.falhou('k', t0);
    expect(b.restante('k', t0)).toBe(0);
    b.falhou('k', t0);
    expect(b.restante('k', t0 + 1)).toBeGreaterThan(0);
    expect(b.restante('k', t0 + 1001)).toBe(0);
    b.falhou('k', t0 + 1002);
    expect(b.restante('k', t0 + 1003)).toBe(0); // contagem recomeçou
  });

  test('falhas antigas fora da janela não acumulam', () => {
    const b = criarBloqueio({ maxFalhas: 2, bloqueioMs: 1000 });
    b.falhou('k', 0);
    b.falhou('k', 5000);
    expect(b.restante('k', 5001)).toBe(0);
  });
});

describe('Hash dos tokens de uso único', () => {
  test('recuperar-senha grava sha256 e o e-mail leva o token cru', async () => {
    const u = { id: 'u1', nome: 'Ana', email: 'ana@x.com', update: jest.fn() };
    Usuario.findOne.mockResolvedValue(u);
    await request(appIsolado()).post('/api/auth/recuperar-senha').send({ email: 'ana@x.com' });

    const { token } = emailService.enviarEmailRecuperacaoSenha.mock.calls[0][0];
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    const gravado = u.update.mock.calls[0][0].resetToken;
    expect(gravado).toBe(sha(token));
    expect(gravado).not.toBe(token);
  });

  test('redefinir-senha busca pelo hash, nunca pelo token cru, e revoga sessões', async () => {
    const token = 'b'.repeat(64);
    const u = { id: 'u1', tokenVersion: 2, update: jest.fn() };
    Usuario.findOne.mockResolvedValue(u);
    const res = await request(appIsolado()).post('/api/auth/redefinir-senha').send({ token, senha: 'senhaforte12' });
    expect(res.status).toBe(200);
    const where = Usuario.findOne.mock.calls[0][0].where;
    expect(where.resetToken).toBe(sha(token));
    expect(u.update).toHaveBeenCalledWith(expect.objectContaining({ tokenVersion: 3, resetToken: null }));
  });

  test('redefinir-senha rejeita senha fora da política', async () => {
    const res = await request(appIsolado()).post('/api/auth/redefinir-senha')
      .send({ token: 'b'.repeat(64), senha: 'soletrasaqui' });
    expect(res.status).toBe(400);
    expect(Usuario.findOne).not.toHaveBeenCalled();
  });

  test('definir-senha (convite) busca pelo hash e revoga sessões', async () => {
    const token = 'c'.repeat(64);
    const u = { id: 'u1', tokenVersion: 0, update: jest.fn() };
    Usuario.findOne.mockResolvedValue(u);
    const res = await request(appIsolado(['usuarios'])).post('/api/usuarios/definir-senha')
      .send({ token, senha: 'senhaforte12', aceiteTermos: true });
    expect(res.status).toBe(200);
    expect(Usuario.findOne.mock.calls[0][0].where.conviteToken).toBe(sha(token));
    expect(u.update).toHaveBeenCalledWith(expect.objectContaining({ tokenVersion: 1 }));
  });

  test('hashToken é sha256 hex de 64 caracteres', () => {
    expect(hashToken('abc')).toBe(sha('abc'));
  });
});

describe('Código de primeiro acesso: reenvio', () => {
  const pendente = (extra = {}) => ({
    id: 'u1', nome: 'Ana', email: 'ana@x.com', codigoHash: null, codigoExpiracao: null,
    codigoTentativas: 0, update: jest.fn(), ...extra,
  });
  const pedir = (app) =>
    request(app).post('/api/auth/primeiro-acesso/codigo').set('X-Tenant-Slug', 'buffet').send({ email: 'ana@x.com' });

  test('reenvio com código vigente NÃO zera as tentativas', async () => {
    const u = pendente({ codigoHash: sha('111111'), codigoExpiracao: new Date(Date.now() + 60000), codigoTentativas: 3 });
    Usuario.findOne.mockResolvedValue(u);
    await pedir(appIsolado());
    expect(u.update).toHaveBeenCalledWith(expect.objectContaining({ codigoTentativas: 3 }));
  });

  test('com tentativas esgotadas e código vigente, não envia outro código', async () => {
    const u = pendente({ codigoHash: sha('111111'), codigoExpiracao: new Date(Date.now() + 60000), codigoTentativas: 5 });
    Usuario.findOne.mockResolvedValue(u);
    const res = await pedir(appIsolado());
    expect(res.status).toBe(200);
    expect(u.update).not.toHaveBeenCalled();
    expect(emailService.enviarCodigoPrimeiroAcesso).not.toHaveBeenCalled();
  });

  test('código anterior expirado reinicia o ciclo de tentativas', async () => {
    const u = pendente({ codigoHash: sha('111111'), codigoExpiracao: new Date(Date.now() - 1000), codigoTentativas: 5 });
    Usuario.findOne.mockResolvedValue(u);
    await pedir(appIsolado());
    expect(u.update).toHaveBeenCalledWith(expect.objectContaining({ codigoTentativas: 0 }));
  });

  test('máximo de 5 envios por hora por conta (resposta continua genérica)', async () => {
    const u = pendente();
    Usuario.findOne.mockResolvedValue(u);
    const app = appIsolado();
    for (let i = 0; i < 6; i += 1) {
      const r = await pedir(app);
      expect(r.status).toBe(200);
    }
    expect(emailService.enviarCodigoPrimeiroAcesso).toHaveBeenCalledTimes(5);
  });

  test('confirmar exige senha dentro da política e revoga sessões antigas', async () => {
    const u = {
      id: 'u1', nome: 'Ana', email: 'ana@x.com', role: 'operador', empresaId: 'emp-1', funcionarioId: null,
      tokenVersion: 0, codigoHash: sha('123456'), codigoExpiracao: new Date(Date.now() + 60000),
      codigoTentativas: 0, update: jest.fn(),
    };
    Usuario.findOne.mockResolvedValue(u);
    const app = appIsolado();
    const conf = (senha) => request(app).post('/api/auth/primeiro-acesso/confirmar')
      .set('X-Tenant-Slug', 'buffet').send({ email: 'ana@x.com', codigo: '123456', senha });
    expect((await conf('curta1')).status).toBe(400);
    expect((await conf('somenteletras')).status).toBe(400);
    expect((await conf('senhaforte12')).status).toBe(200);
    expect(u.update).toHaveBeenCalledWith(expect.objectContaining({ tokenVersion: 1 }));
  });
});

describe('Usuários: política de senha e convite com hash', () => {
  let app;
  beforeEach(() => {
    jest.doMock('../middleware/auth', () => (req, _res, next) => {
      req.user = { id: 'g', role: 'gerente', empresaId: 'emp-1' };
      next();
    });
    app = appIsolado(['usuarios']);
  });
  afterEach(() => jest.dontMock('../middleware/auth'));

  test('criar rejeita senha fraca', async () => {
    const res = await request(app).post('/api/usuarios').send({ nome: 'N', email: 'n@x.com', senha: '123456' });
    expect(res.status).toBe(400);
    expect(Usuario.create).not.toHaveBeenCalled();
  });

  test('atualizar rejeita senha fraca e, com senha boa, incrementa tokenVersion', async () => {
    const u = { id: 'u', nome: 'N', email: 'n@x.com', role: 'operador', senha: 'x', tokenVersion: 4, update: jest.fn() };
    Usuario.findOne.mockResolvedValue(u);
    expect((await request(app).put('/api/usuarios/00000000-0000-4000-8000-0000000000a1').send({ senha: 'abc' })).status).toBe(400);
    expect(u.update).not.toHaveBeenCalled();
    expect((await request(app).put('/api/usuarios/00000000-0000-4000-8000-0000000000a1').send({ senha: 'senhaforte12' })).status).toBe(200);
    expect(u.update).toHaveBeenCalledWith(expect.objectContaining({ tokenVersion: 5 }));
  });

  test('atualizar sem trocar senha/papel não revoga sessões; trocar o papel revoga', async () => {
    const u = { id: 'u', nome: 'N', email: 'n@x.com', role: 'operador', senha: 'x', tokenVersion: 4, update: jest.fn() };
    Usuario.findOne.mockResolvedValue(u);
    await request(app).put('/api/usuarios/00000000-0000-4000-8000-0000000000a1').send({ nome: 'Novo' });
    expect(u.update.mock.calls[0][0].tokenVersion).toBeUndefined();
    await request(app).put('/api/usuarios/00000000-0000-4000-8000-0000000000a1').send({ role: 'gerente' });
    expect(u.update.mock.calls[1][0].tokenVersion).toBe(5);
  });

  test('convidar grava o hash e envia o token cru por e-mail', async () => {
    Usuario.findOne.mockResolvedValue(null);
    Usuario.create.mockResolvedValue({});
    await request(app).post('/api/usuarios/convidar').send({ nome: 'N', email: 'n@x.com', role: 'operador' });
    const gravado = Usuario.create.mock.calls[0][0].conviteToken;
    const { token } = emailService.enviarConvite.mock.calls[0][0];
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(gravado).toBe(sha(token));
  });
});

describe('Middleware auth: tokenVersion e algoritmo', () => {
  const auth = () => {
    let fn;
    jest.isolateModules(() => {
      fn = require('../middleware/auth');
    });
    return fn;
  };
  const executar = async (token) => {
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await auth()(req, res, next);
    return { req, res, next };
  };
  const assinar = (extra = {}, opts = {}) =>
    jwt.sign({ id: 'u1', email: 'a@x.com', role: 'gerente', empresaId: 'emp-1', tv: 2, ...extra },
      SEGREDO, { algorithm: 'HS256', expiresIn: '1h', ...opts });

  test('token com a versão atual passa', async () => {
    Usuario.findOne.mockResolvedValue({ id: 'u1', empresaId: 'emp-1', tokenVersion: 2 });
    const { next, res } = await executar(assinar());
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(Usuario.findOne.mock.calls[0][0].ignoraTenant).toBe(true);
  });

  test('token antigo é invalidado quando a tokenVersion do banco sobe', async () => {
    Usuario.findOne.mockResolvedValue({ id: 'u1', empresaId: 'emp-1', tokenVersion: 3 });
    const { next, res } = await executar(assinar({ tv: 2 }));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('usuário removido -> 401', async () => {
    Usuario.findOne.mockResolvedValue(null);
    const { next, res } = await executar(assinar());
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('token legado sem claim tv equivale à versão 0', async () => {
    Usuario.findOne.mockResolvedValue({ id: 'u1', empresaId: 'emp-1', tokenVersion: 0 });
    const { next } = await executar(assinar({ tv: undefined }));
    expect(next).toHaveBeenCalled();
  });

  test('super_admin (sem empresa) passa', async () => {
    Usuario.findOne.mockResolvedValue({ id: 'sa', empresaId: null, tokenVersion: 0 });
    const { next } = await executar(assinar({ id: 'sa', role: 'super_admin', empresaId: null, tv: 0 }));
    expect(next).toHaveBeenCalled();
  });

  test('algoritmo diferente de HS256 é recusado', async () => {
    const { next, res } = await executar(assinar({}, { algorithm: 'HS512' }));
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(Usuario.findOne).not.toHaveBeenCalled();
  });

  test('alg=none é recusado', async () => {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const falso = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id: 'u1', role: 'gerente', empresaId: 'emp-1' })}.`;
    const { res } = await executar(falso);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('falha do banco vira erro 500 (next), não 401', async () => {
    Usuario.findOne.mockRejectedValue(new Error('db fora'));
    const { next, res } = await executar(assinar());
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('Configuração de segurança', () => {
  test('exigirJwtSecret falha com segredo ausente ou curto, fora de test', () => {
    expect(() => seguranca.exigirJwtSecret({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() => seguranca.exigirJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'curto' })).toThrow(/32/);
    expect(() => seguranca.exigirJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'a1b2c3d4'.repeat(4) })).not.toThrow();
  });

  test('em NODE_ENV=test não exige', () => {
    expect(() => seguranca.exigirJwtSecret({ NODE_ENV: 'test' })).not.toThrow();
  });

  test.each([
    [undefined, false], ['', false], ['0', false], ['false', false],
    ['1', 1], ['2', 2], ['true', 1], ['loopback', 'loopback'],
  ])('lerTrustProxy(%p) -> %p', (entrada, saida) => {
    expect(seguranca.lerTrustProxy(entrada)).toBe(saida);
  });

  test('app usa TRUST_PROXY (padrão: desligado)', () => {
    delete process.env.TRUST_PROXY;
    let app;
    jest.isolateModules(() => {
      jest.doMock('../routes', () => require('express').Router());
      app = require('../app');
    });
    expect(app.get('trust proxy')).toBe(false);
  });

  test('JWT_EXPIRES_IN pode sobrescrever o padrão', () => {
    process.env.JWT_EXPIRES_IN = '1h';
    const t = seguranca.assinarToken({ id: 'u', tokenVersion: 0 });
    const p = jwt.decode(t);
    expect(p.exp - p.iat).toBe(3600);
  });
});

describe('emailService não vaza dados pessoais nos logs', () => {
  test('código de primeiro acesso e e-mail não aparecem em log (sem SMTP)', async () => {
    const real = jest.requireActual('../services/emailService');
    const logs = [];
    const captura = (...a) => logs.push(a.join(' '));
    jest.spyOn(console, 'log').mockImplementation(captura);
    jest.spyOn(console, 'warn').mockImplementation(captura);
    jest.spyOn(console, 'error').mockImplementation(captura);
    delete process.env.EMAIL_HOST;
    await real.enviarCodigoPrimeiroAcesso({ nome: 'Ana', email: 'ana@segredo.com', codigo: '987654', empresaId: 'emp-1' });
    const todo = logs.join('\n');
    expect(todo).not.toContain('987654');
    expect(todo).not.toContain('ana@segredo.com');
  });

  describe('opt-in DEV_LOG_CODIGO_ACESSO', () => {
    const real = jest.requireActual('../services/emailService');
    const envOriginal = { ...process.env };
    let logs;
    beforeEach(() => {
      logs = [];
      const captura = (...a) => logs.push(a.join(' '));
      jest.spyOn(console, 'log').mockImplementation(captura);
      jest.spyOn(console, 'warn').mockImplementation(captura);
      delete process.env.EMAIL_HOST;
    });
    afterEach(() => {
      process.env = { ...envOriginal };
      jest.restoreAllMocks();
    });
    const enviar = () =>
      real.enviarCodigoPrimeiroAcesso({ nome: 'Ana', email: 'ana@segredo.com', codigo: '987654', empresaId: 'emp-1' });

    test('flag ligada fora de produção loga só o código, sem e-mail', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DEV_LOG_CODIGO_ACESSO = 'true';
      await enviar();
      const todo = logs.join('\n');
      expect(todo).toContain('987654');
      expect(todo).not.toContain('ana@segredo.com');
    });

    test('flag desligada (padrão) não loga o código', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.DEV_LOG_CODIGO_ACESSO;
      await enviar();
      expect(logs.join('\n')).not.toContain('987654');
    });

    test('em produção a flag é ignorada', () => {
      expect(real.devLogCodigoAtivo({ NODE_ENV: 'production', DEV_LOG_CODIGO_ACESSO: 'true' })).toBe(false);
      expect(real.devLogCodigoAtivo({ NODE_ENV: 'development', DEV_LOG_CODIGO_ACESSO: 'true' })).toBe(true);
    });
  });
});
