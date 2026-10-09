// ============================================================
// Controller: Usuários — CRUD + Convite + Ativação
// ============================================================
const bcrypt = require('bcryptjs');
const { Op, Transaction } = require('sequelize');
const sequelize = require('../config/database');
const { Usuario, Funcionario } = require('../models');
const { enviarConvite } = require('../services/emailService');
const { validarSenha } = require('../utils/validators');
const { garantirExistenciaNoTenant } = require('../utils/tenantFk');
const { gerarToken, hashToken } = require('../utils/tokens');
const { revogarSessoes, VALIDADE, TERMOS_VERSAO } = require('../config/seguranca');
const auditoria = require('../services/auditoriaService');

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

/**
 * O funcionário vinculado precisa existir NESTE tenant: o id vem do body e o
 * login carrega o funcionário com ignoraTenant, então um id de outro buffet
 * vazaria nome e função dele.
 * @returns {Promise<string|null>} mensagem de erro, ou null se válido/ausente
 */
async function validarFuncionarioId(funcionarioId) {
  try {
    await garantirExistenciaNoTenant(Funcionario, funcionarioId, 'Funcionário');
    return null;
  } catch (error) {
    if (error.expose) return error.message;
    throw error;
  }
}

/** Outros gerentes ativos do tenant além de `usuario`. */
function contarOutrosGerentesAtivos(usuario, transaction) {
  return Usuario.count({
    where: { role: 'gerente', status: 'ativo', id: { [Op.ne]: usuario.id } },
    transaction,
  });
}

/**
 * Executa `fn(transaction)` com as linhas de gerente do tenant travadas
 * (SELECT ... FOR UPDATE). Sem a trava, dois gerentes se removendo/rebaixando
 * ao mesmo tempo veriam "ainda há outro gerente" e deixariam a empresa sem nenhum.
 * A contagem precisa ser feita DENTRO de `fn`, depois da trava.
 */
