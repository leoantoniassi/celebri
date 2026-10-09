// ============================================================
// Controller: Autenticação (Login / Register)
// ============================================================
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { Usuario, Empresa, Funcionario, Funcao } = require('../models');
const { resolverTenant } = require('../utils/resolverTenant');
const emailService = require('../services/emailService');
const { enviarEmailRecuperacaoSenha } = emailService;
const { assinarToken, revogarSessoes, LIMITES, VALIDADE, TERMOS_VERSAO, MSG_MUITAS_TENTATIVAS } = require('../config/seguranca');
const { validarSenha } = require('../utils/validators');
const { gerarToken, hashToken } = require('../utils/tokens');
const { criarBloqueio } = require('../middleware/bloqueioConta');
const { criarContadorJanela } = require('../utils/janelaContador');
const auditoria = require('../services/auditoriaService');

/** Registra evento de autenticação da conta `usuario` (entidade fixa; sem e-mail, só o id). */
const auditarConta = (req, usuario, empresaId, acao, detalhes) => auditoria.registrar({
  req, usuario: { id: usuario.id }, empresaId, acao, entidade: 'usuario', entidadeId: usuario.id, detalhes,
});

// Bloqueio por conta (e-mail + empresa) após falhas seguidas. Em memória.
const bloqueioLogin = criarBloqueio({
  maxFalhas: LIMITES.loginMaxFalhas,
  bloqueioMs: LIMITES.loginBloqueioMs,
});

// Reenvio do código de primeiro acesso: limite por conta.
const limiteEnvioCodigo = criarContadorJanela({
  max: LIMITES.codigoReenvioMax,
  janelaMs: LIMITES.codigoReenvioJanelaMs,
});

// Hash bcrypt (custo 10) de um valor descartável. Usado quando a conta não
// existe, para o login gastar o mesmo tempo e não revelar quais e-mails existem.
const HASH_DUMMY = '$2a$10$lhIua72p5491AMeffBcxy.Xv5JdJWtKwtPNC9oeq7SCvOOYmwogg.';

