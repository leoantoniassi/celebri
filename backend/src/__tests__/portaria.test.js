// ============================================================
// Testes: Portaria (app) e Convites (web + página pública)
// ============================================================
const request = require('supertest');
const express = require('express');

let mockUsuario;
jest.mock('../middleware/auth', () => (req, _res, next) => { req.user = mockUsuario; next(); });

jest.mock('../config/database', () => ({ query: jest.fn(), define: jest.fn() }));

jest.mock('../models', () => ({
  Evento: { findOne: jest.fn() },
  Escala: { findOne: jest.fn() },
  Convite: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
}));

jest.mock('../utils/brand', () => ({
  obterMarca: jest.fn().mockResolvedValue({ nomeFantasia: 'Buffet Teste', corPrimaria: '#123456' }),
}));

const sequelize = require('../config/database');
const { Evento, Escala, Convite } = require('../models');

const EVENTO_ID = '11111111-1111-4111-8111-111111111111';
const CONVITE_ID = '22222222-2222-4222-8222-222222222222';
const TOKEN = 'a'.repeat(32);

function criarApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/portaria', require('../routes/portaria.routes'));
  app.use('/api/eventos', require('../routes/eventos.routes'));
  app.use('/api/convites', require('../routes/convites.routes'));
  app.use((err, _req, res, _next) => res.status(500).json({ success: false, message: err.message }));
  return app;
}

