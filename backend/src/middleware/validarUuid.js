// ============================================================
// Middleware: validação de UUID em parâmetros de rota
// ============================================================
// UUID malformado chegaria ao Postgres e viraria 500; aqui vira 400.
// ============================================================
const { isValidUUID } = require('../utils/validators');

/** Middleware por rota: validarUuidParam('id', 'eventoId'). */
function validarUuidParam(...nomes) {
  return (req, res, next) => {
    for (const nome of nomes) {
      if (req.params[nome] !== undefined && !isValidUUID(req.params[nome])) {
        return res.status(400).json({ success: false, message: `Identificador inválido (${nome}).` });
      }
    }
    return next();
  };
}

/**
 * Registra a validação em todas as rotas do router que usam esses parâmetros
 * (router.param roda depois dos middlewares anteriores, como o `auth`).
 */
function validarUuidNoRouter(router, ...nomes) {
  nomes.forEach((nome) => {
    router.param(nome, (req, res, next) => validarUuidParam(nome)(req, res, next));
  });
  return router;
}

module.exports = { validarUuidParam, validarUuidNoRouter };
