// ============================================================
// Testes: CORS preflight (OPTIONS) nas rotas reais autenticadas
// ============================================================
const request = require('supertest');

jest.mock('../config/database', () => ({ query: jest.fn(), define: jest.fn() }));
jest.mock('../models', () => new Proxy({}, { get: () => { const m = { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() }; m.unscoped = () => m; return m; } }));

const ORIGEM = 'https://app.exemplo.com';

describe('CORS preflight nas rotas autenticadas reais', () => {
  const envOriginal = { ...process.env };
  let app;

  beforeAll(() => {
    process.env.FRONTEND_URL = ORIGEM;
    app = require('../app');
  });
  afterAll(() => { process.env = { ...envOriginal }; });

  const rotas = [
    ['POST', '/api/auth/login'],
    ['GET', '/api/eventos'],
    ['PUT', '/api/eventos/11111111-1111-4111-8111-111111111111'],
    ['DELETE', '/api/convites/22222222-2222-4222-8222-222222222222'],
    ['POST', '/api/portaria/eventos/11111111-1111-4111-8111-111111111111/leitura'],
    ['GET', '/api/v1/eventos'],
  ];

  test.each(rotas)('origem permitida: preflight %s %s responde 204 sem exigir token', async (metodo, rota) => {
    const res = await request(app).options(rota)
      .set('Origin', ORIGEM)
      .set('Access-Control-Request-Method', metodo)
      .set('Access-Control-Request-Headers', 'Authorization, Content-Type');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGEM);
    expect(res.headers['access-control-allow-methods']).toMatch(new RegExp(metodo));
    expect(res.headers['access-control-allow-headers']).toMatch(/Authorization/);
    expect(res.headers['access-control-allow-credentials']).toBeUndefined();
  });

  test.each(rotas)('origem negada: preflight %s %s não recebe cabeçalhos CORS', async (metodo, rota) => {
    const res = await request(app).options(rota)
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', metodo)
      .set('Access-Control-Request-Headers', 'Authorization');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-methods']).toBeUndefined();
  });

  test('requisição real autenticada sem token mantém CORS e devolve 401', async () => {
    const res = await request(app).get('/api/eventos').set('Origin', ORIGEM);
    expect(res.status).toBe(401);
    expect(res.headers['access-control-allow-origin']).toBe(ORIGEM);
  });

  test('método fora da lista (TRACE) não é anunciado', async () => {
    const res = await request(app).options('/api/eventos')
      .set('Origin', ORIGEM).set('Access-Control-Request-Method', 'DELETE');
    expect(res.headers['access-control-allow-methods']).not.toMatch(/TRACE|HEAD/);
  });
});
