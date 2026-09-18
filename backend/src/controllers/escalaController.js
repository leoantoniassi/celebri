// ============================================================
// Controller: Escala (Alocação Funcionário ↔ Evento)
// ============================================================
const { Op } = require('sequelize');
const { Escala, Evento, Funcionario, Funcao } = require('../models');

const CONFLITO_GAP_MS = 2 * 60 * 60 * 1000; // 2 horas em ms
const MAX_ALOCACAO_LOTE = 100; // Limite de funcionários por lote para evitar DoS

function garantirNumeroValido(valor, nome) {
  if (typeof valor !== 'number' || Number.isNaN(valor)) {
    throw new Error(`${nome} inválido(a): não é um número válido.`);
  }
  return valor;
}

function temConflito(inicioA, fimA, inicioB, fimB) {
  return fimB + CONFLITO_GAP_MS > inicioA && fimA + CONFLITO_GAP_MS > inicioB;
}

function mensagemConflito(funcionarioNome, eventoNome) {
  return `"${funcionarioNome}" já está alocado no evento "${eventoNome}" neste horário (gap mínimo de 2h não respeitado).`;
}

function buscarEscalasNoPeriodo(funcionarioId, eventoId, inicioA, fimA) {
  return Escala.findAll({
    where: {
      funcionarioId,
      eventoId: { [Op.ne]: eventoId },
    },
    include: [{
      model: Evento,
      as: 'evento',
      where: {
        horarioTermino: { [Op.gt]: new Date(inicioA - CONFLITO_GAP_MS) },
        dataEvento: { [Op.lt]: new Date(fimA + CONFLITO_GAP_MS) },
        deletadoEm: null,
      },
      required: true,
    }],
  });
}

// POST /api/escala
async function alocar(req, res, next) {
  try {
    const { eventoId, funcionarioId, observacoes } = req.body;

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

    // Verifica conflito de horário com gap mínimo de 2h
    const inicioA = garantirNumeroValido(new Date(evento.dataEvento).getTime(), 'Data de início do evento');
    const fimA = garantirNumeroValido(new Date(evento.horarioTermino).getTime(), 'Horário de término do evento');

    const escalasPeriodo = await buscarEscalasNoPeriodo(funcionarioId, eventoId, inicioA, fimA);

    for (const escala of escalasPeriodo) {
      const inicioB = garantirNumeroValido(new Date(escala.evento.dataEvento).getTime(), 'Data de início do evento conflitante');
      const fimB = garantirNumeroValido(new Date(escala.evento.horarioTermino).getTime(), 'Horário de término do evento conflitante');
      if (temConflito(inicioA, fimA, inicioB, fimB)) {
        return res.status(409).json({
          success: false,
          message: mensagemConflito(funcionario.nome, escala.evento.nome),
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

    const escala = await Escala.create({ eventoId, funcionarioId, observacoes });

    // Retorna com dados completos
    const escalaCriada = await Escala.findOne({
      where: { id: escala.id },
      include: [
        { model: Evento, as: 'evento', attributes: ['id', 'nome', 'dataEvento', 'horarioTermino'] },
        { model: Funcionario, as: 'funcionario', attributes: ['id', 'nome', 'funcao'] },
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
          include: [{ model: Funcao, as: 'funcao', attributes: ['id', 'nome'] }],
        },
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
        },
      ],
      order: [[{ model: Evento, as: 'evento' }, 'dataEvento', 'ASC']],
    });

    return res.json({ success: true, data: escalas });
  } catch (error) {
    return next(error);
  }
}

// GET /api/escala/disponiveis/:eventoId
// Retorna funcionários disponíveis para o evento respeitando gap mínimo de 2h
async function listarDisponiveis(req, res, next) {
  try {
    const evento = await Evento.findOne({ where: { id: req.params.eventoId } });
    if (!evento) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado.' });
    }

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
          horarioTermino: { [Op.gt]: new Date(inicioA - CONFLITO_GAP_MS) },
          dataEvento: { [Op.lt]: new Date(fimA + CONFLITO_GAP_MS) },
          deletadoEm: null,
        },
        required: true,
      }],
      attributes: ['funcionarioId', 'eventoId'],
    });

    // IDs dos funcionários que têm conflito real (gap < 2h)
    const idsComConflito = new Set();
    for (const escala of escalasOutrosEventos) {
      const inicioB = garantirNumeroValido(new Date(escala.evento.dataEvento).getTime(), 'Data de início do evento conflitante');
      const fimB = garantirNumeroValido(new Date(escala.evento.horarioTermino).getTime(), 'Horário de término do evento conflitante');
      if (temConflito(inicioA, fimA, inicioB, fimB)) {
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

    const inicioA = garantirNumeroValido(new Date(evento.dataEvento).getTime(), 'Data de início do evento');
    const fimA = garantirNumeroValido(new Date(evento.horarioTermino).getTime(), 'Horário de término do evento');

    const erros = [];
    const criados = [];

    for (const funcionarioId of funcionarioIds) {
      const funcionario = await Funcionario.findOne({ where: { id: funcionarioId } });
      if (!funcionario) { erros.push(`Funcionário ${funcionarioId} não encontrado.`); continue; }

      const escalasPeriodo = await buscarEscalasNoPeriodo(funcionarioId, eventoId, inicioA, fimA);

      let conflito = false;
      for (const escala of escalasPeriodo) {
        const inicioB = garantirNumeroValido(new Date(escala.evento.dataEvento).getTime(), 'Data de início do evento conflitante');
        const fimB = garantirNumeroValido(new Date(escala.evento.horarioTermino).getTime(), 'Horário de término do evento conflitante');
        if (temConflito(inicioA, fimA, inicioB, fimB)) {
          erros.push(mensagemConflito(funcionario.nome, escala.evento.nome));
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

module.exports = { alocar, alocarLote, remover, listarPorEvento, listarDisponiveis, listarMinhas };
