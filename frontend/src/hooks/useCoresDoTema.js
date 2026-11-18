import { useState, useEffect } from 'react';

// ============================================================
// Cores do tema para bibliotecas que não entendem CSS
// ============================================================
// Recharts (e SVG em geral) recebe cor como prop em JavaScript, então não
// enxerga `var(--color-primary)`. Este hook lê os valores computados do
// :root e os devolve como hex, reagindo à troca de paleta do tenant.
// ============================================================

const TOKENS = [
  'chart-1',
  'chart-2',
  'chart-3',
  'primary',
  'secondary',
  'tertiary',
  'surface',
  'on-surface',
  'on-surface-variant',
  'outline',
  'outline-variant',
  'error',
];

function lerTokens() {
  if (typeof window === 'undefined') return {};
  const estilo = getComputedStyle(document.documentElement);
  return TOKENS.reduce((acumulado, token) => {
    const valor = estilo.getPropertyValue(`--color-${token}`).trim();
    if (valor) acumulado[token] = valor;
    return acumulado;
  }, {});
}

function mesmasCores(a, b) {
  return TOKENS.every((token) => a[token] === b[token]);
}

export default function useCoresDoTema() {
  const [cores, setCores] = useState(lerTokens);

  // O ThemeProvider grava a paleta com style.setProperty no <html> e troca
  // a classe .dark no modo escuro. Observar essas mutações garante a
  // releitura DEPOIS da paleta aplicada — um efeito dependente do contexto
  // rodaria antes do efeito do provider (filho antes do pai) e leria a
  // paleta antiga; e a troca claro/escuro nem mudava a config.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return undefined;

    const atualizar = () => {
      const novas = lerTokens();
      setCores((atuais) => (mesmasCores(atuais, novas) ? atuais : novas));
    };

    atualizar();
    const observador = new MutationObserver(atualizar);
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
    return () => observador.disconnect();
  }, []);

  return cores;
}
