// ============================================================
// Testes: purge de retenção (dry-run por padrão) e leitura de configuração
// ============================================================
jest.mock('../config/database', () => ({ transaction: jest.fn(), addHook: jest.fn(), literal: (x) => x }));
const mockModelo = () => ({ unscoped: jest.fn().mockReturnThis(), findAll: jest.fn().mockResolvedValue([]) });
jest.mock('../models', () => ({
  Cliente: mockModelo(), Funcionario: mockModelo(), Fornecedor: mockModelo(), Convite: mockModelo(), Evento: mockModelo(),
  Usuario: {}, Orcamento: {}, Documento: {}, Escala: {}, CategoriaFornecedor: {}, Funcao: {},
}));
jest.mock('../services/lgpdService', () => ({ anonimizarTitular: jest.fn(), TIPOS: [] }));
jest.mock('../services/auditoriaService', () => ({ registrar: jest.fn().mockResolvedValue(true) }));

const { Cliente, Convite, Evento } = require('../models');
const lgpdService = require('../services/lgpdService');
const auditoria = require('../services/auditoriaService');
const { executarRetencao, lerConfig } = require('../services/retencaoService');
const { lerArgumentos } = require('../../scripts/purge-retencao');

const config = { retencaoDias: 1825, retencaoConvitesDias: 180 };

beforeEach(() => {
  Object.values(require('../models')).forEach((m) => { if (m.unscoped) { m.unscoped.mockReturnThis(); m.findAll.mockResolvedValue([]); } });
  Cliente.findAll.mockResolvedValue([{ id: 'c1', empresaId: 'e1' }, { id: 'c2', empresaId: 'e1' }]);
  Evento.findAll.mockResolvedValue([{ id: 'ev1' }]);
  Convite.findAll.mockResolvedValue([{ id: 'v1', empresaId: 'e1' }]);
});

describe('executarRetencao', () => {
  test('dry-run é o padrão: conta, não anonimiza nem audita', async () => {
    const log = jest.fn();
    const r = await executarRetencao({ config, log });
    expect(r).toMatchObject({ dryRun: true, candidatos: 3, anonimizados: 0, porTipo: { cliente: 2, convidado: 1 } });
    expect(lgpdService.anonimizarTitular).not.toHaveBeenCalled();
    expect(auditoria.registrar).not.toHaveBeenCalled();
    expect(log.mock.calls[0][0]).toContain('dry-run');
  });

  test('dry-run explícito também não altera', async () => {
    await executarRetencao({ dryRun: true, config });
    expect(lgpdService.anonimizarTitular).not.toHaveBeenCalled();
  });

  test('executar: anonimiza, audita cada um e conta bloqueios/falhas sem dados pessoais no log', async () => {
    lgpdService.anonimizarTitular
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, motivo: 'evento_futuro' })
      .mockRejectedValueOnce(Object.assign(new Error('Maria 123.456'), { name: 'SequelizeDatabaseError' }));
    const log = jest.fn();
    const r = await executarRetencao({ dryRun: false, config, log });
    expect(r).toMatchObject({ dryRun: false, anonimizados: 1, bloqueados: 1, falhas: 1 });
    expect(auditoria.registrar).toHaveBeenCalledTimes(1);
    expect(auditoria.registrar).toHaveBeenCalledWith(expect.objectContaining({ acao: 'retencao.titular.anonimizado', entidade: 'cliente', entidadeId: 'c1', empresaId: 'e1' }));
    expect(log.mock.calls.map((c) => c[0]).join('\n')).not.toContain('Maria');
  });

  test('consulta só soft-deleted vencidos e ainda não anonimizados; convites de eventos encerrados', async () => {
    await executarRetencao({ config, agora: new Date('2030-01-01T00:00:00Z') });
    const where = Cliente.findAll.mock.calls[0][0].where;
    expect(where.anonimizadoEm).toBeNull();
    const limite = Object.getOwnPropertySymbols(where.deletadoEm).map((s) => where.deletadoEm[s])[0];
    expect(limite.toISOString()).toBe(new Date(new Date('2030-01-01T00:00:00Z').getTime() - 1825 * 86400000).toISOString());
    expect(Convite.findAll.mock.calls[0][0].where).toMatchObject({ eventoId: ['ev1'], anonimizadoEm: null });
  });
});

describe('lerConfig', () => {
  test('padrões: 1825 e 180 dias', () => {
    expect(lerConfig({})).toEqual({ retencaoDias: 1825, retencaoConvitesDias: 180 });
  });
  test('aceita valores válidos', () => {
    expect(lerConfig({ RETENCAO_DIAS: '730', RETENCAO_CONVITES_DIAS: '90' })).toEqual({ retencaoDias: 730, retencaoConvitesDias: 90 });
  });
  test.each(['abc', '-5', '1', '0', '12.5'])('rejeita %p (trava contra typo)', (v) => {
    expect(() => lerConfig({ RETENCAO_DIAS: v })).toThrow(/RETENCAO_DIAS/);
  });
});

describe('script: argumentos', () => {
  test('sem flags é dry-run; só --executar aplica', () => {
    expect(lerArgumentos([])).toEqual({ dryRun: true });
    expect(lerArgumentos(['--dry-run'])).toEqual({ dryRun: true });
    expect(lerArgumentos(['--executar'])).toEqual({ dryRun: false });
  });
  test('rejeita combinação e argumento desconhecido', () => {
    expect(() => lerArgumentos(['--executar', '--dry-run'])).toThrow();
    expect(() => lerArgumentos(['--force'])).toThrow(/desconhecido/);
  });
});
