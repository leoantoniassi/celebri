// ============================================================
// Controller: Eventos
// ============================================================
const { Op } = require("sequelize");
const {
  Evento,
  Cliente,
  Local,
  Orcamento,
  Funcionario,
  Funcao,
  Escala,
  EventoProduto,
  Produto,
  CategoriaProduto,
  Documento,
} = require("../models");
const { gerarLinkWhatsApp } = require('../utils/whatsapp');
const { fail, warning } = require('../utils/response');
const { isValidUUID, gerarWarningPessoas } = require('../utils/validators');
const { saudacaoWhatsapp } = require('../utils/brand');
const { garantirExistenciaNoTenant, erroFiltroUuid } = require('../utils/tenantFk');
const { ehFuncionarioDeCampo } = require('../middleware/papelAdministrativo');

// ─── Funções auxiliares (DRY) ──────────────────────────────────

function gerarWarningCapacidade(local, qtdPessoas) {
  if (!local || !local.capacidadeMaxima || qtdPessoas === undefined || qtdPessoas === null) return null;
  if (typeof qtdPessoas !== 'number' || Number.isNaN(qtdPessoas) || qtdPessoas < 0) return null;
  if (qtdPessoas > local.capacidadeMaxima) {
    return `A quantidade de convidados (${qtdPessoas}) excede a capacidade máxima do local "${local.nome}" (${local.capacidadeMaxima} pessoas).`;
  }
  return null;
}


function validarHorarioTermino(horarioTermino, dataEvento) {
  const horario = new Date(horarioTermino);
  const data = new Date(dataEvento);
  if (Number.isNaN(horario.getTime())) {
    return 'Horário de término fornecido não é uma data válida.';
  }
  if (Number.isNaN(data.getTime())) {
    return 'Data do evento fornecida não é uma data válida.';
  }
  if (horario <= data) {
    return 'O horário de término deve ser maior que a data/hora de início do evento.';
  }
  return null;
}

function coalesce(valor, padrao) {
  return valor !== undefined ? valor : padrao;
}

async function buscarValorOrcamento(orcamentoId) {
  if (!orcamentoId) return null;
  const orcamento = await Orcamento.findOne({ where: { id: orcamentoId } });
  return orcamento ? Number(orcamento.valorTotal) : null;
}