describe('Portaria e convites', () => {
  let app;
  let evento;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsuario = { role: 'operador', empresaId: 'emp-1', funcionarioId: 'fun-1' };
    evento = {
      id: EVENTO_ID, nome: 'Festa', qtdPessoas: 80, qtdAvulsos: 3, usaConvites: true,
      dataEvento: '2026-10-01T20:00:00.000Z', update: jest.fn(),
    };
    Evento.findOne.mockResolvedValue(evento);
    Escala.findOne.mockResolvedValue({ id: 'esc-1' });
    Convite.findAll.mockResolvedValue([{ qtdPessoas: 4, qtdEntrou: 2 }, { qtdPessoas: 1, qtdEntrou: 0 }]);
    app = criarApp();
  });

  describe('acesso ao evento', () => {
    test('funcionário escalado vê o resumo com os totais', async () => {
      const res = await request(app).get(`/api/portaria/eventos/${EVENTO_ID}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        pessoasConvidadas: 5, entraramComConvite: 2, avulsos: 3, totalPresentes: 5, qtdPessoasEvento: 80,
      });
    });

    test('funcionário não escalado (ou que recusou) recebe 403', async () => {
      Escala.findOne.mockResolvedValue(null);
      const res = await request(app).get(`/api/portaria/eventos/${EVENTO_ID}`);
      expect(res.status).toBe(403);
    });

    test('gerente não precisa estar escalado', async () => {
      mockUsuario = { role: 'gerente', empresaId: 'emp-1' };
      Escala.findOne.mockResolvedValue(null);
      const res = await request(app).get(`/api/portaria/eventos/${EVENTO_ID}`);
      expect(res.status).toBe(200);
    });

    test('id de evento inválido devolve 404 sem consultar o banco', async () => {
      const res = await request(app).get('/api/portaria/eventos/abc');
      expect(res.status).toBe(404);
      expect(Evento.findOne).not.toHaveBeenCalled();
    });
  });

  describe('leitura do QR', () => {
    test('token de convite do evento devolve nome e quantidades', async () => {
      Convite.findOne.mockResolvedValue({ id: CONVITE_ID, eventoId: EVENTO_ID, nome: 'Família Souza', qtdPessoas: 4, qtdEntrou: 1 });

      const res = await request(app).post(`/api/portaria/eventos/${EVENTO_ID}/leitura`).send({ token: TOKEN });

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ id: CONVITE_ID, nome: 'Família Souza', qtdPessoas: 4, qtdEntrou: 1 });
    });

    test('QR que não é do sistema devolve 400', async () => {
      const res = await request(app).post(`/api/portaria/eventos/${EVENTO_ID}/leitura`).send({ token: 'https://site.com' });
      expect(res.status).toBe(400);
    });

    test('convite de outro evento devolve 409', async () => {
      Convite.findOne.mockResolvedValue({ id: CONVITE_ID, eventoId: 'outro' });
      const res = await request(app).post(`/api/portaria/eventos/${EVENTO_ID}/leitura`).send({ token: TOKEN });
      expect(res.status).toBe(409);
    });
  });

  describe('entrada e contador', () => {
    const entrada = (quantidade) => request(app)
      .post(`/api/portaria/eventos/${EVENTO_ID}/convites/${CONVITE_ID}/entrada`)
      .send({ quantidade });

    test('registra entrada com UPDATE atômico preso ao evento', async () => {
      sequelize.query.mockResolvedValue([[{ qtdEntrou: 3, qtdPessoas: 4, nome: 'Família Souza' }]]);

      const res = await entrada(3);

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ qtdEntrou: 3, excedente: 0 });
      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining('cnv_evt_id = :eventoId'),
        { replacements: { quantidade: 3, conviteId: CONVITE_ID, eventoId: EVENTO_ID } }
      );
    });

    test('avisa quando entram mais pessoas que o convite prevê', async () => {
      sequelize.query.mockResolvedValue([[{ qtdEntrou: 6, qtdPessoas: 4, nome: 'Família Souza' }]]);
      const res = await entrada(6);
      expect(res.body.data.excedente).toBe(2);
      expect(res.body.message).toContain('2 pessoa(s) além');
    });

    test('correção que deixaria o total negativo devolve 409', async () => {
      sequelize.query.mockResolvedValue([[]]);
      Convite.findOne.mockResolvedValue({ id: CONVITE_ID });
      const res = await entrada(-5);
      expect(res.status).toBe(409);
    });

    test.each([0, 1.5, 101, 'x'])('quantidade inválida (%p) devolve 400', async (q) => {
      const res = await entrada(q);
      expect(res.status).toBe(400);
    });

    test('contador avulso soma e devolve o resumo atualizado', async () => {
      sequelize.query.mockResolvedValue([[{ qtdAvulsos: 4 }]]);

      const res = await request(app).post(`/api/portaria/eventos/${EVENTO_ID}/avulsos`).send({ delta: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.avulsos).toBe(4);
      expect(res.body.data.totalPresentes).toBe(6);
    });

    test('contador avulso não fica negativo', async () => {
      sequelize.query.mockResolvedValue([[]]);
      const res = await request(app).post(`/api/portaria/eventos/${EVENTO_ID}/avulsos`).send({ delta: -1 });
      expect(res.status).toBe(409);
    });
  });

  describe('convites no painel web', () => {
    beforeEach(() => {
      mockUsuario = { role: 'gerente', empresaId: 'emp-1' };
    });

    test('cria convite para N pessoas com token de 32 hex', async () => {
      Convite.create.mockImplementation(async (dados) => ({ ...dados, toJSON: () => dados }));

      const res = await request(app).post(`/api/eventos/${EVENTO_ID}/convites`)
        .send({ nome: 'Família Souza', telefone: '(11) 99999-0000', qtdPessoas: 4 });

      expect(res.status).toBe(201);
      expect(Convite.create).toHaveBeenCalledWith(expect.objectContaining({
        nome: 'Família Souza', qtdPessoas: 4, eventoId: EVENTO_ID, token: expect.stringMatching(/^[a-f0-9]{32}$/),
      }));
      expect(res.body.data.link).toMatch(/\/api\/convites\/publico\/[a-f0-9]{32}$/);
    });

    test.each([{ nome: '' }, { nome: 'X', qtdPessoas: 0 }, { nome: 'X', qtdPessoas: 51 }])(
      'recusa convite inválido %p', async (body) => {
        const res = await request(app).post(`/api/eventos/${EVENTO_ID}/convites`).send(body);
        expect(res.status).toBe(400);
      }
    );

    test('liga a lista de convidados do evento', async () => {
      const res = await request(app).patch(`/api/eventos/${EVENTO_ID}/portaria`).send({ usaConvites: false });
      expect(res.status).toBe(200);
      expect(evento.update).toHaveBeenCalledWith(expect.objectContaining({ usaConvites: false }));
    });

    test('funcionário de campo sem papel no painel não gerencia convites', async () => {
      mockUsuario = { role: 'funcionario', empresaId: 'emp-1', funcionarioId: 'fun-1' };
      const res = await request(app).get(`/api/eventos/${EVENTO_ID}/convites`);
      expect(res.status).toBe(403);
    });
  });

  describe('página pública do convite', () => {
    test('token inválido devolve 404 sem consultar o banco', async () => {
      const res = await request(app).get('/api/convites/publico/nao-e-token');
      expect(res.status).toBe(404);
      expect(Convite.findOne).not.toHaveBeenCalled();
    });

    test('escapa o nome do convidado no HTML', async () => {
      Convite.findOne.mockResolvedValue({
        token: TOKEN, empresaId: 'emp-1', nome: '<script>alert(1)</script>', qtdPessoas: 2,
        evento: { nome: 'Festa', dataEvento: '2026-10-01T20:00:00.000Z' },
      });

      const res = await request(app).get(`/api/convites/publico/${TOKEN}`);

      expect(res.status).toBe(200);
      expect(res.text).not.toContain('<script>alert(1)</script>');
      expect(res.text).toContain('&lt;script&gt;');
      expect(res.text).toContain('Válido para 2 pessoas');
      expect(res.text).toContain('data:image/png;base64,');
    });

    test('QR em PNG', async () => {
      Convite.findOne.mockResolvedValue({ token: TOKEN, evento: {} });
      const res = await request(app).get(`/api/convites/publico/${TOKEN}/qrcode.png`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
    });
  });
});
