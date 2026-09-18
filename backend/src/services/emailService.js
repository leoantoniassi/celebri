// ============================================================
// Service: Email — Envio de e-mails via Nodemailer
// Responsabilidade única: criação de transporter e envio de mensagens
// ============================================================
// Os e-mails saem em nome do buffet contratante, não do Celebri: nome,
// logo e cor do botão vêm da identidade visual do tenant. Antes o nome
// "Mais Alegria" e as cores estavam fixos nos dois templates.
// ============================================================
const nodemailer = require('nodemailer');
const { obterMarca } = require('../utils/brand');

/**
 * Cria um transporter Nodemailer a partir das variáveis de ambiente.
 * @returns {nodemailer.Transporter}
 */
function criarTransporter() {
  const port = Number(process.env.EMAIL_PORT) || 2525;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: port,
    secure: port === 465, // SSL apenas se for porta 465, senão TLS (2525/587)
    connectionTimeout: 10000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/** Escapa texto vindo do banco antes de interpolar no HTML do e-mail. */
function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/**
 * Layout compartilhado pelos e-mails transacionais.
 * As cores neutras são fixas de propósito: clientes de e-mail não
 * suportam custom properties, e só o que é marca precisa variar.
 */
function montarHtml({ marca, emoji, titulo, saudacao, corpo, textoBotao, link, rodape }) {
  return `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; background: #f7f7f5; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 32px;">
        ${marca.logoUrl
          ? `<img src="${escapar(marca.logoUrl)}" alt="${escapar(marca.nomeFantasia)}" style="max-height: 56px; max-width: 200px;" />`
          : `<span style="font-size: 48px;">${emoji}</span>`}
        <h1 style="color: #1a1a1a; font-size: 28px; margin: 16px 0 8px;">${escapar(titulo)}</h1>
        <p style="color: #5c5c57; font-size: 16px;">${saudacao}</p>
      </div>

      <div style="background: #ffffff; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #e5e3dd;">
        <p style="color: #44443f; margin: 0 0 16px;">${corpo}</p>
        <div style="text-align: center;">
          <a href="${link}"
             style="display: inline-block; background: ${marca.corPrimaria}; color: ${marca.corTexto};
                    font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 999px;
                    text-decoration: none;">
            ${escapar(textoBotao)}
          </a>
        </div>
      </div>

      <p style="color: #8a8a82; font-size: 13px; text-align: center; margin-top: 24px;">${rodape}</p>
    </div>
  `;
}

/**
 * Envia e-mail de convite para o novo usuário.
 * @param {Object} params
 * @param {string} params.nome - Nome do destinatário
 * @param {string} params.email - E-mail do destinatário
 * @param {string} params.token - Token de convite
 * @param {string} [params.empresaId] - Tenant; omitido, usa o contexto da requisição
 */
async function enviarConvite({ nome, email, token, empresaId }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const linkConvite = `${frontendUrl}/definir-senha?token=${token}`;
  const marca = await obterMarca(empresaId);
  const transporter = criarTransporter();

  try {
    console.log(`[Email] Iniciando envio de convite para ${email}...`);
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `🎉 Você foi convidado para o sistema ${marca.nomeFantasia}!`,
      html: montarHtml({
        marca,
        emoji: '🎉',
        titulo: `Bem-vindo ao ${marca.nomeFantasia}!`,
        saudacao: `Olá, <strong>${escapar(nome)}</strong>! Você foi convidado para acessar o sistema.`,
        corpo: 'Clique no botão abaixo para definir sua senha e ativar sua conta. Este link expira em <strong>24 horas</strong>.',
        textoBotao: 'Definir Minha Senha',
        link: linkConvite,
        rodape: 'Se você não esperava este convite, pode ignorar este e-mail com segurança.',
      }),
    });
    console.log(`[Email] Convite enviado com sucesso! Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Email] Erro ao enviar convite para ${email}:`, error);
    throw error;
  }
}

/**
 * Envia e-mail de recuperação de senha.
 * @param {Object} params
 * @param {string} params.nome - Nome do destinatário
 * @param {string} params.email - E-mail do destinatário
 * @param {string} params.token - Token de reset
 * @param {string} [params.empresaId] - Tenant; omitido, usa o contexto da requisição
 */
async function enviarEmailRecuperacaoSenha({ nome, email, token, empresaId }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const linkReset = `${frontendUrl}/redefinir-senha?token=${token}`;
  const marca = await obterMarca(empresaId);
  const transporter = criarTransporter();

  try {
    console.log(`[Email] Iniciando envio de recuperação para ${email}...`);
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `🔒 Redefinição de senha - ${marca.nomeFantasia}`,
      html: montarHtml({
        marca,
        emoji: '🔒',
        titulo: 'Recuperação de Senha',
        saudacao: `Olá, <strong>${escapar(nome)}</strong>! Recebemos uma solicitação para redefinir sua senha.`,
        corpo: 'Clique no botão abaixo para escolher uma nova senha de acesso. Por motivos de segurança, este link é válido por apenas <strong>1 hora</strong>.',
        textoBotao: 'Redefinir Minha Senha',
        link: linkReset,
        rodape: 'Se você não solicitou a redefinição de senha, pode ignorar este e-mail com segurança. Sua senha atual permanecerá inalterada.',
      }),
    });
    console.log(`[Email] Recuperação enviada com sucesso! Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`[Email] Erro ao enviar recuperação para ${email}:`, error);
    throw error;
  }
}

module.exports = { enviarConvite, enviarEmailRecuperacaoSenha };
