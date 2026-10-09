// ============================================================
// Unidade: ehFuncionarioDeCampo, exigirPapelAdministrativo e
// exigirAdministrativoOuProprio (todos os ramos)
// ============================================================
const {
  ehFuncionarioDeCampo,
  exigirPapelAdministrativo,
  exigirAdministrativoOuProprio,
} = require('../middleware/papelAdministrativo');

const FUNC = '550e8400-e29b-41d4-a716-446655440000';
const OUTRO = '550e8400-e29b-41d4-a716-446655440001';

function executar(mw, req) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  mw(req, res, next);
  return { res, next };
}

describe('ehFuncionarioDeCampo', () => {
  test.each([
    ['operador com funcionário', { role: 'operador', funcionarioId: FUNC }, true],
    ['papel desconhecido com funcionário', { role: 'garcom', funcionarioId: FUNC }, true],
    ['sem papel com funcionário', { funcionarioId: FUNC }, true],
    ['operador de escritório (sem funcionário)', { role: 'operador', funcionarioId: null }, false],
    ['operador com funcionarioId undefined', { role: 'operador' }, false],
    ['funcionarioId string vazia', { role: 'operador', funcionarioId: '' }, false],
    ['gerente com funcionário vinculado', { role: 'gerente', funcionarioId: FUNC }, false],
    ['super_admin com funcionário vinculado', { role: 'super_admin', funcionarioId: FUNC }, false],
    ['admin com funcionário vinculado', { role: 'admin', funcionarioId: FUNC }, false],
    ['gerente sem funcionário', { role: 'gerente', funcionarioId: null }, false],
    ['null', null, false],
    ['undefined', undefined, false],
    ['objeto vazio', {}, false],
  ])('%s -> %s', (_n, user, esperado) => {
    expect(ehFuncionarioDeCampo(user)).toBe(esperado);
  });

  test('sempre devolve boolean', () => {
    expect(ehFuncionarioDeCampo({ role: 'operador', funcionarioId: FUNC })).toBe(true);
    expect(typeof ehFuncionarioDeCampo(null)).toBe('boolean');
  });
});

describe('exigirPapelAdministrativo', () => {
  test('sem req.user -> 401 e não chama next', () => {
    const { res, next } = executar(exigirPapelAdministrativo, {});
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('conta de campo -> 403 e não chama next', () => {
    const { res, next } = executar(exigirPapelAdministrativo, { user: { role: 'operador', funcionarioId: FUNC } });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  test.each([
    ['gerente', { role: 'gerente', funcionarioId: null }],
    ['gerente vinculado a funcionário', { role: 'gerente', funcionarioId: FUNC }],
    ['super_admin', { role: 'super_admin' }],
    ['admin', { role: 'admin' }],
    ['operador de escritório', { role: 'operador', funcionarioId: null }],
  ])('%s passa', (_n, user) => {
    const { res, next } = executar(exigirPapelAdministrativo, { user });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('exigirAdministrativoOuProprio', () => {
  const campo = { role: 'operador', funcionarioId: FUNC };

  test('sem req.user -> 401', () => {
    const { res, next } = executar(exigirAdministrativoOuProprio(), { params: { id: FUNC } });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('campo consultando o próprio cadastro passa', () => {
    const { next } = executar(exigirAdministrativoOuProprio(), { user: campo, params: { id: FUNC } });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('campo consultando outro funcionário -> 403', () => {
    const { res, next } = executar(exigirAdministrativoOuProprio(), { user: campo, params: { id: OUTRO } });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('campo sem o param na rota (undefined) -> 403', () => {
    const { res, next } = executar(exigirAdministrativoOuProprio(), { user: campo, params: {} });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('comparação é exata (caixa diferente não casa)', () => {
    const { res } = executar(exigirAdministrativoOuProprio(), {
      user: { role: 'operador', funcionarioId: 'ABC' }, params: { id: 'abc' },
    });
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('nome de param customizado', () => {
    const { next } = executar(exigirAdministrativoOuProprio('funcionarioId'), { user: campo, params: { funcionarioId: FUNC } });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('gerente e operador de escritório consultam qualquer funcionário', () => {
    [{ role: 'gerente' }, { role: 'operador', funcionarioId: null }].forEach((user) => {
      const { next } = executar(exigirAdministrativoOuProprio(), { user, params: { id: OUTRO } });
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
