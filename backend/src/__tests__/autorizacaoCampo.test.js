// ============================================================
// Testes: Fase 4 — papel de campo, UUID de rota, FK por tenant,
// último gerente
// ============================================================
const request = require('supertest');
const express = require('express');

let mockUser;
jest.mock('../middleware/auth', () => (req, _res, next) => { req.user = mockUser; next(); });

jest.mock('../config/database', () => ({
  transaction: jest.fn((fn) => fn('tx')),
  query: jest.fn(),
  define: jest.fn(),
}));

// Todo model responde "vazio": o que interessa aqui é a decisão do middleware.
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

const ID = '550e8400-e29b-41d4-a716-446655440000';
const OUTRO_TENANT = '550e8400-e29b-41d4-a716-446655449999';

const campo = { id: 'u-campo', role: 'operador', funcionarioId: ID, empresaId: 'emp-1' };
const escritorio = { id: 'u-esc', role: 'operador', funcionarioId: null, empresaId: 'emp-1' };
const gerente = { id: 'u-ger', role: 'gerente', funcionarioId: null, empresaId: 'emp-1' };
const superAdmin = { id: 'u-sa', role: 'super_admin', funcionarioId: null, empresaId: null };

// Rotas do painel que o funcionário de campo NÃO pode chamar.
const ROTAS_RESTRITAS = [
  ['delete', `/api/locais/${ID}`],
  ['post', '/api/locais'],
  ['put', `/api/locais/${ID}`],
  ['post', `/api/locais/${ID}/mesas`],
  ['post', '/api/lookup/funcoes'],
  ['put', `/api/lookup/funcoes/${ID}`],
  ['delete', `/api/lookup/categorias-produto/${ID}`],
  ['post', '/api/catalogos'],
  ['put', `/api/catalogos/${ID}`],
  ['get', '/api/clientes'],
  ['get', `/api/clientes/${ID}`],
  ['post', '/api/clientes'],
  ['put', `/api/clientes/${ID}`],
  ['get', '/api/fornecedores'],
  ['post', '/api/fornecedores'],
  ['put', `/api/fornecedores/${ID}`],
  ['post', '/api/produtos'],
  ['put', `/api/produtos/${ID}`],
  ['get', '/api/funcionarios'],
  ['get', `/api/funcionarios/${OUTRO_TENANT}`],
  ['get', `/api/funcionarios/${OUTRO_TENANT}/detalhes`],
  ['get', '/api/busca?q=maria'],
  ['get', '/api/dashboard/stats'],
  ['get', '/api/dashboard/charts'],
  ['get', '/api/usuarios'],
  ['get', `/api/escala/evento/${ID}`],
  ['get', `/api/escala/disponiveis/${ID}`],
  ['post', '/api/escala'],
  ['post', '/api/eventos'],
  ['put', `/api/eventos/${ID}`],
  ['get', `/api/eventos/${ID}/convites`],
  ['get', '/api/orcamentos'],
  ['get', `/api/orcamentos/${ID}`],
  ['post', '/api/orcamentos'],
  ['get', '/api/documentos'],
  ['put', `/api/convites/${ID}`],
  ['put', `/api/mesas/${ID}`],
  ['put', `/api/servicos/${ID}`],
];

// Rotas que o app mobile usa: nunca devem responder com a negativa de painel.
const ROTAS_DO_APP = [
  ['get', '/api/escala/minhas'],
  ['patch', `/api/escala/${ID}/confirmacao`],
  ['post', `/api/escala/${ID}/checkin`],
  ['get', `/api/portaria/eventos/${ID}`],
  ['get', `/api/operacao/eventos/${ID}/mesas`],
  ['get', `/api/operacao/eventos/${ID}/cozinha`],
  ['get', '/api/tenant/config'],
  ['get', `/api/funcionarios/${ID}`], // o próprio cadastro
  ['get', '/api/lookup/funcoes'],
  ['get', '/api/locais'],
  ['get', '/api/catalogos'],
];

