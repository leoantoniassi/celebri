// ============================================================
// Routes: Catálogos
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/catalogoController');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');

// Todas as rotas exigem autenticação
router.use(auth);
validarUuidNoRouter(router, 'id');

router.get('/', ctrl.listar);
router.post('/', exigirPapelAdministrativo, ctrl.criar);
router.put('/:id', exigirPapelAdministrativo, ctrl.atualizar);
router.delete('/:id', authorize('gerente'), ctrl.remover);

module.exports = router;
