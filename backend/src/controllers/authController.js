// ============================================================
// Controller: Autenticação (Login / Register)
// ============================================================
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Usuario, Empresa, Funcionario, Funcao } = require('../models');
const { resolverTenant } = require('../utils/resolverTenant');
const { enviarEmailRecuperacaoSenha } = require('../services/emailService');

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios.',
      });
    }

    // O mesmo e-mail pode existir em buffets diferentes, então a empresa
    // precisa ser resolvida antes de procurar o usuário.
    const { empresa, erro } = await resolverTenant(req);
    if (erro && !empresa) {
      return res.status(400).json({ success: false, message: erro });
    }

    // super_admin (dono da plataforma) não pertence a empresa nenhuma.
    const usuario = await Usuario.findOne({
      where: {
        email,
        [Op.or]: [{ empresaId: empresa.id }, { role: 'super_admin' }],
      },
      ignoraTenant: true,
    });
    if (!usuario || !usuario.senha) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas.',
      });
    }

    if (usuario.role !== 'super_admin' && empresa.status !== 'ativo') {
      return res.status(403).json({
        success: false,
        message: 'Esta empresa está com o acesso suspenso. Fale com o suporte.',
      });
    }

    // Verifica senha (converte hash $2y$ para $2a$ para garantir compatibilidade com o bcryptjs)
    const hashCompativel = usuario.senha.replace(/^\$2y\$/, '$2a$');
    const senhaValida = await bcrypt.compare(senha, hashCompativel);
    if (!senhaValida) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas.',
      });
    }

    // Gera token
    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        role: usuario.role,
        empresaId: usuario.empresaId,
        funcionarioId: usuario.funcionarioId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Se a conta estiver vinculada a um funcionário de campo (app mobile),
    // traz os dados já resolvidos para evitar uma chamada extra do cliente.
    const funcionario = usuario.funcionarioId
      ? await Funcionario.findOne({
          where: { id: usuario.funcionarioId },
          include: [{ model: Funcao, as: 'funcao', attributes: ['id', 'nome'] }],
          ignoraTenant: true,
        })
      : null;

    return res.json({
      success: true,
      message: 'Login realizado com sucesso!',
      data: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        empresaId: usuario.empresaId,
        empresa: usuario.empresaId
          ? { id: empresa.id, nomeFantasia: empresa.nomeFantasia, slug: empresa.slug }
          : null,
        funcionarioId: usuario.funcionarioId,
        funcionario: funcionario
          ? { id: funcionario.id, nome: funcionario.nome, funcao: funcionario.funcao?.nome || null }
          : null,
      },
      token,
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/auth/recuperar-senha (público)
async function solicitarRecuperacaoSenha(req, res, next) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'O e-mail é obrigatório.',
      });
    }

    // Validação de formato simples
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
      return res.status(400).json({
        success: false,
        message: 'Formato de e-mail inválido.',
      });
    }

    // [OWASP A07] Anti-enumeração de contas: sempre retorna resposta genérica de sucesso
    const mensagemSucesso = 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.';

    // O e-mail só é único dentro de uma empresa, então o tenant precisa ser
    // resolvido antes da busca. Empresa não identificada devolve a mesma
    // mensagem genérica, para não virar um oráculo de quais buffets existem.
    const { empresa } = await resolverTenant(req);
    if (!empresa) {
      return res.json({ success: true, message: mensagemSucesso });
    }

    const usuario = await Usuario.findOne({
      where: { email, empresaId: empresa.id },
      ignoraTenant: true,
    });

    if (!usuario) {
      return res.json({
        success: true,
        message: mensagemSucesso,
      });
    }

    // Gera token de 32 bytes (hex de 64 caracteres)
    const token = crypto.randomBytes(32).toString('hex');
    const expiracao = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de expiração

    await usuario.update({
      resetToken: token,
      resetExpiracao: expiracao,
    });

    // Envia o e-mail de recuperação de forma assíncrona
    await enviarEmailRecuperacaoSenha({
      nome: usuario.nome,
      email: usuario.email,
      token,
      empresaId: empresa.id,
    });

    return res.json({
      success: true,
      message: mensagemSucesso,
    });
  } catch (error) {
    return next(error);
  }
}

// POST /api/auth/redefinir-senha (público)
async function redefinirSenha(req, res, next) {
  try {
    const { token, senha } = req.body;

    if (!token || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Token e senha são obrigatórios.',
      });
    }

    const senhaTrimmed = String(senha).trim();
    if (senhaTrimmed.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'A senha deve ter no mínimo 6 caracteres.',
      });
    }

    // Valida se token é hex de 64 caracteres
    if (!/^[a-f0-9]{64}$/.test(String(token))) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado. Solicite a redefinição de senha novamente.',
      });
    }

    // Busca usuário pelo token e expiração
    const usuario = await Usuario.findOne({
      // Rota pública: o token de reset é único globalmente e já identifica
      // o usuário — e, por consequência, a empresa dele.
      ignoraTenant: true,
      where: {
        resetToken: token,
        resetExpiracao: { [Op.gt]: new Date() },
      },
    });

    if (!usuario) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado. Solicite a redefinição de senha novamente.',
      });
    }

    // Hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senhaTrimmed, salt);

    // Atualiza senha e anula campos de reset
    await usuario.update({
      senha: senhaHash,
      resetToken: null,
      resetExpiracao: null,
    });

    return res.json({
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode fazer login.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { login, solicitarRecuperacaoSenha, redefinirSenha };
