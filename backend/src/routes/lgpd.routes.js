// ============================================================
// Rotas LGPD (/api/lgpd) — exportação e anonimização de titulares
// ============================================================
// Somente gerente do painel: dados pessoais completos, ação irreversível.
// Limite por IP em cada rota (a ordem importa: auth e papel antes, para não gastar cota com anônimos).
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');
const { limitarRequisicoes } = require('../middleware/rateLimit');
const controller = require('../controllers/lgpdController');

// Token de gerente roubado não pode raspar a base inteira nem anonimizar em massa.
const JANELA_MS = 15 * 60 * 1000;
const limiteExportar = limitarRequisicoes({ janelaMs: JANELA_MS, max: 30 });
const limiteAnonimizar = limitarRequisicoes({ janelaMs: JANELA_MS, max: 15 });

router.use(auth, exigirPapelAdministrativo, authorize('gerente'));
validarUuidNoRouter(router, 'id');

router.get('/titulares/:tipo/:id/exportar', limiteExportar, controller.exportar);
router.post('/titulares/:tipo/:id/anonimizar', limiteAnonimizar, controller.anonimizar);

module.exports = router;
