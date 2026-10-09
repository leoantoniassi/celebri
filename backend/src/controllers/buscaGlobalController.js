// ============================================================
// Controller: Busca Global
// ============================================================
const { Op } = require('sequelize');
const { Cliente, Evento, Orcamento, Funcionario, Fornecedor } = require('../models');
const { contem } = require('../utils/escapeLike');

// GET /api/busca?q=termo
async function buscar(req, res, next) {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const termo = q.trim();
    const like = { [Op.iLike]: contem(termo) };
    const LIMIT = 5;

    const [clientes, eventos, orcamentos, funcionarios, fornecedores] = await Promise.all([
      // Clientes — nome, email, rgCpf
      Cliente.findAll({
        where: {
          [Op.or]: [{ nome: like }, { email: like }, { rgCpf: like }],
        },
        limit: LIMIT,
        order: [['nome', 'ASC']],
        attributes: ['id', 'nome', 'email', 'rgCpf'],
      }),

      // Eventos — nome, status
      Evento.findAll({
        where: {
          [Op.or]: [{ nome: like }, { status: like }],
        },
        limit: LIMIT,
        order: [['nome', 'ASC']],
        attributes: ['id', 'nome', 'status', 'dataEvento'],
      }),

      // Orçamentos — nome, status
      Orcamento.findAll({
        where: {
          [Op.or]: [
            { nome: { [Op.iLike]: contem(termo) } },
            { status: like },
          ],
        },
        limit: LIMIT,
        order: [['criadoEm', 'DESC']],
        attributes: ['id', 'nome', 'status', 'valorTotal'],
      }),

      // Funcionários — nome, email
      Funcionario.findAll({
        where: {
          [Op.or]: [{ nome: like }, { email: like }],
        },
        limit: LIMIT,
        order: [['nome', 'ASC']],
        attributes: ['id', 'nome', 'email'],
      }),

      // Fornecedores — nome, email, cnpj
      Fornecedor.findAll({
        where: {
          [Op.or]: [{ nome: like }, { email: like }, { cnpj: like }],
        },
        limit: LIMIT,
        order: [['nome', 'ASC']],
        attributes: ['id', 'nome', 'email', 'cnpj'],
      }),
    ]);

    // Normalizar para formato uniforme
    const grupos = [];

    if (clientes.length > 0) {
      grupos.push({
        tipo: 'clientes',
        label: 'Clientes',
        icon: 'group',
        url: '/clientes',
        itens: clientes.map((c) => ({
          id: c.id,
          titulo: c.nome,
          subtitulo: c.email,
          badge: c.rgCpf,
          url: '/clientes',
        })),
      });
    }

    if (eventos.length > 0) {
      grupos.push({
        tipo: 'eventos',
        label: 'Eventos',
        icon: 'celebration',
        url: '/eventos',
        itens: eventos.map((e) => ({
          id: e.id,
          titulo: e.nome,
          subtitulo: e.dataEvento
            ? new Date(e.dataEvento).toLocaleDateString('pt-BR')
            : null,
          badge: e.status,
          url: '/eventos',
        })),
      });
    }

    if (orcamentos.length > 0) {
      grupos.push({
        tipo: 'orcamentos',
        label: 'Orçamentos',
        icon: 'request_quote',
        url: '/orcamentos',
        itens: orcamentos.map((o) => ({
          id: o.id,
          titulo: o.nome || `Orçamento #${o.id.slice(0, 8)}`,
          subtitulo: o.valorTotal
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.valorTotal)
            : null,
          badge: o.status,
          url: '/orcamentos',
        })),
      });
    }

    if (funcionarios.length > 0) {
      grupos.push({
        tipo: 'funcionarios',
        label: 'Funcionários',
        icon: 'badge',
        url: '/funcionarios',
        itens: funcionarios.map((f) => ({
          id: f.id,
          titulo: f.nome,
          subtitulo: f.email,
          url: '/funcionarios',
        })),
      });
    }

    if (fornecedores.length > 0) {
      grupos.push({
        tipo: 'fornecedores',
        label: 'Fornecedores',
        icon: 'local_shipping',
        url: '/fornecedores',
        itens: fornecedores.map((f) => ({
          id: f.id,
          titulo: f.nome,
          subtitulo: f.email,
          badge: f.cnpj,
          url: '/fornecedores',
        })),
      });
    }

    return res.json({ success: true, data: grupos, total: grupos.reduce((acc, g) => acc + g.itens.length, 0) });
  } catch (error) {
    return next(error);
  }
}

module.exports = { buscar };
