// ============================================================
// Rotas: Eventos
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const controller = require('../controllers/eventoController');
const convites = require('../controllers/conviteController');
const servicos = require('../controllers/servicoEventoController');

router.use(auth);

router.get('/', controller.listar);
router.get('/:id', controller.buscarPorId);
router.post('/', authorize('gerente', 'operador'), controller.criar);
router.put('/:id', authorize('gerente', 'operador'), controller.atualizar);
router.patch('/:id/status', authorize('gerente', 'operador'), controller.mudarStatus);
router.delete('/:id', authorize('gerente'), controller.remover);
router.get('/:id/whatsapp', authorize('gerente', 'operador'), controller.whatsapp);

// Portaria: lista de convidados com QR
router.get('/:eventoId/convites', authorize('gerente', 'operador'), convites.listar);
router.post('/:eventoId/convites', authorize('gerente', 'operador'), convites.criar);
router.patch('/:eventoId/portaria', authorize('gerente', 'operador'), convites.configurarPortaria);

// Cozinha: o que será servido, quanto e quando
router.get('/:eventoId/servicos', authorize('gerente', 'operador'), servicos.listar);
router.post('/:eventoId/servicos', authorize('gerente', 'operador'), servicos.criar);


module.exports = router;
