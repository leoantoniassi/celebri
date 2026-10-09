// ============================================================
// Integração ponta a ponta da Fase 3 (app real + supertest)
// Models com stub em memória; auth, rate limit, bloqueio, tokens, JWT reais.
// ============================================================
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');

const SEGREDO = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';
const EMPRESA = { id: 'emp-1', nomeFantasia: 'Buffet', slug: 'buffet', status: 'ativo', logoUrl: null };

const mockUsuarios = [];
let mockFalhaBanco = false;
const mockEnviar = jest.fn().mockResolvedValue(undefined);

function mockCriarUsuario(dados) {
  const u = {
    tokenVersion: 0, funcionarioId: null, resetToken: null, resetExpiracao: null, ...dados,
    async update(campos) { Object.assign(u, campos); return u; },
  };
  mockUsuarios.push(u);
  return u;
}

// Avalia o subconjunto de `where` usado pelo login, auth e redefinição.
function mockCasa(u, where) {
  return Object.entries(where).every(([k, v]) => {
    if (k === 'empresaId' && v === undefined) return true;
    if (typeof v === 'object' && v !== null) {
      const simbolos = Object.getOwnPropertySymbols(v);
      if (simbolos.length) return u[k] != null && u[k] > v[simbolos[0]]; // Op.gt
      return true;
    }
    return u[k] === v;
  }) ;
}

jest.mock('../models', () => {
  const stub = () => new Proxy(function () {}, {
    get: (_t, prop) => (prop === '__esModule' ? false : prop === 'then' ? undefined : stub()),
    apply: () => stub(),
  });
  const base = stub();
  const Usuario = {
    findOne: async ({ where }) => {
      if (mockFalhaBanco) throw new Error('banco fora');
      const { [Object.getOwnPropertySymbols(where)[0]]: _or, ...resto } = where;
      const ors = Object.getOwnPropertySymbols(where).length ? where[Object.getOwnPropertySymbols(where)[0]] : null;
      return mockUsuarios.find((u) => mockCasa(u, resto)
        && (!ors || ors.some((o) => Object.entries(o).every(([k, v]) => u[k] === v)))) || null;
    },
  };
  const Empresa = {
    findOne: async ({ where }) => (where.slug === EMPRESA.slug ? EMPRESA : null),
    findAll: async () => {
      if (mockFalhaBanco) throw new Error('banco fora');
      return [EMPRESA];
    },
  };
  return new Proxy({}, {
    get: (_t, prop) => (prop === 'Usuario' ? Usuario : prop === 'Empresa' ? Empresa
      : prop === 'Funcionario' ? { findOne: async () => null } : base[prop]),
  });
});

jest.mock('../services/emailService', () => ({
  enviarEmailRecuperacaoSenha: (...a) => mockEnviar(...a),
  enviarCodigoPrimeiroAcesso: jest.fn().mockResolvedValue(undefined),
  enviarConvite: jest.fn().mockResolvedValue(undefined),
}));

let app;
beforeAll(async () => {
  process.env.JWT_SECRET = SEGREDO;
  delete process.env.JWT_EXPIRES_IN;
  app = require('../app');
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {}); // 500 esperado nas rotas com models stub
  mockUsuarios.length = 0;
  mockEnviar.mockClear();
  mockFalhaBanco = false;
});

const login = (email, senha) => request(app).post('/api/auth/login').set('X-Tenant-Slug', 'buffet').send({ email, senha });
const seedHash = () => bcrypt.hashSync('123456', 10);
const novoUsuario = (extra = {}) => mockCriarUsuario({
  id: 'u1', nome: 'Ana', email: 'ana@celebri.com', role: 'gerente', empresaId: EMPRESA.id,
  senha: seedHash(), ...extra,
});

