// ============================================================
// Middleware: acesso às telas de operação do evento (app mobile)
// ============================================================
// Portaria, garçom e cozinha só podem ser usados por quem trabalha no
// evento. Gerente e operador do painel (conta sem funcionário) veem tudo;
// funcionário de campo precisa estar escalado e não ter recusado.
// ============================================================
const { Op } = require('sequelize');
const { Evento, Escala } = require('../models');
const { isValidUUID } = require('../utils/validators');

async function podeOperarEvento(user, eventoId) {
  if (!user) return false;
  if (user.role === 'gerente' || !user.funcionarioId) return true;

  const escala = await Escala.findOne({
    where: {
      eventoId,
      funcionarioId: user.funcionarioId,
      confirmacao: { [Op.ne]: 'recusado' },
    },
  });
  return Boolean(escala);
}

/** Carrega req.evento a partir de req.params.eventoId e checa o acesso. */
async function exigirAcessoAoEvento(req, res, next) {
  try {
    if (!isValidUUID(req.params.eventoId)) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado.' });
    }
    const evento = await Evento.findOne({ where: { id: req.params.eventoId } });
    if (!evento) {
      return res.status(404).json({ success: false, message: 'Evento não encontrado.' });
    }
    if (!(await podeOperarEvento(req.user, evento.id))) {
      return res.status(403).json({ success: false, message: 'Você não está escalado neste evento.' });
    }
    req.evento = evento;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { podeOperarEvento, exigirAcessoAoEvento };
