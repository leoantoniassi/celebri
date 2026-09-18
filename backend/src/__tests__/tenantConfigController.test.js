// ============================================================
// Testes: Tenant Config Controller — Validação de URL e Tenant
// ============================================================
const { atualizarConfig } = require('../controllers/tenantConfigController');
const { Empresa, Usuario } = require('../models');

jest.mock('../models', () => ({
  Empresa: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  Usuario: {
    findByPk: jest.fn(),
  },
}));

jest.mock('../utils/brand', () => ({
  invalidarCache: jest.fn(),
}));

jest.mock('../utils/resolverTenant', () => ({
  resolverTenant: jest.fn(() => Promise.resolve({ empresa: null, erro: null })),
}));

describe('TenantConfigController - atualizarConfig', () => {
  let mockEmpresa;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEmpresa = {
      id: 'emp-1',
      nomeFantasia: 'Buffet Original',
      slug: 'buffet-original',
      logoUrl: null,
      corPrimaria: '#1CEAFF',
      corSecundaria: '#FF45FF',
      corTerciaria: '#1F357F',
      update: jest.fn().mockImplementation((dados) => {
        Object.assign(mockEmpresa, dados);
        return Promise.resolve(mockEmpresa);
      }),
    };

    mockReq = {
      user: { id: 'usr-1', role: 'gerente', empresaId: 'emp-1' },
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    Empresa.findOne.mockResolvedValue(mockEmpresa);
  });

  test('Permite salvar logoUrl longa (acima de 255 caracteres)', async () => {
    const urlLonga = 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?' + 'a'.repeat(300);
    mockReq.body = { logoUrl: urlLonga };

    await atualizarConfig(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockEmpresa.update).toHaveBeenCalledWith(
      expect.objectContaining({ logoUrl: urlLonga })
    );
  });

  test('Normaliza URL sem protocolo adicionando https://', async () => {
    mockReq.body = { logoUrl: 'meubuffet.com/assets/logo.png' };

    await atualizarConfig(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockEmpresa.update).toHaveBeenCalledWith(
      expect.objectContaining({ logoUrl: 'https://meubuffet.com/assets/logo.png' })
    );
  });

  test('Rejeita URL com esquema inválido (ex: javascript: ou file:)', async () => {
    mockReq.body = { logoUrl: 'javascript:alert(1)' };

    await atualizarConfig(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/URL http\(s\) válida/) })
    );
  });

  test('Rejeita URL com mais de 2048 caracteres', async () => {
    mockReq.body = { logoUrl: 'https://exemplo.com/' + 'x'.repeat(2050) };

    await atualizarConfig(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/máximo 2048/) })
    );
  });

  test('Permite remover logo passando string vazia ou null', async () => {
    mockReq.body = { logoUrl: '' };

    await atualizarConfig(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockEmpresa.update).toHaveBeenCalledWith(
      expect.objectContaining({ logoUrl: null })
    );
  });

  test('Recupera empresa pelo Usuario caso empresaId do token seja nulo ou desatualizado', async () => {
    mockReq.user.empresaId = null;
    Empresa.findOne.mockResolvedValue(null);
    Usuario.findByPk.mockResolvedValue({ id: 'usr-1', empresaId: 'emp-1' });
    Empresa.findByPk.mockResolvedValue(mockEmpresa);

    mockReq.body = { nomeFantasia: 'Novo Nome' };

    await atualizarConfig(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockEmpresa.update).toHaveBeenCalledWith(
      expect.objectContaining({ nomeFantasia: 'Novo Nome' })
    );
  });
});
