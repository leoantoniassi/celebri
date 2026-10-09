// ============================================================
// Controller: Orçamentos
// ============================================================
const { Op } = require("sequelize");
const {
  Orcamento,
  Cliente,
  Local,
  OrcamentoProduto,
  Produto,
  CategoriaProduto,
  Evento,
} = require("../models");
const { isValidUUID, gerarWarningPessoas } = require('../utils/validators');
const { gerarLinkWhatsApp } = require('../utils/whatsapp');
const { saudacaoWhatsapp } = require('../utils/brand');
const { garantirExistenciaNoTenant, erroFiltroUuid } = require('../utils/tenantFk');

function respostaNaoEncontrado(res, mensagem = "Orçamento não encontrado.") {
  return res.status(404).json({ success: false, message: mensagem });
}

function respostaErro(res, statusCode, mensagem) {
  return res.status(statusCode).json({ success: false, message: mensagem });
}


const includesLista = [
  { model: Cliente, as: "cliente", attributes: ["id", "nome", "email", "telefone"] },
  { model: Local,   as: "local",   attributes: ["id", "nome", "cidade", "estado"] },
];

// GET /api/orcamentos
async function listar(req, res, next) {
  try {
    const { page = 1, limit = 20, status, localId, incluirReprovados } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let scope = 'defaultScope';
    const where = {};
    if (incluirReprovados === 'true') {
      scope = 'comDeletados';
      where.status = 'reprovado';
    } else if (status) {
      where.status = status;
    }
    if (localId) {
      where.localId = localId;
    }

    if (typeof status !== 'undefined' && typeof status !== 'string') {
      return respostaErro(res, 400, "Status inválido.");
    }
    const erroLocal = erroFiltroUuid(localId, 'Local');
    if (erroLocal) {
      return respostaErro(res, 400, erroLocal);
    }

    const { count, rows } = await Orcamento.scope(scope).findAndCountAll({
      where,
      include: includesLista,
      limit: limitNum,
      offset,
      order: [["criadoEm", "DESC"]],
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

// GET /api/orcamentos/:id
async function buscarPorId(req, res, next) {
  try {
    const orcamento = await Orcamento.findOne({
      where: { id: req.params.id },
      include: [
        ...includesLista,
        {
          model: OrcamentoProduto,
          as: "orcamentoProdutos",
          separate: true,
          include: [{ model: Produto, as: "produto", include: [{ model: CategoriaProduto, as: 'categoria' }] }],
        },
      ],
    });

    if (!orcamento) {
      return respostaNaoEncontrado(res);
    }

    return res.json({ success: true, data: orcamento });
  } catch (error) {
    return next(error);
  }
}

const includesOrcamentoDetalhado = [
  { model: Cliente, as: "cliente", attributes: ["id", "nome"] },
  { model: Local,   as: "local",   attributes: ["id", "nome", "cidade", "estado"] },
  { model: OrcamentoProduto, as: "orcamentoProdutos", separate: true, include: [{ model: Produto, as: "produto" }] },
];

// POST /api/orcamentos
async function criar(req, res, next) {
  try {
    const {
      clienteId,
      localId,
      nome,
      valorTotal,
      dataValidade,
      dataEvento,
      horarioTermino,
      qtdPessoas,
      qtdAdultos,
      qtdCriancas,
      qtdBebes,
      observacoes,
      produtos,
    } = req.body;

    if (!clienteId || !nome || !dataEvento || !horarioTermino) {
      return respostaErro(res, 400, "Cliente, nome, data do evento e horário de término são obrigatórios.");
    }

    const somaConvidados = (qtdAdultos || 0) + (qtdCriancas || 0) + (qtdBebes || 0);
    const finalQtdPessoas = somaConvidados > 0 ? somaConvidados : (qtdPessoas || 0);

    if (finalQtdPessoas < 0) {
      return respostaErro(res, 400, "O campo Total de Pessoas deve ser um número não negativo.");
    }

    await garantirExistenciaNoTenant(Cliente, clienteId, 'Cliente');
    await garantirExistenciaNoTenant(Local, localId, 'Local');
    if (produtos !== undefined && !Array.isArray(produtos)) {
      return respostaErro(res, 400, "Lista de produtos inválida.");
    }
    for (const p of produtos || []) {
      if (!p || !p.produtoId) return respostaErro(res, 400, "Produto inválido.");
      await garantirExistenciaNoTenant(Produto, p.produtoId, 'Produto');
    }

    const erroData = validarDatas(dataEvento, horarioTermino);
    if (erroData) return respostaErro(res, 400, erroData);

    const orcamento = await Orcamento.create({
      clienteId,
      localId: localId || null,
      nome,
      valorTotal: valorTotal || 0,
      dataValidade: (dataValidade && dataValidade !== '') ? dataValidade : null,
      dataEvento,
      horarioTermino,
      qtdPessoas: finalQtdPessoas,
      qtdAdultos: qtdAdultos || 0,
      qtdCriancas: qtdCriancas || 0,
      qtdBebes: qtdBebes || 0,
      status: "pendente",
      observacoes,
    });

    if (produtos?.length > 0) {
      await OrcamentoProduto.bulkCreate(
        produtos.map((p) => ({
          orcamentoId: orcamento.id,
          produtoId:   p.produtoId,
          quantidade:  p.quantidade  || 0,
          precoUnitario: p.precoUnitario || 0,
        }))
      );
    }

    await orcamento.reload({ include: includesOrcamentoDetalhado });
    
    let warning = gerarWarningPessoas(qtdPessoas, qtdAdultos, qtdCriancas, qtdBebes, "no orçamento") || undefined;

    return res.status(201).json({
      success: true,
      message: "Orçamento criado com sucesso!",
      data: orcamento,
      warning,
    });
  } catch (error) {
    return next(error);
  }
}

function pickDefined(obj, keys) {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});
}

function validarDatas(dataEvento, horarioTermino) {
  if (dataEvento && horarioTermino && new Date(horarioTermino) <= new Date(dataEvento)) {
    return "Horário de término deve ser posterior à data de início do evento.";
  }
  return null;
}

// PUT /api/orcamentos/:id
async function atualizar(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return respostaErro(res, 400, "ID do orçamento inválido.");
    }

    const orcamento = await Orcamento.findOne({ where: { id: req.params.id } });
    if (!orcamento) {
      return respostaNaoEncontrado(res);
    }

    const { clienteId, localId, nome, valorTotal, dataValidade, dataEvento, horarioTermino, qtdPessoas, qtdAdultos, qtdCriancas, qtdBebes, observacoes } = req.body;

    await garantirExistenciaNoTenant(Cliente, clienteId, 'Cliente');
    await garantirExistenciaNoTenant(Local, localId, 'Local');

    if (qtdPessoas !== undefined && (qtdPessoas === null || typeof qtdPessoas !== 'number' || qtdPessoas < 0)) {
      return respostaErro(res, 400, "O campo Total de Pessoas deve ser um número não negativo.");
    }

    const dataEventoFinal = dataEvento !== undefined ? dataEvento : orcamento.dataEvento;
    const horarioTerminoFinal = horarioTermino !== undefined ? horarioTermino : orcamento.horarioTermino;
    const erroData = validarDatas(dataEventoFinal, horarioTerminoFinal);
    if (erroData) return respostaErro(res, 400, erroData);

    const novaQtdAdultos = qtdAdultos !== undefined ? qtdAdultos : orcamento.qtdAdultos;
    const novaQtdCriancas = qtdCriancas !== undefined ? qtdCriancas : orcamento.qtdCriancas;
    const novaQtdBebes = qtdBebes !== undefined ? qtdBebes : orcamento.qtdBebes;
    const somaConvidados = (novaQtdAdultos || 0) + (novaQtdCriancas || 0) + (novaQtdBebes || 0);
    const finalQtdPessoas = somaConvidados > 0 ? somaConvidados : (qtdPessoas !== undefined ? qtdPessoas : orcamento.qtdPessoas);

    const updates = pickDefined(
      { clienteId, localId, nome, valorTotal, dataValidade: (dataValidade && dataValidade !== '') ? dataValidade : null, dataEvento, horarioTermino, qtdPessoas: finalQtdPessoas, qtdAdultos: novaQtdAdultos, qtdCriancas: novaQtdCriancas, qtdBebes: novaQtdBebes, observacoes },
      ['clienteId', 'localId', 'nome', 'valorTotal', 'dataValidade', 'dataEvento', 'horarioTermino', 'qtdPessoas', 'qtdAdultos', 'qtdCriancas', 'qtdBebes', 'observacoes']
    );
    updates.atualizadoEm = new Date();

    await orcamento.update(updates);

    let warning = gerarWarningPessoas(finalQtdPessoas, novaQtdAdultos, novaQtdCriancas, novaQtdBebes, "no orçamento") || undefined;

    return res.json({
      success: true,
      message: "Orçamento atualizado com sucesso!",
      data: orcamento,
      warning,
    });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/orcamentos/:id/status
async function mudarStatus(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return respostaErro(res, 400, "ID do orçamento inválido.");
    }
    const orcamento = await Orcamento.findOne({ where: { id: req.params.id } });
    if (!orcamento) {
      return respostaNaoEncontrado(res);
    }

    const { status } = req.body;
    if (!["pendente", "aprovado", "reprovado"].includes(status)) {
      return respostaErro(res, 400, "Status inválido. Use: pendente, aprovado ou reprovado.");
    }

    await orcamento.update({ status, atualizadoEm: new Date() });

    return res.json({
      success: true,
      message: `Orçamento ${status} com sucesso!`,
      data: orcamento,
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/orcamentos/:id (soft delete)
async function remover(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return respostaErro(res, 400, "ID do orçamento inválido.");
    }
    const orcamento = await Orcamento.findOne({ where: { id: req.params.id } });
    if (!orcamento) {
      return respostaNaoEncontrado(res);
    }

    await orcamento.update({ deletadoEm: new Date() });

    return res.json({
      success: true,
      message: "Orçamento removido com sucesso!",
    });
  } catch (error) {
    return next(error);
  }
}

// Confirma o orçamento e envia para Eventos
async function confirmarOrcamento(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return respostaErro(res, 400, "ID do orçamento inválido.");
    }

    const orcamento = await Orcamento.findOne({
      where: { id: req.params.id },
      include: [{ model: Cliente, as: "cliente" }],
    });

    if (!orcamento) {
      return respostaNaoEncontrado(res);
    }

    if (!orcamento.dataEvento || !orcamento.horarioTermino) {
      return respostaErro(res, 400, "O orçamento precisa ter data e horário de início e término definidos para ser convertido em evento.");
    }

    const erroData = validarDatas(orcamento.dataEvento, orcamento.horarioTermino);
    if (erroData) return respostaErro(res, 400, erroData);

    const evento = await Evento.create({
      orcamentoId:    orcamento.id,
      clienteId:      orcamento.clienteId,
      localId:        orcamento.localId || null,
      nome:           orcamento.nome || `Evento de ${orcamento.cliente ? orcamento.cliente.nome : "Cliente"}`,
      dataEvento:     orcamento.dataEvento,
      horarioTermino: orcamento.horarioTermino,
      qtdPessoas:     orcamento.qtdPessoas || 0,
      qtdAdultos:     orcamento.qtdAdultos || 0,
      qtdCriancas:    orcamento.qtdCriancas || 0,
      qtdBebes:       orcamento.qtdBebes || 0,
      observacoes:    orcamento.observacoes,
      valorOrcamento: orcamento.valorTotal || 0,
      status:         "pendente",
    });

    await orcamento.update({
      status:       "aprovado",
      deletadoEm:   new Date(),
      atualizadoEm: new Date(),
    });

    return res.json({
      success: true,
      message: "Orçamento enviado para eventos com sucesso!",
      data: evento,
    });
  } catch (error) {
    return next(error);
  }
}

