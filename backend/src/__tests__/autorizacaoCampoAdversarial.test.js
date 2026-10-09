// ============================================================
// Testes adversariais — Fase 4 (autorização de campo, tenant, corrida)
// ============================================================
const jwt = require('jsonwebtoken');
const request = require('supertest');
const express = require('express');

jest.mock('../config/database', () => {
  // Transação fake que serializa quem a pede (como o SELECT ... FOR UPDATE).
  let fila = Promise.resolve();
  return {
    transaction: jest.fn((fn) => {
      const rodar = fila.then(() => fn('tx'));
      fila = rodar.catch(() => {});
      return rodar;
    }),
    query: jest.fn(),
    define: jest.fn(),
  };
});

jest.mock('../services/emailService', () => ({
  enviarConvite: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../models', () => {
  const vazio = () => ({
    findOne: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue([]),
    findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn(),
    update: jest.fn(),
    unscoped() { return this; },
    scope() { return this; },
  });
  const cache = {};
  return new Proxy({}, {
    get: (_t, prop) => {
      if (prop === '__esModule' || prop === 'then') return undefined;
      if (!cache[prop]) cache[prop] = vazio();
      return cache[prop];
    },
  });
});

const models = require('../models');
const errorHandler = require('../middleware/errorHandler');

const SEGREDO = 'segredo-de-teste-com-mais-de-32-caracteres-ok';
const ID = '550e8400-e29b-41d4-a716-446655440000';
const ID2 = '550e8400-e29b-41d4-a716-446655440001';
const ID3 = '550e8400-e29b-41d4-a716-446655440002';

const montarApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', require('../routes'));
  app.use(errorHandler);
  return app;
};

const assinar = (extra = {}) =>
  jwt.sign({ id: 'u1', email: 'a@x.com', role: 'operador', empresaId: 'emp-1', funcionarioId: null, tv: 0, ...extra },
    SEGREDO, { algorithm: 'HS256', expiresIn: '1h' });

describe('auth: papel e vínculo vêm do banco, não do token', () => {
  let app;
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  beforeAll(() => { process.env.JWT_SECRET = SEGREDO; app = montarApp(); });
  afterAll(() => log.mockRestore());
  beforeEach(() => jest.clearAllMocks());

  test('token sem funcionarioId, mas conta já vinculada a funcionário no banco -> tratado como campo (403)', async () => {
    models.Usuario.findOne.mockResolvedValue({ id: 'u1', empresaId: 'emp-1', tokenVersion: 0, role: 'operador', funcionarioId: ID });
    models.Funcionario.findOne.mockResolvedValue({ id: ID });
    const res = await request(app).get('/api/clientes').set('Authorization', `Bearer ${assinar()}`);
    expect(res.status).toBe(403);
  });

  test('token com role gerente forjado/antigo, mas banco diz operador de campo -> 403', async () => {
    models.Usuario.findOne.mockResolvedValue({ id: 'u1', empresaId: 'emp-1', tokenVersion: 0, role: 'operador', funcionarioId: ID });
    models.Funcionario.findOne.mockResolvedValue({ id: ID });
    const res = await request(app).get('/api/clientes').set('Authorization', `Bearer ${assinar({ role: 'gerente' })}`);
    expect(res.status).toBe(403);
  });

  test('funcionário desligado (soft delete) perde o acesso mesmo com token válido -> 401', async () => {
    models.Usuario.findOne.mockResolvedValue({ id: 'u1', empresaId: 'emp-1', tokenVersion: 0, role: 'operador', funcionarioId: ID });
    models.Funcionario.findOne.mockResolvedValue(null);
    const res = await request(app).get('/api/escala/minhas').set('Authorization', `Bearer ${assinar({ funcionarioId: ID })}`);
    expect(res.status).toBe(401);
  });

  test('gerente vinculado a funcionário removido continua entrando', async () => {
    models.Usuario.findOne.mockResolvedValue({ id: 'u1', empresaId: 'emp-1', tokenVersion: 0, role: 'gerente', funcionarioId: ID });
    models.Funcionario.findOne.mockResolvedValue(null);
    const res = await request(app).get('/api/clientes').set('Authorization', `Bearer ${assinar({ role: 'gerente' })}`);
    expect(res.status).toBe(200);
  });
});

