// ============================================================
// Controller: Escala (Alocação Funcionário ↔ Evento)
// ============================================================
const { Op } = require('sequelize');
const { Escala, Evento, Funcionario, Funcao, Empresa, Local } = require('../models');

const INTERVALO_PADRAO_MIN = 120;
const MAX_ALOCACAO_LOTE = 100; // Limite de funcionários por lote para evitar DoS
const CHECKIN_ANTECEDENCIA_MS = 3 * 60 * 60 * 1000;

function garantirNumeroValido(valor, nome) {
  if (typeof valor !== 'number' || Number.isNaN(valor)) {
    throw new Error(`${nome} inválido(a): não é um número válido.`);
  }
  return valor;
}

/** Folga mínima entre eventos do mesmo funcionário, configurada pelo buffet. */
async function intervaloMinimoMs(req) {
  const empresa = req.user?.empresaId
    ? await Empresa.findOne({ where: { id: req.user.empresaId } })
    : null;
  const minutos = empresa?.intervaloEscalaMin ?? INTERVALO_PADRAO_MIN;
  return minutos * 60 * 1000;
}

function descreverIntervalo(ms) {
  const minutos = Math.round(ms / 60000);
  if (minutos % 60 === 0) return `${minutos / 60}h`;
  return minutos > 60 ? `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, '0')}` : `${minutos}min`;
}

function temConflito(inicioA, fimA, inicioB, fimB, gapMs) {
  return fimB + gapMs > inicioA && fimA + gapMs > inicioB;
}

function mensagemConflito(funcionarioNome, eventoNome, gapMs) {
  return `"${funcionarioNome}" já está alocado no evento "${eventoNome}" neste horário (intervalo mínimo de ${descreverIntervalo(gapMs)} não respeitado).`;
}

function buscarEscalasNoPeriodo(funcionarioId, eventoId, inicioA, fimA, gapMs) {
  return Escala.findAll({
    where: {
      funcionarioId,
      eventoId: { [Op.ne]: eventoId },
    },
    include: [{
      model: Evento,
      as: 'evento',
      where: {
        horarioTermino: { [Op.gt]: new Date(inicioA - gapMs) },
        dataEvento: { [Op.lt]: new Date(fimA + gapMs) },
        deletadoEm: null,
      },
      required: true,
    }],
  });
}

async function funcaoValida(funcaoId) {
  if (!funcaoId) return true;
  return Boolean(await Funcao.findOne({ where: { id: funcaoId } }));
}

// POST /api/escala
async function alocar(req, res, next) {
  try {
    const { eventoId, funcionarioId, observacoes, funcaoId } = req.body;

    if (!eventoId || !funcionarioId) {
      return res.status(400).json({
        success: false,
        message: 'ID do evento e ID do funcionário são obrigatórios.',
      });
    }

    // Verifica se evento existe
    const evento = await Evento.findOne({ where: { id: eventoId } });
    if (!evento) {
      return res.status(404).json({
        success: false,
        message: 'Evento não encontrado.',
      });
    }

    // Verifica se funcionário existe
    const funcionario = await Funcionario.findOne({ where: { id: funcionarioId } });
    if (!funcionario) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado.',
      });
    }

    if (!(await funcaoValida(funcaoId))) {
      return res.status(404).json({ success: false, message: 'Função não encontrada.' });
    }

    // Verifica conflito de horário com o intervalo mínimo do buffet
    const gapMs = await intervaloMinimoMs(req);
    const inicioA = garantirNumeroValido(new Date(evento.dataEvento).getTime(), 'Data de início do evento');
    const fimA = garantirNumeroValido(new Date(evento.horarioTermino).getTime(), 'Horário de término do evento');

    const escalasPeriodo = await buscarEscalasNoPeriodo(funcionarioId, eventoId, inicioA, fimA, gapMs);

    for (const escala of escalasPeriodo) {
      const inicioB = garantirNumeroValido(new Date(escala.evento.dataEvento).getTime(), 'Data de início do evento conflitante');
      const fimB = garantirNumeroValido(new Date(escala.evento.horarioTermino).getTime(), 'Horário de término do evento conflitante');
      if (temConflito(inicioA, fimA, inicioB, fimB, gapMs)) {
        return res.status(409).json({
          success: false,
          message: mensagemConflito(funcionario.nome, escala.evento.nome, gapMs),
        });
      }
    }

    // Verifica se já está alocado neste evento
    const jaAlocado = await Escala.findOne({
      where: { eventoId, funcionarioId },
    });

    if (jaAlocado) {
      return res.status(409).json({
        success: false,
        message: 'Funcionário já está alocado neste evento.',
      });
    }

    const escala = await Escala.create({ eventoId, funcionarioId, observacoes, funcaoId: funcaoId || null });

    // Retorna com dados completos
    const escalaCriada = await Escala.findOne({
      where: { id: escala.id },
      include: [
        { model: Evento, as: 'evento', attributes: ['id', 'nome', 'dataEvento', 'horarioTermino'] },
        { model: Funcionario, as: 'funcionario', attributes: ['id', 'nome', 'funcaoId'] },
      ],
    });

    return res.status(201).json({
      success: true,
      message: 'Funcionário alocado no evento com sucesso!',
      data: escalaCriada,
    });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/escala/:id — muda a função neste evento e as observações
