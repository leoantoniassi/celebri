// ============================================================
// Rotas: Autenticação
// ============================================================
const router = require('express').Router();
const {
  login,
  solicitarRecuperacaoSenha,
  redefinirSenha,
  identificar,
  enviarCodigoPrimeiroAcesso,
  confirmarPrimeiroAcesso,
} = require('../controllers/authController');
const { limitarRequisicoes } = require('../middleware/rateLimit');

const limitePrimeiroAcesso = limitarRequisicoes({ janelaMs: 15 * 60 * 1000, max: 20 });

// POST /register foi removido: era público, aceitava `role` no body e não
// era usado por nada. Criação de usuário passa por POST /api/usuarios/convidar,
// que exige autenticação e papel de gerente.
router.post('/login', login);
router.post('/recuperar-senha', solicitarRecuperacaoSenha);
router.post('/redefinir-senha', redefinirSenha);

// App mobile: entrada só com e-mail + criação de senha com código.
router.post('/identificar', limitePrimeiroAcesso, identificar);
router.post('/primeiro-acesso/codigo', limitePrimeiroAcesso, enviarCodigoPrimeiroAcesso);
router.post('/primeiro-acesso/confirmar', limitePrimeiroAcesso, confirmarPrimeiroAcesso);

module.exports = router;
