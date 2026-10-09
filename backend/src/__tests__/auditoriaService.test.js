// ============================================================
// Testes: serviço de auditoria (nunca lança, nunca grava dado pessoal)
// ============================================================
jest.mock('../models', () => ({ Auditoria: { create: jest.fn() } }));

const { Auditoria } = require('../models');
const { registrar, sanitizarDetalhes } = require('../services/auditoriaService');

beforeEach(() => {
  Auditoria.create.mockResolvedValue({});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

describe('sanitizarDetalhes', () => {
  test('remove chaves de dados pessoais, segredos e tokens (qualquer caixa/formato)', () => {
    const limpo = sanitizarDetalhes({
      email: 'a@b.com', Email_Contato: 'x', cpf: '1', rgCpf: '2', cnpj: '3', telefone: '4', telefoneResidencial: '5',
      nome: 'Maria', senha: 'x', senhaNova: 'x', password: 'x', token: 't', conviteToken: 't', 'reset-token': 't',
      hash: 'h', codigoHash: 'h', authorization: 'Bearer x', Cookie: 'c', jwt: 'j', apiKey: 'k',
      papel: 'gerente', quantidade: 3, ok: true,
    });
    expect(limpo).toEqual({ papel: 'gerente', quantidade: 3, ok: true });
  });

  test('sanitiza aninhado e mascara valores com formato de e-mail', () => {
    const limpo = sanitizarDetalhes({
      motivo: 'contato fulano@exemplo.com falhou',
      alvo: { id: 'u1', email: 'x@y.com', sub: { telefone: '1', ok: 1 } },
      lista: [{ token: 'x', n: 1 }, 'ciclano@x.org'],
    });
    expect(limpo.motivo).toBe('[removido]');
    expect(limpo.alvo).toEqual({ id: 'u1', sub: { ok: 1 } });
    expect(limpo.lista).toEqual([{ n: 1 }, '[removido]']);
    expect(JSON.stringify(limpo)).not.toMatch(/@/);
  });

  test('limita tamanho e profundidade; entradas inválidas viram null', () => {
    const grande = sanitizarDetalhes({ texto: 'a'.repeat(500) });
    expect(grande.texto.length).toBeLessThan(210);
    expect(sanitizarDetalhes({ a: { b: { c: 1 } } })).toEqual({ a: { b: { c: 1 } } });
    expect(sanitizarDetalhes({ a: { b: { c: { d: { e: 1 } } } } })).toBeNull(); // nível profundo demais é descartado
    expect(sanitizarDetalhes(null)).toBeNull();
    expect(sanitizarDetalhes('texto')).toBeNull();
    expect(sanitizarDetalhes({ email: 'x' })).toBeNull();
  });
});

describe('registrar', () => {
  test('grava ator, empresa, ip e detalhes sanitizados a partir do req', async () => {
    const req = { ip: '10.0.0.9', user: { id: 'u1', empresaId: 'e1', email: 'nao@vazar.com' } };
    const ok = await registrar({
      req, acao: 'usuario.criado', entidade: 'usuario', entidadeId: 'abc',
      detalhes: { papel: 'gerente', email: 'nao@vazar.com' },
    });
    expect(ok).toBe(true);
    expect(Auditoria.create).toHaveBeenCalledWith({
      empresaId: 'e1', usuarioId: 'u1', acao: 'usuario.criado', entidade: 'usuario', entidadeId: 'abc',
      ip: '10.0.0.9', detalhes: { papel: 'gerente' },
    });
    expect(JSON.stringify(Auditoria.create.mock.calls[0][0])).not.toContain('nao@vazar.com');
  });

  test('empresaId/usuario explícitos prevalecem; sem req não há ip', async () => {
    await registrar({ usuario: { id: 'u2' }, empresaId: 'e9', acao: 'auth.login.ok' });
    expect(Auditoria.create).toHaveBeenCalledWith(expect.objectContaining({ empresaId: 'e9', usuarioId: 'u2', ip: null, detalhes: null }));
  });

  test('NUNCA lança: falha do banco devolve false e loga só o tipo do erro', async () => {
    Auditoria.create.mockRejectedValue(Object.assign(new Error('INSERT ... values (maria@x.com)'), { name: 'SequelizeDatabaseError' }));
    await expect(registrar({ acao: 'x.y' })).resolves.toBe(false);
    const msg = console.error.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(msg).toContain('SequelizeDatabaseError');
    expect(msg).not.toContain('maria@x.com');
  });

  test('sem acao, ou sem argumentos, não lança nem grava', async () => {
    await expect(registrar({})).resolves.toBe(false);
    await expect(registrar()).resolves.toBe(false);
    expect(Auditoria.create).not.toHaveBeenCalled();
  });

  test('detalhes malformados (referência circular, getter que lança) não derrubam', async () => {
    const circ = { a: 1 }; circ.self = circ;
    await expect(registrar({ acao: 'x', detalhes: circ })).resolves.toBe(true);
    // A chave com getter hostil é descartada; o registro (sem ela) é gravado.
    const hostil2 = { ok: 1 }; Object.defineProperty(hostil2, 'x', { enumerable: true, get() { throw new Error('boom'); } });
    await expect(registrar({ acao: 'x', detalhes: hostil2 })).resolves.toBe(true);
    expect(Auditoria.create.mock.calls.pop()[0].detalhes).toEqual({ ok: 1 });
  });
});

describe('payloads maliciosos (fase 8 - segurança)', () => {
  const gravado = async (detalhes) => {
    await registrar({ acao: 'x', detalhes });
    return Auditoria.create.mock.calls.pop()[0].detalhes;
  };

  test('variações de chave de e-mail/telefone/nome em qualquer formato', () => {
    const limpo = sanitizarDetalhes({
      e_mail: 'a', eMail: 'a', 'E-MAIL': 'a', mail: 'a', PHONE: 'a', userName: 'a', Address: 'a', dataNascimento: 'a', CEP: 'a', logradouro: 'a', ok: 1,
    });
    expect(limpo).toEqual({ ok: 1 });
  });

  test('valores com e-mail embutido, CPF/telefone/CNPJ no texto são mascarados; UUID e versão passam', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';
    const limpo = sanitizarDetalhes({
      a: 'x maria@exemplo.com y', b: 'cpf 123.456.789-09', c: '(11) 98888-7777', d: '11.222.333/0001-81', e: '11988887777',
      id: uuid, versao: '1.0', n: 5,
    });
    expect(limpo).toEqual({
      a: '[removido]', b: '[removido]', c: '[removido]', d: '[removido]', e: '[removido]', id: uuid, versao: '1.0', n: 5,
    });
  });

  test('__proto__/constructor não poluem nem viram chave; objeto resultante é comum', async () => {
    const d = await gravado(JSON.parse('{"__proto__":{"polluted":1},"constructor":{"x":1},"ok":1}'));
    expect(d).toEqual({ ok: 1 });
    expect({}.polluted).toBeUndefined();
  });

  test('Buffer, typed array, BigInt, Symbol, função e Date inválida não entram nem derrubam', async () => {
    const d = await gravado({
      buf: Buffer.alloc(100000, 1), ta: new Uint8Array(50000), big: BigInt(10), sym: Symbol('s'), fn: () => 1, data: new Date('invalida'), ok: 1,
    });
    expect(d).toEqual({ ok: 1 });
  });

  test('objeto com milhares de chaves e strings enormes tem teto de tamanho', async () => {
    const enorme = {};
    for (let i = 0; i < 5000; i += 1) enorme[`k${i}`] = 'x'.repeat(5000);
    const d = await gravado({ enorme, outro: 'y'.repeat(100000), lista: Array.from({ length: 5000 }, (_, i) => ({ i, s: 'z'.repeat(1000) })) });
    expect(JSON.stringify(d).length).toBeLessThanOrEqual(4100);
  });

  test('chave gigante é truncada', async () => {
    const d = await gravado({ ['a'.repeat(5000)]: 1 });
    expect(Object.keys(d)[0].length).toBeLessThanOrEqual(60);
  });

  test('quebras de linha em acao/entidade/ip não chegam ao banco nem ao log (log injection)', async () => {
    await registrar({ req: { ip: '1.2.3.4\nFAKE LOG', user: { id: 'u' } }, acao: 'a\r\nFORJADO[auditoria]', entidade: 'e\nx' });
    const linha = Auditoria.create.mock.calls.pop()[0];
    [linha.acao, linha.entidade, linha.ip].forEach((v) => expect(v).not.toMatch(/[\r\n]/));
    Auditoria.create.mockRejectedValue(new Error('x'));
    await registrar({ acao: 'b\nFORJADO' });
    expect(console.error.mock.calls.pop()[0]).not.toMatch(/\n/);
  });

  test('acao com toString que lança não derruba nem vaza', async () => {
    const hostil = { toString() { throw new Error('boom'); } };
    await expect(registrar({ acao: hostil })).resolves.toBeDefined();
  });
});

describe('models sem Auditoria (testes que mockam ../models)', () => {
  test('é silencioso quando o model não existe', async () => {
    jest.resetModules();
    jest.doMock('../models', () => ({ Usuario: {} }));
    const { registrar: reg } = require('../services/auditoriaService');
    await expect(reg({ acao: 'x' })).resolves.toBe(false);
    jest.dontMock('../models');
  });
});
