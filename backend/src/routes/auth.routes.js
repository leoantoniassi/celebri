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
const { LIMITES } = require('../config/seguranca');

const porIp = (max) => limitarRequisicoes({ janelaMs: LIMITES.janelaIpMs, max });

const limitePrimeiroAcesso = porIp(LIMITES.primeiroAcessoPorIp);
// Limite por IP (cada rota tem o seu contador). O bloqueio por conta do
// login fica no authController.
const limiteLogin = porIp(LIMITES.loginPorIp);
const limiteRecuperacao = porIp(LIMITES.recuperacaoPorIp);
const limiteRedefinicao = porIp(LIMITES.redefinicaoPorIp);

// POST /register foi removido: era público, aceitava `role` no body e não
// era usado por nada. Criação de usuário passa por POST /api/usuarios/convidar,
// que exige autenticação e papel de gerente.
router.post('/login', limiteLogin, login);
router.post('/recuperar-senha', limiteRecuperacao, solicitarRecuperacaoSenha);
router.post('/redefinir-senha', limiteRedefinicao, redefinirSenha);

// App mobile: entrada só com e-mail + criação de senha com código.
router.post('/identificar', limitePrimeiroAcesso, identificar);
router.post('/primeiro-acesso/codigo', limitePrimeiroAcesso, enviarCodigoPrimeiroAcesso);
router.post('/primeiro-acesso/confirmar', limitePrimeiroAcesso, confirmarPrimeiroAcesso);

module.exports = router;
