// ============================================================
// Routes: Locais
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/localController');
const authorize = require('../middleware/roles');
const mesas = require('../controllers/mesaController');

router.use(auth);

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.buscarPorId);
router.post('/',   ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.remover);

// Layout de mesas do salão (usado pelo garçom no app)
router.get('/:localId/mesas', authorize('gerente', 'operador'), mesas.listar);
router.post('/:localId/mesas', authorize('gerente', 'operador'), mesas.criar);

module.exports = router;
