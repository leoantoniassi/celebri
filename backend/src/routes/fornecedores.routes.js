// ============================================================
// Rotas: Fornecedores
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');
const controller = require('../controllers/fornecedorController');

router.use(auth, exigirPapelAdministrativo);
validarUuidNoRouter(router, 'id'); // Todas as rotas exigem autenticação

router.get('/',            controller.listar);
router.get('/:id',         controller.buscarPorId);
router.get('/:id/whatsapp', controller.whatsapp);
router.post('/',           controller.criar);
router.put('/:id',         controller.atualizar);
router.delete('/:id',      authorize('gerente'), controller.remover);

module.exports = router;
