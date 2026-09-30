// ============================================================
// Controller: Portaria (app mobile) — contador e leitura de QR
// ============================================================
// Todas as rotas passam por exigirAcessoAoEvento, que deixa o evento em
// req.evento. Os contadores mudam com UPDATE atômico no banco: vários
// porteiros podem registrar entradas ao mesmo tempo sem perder contagem.
// ============================================================
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { Convite } = require('../models');
const { isValidUUID } = require('../utils/validators');
const { montarResumo } = require('./conviteController');

const MAX_AJUSTE = 100;

function lerAjuste(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n !== 0 && Math.abs(n) <= MAX_AJUSTE ? n : null;
}

// GET /api/portaria/eventos/:eventoId
async function resumo(req, res, next) {
  try {
    return res.json({
      success: true,
      data: { eventoId: req.evento.id, nome: req.evento.nome, ...(await montarResumo(req.evento)) },
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/portaria/eventos/:eventoId/convites?busca=
async function listarConvites(req, res, next) {
  try {
    const where = { eventoId: req.evento.id };
    const busca = typeof req.query.busca === 'string' ? req.query.busca.trim() : '';
    if (busca) where.nome = { [Op.iLike]: `%${busca.replace(/[%_\\]/g, '\\$&')}%` };

    const convites = await Convite.findAll({
      where,
      attributes: ['id', 'nome', 'qtdPessoas', 'qtdEntrou'],
      order: [['nome', 'ASC']],
      limit: 100,
    });
    return res.json({ success: true, data: convites });
  } catch (error) {
    return next(error);
  }
}

// POST /api/portaria/eventos/:eventoId/leitura { token }
async function lerQrCode(req, res, next) {
  try {
    const token = String(req.body?.token || '').trim().toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(token)) {
      return res.status(400).json({ success: false, message: 'QR code inválido: não é um convite do sistema.' });
    }

    const convite = await Convite.findOne({ where: { token } });
    if (!convite) {
      return res.status(404).json({ success: false, message: 'Convite não encontrado.' });
    }
    if (convite.eventoId !== req.evento.id) {
      return res.status(409).json({ success: false, message: 'Este convite é de outro evento.' });
    }

    return res.json({
      success: true,
      data: {
        id: convite.id,
        nome: convite.nome,
        qtdPessoas: convite.qtdPessoas,
        qtdEntrou: convite.qtdEntrou,
      },
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/portaria/eventos/:eventoId/convites/:conviteId/entrada { quantidade }
// Negativo corrige um lançamento errado; nunca deixa o total abaixo de zero.
async function registrarEntrada(req, res, next) {
  try {
    const quantidade = lerAjuste(req.body?.quantidade);
    if (quantidade === null || !isValidUUID(req.params.conviteId)) {
      return res.status(400).json({ success: false, message: `Quantidade deve ser de 1 a ${MAX_AJUSTE} (ou negativa para corrigir).` });
    }

    const [linhas] = await sequelize.query(
      `UPDATE convites
          SET cnv_qtd_entrou = cnv_qtd_entrou + :quantidade, cnv_atualizado_em = NOW()
        WHERE cnv_id = :conviteId AND cnv_evt_id = :eventoId AND cnv_deletado_em IS NULL
          AND cnv_qtd_entrou + :quantidade >= 0
        RETURNING cnv_qtd_entrou AS "qtdEntrou", cnv_qtd_pessoas AS "qtdPessoas", cnv_nome AS "nome"`,
      { replacements: { quantidade, conviteId: req.params.conviteId, eventoId: req.evento.id } }
    );

    if (!linhas.length) {
      const existe = await Convite.findOne({ where: { id: req.params.conviteId, eventoId: req.evento.id } });
      return existe
        ? res.status(409).json({ success: false, message: 'A correção deixaria o total de entradas negativo.' })
        : res.status(404).json({ success: false, message: 'Convite não encontrado.' });
    }

    const { qtdEntrou, qtdPessoas, nome } = linhas[0];
    const excedente = qtdEntrou - qtdPessoas;
    return res.json({
      success: true,
      message: excedente > 0
        ? `Entrada registrada. Atenção: ${excedente} pessoa(s) além do previsto no convite.`
        : 'Entrada registrada.',
      data: { id: req.params.conviteId, nome, qtdPessoas, qtdEntrou, excedente: Math.max(excedente, 0) },
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/portaria/eventos/:eventoId/avulsos { delta }
// Entradas sem convite (ou evento sem lista): o contador de pessoas.
async function ajustarAvulsos(req, res, next) {
  try {
    const delta = lerAjuste(req.body?.delta);
    if (delta === null) {
      return res.status(400).json({ success: false, message: `Ajuste deve ser de -${MAX_AJUSTE} a ${MAX_AJUSTE}, diferente de zero.` });
    }

    const [linhas] = await sequelize.query(
      `UPDATE eventos
          SET evt_qtd_avulsos = evt_qtd_avulsos + :delta
        WHERE evt_id = :eventoId AND evt_qtd_avulsos + :delta >= 0
        RETURNING evt_qtd_avulsos AS "qtdAvulsos"`,
      { replacements: { delta, eventoId: req.evento.id } }
    );
    if (!linhas.length) {
      return res.status(409).json({ success: false, message: 'O contador não pode ficar negativo.' });
    }

    req.evento.qtdAvulsos = linhas[0].qtdAvulsos;
    return res.json({ success: true, data: await montarResumo(req.evento) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { resumo, listarConvites, lerQrCode, registrarEntrada, ajustarAvulsos };
