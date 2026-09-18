// ============================================================
// Controller: Configuração do Tenant (identidade visual white label)
// ============================================================
const { Empresa } = require('../models');
const { success, fail } = require('../utils/response');
const { resolverTenant } = require('../utils/resolverTenant');
const { invalidarCache } = require('../utils/brand');

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Formato consumido pelo painel web e pelo app mobile. */
function serializar(empresa) {
  return {
    id: empresa.id,
    nomeFantasia: empresa.nomeFantasia,
    slug: empresa.slug,
    logoUrl: empresa.logoUrl,
    cores: {
      primaria: empresa.corPrimaria,
      secundaria: empresa.corSecundaria,
      terciaria: empresa.corTerciaria,
    },
  };
}

// ── GET /api/tenant/config ───────────────────────────────────
// Público: o app e a tela de login precisam da marca antes de existir
// um token. Devolve só dados de identidade visual, nada sensível.
async function obterConfig(req, res, next) {
  try {
    const { empresa, erro } = await resolverTenant(req);
    if (!empresa) return fail(res, erro || 'Empresa não encontrada.', 404);

    if (empresa.status === 'cancelado') {
      return fail(res, 'Empresa não encontrada.', 404);
    }

    return success(res, serializar(empresa));
  } catch (error) {
    return next(error);
  }
}

// ── PUT /api/tenant/config ───────────────────────────────────
// Gerente do buffet edita a própria identidade visual.
async function atualizarConfig(req, res, next) {
  try {
    let empresa = null;

    if (req.user?.empresaId) {
      empresa = await Empresa.findOne({ where: { id: req.user.empresaId } });
    }

    if (!empresa && req.user?.id) {
      const { Usuario } = require('../models');
      const usuario = await Usuario.findByPk(req.user.id, { ignoraTenant: true });
      if (usuario?.empresaId) {
        empresa = await Empresa.findByPk(usuario.empresaId);
      }
    }

    if (!empresa) {
      const { empresa: empresaResolvida } = await resolverTenant(req);
      empresa = empresaResolvida;
    }

    if (!empresa) {
      return fail(res, 'Empresa não encontrada. Por favor, saia e faça login novamente.', 404);
    }

    const { nomeFantasia, logoUrl, cores } = req.body;
    const alteracoes = {};

    if (nomeFantasia !== undefined) {
      const valor = String(nomeFantasia).trim();
      if (!valor) return fail(res, 'O nome fantasia não pode ficar vazio.');
      if (valor.length > 150) return fail(res, 'O nome fantasia deve ter no máximo 150 caracteres.');
      alteracoes.nomeFantasia = valor;
    }

    if (logoUrl !== undefined) {
      let valor = logoUrl === null ? null : String(logoUrl).trim();
      if (valor) {
        // Se usuário omitiu o protocolo (ex: "meusite.com/logo.png"), normaliza para https://
        if (/^\/\//.test(valor)) {
          valor = `https:${valor}`;
        } else if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(valor)) {
          valor = `https://${valor}`;
        }

        const ehHttp = /^https?:\/\//i.test(valor);
        const ehDataImage = /^data:image\/(png|jpeg|jpg|webp|svg\+xml|gif);base64,/i.test(valor);

        if (!ehHttp && !ehDataImage) {
          return fail(res, 'A logo deve ser uma URL http(s) válida.');
        }

        if (valor.length > 2048) {
          return fail(res, 'A URL da logo deve ter no máximo 2048 caracteres.');
        }
      }
      alteracoes.logoUrl = valor || null;
    }

    if (cores !== undefined) {
      const campos = {
        primaria: 'corPrimaria',
        secundaria: 'corSecundaria',
        terciaria: 'corTerciaria',
      };
      for (const [entrada, coluna] of Object.entries(campos)) {
        const valor = cores[entrada];
        if (valor === undefined) continue;
        if (!HEX.test(String(valor))) {
          return fail(res, `Cor ${entrada} inválida. Use o formato #RRGGBB.`);
        }
        alteracoes[coluna] = String(valor).toUpperCase();
      }
    }

    if (Object.keys(alteracoes).length === 0) {
      return fail(res, 'Nenhum campo para atualizar.');
    }

    alteracoes.atualizadoEm = new Date();
    await empresa.update(alteracoes);

    // Mensagens de WhatsApp e e-mail usam o nome e a cor daqui; sem isso
    // continuariam saindo com a marca antiga por até 5 minutos.
    invalidarCache(empresa.id);

    return success(res, serializar(empresa), 'Identidade visual atualizada!');
  } catch (error) {
    return next(error);
  }
}

module.exports = { obterConfig, atualizarConfig };
