// ============================================================
// Controller: Empresas (tenants) — área do dono da plataforma
// ============================================================
// Só super_admin acessa. É aqui que um buffet novo é provisionado:
// cria-se a empresa e o primeiro usuário gerente, que recebe convite por
// e-mail para definir a própria senha.
// ============================================================
const { Empresa, Usuario } = require('../models');
const { success, fail } = require('../utils/response');
const { semEscopo } = require('../utils/tenantContext');
const { enviarConvite } = require('../services/emailService');
const { gerarToken, hashToken } = require('../utils/tokens');
const { VALIDADE } = require('../config/seguranca');
const sequelize = require('../config/database');
const { invalidarCache: invalidarMarca } = require('../utils/brand');
const auditoria = require('../services/auditoriaService');

const HEX = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function serializar(empresa) {
  return {
    id: empresa.id,
    nome: empresa.nome,
    nomeFantasia: empresa.nomeFantasia,
    slug: empresa.slug,
    logoUrl: empresa.logoUrl,
    cores: {
      primaria: empresa.corPrimaria,
      secundaria: empresa.corSecundaria,
      terciaria: empresa.corTerciaria,
    },
    emailContato: empresa.emailContato,
    telefone: empresa.telefone,
    plano: empresa.plano,
    status: empresa.status,
    criadoEm: empresa.criadoEm,
  };
}

// ── GET /api/empresas ────────────────────────────────────────
async function listar(_req, res, next) {
  try {
    const empresas = await Empresa.findAll({ order: [['nomeFantasia', 'ASC']] });
    return success(res, empresas.map(serializar));
  } catch (error) {
    return next(error);
  }
}

// ── GET /api/empresas/:id ────────────────────────────────────
async function buscarPorId(req, res, next) {
  try {
    const empresa = await Empresa.findOne({ where: { id: req.params.id } });
    if (!empresa) return fail(res, 'Empresa não encontrada.', 404);
    return success(res, serializar(empresa));
  } catch (error) {
    return next(error);
  }
}

// ── POST /api/empresas ───────────────────────────────────────
// Provisiona o buffet e convida o primeiro gerente.
async function criar(req, res, next) {
  try {
    const { nome, nomeFantasia, slug, cores, emailContato, telefone, plano, gerente } = req.body;

    if (!nome || !nomeFantasia || !slug) {
      return fail(res, 'Nome, nome fantasia e código da empresa são obrigatórios.');
    }
    const slugNormalizado = String(slug).trim().toLowerCase();
    if (!SLUG.test(slugNormalizado)) {
      return fail(res, 'Código da empresa deve ter de 3 a 60 caracteres: letras minúsculas, números e hífens.');
    }
    if (cores) {
      const invalida = ['primaria', 'secundaria', 'terciaria']
        .find((c) => cores[c] !== undefined && !HEX.test(String(cores[c])));
      if (invalida) return fail(res, `Cor ${invalida} inválida. Use o formato #RRGGBB.`);
    }
    if (!gerente?.nome || !gerente?.email) {
      return fail(res, 'Informe nome e e-mail do gerente responsável.');
    }
    if (!EMAIL.test(String(gerente.email))) {
      return fail(res, 'E-mail do gerente inválido.');
    }

    const jaExiste = await Empresa.scope('comDeletados')
      .findOne({ where: { slug: slugNormalizado } });
    if (jaExiste) return fail(res, 'Já existe uma empresa com este código.', 409);

    const token = gerarToken();

    // semEscopo: a criação atravessa dois tenants (nenhum, e o recém-criado),
    // então não pode passar pelo filtro automático.
    const { empresa, usuario } = await semEscopo(async () => {
      const empresa = await Empresa.create({
        nome: String(nome).trim(),
        nomeFantasia: String(nomeFantasia).trim(),
        slug: slugNormalizado,
        emailContato: emailContato || null,
        telefone: telefone || null,
        plano: plano || 'basico',
        ...(cores?.primaria && { corPrimaria: String(cores.primaria).toUpperCase() }),
        ...(cores?.secundaria && { corSecundaria: String(cores.secundaria).toUpperCase() }),
        ...(cores?.terciaria && { corTerciaria: String(cores.terciaria).toUpperCase() }),
      });

      const usuario = await Usuario.create({
        nome: String(gerente.nome).trim(),
        email: String(gerente.email).trim().toLowerCase(),
        senha: null, // definida pelo próprio gerente ao aceitar o convite
        role: 'gerente',
        status: 'pendente',
        empresaId: empresa.id,
        conviteToken: hashToken(token), // o e-mail leva o token cru
        conviteExpiracao: new Date(Date.now() + VALIDADE.conviteMs),
      });

      return { empresa, usuario };
    });

    // Falha de e-mail não desfaz o provisionamento: o convite pode ser
    // reenviado depois, e perder a empresa seria pior.
    let conviteEnviado = true;
    try {
      await enviarConvite({
        nome: usuario.nome,
        email: usuario.email,
        token,
        empresaId: empresa.id,
      });
    } catch {
      conviteEnviado = false;
    }

    return success(
      res,
      { ...serializar(empresa), conviteEnviado },
      conviteEnviado
        ? 'Empresa criada! Convite enviado ao gerente.'
        : 'Empresa criada, mas o convite não pôde ser enviado. Reenvie pela tela de usuários.',
      201
    );
  } catch (error) {
    return next(error);
  }
}

