// ============================================================
// Rotas: Eventos
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { exigirAdministrativoOuEscalado } = require('../middleware/acessoEvento');
const { validarUuidNoRouter } = require('../middleware/validarUuid');
const controller = require('../controllers/eventoController');
const convites = require('../controllers/conviteController');
const servicos = require('../controllers/servicoEventoController');

router.use(auth);
validarUuidNoRouter(router, 'id', 'eventoId');

// Painel do escritório: gerente/operador sem conta de campo.
const painel = [exigirPapelAdministrativo, authorize('gerente', 'operador')];

router.get('/', controller.listar);
// App mobile: o funcionário de campo lê apenas o evento em que está escalado.
router.get('/:id', exigirAdministrativoOuEscalado('id'), controller.buscarPorId);
router.post('/', ...painel, controller.criar);
router.put('/:id', ...painel, controller.atualizar);
router.patch('/:id/status', ...painel, controller.mudarStatus);
router.delete('/:id', exigirPapelAdministrativo, authorize('gerente'), controller.remover);
router.get('/:id/whatsapp', ...painel, controller.whatsapp);

// Portaria: lista de convidados com QR
router.get('/:eventoId/convites', ...painel, convites.listar);
router.post('/:eventoId/convites', ...painel, convites.criar);
router.patch('/:eventoId/portaria', ...painel, convites.configurarPortaria);

// Cozinha: o que será servido, quanto e quando
router.get('/:eventoId/servicos', ...painel, servicos.listar);
router.post('/:eventoId/servicos', ...painel, servicos.criar);


module.exports = router;