describe('Fase 4 — autorização, UUID, FK por tenant', () => {
  let app;
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', require('../routes'));
    app.use(errorHandler);
  });
  afterAll(() => log.mockRestore());

  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = gerente;
  });

  const chamar = (metodo, url) => request(app)[metodo](url).send({});

  describe('funcionário de campo (operador com funcionarioId)', () => {
    beforeEach(() => { mockUser = campo; });

    test.each(ROTAS_RESTRITAS)('%s %s -> 403', async (metodo, url) => {
      const res = await chamar(metodo, url);
      expect(res.status).toBe(403);
    });

    test.each(ROTAS_DO_APP)('%s %s -> não bloqueada pelo painel', async (metodo, url) => {
      const res = await chamar(metodo, url);
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });

    describe('GET /api/eventos/:id (app mobile)', () => {
      const url = `/api/eventos/${ID}`;

      test('escalado sem recusar -> recebe o evento', async () => {
        models.Escala.findOne.mockResolvedValue({ id: 'esc-1' });
        models.Evento.findOne.mockResolvedValue({ id: ID, nome: 'Casamento', toJSON() { return this; } });
        const res = await chamar('get', url);
        expect(res.status).toBe(200);
        expect(res.body.data.nome).toBe('Casamento');
        expect(models.Escala.findOne.mock.calls[0][0].where).toMatchObject({
          eventoId: ID, funcionarioId: ID,
        });
      });

      test('não escalado (ou recusou) -> 403 e o evento nem é consultado', async () => {
        models.Escala.findOne.mockResolvedValue(null);
        const res = await chamar('get', url);
        expect(res.status).toBe(403);
        expect(models.Evento.findOne).not.toHaveBeenCalled();
      });
    });

    test('lê o próprio cadastro, mas não o de outro funcionário', async () => {
      models.Funcionario.findOne.mockResolvedValue(null);
      expect((await chamar('get', `/api/funcionarios/${ID}`)).status).toBe(404);
      expect((await chamar('get', `/api/funcionarios/${OUTRO_TENANT}`)).status).toBe(403);
    });
  });

  describe.each([
    ['operador de escritório (sem funcionarioId)', escritorio],
    ['gerente', gerente],
    ['super_admin', superAdmin],
  ])('%s', (_nome, usuario) => {
    beforeEach(() => { mockUser = usuario; });

    test.each([
      ['get', '/api/clientes'],
      ['get', '/api/fornecedores'],
      ['get', '/api/funcionarios'],
      ['get', '/api/dashboard/stats'],
      ['get', '/api/busca?q=maria'],
      ['get', '/api/orcamentos'],
    ])('%s %s não é barrado pelo papel de campo', async (metodo, url) => {
      const res = await chamar(metodo, url);
      expect(res.status).not.toBe(403);
      expect(res.status).not.toBe(401);
    });
  });

  test('operador de escritório e gerente acessam documentos (super_admin segue fora, regra anterior)', async () => {
    for (const u of [escritorio, gerente]) {
      mockUser = u;
      expect((await chamar('get', '/api/documentos')).status).toBe(200);
    }
  });

  describe('UUID malformado em :id -> 400', () => {
    test.each([
      ['get', '/api/clientes/abc'],
      ['get', '/api/fornecedores/1'],
      ['put', '/api/produtos/xyz'],
      ['get', '/api/locais/not-a-uuid'],
      ['delete', '/api/locais/123'],
      ['get', '/api/orcamentos/%27%20OR%201=1'],
      ['patch', '/api/eventos/abc/status'],
      ['get', '/api/eventos/abc/convites'],
      ['get', '/api/escala/evento/abc'],
      ['get', '/api/escala/disponiveis/abc'],
      ['patch', '/api/escala/abc/confirmacao'],
      ['put', '/api/catalogos/abc'],
      ['delete', '/api/lookup/funcoes/abc'],
      ['put', '/api/usuarios/abc'],
      ['delete', '/api/usuarios/abc'],
      ['put', '/api/mesas/abc'],
      ['delete', '/api/documentos/abc'],
    ])('%s %s', async (metodo, url) => {
      const res = await chamar(metodo, url);
      expect(res.status).toBe(400);
    });

    test('a validação vem depois da autenticação/papel (campo continua 403)', async () => {
      mockUser = campo;
      expect((await chamar('get', '/api/clientes/abc')).status).toBe(403);
    });
  });

  describe('FK de outro tenant / malformada', () => {
    test('evento com orcamentoId de outro tenant -> 404', async () => {
      models.Cliente.findOne.mockResolvedValue({ id: ID });
      models.Orcamento.findOne.mockResolvedValue(null);
      const res = await request(app).post('/api/eventos').send({
        clienteId: ID, orcamentoId: OUTRO_TENANT, nome: 'X',
        dataEvento: '2030-01-01T10:00:00Z', horarioTermino: '2030-01-01T12:00:00Z',
      });
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Registro de Orçamento não encontrado/);
      expect(models.Evento.create).not.toHaveBeenCalled();
    });

    test('evento com clienteId malformado -> 400', async () => {
      const res = await request(app).post('/api/eventos').send({
        clienteId: 'x', nome: 'X', dataEvento: '2030-01-01T10:00:00Z', horarioTermino: '2030-01-01T12:00:00Z',
      });
      expect(res.status).toBe(400);
    });

    test('PUT evento com clienteId de outro tenant -> 404', async () => {
      models.Evento.findOne.mockResolvedValue({ id: ID, update: jest.fn() });
      models.Cliente.findOne.mockResolvedValue(null);
      const res = await request(app).put(`/api/eventos/${ID}`).send({ clienteId: OUTRO_TENANT });
      expect(res.status).toBe(404);
    });

    test('orçamento: produto de outro tenant -> 404 e nada é gravado', async () => {
      models.Cliente.findOne.mockResolvedValue({ id: ID });
      models.Produto.findOne.mockResolvedValue(null);
      const res = await request(app).post('/api/orcamentos').send({
        clienteId: ID, nome: 'O', dataEvento: '2030-01-01T10:00:00Z', horarioTermino: '2030-01-01T12:00:00Z',
        produtos: [{ produtoId: OUTRO_TENANT, quantidade: 1, precoUnitario: 1 }],
      });
      expect(res.status).toBe(404);
      expect(models.Orcamento.create).not.toHaveBeenCalled();
      expect(models.OrcamentoProduto.bulkCreate).toBeUndefined();
    });

    test('PUT orçamento com clienteId de outro tenant -> 404', async () => {
      models.Orcamento.findOne.mockResolvedValue({ id: ID, update: jest.fn() });
      models.Cliente.findOne.mockResolvedValue(null);
      const res = await request(app).put(`/api/orcamentos/${ID}`).send({ clienteId: OUTRO_TENANT });
      expect(res.status).toBe(404);
    });

    test('escala: funcionário de outro tenant -> 404', async () => {
      models.Evento.findOne.mockResolvedValue({ id: ID });
      models.Funcionario.findOne.mockResolvedValue(null);
      const res = await request(app).post('/api/escala').send({ eventoId: ID, funcionarioId: OUTRO_TENANT });
      expect(res.status).toBe(404);
    });

    test('produto com categoria de outro tenant -> 404; malformada -> 400', async () => {
      models.CategoriaProduto.findOne.mockResolvedValue(null);
      const body = { nome: 'P', unidadeMedida: 'kg' };
      expect((await request(app).post('/api/produtos').send({ ...body, categoriaId: OUTRO_TENANT })).status).toBe(404);
      expect((await request(app).post('/api/produtos').send({ ...body, categoriaId: 'zzz' })).status).toBe(400);
    });

    test('funcionário com função de outro tenant -> 404', async () => {
      models.Funcao.findOne.mockResolvedValue(null);
      const res = await request(app).post('/api/funcionarios').send({ nome: 'F', funcaoId: OUTRO_TENANT });
      expect(res.status).toBe(404);
    });

    test('usuário com funcionarioId de outro tenant -> 400', async () => {
      models.Funcionario.findOne.mockResolvedValue(null);
      const res = await request(app).post('/api/usuarios').send({
        nome: 'U', email: 'u@x.com', senha: 'senhaforte12', funcionarioId: OUTRO_TENANT,
      });
      expect(res.status).toBe(400);
      expect(models.Usuario.create).not.toHaveBeenCalled();
    });

    test('filtros de query com objeto ou UUID inválido -> 400', async () => {
      expect((await request(app).get('/api/produtos?categoriaId[ne]=1')).status).toBe(400);
      expect((await request(app).get('/api/fornecedores?categoriaId=abc')).status).toBe(400);
      expect((await request(app).get('/api/funcionarios?funcaoId=abc')).status).toBe(400);
      expect((await request(app).get('/api/orcamentos?localId=abc')).status).toBe(400);
      expect((await request(app).get('/api/orcamentos?status[a]=1')).status).toBe(400);
      expect((await request(app).get('/api/eventos?localId=abc')).status).toBe(400);
      expect((await request(app).get('/api/locais?busca[a]=1')).status).toBe(400);
    });
  });

  describe('último gerente / autoexclusão', () => {
    const alvo = (extra = {}) => ({
      id: OUTRO_TENANT, role: 'gerente', status: 'ativo', senha: 'h', email: 'g@x.com',
      update: jest.fn().mockResolvedValue(true), destroy: jest.fn().mockResolvedValue(true), ...extra,
    });

    test('não remove o último gerente ativo -> 409', async () => {
      const u = alvo();
      models.Usuario.findOne.mockResolvedValue(u);
      models.Usuario.count.mockResolvedValue(0);
      const res = await request(app).delete(`/api/usuarios/${OUTRO_TENANT}`);
      expect(res.status).toBe(409);
      expect(u.destroy).not.toHaveBeenCalled();
    });

    test('remove gerente quando há outro ativo -> 200', async () => {
      const u = alvo();
      models.Usuario.findOne.mockResolvedValue(u);
      models.Usuario.count.mockResolvedValue(1);
      const res = await request(app).delete(`/api/usuarios/${OUTRO_TENANT}`);
      expect(res.status).toBe(200);
      expect(u.destroy).toHaveBeenCalled();
    });

    test('não remove a si mesmo -> 409', async () => {
      const u = alvo({ id: gerente.id, role: 'operador' });
      models.Usuario.findOne.mockResolvedValue(u);
      // id de rota precisa ser UUID: o usuário logado tem esse UUID
      mockUser = { ...gerente, id: ID };
      u.id = ID;
      const res = await request(app).delete(`/api/usuarios/${ID}`);
      expect(res.status).toBe(409);
      expect(u.destroy).not.toHaveBeenCalled();
    });

    test('não rebaixa o último gerente ativo -> 409', async () => {
      const u = alvo();
      models.Usuario.findOne.mockResolvedValue(u);
      models.Usuario.count.mockResolvedValue(0);
      const res = await request(app).put(`/api/usuarios/${OUTRO_TENANT}`).send({ role: 'operador' });
      expect(res.status).toBe(409);
      expect(u.update).not.toHaveBeenCalled();
    });

    test('rebaixa gerente quando há outro ativo -> 200', async () => {
      const u = alvo();
      models.Usuario.findOne.mockResolvedValue(u);
      models.Usuario.count.mockResolvedValue(2);
      const res = await request(app).put(`/api/usuarios/${OUTRO_TENANT}`).send({ role: 'operador' });
      expect(res.status).toBe(200);
      expect(u.update).toHaveBeenCalled();
    });

    test('editar o nome do último gerente continua permitido', async () => {
      const u = alvo();
      models.Usuario.findOne.mockResolvedValue(u);
      models.Usuario.count.mockResolvedValue(0);
      const res = await request(app).put(`/api/usuarios/${OUTRO_TENANT}`).send({ nome: 'Novo' });
      expect(res.status).toBe(200);
    });
  });
});