const MSG_CREDENCIAIS = 'Credenciais inválidas.';
const EMAIL_MAX = 254;
const SENHA_LOGIN_MAX = 1024; // evita bcrypt/Map com entradas gigantes
const MSG_EMAIL_INVALIDO = 'Informe um e-mail válido.';

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha || typeof email !== 'string' || typeof senha !== 'string') {
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

    // Entradas absurdas não chegam ao bcrypt nem viram chave do bloqueio.
    if (email.length > EMAIL_MAX || senha.length > SENHA_LOGIN_MAX) {
      return res.status(401).json({ success: false, message: MSG_CREDENCIAIS });
    }

    // Bloqueio por conta, contado também para e-mails que não existem.
    const chave = `${empresa.id}:${email.trim().toLowerCase()}`;
    if (bloqueioLogin.restante(chave) > 0) {
      return res.status(429).json({ success: false, message: MSG_MUITAS_TENTATIVAS });
    }

    // super_admin (dono da plataforma) não pertence a empresa nenhuma.
    const usuario = await Usuario.findOne({
      where: {
        email,
        [Op.or]: [{ empresaId: empresa.id }, { role: 'super_admin' }],
      },
      ignoraTenant: true,
    });

    // Segunda chave, pelo id da conta: o super_admin vale em qualquer empresa
    // (slug), então só a chave "empresa:e-mail" deixaria tentar 5 senhas por slug.
    const chaveConta = usuario ? `conta:${usuario.id}` : null;
    if (chaveConta && bloqueioLogin.restante(chaveConta) > 0) {
      return res.status(429).json({ success: false, message: MSG_MUITAS_TENTATIVAS });
    }

    // bcrypt.compare roda SEMPRE (hash dummy se a conta não existe ou ainda
    // não tem senha), para o tempo de resposta não revelar se o e-mail existe.
    // Converte hash $2y$ para $2a$ para garantir compatibilidade com o bcryptjs.
    const hashCompativel = usuario?.senha ? usuario.senha.replace(/^\$2y\$/, '$2a$') : HASH_DUMMY;
    const senhaConfere = await bcrypt.compare(senha, hashCompativel);

    if (!usuario || !usuario.senha || !senhaConfere) {
      bloqueioLogin.falhou(chave);
      if (chaveConta) bloqueioLogin.falhou(chaveConta);
      // Sem e-mail no log: só o id da conta (quando existe) e o IP.
      const alvo = { req, usuario: usuario ? { id: usuario.id } : null, empresaId: empresa.id, entidade: 'usuario', entidadeId: usuario ? usuario.id : null };
      await auditoria.registrar({ ...alvo, acao: 'auth.login.falha', detalhes: { motivo: usuario ? 'credenciais' : 'conta_inexistente' } });
      if (bloqueioLogin.restante(chave) > 0 || (chaveConta && bloqueioLogin.restante(chaveConta) > 0)) {
        await auditoria.registrar({ ...alvo, acao: 'auth.conta.bloqueada', detalhes: { falhasMax: LIMITES.loginMaxFalhas } });
      }
      return res.status(401).json({ success: false, message: MSG_CREDENCIAIS });
    }

    // Só depois de provar a senha é que se revela a suspensão da empresa.
    if (usuario.role !== 'super_admin' && empresa.status !== 'ativo') {
      await auditarConta(req, usuario, empresa.id, 'auth.login.falha', { motivo: 'empresa_suspensa' });
      return res.status(403).json({
        success: false,
        message: 'Esta empresa está com o acesso suspenso. Fale com o suporte.',
      });
    }

    bloqueioLogin.limpar(chave);
    if (chaveConta) bloqueioLogin.limpar(chaveConta);

    const sessao = await montarSessao(usuario, empresa);
    await auditarConta(req, usuario, usuario.empresaId || empresa.id, 'auth.login.ok', { papel: usuario.role });
    return res.json({ success: true, message: 'Login realizado com sucesso!', ...sessao });
  } catch (error) {
    return next(error);
  }
}

