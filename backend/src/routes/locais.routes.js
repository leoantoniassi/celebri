// ============================================================
// Routes: Locais
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/localController');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');
const mesas = require('../controllers/mesaController');

router.use(auth);
validarUuidNoRouter(router, 'id', 'localId');

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.buscarPorId);
router.post('/',   exigirPapelAdministrativo, ctrl.criar);
router.put('/:id', exigirPapelAdministrativo, ctrl.atualizar);
router.delete('/:id', exigirPapelAdministrativo, ctrl.remover);

// Layout de mesas do salão (usado pelo garçom no app)
router.get('/:localId/mesas', exigirPapelAdministrativo, authorize('gerente', 'operador'), mesas.listar);
router.post('/:localId/mesas', exigirPapelAdministrativo, authorize('gerente', 'operador'), mesas.criar);

module.exports = router;