// ── PUT /api/empresas/:id ────────────────────────────────────
async function atualizar(req, res, next) {
  try {
    const empresa = await Empresa.findOne({ where: { id: req.params.id } });
    if (!empresa) return fail(res, 'Empresa não encontrada.', 404);

    const { nome, nomeFantasia, emailContato, telefone, plano } = req.body;
    const alteracoes = {};

    if (nome !== undefined) alteracoes.nome = String(nome).trim();
    if (nomeFantasia !== undefined) alteracoes.nomeFantasia = String(nomeFantasia).trim();
    if (emailContato !== undefined) alteracoes.emailContato = emailContato || null;
    if (telefone !== undefined) alteracoes.telefone = telefone || null;
    if (plano !== undefined) {
      if (!['basico', 'profissional', 'enterprise'].includes(plano)) {
        return fail(res, 'Plano inválido.');
      }
      alteracoes.plano = plano;
    }

    if (Object.keys(alteracoes).length === 0) return fail(res, 'Nenhum campo para atualizar.');

    // O slug não é editável de propósito: é a chave pública usada no login
    // do app e nos links já distribuídos aos colaboradores.
    alteracoes.atualizadoEm = new Date();
    await empresa.update(alteracoes);
    invalidarMarca(empresa.id);

    return success(res, serializar(empresa), 'Empresa atualizada!');
  } catch (error) {
    return next(error);
  }
}

// ── PATCH /api/empresas/:id/status ───────────────────────────
// Suspender bloqueia o login mas preserva todos os dados do buffet.
async function mudarStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!['ativo', 'suspenso', 'cancelado'].includes(status)) {
      return fail(res, 'Status deve ser ativo, suspenso ou cancelado.');
    }

    const empresa = await Empresa.findOne({ where: { id: req.params.id } });
    if (!empresa) return fail(res, 'Empresa não encontrada.', 404);

    await empresa.update({ status, atualizadoEm: new Date() });
    invalidarMarca(empresa.id);

    // Suspender/cancelar derruba as sessões abertas dos usuários da empresa.
    if (status !== 'ativo') {
      await Usuario.update(
        { tokenVersion: sequelize.literal('usr_token_version + 1') },
        { where: { empresaId: empresa.id }, ignoraTenant: true }
      );
    }

    await auditoria.registrar({
      req, empresaId: empresa.id, acao: status === 'ativo' ? 'empresa.reativada' : 'empresa.suspensa',
      entidade: 'empresa', entidadeId: empresa.id, detalhes: { status },
    });

    return success(res, serializar(empresa), `Empresa marcada como ${status}.`);
  } catch (error) {
    return next(error);
  }
}

module.exports = { listar, buscarPorId, criar, atualizar, mudarStatus };
