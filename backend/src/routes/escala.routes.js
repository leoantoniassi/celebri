// ============================================================
// Rotas: Escala (Alocação de Funcionários em Eventos)
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/escalaController');
const authorize = require('../middleware/roles');

router.use(auth);

router.get('/minhas',                controller.listarMinhas);
router.get('/disponiveis/:eventoId', controller.listarDisponiveis);
router.get('/evento/:eventoId',      controller.listarPorEvento);
router.post('/',                     authorize('gerente', 'operador'), controller.alocar);
router.post('/lote',                 authorize('gerente', 'operador'), controller.alocarLote);
router.delete('/:id',                authorize('gerente', 'operador'), controller.remover);

module.exports = router;
