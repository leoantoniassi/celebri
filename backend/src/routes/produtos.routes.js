// ============================================================
// Rotas: Produtos (Estoque)
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');
const controller = require('../controllers/produtoController');

router.use(auth, exigirPapelAdministrativo);
validarUuidNoRouter(router, 'id');

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.post('/', controller.criar);
router.put('/:id', controller.atualizar);
router.delete('/:id', authorize('gerente'), controller.remover);

module.exports = router;
