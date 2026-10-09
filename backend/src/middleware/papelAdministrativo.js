// ============================================================
// Middleware: papel administrativo (painel do escritório)
// ============================================================
// Funcionário de campo (garçom, porteiro, cozinha) tem role 'operador' e uma
// conta vinculada a um funcionário (`funcionarioId` no token). Ele só usa o
// app mobile. Estas rotas pertencem ao painel: gerente, super_admin e
// operador de escritório (conta sem funcionário) continuam passando.
// ============================================================

const PAPEIS_ADMINISTRATIVOS = ['gerente', 'super_admin', 'admin'];

/** Conta de campo: vinculada a um funcionário e sem papel de gestão. */
function ehFuncionarioDeCampo(user) {
  return Boolean(user && user.funcionarioId && !PAPEIS_ADMINISTRATIVOS.includes(user.role));
}

function negarCampo(res) {
  return res.status(403).json({
    success: false,
    message: 'Acesso negado. Esta área é restrita ao painel administrativo.',
  });
}

function exigirPapelAdministrativo(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
  }
  if (ehFuncionarioDeCampo(req.user)) return negarCampo(res);
  return next();
}

/**
 * Como exigirPapelAdministrativo, mas o funcionário de campo pode consultar o
 * próprio cadastro (`req.params[param]` igual ao seu funcionarioId).
 */
function exigirAdministrativoOuProprio(param = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
    }
    if (ehFuncionarioDeCampo(req.user) && req.params[param] !== req.user.funcionarioId) {
      return negarCampo(res);
    }
    return next();
  };
}

module.exports = {
  exigirPapelAdministrativo,
  exigirAdministrativoOuProprio,
  ehFuncionarioDeCampo,
};
