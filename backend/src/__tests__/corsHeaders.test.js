// ============================================================
// Testes: CORS sem '*', helmet/CSP da API e validação de FRONTEND_URL
// ============================================================
const request = require('supertest');
const { lerOrigensCors, urlBaseFrontend } = require('../config/seguranca');

jest.mock('../config/database', () => ({ query: jest.fn(), define: jest.fn() }));
jest.mock('../routes', () => require('express').Router());

function carregarApp(frontendUrl) {
  jest.resetModules();
  if (frontendUrl === undefined) delete process.env.FRONTEND_URL;
  else process.env.FRONTEND_URL = frontendUrl;
  return require('../app');
}

describe('lerOrigensCors', () => {
  test('produção sem FRONTEND_URL falha com mensagem clara', () => {
    expect(() => lerOrigensCors({ NODE_ENV: 'production' })).toThrow(/FRONTEND_URL é obrigatória em produção/);
  });

  test('produção com FRONTEND_URL em branco também falha', () => {
    expect(() => lerOrigensCors({ NODE_ENV: 'production', FRONTEND_URL: '  ,  ' })).toThrow(/obrigatória/);
  });

  test('"*" é recusado em qualquer ambiente', () => {
    expect(() => lerOrigensCors({ NODE_ENV: 'development', FRONTEND_URL: '*' })).toThrow(/não pode ser "\*"/);
  });

  test('dev/test usam as origens locais padrão', () => {
    expect(lerOrigensCors({ NODE_ENV: 'development' })).toEqual(expect.arrayContaining(['http://localhost:5173', 'http://localhost:3000']));
    expect(lerOrigensCors({ NODE_ENV: 'test' })).not.toContain('*');
  });

  test('aceita lista separada por vírgula e remove barra final', () => {
    expect(lerOrigensCors({ NODE_ENV: 'production', FRONTEND_URL: 'https://a.com/, https://b.com' }))
      .toEqual(['https://a.com', 'https://b.com']);
  });

  test('urlBaseFrontend usa a primeira origem', () => {
    expect(urlBaseFrontend({ FRONTEND_URL: 'https://a.com/, https://b.com' })).toBe('https://a.com');
  });
});

describe('app: CORS e cabeçalhos', () => {
  const envOriginal = { ...process.env };
  afterEach(() => { process.env = { ...envOriginal }; });

  test('origem permitida recebe Access-Control-Allow-Origin', async () => {
    const app = carregarApp('https://app.exemplo.com');
    const res = await request(app).get('/api/health').set('Origin', 'https://app.exemplo.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://app.exemplo.com');
  });

  test('origem negada não recebe cabeçalho CORS (nem "*")', async () => {
    const app = carregarApp('https://app.exemplo.com');
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('preflight de origem negada não é autorizado', async () => {
    const app = carregarApp('https://app.exemplo.com');
    const res = await request(app).options('/api/health')
      .set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'GET');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('sem FRONTEND_URL fora de produção usa localhost, nunca "*"', async () => {
    const app = carregarApp(undefined);
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const ruim = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(ruim.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('produção sem FRONTEND_URL impede o app de subir', () => {
    process.env.NODE_ENV = 'production';
    expect(() => carregarApp(undefined)).toThrow(/FRONTEND_URL/);
  });

  test('helmet: CSP restritiva da API e frame-ancestors none', async () => {
    const app = carregarApp('https://app.exemplo.com');
    const res = await request(app).get('/api/health');
    const csp = res.headers['content-security-policy'];
    expect(csp).toMatch(/default-src 'none'/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