async function atualizar(req, res, next) {
  try {
    const escala = await Escala.findOne({ where: { id: req.params.id } });
    if (!escala) {
      return res.status(404).json({ success: false, message: 'Alocação não encontrada.' });
    }

    const { funcaoId, observacoes } = req.body;
    const alteracoes = { atualizadoEm: new Date() };

    if (funcaoId !== undefined) {
      if (!(await funcaoValida(funcaoId))) {
        return res.status(404).json({ success: false, message: 'Função não encontrada.' });
      }
      alteracoes.funcaoId = funcaoId || null;
    }
    if (observacoes !== undefined) alteracoes.observacoes = observacoes;

    await escala.update(alteracoes);
    return res.json({ success: true, message: 'Escala atualizada!', data: escala });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/escala/:id
async function remover(req, res, next) {
  try {
    const escala = await Escala.findOne({ where: { id: req.params.id } });
    if (!escala) {
      return res.status(404).json({
        success: false,
        message: 'Alocação não encontrada.',
      });
    }

    await escala.update({ deletadoEm: new Date() });

    return res.json({
      success: true,
      message: 'Alocação removida com sucesso!',
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/escala/evento/:eventoId
async function listarPorEvento(req, res, next) {
  try {
    const escalas = await Escala.findAll({
      where: { eventoId: req.params.eventoId },
      include: [
        {
          model: Funcionario,
          as: 'funcionario',
          include: [{ model: Funcao, as: 'funcao', attributes: ['id', 'nome', 'modulo'] }],
        },
        { model: Funcao, as: 'funcao', attributes: ['id', 'nome', 'modulo'] },
      ],
      order: [[{ model: Funcionario, as: 'funcionario' }, 'nome', 'ASC']],
    });

    return res.json({ success: true, data: escalas });
  } catch (error) {
    return next(error);
  }
}

// GET /api/escala/minhas
// Escalas do funcionário vinculado ao usuário logado (app mobile Celebri Staff)
async function listarMinhas(req, res, next) {
  try {
    const { funcionarioId } = req.user;

    if (!funcionarioId) {
      return res.json({
        success: true,
        message: 'Esta conta não está vinculada a um funcionário de campo.',
        data: [],
      });
    }

    const escalas = await Escala.findAll({
      where: { funcionarioId },
      include: [
        {
          model: Evento,
          as: 'evento',
          attributes: ['id', 'nome', 'dataEvento', 'horarioTermino', 'status', 'localId'],
          // O escopo padrão de Local tem `where`, o que tornaria o JOIN
          // obrigatório e esconderia eventos sem local.
          include: [{ model: Local, as: 'local', attributes: ['id', 'nome'], required: false }],
        },
        { model: Funcao, as: 'funcao', attributes: ['id', 'nome', 'modulo'] },
        {
          model: Funcionario,
          as: 'funcionario',
          attributes: ['id'],
          required: false,
          include: [{ model: Funcao, as: 'funcao', attributes: ['id', 'nome', 'modulo'] }],
        },
      ],
      order: [[{ model: Evento, as: 'evento' }, 'dataEvento', 'ASC']],
    });

    const data = escalas.map((escala) => {
      const json = escala.toJSON();
      const funcao = json.funcao || json.funcionario?.funcao || null;
      delete json.funcionario;
      return { ...json, funcao };
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

/** Escala do próprio funcionário logado, com o evento. */
function buscarPropria(req) {
  if (!req.user?.funcionarioId) return null;
  return Escala.findOne({
    where: { id: req.params.id, funcionarioId: req.user.funcionarioId },
    include: [{ model: Evento, as: 'evento', attributes: ['id', 'nome', 'dataEvento', 'horarioTermino'] }],
  });
}

// PATCH /api/escala/:id/confirmacao — funcionário confirma ou recusa pelo app
async function responderConfirmacao(req, res, next) {
  try {
    const { resposta } = req.body;
    if (!['confirmado', 'recusado'].includes(resposta)) {
      return res.status(400).json({ success: false, message: 'Resposta deve ser "confirmado" ou "recusado".' });
    }

    const escala = await buscarPropria(req);
    if (!escala) {
      return res.status(404).json({ success: false, message: 'Escala não encontrada.' });
    }
    if (new Date(escala.evento.horarioTermino) <= new Date()) {
      return res.status(409).json({ success: false, message: 'Este evento já terminou.' });
    }
    if (escala.checkinEm && resposta === 'recusado') {
      return res.status(409).json({ success: false, message: 'Você já fez check-in neste evento.' });
    }

    await escala.update({ confirmacao: resposta, confirmadoEm: new Date(), atualizadoEm: new Date() });
    return res.json({
      success: true,
      message: resposta === 'confirmado' ? 'Presença confirmada!' : 'Recusa registrada.',
      data: escala,
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/escala/:id/checkin — funcionário avisa que chegou ao evento
async function fazerCheckin(req, res, next) {
  try {
    const escala = await buscarPropria(req);
    if (!escala) {
      return res.status(404).json({ success: false, message: 'Escala não encontrada.' });
    }
    if (escala.checkinEm) {
      return res.status(409).json({ success: false, message: 'Check-in já realizado.' });
    }

    const agora = Date.now();
    const inicio = new Date(escala.evento.dataEvento).getTime();
    const fim = new Date(escala.evento.horarioTermino).getTime();
    if (agora < inicio - CHECKIN_ANTECEDENCIA_MS || agora > fim) {
      return res.status(409).json({
        success: false,
        message: 'O check-in abre 3h antes do início do evento e fecha no término.',
      });
    }

    await escala.update({
      checkinEm: new Date(agora),
      confirmacao: 'confirmado',
      confirmadoEm: escala.confirmadoEm || new Date(agora),
      atualizadoEm: new Date(agora),
    });
    return res.json({ success: true, message: 'Check-in realizado!', data: escala });
  } catch (error) {
    return next(error);
  }
}

// GET /api/escala/disponiveis/:eventoId
// Retorna funcionários disponíveis para o evento respeitando o intervalo mínimo
async function listarDisponiveis(req, res, next) {
  try {
    const evento = await Evento.findOne({ where: { id: req.params.eventoId } });
    if (!evento) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado.' });
    }

    const gapMs = await intervaloMinimoMs(req);
    const inicioA = garantirNumeroValido(new Date(evento.dataEvento).getTime(), 'Data de início do evento');
    const fimA = garantirNumeroValido(new Date(evento.horarioTermino).getTime(), 'Horário de término do evento');

    // IDs dos funcionários já escalados neste evento
    const jaEscalados = await Escala.findAll({
      where: { eventoId: req.params.eventoId },
      attributes: ['funcionarioId'],
    });
    const idsJaEscalados = jaEscalados.map(e => e.funcionarioId);

    // Todas as escalas de outros eventos no período de conflito
    const escalasOutrosEventos = await Escala.findAll({
      where: {
        eventoId: { [Op.ne]: req.params.eventoId },
      },
      include: [{
        model: Evento,
        as: 'evento',
        where: {
          horarioTermino: { [Op.gt]: new Date(inicioA - gapMs) },
          dataEvento: { [Op.lt]: new Date(fimA + gapMs) },
          deletadoEm: null,
        },
        required: true,
      }],
      attributes: ['funcionarioId', 'eventoId'],
    });

    // IDs dos funcionários que têm conflito real
    const idsComConflito = new Set();
    for (const escala of escalasOutrosEventos) {
      const inicioB = garantirNumeroValido(new Date(escala.evento.dataEvento).getTime(), 'Data de início do evento conflitante');
      const fimB = garantirNumeroValido(new Date(escala.evento.horarioTermino).getTime(), 'Horário de término do evento conflitante');
      if (temConflito(inicioA, fimA, inicioB, fimB, gapMs)) {
        idsComConflito.add(escala.funcionarioId);
      }
    }

    // Todos os IDs indisponíveis (já escalados neste evento OU com conflito em outro)
    const idsIndisponiveis = [...new Set([...idsJaEscalados, ...idsComConflito])];

    const where = idsIndisponiveis.length > 0
      ? { id: { [Op.notIn]: idsIndisponiveis } }
      : {};

    const disponiveis = await Funcionario.findAll({
      where,
      include: [{ model: Funcao, as: 'funcao', attributes: ['id', 'nome'] }],
      order: [['nome', 'ASC']],
    });

    return res.json({ success: true, data: disponiveis });
  } catch (error) {
    return next(error);
  }
}

// POST /api/escala/lote — aloca vários funcionários de uma vez
async function alocarLote(req, res, next) {
  try {
    const { eventoId, funcionarioIds } = req.body;

    if (!eventoId || !Array.isArray(funcionarioIds) || funcionarioIds.length === 0) {
      return res.status(400).json({ success: false, message: 'eventoId e funcionarioIds[] são obrigatórios.' });
    }

    if (funcionarioIds.length > MAX_ALOCACAO_LOTE) {
      return res.status(400).json({
        success: false,
        message: `Número máximo de ${MAX_ALOCACAO_LOTE} funcionários por lote excedido.`,
      });
    }

    const evento = await Evento.findOne({ where: { id: eventoId } });
    if (!evento) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado.' });
    }

    const gapMs = await intervaloMinimoMs(req);
    const inicioA = garantirNumeroValido(new Date(evento.dataEvento).getTime(), 'Data de início do evento');
    const fimA = garantirNumeroValido(new Date(evento.horarioTermino).getTime(), 'Horário de término do evento');

    const erros = [];
    const criados = [];

    for (const funcionarioId of funcionarioIds) {
      const funcionario = await Funcionario.findOne({ where: { id: funcionarioId } });
      if (!funcionario) { erros.push(`Funcionário ${funcionarioId} não encontrado.`); continue; }

      const escalasPeriodo = await buscarEscalasNoPeriodo(funcionarioId, eventoId, inicioA, fimA, gapMs);

      let conflito = false;
      for (const escala of escalasPeriodo) {
        const inicioB = garantirNumeroValido(new Date(escala.evento.dataEvento).getTime(), 'Data de início do evento conflitante');
        const fimB = garantirNumeroValido(new Date(escala.evento.horarioTermino).getTime(), 'Horário de término do evento conflitante');
        if (temConflito(inicioA, fimA, inicioB, fimB, gapMs)) {
          erros.push(mensagemConflito(funcionario.nome, escala.evento.nome, gapMs));
          conflito = true;
          break;
        }
      }
      if (conflito) continue;

      const jaAlocado = await Escala.findOne({ where: { eventoId, funcionarioId } });
      if (jaAlocado) { erros.push(`"${funcionario.nome}" já está nesta escala.`); continue; }

      const esc = await Escala.create({ eventoId, funcionarioId });
      criados.push(esc);
    }

    return res.status(201).json({
      success: true,
      message: `${criados.length} funcionário(s) alocado(s) com sucesso.`,
      data: { criados: criados.length, erros },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  alocar,
  alocarLote,
  atualizar,
  remover,
  listarPorEvento,
  listarDisponiveis,
  listarMinhas,
  responderConfirmacao,
  fazerCheckin,
};
