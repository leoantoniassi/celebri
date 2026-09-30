// ============================================================
// Controller: Funcionários
// ============================================================
const { Op } = require('sequelize');
const { Funcionario, Funcao, Escala, Evento, Usuario } = require('../models');
const { gerarLinkWhatsApp } = require('../utils/whatsapp');
const { warning } = require('../utils/response');
const { isValidUUID } = require('../utils/validators');
const { saudacaoWhatsapp } = require('../utils/brand');

// Funcionário com e-mail ganha uma conta pendente para o app mobile. No
// primeiro acesso ele recebe um código nesse e-mail e cria a própria senha.
async function garantirContaApp(funcionario) {
  if (!funcionario.email) return;

  const vinculada = await Usuario.findOne({ where: { funcionarioId: funcionario.id } });
  if (vinculada) {
    // Antes de ativar, a conta acompanha o e-mail do cadastro. Depois de
    // ativa, o e-mail de login é da pessoa e não muda por aqui.
    if (!vinculada.senha && vinculada.email !== funcionario.email) {
      await vinculada.update({ email: funcionario.email });
    }
    return;
  }

  const mesmoEmail = await Usuario.findOne({ where: { email: funcionario.email } });
  if (mesmoEmail) {
    if (!mesmoEmail.funcionarioId) await mesmoEmail.update({ funcionarioId: funcionario.id });
    return;
  }

  await Usuario.create({
    nome: funcionario.nome,
    email: funcionario.email,
    senha: null,
    role: 'operador',
    status: 'pendente',
    funcionarioId: funcionario.id,
  });
}

// GET /api/funcionarios
async function listar(req, res, next) {
  try {
    const { page = 1, limit = 20, busca, funcaoId } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    if (busca !== undefined && typeof busca !== 'string') {
      return res.status(400).json({ success: false, message: 'Busca inválida.' });
    }
    if (funcaoId !== undefined && typeof funcaoId !== 'string') {
      return res.status(400).json({ success: false, message: 'Função inválida.' });
    }

    const where = {};
    if (busca) {
      where[Op.or] = [
        { nome:  { [Op.iLike]: `%${busca}%` } },
        { email: { [Op.iLike]: `%${busca}%` } },
      ];
    }
    if (funcaoId) {
      where.funcaoId = funcaoId;
    }

    const { count, rows } = await Funcionario.findAndCountAll({
      where,
      include: [{ model: Funcao, as: 'funcao', attributes: ['id', 'nome'] }],
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

// GET /api/funcionarios/:id
async function buscarPorId(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do funcionário inválido.' });
    }
    const funcionario = await Funcionario.findOne({
      where: { id: req.params.id },
      include: [{ model: Funcao, as: 'funcao', attributes: ['id', 'nome'] }],
    });
    if (!funcionario) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado.',
      });
    }

    return res.json({ success: true, data: funcionario });
  } catch (error) {
    return next(error);
  }
}

// POST /api/funcionarios
async function criar(req, res, next) {
  try {
    const { nome, email, telefone, telefoneResidencial, funcaoId } = req.body;

    if (!nome || !funcaoId) {
      return res.status(400).json({
        success: false,
        message: 'Nome e função são obrigatórios.',
      });
    }

    const emailTratado = email ? email.trim() : null;
    
    if (emailTratado) {
      const emailExiste = await Funcionario.findOne({ where: { email: emailTratado } });
      if (emailExiste) {
        return res.status(400).json({ success: false, message: 'Já existe um funcionário com este email.' });
      }
    }

    const funcaoExiste = await Funcao.findOne({ where: { id: funcaoId } });
    if (!funcaoExiste) {
      return res.status(404).json({ success: false, message: 'Função não encontrada.' });
    }

    const funcionario = await Funcionario.create({ nome, email: emailTratado, telefone, telefoneResidencial, funcaoId });
    await garantirContaApp(funcionario);
    const funcionarioCompleto = await Funcionario.findOne({
      where: { id: funcionario.id },
      include: [{ model: Funcao, as: 'funcao', attributes: ['id', 'nome'] }],
    });

    return res.status(201).json({
      success: true,
      message: 'Funcionário criado com sucesso!',
      data: funcionarioCompleto,
    });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/funcionarios/:id
async function atualizar(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do funcionário inválido.' });
    }
    const funcionario = await Funcionario.findOne({ where: { id: req.params.id } });
    if (!funcionario) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado.',
      });
    }

    const { nome, email, telefone, telefoneResidencial, funcaoId } = req.body;

    if (funcaoId) {
      const funcaoExiste = await Funcao.findOne({ where: { id: funcaoId } });
      if (!funcaoExiste) {
        return res.status(404).json({ success: false, message: 'Função não encontrada.' });
      }
    }

    let emailUpdate = funcionario.email;
    if (email !== undefined) {
      emailUpdate = email ? email.trim() : null;
    }

    await funcionario.update({
      nome:     nome     || funcionario.nome,
      email:    emailUpdate,
      telefone: telefone !== undefined ? telefone : funcionario.telefone,
      telefoneResidencial: telefoneResidencial !== undefined ? telefoneResidencial : funcionario.telefoneResidencial,
      funcaoId: funcaoId || funcionario.funcaoId,
      atualizadoEm: new Date(),
    });
    await garantirContaApp(funcionario);

    return res.json({
      success: true,
      message: 'Funcionário atualizado com sucesso!',
      data: funcionario,
    });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/funcionarios/:id (soft delete)
