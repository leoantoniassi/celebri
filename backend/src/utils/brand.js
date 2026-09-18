// ============================================================
// Marca do tenant em textos voltados ao usuário final
// ============================================================
// Mensagens de WhatsApp e e-mails saem em nome do buffet contratante,
// não do Celebri. Antes o nome "Mais Alegria" estava fixo em 5
// controllers e 2 templates de e-mail — cada novo cliente exigiria
// editar código.
//
// A busca é cacheada em memória por tenant: estas funções são chamadas
// em quase toda mensagem enviada, e a identidade visual muda raramente.
// ============================================================
const { Empresa } = require('../models');
const { getEmpresaId } = require('./tenantContext');

const TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // empresaId → { valor, expiraEm }

const PADRAO = {
  nomeFantasia: 'Celebri',
  logoUrl: null,
  corPrimaria: '#1CEAFF',
  corTexto: '#021a1d',
};

/**
 * Cor de texto legível sobre um fundo.
 *
 * E-mail em HTML não tem acesso ao motor de tema do frontend, e o botão
 * precisa ser lido tanto sobre um amarelo claro quanto sobre um azul
 * escuro. Decide por luminância relativa (WCAG).
 */
function corDeTextoSobre(hexFundo) {
  const hex = String(hexFundo || '').replace('#', '');
  if (hex.length !== 6) return PADRAO.corTexto;

  const canal = (inicio) => {
    const v = parseInt(hex.slice(inicio, inicio + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminancia = 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);

  // Fundo claro pede texto quase preto; fundo escuro pede branco.
  return luminancia > 0.45 ? '#1a1a1a' : '#ffffff';
}

/**
 * Identidade do tenant informado (ou do contexto da requisição).
 * Nunca lança: se o buffet não for encontrado, cai no padrão do produto.
 */
async function obterMarca(empresaId = getEmpresaId()) {
  if (!empresaId) return { ...PADRAO };

  const emCache = cache.get(empresaId);
  if (emCache && emCache.expiraEm > Date.now()) return emCache.valor;

  try {
    const empresa = await Empresa.findOne({
      where: { id: empresaId },
      ignoraTenant: true,
    });
    if (!empresa) return { ...PADRAO };

    const valor = {
      nomeFantasia: empresa.nomeFantasia,
      logoUrl: empresa.logoUrl,
      corPrimaria: empresa.corPrimaria,
      corTexto: corDeTextoSobre(empresa.corPrimaria),
    };
    cache.set(empresaId, { valor, expiraEm: Date.now() + TTL_MS });
    return valor;
  } catch {
    return { ...PADRAO };
  }
}

/** Invalida o cache após a identidade visual ser alterada. */
function invalidarCache(empresaId) {
  if (empresaId) cache.delete(empresaId);
  else cache.clear();
}

/** Nome do buffet para uso em mensagens. */
async function nomeDaEmpresa(empresaId) {
  return (await obterMarca(empresaId)).nomeFantasia;
}

/** Saudação padrão de WhatsApp, em nome do buffet. */
async function saudacaoWhatsapp(nomeDestinatario, complemento = '') {
  const nome = await nomeDaEmpresa();
  const sufixo = complemento ? ` ${complemento}` : '';
  return `Olá ${nomeDestinatario}, aqui é a equipe ${nome}${sufixo}.`;
}

module.exports = {
  obterMarca,
  nomeDaEmpresa,
  saudacaoWhatsapp,
  invalidarCache,
  corDeTextoSobre,
  PADRAO,
};
