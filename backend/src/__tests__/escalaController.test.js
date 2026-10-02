const request = require('supertest');
const express = require('express');
const { Escala, Evento, Funcionario, Funcao } = require('../models');

jest.mock('../middleware/auth', () => (req, res, next) => next());
jest.mock('../middleware/roles', () => () => (req, res, next) => next());

// O controller usa Escala.escalaPorFiltro de duas formas: buscando por id (registro
// específico) e por evento+funcionário (checagem de alocação duplicada).
// O mock despacha para um jest.fn() diferente conforme o `where`, para que
// cada caso possa ser controlado isoladamente nos testes.
jest.mock('../models', () => {
  const escalaPorId = jest.fn();
  const escalaPorFiltro = jest.fn();
  return {
    Escala: {
      findAll: jest.fn(),
      create: jest.fn(),
      escalaPorId,
      escalaPorFiltro,
      findOne: jest.fn((options) =>
        options && options.where && options.where.id
          ? escalaPorId(options)
          : escalaPorFiltro(options)
      ),
    },
    Evento: { findOne: jest.fn() },
    Funcionario: { findAll: jest.fn(), findOne: jest.fn() },
    Funcao: { findOne: jest.fn() },
    Empresa: { findOne: jest.fn() },
    Local: {},
  };
});

const { Empresa } = require('../models');

// Usuário da requisição; cada teste pode trocar (auth está mockado).
let usuarioAtual;

const mockEvento = {
  id: 'evt-1',
  nome: 'Evento Principal',
  dataEvento: '2026-01-01T08:00:00.000Z',
  horarioTermino: '2026-01-01T10:00:00.000Z',
};

const mockFuncionario = {
  id: 'func-1',
  nome: 'João Silva',
};

const mockFuncionario2 = {
  id: 'func-2',
  nome: 'Maria Souza',
};

const mockEscalaCriada = {
  id: 'esc-1',
  eventoId: 'evt-1',
  funcionarioId: 'func-1',
  observacoes: null,
  evento: { id: 'evt-1', nome: 'Evento Principal', dataEvento: '2026-01-01T08:00:00.000Z', horarioTermino: '2026-01-01T10:00:00.000Z' },
  funcionario: { id: 'func-1', nome: 'João Silva', funcao: null },
};

