// ============================================================
// Rotas: Busca Global
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const controller = require('../controllers/buscaGlobalController');

router.use(auth, exigirPapelAdministrativo); // painel: busca expõe CPF/e-mail de clientes

router.get('/', controller.buscar);

module.exports = router;
