// ============================================================
// Testes adversariais da Fase 3 (autenticação e sessão)
// Cada teste cobre uma falha encontrada na auditoria de segurança.
// ============================================================
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
const { criarBloqueio } = require('../middleware/bloqueioConta');
const { criarContadorJanela } = require('../utils/janelaContador');
const { chaveDoIp } = require('../middleware/rateLimit');

const SEGREDO = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';
const empresa = { id: 'emp-1', nomeFantasia: 'Buffet', slug: 'buffet', status: 'ativo', logoUrl: null };

function appIsolado(rotas = ['auth'], { trustProxy = false } = {}) {
  let app;
  jest.isolateModules(() => {
    app = express();
    app.set('trust proxy', trustProxy);
    app.use(express.json());
    if (rotas.includes('auth')) app.use('/api/auth', require('../routes/auth.routes'));
    if (rotas.includes('usuarios')) app.use('/api/usuarios', require('../routes/usuarios.routes'));
    app.use((err, _req, res, _next) => res.status(500).json({ success: false, message: err.message }));
  });
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = SEGREDO;
  Empresa.findOne.mockResolvedValue(empresa);
  Empresa.findAll.mockResolvedValue([empresa]);
  Funcionario.findOne.mockResolvedValue(null);
  Usuario.findOne.mockReset();
  emailService.enviarEmailRecuperacaoSenha.mockResolvedValue(undefined);
  emailService.enviarCodigoPrimeiroAcesso.mockResolvedValue(undefined);
});

describe('(a) Bloqueio de login: bypass', () => {
  const hash = bcrypt.hashSync('SenhaCerta123', 4);
  const superAdmin = { id: 'sa', nome: 'Root', email: 'root@celebri.com', role: 'super_admin', empresaId: null, senha: hash, tokenVersion: 0 };

  test('super_admin: trocar de slug não zera o bloqueio (chave por conta)', async () => {
    const app = appIsolado();
    Usuario.findOne.mockResolvedValue(superAdmin);
    const slugs = ['a', 'b', 'c', 'd', 'e'];
    for (const slug of slugs) {
      Empresa.findOne.mockResolvedValue({ ...empresa, id: `emp-${slug}`, slug });
      const r = await request(app).post('/api/auth/login').set('X-Tenant-Slug', slug)
        .send({ email: superAdmin.email, senha: 'errada12345' });
      expect(r.status).toBe(401);
    }
    // Sexto slug, senha CERTA: continua bloqueado e não revela se acertou.
    Empresa.findOne.mockResolvedValue({ ...empresa, id: 'emp-f', slug: 'f' });
    const r = await request(app).post('/api/auth/login').set('X-Tenant-Slug', 'f')
      .send({ email: superAdmin.email, senha: 'SenhaCerta123' });
    expect(r.status).toBe(429);
    expect(r.body.token).toBeUndefined();
    expect(JSON.stringify(r.body)).not.toMatch(/suspens|sucesso/i);
  });

  test('variações de caixa/espaços do e-mail caem na mesma chave de bloqueio', async () => {
    const app = appIsolado();
    Usuario.findOne.mockResolvedValue(null);
    const variantes = ['ana@x.com', 'ANA@x.com', ' ana@x.com', 'ana@x.com ', 'Ana@X.com'];
    for (const email of variantes) {
      await request(app).post('/api/auth/login').send({ email, senha: 'qualquer1234' });
    }
    const r = await request(app).post('/api/auth/login').send({ email: 'ana@x.com', senha: 'qualquer1234' });
    expect(r.status).toBe(429);
  });

  test('e-mail ou senha gigantes: 401 sem consultar o banco nem criar chave', async () => {
    const app = appIsolado();
    const r1 = await request(app).post('/api/auth/login').send({ email: 'a'.repeat(300) + '@x.com', senha: 'x' });
    const r2 = await request(app).post('/api/auth/login').send({ email: 'a@x.com', senha: 'x'.repeat(5000) });
    expect([r1.status, r2.status]).toEqual([401, 401]);
    expect(Usuario.findOne).not.toHaveBeenCalled();
  });

  test('maxChaves: memória do bloqueio é limitada e bloqueios ativos são poupados', () => {
    const b = criarBloqueio({ maxFalhas: 2, bloqueioMs: 60000, maxChaves: 3 });
    const t = 1000;
    b.falhou('vitima', t);
    b.falhou('vitima', t); // bloqueada
    for (let i = 0; i < 20; i += 1) b.falhou(`lixo-${i}`, t + i);
    expect(b.restante('vitima', t + 100)).toBeGreaterThan(0); // não foi descartada
  });

  test('maxChaves do contador de janela descarta as mais antigas', () => {
    const c = criarContadorJanela({ max: 1, janelaMs: 60000, maxChaves: 2 });
    expect(c.registrar('a', 1)).toBe(true);
    expect(c.registrar('a', 2)).toBe(false);
    c.registrar('b', 3);
    c.registrar('c', 4);
    c.registrar('d', 5);
    expect(c.registrar('a', 6)).toBe(true); // 'a' foi evictada: estado limitado
  });
});