describe('EscalaController — conflito com gap de 2h', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    Empresa.findOne.mockResolvedValue(null);
    usuarioAtual = undefined;
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => { req.user = usuarioAtual; next(); });
    app.use('/api/escala', require('../routes/escala.routes'));
    app.use((err, _req, res, _next) => {
      res.status(500).json({ success: false, message: err.message });
    });
  });

  describe('alocar (POST /api/escala)', () => {
    test('deve alocar funcionário SEM conflito (gap de 4h >= 2h)', async () => {
      Evento.findOne.mockResolvedValue(mockEvento);
      Funcionario.findOne.mockResolvedValue(mockFuncionario);
      Escala.findAll.mockResolvedValue([]); // buscarEscalasMesmoDia → vazio
      Escala.escalaPorFiltro.mockResolvedValue(null); // não está alocado ainda
      Escala.create.mockResolvedValue({ id: 'esc-1', eventoId: 'evt-1', funcionarioId: 'func-1' });
      Escala.escalaPorId.mockResolvedValue(mockEscalaCriada);

      const res = await request(app)
        .post('/api/escala')
        .send({ eventoId: 'evt-1', funcionarioId: 'func-1' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('alocado');
    });

    test('deve alocar funcionário SEM outra escala no mesmo dia', async () => {
      Evento.findOne.mockResolvedValue(mockEvento);
      Funcionario.findOne.mockResolvedValue(mockFuncionario);
      Escala.findAll.mockResolvedValue([]);
      Escala.escalaPorFiltro.mockResolvedValue(null);
      Escala.create.mockResolvedValue({ id: 'esc-1', eventoId: 'evt-1', funcionarioId: 'func-1' });
      Escala.escalaPorId.mockResolvedValue(mockEscalaCriada);

      const res = await request(app)
        .post('/api/escala')
        .send({ eventoId: 'evt-1', funcionarioId: 'func-1' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    test('deve retornar 409 se houver conflito com gap < 2h', async () => {
      // Evento principal: 08:00-10:00
      // Outro evento: 11:00-13:00 → gap 1h < 2h → CONFLITO
      Evento.findOne.mockResolvedValue(mockEvento);
      Funcionario.findOne.mockResolvedValue(mockFuncionario);

      const escalaConflito = {
        id: 'esc-outro',
        funcionarioId: 'func-1',
        eventoId: 'evt-2',
        evento: {
          id: 'evt-2',
          nome: 'Outro Evento',
          dataEvento: '2026-01-01T11:00:00.000Z',
          horarioTermino: '2026-01-01T13:00:00.000Z',
        },
      };
      Escala.findAll.mockResolvedValue([escalaConflito]);

      const res = await request(app)
        .post('/api/escala')
        .send({ eventoId: 'evt-1', funcionarioId: 'func-1' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('intervalo mínimo de 2h');
      expect(res.body.message).toContain('João Silva');
    });

    test('deve retornar 400 se eventoId não for informado', async () => {
      const res = await request(app)
        .post('/api/escala')
        .send({ funcionarioId: 'func-1' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('obrigatórios');
    });

    test('deve retornar 400 se funcionarioId não for informado', async () => {
      const res = await request(app)
        .post('/api/escala')
        .send({ eventoId: 'evt-1' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('obrigatórios');
    });
  });

  describe('alocarLote (POST /api/escala/lote)', () => {
    test('deve alocar lote com gap suficiente — 201 sem erros', async () => {
      Evento.findOne.mockResolvedValue(mockEvento);

      Funcionario.findOne
        .mockResolvedValueOnce(mockFuncionario)   // func-1
        .mockResolvedValueOnce(mockFuncionario2);  // func-2

      Escala.findAll
        .mockResolvedValueOnce([]) // buscarEscalasMesmoDia func-1 → sem conflito
        .mockResolvedValueOnce([]); // buscarEscalasMesmoDia func-2 → sem conflito

      Escala.escalaPorFiltro
        .mockResolvedValueOnce(null) // func-1 não alocado
        .mockResolvedValueOnce(null); // func-2 não alocado

      Escala.create
        .mockResolvedValueOnce({ id: 'esc-1' })
        .mockResolvedValueOnce({ id: 'esc-2' });

      const res = await request(app)
        .post('/api/escala/lote')
        .send({ eventoId: 'evt-1', funcionarioIds: ['func-1', 'func-2'] });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.criados).toBe(2);
      expect(res.body.data.erros).toHaveLength(0);
    });

    test('deve alocar lote com conflito em um funcionário — 201 com erros', async () => {
      Evento.findOne.mockResolvedValue(mockEvento);
      // func-1: alocado em outro evento com conflito
      // func-2: OK
      const escalaConflito = {
        id: 'esc-outro',
        funcionarioId: 'func-1',
        eventoId: 'evt-2',
        evento: {
          id: 'evt-2',
          nome: 'Evento Conflitante',
          dataEvento: '2026-01-01T11:00:00.000Z',
          horarioTermino: '2026-01-01T13:00:00.000Z',
        },
      };

      Funcionario.findOne
        .mockResolvedValueOnce(mockFuncionario)  // func-1
        .mockResolvedValueOnce(mockFuncionario2); // func-2

      Escala.findAll
        .mockResolvedValueOnce([escalaConflito]) // func-1 tem conflito
        .mockResolvedValueOnce([]);               // func-2 sem conflito

      Escala.escalaPorFiltro
        .mockResolvedValueOnce(null); // func-2 não alocado (func-1 skipped por conflito)

      Escala.create
        .mockResolvedValueOnce({ id: 'esc-2' }); // só func-2 é criado

      const res = await request(app)
        .post('/api/escala/lote')
        .send({ eventoId: 'evt-1', funcionarioIds: ['func-1', 'func-2'] });

      expect(res.status).toBe(201);
      expect(res.body.data.criados).toBe(1);
      expect(res.body.data.erros).toHaveLength(1);
      expect(res.body.data.erros[0]).toContain('intervalo mínimo de 2h');
    });

    test('deve retornar 400 se funcionarioIds não for informado', async () => {
      const res = await request(app)
        .post('/api/escala/lote')
        .send({ eventoId: 'evt-1' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('obrigatórios');
    });

    test('deve retornar 400 se funcionarioIds for array vazio', async () => {
      const res = await request(app)
        .post('/api/escala/lote')
        .send({ eventoId: 'evt-1', funcionarioIds: [] });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('obrigatórios');
    });

    test('deve retornar 400 se mais de 100 funcionários forem enviados (DoS protection)', async () => {
      const muitosIds = Array.from({ length: 101 }, (_, i) => `func-${i}`);

      const res = await request(app)
        .post('/api/escala/lote')
        .send({ eventoId: 'evt-1', funcionarioIds: muitosIds });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Número máximo');
    });
  });

  describe('listarDisponiveis (GET /api/escala/disponiveis/:eventoId)', () => {
    test('deve listar funcionário SEM escala no mesmo dia como disponível', async () => {
      Evento.findOne.mockResolvedValue(mockEvento);

      // Primeira consulta: escalas neste evento → vazia
      // Segunda consulta: escalas em outros eventos no mesmo dia → vazia
      Escala.findAll
        .mockResolvedValueOnce([]) // jaEscalados
        .mockResolvedValueOnce([]); // escalasOutrosEventos

      Funcionario.findAll.mockResolvedValue([
        { id: 'func-1', nome: 'João Silva', funcao: { id: 'fn-1', nome: 'Garçom' } },
        { id: 'func-2', nome: 'Maria Souza', funcao: { id: 'fn-2', nome: 'Cozinheiro' } },
      ]);

      const res = await request(app)
        .get('/api/escala/disponiveis/evt-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
    });

    test('deve listar funcionário COM escala no mesmo dia COM gap >= 2h como disponível', async () => {
      // Evento principal: 08:00-10:00
      // Outro evento: 14:00-16:00 → gap 4h >= 2h → SEM CONFLITO
      Evento.findOne.mockResolvedValue(mockEvento);

      Escala.findAll
        .mockResolvedValueOnce([]) // jaEscalados neste evento → vazio
        .mockResolvedValueOnce([   // escalasOutrosEventos
          {
            funcionarioId: 'func-1',
            eventoId: 'evt-2',
            evento: {
              id: 'evt-2',
              nome: 'Evento Distante',
              dataEvento: '2026-01-01T14:00:00.000Z',
              horarioTermino: '2026-01-01T16:00:00.000Z',
            },
          },
        ]);

      // Como gap >= 2h, func-1 NÃO está em idsComConflito
      // idsIndisponiveis = [] (vazio)
      Funcionario.findAll.mockResolvedValue([
        { id: 'func-1', nome: 'João Silva', funcao: { id: 'fn-1', nome: 'Garçom' } },
      ]);

      const res = await request(app)
        .get('/api/escala/disponiveis/evt-1');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    test('deve listar funcionário COM escala no mesmo dia COM gap < 2h como indisponível', async () => {
      // Evento principal: 08:00-10:00
      // Outro evento: 11:00-13:00 → gap 1h < 2h → CONFLITO
      Evento.findOne.mockResolvedValue(mockEvento);

      Escala.findAll
        .mockResolvedValueOnce([]) // jaEscalados neste evento → vazio
        .mockResolvedValueOnce([   // escalasOutrosEventos
          {
            funcionarioId: 'func-1',
            eventoId: 'evt-2',
            evento: {
              id: 'evt-2',
              nome: 'Evento Conflitante',
              dataEvento: '2026-01-01T11:00:00.000Z',
              horarioTermino: '2026-01-01T13:00:00.000Z',
            },
          },
        ]);

      // func-1 tem conflito → está em idsComConflito → idsIndisponiveis = ['func-1']
      // Funcionario.findAll deve ser chamado com where excluindo func-1
      Funcionario.findAll.mockResolvedValue([]); // nenhum disponível

      const res = await request(app)
        .get('/api/escala/disponiveis/evt-1');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    test('deve retornar 404 se evento não for encontrado', async () => {
      Evento.findOne.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/escala/disponiveis/evt-inexistente');

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('não encontrado');
    });
  });

  describe('intervalo mínimo configurável', () => {
    const escalaUmaHoraDepois = {
      id: 'esc-outro',
      funcionarioId: 'func-1',
      eventoId: 'evt-2',
      evento: {
        id: 'evt-2',
        nome: 'Outro Evento',
        dataEvento: '2026-01-01T11:00:00.000Z',
        horarioTermino: '2026-01-01T13:00:00.000Z',
      },
    };

    test('com intervalo de 30min do buffet, 1h de folga não é conflito', async () => {
      usuarioAtual = { empresaId: 'emp-1', role: 'gerente' };
      Empresa.findOne.mockResolvedValue({ intervaloEscalaMin: 30 });
      Evento.findOne.mockResolvedValue(mockEvento);
      Funcionario.findOne.mockResolvedValue(mockFuncionario);
      Escala.findAll.mockResolvedValue([escalaUmaHoraDepois]);
      Escala.escalaPorFiltro.mockResolvedValue(null);
      Escala.create.mockResolvedValue({ id: 'esc-1' });
      Escala.escalaPorId.mockResolvedValue(mockEscalaCriada);

      const res = await request(app).post('/api/escala').send({ eventoId: 'evt-1', funcionarioId: 'func-1' });

      expect(res.status).toBe(201);
    });

    test('com intervalo de 3h do buffet, a mensagem mostra 3h', async () => {
      usuarioAtual = { empresaId: 'emp-1', role: 'gerente' };
      Empresa.findOne.mockResolvedValue({ intervaloEscalaMin: 180 });
      Evento.findOne.mockResolvedValue(mockEvento);
      Funcionario.findOne.mockResolvedValue(mockFuncionario);
      Escala.findAll.mockResolvedValue([escalaUmaHoraDepois]);

      const res = await request(app).post('/api/escala').send({ eventoId: 'evt-1', funcionarioId: 'func-1' });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain('intervalo mínimo de 3h');
    });
  });

  describe('app mobile: confirmação e check-in', () => {
    const agora = Date.now();
    const escalaPropria = (evento, extra = {}) => ({
      id: 'esc-1',
      funcionarioId: 'func-1',
      checkinEm: null,
      confirmadoEm: null,
      evento,
      update: jest.fn(),
      ...extra,
    });
    const eventoFuturo = {
      dataEvento: new Date(agora + 2 * 60 * 60 * 1000),
      horarioTermino: new Date(agora + 6 * 60 * 60 * 1000),
    };

    beforeEach(() => {
      usuarioAtual = { empresaId: 'emp-1', role: 'operador', funcionarioId: 'func-1' };
    });

    test('confirma presença na própria escala', async () => {
      const escala = escalaPropria(eventoFuturo);
      Escala.escalaPorId.mockResolvedValue(escala);

      const res = await request(app).patch('/api/escala/esc-1/confirmacao').send({ resposta: 'confirmado' });

      expect(res.status).toBe(200);
      expect(escala.update).toHaveBeenCalledWith(expect.objectContaining({ confirmacao: 'confirmado' }));
      expect(Escala.escalaPorId).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'esc-1', funcionarioId: 'func-1' } })
      );
    });

    test('resposta inválida devolve 400', async () => {
      const res = await request(app).patch('/api/escala/esc-1/confirmacao').send({ resposta: 'talvez' });
      expect(res.status).toBe(400);
    });

    test('escala de outra pessoa devolve 404', async () => {
      Escala.escalaPorId.mockResolvedValue(null);
      const res = await request(app).patch('/api/escala/esc-1/confirmacao').send({ resposta: 'confirmado' });
      expect(res.status).toBe(404);
    });

    test('conta sem funcionário vinculado não confirma', async () => {
      usuarioAtual = { empresaId: 'emp-1', role: 'gerente' };
      const res = await request(app).patch('/api/escala/esc-1/confirmacao').send({ resposta: 'confirmado' });
      expect(res.status).toBe(404);
    });

    test('check-in dentro da janela (até 3h antes) confirma presença', async () => {
      const escala = escalaPropria(eventoFuturo);
      Escala.escalaPorId.mockResolvedValue(escala);

      const res = await request(app).post('/api/escala/esc-1/checkin');

      expect(res.status).toBe(200);
      expect(escala.update).toHaveBeenCalledWith(
        expect.objectContaining({ checkinEm: expect.any(Date), confirmacao: 'confirmado' })
      );
    });

    test('check-in muito antes do evento é recusado', async () => {
      Escala.escalaPorId.mockResolvedValue(escalaPropria({
        dataEvento: new Date(agora + 5 * 60 * 60 * 1000),
        horarioTermino: new Date(agora + 8 * 60 * 60 * 1000),
      }));

      const res = await request(app).post('/api/escala/esc-1/checkin');

      expect(res.status).toBe(409);
    });

    test('check-in repetido é recusado', async () => {
      Escala.escalaPorId.mockResolvedValue(escalaPropria(eventoFuturo, { checkinEm: new Date() }));
      const res = await request(app).post('/api/escala/esc-1/checkin');
      expect(res.status).toBe(409);
    });
  });

  describe('listarMinhas (GET /api/escala/minhas)', () => {
    test('usa a função da escala e, sem ela, a do cadastro', async () => {
      usuarioAtual = { empresaId: 'emp-1', role: 'operador', funcionarioId: 'func-1' };
      const garcom = { id: 'f-g', nome: 'Garçom', modulo: 'garcom' };
      const porteiro = { id: 'f-p', nome: 'Recepcionista', modulo: 'portaria' };
      Escala.findAll.mockResolvedValue([
        { toJSON: () => ({ id: 'e1', funcao: porteiro, funcionario: { id: 'func-1', funcao: garcom } }) },
        { toJSON: () => ({ id: 'e2', funcao: null, funcionario: { id: 'func-1', funcao: garcom } }) },
      ]);

      const res = await request(app).get('/api/escala/minhas');

      expect(res.status).toBe(200);
      expect(res.body.data[0].funcao.modulo).toBe('portaria');
      expect(res.body.data[1].funcao.modulo).toBe('garcom');
      expect(res.body.data[0].funcionario).toBeUndefined();
    });
  });
});