async function remover(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do funcionário inválido.' });
    }
    const funcionario = await Funcionario.findOne({ where: { id: req.params.id } });
    if (!funcionario) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado.',
      });
    }

    if (req.query.force !== 'true') {
      const eventosFuturos = await Escala.count({
        include: [{
          model: Evento,
          as: 'evento',
          where: {
            dataEvento: { [Op.gt]: new Date() },
            deletadoEm: null,
          },
          required: true,
        }],
        where: { funcionarioId: req.params.id },
      });

      if (eventosFuturos > 0) {
        return warning(res, `Este funcionário está alocado em ${eventosFuturos} evento(s) futuro(s). Deseja realmente excluí-lo?`);
      }
    }

    await funcionario.update({ deletadoEm: new Date() });

    return res.json({
      success: true,
      message: 'Funcionário removido com sucesso!',
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/funcionarios/:id/whatsapp
async function whatsapp(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do funcionário inválido.' });
    }
    const funcionario = await Funcionario.findOne({ where: { id: req.params.id } });
    if (!funcionario) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado.',
      });
    }

    if (!funcionario.telefone) {
      return res.status(400).json({
        success: false,
        message: 'Funcionário não possui telefone cadastrado.',
      });
    }

    const link = gerarLinkWhatsApp(
      funcionario.telefone,
      await saudacaoWhatsapp(funcionario.nome)
    );

    return res.json({
      success: true,
      data: { link, telefone: funcionario.telefone },
    });
  } catch (error) {
    return next(error);
  }
}

// GET /api/funcionarios/:id/detalhes
async function buscarDetalhes(req, res, next) {
  try {
    if (!isValidUUID(req.params.id)) {
      return res.status(400).json({ success: false, message: 'ID do funcionário inválido.' });
    }
    const funcionario = await Funcionario.findOne({
      where: { id: req.params.id },
      include: [{ model: Funcao, as: 'funcao', attributes: ['id', 'nome'] }],
    });
    if (!funcionario) {
      return res.status(404).json({
        success: false,
        message: 'Funcionário não encontrado.',
      });
    }

    const escalas = await Escala.findAll({
      where: { funcionarioId: req.params.id },
      include: [{
        model: Evento,
        as: 'evento',
        where: { deletadoEm: null },
        attributes: ['id', 'nome', 'dataEvento', 'horarioTermino', 'status'],
        required: true,
      }],
      order: [[{ model: Evento, as: 'evento' }, 'dataEvento', 'DESC']],
    });

    const agora = new Date();
    const eventosFuturos = [];
    const eventosPassados = [];

    for (const esc of escalas) {
      if (new Date(esc.evento.dataEvento) > agora) {
        eventosFuturos.push(esc.evento);
      } else {
        eventosPassados.push(esc.evento);
      }
    }

    return res.json({
      success: true,
      data: {
        ...funcionario.toJSON(),
        totalEventos: escalas.length,
        eventosFuturos,
        eventosPassados,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, remover, whatsapp, buscarDetalhes };
