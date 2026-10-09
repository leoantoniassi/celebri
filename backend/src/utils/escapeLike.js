// Escapa os curingas do LIKE/ILIKE (% e _) e a própria barra, para que a
// busca do usuário seja sempre literal.
function escapeLike(valor) {
  return String(valor).replace(/[\\%_]/g, '\\$&');
}

/** Padrão "contém" pronto para [Op.iLike]. */
function contem(valor) {
  return `%${escapeLike(valor)}%`;
}

module.exports = { escapeLike, contem };
