// ============================================================
// Controller: LGPD — exportação e anonimização de titulares (gerente)
// ============================================================
const lgpdService = require('../services/lgpdService');
const auditoria = require('../services/auditoriaService');
const { fail } = require('../utils/response');

const STATUS_POR_MOTIVO = {
  nao_encontrado: 404,
  ja_anonimizado: 409,
  evento_futuro: 409,
  conta_gestora: 409,
};

function tipoValido(req, res) {
  if (!lgpdService.TIPOS.includes(req.params.tipo)) {
    fail(res, `Tipo de titular inválido. Use: ${lgpdService.TIPOS.join(', ')}.`, 400);
    return false;
  }
  return true;
}

// GET /api/lgpd/titulares/:tipo/:id/exportar
async function exportar(req, res, next) {
  try {
    if (!tipoValido(req, res)) return undefined;
    const { tipo, id } = req.params;

    const dados = await lgpdService.exportarTitular(tipo, id);
    if (!dados) return fail(res, 'Titular não encontrado.', 404);

    // Falha fechada: exportação de dados pessoais sem trilha de auditoria não é entregue.
    const auditado = await auditoria.registrar({
      req, acao: 'lgpd.titular.exportado', entidade: tipo, entidadeId: id,
    });
    if (!auditado) return fail(res, 'Não foi possível registrar a auditoria da exportação. Tente novamente.', 503);

    res.set({
      'Content-Disposition': `attachment; filename="titular-${tipo}-${id}.json"`,
      'Cache-Control': 'private, no-store',
    });
    return res.json({ success: true, data: dados });
  } catch (error) {
    return next(error);
  }
}

// POST /api/lgpd/titulares/:tipo/:id/anonimizar   body: { confirmacao: true }
async function anonimizar(req, res, next) {
  try {
    if (!tipoValido(req, res)) return undefined;
    const { tipo, id } = req.params;

    if (!req.body || req.body.confirmacao !== true) {
      return fail(res, 'Confirmação obrigatória: envie { "confirmacao": true }. A anonimização é irreversível.', 400);
    }

    const resultado = await lgpdService.anonimizarTitular(tipo, id);
    if (!resultado.ok) {
      return fail(res, resultado.mensagem, STATUS_POR_MOTIVO[resultado.motivo] || 409);
    }

    await auditoria.registrar({
      req, acao: 'lgpd.titular.anonimizado', entidade: tipo, entidadeId: id,
      detalhes: { origem: 'gerente', contaAnonimizada: resultado.contaAnonimizada },
    });

    return res.json({
      success: true,
      message: 'Titular anonimizado. Dados financeiros e fiscais foram mantidos por obrigação legal.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { exportar, anonimizar };