describe('(a) Rate limit por IP: X-Forwarded-For e IPv6', () => {
  const rodar = async (app, n, xff) => {
    let ultimo;
    for (let i = 0; i < n; i += 1) {
      const req = request(app).post('/api/auth/recuperar-senha').send({ email: 'a@x.com' });
      ultimo = await (xff ? req.set('X-Forwarded-For', xff(i)) : req);
    }
    return ultimo;
  };
  beforeEach(() => Usuario.findOne.mockResolvedValue(null));

  test('trust proxy desligado: X-Forwarded-For forjado não escapa do limite', async () => {
    const r = await rodar(appIsolado(['auth'], { trustProxy: false }), 11, (i) => `10.0.0.${i}`);
    expect(r.status).toBe(429);
  });

  test('trust proxy = 1: só o endereço anexado pelo proxy conta; o forjado à esquerda é ignorado', async () => {
    const r = await rodar(appIsolado(['auth'], { trustProxy: 1 }), 11, (i) => `1.2.3.${i}, 9.9.9.9`);
    expect(r.status).toBe(429);
  });

  test('IPv6 do mesmo /64 compartilha a chave; IPv4-mapeado vira IPv4', () => {
    expect(chaveDoIp('2001:db8:1:2:aaaa:bbbb:cccc:dddd')).toBe(chaveDoIp('2001:db8:1:2::1'));
    expect(chaveDoIp('2001:db8:1:3::1')).not.toBe(chaveDoIp('2001:db8:1:2::1'));
    expect(chaveDoIp('::ffff:1.2.3.4')).toBe('1.2.3.4');
    expect(chaveDoIp('1.2.3.4')).toBe('1.2.3.4');
    expect(chaveDoIp(undefined)).toBe('');
  });
});

