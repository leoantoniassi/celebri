// ============================================================
// Configuração de segurança: JWT, proxy, CORS e prazos
// ============================================================
const jwt = require('jsonwebtoken');

const ALGORITMO_JWT = 'HS256';
const JWT_SECRET_MIN = 32;

// ── Limites e prazos de autenticação (centralizados) ────────
const MINUTO_MS = 60 * 1000;
const HORA_MS = 60 * MINUTO_MS;

const LIMITES = {
  // Limite de requisições por IP (janela de 15 min), por rota pública.
  janelaIpMs: 15 * MINUTO_MS,
  loginPorIp: 30,
  recuperacaoPorIp: 10,
  redefinicaoPorIp: 10,
  definirSenhaPorIp: 10,
  primeiroAcessoPorIp: 20,
  // Bloqueio por conta no login (e-mail + empresa): 5 falhas -> 15 min.
  loginMaxFalhas: 5,
  loginBloqueioMs: 15 * MINUTO_MS,
  // Código de primeiro acesso: validade, tentativas e reenvios por conta.
  codigoValidadeMs: 15 * MINUTO_MS,
  codigoMaxTentativas: 5,
  codigoReenvioMax: 5,
  codigoReenvioJanelaMs: HORA_MS,
};

const VALIDADE = {
  resetSenhaMs: HORA_MS,
  conviteMs: 24 * HORA_MS,
};

// Versão vigente dos termos de uso / política de privacidade (docs/lgpd).
// Mude ao publicar nova versão dos textos; o aceite grava esta versão.
const TERMOS_VERSAO = process.env.TERMOS_VERSAO || '1.0';

const MSG_MUITAS_TENTATIVAS = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';

/** Campo para `update()` que invalida todos os JWT já emitidos do usuário. */
function revogarSessoes(usuario) {
  return { tokenVersion: (usuario.tokenVersion || 0) + 1 };
}

const AMBIENTES_CONHECIDOS = ['production', 'development', 'test'];

/**
 * Normaliza NODE_ENV (trim + minúsculas): "Production" vira "production".
 * Vazio/ausente = "development". Valor desconhecido (ex.: "prod", "staging")
 * lança erro: antes caía em modo de desenvolvimento (erros detalhados, sem
 * exigência de FRONTEND_URL/SSL) sem ninguém perceber.
 */
function normalizarAmbiente(env = process.env) {
  const bruto = String(env.NODE_ENV ?? '').trim().toLowerCase();
  if (!bruto) return 'development';
  if (!AMBIENTES_CONHECIDOS.includes(bruto)) {
    throw new Error(
      `NODE_ENV="${String(env.NODE_ENV).slice(0, 30)}" não reconhecido. Use: ${AMBIENTES_CONHECIDOS.join(', ')}.`
    );
  }
  return bruto;
}

// Trechos que denunciam valor de exemplo/placeholder copiado de documentação.
const PLACEHOLDERS_SEGREDO = [
  'troque', 'changeme', 'change-me', 'change_me', 'secret', 'defina', 'exemplo',
  'example', 'password', 'senha', 'placeholder', 'mais_alegria', '123456', 'xxxxxx',
];
const SENHAS_DB_FRACAS = ['postgres', 'admin', 'root', 'celebri', 'qwerty'];
const DB_PASS_MIN = 8;

function pareceSegredoPlaceholder(valor) {
  const v = String(valor || '').toLowerCase();
  return PLACEHOLDERS_SEGREDO.some((p) => v.includes(p));
}

/**
 * Falha o start se JWT_SECRET estiver ausente ou fraco.
 * Em NODE_ENV=test não exige, para os testes não dependerem de .env.
 * Em produção, recusa também valores de exemplo (ex.: "troque-esta-senha").
 */
