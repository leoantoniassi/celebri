// ============================================================
// Testes: rotas /api/lgpd (permissão, validação) e termos no primeiro acesso.
// Models mockados; auth, papéis, UUID e controllers reais.
// A prova contra banco real está em lgpdIntegracao.test.js.
// ============================================================
const jwt = require('jsonwebtoken');
const request = require('supertest');
const crypto = require('crypto');

const SEGREDO = 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';
const EMP = '11111111-1111-4111-8111-111111111111';
const ID = '550e8400-e29b-41d4-a716-446655440000';
const FUN = '550e8400-e29b-41d4-a716-446655440001';

const mockContas = {
  gerente: { id: 'gerente', empresaId: EMP, tokenVersion: 0, role: 'gerente', funcionarioId: null },
  operador: { id: 'operador', empresaId: EMP, tokenVersion: 0, role: 'operador', funcionarioId: null },
  campo: { id: 'campo', empresaId: EMP, tokenVersion: 0, role: 'operador', funcionarioId: FUN },
};
const mockTx = { LOCK: {} };
const mockModelo = () => ({
  unscoped: jest.fn().mockReturnThis(), findOne: jest.fn(), findAll: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0),
});
let mockContaFuncionario = null;
let mockPendente = null;
const mockM = {
  Cliente: mockModelo(), Funcionario: mockModelo(), Fornecedor: mockModelo(), Convite: mockModelo(), Evento: mockModelo(),
  Escala: mockModelo(), Orcamento: mockModelo(), Documento: mockModelo(), Funcao: mockModelo(), CategoriaFornecedor: mockModelo(),
  Auditoria: { create: jest.fn().mockResolvedValue({}) },
};

jest.mock('../config/database', () => ({
  transaction: async (cb) => cb({ id: 'tx' }),
  literal: (x) => x,
  addHook: jest.fn(),
}));
jest.mock('../models', () => ({
  ...mockM,
  Usuario: { findOne: jest.fn(), findAll: jest.fn() },
  Empresa: { findOne: jest.fn(), findAll: jest.fn() },
}));
jest.mock('../services/emailService', () => ({}));

let app;
const token = (id) => jwt.sign({ id, role: mockContas[id].role, empresaId: EMP, tv: 0, funcionarioId: mockContas[id].funcionarioId }, SEGREDO, { algorithm: 'HS256' });
const clienteRow = (extra = {}) => ({
  id: ID, empresaId: EMP, nome: 'Maria', anonimizadoEm: null, deletadoEm: null, update: jest.fn().mockResolvedValue(true),
  get() { return { id: ID, nome: 'Maria', email: 'm@x.com', rgCpf: '1', telefone: '2', senha: 'NAO', token: 'NAO' }; }, ...extra,
});

beforeAll(() => {
  process.env.JWT_SECRET = SEGREDO;
  const express = require('express');
  app = express();
  app.use(express.json());
  app.use('/api/lgpd', require('../routes/lgpd.routes'));
  app.use('/api/auth', require('../routes/auth.routes'));
  app.use((err, _req, res, _next) => res.status(500).json({ success: false, message: err.message }));
});

