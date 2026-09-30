// ============================================================
// Middleware: limite de requisições por IP (em memória)
// ============================================================
// Suficiente para uma instância só. Com mais de uma instância da API,
// cada uma contaria separado — aí vale trocar por Redis.
// ============================================================

/**
 * @param {{ janelaMs: number, max: number }} opcoes
 */
function limitarRequisicoes({ janelaMs, max }) {
  const contagens = new Map();

  return (req, res, next) => {
    const agora = Date.now();
    const chave = req.ip;
    const registro = contagens.get(chave);

    if (!registro || registro.inicio + janelaMs <= agora) {
      contagens.set(chave, { inicio: agora, total: 1 });
      if (contagens.size > 10000) {
        for (const [k, v] of contagens) {
          if (v.inicio + janelaMs <= agora) contagens.delete(k);
        }
      }
      return next();
    }

    registro.total += 1;
    if (registro.total > max) {
      return res.status(429).json({
        success: false,
        message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
      });
    }
    return next();
  };
}

module.exports = { limitarRequisicoes };
