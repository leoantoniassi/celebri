// ============================================================
// Rotas: Empresas (tenants) — área do dono da plataforma
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { validarUuidNoRouter } = require('../middleware/validarUuid');
const controller = require('../controllers/empresaController');

// Provisionar e suspender buffets é operação do dono do SaaS, nunca do
// gerente de um buffet — que só enxerga a própria empresa.
router.use(auth);
router.use(authorize('super_admin'));
validarUuidNoRouter(router, 'id');

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.post('/', controller.criar);
router.put('/:id', controller.atualizar);
router.patch('/:id/status', controller.mudarStatus);

module.exports = router;
