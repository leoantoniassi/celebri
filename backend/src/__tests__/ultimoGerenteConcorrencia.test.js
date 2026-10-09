// ============================================================
// Integração (PostgreSQL real): corrida pelo "último gerente"
// ============================================================
// Dois gerentes do mesmo buffet se removem ao mesmo tempo. Sem o
// SELECT ... FOR UPDATE de comGerentesTravados ambos veriam "ainda há outro
// gerente" e a empresa ficaria sem nenhum. Pulado quando não há banco.
// ============================================================
require('dotenv').config();
const request = require('supertest');
const bcrypt = require('bcryptjs');

const sequelize = require('../config/database');
const { Empresa, Usuario } = require('../models');
const { semEscopo } = require('../utils/tenantContext');
const app = require('../app');

const SENHA = 'senha-de-teste-123';
const SLUG = 'teste-ultimo-gerente';
const RODADAS = 15;
const bancoDisponivel = process.env.BANCO_DISPONIVEL === '1';
const cenario = bancoDisponivel ? test : test.skip;

async function limpar() {
  await semEscopo(async () => {
    const empresas = await Empresa.findAll({ where: { slug: SLUG }, ignoraTenant: true });
    for (const empresa of empresas) {
      await Usuario.destroy({ where: { empresaId: empresa.id }, ignoraTenant: true, force: true });
      await empresa.destroy({ force: true });
    }
  });
}

async function novoGerente(empresa, rotulo) {
  const email = `${rotulo}-${Math.random().toString(36).slice(2, 8)}@teste-ultimo.com`;
  const usuario = await semEscopo(async () => Usuario.create({
    nome: rotulo, email, senha: await bcrypt.hash(SENHA, 10), role: 'gerente', status: 'ativo', empresaId: empresa.id,
  }));
  const login = await request(app).post('/api/auth/login').set('X-Tenant-Slug', SLUG).send({ email, senha: SENHA });
  expect(login.status).toBe(200);
  return { usuario, token: login.body.token };
}

beforeAll(async () => {
  if (!bancoDisponivel) return;
  await sequelize.authenticate();
  await limpar();
}, 30000);

afterAll(async () => {
  if (bancoDisponivel) await limpar();
  await sequelize.close();
});

describe('Último gerente ativo (concorrência real)', () => {
  cenario('remoções cruzadas simultâneas: exatamente uma vence, a empresa nunca fica sem gerente', async () => {
    // Um slug por vez evita estourar o rate limit de login (por conta/IP).
    await limpar();
    const empresa = await semEscopo(() => Empresa.create({ nome: 'Buffet UG', nomeFantasia: 'Buffet UG', slug: SLUG }));

    for (let i = 0; i < RODADAS; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const [a, b] = [await novoGerente(empresa, `a${i}`), await novoGerente(empresa, `b${i}`)];
      // Remove gerentes excedentes de rodadas anteriores: só a e b contam nesta.
      // eslint-disable-next-line no-await-in-loop
      await semEscopo(() => Usuario.destroy({
        where: { empresaId: empresa.id, id: { [require('sequelize').Op.notIn]: [a.usuario.id, b.usuario.id] } },
        ignoraTenant: true, force: true,
      }));

      // eslint-disable-next-line no-await-in-loop
      const [r1, r2] = await Promise.all([
        request(app).delete(`/api/usuarios/${b.usuario.id}`).set('Authorization', `Bearer ${a.token}`),
        request(app).delete(`/api/usuarios/${a.usuario.id}`).set('Authorization', `Bearer ${b.token}`),
      ]);

      const status = [r1.status, r2.status].sort();
      expect(status).toEqual([200, 409]);

      // eslint-disable-next-line no-await-in-loop
      const restantes = await semEscopo(() => Usuario.count({
        where: { empresaId: empresa.id, role: 'gerente', status: 'ativo' }, ignoraTenant: true,
      }));
      expect(restantes).toBe(1);
    }
  }, 120000);
});
