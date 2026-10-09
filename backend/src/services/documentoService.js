const { Documento, Cliente, Evento } = require('../models');
const { detectarTipo, isUrlExterna, normalizarCaminhoRelativo } = require('../utils/fileUtils');
const { garantirExistenciaNoTenant, erroReferencia } = require('../utils/tenantFk');

const MSG_CAMINHO_INVALIDO =
  'Caminho de arquivo inválido. Informe uma URL http(s) ou um caminho relativo com extensão .pdf, .jpg, .jpeg ou .png.';

// Valida o campo caminhoUrl (criação e atualização). URLs http(s) passam; o
// restante deve ser um caminho relativo seguro.
function validarCaminho(caminhoUrl) {
  if (typeof caminhoUrl !== 'string') return MSG_CAMINHO_INVALIDO;
  if (isUrlExterna(caminhoUrl)) return null;
  return normalizarCaminhoRelativo(caminhoUrl) ? null : MSG_CAMINHO_INVALIDO;
}

// Confere que cliente/evento existem no tenant (helper único de FK).
async function validarReferencias({ clienteId, eventoId }) {
  await garantirExistenciaNoTenant(Cliente, clienteId, 'Cliente');
  await garantirExistenciaNoTenant(Evento, eventoId, 'Evento');
}

async function findDocumentoOrFail(id) {
  const documento = await Documento.findOne({ where: { id: id } });
  if (!documento) {
    throw erroReferencia('Documento não encontrado.', 404);
  }
  return documento;
}

function validarCriacao(body) {
  if (!body.nomeArquivo) return 'O nome do documento é obrigatório.';
  if (!body.caminhoUrl) return 'A localização do arquivo é obrigatória.';

  return validarCaminho(body.caminhoUrl);
}

function montarPayloadCriacao(body) {
  return {
    nomeArquivo: body.nomeArquivo,
    caminhoUrl: body.caminhoUrl,
    tipoArquivo: detectarTipo(body.caminhoUrl),
    clienteId: body.clienteId || null,
    eventoId: body.eventoId || null,
  };
}

function validarAtualizacao(body) {
  if (body.nomeArquivo !== undefined && !body.nomeArquivo) return 'O nome do documento é obrigatório.';
  if (body.caminhoUrl !== undefined) return validarCaminho(body.caminhoUrl);
  return null;
}

function montarPayloadAtualizacao(body) {
  const payload = { atualizadoEm: new Date() };

  if (body.nomeArquivo !== undefined) payload.nomeArquivo = body.nomeArquivo;
  if (body.caminhoUrl !== undefined) {
    payload.caminhoUrl = body.caminhoUrl;
    payload.tipoArquivo = detectarTipo(body.caminhoUrl);
  }
  if (body.clienteId !== undefined) payload.clienteId = body.clienteId || null;
  if (body.eventoId !== undefined) payload.eventoId = body.eventoId || null;

  return payload;
}

function infoArquivo(documento) {
  return {
    caminho: documento.caminhoUrl,
    isExterno: isUrlExterna(documento.caminhoUrl),
  };
}

module.exports = {
  findDocumentoOrFail,
  validarCriacao,
  validarAtualizacao,
  validarReferencias,
  montarPayloadCriacao,
  montarPayloadAtualizacao,
  infoArquivo,
};
