// ============================================================
// Rotas: Orçamentos
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');
const controller = require('../controllers/orcamentoController');

router.use(auth, exigirPapelAdministrativo);
validarUuidNoRouter(router, 'id');

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.post('/', authorize('gerente', 'operador'), controller.criar);
router.put('/:id', authorize('gerente', 'operador'), controller.atualizar);
router.patch('/:id/status', authorize('gerente', 'operador'), controller.mudarStatus);
router.post('/:id/confirmar', authorize('gerente', 'operador'), controller.confirmarOrcamento);
router.post('/:id/rejeitar', authorize('gerente', 'operador'), controller.rejeitarOrcamento);
router.delete('/:id', authorize('gerente'), controller.remover);
router.get('/:id/whatsapp', authorize('gerente', 'operador'), controller.whatsapp);


module.exports = router;
