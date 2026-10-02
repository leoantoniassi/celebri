// ============================================================
// Rotas: Operação do evento — garçom e cozinha (app) + cadastros de
// mesas e cardápio (painel)
// ============================================================
const express = require('express');
const auth = require('../middleware/auth');
const authorize = require('../middleware/roles');
const { exigirAcessoAoEvento } = require('../middleware/acessoEvento');
const operacao = require('../controllers/operacaoController');
const mesas = require('../controllers/mesaController');
const servicos = require('../controllers/servicoEventoController');

// /api/operacao — app mobile
const operacaoRouter = express.Router();
operacaoRouter.use(auth);
operacaoRouter.get('/eventos/:eventoId/mesas', exigirAcessoAoEvento, operacao.mapaMesas);
operacaoRouter.get('/eventos/:eventoId/pedidos', exigirAcessoAoEvento, operacao.listarPedidos);
operacaoRouter.post('/eventos/:eventoId/pedidos', exigirAcessoAoEvento, operacao.criarPedido);
operacaoRouter.patch('/eventos/:eventoId/pedidos/:pedidoId/status', exigirAcessoAoEvento, operacao.mudarStatusPedido);
operacaoRouter.get('/eventos/:eventoId/cozinha', exigirAcessoAoEvento, operacao.painelCozinha);
operacaoRouter.patch('/eventos/:eventoId/servicos/:servicoId', exigirAcessoAoEvento, operacao.mudarStatusServico);

// /api/mesas — painel
const mesasRouter = express.Router();
mesasRouter.use(auth, authorize('gerente', 'operador'));
mesasRouter.put('/:id', mesas.atualizar);
mesasRouter.delete('/:id', mesas.remover);

// /api/servicos — painel
const servicosRouter = express.Router();
servicosRouter.use(auth, authorize('gerente', 'operador'));
servicosRouter.put('/:id', servicos.atualizar);
servicosRouter.delete('/:id', servicos.remover);

module.exports = { operacaoRouter, mesasRouter, servicosRouter };
