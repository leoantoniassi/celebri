// ============================================================
// Matriz de rotas: percorre a pilha REAL do Express e garante que
//   1) toda rota fora da lista pública exige token (401 sem ele);
//   2) toda rota fora da lista do app mobile é negada (403/400) a uma
//      conta de campo (operador vinculado a funcionário).
// Rota nova esquecida sem `auth` ou sem `exigirPapelAdministrativo`
// quebra este teste. App, auth, JWT e middlewares são os reais; só os
// models são stubs.
// ============================================================
const jwt = require('jsonwebtoken');
const request = require('supertest');

const SEGREDO = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';
const EMPRESA_ID = '11111111-1111-4111-8111-111111111111';
const UUID = '550e8400-e29b-41d4-a716-446655440000';
const FUNCIONARIO_CAMPO = '550e8400-e29b-41d4-a716-446655440001';

const mockContas = {
  'u-campo': { id: 'u-campo', empresaId: EMPRESA_ID, tokenVersion: 0, role: 'operador', funcionarioId: FUNCIONARIO_CAMPO },
};

jest.mock('../models', () => {
  const stub = () => new Proxy(function () {}, {
    get: (_t, prop) => (prop === '__esModule' ? false : prop === 'then' ? undefined : stub()),
    apply: () => stub(),
  });
  const base = stub();
  const Usuario = { findOne: async ({ where }) => mockContas[where.id] || null };
  const Funcionario = { findOne: async ({ where }) => ({ id: where.id }) };
  return new Proxy({}, {
    get: (_t, prop) => (prop === 'Usuario' ? Usuario : prop === 'Funcionario' ? Funcionario : base[prop]),
  });
});

jest.mock('../services/emailService', () => ({
  enviarEmailRecuperacaoSenha: jest.fn().mockResolvedValue(undefined),
  enviarCodigoPrimeiroAcesso: jest.fn().mockResolvedValue(undefined),
  enviarConvite: jest.fn().mockResolvedValue(undefined),
}));

let app;
let rotas;
let tokenCampo;

