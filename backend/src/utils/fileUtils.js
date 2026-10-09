const path = require('path');
const fs = require('fs').promises;
const { isValidUUID } = require('./validators');

const EXT_PARA_TIPO = {
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
};

const EXTENSOES_PERMITIDAS = new Set(['.jpg', '.jpeg', '.png', '.pdf']);

// Pasta base única dos documentos locais. Configurável por DOCUMENTOS_DIR;
// o padrão fica em backend/uploads/documentos (uploads/ é o volume persistido
// do container). Cada tenant usa a subpasta <base>/<empresaId>/.
function obterDiretorioBase() {
  const configurado = process.env.DOCUMENTOS_DIR;
  if (configurado && configurado.trim()) return path.resolve(configurado.trim());
  return path.resolve(__dirname, '..', '..', 'uploads', 'documentos');
}

function detectarTipo(caminho) {
  if (!caminho) return 'pdf';
  const ext = path.extname(caminho).replace('.', '').toLowerCase();
  return EXT_PARA_TIPO[ext] || 'pdf';
}

function isUrlExterna(caminho) {
  return !!caminho && /^https?:\/\//i.test(caminho);
}

async function arquivoExiste(caminho) {
  try {
    await fs.access(caminho);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida um caminho local informado pelo usuário. Deve ser RELATIVO à pasta do
 * tenant. Retorna o caminho relativo normalizado (separador "/") ou null.
 */
function normalizarCaminhoRelativo(caminho) {
  if (!caminho || typeof caminho !== 'string') return null;
  if (caminho.includes('\0')) return null;

  const normalizado = caminho.trim().replace(/\\/g, '/');
  if (!normalizado) return null;

  // Absoluto (posix, UNC "//host", unidade "C:") não é aceito.
  if (normalizado.startsWith('/') || /^[a-zA-Z]:/.test(normalizado)) return null;
  if (path.isAbsolute(normalizado) || path.win32.isAbsolute(normalizado)) return null;

  // Caracteres inválidos/perigosos em nomes (ADS "a.pdf:x", "file://", "<>|*?",
  // controle, "%" para evitar dupla decodificação por proxies) são recusados.
  // eslint-disable-next-line no-control-regex
  if (/[:<>"|?*%\u0000-\u001f\u007f]/.test(normalizado)) return null;

  const segmentos = normalizado.split('/');
  // ".." (e variantes com ponto/espaço final, que o Windows normaliza para "..")
  // e segmentos terminados em ponto/espaço são recusados.
  if (segmentos.some((seg) => seg.trim() === '..' || /[. ]$/.test(seg))) return null;
  // Dotfiles (".env.pdf", ".git/x.png") nunca são servidos.
  if (segmentos.some((seg) => seg.startsWith('.') && seg !== '.')) return null;

  const ext = path.extname(normalizado).toLowerCase();
  if (!EXTENSOES_PERMITIDAS.has(ext)) return null;

  return path.posix.normalize(normalizado);
}

function estaDentro(base, alvo) {
  return alvo.startsWith(base + path.sep);
}

/**
 * Resolve o caminho de um documento dentro de <DOCUMENTOS_DIR>/<empresaId>/.
 * Retorna o caminho absoluto seguro ou null se for inválido/escapar da pasta
 * (inclui escape via symlink). Arquivo inexistente devolve o caminho léxico
 * (o chamador decide o 404).
 */
async function sanitizarCaminhoLocal(caminho, empresaId) {
  const relativo = normalizarCaminhoRelativo(caminho);
  if (!relativo) return null;
  if (typeof empresaId !== 'string' || !isValidUUID(empresaId)) return null;

  const base = obterDiretorioBase();
  const baseTenant = path.resolve(base, empresaId);
  const alvo = path.resolve(baseTenant, relativo);
  if (!estaDentro(baseTenant, alvo)) return null;

  try {
    const baseReal = await fs.realpath(baseTenant);
    const alvoReal = await fs.realpath(alvo);
    return estaDentro(baseReal, alvoReal) ? alvoReal : null;
  } catch (err) {
    if (err && err.code === 'ENOENT') return alvo;
    return null;
  }
}

module.exports = {
  detectarTipo,
  isUrlExterna,
  arquivoExiste,
  sanitizarCaminhoLocal,
  normalizarCaminhoRelativo,
  obterDiretorioBase,
};
