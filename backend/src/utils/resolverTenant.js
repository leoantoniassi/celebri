// ============================================================
// Resolução de Tenant em rotas públicas
// ============================================================
// Login, recuperação de senha e ativação de convite acontecem antes de
// existir um JWT — então a empresa precisa vir da própria requisição.
//
// O mesmo e-mail pode existir em dois buffets diferentes, o que torna
// essa resolução obrigatória para o login não ficar ambíguo.
// ============================================================
const { Empresa } = require('../models');

/** Extrai o slug de um Host tipo "alegria.celebri.com.br". */
function slugDoSubdominio(host) {
  if (!host) return null;
  const nome = String(host).split(':')[0];
  const partes = nome.split('.');
  if (partes.length < 3) return null; // localhost, celebri.com.br
  const candidato = partes[0].toLowerCase();
  return ['www', 'api', 'app'].includes(candidato) ? null : candidato;
}

/** Slug informado na requisição, em ordem de precedência. */
function slugDaRequisicao(req) {
  return (
    req.get('X-Tenant-Slug') ||
    req.body?.codigoEmpresa ||
    req.body?.slug ||
    req.query?.slug ||
    slugDoSubdominio(req.get('host')) ||
    null
  );
}

/**
 * Resolve a empresa da requisição.
 *
 * Se nenhum slug for informado e existir exatamente uma empresa ativa no
 * banco, ela é assumida. Isso mantém instalações de cliente único (e o
 * frontend anterior a esta mudança) funcionando sem passar slug algum.
 * A partir da segunda empresa, a identificação passa a ser obrigatória.
 *
 * @returns {Promise<{empresa: Empresa|null, erro: string|null}>}
 */
async function resolverTenant(req) {
  const slug = slugDaRequisicao(req);

  if (slug) {
    const empresa = await Empresa.findOne({
      where: { slug: String(slug).toLowerCase() },
      ignoraTenant: true,
    });
    if (!empresa) return { empresa: null, erro: 'Empresa não encontrada.' };
    return { empresa, erro: null };
  }

  const ativas = await Empresa.findAll({
    where: { status: 'ativo' },
    limit: 2,
    ignoraTenant: true,
  });

  if (ativas.length === 1) return { empresa: ativas[0], erro: null };
  if (ativas.length === 0) return { empresa: null, erro: 'Nenhuma empresa cadastrada.' };
  return { empresa: null, erro: 'Informe o código da empresa.' };
}

module.exports = { resolverTenant, slugDaRequisicao, slugDoSubdominio };
