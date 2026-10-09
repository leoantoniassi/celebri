// ============================================================
// Testes: ramos restantes da fase 5 (seguranca.js, convite admin, catálogo)
// ============================================================
jest.mock('../models', () => ({
  Evento: { findOne: jest.fn() },
  Convite: { findOne: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  Catalogo: { create: jest.fn(), findOne: jest.fn(), findAll: jest.fn() },
}));
jest.mock('../utils/brand', () => ({ obterMarca: jest.fn().mockResolvedValue({ nomeFantasia: 'Buffet' }) }));

const { Evento, Convite, Catalogo } = require('../models');
const seg = require('../config/seguranca');
const convites = require('../controllers/conviteController');
const catalogos = require('../controllers/catalogoController');
const { validarUrlHttp } = require('../utils/validators');

const EV = '11111111-1111-4111-8111-111111111111';
const CV = '22222222-2222-4222-8222-222222222222';

const resMock = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('config/seguranca', () => {
  const env = process.env.JWT_SECRET;
  beforeAll(() => { process.env.JWT_SECRET = 'x'.repeat(40); });
  afterAll(() => { process.env.JWT_SECRET = env; });

  test('exigirJwtSecret: ignora em test, falha com segredo ausente/curto e aceita forte', () => {
    expect(() => seg.exigirJwtSecret({ NODE_ENV: 'test' })).not.toThrow();
    expect(() => seg.exigirJwtSecret({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() => seg.exigirJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'curto' })).toThrow(/mínimo 32/);
    expect(() => seg.exigirJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'y'.repeat(32) })).not.toThrow();
  });

  test('assinarToken/verificarToken: HS256 com tv, e rejeita alg=none', () => {
    const token = seg.assinarToken({ id: 'u', email: 'a@b.c', role: 'gerente', empresaId: 'e', tokenVersion: 3 });
    expect(seg.verificarToken(token)).toMatchObject({ id: 'u', tv: 3 });
    const semTv = seg.verificarToken(seg.assinarToken({ id: 'u' }));
    expect(semTv.tv).toBe(0);
    const none = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url')}.${Buffer.from('{"id":"u"}').toString('base64url')}.`;
    expect(() => seg.verificarToken(none)).toThrow();
  });

  test('lerTrustProxy', () => {
    expect(seg.lerTrustProxy('')).toBe(false);
    expect(seg.lerTrustProxy(undefined)).toBe(false);
    expect(seg.lerTrustProxy('false')).toBe(false);
    expect(seg.lerTrustProxy('0')).toBe(false);
    expect(seg.lerTrustProxy('true')).toBe(1);
    expect(seg.lerTrustProxy('2')).toBe(2);
    expect(seg.lerTrustProxy('loopback')).toBe('loopback');
  });

  test('revogarSessoes incrementa tokenVersion', () => {
    expect(seg.revogarSessoes({ tokenVersion: 4 })).toEqual({ tokenVersion: 5 });
    expect(seg.revogarSessoes({})).toEqual({ tokenVersion: 1 });
  });

  test('urlBaseFrontend sem FRONTEND_URL usa localhost', () => {
    expect(seg.urlBaseFrontend({})).toBe('http://localhost:5173');
  });
});

describe('validarUrlHttp (ramos extras)', () => {
  test('rejeita tipos não-string, "https:///x" e hostname vazio', () => {
    expect(validarUrlHttp(123)).toBeNull();
    expect(validarUrlHttp('https:///x')).toBeNull();
    expect(validarUrlHttp('http:\\\\x')).toBeNull();
    expect(validarUrlHttp('https://[::1')).toBeNull();
  });
});

