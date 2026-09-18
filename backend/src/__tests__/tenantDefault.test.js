// ============================================================
// Testes: Tenant Default & Branding (Celebri)
// ============================================================
const { obterMarca } = require('../utils/brand');
const { obterConfig } = require('../controllers/tenantConfigController');
const { resolverTenant } = require('../utils/resolverTenant');

jest.mock('../models', () => ({
  Empresa: {
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
}));

jest.mock('../utils/resolverTenant', () => ({
  resolverTenant: jest.fn(),
}));

describe('Tenant Default / Branding Celebri', () => {
  test('obterMarca retorna nomeFantasia "Celebri" por padrão quando empresaId é nulo', async () => {
    const marca = await obterMarca(null);
    expect(marca).toBeDefined();
    expect(marca.nomeFantasia).toBe('Celebri');
    expect(marca.corPrimaria).toBe('#1CEAFF');
  });

  test('obterConfig serializa e retorna nomeFantasia "Celebri"', async () => {
    const mockEmpresa = {
      id: 'emp-celebri-1',
      nomeFantasia: 'Celebri',
      slug: 'celebri',
      logoUrl: null,
      corPrimaria: '#1CEAFF',
      corSecundaria: '#FF45FF',
      corTerciaria: '#1F357F',
      status: 'ativo',
    };

    resolverTenant.mockResolvedValueOnce({ empresa: mockEmpresa, erro: null });

    const req = { get: jest.fn() };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    await obterConfig(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        id: 'emp-celebri-1',
        nomeFantasia: 'Celebri',
        slug: 'celebri',
        logoUrl: null,
        cores: {
          primaria: '#1CEAFF',
          secundaria: '#FF45FF',
          terciaria: '#1F357F',
        },
      },
    });
  });
});
