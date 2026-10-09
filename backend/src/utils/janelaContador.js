// ============================================================
// Contador por chave em janela fixa (em memória)
// ============================================================
// Base única dos limites "no máximo N ações por janela": limite de
// requisições por IP e reenvio do código de primeiro acesso.
// Estado no processo: com várias instâncias da API cada uma conta
// separado; para multi-instância, trocar o Map por Redis.
// ============================================================

const MAX_CHAVES_PADRAO = 10000;

/**
 * @param {{ max: number, janelaMs: number, maxChaves?: number }} opcoes
 * @returns {{ registrar: (chave: string, agora?: number) => boolean }}
 */
function criarContadorJanela({ max, janelaMs, maxChaves = MAX_CHAVES_PADRAO }) {
  const contagens = new Map(); // chave -> { inicio, total }

  const podar = (agora) => {
    for (const [k, v] of contagens) {
      if (v.inicio + janelaMs <= agora) contagens.delete(k);
    }
    // Se ainda estourou, descarta as mais antigas (ordem de inserção).
    for (const k of contagens.keys()) {
      if (contagens.size <= maxChaves) break;
      contagens.delete(k);
    }
  };

  return {
    /** Conta uma ação para a chave. Devolve false quando passou do limite da janela. */
    registrar(chave, agora = Date.now()) {
      const registro = contagens.get(chave);
      if (!registro || registro.inicio + janelaMs <= agora) {
        contagens.set(chave, { inicio: agora, total: 1 });
        if (contagens.size > maxChaves) podar(agora);
        return max >= 1;
      }
      if (registro.total >= max) return false;
      registro.total += 1;
      return true;
    },
  };
}

module.exports = { criarContadorJanela };
