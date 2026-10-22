// ============================================================
// Configuração de e-mail (SMTP) — fonte única de verdade
// ============================================================
// Tudo que decide "como o e-mail sai" mora aqui. O emailService e a
// validação de startup (config/seguranca.js) chamam as mesmas funções, para
// que "SMTP configurado" não possa significar uma coisa no envio e outra na
// validação de ambiente.
// ============================================================
const nodemailer = require('nodemailer');

// Remetente usado quando EMAIL_FROM não está definido: sem FROM o provedor
// rejeita a mensagem. Em produção a ausência de EMAIL_FROM derruba o start.
const REMETENTE_PADRAO = 'Celebri <nao-responda@celebri.local>';
const PORTA_PADRAO = 2525;

/** Texto sem espaços nas bordas; string vazia quando não há valor. */
const texto = (valor) => String(valor ?? '').trim();

/** Remetente configurado (EMAIL_FROM), com fallback seguro. */
function remetente(env = process.env) {
  return texto(env.EMAIL_FROM) || REMETENTE_PADRAO;
}

/** Porta SMTP configurada (padrão 2525). */
function porta(env = process.env) {
  const n = Number(texto(env.EMAIL_PORT));
  return Number.isInteger(n) && n > 0 ? n : PORTA_PADRAO;
}

/** Há um servidor SMTP configurado? Base de toda a decisão de envio. */
function smtpConfigurado(env = process.env) {
  return texto(env.EMAIL_HOST).length > 0;
}

/** TLS implícito (SMTPS) só na 465; nas demais o STARTTLS é negociado. */
function usarTlsImplicito(p) {
  return p === 465;
}

/**
 * Cria o transporter do Nodemailer a partir das variáveis de ambiente.
 * O bloco `auth` só é enviado quando há usuário ou senha: alguns relays
 * internos não usam autenticação, e mandar AUTH vazio faz o servidor recusar.
 * @param {object} [env]
 * @returns {import('nodemailer').Transporter}
 */
function criarTransporter(env = process.env) {
  const p = porta(env);
  const user = texto(env.EMAIL_USER);
  const pass = texto(env.EMAIL_PASS);

  return nodemailer.createTransport({
    host: texto(env.EMAIL_HOST),
    port: p,
    secure: usarTlsImplicito(p), // SSL apenas se for 465, senão TLS (2525/587)
    connectionTimeout: 10000,
    ...(user || pass ? { auth: { user, pass } } : {}),
  });
}

/**
 * Opt-in explícito de desenvolvimento; a flag é ignorada em produção.
 * @param {object} [env]
 */
function devLogCodigoAtivo(env = process.env) {
  return env.DEV_LOG_CODIGO_ACESSO === 'true' && env.NODE_ENV !== 'production';
}

module.exports = {
  criarTransporter,
  devLogCodigoAtivo,
  porta,
  remetente,
  smtpConfigurado,
  usarTlsImplicito,
  REMETENTE_PADRAO,
  PORTA_PADRAO,
};
