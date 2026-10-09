const { escapeLike, contem } = require('../utils/escapeLike');
const { Op } = require('sequelize');

describe('escapeLike', () => {
  test('escapa %, _ e barra invertida', () => {
    expect(escapeLike('100%_a\\b')).toBe('100\\%\\_a\\\\b');
  });
  test('contem monta o padrão literal', () => {
    expect(contem('a%b')).toBe('%a\\%b%');
    expect(contem('maria')).toBe('%maria%');
  });
  test('busca "%" não vira curinga em listagens', async () => {
    jest.resetModules();
    const findAndCountAll = jest.fn().mockResolvedValue({ count: 0, rows: [] });
    jest.doMock('../models', () => ({ Cliente: { findAndCountAll } }));
    const { listar } = require('../controllers/clienteController');
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await listar({ query: { busca: '%' } }, res, jest.fn());
    const where = findAndCountAll.mock.calls[0][0].where;
    expect(where[Op.or][0].nome[Op.iLike]).toBe('%\\%%');
  });
});
