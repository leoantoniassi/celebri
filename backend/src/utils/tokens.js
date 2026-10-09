// ============================================================
// Tokens de uso único (convite, redefinição de senha)
// ============================================================
// O e-mail leva o token cru; o banco guarda só o SHA-256. Quem ler o banco
// (backup, SQL injection, dump) não consegue usar os links pendentes.
// Como o token tem 256 bits de entropia, SHA-256 sem sal é suficiente.
// ============================================================
const crypto = require('crypto');

/** Token aleatório de 32 bytes (hex de 64 caracteres) — vai no e-mail. */
const gerarToken = () => crypto.randomBytes(32).toString('hex');

/** Hash (hex de 64 caracteres) que é gravado no banco. */
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

module.exports = { gerarToken, hashToken };
