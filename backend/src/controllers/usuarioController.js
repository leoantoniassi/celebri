// ============================================================
// Controller: Usuários — CRUD + Convite + Ativação
// ============================================================
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { Usuario } = require('../models');
const { enviarConvite } = require('../services/emailService');

// ── Helpers ──────────────────────────────────────────────────

/**
 * Normaliza a role para os valores atribuíveis pela API.
 *
 * 'super_admin' é o dono da plataforma e existe fora de qualquer empresa —
 * nunca pode ser criado por esta rota, nem por um gerente de buffet.
 * Provisionamento de super_admin é feito direto no banco.
 *
 * @param {string} role
 * @returns {'gerente'|'operador'}
 */
const normalizeRole = (role) => (role === 'gerente' ? 'gerente' : 'operador');

/**
 * Valida o formato de um endereço de e-mail.
 * @param {string} email
 * @returns {boolean}
 */
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));

// ── GET /api/usuarios ────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nome', 'email', 'role', 'status', 'criadoEm'],
      order: [['nome', 'ASC']],
    });
    return res.json({ success: true, data: usuarios, pagination: { total: usuarios.length } });
  } catch (error) {
    return next(error);
  }
}

// ── POST /api/usuarios ───────────────────────────────────────

async function criar(req, res, next) {
  try {
    const { nome, email, senha, role, funcionarioId } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e senha são obrigatórios.',
      });
    }

    const userRole = normalizeRole(role);
    const hash = await bcrypt.hash(senha, 10);

    const usuario = await Usuario.create({
      nome,
      email,
      senha: hash,
      role: userRole,
      status: 'ativo',
      funcionarioId: funcionarioId || null,
    });

    return res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso!',
      data: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        funcionarioId: usuario.funcionarioId,
      },
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Email já cadastrado.' });
    }
    return next(error);
  }
}

// ── PUT /api/usuarios/:id ────────────────────────────────────

async function atualizar(req, res, next) {
  try {
    const usuario = await Usuario.findOne({ where: { id: req.params.id } });
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const { nome, email, role, senha } = req.body;
    let hash = usuario.senha;
    if (senha) {
      hash = await bcrypt.hash(senha, 10);
    }

    const userRole = normalizeRole(role);

    await usuario.update({
      nome: nome || usuario.nome,
      email: email || usuario.email,
      role: role ? userRole : usuario.role,
      senha: hash,
    });

    return res.json({
      success: true,
      message: 'Usuário atualizado com sucesso!',
      data: { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Email já cadastrado.' });
    }
    return next(error);
  }
}

// ── DELETE /api/usuarios/:id ─────────────────────────────────

async function remover(req, res, next) {
  try {
    const usuario = await Usuario.findOne({ where: { id: req.params.id } });
    if (!usuario) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    await usuario.destroy();

    return res.json({
      success: true,
      message: 'Usuário removido com sucesso!',
    });
  } catch (error) {
    return next(error);
  }
}

// ── POST /api/usuarios/convidar (gerente only) ───────────────

async function convidarUsuario(req, res, next) {
  try {
    const { nome, email, role, funcionarioId } = req.body;

    if (!nome || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Nome, email e role são obrigatórios.',
      });
    }

    // [OWASP A03] Validação de formato de e-mail
    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de e-mail inválido.',
      });
    }

    // [OWASP A07] Anti-enumeração: não revelar se e-mail já existe
    // Retornamos 201 sem enviar e-mail para não expor dados cadastrais
    const existente = await Usuario.findOne({ where: { email } });
    if (existente) {
      return res.status(201).json({
        success: true,
        message: `Convite enviado com sucesso para ${email}!`,
      });
    }

    // Gera token seguro e define expiração de 24h
    const token = crypto.randomBytes(32).toString('hex');
    const expiracao = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Cria usuário com status pendente e sem senha
    await Usuario.create({
      nome,
      email,
      senha: null,
      role: normalizeRole(role),
      status: 'pendente',
      conviteToken: token,
      conviteExpiracao: expiracao,
      funcionarioId: funcionarioId || null,
    });

    // Delega o envio do e-mail ao emailService (SRP)
    await enviarConvite({ nome, email, token });

    return res.status(201).json({
      success: true,
      message: `Convite enviado com sucesso para ${email}!`,
    });
  } catch (error) {
    return next(error);
  }
}

// ── POST /api/usuarios/definir-senha (público) ───────────────

async function definirSenhaConvite(req, res, next) {
  try {
    const { token, senha } = req.body;

    if (!token || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Token e senha são obrigatórios.',
      });
    }

    // [OWASP A03] Trim previne bypass com espaços: '      ' teria length >= 6
    const senhaTrimmed = String(senha).trim();
    if (senhaTrimmed.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter no mínimo 6 caracteres.',
      });
    }

    // [OWASP A03] Valida que token é hex de 64 chars (32 bytes)
    if (!/^[a-f0-9]{64}$/.test(String(token))) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado. Solicite um novo convite.',
      });
    }

    // Busca usuário pelo token e valida expiração
    const usuario = await Usuario.findOne({
      // Rota pública: o token de convite é único globalmente e já identifica
      // o usuário — e, por consequência, a empresa dele.
      ignoraTenant: true,
      where: {
        conviteToken: token,
        conviteExpiracao: { [Op.gt]: new Date() },
        status: 'pendente',
      },
    });

    if (!usuario) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado. Solicite um novo convite.',
      });
    }

    // Hash da senha e ativação da conta
    const senhaHash = await bcrypt.hash(senhaTrimmed, 10);

    await usuario.update({
      senha: senhaHash,
      status: 'ativo',
      conviteToken: null,
      conviteExpiracao: null,
    });

    return res.json({
      success: true,
      message: 'Senha definida com sucesso! Você já pode fazer login.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, criar, atualizar, remover, convidarUsuario, definirSenhaConvite };

