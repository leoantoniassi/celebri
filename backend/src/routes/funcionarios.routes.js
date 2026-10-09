// ============================================================
// Rotas: Funcionários
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo, exigirAdministrativoOuProprio } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');
const controller = require('../controllers/funcionarioController');

router.use(auth);
validarUuidNoRouter(router, 'id');

router.get('/', exigirPapelAdministrativo, controller.listar);
router.get('/:id', exigirAdministrativoOuProprio('id'), controller.buscarPorId);
router.get('/:id/detalhes', exigirAdministrativoOuProprio('id'), controller.buscarDetalhes);
router.post('/', authorize('gerente'), controller.criar);
router.put('/:id', authorize('gerente'), controller.atualizar);
router.delete('/:id', authorize('gerente'), controller.remover);
router.get('/:id/whatsapp', exigirPapelAdministrativo, controller.whatsapp);


module.exports = router;