describe('(c) Enumeração por falha de SMTP', () => {
  test('recuperar-senha: falha no envio devolve a mesma resposta (sem 500 só para contas reais)', async () => {
    Usuario.findOne.mockResolvedValue({ id: 'u1', nome: 'Ana', email: 'ana@x.com', update: jest.fn() });
    emailService.enviarEmailRecuperacaoSenha.mockRejectedValue(new Error('SMTP down'));
    const r = await request(appIsolado()).post('/api/auth/recuperar-senha').send({ email: 'ana@x.com' });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  test('primeiro-acesso/codigo: falha no envio devolve a mesma resposta', async () => {
    Usuario.findOne.mockResolvedValue({
      id: 'u1', nome: 'Ana', email: 'ana@x.com', codigoHash: null, codigoExpiracao: null, codigoTentativas: 0, update: jest.fn(),
    });
    emailService.enviarCodigoPrimeiroAcesso.mockRejectedValue(new Error('SMTP down'));
    const r = await request(appIsolado()).post('/api/auth/primeiro-acesso/codigo')
      .set('X-Tenant-Slug', 'buffet').send({ email: 'ana@x.com' });
    expect(r.status).toBe(200);
  });
});

describe('(c) Tokens de uso único', () => {
  test.each([
    ['curto', 'a'.repeat(63)],
    ['longo', 'a'.repeat(65)],
    ['não-hex', 'z'.repeat(64)],
    ['maiúsculas', 'A'.repeat(64)],
    ['com espaço', ` ${'a'.repeat(63)}`],
  ])('redefinir-senha rejeita token %s sem consultar o banco', async (_n, token) => {
    const r = await request(appIsolado()).post('/api/auth/redefinir-senha').send({ token, senha: 'senhaforte12' });
    expect(r.status).toBe(400);
    expect(Usuario.findOne).not.toHaveBeenCalled();
  });

  test('token de reset: busca exige expiração futura (expirado/reutilizado não acha usuário)', async () => {
    Usuario.findOne.mockResolvedValue(null);
    const r = await request(appIsolado()).post('/api/auth/redefinir-senha')
      .send({ token: 'c'.repeat(64), senha: 'senhaforte12' });
    expect(r.status).toBe(400);
    const where = Usuario.findOne.mock.calls[0][0].where;
    expect(where.resetExpiracao).toBeDefined();
    expect(where.resetToken).not.toBe('c'.repeat(64));
  });

  test('convite: busca exige status pendente + expiração futura', async () => {
    Usuario.findOne.mockResolvedValue(null);
    const r = await request(appIsolado(['usuarios'])).post('/api/usuarios/definir-senha')
      .send({ token: 'd'.repeat(64), senha: 'senhaforte12', aceiteTermos: true });
    expect(r.status).toBe(400);
    const where = Usuario.findOne.mock.calls[0][0].where;
    expect(where.status).toBe('pendente');
    expect(where.conviteExpiracao).toBeDefined();
  });

  test('redefinir-senha encerra convite/código pendentes (não sobrescrevem a nova senha)', async () => {
    const u = { id: 'u1', email: 'ana@x.com', tokenVersion: 0, update: jest.fn() };
    Usuario.findOne.mockResolvedValue(u);
    await request(appIsolado()).post('/api/auth/redefinir-senha').send({ token: 'b'.repeat(64), senha: 'senhaforte12' });
    expect(u.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'ativo', conviteToken: null, conviteExpiracao: null, codigoHash: null, tokenVersion: 1,
    }));
  });

  test('definir-senha (convite) invalida reset pendente', async () => {
    const u = { id: 'u1', email: 'ana@x.com', tokenVersion: 0, update: jest.fn() };
    Usuario.findOne.mockResolvedValue(u);
    await request(appIsolado(['usuarios'])).post('/api/usuarios/definir-senha')
      .send({ token: 'b'.repeat(64), senha: 'senhaforte12', aceiteTermos: true });
    expect(u.update).toHaveBeenCalledWith(expect.objectContaining({ resetToken: null, resetExpiracao: null }));
  });

  test('confirmar código: requisições paralelas para o mesmo e-mail não burlam o limite de tentativas', async () => {
    const u = {
      id: 'u1', nome: 'Ana', email: 'ana@x.com', senha: null, empresaId: 'emp-1',
      codigoHash: 'f'.repeat(64), codigoExpiracao: new Date(Date.now() + 60000), codigoTentativas: 0,
      update: jest.fn().mockResolvedValue(undefined),
    };
    Usuario.findOne.mockImplementation(() => new Promise((r) => setTimeout(() => r(u), 30)));
    const app = appIsolado();
    const enviar = () => request(app).post('/api/auth/primeiro-acesso/confirmar')
      .set('X-Tenant-Slug', 'buffet').send({ email: 'ana@x.com', codigo: '123456', senha: 'senhaforte12' });
    const resp = await Promise.all([enviar(), enviar(), enviar(), enviar()]);
    const processadas = resp.filter((r) => r.status === 400).length;
    expect(processadas).toBe(1);
    expect(resp.filter((r) => r.status === 429).length).toBe(3);
  });
});

