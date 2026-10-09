// ============================================================
// Rotas: Convites (painel web + página pública do convidado)
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');
const controller = require('../controllers/conviteController');

// Públicas: o link vai por WhatsApp para o convidado, que não tem login.
router.get('/publico/:token', controller.paginaPublica);
router.get('/publico/:token/qrcode.png', controller.qrcodePng);

router.use(auth, exigirPapelAdministrativo, authorize('gerente', 'operador'));
validarUuidNoRouter(router, 'id');
router.put('/:id', controller.atualizar);
router.delete('/:id', controller.remover);
router.get('/:id/whatsapp', controller.whatsapp);

module.exports = router;
