// ============================================================
// Routes Index — Agrupa todas as rotas sob /api
// ============================================================
const router = require('express').Router();

router.use('/auth',         require('./auth.routes'));
router.use('/tenant',       require('./tenant.routes'));
router.use('/empresas',     require('./empresas.routes'));
router.use('/busca',        require('./busca.routes'));
router.use('/clientes',     require('./clientes.routes'));
router.use('/locais',       require('./locais.routes'));
router.use('/lookup',       require('./lookup.routes'));
router.use('/funcionarios', require('./funcionarios.routes'));
router.use('/fornecedores', require('./fornecedores.routes'));
router.use('/produtos',     require('./produtos.routes'));
router.use('/orcamentos',   require('./orcamentos.routes'));
router.use('/eventos',      require('./eventos.routes'));
router.use('/documentos',   require('./documentos.routes'));
router.use('/catalogos',    require('./catalogos.routes'));
router.use('/escala',       require('./escala.routes'));
router.use('/dashboard',    require('./dashboard.routes'));
router.use('/usuarios',     require('./usuarios.routes'));
router.use('/convites',     require('./convites.routes'));
router.use('/portaria',     require('./portaria.routes'));

module.exports = router;
