// ============================================================
// Integração LGPD (PostgreSQL real): exportar/anonimizar titulares, auditoria,
// aceite de termos e purge de retenção. Pulada sem banco (ver jest.globalSetup).
// ============================================================
require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcryptjs');

const sequelize = require('../config/database');
const {
  Empresa, Usuario, Cliente, Evento, Local, Funcao, Funcionario, Fornecedor, CategoriaFornecedor, Convite, Escala, Auditoria,
} = require('../models');
const { semEscopo } = require('../utils/tenantContext');
const { executarRetencao } = require('../services/retencaoService');
const app = require('../app');

const SENHA = 'senha-de-teste-123';
const bancoDisponivel = process.env.BANCO_DISPONIVEL === '1';
const cenario = () => (bancoDisponivel ? test : test.skip);
const EMAIL_PESSOAL = 'maria.pessoal@exemplo.com';
const CPF_PESSOAL = '123.456.789-09';

let A = null;
let B = null;

const TABELAS = [
  ['auditoria', 'aud_emp_id'], ['escala', 'esc_emp_id'], ['convites', 'cnv_emp_id'], ['eventos', 'evt_emp_id'],
  ['clientes', 'cli_emp_id'], ['fornecedores', 'for_emp_id'], ['categorias_fornecedor', 'caf_emp_id'],
  ['usuarios', 'usr_emp_id'], ['funcionarios', 'fun_emp_id'], ['funcoes', 'fnc_emp_id'], ['locais', 'loc_emp_id'],
];

async function limpar() {
  const empresas = await sequelize.query("SELECT emp_id FROM empresas WHERE emp_slug LIKE 'teste-lgpd-%'", { type: 'SELECT' });
  for (const { emp_id: id } of empresas) {
    for (const [tabela, col] of TABELAS) {
      // eslint-disable-next-line no-await-in-loop
      await sequelize.query(`DELETE FROM ${tabela} WHERE ${col} = :id`, { replacements: { id } });
    }
    // eslint-disable-next-line no-await-in-loop
    await sequelize.query('DELETE FROM empresas WHERE emp_id = :id', { replacements: { id } });
  }
}

async function criarTenant(s) {
  return semEscopo(async () => {
    const empresa = await Empresa.create({ nome: `Buffet ${s}`, nomeFantasia: `Buffet ${s}`, slug: `teste-lgpd-${s.toLowerCase()}` });
    const empresaId = empresa.id;
    const gerente = await Usuario.create({
      nome: `Gerente ${s}`, email: `gerente-${s.toLowerCase()}@teste-lgpd.com`, senha: await bcrypt.hash(SENHA, 10),
      role: 'gerente', status: 'ativo', empresaId,
    });
    const local = await Local.create({
      nome: `Salao ${s}`, logradouro: 'Rua', numero: '1', bairro: 'Centro', cidade: 'SP', estado: 'SP', cep: '01000-000', empresaId,
    });
    const funcao = await Funcao.create({ nome: `Garcom ${s}`, empresaId });
    const categoria = await CategoriaFornecedor.create({ nome: `Cat ${s}`, empresaId });
    const cliente = await Cliente.create({ nome: `Maria ${s}`, email: `${s}${EMAIL_PESSOAL}`, rgCpf: `${CPF_PESSOAL}-${s}`, telefone: '11988887777', empresaId });
    const evento = await Evento.create({
      nome: `Festa ${s}`, clienteId: cliente.id, localId: local.id, empresaId, status: 'pendente',
      dataEvento: new Date('2099-01-15T18:00:00'), horarioTermino: new Date('2099-01-15T23:00:00'),
    });
    const funcionario = await Funcionario.create({ nome: `Joao ${s}`, email: `joao-${s}@exemplo.com`, telefone: '11977776666', funcaoId: funcao.id, empresaId });
    const fornecedor = await Fornecedor.create({ nome: `Forn ${s}`, email: `forn-${s}@exemplo.com`, cnpj: `11.222.333/0001-${s === 'A' ? '81' : '82'}`, telefone: '1133334444', categoriaId: categoria.id, empresaId });
    const convite = await Convite.create({ nome: `Convidado ${s}`, telefone: '11966665555', eventoId: evento.id, token: `tok${s}`.padEnd(32, 'x'), empresaId });
    return { empresa, gerente, local, funcao, categoria, cliente, evento, funcionario, fornecedor, convite };
  });
}

