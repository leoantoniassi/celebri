// ============================================================
// Controller: Convites (lista de convidados com QR) — painel web
// ============================================================
const crypto = require('crypto');
const QRCode = require('qrcode');
const { Convite, Evento } = require('../models');
const { isValidUUID } = require('../utils/validators');
const { gerarLinkWhatsApp } = require('../utils/whatsapp');
const { obterMarca } = require('../utils/brand');

const MAX_PESSOAS_POR_CONVITE = 50;

const novoToken = () => crypto.randomBytes(16).toString('hex');

function linkPublico(token) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');
  return `${base}/api/convites/publico/${token}`;
}

/** Valida nome/telefone/qtdPessoas; devolve { dados } ou { erro }. */
function lerDadosConvite(body, { parcial = false } = {}) {
  const dados = {};

  if (body.nome !== undefined || !parcial) {
    const nome = String(body.nome || '').trim();
    if (!nome) return { erro: 'Informe o nome do convidado ou da família.' };
    if (nome.length > 150) return { erro: 'O nome deve ter no máximo 150 caracteres.' };
    dados.nome = nome;
  }

  if (body.telefone !== undefined) {
    const telefone = String(body.telefone || '').trim();
    if (telefone.length > 20) return { erro: 'Telefone inválido.' };
    dados.telefone = telefone || null;
  }

  if (body.qtdPessoas !== undefined || !parcial) {
    const qtd = body.qtdPessoas === undefined ? 1 : Number(body.qtdPessoas);
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > MAX_PESSOAS_POR_CONVITE) {
      return { erro: `A quantidade de pessoas deve ser de 1 a ${MAX_PESSOAS_POR_CONVITE}.` };
    }
    dados.qtdPessoas = qtd;
  }

  return { dados };
}

async function buscarEvento(req, res) {
  if (!isValidUUID(req.params.eventoId)) {
    res.status(404).json({ success: false, message: 'Evento não encontrado.' });
    return null;
  }
  const evento = await Evento.findOne({ where: { id: req.params.eventoId } });
  if (!evento) res.status(404).json({ success: false, message: 'Evento não encontrado.' });
  return evento;
}

async function buscarConvite(req, res) {
  if (!isValidUUID(req.params.id)) {
    res.status(404).json({ success: false, message: 'Convite não encontrado.' });
    return null;
  }
  const convite = await Convite.findOne({ where: { id: req.params.id } });
  if (!convite) res.status(404).json({ success: false, message: 'Convite não encontrado.' });
  return convite;
}

/** Números da portaria de um evento. */
async function montarResumo(evento) {
  const convites = await Convite.findAll({
    where: { eventoId: evento.id },
    attributes: ['qtdPessoas', 'qtdEntrou'],
  });
  const pessoasConvidadas = convites.reduce((s, c) => s + c.qtdPessoas, 0);
  const entraramComConvite = convites.reduce((s, c) => s + c.qtdEntrou, 0);
  return {
    usaConvites: evento.usaConvites,
    qtdPessoasEvento: evento.qtdPessoas || 0,
    convites: convites.length,
    pessoasConvidadas,
    entraramComConvite,
    avulsos: evento.qtdAvulsos,
    totalPresentes: entraramComConvite + evento.qtdAvulsos,
  };
}

// GET /api/eventos/:eventoId/convites
async function listar(req, res, next) {
  try {
    const evento = await buscarEvento(req, res);
    if (!evento) return undefined;

    const convites = await Convite.findAll({
      where: { eventoId: evento.id },
      order: [['nome', 'ASC']],
    });
    const data = convites.map((c) => ({ ...c.toJSON(), link: linkPublico(c.token) }));

    return res.json({ success: true, data, resumo: await montarResumo(evento) });
  } catch (error) {
    return next(error);
  }
}

// POST /api/eventos/:eventoId/convites
async function criar(req, res, next) {
  try {
    const evento = await buscarEvento(req, res);
    if (!evento) return undefined;

    const { dados, erro } = lerDadosConvite(req.body);
    if (erro) return res.status(400).json({ success: false, message: erro });

    const convite = await Convite.create({ ...dados, eventoId: evento.id, token: novoToken() });
    return res.status(201).json({
      success: true,
      message: 'Convite criado!',
      data: { ...convite.toJSON(), link: linkPublico(convite.token) },
    });
  } catch (error) {
    return next(error);
  }
}

// PATCH /api/eventos/:eventoId/portaria — liga/desliga a lista com QR
async function configurarPortaria(req, res, next) {
  try {
    const evento = await buscarEvento(req, res);
    if (!evento) return undefined;

    if (typeof req.body.usaConvites !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Informe usaConvites (true ou false).' });
    }
    await evento.update({ usaConvites: req.body.usaConvites, atualizadoEm: new Date() });
    return res.json({ success: true, message: 'Portaria atualizada!', resumo: await montarResumo(evento) });
  } catch (error) {
    return next(error);
  }
}

