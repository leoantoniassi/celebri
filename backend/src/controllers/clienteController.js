// ============================================================
// Controller: Clientes
// ============================================================
const { Op } = require('sequelize');
const { Cliente, Orcamento, Evento, Documento } = require('../models');
const { gerarLinkWhatsApp } = require('../utils/whatsapp');
const { warning } = require('../utils/response');
const { isValidUUID } = require('../utils/validators');
const { saudacaoWhatsapp } = require('../utils/brand');
const { contem } = require('../utils/escapeLike');

// GET /api/clientes
async function listar(req, res, next) {
  try {
    const { page = 1, limit = 20, busca } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    if (busca !== undefined && typeof busca !== 'string') {
      return res.status(400).json({ success: false, message: 'Busca inválida.' });
    }

    const where = {};
    if (busca) {
      where[Op.or] = [
        { nome: { [Op.iLike]: contem(busca) } },
        { email: { [Op.iLike]: contem(busca) } },
        { rgCpf: { [Op.iLike]: contem(busca) } },
      ];
    }

    const { count, rows } = await Cliente.findAndCountAll({
      where,
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
      order: [['nome', 'ASC']],
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/clientes/:id
async function buscarPorId(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do cliente inválido.' });
    }
    const cliente = await Cliente.findOne({
      where: { id: req.params.id },
      include: [
        { model: Orcamento, as: 'orcamentos' },
        { model: Evento, as: 'eventos' },
        { model: Documento, as: 'documentos' },
      ],
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado.',
      });
    }

    return res.json({ success: true, data: cliente });
  } catch (error) {
    return next(error);
  }
}

// POST /api/clientes
async function criar(req, res, next) {
  try {
    const { nome, email, rgCpf, telefone, telefoneResidencial } = req.body;

    if (!nome || !rgCpf || !telefone) {
      return res.status(400).json({
        success: false,
        message: 'Nome, RG/CPF e telefone celular são obrigatórios.',
      });
    }

    const emailTratado = email ? email.trim() : null;

    const whereConditions = [{ rgCpf }];
    if (emailTratado) {
      whereConditions.push({ email: emailTratado });
    }

    const clienteExistente = await Cliente.scope('comDeletados').findOne({
      where: {
        [Op.or]: whereConditions
      }
    });

    if (clienteExistente) {
      if (clienteExistente.deletadoEm && clienteExistente.rgCpf === rgCpf) {
        return res.status(409).json({
          success: false,
          message: 'Já existe um cliente desativado com este documento.',
          action: 'reactivate',
          clienteId: clienteExistente.id,
        });
      }
      
      const campo = (emailTratado && clienteExistente.email === emailTratado) ? 'email' : 'documento';
      return res.status(400).json({
        success: false,
        message: `Já existe um cliente ativo com este ${campo}.`,
      });
    }

    const cliente = await Cliente.create({ nome, email: emailTratado, rgCpf, telefone, telefoneResidencial });

    return res.status(201).json({
      success: true,
      message: 'Cliente criado com sucesso!',
      data: cliente,
    });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/clientes/:id
async function atualizar(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do cliente inválido.' });
    }
    const cliente = await Cliente.findOne({ where: { id: req.params.id } });
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado.',
      });
    }

    const { nome, email, rgCpf, telefone, telefoneResidencial } = req.body;
    
    // Se o email vier na req como string vazia, salva como null
    let emailUpdate = cliente.email;
    if (email !== undefined) {
      emailUpdate = email ? email.trim() : null;
    }

    await cliente.update({
      nome: nome || cliente.nome,
      email: emailUpdate,
      rgCpf: rgCpf || cliente.rgCpf,
      telefone: telefone || cliente.telefone,
      telefoneResidencial: telefoneResidencial !== undefined ? telefoneResidencial : cliente.telefoneResidencial,
      atualizadoEm: new Date(),
    });

    return res.json({
      success: true,
      message: 'Cliente atualizado com sucesso!',
      data: cliente,
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/clientes/:id (soft delete)
async function remover(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do cliente inválido.' });
    }
    const cliente = await Cliente.findOne({ where: { id: req.params.id } });
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado.',
      });
    }

    if (req.query.force !== 'true') {
      const eventosFuturos = await Evento.count({
        where: {
          clienteId: req.params.id,
          dataEvento: { [Op.gt]: new Date() },
          deletadoEm: null,
        },
      });

      if (eventosFuturos > 0) {
        return warning(res, `Este cliente possui ${eventosFuturos} evento(s) futuro(s). Deseja realmente excluí-lo?`);
      }
    }

    await cliente.update({ deletadoEm: new Date() });

    return res.json({
      success: true,
      message: 'Cliente removido com sucesso!',
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/clientes/:id/whatsapp
async function whatsapp(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do cliente inválido.' });
    }
    const cliente = await Cliente.findOne({ where: { id: req.params.id } });
    if (!cliente) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado.',
      });
    }

    const link = gerarLinkWhatsApp(
      cliente.telefone,
      await saudacaoWhatsapp(cliente.nome)
    );

    return res.json({
      success: true,
      data: { link, telefone: cliente.telefone },
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/clientes/:id/reativar
async function reativar(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do cliente inválido.' });
    }
    const cliente = await Cliente.scope('comDeletados').findOne({ where: { id: req.params.id } });
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado.' });
    }
    if (!cliente.deletadoEm) {
      return res.status(400).json({ success: false, message: 'Este cliente já está ativo.' });
    }

    await cliente.update({ deletadoEm: null, atualizadoEm: new Date() });
    return res.json({ success: true, message: 'Cliente reativado com sucesso!', data: cliente });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, whatsapp, reativar };
