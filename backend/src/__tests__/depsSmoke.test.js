// ============================================================
// Testes de fumaça: dependências críticas após atualização
// Cobre: express (app + /api/health) e nodemailer (createTransport)
// ============================================================
const request = require('supertest');

// Evita conexão real com o banco ao carregar as rotas
// Stub recursivo: qualquer acesso (Model.unscoped(), Model.hasMany...) é inofensivo
jest.mock('../models', () => {
  const stub = () => new Proxy(function () {}, {
    get: (_t, prop) => (prop === '__esModule' ? false : prop === 'then' ? undefined : stub()),
    apply: () => stub(),
  });
  return stub();
});

describe('Smoke: express', () => {
  it('GET /api/health responde 200 com success=true', async () => {
    const app = require('../app');
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Smoke: nodemailer', () => {
  it('createTransport cria transporte SMTP sem enviar nada', () => {
    const nodemailer = require('nodemailer');
    const transport = nodemailer.createTransport({
      host: 'x',
      port: 465,
      secure: true,
      auth: { user: 'a', pass: 'b' },
    });

    expect(typeof transport.sendMail).toBe('function');
    expect(transport.options.host).toBe('x');
    expect(transport.options.secure).toBe(true);
    transport.close();
  });
});