beforeEach(() => {
  const { Usuario, Empresa } = require('../models');
  mockContaFuncionario = null;
  mockPendente = null;
  Usuario.findOne.mockImplementation(async ({ where }) => {
    if (where.id) return mockContas[where.id] || null;
    if (where.funcionarioId) return mockContaFuncionario;
    return mockPendente;
  });
  Empresa.findOne.mockResolvedValue({ id: 'emp-1', slug: 'b', status: 'ativo', nomeFantasia: 'B' });
  mockM.Auditoria.create.mockResolvedValue({});
  Object.values(mockM).forEach((m) => {
    if (m.unscoped) {
      m.unscoped.mockReturnThis();
      m.findAll.mockResolvedValue([]);
      m.count.mockResolvedValue(0);
      m.findOne.mockResolvedValue(null);
    }
  });
  mockM.Funcionario.findOne.mockResolvedValue({ id: FUN }); // a conta de campo ainda tem cadastro ativo
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

const auth = (r, quem) => r.set('Authorization', `Bearer ${token(quem)}`);
const exportar = (quem, tipo = 'cliente', id = ID) => auth(request(app).get(`/api/lgpd/titulares/${tipo}/${id}/exportar`), quem);
const anonimizar = (quem, body, tipo = 'cliente', id = ID) => auth(request(app).post(`/api/lgpd/titulares/${tipo}/${id}/anonimizar`), quem).send(body);

describe('/api/lgpd: acesso', () => {
  test('sem token: 401', async () => {
    expect((await request(app).get(`/api/lgpd/titulares/cliente/${ID}/exportar`)).status).toBe(401);
    expect((await request(app).post(`/api/lgpd/titulares/cliente/${ID}/anonimizar`).send({ confirmacao: true })).status).toBe(401);
  });

  test.each(['campo', 'operador'])('%s não exporta nem anonimiza (403) e nada é consultado', async (quem) => {
    expect((await exportar(quem)).status).toBe(403);
    expect((await anonimizar(quem, { confirmacao: true })).status).toBe(403);
    expect(mockM.Cliente.findOne).not.toHaveBeenCalled();
  });

  test('UUID malformado: 400; tipo inválido: 400', async () => {
    expect((await exportar('gerente', 'cliente', 'nao-uuid')).status).toBe(400);
    expect((await exportar('gerente', 'aluno')).status).toBe(400);
    expect((await anonimizar('gerente', { confirmacao: true }, 'aluno')).status).toBe(400);
  });
});

describe('/api/lgpd: exportar', () => {
  test('titular inexistente no tenant: 404', async () => {
    expect((await exportar('gerente')).status).toBe(404);
  });

  test('devolve anexo JSON só com os campos permitidos e audita sem dados pessoais', async () => {
    mockM.Cliente.findOne.mockResolvedValue(clienteRow());
    const res = await exportar('gerente');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toBe(`attachment; filename="titular-cliente-${ID}.json"`);
    expect(res.headers['cache-control']).toMatch(/no-store/);
    expect(res.body.data.dados.nome).toBe('Maria');
    expect(JSON.stringify(res.body)).not.toMatch(/NAO/);
    const aud = mockM.Auditoria.create.mock.calls[0][0];
    expect(aud).toMatchObject({ acao: 'lgpd.titular.exportado', entidade: 'cliente', entidadeId: ID, usuarioId: 'gerente' });
    expect(JSON.stringify(aud)).not.toContain('Maria');
  });
});

describe('/api/lgpd: anonimizar', () => {
  test.each([[{}], [{ confirmacao: 'true' }], [{ confirmacao: false }]])('sem confirmacao:true (%j): 400 e nada consultado', async (body) => {
    const res = await anonimizar('gerente', body);
    expect(res.status).toBe(400);
    expect(mockM.Cliente.findOne).not.toHaveBeenCalled();
  });

  test('inexistente: 404; já anonimizado: 409', async () => {
    expect((await anonimizar('gerente', { confirmacao: true })).status).toBe(404);
    mockM.Cliente.findOne.mockResolvedValue(clienteRow({ anonimizadoEm: new Date() }));
    expect((await anonimizar('gerente', { confirmacao: true })).status).toBe(409);
  });

  test('evento futuro ativo vinculado: 409 e nenhum update', async () => {
    const row = clienteRow();
    mockM.Cliente.findOne.mockResolvedValue(row);
    mockM.Evento.count.mockResolvedValue(1);
    const res = await anonimizar('gerente', { confirmacao: true });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/evento/i);
    expect(row.update).not.toHaveBeenCalled();
    expect(mockM.Auditoria.create).not.toHaveBeenCalled();
  });

  test('cliente: substitui campos pessoais dentro da transação, mantém vínculos e audita', async () => {
    const row = clienteRow();
    mockM.Cliente.findOne.mockResolvedValue(row);
    const res = await anonimizar('gerente', { confirmacao: true });
    expect(res.status).toBe(200);
    const [campos, opcoes] = row.update.mock.calls[0];
    expect(campos).toMatchObject({ nome: 'Titular anonimizado', email: null, telefoneResidencial: null });
    expect(campos.rgCpf).toMatch(/^ANON-[0-9a-f]{12}$/);
    expect(campos.anonimizadoEm).toBeInstanceOf(Date);
    expect(campos.deletadoEm).toBeInstanceOf(Date);
    expect(opcoes.transaction).toEqual({ id: 'tx' });
    expect(mockM.Cliente.findOne.mock.calls[0][0].transaction).toEqual({ id: 'tx' });
    expect(mockM.Auditoria.create).toHaveBeenCalledWith(expect.objectContaining({ acao: 'lgpd.titular.anonimizado', entidade: 'cliente', entidadeId: ID }));
  });

  test('cada tipo usa campos próprios: convidado troca o token do QR; fornecedor troca e-mail e CNPJ', async () => {
    const convite = clienteRow({ eventoId: ID });
    mockM.Convite.findOne.mockResolvedValue(convite);
    expect((await anonimizar('gerente', { confirmacao: true }, 'convidado')).status).toBe(200);
    const [c] = convite.update.mock.calls[0];
    expect(c).toMatchObject({ nome: 'Titular anonimizado', telefone: null });
    expect(c.token).toMatch(/^[0-9a-f]{64}$/);
    expect(c.deletadoEm).toBeUndefined(); // convite não sai da portaria por soft delete

    const forn = clienteRow();
    mockM.Fornecedor.findOne.mockResolvedValue(forn);
    expect((await anonimizar('gerente', { confirmacao: true }, 'fornecedor')).status).toBe(200);
    const [f] = forn.update.mock.calls[0];
    expect(f.email).toMatch(/^anon-[0-9a-f]{16}@anonimizado\.invalid$/);
    expect(f.cnpj).toMatch(/^ANON-/);
  });

  test('funcionário com conta de gerente: 409; escalado em evento futuro: 409; conta de campo é anonimizada', async () => {
    const fun = clienteRow();
    mockM.Funcionario.findOne.mockResolvedValue(fun);
    const conta = { id: 'c1', role: 'gerente', tokenVersion: 2, update: jest.fn().mockResolvedValue(true) };
    mockContaFuncionario = conta;
    expect((await anonimizar('gerente', { confirmacao: true }, 'funcionario')).status).toBe(409);

    conta.role = 'operador';
    mockM.Escala.findAll.mockResolvedValue([{ eventoId: ID }]);
    mockM.Evento.count.mockResolvedValue(2);
    expect((await anonimizar('gerente', { confirmacao: true }, 'funcionario')).status).toBe(409);

    mockM.Evento.count.mockResolvedValue(0);
    expect((await anonimizar('gerente', { confirmacao: true }, 'funcionario')).status).toBe(200);
    expect(conta.update).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Titular anonimizado', senha: null, tokenVersion: 3 }), { transaction: { id: 'tx' } });
  });
});

describe('Termos no primeiro acesso do app mobile', () => {
  const hash = (c) => crypto.createHash('sha256').update(c).digest('hex');
  const pendente = () => ({
    id: 'u1', nome: 'Ana', email: 'ana@teste.com', role: 'operador', empresaId: 'emp-1', funcionarioId: null,
    codigoHash: hash('123456'), codigoExpiracao: new Date(Date.now() + 60000), codigoTentativas: 0, update: jest.fn(),
  });
  const confirmar = (body) => request(app).post('/api/auth/primeiro-acesso/confirmar').set('X-Tenant-Slug', 'b')
    .send({ email: 'ana@teste.com', senha: 'senha123456', codigo: '123456', ...body });

  test('sem aceiteTermos o app mobile continua funcionando e nada é gravado', async () => {
    const u = pendente();
    mockPendente = u;
    const res = await confirmar({});
    expect(res.status).toBe(200);
    expect(u.update.mock.calls[0][0]).not.toHaveProperty('termosAceitosEm');
  });

  test('com aceiteTermos:true grava data e versão', async () => {
    const u = pendente();
    mockPendente = u;
    const res = await confirmar({ aceiteTermos: true });
    expect(res.status).toBe(200);
    expect(u.update.mock.calls[0][0]).toMatchObject({ termosAceitosEm: expect.any(Date), termosVersao: expect.any(String) });
  });

  test('aceiteTermos diferente de true (string) não grava', async () => {
    const u = pendente();
    mockPendente = u;
    await confirmar({ aceiteTermos: 'true' });
    expect(u.update.mock.calls[0][0]).not.toHaveProperty('termosAceitosEm');
  });
});
