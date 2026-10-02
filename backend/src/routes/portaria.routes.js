// ============================================================
// Rotas: Portaria (app mobile)
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const { exigirAcessoAoEvento } = require('../middleware/acessoEvento');
const controller = require('../controllers/portariaController');

router.use(auth);

router.get('/eventos/:eventoId', exigirAcessoAoEvento, controller.resumo);
router.get('/eventos/:eventoId/convites', exigirAcessoAoEvento, controller.listarConvites);
router.post('/eventos/:eventoId/leitura', exigirAcessoAoEvento, controller.lerQrCode);
router.post('/eventos/:eventoId/convites/:conviteId/entrada', exigirAcessoAoEvento, controller.registrarEntrada);
router.post('/eventos/:eventoId/avulsos', exigirAcessoAoEvento, controller.ajustarAvulsos);

module.exports = router;
