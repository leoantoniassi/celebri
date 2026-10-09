// ============================================================
// Middleware: limite de requisições por IP (em memória)
// ============================================================
// Suficiente para uma instância só. Com mais de uma instância da API,
// cada uma contaria separado — aí vale trocar por Redis.
// ============================================================
const { criarContadorJanela } = require('../utils/janelaContador');
const { MSG_MUITAS_TENTATIVAS } = require('../config/seguranca');

/**
 * Chave de limite para um IP. IPv4-mapeado vira IPv4 puro e IPv6 conta pelo
 * prefixo /64: quem recebe um bloco /64 (padrão de provedores) tem bilhões de
 * endereços e giraria o IP a cada requisição para escapar do limite.
 */
function chaveDoIp(ip) {
  const v = String(ip || '');
  const mapeado = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapeado) return mapeado[1];
  if (!v.includes(':')) return v;
  const [antes, depois = ''] = v.toLowerCase().split('::');
  const grupos = antes ? antes.split(':') : [];
  if (v.includes('::')) {
    const fim = depois ? depois.split(':') : [];
    while (grupos.length + fim.length < 8) grupos.push('0');
    grupos.push(...fim);
  }
  return grupos.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

/**
 * @param {{ janelaMs: number, max: number }} opcoes
 */
function limitarRequisicoes({ janelaMs, max }) {
  const contador = criarContadorJanela({ max, janelaMs });

  return (req, res, next) => {
    if (contador.registrar(chaveDoIp(req.ip))) return next();
    return res.status(429).json({ success: false, message: MSG_MUITAS_TENTATIVAS });
  };
}

module.exports = { limitarRequisicoes, chaveDoIp };