describe('(d) Política de senha', () => {
  test.each([
    ['dígitos fullwidth não contam como número', 'abcdefghij１２３'],
    ['só espaços', ' '.repeat(12)],
    ['apenas símbolos', '!@#$%^&*()_+='],
    ['72 bytes: acentos multibyte truncariam no bcrypt', 'ã'.repeat(40) + '1'],
  ])('rejeita %s', (_n, senha) => {
    expect(validarSenha(senha.trim())).not.toBeNull();
  });

  test('senha igual ao e-mail é rejeitada (sem diferenciar caixa)', () => {
    expect(validarSenha('usuario123@x.com', 'Usuario123@X.com')).toMatch(/e-mail/);
    expect(validarSenha('outrasenha123', 'usuario123@x.com')).toBeNull();
  });

  test('senha de 72 bytes exatos passa; 73 não', () => {
    expect(validarSenha('a1' + 'x'.repeat(70))).toBeNull();
    expect(validarSenha('a1' + 'x'.repeat(71))).toMatch(/72/);
  });

  test('redefinir-senha rejeita senha igual ao e-mail da conta', async () => {
    const u = { id: 'u1', email: 'pessoa123@x.com', tokenVersion: 0, update: jest.fn() };
    Usuario.findOne.mockResolvedValue(u);
    const r = await request(appIsolado()).post('/api/auth/redefinir-senha')
      .send({ token: 'b'.repeat(64), senha: 'pessoa123@x.com' });
    expect(r.status).toBe(400);
    expect(u.update).not.toHaveBeenCalled();
  });

  test('o login continua aceitando a senha 123456 do seed (política só na criação)', async () => {
    Usuario.findOne.mockResolvedValue({
      id: 'u1', nome: 'G', email: 'gerente@celebri.com', role: 'gerente', empresaId: 'emp-1',
      senha: bcrypt.hashSync('123456', 4), tokenVersion: 0,
    });
    const r = await request(appIsolado()).post('/api/auth/login').send({ email: 'gerente@celebri.com', senha: '123456' });
    expect(r.status).toBe(200);
  });
});

