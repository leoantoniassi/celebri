// ============================================================
// Bloqueio temporário por conta (em memória)
// ============================================================
// Complementa o limite por IP: conta N falhas por chave (e-mail + tenant) e
// bloqueia por um período. A chave é montada mesmo quando o e-mail não existe,
// então o bloqueio não revela quais contas são reais.
//
// Limitações: o estado vive no processo. Com várias instâncias da API cada
// uma conta separado (o limite efetivo vira N x instâncias), e um restart
// zera tudo. Para multi-instância, trocar o Map por Redis. Também permite que
// alguém bloqueie a conta alheia pelo período de bloqueio (DoS leve); é o custo desse modelo.
// ============================================================

function criarBloqueio({ maxFalhas, bloqueioMs, maxChaves = 10000 }) {
  const registros = new Map(); // chave -> { falhas, bloqueadoAte, inicio }

  const podar = (agora) => {
    if (registros.size <= maxChaves) return;
    for (const [k, v] of registros) {
      if (v.bloqueadoAte <= agora && v.inicio + bloqueioMs <= agora) registros.delete(k);
    }
    // Se ainda estourou, descarta as mais antigas (ordem de inserção), mas
    // poupa as contas bloqueadas: inundar com e-mails inventados não pode
    // servir para "limpar" um bloqueio ativo.
    for (const [k, v] of registros) {
      if (registros.size <= maxChaves) break;
      if (v.bloqueadoAte <= agora) registros.delete(k);
    }
    for (const k of registros.keys()) {
      if (registros.size <= maxChaves) break;
      registros.delete(k);
    }
  };

  return {
    /** Milissegundos restantes de bloqueio (0 se livre). */
    restante(chave, agora = Date.now()) {
      const r = registros.get(chave);
      if (!r) return 0;
      if (r.bloqueadoAte > agora) return r.bloqueadoAte - agora;
      if (r.bloqueadoAte) registros.delete(chave); // bloqueio expirou: recomeça
      return 0;
    },
    falhou(chave, agora = Date.now()) {
      podar(agora);
      let r = registros.get(chave);
      // As falhas contam dentro de uma janela (mesma duração do bloqueio).
      if (!r || (r.bloqueadoAte <= agora && r.inicio + bloqueioMs <= agora)) {
        r = { falhas: 0, bloqueadoAte: 0, inicio: agora };
      }
      r.falhas += 1;
      if (r.falhas >= maxFalhas) r.bloqueadoAte = agora + bloqueioMs;
      registros.set(chave, r);
    },
    limpar(chave) {
      registros.delete(chave);
    },
  };
}

module.exports = { criarBloqueio };