// Rejeita o orçamento e o remove
async function rejeitarOrcamento(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return respostaErro(res, 400, "ID do orçamento inválido.");
    }

    const orcamento = await Orcamento.findOne({ where: { id: req.params.id } });
    if (!orcamento) {
      return respostaNaoEncontrado(res);
    }

    // Impede rejeição de orçamentos já aprovados (integridade do fluxo de negócio)
    if (orcamento.status === "aprovado") {
      return respostaErro(res, 400, "Orçamento já aprovado não pode ser rejeitado.");
    }

    await orcamento.update({ status: "reprovado", deletadoEm: new Date() });

    return res.json({
      success: true,
      message: "Orçamento rejeitado e removido com sucesso!",
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/orcamentos/:id/whatsapp
async function whatsapp(req, res, next) {
  try {
    const orcamento = await Orcamento.findOne({
      where: { id: req.params.id },
      include: [{ model: Cliente, as: 'cliente' }]
    });

    if (!orcamento) {
      return respostaNaoEncontrado(res);
    }

    if (!orcamento.cliente || !orcamento.cliente.telefone) {
      return respostaErro(res, 400, "Cliente do orçamento não possui telefone cadastrado.");
    }

    const link = gerarLinkWhatsApp(
      orcamento.cliente.telefone,
      await saudacaoWhatsapp(orcamento.cliente.nome, 'falando sobre o seu orçamento')
    );

    return res.json({
      success: true,
      data: { link, telefone: orcamento.cliente.telefone },
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
  confirmarOrcamento,
  rejeitarOrcamento,
  whatsapp,
};