describe('Fase 3: integração de autenticação e sessão', () => {
  test('login OK devolve JWT HS256 com tv e expiração de ~8h', async () => {
    novoUsuario();
    const res = await login('ana@celebri.com', '123456');

    expect(res.status).toBe(200);
    const { header, payload } = jwt.decode(res.body.token, { complete: true });
    expect(header.alg).toBe('HS256');
    expect(payload.tv).toBe(0);
    expect(payload.id).toBe('u1');
    expect(payload.exp - payload.iat).toBe(8 * 3600);
    expect(jwt.verify(res.body.token, SEGREDO, { algorithms: ['HS256'] }).empresaId).toBe(EMPRESA.id);
  });

  test('login com a senha do seed (123456) continua funcionando', async () => {
    novoUsuario({ email: 'gerente@celebri.com' });
    const res = await login('gerente@celebri.com', '123456');
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('gerente@celebri.com');
  });

  test('token válido passa pela auth; sem token ou lixo → 401', async () => {
    novoUsuario();
    const { body } = await login('ana@celebri.com', '123456');

    const ok = await request(app).get('/api/clientes').set('Authorization', `Bearer ${body.token}`);
    expect(ok.status).not.toBe(401);

    expect((await request(app).get('/api/clientes')).status).toBe(401);
    expect((await request(app).get('/api/usuarios')).status).toBe(401);
    expect((await request(app).get('/api/clientes').set('Authorization', 'Bearer lixo')).status).toBe(401);
  });

  test('token HS256 com tv antigo é rejeitado após redefinir a senha', async () => {
    const u = novoUsuario();
    const { body } = await login('ana@celebri.com', '123456');
    const antes = await request(app).get('/api/clientes').set('Authorization', `Bearer ${body.token}`);
    expect(antes.status).not.toBe(401);

    const resetCru = crypto.randomBytes(32).toString('hex');
    u.resetToken = crypto.createHash('sha256').update(resetCru).digest('hex');
    u.resetExpiracao = new Date(Date.now() + 3600 * 1000);

    const redef = await request(app).post('/api/auth/redefinir-senha')
      .send({ token: resetCru, senha: 'NovaSenha#2026xyz' });
    expect(redef.status).toBe(200);
    expect(u.tokenVersion).toBe(1);
    expect(u.resetToken).toBeNull();

    const depois = await request(app).get('/api/clientes').set('Authorization', `Bearer ${body.token}`);
    expect(depois.status).toBe(401);

    // Novo login emite tv=1 e volta a funcionar.
    const novo = await login('ana@celebri.com', 'NovaSenha#2026xyz');
    expect(novo.status).toBe(200);
    expect(jwt.decode(novo.body.token).tv).toBe(1);
  });

  test('6 logins errados → 429, mesmo com a senha certa', async () => {
    novoUsuario();
    for (let i = 0; i < 5; i += 1) {
      expect((await login('ana@celebri.com', 'errada')).status).toBe(401);
    }
    const certa = await login('ana@celebri.com', '123456');
    expect(certa.status).toBe(429);
    expect(certa.body.token).toBeUndefined();
    expect((await login('ana@celebri.com', 'errada')).status).toBe(429);
  });

  test('/uploads não é servido estaticamente → 404', async () => {
    expect((await request(app).get('/uploads/qualquer.pdf')).status).toBe(404);
    expect((await request(app).get('/uploads/')).status).toBe(404);
  });

  test('recuperar-senha: e-mail inexistente e existente têm mesma resposta', async () => {
    novoUsuario();
    const existe = await request(app).post('/api/auth/recuperar-senha').set('X-Tenant-Slug', 'buffet').send({ email: 'ana@celebri.com' });
    const nao = await request(app).post('/api/auth/recuperar-senha').set('X-Tenant-Slug', 'buffet').send({ email: 'fantasma@celebri.com' });

    expect(existe.status).toBe(nao.status);
    expect(existe.status).toBe(200);
    expect(existe.body).toEqual(nao.body);
    expect(mockEnviar).toHaveBeenCalledTimes(1);
    // O banco guarda o hash, o e-mail leva o token cru.
    const { token } = mockEnviar.mock.calls[0][0];
    expect(mockUsuarios[0].resetToken).toBe(crypto.createHash('sha256').update(token).digest('hex'));
    expect(mockUsuarios[0].resetToken).not.toBe(token);
  });

  test('recuperar-senha segue igual mesmo se o SMTP falhar', async () => {
    novoUsuario();
    mockEnviar.mockRejectedValueOnce(new Error('smtp fora'));
    const res = await request(app).post('/api/auth/recuperar-senha').set('X-Tenant-Slug', 'buffet').send({ email: 'ana@celebri.com' });
    expect(res.status).toBe(200);
  });

  test('Authorization fora do formato Bearer → 401', async () => {
    for (const h of ['Basic abc', 'Bearer', 'Bearer a b', 'token-puro']) {
      const res = await request(app).get('/api/clientes').set('Authorization', h);
      expect(res.status).toBe(401);
    }
  });

  test('token HS256 assinado com outro segredo ou alg=none → 401', async () => {
    novoUsuario();
    const claims = { id: 'u1', role: 'gerente', empresaId: EMPRESA.id, tv: 0 };
    const falso = jwt.sign(claims, 'outro-segredo-qualquer-com-32-caracteres!!', { algorithm: 'HS256' });
    const semAlg = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.`;
    for (const t of [falso, semAlg]) {
      expect((await request(app).get('/api/clientes').set('Authorization', `Bearer ${t}`)).status).toBe(401);
    }
  });

  test('login: empresa inexistente → 400; corpo incompleto → 400; senha gigante → 401', async () => {
    novoUsuario();
    const semEmpresa = await request(app).post('/api/auth/login').set('X-Tenant-Slug', 'nao-existe')
      .send({ email: 'ana@celebri.com', senha: '123456' });
    expect(semEmpresa.status).toBe(400);
    expect((await request(app).post('/api/auth/login').send({ email: 'ana@celebri.com' })).status).toBe(400);
    expect((await login('ana@celebri.com', 'x'.repeat(2000))).status).toBe(401);
  });

  test('recuperar-senha com empresa inexistente tem a mesma resposta genérica', async () => {
    novoUsuario();
    const ok = await request(app).post('/api/auth/recuperar-senha').set('X-Tenant-Slug', 'buffet').send({ email: 'ana@celebri.com' });
    const sem = await request(app).post('/api/auth/recuperar-senha').set('X-Tenant-Slug', 'fantasma').send({ email: 'ana@celebri.com' });
    expect(sem.status).toBe(ok.status);
    expect(sem.body).toEqual(ok.body);
  });

  test('rotas públicas validam o e-mail/código antes de consultar o banco (400)', async () => {
    const post = (rota, corpo) => request(app).post(rota).set('X-Tenant-Slug', 'buffet').send(corpo);
    expect((await post('/api/auth/identificar', { email: 'invalido' })).status).toBe(400);
    expect((await post('/api/auth/primeiro-acesso/codigo', { email: 'invalido' })).status).toBe(400);
    expect((await post('/api/auth/primeiro-acesso/confirmar', { email: 'a@b.com', codigo: '12' })).status).toBe(400);
    expect((await post('/api/auth/recuperar-senha', {})).status).toBe(400);
    expect((await post('/api/auth/redefinir-senha', { token: 'curto', senha: 'NovaSenha#2026xyz' })).status).toBe(400);
  });

  test('falha do banco vira 500 sem vazar detalhes nem token', async () => {
    novoUsuario({ email: 'db@celebri.com' }); // e-mail próprio: o bloqueio por conta persiste no módulo
    mockFalhaBanco = true;
    const res = await login('db@celebri.com', '123456');
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.token).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/stack|banco fora.*at /s);
  });
});