// GET /api/eventos
async function listar(req, res, next) {
  try {
    // Auto-concluir eventos cuja data já passou
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    await Evento.update(
      { status: 'concluido', atualizadoEm: new Date() },
      {
        where: {
          dataEvento: { [Op.lt]: hoje },
          status: 'pendente',
          deletadoEm: null,
        },
      }
    );

    const { page = 1, limit = 20, status, localId, incluirConcluidos, incluirCancelados } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    if (status !== undefined && typeof status !== 'string') {
      return res.status(400).json({ success: false, message: 'Status inválido.' });
    }
    const erroLocal = erroFiltroUuid(localId, 'Local');
    if (erroLocal) {
      return res.status(400).json({ success: false, message: erroLocal });
    }

    const where = { deletadoEm: null };
    if (ehFuncionarioDeCampo(req.user)) {
      // Campo só lista os eventos em que está escalado (e não recusou).
      const escalas = await Escala.findAll({
        where: { funcionarioId: req.user.funcionarioId, confirmacao: { [Op.ne]: 'recusado' } },
        attributes: ['eventoId'],
      });
      where.id = { [Op.in]: escalas.map((e) => e.eventoId) };
    }
    if (status) {
      where.status = status;
    } else {
      const excluded = [];
      if (incluirConcluidos !== 'true') excluded.push('concluido');
      if (incluirCancelados !== 'true') excluded.push('cancelado');
      
      if (excluded.length > 0) {
        where.status = { [Op.notIn]: excluded };
      }
    }
    if (localId) {
      where.localId = localId;
    }

    const { count, rows } = await Evento.findAndCountAll({
      where,
      include: [
        { model: Cliente, as: "cliente", attributes: ["id", "nome"] },
        { model: Local,   as: "local",   attributes: ["id", "nome", "cidade", "estado", "capacidadeMaxima"] },
      ],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      order: [["dataEvento", "ASC"]],
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/eventos/:id
async function buscarPorId(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do evento inválido.' });
    }
    // Funcionário de campo vê o que precisa para trabalhar: sem valores,
    // orçamento, documentos do cliente nem contatos de clientes e colegas.
    const campo = ehFuncionarioDeCampo(req.user);
    const evento = await Evento.findOne({
      where: { id: req.params.id },
      ...(campo && { attributes: { exclude: ['valorOrcamento', 'orcamentoId'] } }),
      include: [
        {
          model: Cliente,
          as: "cliente",
          attributes: campo ? ["id", "nome"] : ["id", "nome", "email", "telefone"],
        },
        {
          model: Local,
          as: "local",
        },
        ...(campo ? [] : [{ model: Orcamento, as: "orcamento" }]),
        {
          model: Escala,
          as: "escala",
          separate: true,
          include: [{
            model: Funcionario,
            as: "funcionario",
            ...(campo && { attributes: ["id", "nome", "funcaoId"] }),
            include: [{ model: Funcao, as: 'funcao' }],
          }],
        },
        {
          model: EventoProduto,
          as: "eventoProdutos",
          separate: true,
          include: [{ model: Produto, as: "produto", include: [{ model: CategoriaProduto, as: 'categoria' }] }],
        },
        ...(campo ? [] : [{ model: Documento, as: "documentos" }]),
      ],
    });

    if (!evento) {
      return res.status(404).json({
        success: false,
        message: "Evento não encontrado.",
      });
    }

    return res.json({ success: true, data: evento });
  } catch (error) {
    return next(error);
  }
}

// POST /api/eventos
async function criar(req, res, next) {
  try {
    const {
      clienteId,
      orcamentoId,
      localId,
      nome,
      dataEvento,
      horarioTermino,
      status,
      qtdPessoas,
      qtdAdultos,
      qtdCriancas,
      qtdBebes,
      observacoes,
    } = req.body;

    let { orcamento: orcamentoValor } = req.body;

    if (!clienteId || !nome || !dataEvento || !horarioTermino) {
      return res.status(400).json({
        success: false,
        message: "Cliente, nome, data do evento e horário de término são obrigatórios.",
      });
    }

    if (typeof horarioTermino !== 'string' && typeof horarioTermino !== 'number' && !(horarioTermino instanceof Date)) {
      return res.status(400).json({ success: false, message: 'Horário de término deve ser uma data válida.' });
    }
    const erroTermino = validarHorarioTermino(horarioTermino, dataEvento);
    if (erroTermino) {
      return res.status(400).json({ success: false, message: erroTermino });
    }

    const statusFinal = status || "pendente";
    if (!["pendente", "concluido", "cancelado"].includes(statusFinal)) {
      return res.status(400).json({
        success: false,
        message: "Status inválido. Use: pendente, concluido ou cancelado.",
      });
    }

    const somaConvidados = (qtdAdultos || 0) + (qtdCriancas || 0) + (qtdBebes || 0);
    const finalQtdPessoas = somaConvidados > 0 ? somaConvidados : (qtdPessoas || 0);

    if (finalQtdPessoas < 0) {
      return res.status(400).json({
        success: false,
        message: "O campo Total de Pessoas deve ser um número não negativo.",
      });
    }

    const camposNumericos = { qtdPessoas, qtdAdultos, qtdCriancas, qtdBebes };
    for (const [chave, valor] of Object.entries(camposNumericos)) {
      if (valor !== undefined && valor !== null && (typeof valor !== 'number' || Number.isNaN(valor) || valor < 0)) {
        return res.status(400).json({
          success: false,
          message: `O campo ${chave} deve ser um número não negativo.`,
        });
      }
    }

    await garantirExistenciaNoTenant(Cliente, clienteId, 'Cliente');
    await garantirExistenciaNoTenant(Orcamento, orcamentoId, 'Orçamento');

    let warnings = [];

    if (localId) {
      const localExiste = await garantirExistenciaNoTenant(Local, localId, 'Local');
      const warnCapacidade = gerarWarningCapacidade(localExiste, finalQtdPessoas);
      if (warnCapacidade) warnings.push(warnCapacidade);
    }
    
    const warnPessoas = gerarWarningPessoas(finalQtdPessoas, qtdAdultos, qtdCriancas, qtdBebes);
    if (warnPessoas) warnings.push(warnPessoas);
    
    let warning = warnings.length > 0 ? warnings.join(' ') : undefined;

    if (orcamentoId) {
      const valorDb = await buscarValorOrcamento(orcamentoId);
      if (valorDb !== null) orcamentoValor = valorDb;
    }

    // (Removido: evento confirmado requer orçamento aprovado)

    const evento = await Evento.create({
      clienteId,
      orcamentoId: orcamentoId || null,
      localId:     localId     || null,
      nome,
      dataEvento,
      horarioTermino,
      status: statusFinal,
      qtdPessoas: finalQtdPessoas,
      qtdAdultos,
      qtdCriancas,
      qtdBebes,
      valorOrcamento: orcamentoValor || 0,
      observacoes,
    });

    return res.status(201).json({
      success: true,
      message: "Evento criado com sucesso!",
      data: evento,
      warning,
    });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/eventos/:id
async function atualizar(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do evento inválido.' });
    }
    const evento = await Evento.findOne({ where: { id: req.params.id } });
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: "Evento não encontrado.",
      });
    }

    const {
      clienteId,
      orcamentoId,
      localId,
      nome,
      dataEvento,
      horarioTermino,
      qtdPessoas,
      qtdAdultos,
      qtdCriancas,
      qtdBebes,
      observacoes,
    } = req.body;

    let { orcamento: orcamentoValor } = req.body;

    let warnings = [];

    if (horarioTermino !== undefined) {
      if (typeof horarioTermino !== 'string' && typeof horarioTermino !== 'number' && !(horarioTermino instanceof Date)) {
        return res.status(400).json({ success: false, message: 'Horário de término deve ser uma data válida.' });
      }
      const dataRef = dataEvento || evento.dataEvento;
      const erroTermino = validarHorarioTermino(horarioTermino, dataRef);
      if (erroTermino) {
        return res.status(400).json({ success: false, message: erroTermino });
      }
    }

    const novaQtdAdultos = qtdAdultos !== undefined ? qtdAdultos : evento.qtdAdultos;
    const novaQtdCriancas = qtdCriancas !== undefined ? qtdCriancas : evento.qtdCriancas;
    const novaQtdBebes = qtdBebes !== undefined ? qtdBebes : evento.qtdBebes;

    const somaConvidados = (novaQtdAdultos || 0) + (novaQtdCriancas || 0) + (novaQtdBebes || 0);
    const finalQtdPessoas = somaConvidados > 0 ? somaConvidados : (qtdPessoas !== undefined ? qtdPessoas : evento.qtdPessoas);

    await garantirExistenciaNoTenant(Cliente, clienteId, 'Cliente');
    await garantirExistenciaNoTenant(Orcamento, orcamentoId, 'Orçamento');

    if (localId !== undefined && localId !== null) {
      const localExiste = await garantirExistenciaNoTenant(Local, localId, 'Local');
      const warnCapacidade = gerarWarningCapacidade(localExiste, finalQtdPessoas);
      if (warnCapacidade) warnings.push(warnCapacidade);
    } else if (evento.localId) {
      const localAtual = await Local.findOne({ where: { id: evento.localId } });
      if (localAtual) {
        const warnCapacidade = gerarWarningCapacidade(localAtual, finalQtdPessoas);
        if (warnCapacidade) warnings.push(warnCapacidade);
      }
    }

    const warnPessoas = gerarWarningPessoas(finalQtdPessoas, novaQtdAdultos, novaQtdCriancas, novaQtdBebes);
    if (warnPessoas) warnings.push(warnPessoas);

    let warning = warnings.length > 0 ? warnings.join(' ') : undefined;

    const novoOrcamentoId = orcamentoId ? orcamentoId : orcamentoId === "" ? null : evento.orcamentoId;
    if (orcamentoId && orcamentoId !== evento.orcamentoId) {
      const valorDb = await buscarValorOrcamento(orcamentoId);
      if (valorDb !== null) orcamentoValor = valorDb;
    }

    const novaPessoas = qtdPessoas !== undefined ? qtdPessoas : evento.qtdPessoas;

    await evento.update({
      clienteId:      coalesce(clienteId, evento.clienteId),
      orcamentoId:    novoOrcamentoId,
      localId:        coalesce(localId, evento.localId),
      nome:           coalesce(nome, evento.nome),
      dataEvento:     coalesce(dataEvento, evento.dataEvento),
      horarioTermino: coalesce(horarioTermino, evento.horarioTermino),
      qtdPessoas:     finalQtdPessoas,
      qtdAdultos:     coalesce(qtdAdultos, evento.qtdAdultos),
      qtdCriancas:    coalesce(qtdCriancas, evento.qtdCriancas),
      qtdBebes:       coalesce(qtdBebes, evento.qtdBebes),
      valorOrcamento: coalesce(orcamentoValor, evento.valorOrcamento),
      observacoes:    coalesce(observacoes, evento.observacoes),
      atualizadoEm:   new Date(),
    });

    return res.json({
      success: true,
      message: "Evento atualizado com sucesso!",
      data: evento,
      warning,
    });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/eventos/:id/status
async function mudarStatus(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do evento inválido.' });
    }
    const evento = await Evento.findOne({ where: { id: req.params.id } });
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: "Evento não encontrado.",
      });
    }

    const { status } = req.body;
    if (!["pendente", "concluido", "cancelado"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status inválido. Use: pendente, concluido ou cancelado.",
      });
    }

    await evento.update({ status, atualizadoEm: new Date() });

    return res.json({
      success: true,
      message: `Status do evento alterado para "${status}"!`,
      data: evento,
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/eventos/:id (soft delete)
async function remover(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do evento inválido.' });
    }
    const evento = await Evento.findOne({ where: { id: req.params.id } });
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: "Evento não encontrado.",
      });
    }

    const agora = new Date();
    const dataEvento = new Date(evento.dataEvento);

    if (dataEvento > agora && req.query.force !== 'true') {
      const dataFormatada = dataEvento.toLocaleDateString('pt-BR');
      return warning(res, `Este evento ainda não ocorreu (previsto para ${dataFormatada}). Tem certeza que deseja excluí-lo?`);
    }

    await evento.update({ deletadoEm: new Date() });

    return res.json({
      success: true,
      message: "Evento removido com sucesso!",
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/eventos/:id/whatsapp
async function whatsapp(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do evento inválido.' });
    }
    const evento = await Evento.findOne({
      where: { id: req.params.id },
      include: [{ model: Cliente, as: 'cliente' }]
    });

    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento não encontrado.',
      });
    }

    if (!evento.cliente || !evento.cliente.telefone) {
      return res.status(400).json({
        success: false,
        message: 'Cliente do evento não possui telefone cadastrado.',
      });
    }

    const link = gerarLinkWhatsApp(
      evento.cliente.telefone,
      await saudacaoWhatsapp(evento.cliente.nome, `falando sobre o evento "${evento.nome}"`)
    );

    return res.json({
      success: true,
      data: { link, telefone: evento.cliente.telefone },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  mudarStatus,
  remover,
  whatsapp,
};