/** Token JWT + dados do usuário, no formato devolvido pelo login. */
async function montarSessao(usuario, empresa) {
  const token = assinarToken(usuario);

  // Se a conta estiver vinculada a um funcionário de campo (app mobile),
  // traz os dados já resolvidos para evitar uma chamada extra do cliente.
  const funcionario = usuario.funcionarioId
    ? await Funcionario.findOne({
        where: { id: usuario.funcionarioId },
        include: [{ model: Funcao, as: 'funcao', attributes: ['id', 'nome'] }],
        ignoraTenant: true,
      })
    : null;

  return {
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
  };
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MSG_TOKEN_INVALIDO = 'Token inválido ou expirado. Solicite a redefinição de senha novamente.';

const gerarCodigo = () => crypto.randomInt(0, 1000000).toString().padStart(6, '0');

/** Código de primeiro acesso gravado e ainda dentro da validade. */
const temCodigoVigente = (usuario) =>
  Boolean(usuario.codigoHash && usuario.codigoExpiracao && new Date(usuario.codigoExpiracao) > new Date());

// POST /api/auth/identificar (público)
// Primeiro passo do app mobile: o funcionário informa só o e-mail e
// descobre em quais buffets está cadastrado. Revela se o e-mail existe,
// por isso a rota tem limite de requisições.
async function identificar(req, res, next) {
  try {
    const email = String(req.body?.email || '').trim();
    if (!EMAIL_VALIDO.test(email)) {
      return res.status(400).json({ success: false, message: MSG_EMAIL_INVALIDO });
    }

    const usuarios = await Usuario.findAll({
      where: { email, empresaId: { [Op.ne]: null } },
      ignoraTenant: true,
    });
    if (usuarios.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const empresas = await Empresa.findAll({
      where: { id: usuarios.map((u) => u.empresaId), status: 'ativo' },
      ignoraTenant: true,
    });

    const data = empresas.map((empresa) => {
      const usuario = usuarios.find((u) => u.empresaId === empresa.id);
      return {
        slug: empresa.slug,
        nomeFantasia: empresa.nomeFantasia,
        logoUrl: empresa.logoUrl || null,
        primeiroAcesso: !usuario.senha,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
}

/** Usuário ainda sem senha, no buffet da requisição. */
async function buscarPendente(req, email) {
  const { empresa } = await resolverTenant(req);
  if (!empresa || empresa.status !== 'ativo') return {};
  const usuario = await Usuario.findOne({
    where: { email, empresaId: empresa.id, senha: null },
    ignoraTenant: true,
  });
  return { empresa, usuario };
}

// POST /api/auth/primeiro-acesso/codigo (público)
async function enviarCodigoPrimeiroAcesso(req, res, next) {
  try {
    const email = String(req.body?.email || '').trim();
    if (!EMAIL_VALIDO.test(email)) {
      return res.status(400).json({ success: false, message: MSG_EMAIL_INVALIDO });
    }

    const mensagem = 'Se o e-mail estiver cadastrado, você receberá um código de acesso.';
    const { empresa, usuario } = await buscarPendente(req, email);
    if (!usuario) {
      return res.json({ success: true, message: mensagem });
    }

    // Limite por conta: reenvios não dão novas chances de adivinhar o código.
    // O contador de tentativas só recomeça quando não há código vigente; com
    // o limite já estourado e o código ainda válido, não se envia outro.
    const tentativas = temCodigoVigente(usuario) ? (usuario.codigoTentativas || 0) : 0;
    if (tentativas >= LIMITES.codigoMaxTentativas || !limiteEnvioCodigo.registrar(usuario.id)) {
      return res.json({ success: true, message: mensagem });
    }

    const codigo = gerarCodigo();
    await usuario.update({
      codigoHash: hashToken(codigo),
      codigoExpiracao: new Date(Date.now() + LIMITES.codigoValidadeMs),
      codigoTentativas: tentativas,
    });

    // Falha de SMTP não pode virar 500 só para e-mails cadastrados (oráculo de
    // enumeração). O emailService já registra a falha, sem dados pessoais.
    await emailService.enviarCodigoPrimeiroAcesso({
      nome: usuario.nome,
      email: usuario.email,
      codigo,
      empresaId: empresa.id,
    }).catch(() => {});

    return res.json({ success: true, message: mensagem });
  } catch (error) {
    return next(error);
  }
}

// Confirmações em andamento por e-mail. Sem isso, N requisições paralelas leem
// codigoTentativas=0 antes de qualquer uma gravar e burlam o máximo de 5.
const confirmando = new Set();

// POST /api/auth/primeiro-acesso/confirmar (público)
// Confere o código, grava a senha e já devolve a sessão, como o login.
async function confirmarPrimeiroAcesso(req, res, next) {
  const travaChave = String(req.body?.email || '').trim().toLowerCase();
  if (confirmando.has(travaChave)) {
    return res.status(429).json({ success: false, message: MSG_MUITAS_TENTATIVAS });
  }
  confirmando.add(travaChave);
  try {
    const email = String(req.body?.email || '').trim();
    const codigo = String(req.body?.codigo || '').trim();
    const senha = String(req.body?.senha || '').trim();

    if (!EMAIL_VALIDO.test(email) || !/^\d{6}$/.test(codigo)) {
      return res.status(400).json({ success: false, message: 'E-mail e código de 6 dígitos são obrigatórios.' });
    }
    const erroSenha = validarSenha(senha, email);
    if (erroSenha) {
      return res.status(400).json({ success: false, message: erroSenha });
    }

    const invalido = { success: false, message: 'Código inválido ou expirado. Solicite um novo código.' };
    const { empresa, usuario } = await buscarPendente(req, email);
    if (!usuario || !temCodigoVigente(usuario) || usuario.codigoTentativas >= LIMITES.codigoMaxTentativas) {
      return res.status(400).json(invalido);
    }

    const confere = crypto.timingSafeEqual(
      Buffer.from(hashToken(codigo), 'hex'),
      Buffer.from(usuario.codigoHash, 'hex')
    );
    if (!confere) {
      await usuario.update({ codigoTentativas: usuario.codigoTentativas + 1 });
      return res.status(400).json(invalido);
    }

    await usuario.update({
      senha: await bcrypt.hash(senha, 10),
      status: 'ativo',
      codigoHash: null,
      codigoExpiracao: null,
      codigoTentativas: 0,
      conviteToken: null,
      conviteExpiracao: null,
      // O app mobile (fora deste repo) ainda não envia o aceite: só grava se vier.
      ...(req.body?.aceiteTermos === true && { termosAceitosEm: new Date(), termosVersao: TERMOS_VERSAO }),
      ...revogarSessoes(usuario),
    });

    await auditarConta(req, usuario, usuario.empresaId, 'auth.senha.definida', { origem: 'primeiro_acesso', termosAceitos: req.body?.aceiteTermos === true });
    const sessao = await montarSessao(usuario, empresa);
    return res.json({ success: true, message: 'Senha criada com sucesso!', ...sessao });
  } catch (error) {
    return next(error);
  } finally {
    confirmando.delete(travaChave);
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
    if (!EMAIL_VALIDO.test(String(email))) {
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
    const token = gerarToken();
    const expiracao = new Date(Date.now() + VALIDADE.resetSenhaMs);

    // O banco guarda só o hash; o e-mail leva o token cru.
    await usuario.update({
      resetToken: hashToken(token),
      resetExpiracao: expiracao,
    });

    // Envia o e-mail de recuperação de forma assíncrona
    // Mesma resposta mesmo se o SMTP falhar (evita oráculo de enumeração por
    // status 500); o emailService já registra a falha, sem dados pessoais.
    await Promise.resolve(enviarEmailRecuperacaoSenha({
      nome: usuario.nome,
      email: usuario.email,
      token,
      empresaId: empresa.id,
    })).catch(() => {});

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
    const erroSenha = validarSenha(senhaTrimmed);
    if (erroSenha) {
      return res.status(400).json({ success: false, message: erroSenha });
    }

    // Valida se token é hex de 64 caracteres
    if (!/^[a-f0-9]{64}$/.test(String(token))) {
      return res.status(400).json({
        success: false,
        message: MSG_TOKEN_INVALIDO,
      });
    }

    // Busca usuário pelo token e expiração
    const usuario = await Usuario.findOne({
      // Rota pública: o token de reset é único globalmente e já identifica
      // o usuário — e, por consequência, a empresa dele.
      ignoraTenant: true,
      where: {
        resetToken: hashToken(token),
        resetExpiracao: { [Op.gt]: new Date() },
      },
    });

    if (!usuario) {
      return res.status(400).json({
        success: false,
        message: MSG_TOKEN_INVALIDO,
      });
    }

    // Senha igual ao e-mail da conta (só conhecido depois de achar o usuário).
    const erroSenhaConta = validarSenha(senhaTrimmed, usuario.email);
    if (erroSenhaConta) {
      return res.status(400).json({ success: false, message: erroSenhaConta });
    }

    // Hash da nova senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senhaTrimmed, salt);

    // Atualiza senha e anula campos de reset
    await usuario.update({
      senha: senhaHash,
      resetToken: null,
      resetExpiracao: null,
      // Convite/código pendentes não podem sobrescrever a senha recém-definida.
      status: 'ativo',
      conviteToken: null,
      conviteExpiracao: null,
      codigoHash: null,
      codigoExpiracao: null,
      ...revogarSessoes(usuario), // derruba sessões abertas
    });

    await auditarConta(req, usuario, usuario.empresaId, 'auth.senha.redefinida');

    return res.json({
      success: true,
      message: 'Senha redefinida com sucesso! Você já pode fazer login.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  solicitarRecuperacaoSenha,
  redefinirSenha,
  identificar,
  enviarCodigoPrimeiroAcesso,
  confirmarPrimeiroAcesso,
};
