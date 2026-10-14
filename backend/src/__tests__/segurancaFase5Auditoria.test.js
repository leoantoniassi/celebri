// Auditoria fase 5: CORS adversarial e validarUrlHttp
const request = require('supertest');
const { validarUrlHttp } = require('../utils/validators');

jest.mock('../config/database', () => ({ query: jest.fn(), define: jest.fn() }));
jest.mock('../routes', () => {
  const r = require('express').Router();
  r.get('/ping', (_q, s) => s.json({ ok: true }));
  return r;
});

function carregarApp() {
  jest.resetModules();
  process.env.FRONTEND_URL = 'https://app.exemplo.com';
  return require('../app');
}

describe('CORS adversarial', () => {
  const app = carregarApp();
  const acao = (origin) => request(app).get('/api/ping').set('Origin', origin);

  test.each([
    'null',
    'https://app.exemplo.com.evil.com',
    'https://evil.com/https://app.exemplo.com',
    'http://app.exemplo.com',
    'https://app.exemplo.com:8443',
    'https://APP.exemplo.com',
    'https://app.exemplo.com/',
    'https://app.exemplo.com, https://evil.com',
    '*',
  ])('não libera origem %p', async (origin) => {
    const res = await acao(origin);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('libera a origem exata, sem credentials, com Vary: Origin', async () => {
    const res = await acao('https://app.exemplo.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://app.exemplo.com');
    expect(res.headers.vary).toMatch(/Origin/);
  });

  test('preflight não anuncia métodos/headers fora da lista', async () => {
    const res = await request(app).options('/api/ping')
      .set('Origin', 'https://app.exemplo.com')
      .set('Access-Control-Request-Method', 'TRACE')
      .set('Access-Control-Request-Headers', 'X-Evil');
    expect(res.headers['access-control-allow-methods']).not.toMatch(/TRACE/);
    expect(res.headers['access-control-allow-headers']).toBe('Content-Type,Authorization,X-Tenant-Slug');
  });

  test('preflight de origem hostil não recebe Allow-Origin', async () => {
    const res = await request(app).options('/api/ping')
      .set('Origin', 'https://evil.com').set('Access-Control-Request-Method', 'DELETE');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('validarUrlHttp adversarial', () => {
  test.each([
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,x', 'vbscript:x',
    'http:\\\\evil', '//evil.com', 'http://', 'https:///x', 'ht\ntp://evil.com', 'http://a .com', 'http://a.com/\u0000',
    `https://a.com/${'a'.repeat(2100)}`,
  ])('rejeita %p', (v) => {
    expect(validarUrlHttp(v)).toBeNull();
  });

  test.each(['HTTP://Exemplo.com/x', 'https://[::1]/x', 'http://user:pass@host.com/x', 'http://localhost:3000/a'])(
    'aceita (risco de phishing registrado, sem SSRF) %p', (v) => {
      expect(validarUrlHttp(v)).toBe(v);
    });
});