describe('conviteController (painel)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'https://app.exemplo.com';
  });
  const evento = { id: EV, nome: 'Festa', dataEvento: '2026-10-01T20:00:00Z', qtdAvulsos: 2, usaConvites: true, update: jest.fn() };

  test('listar: id inválido 404; evento inexistente 404; ok devolve link e resumo', async () => {
    let res = resMock();
    await convites.listar({ params: { eventoId: 'x' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);

    Evento.findOne.mockResolvedValueOnce(null);
    res = resMock();
    await convites.listar({ params: { eventoId: EV } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);

    Evento.findOne.mockResolvedValueOnce(evento);
    Convite.findAll.mockResolvedValue([{ token: 'a'.repeat(32), qtdPessoas: 2, qtdEntrou: 1, toJSON() { return { nome: 'Ana' }; } }]);
    res = resMock();
    await convites.listar({ params: { eventoId: EV } }, res, jest.fn());
    const body = res.json.mock.calls[0][0];
    expect(body.data[0].link).toBe(`https://app.exemplo.com/api/convites/publico/${'a'.repeat(32)}`);
    expect(body.resumo).toMatchObject({ pessoasConvidadas: 2, entraramComConvite: 1, totalPresentes: 3 });
  });

  test('criar: valida nome, telefone, qtd; sucesso gera token de 32 hex', async () => {
    Evento.findOne.mockResolvedValue(evento);
    const casos = [
      [{ nome: '  ' }, /nome/],
      [{ nome: 'x'.repeat(151) }, /150/],
      [{ nome: 'Ana', telefone: '1'.repeat(21) }, /Telefone/],
      [{ nome: 'Ana', qtdPessoas: 0 }, /quantidade/],
      [{ nome: 'Ana', qtdPessoas: 51 }, /quantidade/],
      [{ nome: 'Ana', qtdPessoas: 1.5 }, /quantidade/],
    ];
    for (const [body, msg] of casos) {
      const res = resMock();
      await convites.criar({ params: { eventoId: EV }, body }, res, jest.fn());
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json.mock.calls[0][0].message).toMatch(msg);
    }
    expect(Convite.create).not.toHaveBeenCalled();

    Convite.create.mockImplementation(async (d) => ({ ...d, toJSON() { return d; } }));
    const res = resMock();
    await convites.criar({ params: { eventoId: EV }, body: { nome: 'Ana', telefone: '' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);
    expect(Convite.create.mock.calls[0][0].token).toMatch(/^[a-f0-9]{32}$/);
    expect(Convite.create.mock.calls[0][0]).toMatchObject({ telefone: null, qtdPessoas: 1, eventoId: EV });
  });

  test('criar repassa erro inesperado ao next', async () => {
    Evento.findOne.mockRejectedValue(new Error('db'));
    const next = jest.fn();
    await convites.criar({ params: { eventoId: EV }, body: { nome: 'A' } }, resMock(), next);
    expect(next).toHaveBeenCalled();
  });

  test('configurarPortaria exige booleano', async () => {
    Evento.findOne.mockResolvedValue({ ...evento, update: jest.fn() });
    Convite.findAll.mockResolvedValue([]);
    let res = resMock();
    await convites.configurarPortaria({ params: { eventoId: EV }, body: { usaConvites: 'sim' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    res = resMock();
    await convites.configurarPortaria({ params: { eventoId: EV }, body: { usaConvites: false } }, res, jest.fn());
    expect(res.json.mock.calls[0][0].success).toBe(true);
  });

  test('atualizar/remover/whatsapp: 404, validação e sucesso', async () => {
    let res = resMock();
    await convites.atualizar({ params: { id: 'x' }, body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);

    Convite.findOne.mockResolvedValueOnce(null);
    res = resMock();
    await convites.remover({ params: { id: CV } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);

    const conv = { id: CV, eventoId: EV, nome: 'Ana', telefone: '11999998888', qtdPessoas: 3, token: 'b'.repeat(32), update: jest.fn() };
    Convite.findOne.mockResolvedValue(conv);
    res = resMock();
    await convites.atualizar({ params: { id: CV }, body: { qtdPessoas: 99 } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    res = resMock();
    await convites.atualizar({ params: { id: CV }, body: { nome: 'Bia' } }, res, jest.fn());
    expect(conv.update).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Bia' }));
    res = resMock();
    await convites.remover({ params: { id: CV } }, res, jest.fn());
    expect(conv.update).toHaveBeenCalledWith({ deletadoEm: expect.any(Date) });

    Evento.findOne.mockResolvedValue(evento);
    res = resMock();
    await convites.whatsapp({ params: { id: CV } }, res, jest.fn());
    const link = res.json.mock.calls[0][0].data.link;
    expect(link).toMatch(/^https:\/\/wa\.me\//);
    expect(decodeURIComponent(link)).toContain('(3 pessoas)');

    Convite.findOne.mockResolvedValue({ ...conv, telefone: null });
    res = resMock();
    await convites.whatsapp({ params: { id: CV } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe('catalogoController (ramos restantes)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listar, criar sem título, criar válido, erro -> next', async () => {
    Catalogo.findAll.mockResolvedValue([{ id: 1 }]);
    let res = resMock();
    await catalogos.listar({}, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 1 }] });

    res = resMock();
    await catalogos.criar({ body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);

    Catalogo.create.mockResolvedValue({ id: 2 });
    res = resMock();
    await catalogos.criar({ body: { titulo: 'T', precoBase: '10.5', urlExterna: ' https://x.com/a ' } }, res, jest.fn());
    expect(Catalogo.create).toHaveBeenCalledWith({ titulo: 'T', descricao: null, precoBase: 10.5, urlExterna: 'https://x.com/a' });
    expect(res.status).toHaveBeenCalledWith(201);

    Catalogo.findAll.mockRejectedValue(new Error('x'));
    const next = jest.fn();
    await catalogos.listar({}, resMock(), next);
    expect(next).toHaveBeenCalled();
  });

  test('atualizar: 404, mantém campos, converte ativo, limpa url; remover', async () => {
    Catalogo.findOne.mockResolvedValueOnce(null);
    let res = resMock();
    await catalogos.atualizar({ params: { id: 'a' }, body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);

    const cat = { titulo: 'Velho', descricao: 'd', precoBase: 5, urlExterna: 'https://a.com', ativo: true, update: jest.fn() };
    Catalogo.findOne.mockResolvedValue(cat);
    res = resMock();
    await catalogos.atualizar({ params: { id: 'a' }, body: { ativo: 'false', precoBase: '', urlExterna: '' } }, res, jest.fn());
    expect(cat.update).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Velho', precoBase: null, urlExterna: null, ativo: false }));

    cat.update.mockClear();
    res = resMock();
    await catalogos.atualizar({ params: { id: 'a' }, body: { titulo: 'Novo', descricao: 'n', precoBase: '7' } }, res, jest.fn());
    expect(cat.update).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Novo', descricao: 'n', precoBase: 7, urlExterna: 'https://a.com', ativo: true }));

    res = resMock();
    await catalogos.atualizar({ params: { id: 'a' }, body: { urlExterna: 'javascript:1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);

    res = resMock();
    await catalogos.remover({ params: { id: 'a' } }, res, jest.fn());
    expect(cat.update).toHaveBeenLastCalledWith({ deletadoEm: expect.any(Date) });

    Catalogo.findOne.mockResolvedValueOnce(null);
    res = resMock();
    await catalogos.remover({ params: { id: 'a' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
