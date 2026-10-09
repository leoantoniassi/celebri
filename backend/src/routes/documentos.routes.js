const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');
const controller = require('../controllers/documentoController');

router.use(auth, exigirPapelAdministrativo);
validarUuidNoRouter(router, 'id');

router.get('/', authorize('admin', 'gerente', 'operador'), controller.listar);
router.get('/:id/arquivo', authorize('admin', 'gerente', 'operador'), controller.abrirArquivo);
router.post('/', authorize('admin', 'gerente', 'operador'), controller.criar);
router.put('/:id', authorize('admin', 'gerente', 'operador'), controller.atualizar);
router.delete('/:id', authorize('gerente'), controller.remover);

module.exports = router;
