// ============================================================
// Serviço de auditoria (LGPD) — registra ações sensíveis na tabela `auditoria`
// ============================================================
// Garantias:
//  - `registrar` NUNCA lança: falha de auditoria não derruba a requisição
//    (loga só uma mensagem curta, sem dados);
//  - `detalhes` nunca guarda dado pessoal: chaves proibidas (e-mail, CPF,
//    telefone, nome, token, senha...) são removidas e strings com cara de
//    e-mail são mascaradas.
// ============================================================

// Fragmentos de nome de chave (comparação em minúsculas, sem _ ou -).
const CHAVES_PROIBIDAS = [
  'email', 'cpf', 'cnpj', 'rgcpf', 'telefone', 'fone', 'celular', 'whatsapp',
  'nome', 'token', 'senha', 'password', 'passwd', 'secret', 'segredo', 'hash',
  'codigo', 'authorization', 'cookie', 'jwt', 'apikey', 'endereco',
  'mail', 'phone', 'name', 'address', 'nascimento', 'documento', 'logradouro', 'cep',
];

const EMAIL_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const MAX_STRING = 200;
const MAX_PROFUNDIDADE = 3;
const MAX_ITENS = 20;
const MAX_CHAVE = 60;
const MAX_JSON = 4000; // bytes do jsonb: acima disso, só um marcador
const CHAVES_PERIGOSAS = new Set(['__proto__', 'constructor', 'prototype']);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 8+ dígitos (CPF, CNPJ, telefone, cartão), mesmo com pontos, traços, espaços ou parênteses no meio.
const SEQUENCIA_NUMERICA_REGEX = /(?:\d[\s.\-()/]*){8,}/;
// eslint-disable-next-line no-control-regex
const CONTROLE_REGEX = /[\u0000-\u001f\u007f\u2028\u2029]/g;

/** Texto de uma linha só (sem quebras/controle): vai para o banco e para o log. */
const umaLinha = (valor, max) => {
  try { return String(valor).replace(CONTROLE_REGEX, ' ').slice(0, max); } catch { return ''; }
};

const chaveProibida = (chave) => {
  const normalizada = String(chave).toLowerCase().replace(/[_\-\s]/g, '');
  return CHAVES_PROIBIDAS.some((fragmento) => normalizada.includes(fragmento));
};

function sanitizarValor(valor, profundidade) {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor === 'string') {
    // Trunca ANTES dos regex: string enorme faria o regex de e-mail custar O(n²).
    const curto = valor.length > MAX_STRING ? valor.slice(0, MAX_STRING) : valor;
    if (EMAIL_REGEX.test(curto)) return '[removido]';
    if (!UUID_REGEX.test(curto) && SEQUENCIA_NUMERICA_REGEX.test(curto)) return '[removido]';
    return curto === valor ? valor : `${curto}...`;
  }
  if (typeof valor === 'number' || typeof valor === 'boolean') return valor;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? undefined : valor.toISOString();
  if (Buffer.isBuffer(valor) || ArrayBuffer.isView(valor) || valor instanceof ArrayBuffer) return undefined;
  if (profundidade >= MAX_PROFUNDIDADE) return undefined;
  if (Array.isArray(valor)) {
    return valor.slice(0, MAX_ITENS).map((v) => sanitizarValor(v, profundidade + 1)).filter((v) => v !== undefined);
  }
  if (typeof valor === 'object') {
    const interno = sanitizarDetalhes(valor, profundidade + 1);
    return interno === null ? undefined : interno;
  }
  return undefined; // funções, símbolos, bigint...
}

/** Copia `detalhes` sem chaves proibidas. Devolve null se não sobrar nada. */
function sanitizarDetalhes(detalhes, profundidade = 0) {
  if (!detalhes || typeof detalhes !== 'object') return null;
  const saida = Object.create(null);
  let chaves;
  try { chaves = Object.keys(detalhes).slice(0, MAX_ITENS * 5); } catch { return null; }
  chaves.forEach((chave) => {
    if (Object.keys(saida).length >= MAX_ITENS || CHAVES_PERIGOSAS.has(chave) || chaveProibida(chave)) return;
    try {
      // getter que lança, Date inválida etc.: só aquela chave é descartada.
      const valor = sanitizarValor(detalhes[chave], profundidade);
      if (valor !== undefined) saida[chave.slice(0, MAX_CHAVE)] = valor;
    } catch { /* descarta a chave */ }
  });
  return Object.keys(saida).length > 0 ? { ...saida } : null;
}

/** sanitizarDetalhes + teto de tamanho do jsonb. */
function prepararDetalhes(detalhes) {
  const limpo = sanitizarDetalhes(detalhes);
  if (limpo && JSON.stringify(limpo).length > MAX_JSON) return { truncado: true };
  return limpo;
}

/**
 * Registra uma ação. Aceita `req` (usa req.user e req.ip) e/ou `usuario`/`empresaId` explícitos.
 * @returns {Promise<boolean>} true se gravou; false se falhou (nunca lança)
 */
async function registrar({ req, usuario, empresaId, acao, entidade, entidadeId, detalhes } = {}) {
  try {
    // Import tardio: testes que mockam ../models sem Auditoria seguem funcionando.
    const { Auditoria } = require('../models');
    if (!Auditoria || typeof Auditoria.create !== 'function' || !acao) return false;

    const ator = usuario || (req && req.user) || null;
    await Auditoria.create({
      empresaId: empresaId || (ator && ator.empresaId) || null,
      usuarioId: (ator && ator.id) || null,
      acao: umaLinha(acao, 80),
      entidade: entidade ? umaLinha(entidade, 60) : null,
      entidadeId: entidadeId || null,
      ip: req && req.ip ? umaLinha(req.ip, 64) : null,
      detalhes: prepararDetalhes(detalhes),
    });
    return true;
  } catch (error) {
    // Só o tipo do erro: a mensagem do driver pode citar valores da linha.
    console.error(`[auditoria] falha ao registrar "${umaLinha(acao, 80)}": ${umaLinha((error && error.name) || 'Error', 40)}`);
    return false;
  }
}

module.exports = { registrar, sanitizarDetalhes, CHAVES_PROIBIDAS };
