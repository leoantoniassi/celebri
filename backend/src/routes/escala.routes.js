// ============================================================
// Rotas: Escala (Alocação de Funcionários em Eventos)
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const controller = require('../controllers/escalaController');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');

router.use(auth);
validarUuidNoRouter(router, 'id', 'eventoId');

const painel = [exigirPapelAdministrativo, authorize('gerente', 'operador')];

router.get('/minhas',                controller.listarMinhas);
router.get('/disponiveis/:eventoId', exigirPapelAdministrativo, controller.listarDisponiveis);
router.get('/evento/:eventoId',      exigirPapelAdministrativo, controller.listarPorEvento);
router.post('/',                     ...painel, controller.alocar);
router.post('/lote',                 ...painel, controller.alocarLote);
router.put('/:id',                   ...painel, controller.atualizar);
router.delete('/:id',                ...painel, controller.remover);

// App mobile: o próprio funcionário responde e faz check-in.
router.patch('/:id/confirmacao',     controller.responderConfirmacao);
router.post('/:id/checkin',          controller.fazerCheckin);

module.exports = router;
