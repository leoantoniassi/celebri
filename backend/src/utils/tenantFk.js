// ============================================================
// Validação de chaves estrangeiras vindas do body/query
// ============================================================
// O hook global de tenant escopa o findOne; sem esta checagem um id de outro
// buffet (ou malformado) seria gravado/derrubaria a query com 500.
// ============================================================
const { isValidUUID } = require('./validators');

function erroReferencia(mensagem, statusCode) {
  const err = new Error(mensagem);
  err.statusCode = statusCode;
  err.expose = true; // errorHandler devolve a mensagem em vez de "erro interno"
  return err;
}

/**
 * Garante que `id` é um UUID e existe no tenant atual.
 * Ausente (undefined/null/'') devolve null: obrigatoriedade é do chamador.
 * @throws erro 400 (malformado) ou 404 (inexistente neste tenant)
 */
async function garantirExistenciaNoTenant(Model, id, nomeCampo) {
  if (id === undefined || id === null || id === '') return null;
  if (!isValidUUID(id)) throw erroReferencia(`Identificador de ${nomeCampo} inválido.`, 400);
  const registro = await Model.findOne({ where: { id } });
  if (!registro) throw erroReferencia(`Registro de ${nomeCampo} não encontrado.`, 404);
  return registro;
}

/**
 * Valida um filtro de query que deve ser UUID; devolve mensagem de erro ou null.
 * Objetos/arrays (`?x[ne]=1`) não são UUID e caem como inválidos.
 */
function erroFiltroUuid(valor, nomeCampo) {
  if (valor === undefined || valor === '') return null;
  return isValidUUID(valor) ? null : `Identificador de ${nomeCampo} inválido.`;
}

module.exports = { garantirExistenciaNoTenant, erroFiltroUuid, erroReferencia };