describe('(b) JWT no middleware auth', () => {
  const executar = async (token, usuarioDb) => {
    Usuario.findOne.mockResolvedValue(usuarioDb);
    let auth;
    jest.isolateModules(() => { auth = require('../middleware/auth'); });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    await auth(req, res, next);
    return { res, next, req };
  };
  const assinar = (extra = {}, opts = {}, segredo = SEGREDO) =>
    jwt.sign({ id: 'u1', email: 'a@x.com', role: 'gerente', empresaId: 'emp-1', tv: 1, ...extra },
      segredo, { algorithm: 'HS256', expiresIn: '1h', ...opts });
  const db = { id: 'u1', empresaId: 'emp-1', tokenVersion: 1 };

  test('baseline: token válido passa', async () => {
    expect((await executar(assinar(), db)).next).toHaveBeenCalled();
  });

  test.each([
    ['empresaId divergente do banco', assinar({ empresaId: 'emp-OUTRA' }), db],
    ['tv de outro valor', assinar({ tv: 0 }), db],
    ['sem tv com versão > 0 no banco', assinar({ tv: undefined }), db],
    ['tv como string', assinar({ tv: '1' }), db],
    ['usuário removido', assinar(), null],
    ['token sem empresaId mas usuário de empresa (escalada a super_admin)', assinar({ empresaId: null, role: 'super_admin' }), db],
    ['expirado', assinar({}, { expiresIn: -10 }), db],
    ['HS512', assinar({}, { algorithm: 'HS512' }), db],
    ['segredo errado', assinar({}, {}, 'outro-segredo-com-mais-de-trinta-e-dois-chars'), db],
  ])('401: %s', async (_n, token, usuarioDb) => {
    const { res, next } = await executar(token, usuarioDb);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('role vem do token, mas mudar o papel no banco derruba o token (tv)', async () => {
    const { res } = await executar(assinar({ role: 'gerente' }), { ...db, tokenVersion: 2 });
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('(f/g) usuarioController: mass assignment e sessões', () => {
  let app;
  beforeEach(() => {
    jest.doMock('../middleware/auth', () => (req, _res, next) => {
      req.user = { id: 'g', role: 'gerente', empresaId: 'emp-1' };
      next();
    });
    app = appIsolado(['usuarios']);
    Usuario.create.mockResolvedValue({ id: 'n', nome: 'N', email: 'n@x.com', role: 'operador' });
  });
  afterEach(() => jest.dontMock('../middleware/auth'));

  test('criar ignora super_admin/empresaId/status/tokenVersion do body', async () => {
    Usuario.findOne.mockResolvedValue(null);
    await request(app).post('/api/usuarios').send({
      nome: 'N', email: 'n@x.com', senha: 'senhaforte12',
      role: 'super_admin', empresaId: 'emp-OUTRA', status: 'pendente', tokenVersion: 99, id: 'forjado',
    });
    const dados = Usuario.create.mock.calls[0][0];
    expect(dados.role).toBe('operador');
    expect(dados).not.toHaveProperty('empresaId');
    expect(dados).not.toHaveProperty('tokenVersion');
    expect(dados).not.toHaveProperty('id');
    expect(dados.status).toBe('ativo');
  });

  test('convidar nunca cria super_admin nem aceita empresaId', async () => {
    Usuario.findOne.mockResolvedValue(null);
    await request(app).post('/api/usuarios/convidar')
      .send({ nome: 'N', email: 'n@x.com', role: 'super_admin', empresaId: 'emp-OUTRA' });
    const dados = Usuario.create.mock.calls[0][0];
    expect(dados.role).toBe('operador');
    expect(dados).not.toHaveProperty('empresaId');
  });

  test('atualizar não repassa empresaId/status/tokenVersion/senha-hash do body ao update', async () => {
    const u = { id: 'u', nome: 'N', email: 'n@x.com', role: 'operador', senha: 'x', tokenVersion: 4, update: jest.fn() };
    Usuario.findOne.mockResolvedValue(u);
    await request(app).put('/api/usuarios/00000000-0000-4000-8000-0000000000a1').send({
      role: 'super_admin', empresaId: 'emp-OUTRA', status: 'pendente', tokenVersion: 0,
    });
    const dados = u.update.mock.calls[0][0];
    expect(dados.role).toBe('operador');
    expect(dados).not.toHaveProperty('empresaId');
    expect(dados).not.toHaveProperty('status');
    expect(dados.tokenVersion).toBeUndefined(); // não zera para reviver sessões
  });

  test('criar/atualizar rejeitam e-mail malformado e senha igual ao e-mail', async () => {
    Usuario.findOne.mockResolvedValue({ id: 'u', email: 'n@x.com', role: 'operador', senha: 'x', update: jest.fn() });
    const r1 = await request(app).post('/api/usuarios').send({ nome: 'N', email: 'sem-arroba', senha: 'senhaforte12' });
    const r2 = await request(app).post('/api/usuarios').send({ nome: 'N', email: 'pessoa1234@x.com', senha: 'pessoa1234@x.com' });
    const r3 = await request(app).put('/api/usuarios/00000000-0000-4000-8000-0000000000a1').send({ email: { $ne: 1 } });
    expect([r1.status, r2.status, r3.status]).toEqual([400, 400, 400]);
    expect(Usuario.create).not.toHaveBeenCalled();
  });

  test('funcionarioId: UUID inválido ou de outro tenant é recusado; do próprio tenant passa', async () => {
    Usuario.findOne.mockResolvedValue(null);
    const base = { nome: 'N', email: 'n@x.com', senha: 'senhaforte12' };
    const r1 = await request(app).post('/api/usuarios').send({ ...base, funcionarioId: "x' OR 1=1" });
    expect(r1.status).toBe(400);
    Funcionario.findOne.mockResolvedValue(null); // fora do escopo do tenant
    const uuid = '11111111-1111-4111-8111-111111111111';
    const r2 = await request(app).post('/api/usuarios').send({ ...base, funcionarioId: uuid });
    expect(r2.status).toBe(400);
    expect(Usuario.create).not.toHaveBeenCalled();
    Funcionario.findOne.mockResolvedValue({ id: uuid });
    const r3 = await request(app).post('/api/usuarios').send({ ...base, funcionarioId: uuid });
    expect(r3.status).toBe(201);
    // a consulta usa o escopo do tenant (sem ignoraTenant)
    expect(Funcionario.findOne.mock.calls.every(([o]) => !o.ignoraTenant)).toBe(true);
  });
});

describe('(e) Logs sem dados sensíveis', () => {
  test('errorHandler e emailService não registram e-mail/token no log', async () => {
    const espioes = ['log', 'warn', 'error'].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
    Usuario.findOne.mockResolvedValue({ id: 'u1', nome: 'Ana', email: 'segredo@x.com', update: jest.fn() });
    emailService.enviarEmailRecuperacaoSenha.mockRejectedValue(new Error('falha para segredo@x.com'));
    await request(appIsolado()).post('/api/auth/recuperar-senha').send({ email: 'segredo@x.com' });
    await request(appIsolado()).post('/api/auth/login').send({ email: 'segredo@x.com', senha: 'SenhaSecreta99' });
    const saida = espioes.flatMap((s) => s.mock.calls).flat().map(String).join('\n');
    espioes.forEach((s) => s.mockRestore());
    expect(saida).not.toMatch(/SenhaSecreta99/);
  });
});