// PUT /api/convites/:id
async function atualizar(req, res, next) {
  try {
    const convite = await buscarConvite(req, res);
    if (!convite) return undefined;

    const { dados, erro } = lerDadosConvite(req.body, { parcial: true });
    if (erro) return res.status(400).json({ success: false, message: erro });

    await convite.update({ ...dados, atualizadoEm: new Date() });
    return res.json({ success: true, message: 'Convite atualizado!', data: convite });
  } catch (error) {
    return next(error);
  }
}

// DELETE /api/convites/:id
async function remover(req, res, next) {
  try {
    const convite = await buscarConvite(req, res);
    if (!convite) return undefined;

    await convite.update({ deletadoEm: new Date() });
    return res.json({ success: true, message: 'Convite removido.' });
  } catch (error) {
    return next(error);
  }
}

// GET /api/convites/:id/whatsapp — mensagem com o link do QR
async function whatsapp(req, res, next) {
  try {
    const convite = await buscarConvite(req, res);
    if (!convite) return undefined;
    if (!convite.telefone) {
      return res.status(400).json({ success: false, message: 'Este convite não tem telefone.' });
    }

    const evento = await Evento.findOne({ where: { id: convite.eventoId } });
    const marca = await obterMarca(convite.empresaId);
    const data = new Date(evento.dataEvento).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    const pessoas = convite.qtdPessoas > 1 ? ` (${convite.qtdPessoas} pessoas)` : '';
    const mensagem =
      `Olá, ${convite.nome}! Seu convite para "${evento.nome}" em ${data}${pessoas}. ` +
      `Apresente este QR code na entrada: ${linkPublico(convite.token)}\n\n${marca.nomeFantasia}`;

    return res.json({ success: true, data: { link: gerarLinkWhatsApp(convite.telefone, mensagem) } });
  } catch (error) {
    return next(error);
  }
}

const escapar = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

async function conviteDoToken(token) {
  if (!/^[a-f0-9]{32}$/.test(String(token))) return null;
  return Convite.findOne({
    where: { token },
    include: [{ model: Evento, as: 'evento', attributes: ['nome', 'dataEvento'] }],
    ignoraTenant: true,
  });
}

// GET /api/convites/publico/:token/qrcode.png (público)
async function qrcodePng(req, res, next) {
  try {
    const convite = await conviteDoToken(req.params.token);
    if (!convite) return res.status(404).send('Convite não encontrado.');

    const png = await QRCode.toBuffer(convite.token, { width: 480, margin: 2 });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'private, max-age=3600');
    return res.send(png);
  } catch (error) {
    return next(error);
  }
}

// GET /api/convites/publico/:token (público) — página que o convidado abre
async function paginaPublica(req, res, next) {
  try {
    const convite = await conviteDoToken(req.params.token);
    if (!convite) return res.status(404).send('Convite não encontrado.');

    const marca = await obterMarca(convite.empresaId);
    const quando = new Date(convite.evento.dataEvento).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
    });
    const qr = await QRCode.toDataURL(convite.token, { width: 480, margin: 2 });
    const pessoas = convite.qtdPessoas > 1 ? `Válido para ${convite.qtdPessoas} pessoas` : 'Válido para 1 pessoa';

    res.set('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Convite — ${escapar(convite.evento.nome)}</title></head>
<body style="margin:0;font-family:Arial,sans-serif;background:#f7f7f5;color:#1a1a1a">
<div style="max-width:420px;margin:0 auto;padding:32px 20px;text-align:center">
  <p style="font-weight:700;color:${escapar(marca.corPrimaria)};font-size:20px;margin:0 0 24px">${escapar(marca.nomeFantasia)}</p>
  <h1 style="font-size:24px;margin:0 0 8px">${escapar(convite.evento.nome)}</h1>
  <p style="margin:0 0 24px;color:#5c5c57">${escapar(quando)}</p>
  <div style="background:#fff;border-radius:16px;padding:16px;border:1px solid #e5e3dd">
    <img src="${qr}" alt="QR code do convite" style="width:100%;max-width:320px">
    <p style="font-size:18px;font-weight:700;margin:12px 0 4px">${escapar(convite.nome)}</p>
    <p style="margin:0;color:#5c5c57">${pessoas}</p>
  </div>
  <p style="font-size:13px;color:#8a8a82;margin-top:20px">Mostre este QR code na portaria.</p>
</div></body></html>`);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listar,
  criar,
  configurarPortaria,
  atualizar,
  remover,
  whatsapp,
  qrcodePng,
  paginaPublica,
  montarResumo,
};