function exigirJwtSecret(env = process.env) {
  const ambiente = normalizarAmbiente(env);
  if (ambiente === 'test') return;
  const segredo = env.JWT_SECRET || '';
  if (segredo.length < JWT_SECRET_MIN) {
    throw new Error(
      `JWT_SECRET ausente ou curto demais (mínimo ${JWT_SECRET_MIN} caracteres). ` +
      'Gere um com: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    );
  }
  if (ambiente === 'production' && pareceSegredoPlaceholder(segredo)) {
    throw new Error('JWT_SECRET parece um valor de exemplo/placeholder. Gere um segredo aleatório próprio.');
  }
}

/** Em produção, recusa senha do banco vazia, curta, de exemplo ou padrão. */
function exigirSenhaBanco(env = process.env) {
  if (normalizarAmbiente(env) !== 'production') return;
  const senha = String(env.DB_PASS || '');
  if (
    senha.length < DB_PASS_MIN ||
    pareceSegredoPlaceholder(senha) ||
    SENHAS_DB_FRACAS.includes(senha.toLowerCase())
  ) {
    throw new Error(
      `DB_PASS ausente, curta (mínimo ${DB_PASS_MIN}) ou de exemplo/padrão fraco. Defina uma senha forte para o banco em produção.`
    );
  }
}

/**
 * Validação única de startup: normaliza NODE_ENV (grava de volta em env, para os
 * demais módulos compararem com o valor canônico) e exige segredos fortes.
 */
function exigirConfiguracao(env = process.env) {
  env.NODE_ENV = normalizarAmbiente(env);
  exigirJwtSecret(env);
  exigirSenhaBanco(env);
  // Em produção FRONTEND_URL é obrigatória: falha aqui com mensagem limpa
  // em vez de estourar depois, na montagem do CORS do app.
  lerOrigensCors(env);
}

/** Assina o token de sessão. `tv` é a tokenVersion do usuário. */
function assinarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      role: usuario.role,
      empresaId: usuario.empresaId,
      funcionarioId: usuario.funcionarioId,
      tv: usuario.tokenVersion || 0,
    },
    process.env.JWT_SECRET,
    { algorithm: ALGORITMO_JWT, expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

/** Verifica o token aceitando somente HS256 (bloqueia alg=none/troca de algoritmo). */
function verificarToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITMO_JWT] });
}

/**
 * Converte TRUST_PROXY para o valor de `app.set('trust proxy')`.
 *   vazio/false/0 -> false (usa o IP do socket; padrão seguro sem proxy)
 *   número        -> quantidade de proxies confiáveis à frente da API
 *   true          -> 1 proxy (nunca `true` puro, que confia em qualquer X-Forwarded-For)
 *   outro texto   -> repassado ao Express (ex.: "loopback", "10.0.0.0/8")
 */
function lerTrustProxy(valor = process.env.TRUST_PROXY) {
  const v = String(valor ?? '').trim();
  if (v === '' || v.toLowerCase() === 'false' || v === '0') return false;
  if (v.toLowerCase() === 'true') return 1;
  if (/^\d+$/.test(v)) return Number(v);
  return v;
}

const ORIGENS_DEV_PADRAO = ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];

/**
 * Lista de origens permitidas no CORS, a partir de FRONTEND_URL (separada por vírgula).
 * Nunca devolve '*'. Em produção FRONTEND_URL é obrigatória (falha o start);
 * em dev/test cai nas origens locais padrão.
 */
function lerOrigensCors(env = process.env) {
  const origens = String(env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (origens.includes('*')) {
    throw new Error('FRONTEND_URL não pode ser "*". Informe a(s) origem(ns) do frontend, separadas por vírgula.');
  }
  if (origens.length > 0) return origens;
  if (String(env.NODE_ENV || '').trim().toLowerCase() === 'production') {
    throw new Error(
      'FRONTEND_URL é obrigatória em produção (origem do frontend para o CORS, ex.: https://app.exemplo.com.br). ' +
      'Aceita várias origens separadas por vírgula.'
    );
  }
  return ORIGENS_DEV_PADRAO;
}

/** Origem principal do frontend (a primeira de FRONTEND_URL), para montar links. */
function urlBaseFrontend(env = process.env) {
  const primeira = String(env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/+$/, '');
  return primeira || 'http://localhost:5173';
}

module.exports = {
  lerOrigensCors,
  urlBaseFrontend,
  exigirJwtSecret,
  exigirSenhaBanco,
  exigirConfiguracao,
  normalizarAmbiente,
  assinarToken,
  verificarToken,
  lerTrustProxy,
  revogarSessoes,
  ALGORITMO_JWT,
  LIMITES,
  VALIDADE,
  TERMOS_VERSAO,
  MSG_MUITAS_TENTATIVAS,
};
