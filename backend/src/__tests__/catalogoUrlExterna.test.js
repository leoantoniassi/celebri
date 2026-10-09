// ============================================================
// Testes: validação de urlExterna (http/https) no catálogo
// ============================================================
const { validarUrlHttp } = require('../utils/validators');

jest.mock('../models', () => ({ Catalogo: { create: jest.fn(), findOne: jest.fn() } }));
const { Catalogo } = require('../models');
const ctrl = require('../controllers/catalogoController');

const resMock = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('validarUrlHttp', () => {
  test.each([
    ['https://drive.google.com/x?y=1'],
    ['http://exemplo.com'],
    ['  https://exemplo.com/a  '],
  ])('aceita %s', (u) => expect(validarUrlHttp(u)).toBe(u.trim()));

  test.each([
    ['javascript:alert(1)'], ['data:text/html,<script>1</script>'], ['file:///etc/passwd'],
    ['ftp://x.com'], ['//evil.com'], ['C:\\Catalogos\\a.pdf'], ['exemplo.com'], [''], [null], ['https://'],
  ])('rejeita %s', (u) => expect(validarUrlHttp(u)).toBeNull());
});

describe('catalogoController urlExterna', () => {
  beforeEach(() => jest.clearAllMocks());

  test('criar com javascript: devolve 400 e não grava', async () => {
    const res = resMock();
    await ctrl.criar({ body: { titulo: 'X', urlExterna: 'javascript:alert(1)' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].message).toMatch(/http/);
    expect(Catalogo.create).not.toHaveBeenCalled();
  });

  test('criar com https válido grava; vazio vira null', async () => {
    Catalogo.create.mockResolvedValue({});
    await ctrl.criar({ body: { titulo: 'X', urlExterna: 'https://a.com' } }, resMock(), jest.fn());
    expect(Catalogo.create.mock.calls[0][0].urlExterna).toBe('https://a.com');
    await ctrl.criar({ body: { titulo: 'X', urlExterna: '' } }, resMock(), jest.fn());
    expect(Catalogo.create.mock.calls[1][0].urlExterna).toBeNull();
  });

  test('atualizar com URL inválida devolve 400 sem update', async () => {
    const update = jest.fn();
    Catalogo.findOne.mockResolvedValue({ titulo: 'T', urlExterna: null, update });
    const res = resMock();
    await ctrl.atualizar({ params: { id: 'i' }, body: { urlExterna: 'data:text/html,x' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(update).not.toHaveBeenCalled();
  });

  test('atualizar sem urlExterna no corpo mantém o valor atual', async () => {
    const update = jest.fn();
    Catalogo.findOne.mockResolvedValue({ titulo: 'T', urlExterna: 'https://velho.com', update });
    await ctrl.atualizar({ params: { id: 'i' }, body: { titulo: 'N' } }, resMock(), jest.fn());
    expect(update.mock.calls[0][0].urlExterna).toBe('https://velho.com');
  });
});