// ── Descoberta das rotas (Express 4: app._router.stack) ─────
function prefixoDaCamada(layer) {
  let fonte = layer.regexp.source;
  if (layer.regexp.fast_slash) return '';
  fonte = fonte.replace(/^\^/, '').replace(/\\\/\?\(\?=\\\/\|\$\)$/, '').replace(/\\\//g, '/');
  let i = 0;
  // Cada grupo de captura vira o nome do param correspondente.
  return fonte.replace(/\(\?:\(\[\^\/\]\+\?\)\)/g, () => `:${layer.keys[i++].name}`);
}

function coletar(stack, base, achadas) {
  stack.forEach((layer) => {
    if (layer.route) {
      const caminhos = [].concat(layer.route.path);
      Object.keys(layer.route.methods).filter((m) => layer.route.methods[m] && m !== '_all').forEach((metodo) => {
        caminhos.forEach((c) => achadas.push({ metodo: metodo.toUpperCase(), caminho: (base + c).replace(/\/+$/, '') || '/' }));
      });
    } else if (layer.name === 'router' && layer.handle.stack) {
      coletar(layer.handle.stack, base + prefixoDaCamada(layer), achadas);
    }
  });
  return achadas;
}

// Troca ":param" por um UUID e preserva o resto do caminho.
const materializar = (caminho) => caminho.replace(/:[A-Za-z]+/g, UUID);
// /api/v1 é alias de /api: a classificação usa a forma canônica.
const canonico = (caminho) => caminho.replace(/^\/api\/v1(?=\/|$)/, '/api');

// ── Exceções explícitas ─────────────────────────────────────
const PUBLICAS = [
  (m, c) => c.startsWith('/api/auth/'),
  (m, c) => c.startsWith('/api/convites/publico/'),
  (m, c) => m === 'GET' && c === '/api/tenant/config',
  (m, c) => m === 'GET' && c === '/api/health',
  (m, c) => m === 'POST' && c === '/api/usuarios/definir-senha', // aceite de convite (token de uso único)
];

// Rotas liberadas à conta de campo (espelho do que o app mobile usa).
const CAMPO_LIBERADAS = [
  (m, c) => m === 'GET' && c === '/api/escala/minhas',
  (m, c) => m === 'PATCH' && c === '/api/escala/:id/confirmacao',
  (m, c) => m === 'POST' && c === '/api/escala/:id/checkin',
  (m, c) => c.startsWith('/api/portaria/'),
  (m, c) => c.startsWith('/api/operacao/'),
  (m, c) => c.startsWith('/api/auth/'),
  (m, c) => m === 'GET' && c === '/api/tenant/config',
  (m, c) => m === 'GET' && c === '/api/health',
  (m, c) => m === 'GET' && c === '/api/eventos',
  (m, c) => m === 'GET' && c === '/api/eventos/:id', // só escalado
  (m, c) => m === 'GET' && c.startsWith('/api/lookup/'),
  (m, c) => m === 'GET' && (c === '/api/locais' || c === '/api/locais/:id'),
  (m, c) => m === 'GET' && c === '/api/catalogos',
  (m, c) => m === 'GET' && (c === '/api/funcionarios/:id' || c === '/api/funcionarios/:id/detalhes'), // só o próprio
  (m, c) => c.startsWith('/api/convites/publico/'),
];

const casa = (lista, r) => lista.some((fn) => fn(r.metodo, canonico(r.caminho)));
const rotulo = (r) => `${r.metodo} ${r.caminho}`;
const chamar = (r, token) => {
  const req = request(app)[r.metodo.toLowerCase()](materializar(r.caminho)).set('X-Tenant-Slug', 'buffet');
  return token ? req.set('Authorization', `Bearer ${token}`) : req;
};

beforeAll(() => {
  process.env.JWT_SECRET = SEGREDO;
  app = require('../app');
  rotas = coletar(app._router.stack, '', []);
  tokenCampo = jwt.sign(
    { id: 'u-campo', role: 'operador', empresaId: EMPRESA_ID, tv: 0, funcionarioId: FUNCIONARIO_CAMPO },
    SEGREDO,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
});

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Matriz de rotas: descoberta', () => {
  test('encontra as rotas conhecidas (sanidade do parser de caminhos)', () => {
    const lista = rotas.map(rotulo);
    expect(rotas.length).toBeGreaterThan(80);
    expect(lista).toEqual(expect.arrayContaining([
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/tenant/config',
      'GET /api/convites/publico/:token',
      'PATCH /api/escala/:id/confirmacao',
      'GET /api/portaria/eventos/:eventoId',
      'PATCH /api/operacao/eventos/:eventoId/pedidos/:pedidoId/status',
      'GET /api/v1/eventos/:id',
    ]));
    rotas.forEach((r) => expect(r.caminho).toMatch(/^\/[A-Za-z0-9/:._-]*$/));
  });

  test('as listas de exceção não ficaram obsoletas (cada regra casa alguma rota)', () => {
    [...PUBLICAS, ...CAMPO_LIBERADAS].forEach((fn) => {
      expect(rotas.some((r) => fn(r.metodo, canonico(r.caminho)))).toBe(true);
    });
  });
});

describe('Matriz de rotas: autenticação', () => {
  test('toda rota não pública responde 401 sem token', async () => {
    const privadas = rotas.filter((r) => !casa(PUBLICAS, r));
    expect(privadas.length).toBeGreaterThan(60);

    const falhas = [];
    for (const r of privadas) {
      // eslint-disable-next-line no-await-in-loop
      const res = await chamar(r);
      if (res.status !== 401) falhas.push(`${rotulo(r)} -> ${res.status}`);
    }
    expect(falhas).toEqual([]);
  });

  test('token inválido também é 401 em toda rota não pública', async () => {
    const privadas = rotas.filter((r) => !casa(PUBLICAS, r));
    const falhas = [];
    for (const r of privadas) {
      // eslint-disable-next-line no-await-in-loop
      const res = await chamar(r, 'lixo');
      if (res.status !== 401) falhas.push(`${rotulo(r)} -> ${res.status}`);
    }
    expect(falhas).toEqual([]);
  });
});

describe('Matriz de rotas: conta de campo', () => {
  test('rotas fora da lista do app mobile respondem 403 (ou 400 por UUID) a conta de campo', async () => {
    const restritas = rotas.filter((r) => !casa(CAMPO_LIBERADAS, r));
    expect(restritas.length).toBeGreaterThan(50);

    const falhas = [];
    for (const r of restritas) {
      // eslint-disable-next-line no-await-in-loop
      const res = await chamar(r, tokenCampo);
      if (![400, 403].includes(res.status)) falhas.push(`${rotulo(r)} -> ${res.status}`);
    }
    expect(falhas).toEqual([]);
  });

  test('o token de campo é aceito pela autenticação nas rotas liberadas (não é 401)', async () => {
    const res = await chamar({ metodo: 'GET', caminho: '/api/escala/minhas' }, tokenCampo);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