const logar = (t) => request(app).post('/api/auth/login').set('X-Tenant-Slug', t.empresa.slug)
  .send({ email: t.gerente.email, senha: SENHA });

beforeAll(async () => {
  if (!bancoDisponivel) return;
  await sequelize.authenticate();
  await limpar();
  A = await criarTenant('A');
  B = await criarTenant('B');
  A.token = (await logar(A)).body.token;
  B.token = (await logar(B)).body.token;
}, 30000);

afterAll(async () => {
  if (bancoDisponivel) await limpar();
  await sequelize.close();
});

const GET = (url, token) => request(app).get(url).set('Authorization', `Bearer ${token}`);
const POST = (url, token, body) => request(app).post(url).set('Authorization', `Bearer ${token}`).send(body);
const auditorias = (empresaId, acao) => semEscopo(() => Auditoria.findAll({ where: { empresaId, acao } }));

describe('LGPD (banco real)', () => {
  cenario()('login ok e falha geram auditoria sem e-mail', async () => {
    await request(app).post('/api/auth/login').set('X-Tenant-Slug', A.empresa.slug).send({ email: A.gerente.email, senha: 'errada-errada-1' });
    const ok = await auditorias(A.empresa.id, 'auth.login.ok');
    const falha = await auditorias(A.empresa.id, 'auth.login.falha');
    expect(ok.length).toBeGreaterThanOrEqual(1);
    expect(falha.length).toBeGreaterThanOrEqual(1);
    expect(ok[0].usuarioId).toBe(A.gerente.id);
    expect(JSON.stringify([...ok, ...falha].map((a) => a.toJSON()))).not.toContain('@');
  });

  describe('exportar', () => {
    cenario()('cliente: devolve dados, eventos e anexo, sem vazar outro tenant', async () => {
      const res = await GET(`/api/lgpd/titulares/cliente/${A.cliente.id}/exportar`, A.token);
      expect(res.status).toBe(200);
      expect(res.headers['content-disposition']).toMatch(/^attachment; filename=/);
      expect(res.body.data.dados.rgCpf).toBe(A.cliente.rgCpf);
      expect(res.body.data.relacionados.eventos.map((e) => e.id)).toEqual([A.evento.id]);
      expect(JSON.stringify(res.body)).not.toContain(B.cliente.rgCpf);
      const logs = await auditorias(A.empresa.id, 'lgpd.titular.exportado');
      expect(logs[0].entidadeId).toBe(A.cliente.id);
    });

    cenario()('funcionario, convidado e fornecedor exportam sem hash/token', async () => {
      const f = await GET(`/api/lgpd/titulares/funcionario/${A.funcionario.id}/exportar`, A.token);
      const c = await GET(`/api/lgpd/titulares/convidado/${A.convite.id}/exportar`, A.token);
      const o = await GET(`/api/lgpd/titulares/fornecedor/${A.fornecedor.id}/exportar`, A.token);
      [f, c, o].forEach((r) => expect(r.status).toBe(200));
      expect(f.body.data.dados.nome).toBe(A.funcionario.nome);
      expect(c.body.data.dados.nome).toBe(A.convite.nome);
      expect(c.body.data.relacionados.evento.id).toBe(A.evento.id);
      expect(o.body.data.relacionados.categoria.nome).toBe(A.categoria.nome);
      const txt = JSON.stringify([f.body, c.body, o.body]);
      expect(txt).not.toMatch(/"(token|senha|hash|conviteToken|resetToken)"/i);
      expect(txt).not.toContain(A.convite.token);
    });

    cenario()('titular de outro tenant é 404', async () => {
      const res = await GET(`/api/lgpd/titulares/cliente/${B.cliente.id}/exportar`, A.token);
      expect(res.status).toBe(404);
    });
  });

  describe('anonimizar', () => {
    cenario()('exige confirmacao:true', async () => {
      const res = await POST(`/api/lgpd/titulares/fornecedor/${A.fornecedor.id}/anonimizar`, A.token, {});
      expect(res.status).toBe(400);
      expect((await Fornecedor.unscoped().findOne({ where: { id: A.fornecedor.id } })).anonimizadoEm).toBeNull();
    });

    cenario()('tipo inválido é 400; outro tenant é 404 e nada muda', async () => {
      expect((await POST(`/api/lgpd/titulares/aluno/${A.cliente.id}/anonimizar`, A.token, { confirmacao: true })).status).toBe(400);
      const res = await POST(`/api/lgpd/titulares/fornecedor/${B.fornecedor.id}/anonimizar`, A.token, { confirmacao: true });
      expect(res.status).toBe(404);
      const intacto = await semEscopo(() => Fornecedor.unscoped().findOne({ where: { id: B.fornecedor.id } }));
      expect(intacto.nome).toBe(B.fornecedor.nome);
    });

    cenario()('cliente/convidado/funcionário com evento futuro ativo: 409 e dados intactos', async () => {
      await Escala.create({ eventoId: A.evento.id, funcionarioId: A.funcionario.id, empresaId: A.empresa.id });
      for (const [tipo, id] of [['cliente', A.cliente.id], ['convidado', A.convite.id], ['funcionario', A.funcionario.id]]) {
        // eslint-disable-next-line no-await-in-loop
        const res = await POST(`/api/lgpd/titulares/${tipo}/${id}/anonimizar`, A.token, { confirmacao: true });
        expect([tipo, res.status]).toEqual([tipo, 409]);
        expect(res.body.message).toMatch(/evento/i);
      }
      const cliente = await Cliente.unscoped().findOne({ where: { id: A.cliente.id } });
      expect(cliente.nome).toBe(A.cliente.nome);
      expect(cliente.anonimizadoEm).toBeNull();
    });

    cenario()('fornecedor: anonimiza, preserva a linha, audita e não permite repetir', async () => {
      const url = `/api/lgpd/titulares/fornecedor/${A.fornecedor.id}/anonimizar`;
      const res = await POST(url, A.token, { confirmacao: true });
      expect(res.status).toBe(200);
      const f = await Fornecedor.unscoped().findOne({ where: { id: A.fornecedor.id } });
      expect(f.nome).toBe('Titular anonimizado');
      expect(f.email).toMatch(/@anonimizado\.invalid$/);
      expect(f.cnpj).toMatch(/^ANON-/);
      expect(f.anonimizadoEm).not.toBeNull();
      expect((await POST(url, A.token, { confirmacao: true })).status).toBe(409);
      const logs = await auditorias(A.empresa.id, 'lgpd.titular.anonimizado');
      expect(logs.map((l) => l.entidadeId)).toContain(A.fornecedor.id);
      expect(JSON.stringify(logs.map((l) => l.detalhes))).not.toContain('Forn');
    });

    cenario()('com evento cancelado, cliente/convidado/funcionário são anonimizados e vínculos mantidos', async () => {
      await semEscopo(() => Evento.update({ status: 'cancelado' }, { where: { id: A.evento.id } }));
      const conta = await semEscopo(() => Usuario.create({
        nome: 'Joao Conta', email: 'joao-conta@exemplo.com', senha: 'hash', role: 'operador', status: 'ativo',
        empresaId: A.empresa.id, funcionarioId: A.funcionario.id,
      }));

      const rC = await POST(`/api/lgpd/titulares/cliente/${A.cliente.id}/anonimizar`, A.token, { confirmacao: true });
      const rV = await POST(`/api/lgpd/titulares/convidado/${A.convite.id}/anonimizar`, A.token, { confirmacao: true });
      const rF = await POST(`/api/lgpd/titulares/funcionario/${A.funcionario.id}/anonimizar`, A.token, { confirmacao: true });
      expect([rC.status, rV.status, rF.status]).toEqual([200, 200, 200]);

      const cliente = await Cliente.unscoped().findOne({ where: { id: A.cliente.id } });
      expect(cliente).toMatchObject({ nome: 'Titular anonimizado', email: null });
      expect(cliente.rgCpf).toMatch(/^ANON-/);
      const evento = await Evento.unscoped().findOne({ where: { id: A.evento.id } });
      expect(evento.clienteId).toBe(A.cliente.id); // histórico financeiro preservado

      const convite = await Convite.unscoped().findOne({ where: { id: A.convite.id } });
      expect(convite).toMatchObject({ nome: 'Titular anonimizado', telefone: null });
      expect(convite.token).not.toBe(A.convite.token);

      const fun = await Funcionario.unscoped().findOne({ where: { id: A.funcionario.id } });
      expect(fun).toMatchObject({ nome: 'Titular anonimizado', email: null, telefone: null });
      const contaDepois = await semEscopo(() => Usuario.findOne({ where: { id: conta.id }, ignoraTenant: true }));
      expect(contaDepois.nome).toBe('Titular anonimizado');
      expect(contaDepois.senha).toBeNull();
      expect(contaDepois.tokenVersion).toBe(1);
    });
  });

  describe('termos de uso (convite web)', () => {
    cenario()('definir-senha exige aceiteTermos e grava data e versão', async () => {
      const crypto = require('crypto');
      const token = crypto.randomBytes(32).toString('hex');
      const u = await semEscopo(() => Usuario.create({
        nome: 'Novo', email: 'novo-lgpd@exemplo.com', senha: null, role: 'operador', status: 'pendente', empresaId: A.empresa.id,
        conviteToken: crypto.createHash('sha256').update(token).digest('hex'), conviteExpiracao: new Date(Date.now() + 3600000),
      }));
      const sem = await request(app).post('/api/usuarios/definir-senha').send({ token, senha: 'SenhaForte12345' });
      expect(sem.status).toBe(400);
      const ok = await request(app).post('/api/usuarios/definir-senha').send({ token, senha: 'SenhaForte12345', aceiteTermos: true });
      expect(ok.status).toBe(200);
      const depois = await semEscopo(() => Usuario.findOne({ where: { id: u.id }, ignoraTenant: true }));
      expect(depois.termosVersao).toBeTruthy();
      expect(depois.termosAceitosEm).toBeInstanceOf(Date);
    });
  });

  describe('purge de retenção', () => {
    cenario()('dry-run não altera; executar anonimiza só o vencido', async () => {
      const longe = new Date(Date.now() - 3000 * 24 * 3600 * 1000);
      const velho = await semEscopo(() => Cliente.create({ nome: 'Velho Excluido', rgCpf: 'RET-VELHO-1', telefone: '11911112222', empresaId: B.empresa.id, deletadoEm: longe }));
      const recente = await semEscopo(() => Cliente.create({ nome: 'Recente Excluido', rgCpf: 'RET-RECENTE-1', telefone: '11911113333', empresaId: B.empresa.id, deletadoEm: new Date() }));
      const config = { retencaoDias: 1825, retencaoConvitesDias: 180 };
      const eventoAntigo = await semEscopo(() => Evento.create({
        nome: 'Festa antiga', clienteId: B.cliente.id, localId: B.local.id, empresaId: B.empresa.id, status: 'concluido',
        dataEvento: new Date(Date.now() - 400 * 24 * 3600 * 1000), horarioTermino: new Date(Date.now() - 399 * 24 * 3600 * 1000),
      }));
      const conviteAntigo = await semEscopo(() => Convite.create({
        nome: 'Convidado antigo', telefone: '11900001111', eventoId: eventoAntigo.id, token: 'antigo'.padEnd(32, 'z'), empresaId: B.empresa.id,
      }));

      const seco = await executarRetencao({ dryRun: true, config });
      expect(seco.candidatos).toBeGreaterThanOrEqual(1);
      expect((await Cliente.unscoped().findOne({ where: { id: velho.id } })).nome).toBe('Velho Excluido');

      const real = await executarRetencao({ dryRun: false, config });
      expect(real.anonimizados).toBeGreaterThanOrEqual(1);
      expect((await Cliente.unscoped().findOne({ where: { id: velho.id } })).nome).toBe('Titular anonimizado');
      expect((await Cliente.unscoped().findOne({ where: { id: recente.id } })).nome).toBe('Recente Excluido');
      expect((await Convite.unscoped().findOne({ where: { id: conviteAntigo.id } })).nome).toBe('Titular anonimizado');
      expect((await Convite.unscoped().findOne({ where: { id: B.convite.id } })).nome).toBe(B.convite.nome); // evento futuro: mantido
      const logs = await auditorias(B.empresa.id, 'retencao.titular.anonimizado');
      expect(logs.map((l) => l.entidadeId)).toContain(velho.id);
    });
  });
});