describe('rotas e controllers sob usuário mockado', () => {
  let app;
  let mockUser;
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeAll(() => {
    jest.resetModules();
    jest.doMock('../middleware/auth', () => (req, _res, next) => { req.user = mockUser; next(); });
    app = montarApp();
  });
  afterAll(() => { log.mockRestore(); jest.dontMock('../middleware/auth'); });
  beforeEach(() => jest.clearAllMocks());

  const campo = { id: 'u-campo', role: 'operador', funcionarioId: ID, empresaId: 'emp-1' };
  const gerente = { id: 'u-ger', role: 'gerente', funcionarioId: null, empresaId: 'emp-1' };
  const superAdmin = { id: 'u-sa', role: 'super_admin', funcionarioId: null, empresaId: null };

  // jest.resetModules() cria outra instância de ../models: usa a do app.
  const m = () => require('../models');

  test('GET /locais/:id/mesas é do painel: campo -> 403', async () => {
    mockUser = campo;
    expect((await request(app).get(`/api/locais/${ID}/mesas`)).status).toBe(403);
    mockUser = gerente;
    expect((await request(app).get(`/api/locais/${ID}/mesas`)).status).toBe(200);
  });

  test('GET /empresas/:id malformado -> 400 (e não 500)', async () => {
    mockUser = superAdmin;
    expect((await request(app).get('/api/empresas/abc')).status).toBe(400);
    expect((await request(app).put('/api/empresas/abc').send({})).status).toBe(400);
  });

  test.each([
    ['clienteId[ne]=x', '?clienteId[ne]=x'],
    ['eventoId[]=a', '?eventoId[]=a'],
    ['clienteId inválido', '?clienteId=abc'],
  ])('GET /documentos com filtro %s -> 400 sem consultar o banco', async (_n, qs) => {
    mockUser = gerente;
    const res = await request(app).get(`/api/documentos${qs}`);
    expect(res.status).toBe(400);
    expect(m().Documento.findAll).not.toHaveBeenCalled();
  });

  describe('GET /eventos para campo', () => {
    test('lista só eventos em que está escalado', async () => {
      mockUser = campo;
      m().Escala.findAll.mockResolvedValue([{ eventoId: ID2 }]);
      const res = await request(app).get('/api/eventos');
      expect(res.status).toBe(200);
      const where = m().Evento.findAndCountAll.mock.calls[0][0].where;
      const { Op } = require('sequelize');
      expect(where.id[Op.in]).toEqual([ID2]);
      expect(m().Escala.findAll.mock.calls[0][0].where.funcionarioId).toBe(ID);
    });

    test('gerente não é restringido por escala', async () => {
      mockUser = gerente;
      await request(app).get('/api/eventos');
      expect(m().Escala.findAll).not.toHaveBeenCalled();
      expect(m().Evento.findAndCountAll.mock.calls[0][0].where.id).toBeUndefined();
    });
  });

  describe('GET /eventos/:id — projeção para campo', () => {
    const modelosIncluidos = (chamada) => chamada.include.map((i) => i.model);

    test('campo escalado não recebe orçamento, documentos, contato do cliente nem valores', async () => {
      mockUser = campo;
      m().Escala.findOne.mockResolvedValue({ id: 'e' });
      m().Evento.findOne.mockResolvedValue({ id: ID, toJSON() { return this; } });
      const res = await request(app).get(`/api/eventos/${ID}`);
      expect(res.status).toBe(200);
      const chamada = m().Evento.findOne.mock.calls[0][0];
      expect(modelosIncluidos(chamada)).not.toContain(m().Orcamento);
      expect(modelosIncluidos(chamada)).not.toContain(m().Documento);
      expect(chamada.attributes.exclude).toEqual(expect.arrayContaining(['valorOrcamento']));
      const cliente = chamada.include.find((i) => i.model === m().Cliente);
      expect(cliente.attributes).toEqual(['id', 'nome']);
      const escala = chamada.include.find((i) => i.model === m().Escala);
      expect(escala.include[0].attributes).not.toEqual(expect.arrayContaining(['email']));
    });

    test('gerente continua recebendo a visão completa', async () => {
      mockUser = gerente;
      m().Evento.findOne.mockResolvedValue({ id: ID, toJSON() { return this; } });
      await request(app).get(`/api/eventos/${ID}`);
      const chamada = m().Evento.findOne.mock.calls[0][0];
      expect(modelosIncluidos(chamada)).toEqual(expect.arrayContaining([m().Orcamento, m().Documento]));
      expect(chamada.attributes).toBeUndefined();
    });
  });

  describe('IDOR dentro do tenant: campo escalado no evento A', () => {
    test('não opera portaria/cozinha/mesas do evento B', async () => {
      mockUser = campo;
      m().Evento.findOne.mockResolvedValue({ id: ID3, localId: ID });
      m().Escala.findOne.mockResolvedValue(null); // sem escala no evento B
      for (const [metodo, url] of [
        ['get', `/api/portaria/eventos/${ID3}`],
        ['get', `/api/portaria/eventos/${ID3}/convites`],
        ['post', `/api/portaria/eventos/${ID3}/avulsos`],
        ['post', `/api/portaria/eventos/${ID3}/convites/${ID}/entrada`],
        ['get', `/api/operacao/eventos/${ID3}/cozinha`],
        ['get', `/api/operacao/eventos/${ID3}/mesas`],
        ['post', `/api/operacao/eventos/${ID3}/pedidos`],
        ['patch', `/api/operacao/eventos/${ID3}/pedidos/${ID}/status`],
        ['get', `/api/eventos/${ID3}`],
      ]) {
        const res = await request(app)[metodo](url).send({});
        expect([url, res.status]).toEqual([url, 403]);
      }
      expect(m().Escala.findOne.mock.calls[0][0].where).toMatchObject({ eventoId: ID3, funcionarioId: ID });
    });

    test('check-in/confirmação só alcançam a escala do próprio funcionário', async () => {
      mockUser = campo;
      m().Escala.findOne.mockResolvedValue(null);
      expect((await request(app).post(`/api/escala/${ID2}/checkin`).send({})).status).toBe(404);
      expect((await request(app).patch(`/api/escala/${ID2}/confirmacao`).send({ resposta: 'confirmado' })).status).toBe(404);
      for (const [args] of m().Escala.findOne.mock.calls) {
        expect(args.where).toMatchObject({ id: ID2, funcionarioId: ID });
      }
    });

    test('conta sem funcionário (escritório) não consegue check-in', async () => {
      mockUser = { ...gerente, role: 'operador' };
      expect((await request(app).post(`/api/escala/${ID2}/checkin`).send({})).status).toBe(404);
      expect(m().Escala.findOne).not.toHaveBeenCalled();
    });

    test('role admin com funcionarioId é tratada como administrativa (igual ao resto do sistema)', async () => {
      mockUser = { id: 'u', role: 'admin', funcionarioId: ID, empresaId: 'emp-1' };
      m().Evento.findOne.mockResolvedValue({ id: ID3 });
      const res = await request(app).get(`/api/portaria/eventos/${ID3}`);
      expect(res.status).not.toBe(403);
      expect(m().Escala.findOne).not.toHaveBeenCalled();
    });
  });

  describe('último gerente: corrida entre dois pedidos', () => {
    // Estado compartilhado: dois gerentes ativos, A e B. count() lê o estado.
    const montarCenario = () => {
      const estado = { A: 'gerente', B: 'gerente' };
      const ids = { A: ID, B: ID2 };
      const linha = (k) => ({
        id: ids[k], status: 'ativo', senha: 'h', email: `${k}@x.com`,
        get role() { return estado[k]; },
        update: jest.fn(async (d) => { if (d.role) estado[k] = d.role; }),
        destroy: jest.fn(async () => { delete estado[k]; }),
      });
      const linhas = { [ID]: linha('A'), [ID2]: linha('B') };
      m().Usuario.findOne.mockImplementation(async ({ where }) => linhas[where.id] || null);
      m().Usuario.findAll.mockResolvedValue([]);
      m().Usuario.count.mockImplementation(async ({ where }) => {
        const excluido = where.id[require('sequelize').Op.ne];
        return Object.entries(ids).filter(([k, id]) => id !== excluido && estado[k] === 'gerente').length;
      });
      return estado;
    };

    beforeEach(() => { mockUser = { ...gerente, id: ID3 }; });

    test('dois DELETE em paralelo: um passa, o outro leva 409', async () => {
      const estado = montarCenario();
      const [r1, r2] = await Promise.all([
        request(app).delete(`/api/usuarios/${ID}`),
        request(app).delete(`/api/usuarios/${ID2}`),
      ]);
      expect([r1.status, r2.status].sort()).toEqual([200, 409]);
      expect(Object.values(estado).filter((r) => r === 'gerente')).toHaveLength(1);
    });

    test('dois rebaixamentos (PUT) em paralelo: um passa, o outro leva 409', async () => {
      const estado = montarCenario();
      const [r1, r2] = await Promise.all([
        request(app).put(`/api/usuarios/${ID}`).send({ role: 'operador' }),
        request(app).put(`/api/usuarios/${ID2}`).send({ role: 'operador' }),
      ]);
      expect([r1.status, r2.status].sort()).toEqual([200, 409]);
      expect(Object.values(estado).filter((r) => r === 'gerente')).toHaveLength(1);
    });

    test('a contagem usa a mesma transação que travou as linhas de gerente', async () => {
      montarCenario();
      await request(app).delete(`/api/usuarios/${ID}`);
      const trava = m().Usuario.findAll.mock.calls[0][0];
      expect(trava.transaction).toBe('tx');
      expect(trava.lock).toBeDefined();
      expect(m().Usuario.count.mock.calls[0][0].transaction).toBe('tx');
    });

    test('pedido de convite com role gerente + funcionarioId de outro tenant segue barrado', async () => {
      m().Funcionario.findOne.mockResolvedValue(null);
      const res = await request(app).post('/api/usuarios/convidar')
        .send({ nome: 'X', email: 'x@y.com', role: 'gerente', funcionarioId: ID3 });
      expect(res.status).toBe(400);
      expect(m().Usuario.create).not.toHaveBeenCalled();
    });

    test('role forjada no body (super_admin / admin / objeto) vira operador', async () => {
      m().Funcionario.findOne.mockResolvedValue({ id: ID });
      m().Usuario.findOne.mockResolvedValue(null);
      for (const role of ['super_admin', 'admin', 'GERENTE', { a: 1 }, ['gerente']]) {
        m().Usuario.create.mockClear();
        await request(app).post('/api/usuarios/convidar').send({ nome: 'X', email: 'x@y.com', role });
        const criado = m().Usuario.create.mock.calls[0]?.[0];
        if (criado) expect(criado.role).toBe('operador');
      }
    });
  });
});