function comGerentesTravados(fn) {
  return sequelize.transaction(async (transaction) => {
    await Usuario.findAll({
      where: { role: 'gerente' },
      attributes: ['id'],
      lock: Transaction.LOCK.UPDATE,
      transaction,
    });
    return fn(transaction);
  });
}

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

    if (typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Formato de e-mail inválido.' });
    }

    const senhaTrimmed = String(senha).trim();
    const erroSenha = validarSenha(senhaTrimmed, email);
    if (erroSenha) {
      return res.status(400).json({ success: false, message: erroSenha });
    }

    const erroFuncionario = await validarFuncionarioId(funcionarioId);
    if (erroFuncionario) {
      return res.status(400).json({ success: false, message: erroFuncionario });
    }

    const userRole = normalizeRole(role);
    const hash = await bcrypt.hash(senhaTrimmed, 10);

    const usuario = await Usuario.create({
      nome,
      email,
      senha: hash,
      role: userRole,
      status: 'ativo',
      funcionarioId: funcionarioId || null,
    });

    await auditoria.registrar({
      req, acao: 'usuario.criado', entidade: 'usuario', entidadeId: usuario.id,
      detalhes: { papel: usuario.role, comFuncionario: Boolean(usuario.funcionarioId) },
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
    if (email && (typeof email !== 'string' || !isValidEmail(email))) {
      return res.status(400).json({ success: false, message: 'Formato de e-mail inválido.' });
    }
    let hash = usuario.senha;
    if (senha) {
      const senhaTrimmed = String(senha).trim();
      const erroSenha = validarSenha(senhaTrimmed, email || usuario.email);
      if (erroSenha) {
        return res.status(400).json({ success: false, message: erroSenha });
      }
      hash = await bcrypt.hash(senhaTrimmed, 10);
    }

    const userRole = normalizeRole(role);
    const novoRole = role ? userRole : usuario.role;
    const papelAnterior = usuario.role;

    // Troca de senha ou de papel revoga as sessões abertas (o papel vai no JWT).
    const revogar = Boolean(senha) || novoRole !== usuario.role;

    const gravar = (transaction) => {
      const dados = {
        nome: nome || usuario.nome,
        email: email || usuario.email,
        role: novoRole,
        senha: hash,
        ...(revogar && revogarSessoes(usuario)),
      };
      return transaction ? usuario.update(dados, { transaction }) : usuario.update(dados);
    };

    // O tenant nunca pode ficar sem gerente ativo.
    if (usuario.role === 'gerente' && novoRole !== 'gerente' && usuario.status === 'ativo') {
      const ultimo = await comGerentesTravados(async (transaction) => {
        if ((await contarOutrosGerentesAtivos(usuario, transaction)) === 0) return true;
        await gravar(transaction);
        return false;
      });
      if (ultimo) {
        return res.status(409).json({
          success: false,
          message: 'Não é possível rebaixar o último gerente ativo da empresa.',
        });
      }
    } else {
      await gravar();
    }

    if (novoRole !== papelAnterior) {
      await auditoria.registrar({
        req, acao: 'usuario.papel.alterado', entidade: 'usuario', entidadeId: usuario.id,
        detalhes: { papelAnterior, papelNovo: novoRole },
      });
    }
    if (senha) {
      await auditoria.registrar({ req, acao: 'usuario.senha.alterada', entidade: 'usuario', entidadeId: usuario.id, detalhes: { origem: 'gerente' } });
    }

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

    if (usuario.id === req.user?.id) {
      return res.status(409).json({ success: false, message: 'Você não pode remover a própria conta.' });
    }

    if (usuario.role === 'gerente' && usuario.status === 'ativo') {
      const ultimo = await comGerentesTravados(async (transaction) => {
        if ((await contarOutrosGerentesAtivos(usuario, transaction)) === 0) return true;
        await usuario.destroy({ transaction });
        return false;
      });
      if (ultimo) {
        return res.status(409).json({
          success: false,
          message: 'Não é possível remover o último gerente ativo da empresa.',
        });
      }
    } else {
      await usuario.destroy();
    }

    await auditoria.registrar({
      req, acao: 'usuario.removido', entidade: 'usuario', entidadeId: usuario.id,
      detalhes: { papel: usuario.role },
    });

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

    const erroFuncionario = await validarFuncionarioId(funcionarioId);
    if (erroFuncionario) {
      return res.status(400).json({ success: false, message: erroFuncionario });
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

    // Gera token seguro e define expiração de 24h. O e-mail leva o token
    // cru; o banco guarda só o hash.
    const token = gerarToken();
    const expiracao = new Date(Date.now() + VALIDADE.conviteMs);

    // Cria usuário com status pendente e sem senha
    const convidado = await Usuario.create({
      nome,
      email,
      senha: null,
      role: normalizeRole(role),
      status: 'pendente',
      conviteToken: hashToken(token),
      conviteExpiracao: expiracao,
      funcionarioId: funcionarioId || null,
    });

    await auditoria.registrar({
      req, acao: 'usuario.convidado', entidade: 'usuario', entidadeId: convidado && convidado.id,
      detalhes: { papel: normalizeRole(role) },
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
    const { token, senha, aceiteTermos } = req.body;

    if (!token || !senha) {
      return res.status(400).json({
        success: false,
        message: 'Token e senha são obrigatórios.',
      });
    }

    // [OWASP A03] Trim previne bypass com espaços
    const senhaTrimmed = String(senha).trim();
    const erroSenha = validarSenha(senhaTrimmed);
    if (erroSenha) {
      return res.status(400).json({ success: false, message: erroSenha });
    }

    // [OWASP A03] Valida que token é hex de 64 chars (32 bytes)
    if (!/^[a-f0-9]{64}$/.test(String(token))) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado. Solicite um novo convite.',
      });
    }

    // LGPD: o convite web exige aceite explícito dos termos e da política de privacidade.
    if (aceiteTermos !== true) {
      return res.status(400).json({
        success: false,
        message: 'É necessário aceitar os Termos de Uso e a Política de Privacidade.',
      });
    }

    // Busca usuário pelo token e valida expiração
    const usuario = await Usuario.findOne({
      // Rota pública: o token de convite é único globalmente e já identifica
      // o usuário — e, por consequência, a empresa dele.
      ignoraTenant: true,
      where: {
        conviteToken: hashToken(token),
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

    const erroSenhaConta = validarSenha(senhaTrimmed, usuario.email);
    if (erroSenhaConta) {
      return res.status(400).json({ success: false, message: erroSenhaConta });
    }

    // Hash da senha e ativação da conta
    const senhaHash = await bcrypt.hash(senhaTrimmed, 10);

    await usuario.update({
      senha: senhaHash,
      status: 'ativo',
      conviteToken: null,
      conviteExpiracao: null,
      resetToken: null,
      resetExpiracao: null,
      termosAceitosEm: new Date(),
      termosVersao: TERMOS_VERSAO,
      ...revogarSessoes(usuario),
    });

    await auditoria.registrar({
      req, usuario: { id: usuario.id }, empresaId: usuario.empresaId,
      acao: 'auth.senha.definida', entidade: 'usuario', entidadeId: usuario.id,
      detalhes: { origem: 'convite', termosVersao: TERMOS_VERSAO },
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

