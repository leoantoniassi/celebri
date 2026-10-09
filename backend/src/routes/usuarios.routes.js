// ============================================================
// Rotas de Usuários
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');
const controller = require('../controllers/usuarioController');
const { limitarRequisicoes } = require('../middleware/rateLimit');

const { LIMITES } = require('../config/seguranca');

const limiteDefinirSenha = limitarRequisicoes({ janelaMs: LIMITES.janelaIpMs, max: LIMITES.definirSenhaPorIp });

// ── Rotas Públicas (sem autenticação) ────────────────────────
// IMPORTANTE: deve vir ANTES do router.use(auth)
router.post('/definir-senha', limiteDefinirSenha, controller.definirSenhaConvite);

// ── Rotas Protegidas (exigem autenticação JWT) ────────────────
router.use(auth);
validarUuidNoRouter(router, 'id');

// Listagem de usuários
router.get('/', exigirPapelAdministrativo, controller.listar);

// Criação, atualização e remoção exigem perfil 'gerente'
router.post('/', authorize('gerente'), controller.criar);
router.put('/:id', authorize('gerente'), controller.atualizar);
router.delete('/:id', authorize('gerente'), controller.remover);

// Convite de novo usuário via e-mail (apenas gerente)
router.post('/convidar', authorize('gerente'), controller.convidarUsuario);

module.exports = router;
