const request = require('supertest');
const express = require('express');
const { Cliente, Funcionario, Produto, Orcamento, Evento, Local } = require('../models');

jest.mock('../middleware/auth', () => (req, res, next) => { req.user = { id: 'u-1', role: 'gerente' }; next(); });

jest.mock('../models', () => {
  const mockCount = jest.fn();
  const mockFindAll = jest.fn();
  const mockScope = jest.fn();

  // Mock de modelo com scope encadeado
  const mockModelOrcamento = {
    count: mockCount,
    scope: mockScope,
  };
  mockScope.mockReturnValue(mockModelOrcamento);

  return {
    Cliente: { count: jest.fn() },
    Funcionario: { count: jest.fn() },
    Produto: { count: jest.fn() },
    Orcamento: mockModelOrcamento,
    Evento: {
      count: jest.fn(),
      findAll: jest.fn(),
    },
    Local: { count: jest.fn() },
  };
});

describe('DashboardController', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/dashboard', require('../routes/dashboard.routes'));
    app.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, message: err.message });
    });
  });

  describe('GET /api/dashboard/stats', () => {
    test('deve retornar as estatísticas do dashboard corretamente', async () => {
      Cliente.count.mockResolvedValue(10);
      Funcionario.count.mockResolvedValue(5);
      Produto.count.mockResolvedValue(20);
      
      // Chamadas do count do Orcamento
      Orcamento.count.mockImplementation((options) => {
        if (options && options.where) {
          if (options.where.status === 'pendente') {
            return Promise.resolve(2);
          }
          if (options.where.status === 'aprovado') {
            return Promise.resolve(3);
          }
        }
        return Promise.resolve(15); // Orcamento.count geral
      });

      Evento.count.mockImplementation((options) => {
        if (options && options.where) {
          if (options.where.status === 'pendente') {
            return Promise.resolve(4); // eventosPendentes
          }
          if (options.where.dataEvento) {
            return Promise.resolve(1); // eventosProximos30Dias
          }
        }
        return Promise.resolve(8); // Evento.count geral
      });

      const res = await request(app).get('/api/dashboard/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        totalClientes: 10,
        totalFuncionarios: 5,
        totalProdutos: 20,
        totalOrcamentos: 15,
        totalEventos: 8,
        orcamentosPendentes: 2,
        orcamentosAprovados: 3,
        eventosPendentes: 4,
        eventosProximos30Dias: 1,
      });

      expect(Orcamento.scope).toHaveBeenCalledWith('comDeletados');
    });
  });

  describe('GET /api/dashboard/charts', () => {
    test('deve retornar os dados dos gráficos corretamente', async () => {
      const mockEventos = [
        {
          id: '1',
          nome: 'Festa 1',
          dataEvento: '2026-06-15T18:00:00.000Z',
          qtdPessoas: 50,
          valorOrcamento: 5000.00,
          local: { nome: 'Salão A' },
        },
        {
          id: '2',
          nome: 'Festa 2',
          dataEvento: '2026-07-20T20:00:00.000Z',
          qtdPessoas: 100,
          valorOrcamento: 12000.00,
          local: { nome: 'Salão B' },
        },
        {
          id: '3',
          nome: 'Festa Sem Local',
          dataEvento: '2026-08-05T15:00:00.000Z',
          qtdPessoas: 20,
          valorOrcamento: 1500.00,
          local: null,
        },
      ];

      Evento.findAll.mockResolvedValue(mockEventos);

      const res = await request(app).get('/api/dashboard/charts');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      
      // Scatter
      expect(res.body.data.scatter).toHaveLength(3);
      expect(res.body.data.scatter[0]).toEqual({
        convidados: 50,
        custo: 5000,
        nome: 'Festa 1',
      });

      // TimeSeries (agrupado por ano atual: 2026)
      const currentYear = new Date().getFullYear();
      if (currentYear === 2026) {
        const jun = res.body.data.timeSeries.find(t => t.mes === 'Jun');
        expect(jun.eventos).toBe(1);
      }

      // Infra (locais)
      expect(res.body.data.infra).toContainEqual({
        name: 'Salão a',
        value: 1,
      });
      expect(res.body.data.infra).toContainEqual({
        name: 'Salão b',
        value: 1,
      });
      expect(res.body.data.infra).toContainEqual({
        name: 'Não definido',
        value: 1,
      });
    });
  });
});
