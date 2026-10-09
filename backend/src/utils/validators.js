const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function gerarWarningPessoas(qtdPessoas, qtdAdultos, qtdCriancas, qtdBebes, contexto = "no evento") {
  const totalPessoas = Number(qtdPessoas) || 0;
  const totalDetalhado = (Number(qtdAdultos) || 0) + (Number(qtdCriancas) || 0) + (Number(qtdBebes) || 0);
  
  if (totalPessoas !== totalDetalhado) {
    return `As informações de pessoas ${contexto} não coincidem: a soma de adultos, crianças e bebês (${totalDetalhado}) é diferente do total de pessoas (${totalPessoas}).`;
  }
  return null;
}

const SENHA_MIN = 10;
const SENHA_MAX_BYTES = 72; // bcrypt ignora o que passa de 72 bytes

/**
 * Política de senha única: usada ao CRIAR ou ALTERAR senha. Nunca no login,
 * para contas antigas (ex.: seed de testes) continuarem entrando.
 * @param {string} [email] e-mail da conta: a senha não pode ser igual a ele
 * @returns {string|null} mensagem de erro, ou null se a senha é aceita
 */
function validarSenha(senha, email) {
  const s = typeof senha === 'string' ? senha : '';
  if (s.length < SENHA_MIN) return `A senha deve ter no mínimo ${SENHA_MIN} caracteres.`;
  if (Buffer.byteLength(s, 'utf8') > SENHA_MAX_BYTES) {
    return `A senha deve ter no máximo ${SENHA_MAX_BYTES} bytes.`;
  }
  if (!/\p{L}/u.test(s) || !/\d/.test(s)) return 'A senha deve conter letras e números.';
  if (typeof email === 'string' && email.trim() && s.trim().toLowerCase() === email.trim().toLowerCase()) {
    return 'A senha não pode ser igual ao e-mail.';
  }
  return null;
}

const URL_HTTP_MAX = 2048;

/**
 * Aceita apenas URLs http(s) absolutas (bloqueia javascript:, data:, file:, etc.).
 * Devolve a URL normalizada (trim) ou null se inválida.
 */
function validarUrlHttp(valor) {
  const texto = String(valor ?? '').trim();
  if (!texto || texto.length > URL_HTTP_MAX) return null;
  // Espaços/controles internos: o parser WHATWG os descarta em silêncio ("ht\ntp://x"), mas o valor gravado seguiria sujo.
  if (/[\s\u0000-\u001f\u007f]/.test(texto)) return null;
  // Forma canônica exigida: esquema + "//" + host (rejeita "https:///x", "http:/x", "http:\\x").
  if (!/^https?:\/\/[^/\\]/i.test(texto)) return null;
  try {
    const url = new URL(texto);
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname) return null;
    return texto;
  } catch {
    return null;
  }
}

module.exports = { validarUrlHttp, isValidUUID, gerarWarningPessoas, validarSenha, SENHA_MIN };