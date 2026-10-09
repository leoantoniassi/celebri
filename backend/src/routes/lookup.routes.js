// ============================================================
// Routes: Lookup Tables (funcoes, categorias)
// ============================================================
const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/lookupController');
const { exigirPapelAdministrativo } = require('../middleware/papelAdministrativo');
const { validarUuidNoRouter } = require('../middleware/validarUuid');

router.use(auth);
validarUuidNoRouter(router, 'id');

// Funcoes
router.get('/funcoes',              ctrl.listarFuncoes);
router.post('/funcoes',             exigirPapelAdministrativo, ctrl.criarFuncao);
router.put('/funcoes/:id',          exigirPapelAdministrativo, ctrl.atualizarFuncao);
router.delete('/funcoes/:id',       exigirPapelAdministrativo, ctrl.removerFuncao);

// Categorias Fornecedor
router.get('/categorias-fornecedor',         ctrl.listarCategoriasFornecedor);
router.post('/categorias-fornecedor',        exigirPapelAdministrativo, ctrl.criarCategoriaFornecedor);
router.put('/categorias-fornecedor/:id',     exigirPapelAdministrativo, ctrl.atualizarCategoriaFornecedor);
router.delete('/categorias-fornecedor/:id',  exigirPapelAdministrativo, ctrl.removerCategoriaFornecedor);

// Categorias Produto
router.get('/categorias-produto',            ctrl.listarCategoriasProduto);
router.post('/categorias-produto',           exigirPapelAdministrativo, ctrl.criarCategoriaProduto);
router.put('/categorias-produto/:id',        exigirPapelAdministrativo, ctrl.atualizarCategoriaProduto);
router.delete('/categorias-produto/:id',     exigirPapelAdministrativo, ctrl.removerCategoriaProduto);

module.exports = router;
