// ============================================================
// Motor de tema white label — derivação da paleta Material 3
// ============================================================
// O cliente escolhe 3 cores (primária, secundária e terciária) e este
// módulo deriva os ~28 tokens que o index.css declara, garantindo
// contraste WCAG AA em todos os pares texto/fundo. Assim é impossível
// um buffet configurar uma interface ilegível.
//
// O trabalho é feito em OKLCH: diferente de HSL, sua luminosidade é
// perceptualmente uniforme, então "tom 90" tem o mesmo peso visual em
// amarelo e em azul — o que HSL não garante.
// ============================================================

// ── Conversões de cor ────────────────────────────────────────

function hexParaRgb(hex) {
  const limpo = String(hex).trim().replace('#', '');
  const completo = limpo.length === 3
    ? limpo.split('').map((c) => c + c).join('')
    : limpo;
  return {
    r: parseInt(completo.slice(0, 2), 16) / 255,
    g: parseInt(completo.slice(2, 4), 16) / 255,
    b: parseInt(completo.slice(4, 6), 16) / 255,
  };
}

function rgbParaHex({ r, g, b }) {
  const canal = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${canal(r)}${canal(g)}${canal(b)}`;
}

// sRGB ↔ RGB linear
const paraLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const paraSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbParaOklab({ r, g, b }) {
  const lr = paraLinear(r);
  const lg = paraLinear(g);
  const lb = paraLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  };
}

function oklabParaRgb({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;

  return {
    r: paraSrgb(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    g: paraSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    b: paraSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  };
}

function hexParaOklch(hex) {
  const { L, a, b } = rgbParaOklab(hexParaRgb(hex));
  return {
    L,
    C: Math.sqrt(a * a + b * b),
    h: (Math.atan2(b, a) * 180) / Math.PI,
  };
}

/**
 * OKLCH → hex, reduzindo o croma até a cor caber no gamut sRGB.
 * Sem isso, tons muito saturados "estouram" e voltam clipados,
 * mudando de matiz.
 */
function oklchParaHex({ L, C, h }) {
  const rad = (h * Math.PI) / 180;
  let croma = C;

  for (let i = 0; i < 24; i += 1) {
    const rgb = oklabParaRgb({
      L,
      a: croma * Math.cos(rad),
      b: croma * Math.sin(rad),
    });
    const dentroDoGamut = [rgb.r, rgb.g, rgb.b]
      .every((canal) => canal >= -0.001 && canal <= 1.001);

    if (dentroDoGamut || croma < 0.001) return rgbParaHex(rgb);
    croma *= 0.92;
  }

  return rgbParaHex(oklabParaRgb({ L, a: 0, b: 0 }));
}

// ── Contraste (WCAG 2.1) ─────────────────────────────────────

function luminancia(hex) {
  const { r, g, b } = hexParaRgb(hex);
  return 0.2126 * paraLinear(r) + 0.7152 * paraLinear(g) + 0.0722 * paraLinear(b);
}

/** Razão de contraste entre duas cores: 1 (nenhum) a 21 (preto sobre branco). */
export function contraste(hexA, hexB) {
  const a = luminancia(hexA);
  const b = luminancia(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// ── Paleta tonal ─────────────────────────────────────────────

/**
 * Gera o tom `t` (0 = preto, 100 = branco) preservando matiz e croma.
 * Nos extremos o croma é reduzido, senão tons muito claros ou muito
 * escuros ficam sujos.
 */
function tom(base, t) {
  const L = t / 100;
  const atenuacao = t >= 95 || t <= 5 ? 0.25 : 1;
  return oklchParaHex({ L, C: base.C * atenuacao, h: base.h });
}

const ALVO_AA = 4.5;

/**
 * Escolhe a cor de texto sobre `fundo`: branco ou um tom escuro do
 * mesmo matiz — o que atingir contraste AA. Se nenhum atingir, cai no
 * de maior contraste, escurecendo ao máximo.
 */
function corDeTextoSobre(fundoHex, base) {
  const candidatos = ['#ffffff', tom(base, 20), tom(base, 10), '#000000'];
  const aprovado = candidatos.find((cor) => contraste(cor, fundoHex) >= ALVO_AA);
  if (aprovado) return aprovado;

  return candidatos.reduce((melhor, cor) =>
    (contraste(cor, fundoHex) > contraste(melhor, fundoHex) ? cor : melhor));
}

const ALVO_MARCA_GRAFICO = 3;

/**
 * Ajusta uma cor de marca para uso como marca de dado em gráfico.
 *
 * A cor da marca é escolhida para caber num botão, não para ser lida como
 * um ponto num fundo branco: o amarelo padrão (#FEDC57) dá ~1.4:1 contra
 * branco, e uma linha nessa cor some. Aqui a luminosidade é reduzida,
 * mantendo matiz e croma, até alcançar 3:1 — o piso de contraste para
 * elementos gráficos não textuais (WCAG 1.4.11).
 */
function corParaGrafico(hex, fundo = '#ffffff') {
  if (contraste(hex, fundo) >= ALVO_MARCA_GRAFICO) return hex;

  const base = hexParaOklch(hex);
  for (let t = Math.round(base.L * 100); t >= 15; t -= 2) {
    const candidato = oklchParaHex({ L: t / 100, C: base.C, h: base.h });
    if (contraste(candidato, fundo) >= ALVO_MARCA_GRAFICO) return candidato;
  }
  return oklchParaHex({ L: 0.15, C: base.C, h: base.h });
}

/** Os 4 tokens de um papel de cor: base, texto sobre ela, container e texto do container. */
function papel(hex) {
  const base = hexParaOklch(hex);
  const container = tom(base, 92);
  return {
    base: hex,
    on: corDeTextoSobre(hex, base),
    container,
    onContainer: corDeTextoSobre(container, base),
  };
}

// ── API pública ──────────────────────────────────────────────

export const PALETA_PADRAO = {
  primaria: '#1CEAFF',
  secundaria: '#FF45FF',
  terciaria: '#1F357F',
};

/**
 * Deriva os tokens de cor do index.css a partir das 3 cores base.
 *
 * Suporta modo claro e modo escuro (`escuro: true`). No modo escuro,
 * as superfícies e textos são calculados preservando o matiz da primária,
 * garantindo conformidade com WCAG AA.
 *
 * @param {{primaria: string, secundaria: string, terciaria: string}} cores
 * @param {{ escuro?: boolean }} [opcoes]
 * @returns {Record<string, string>} mapa nome-do-token → hex
 */
export function derivarPaleta(cores = {}, { escuro = false } = {}) {
  const { primaria, secundaria, terciaria } = { ...PALETA_PADRAO, ...cores };

  const p = papel(primaria);
  const s = papel(secundaria);
  const t = papel(terciaria);

  // Neutros: matiz da primária, croma sutil para harmonia com a marca.
  const matiz = hexParaOklch(primaria);
  const neutro = { C: Math.min(matiz.C, 0.012), h: matiz.h };
  const neutroVariante = { C: Math.min(matiz.C, 0.028), h: matiz.h };

  const neutros = escuro
    ? {
        'background': tom(neutro, 14),
        'surface': tom(neutro, 18),
        'surface-container-lowest': tom(neutro, 11),
        'surface-container-low': tom(neutro, 21),
        'surface-container': tom(neutro, 25),
        'surface-container-high': tom(neutro, 30),
        'surface-container-highest': tom(neutro, 35),
        'on-surface': tom(neutro, 94),
        'on-surface-variant': tom(neutroVariante, 80),
        'outline': tom(neutroVariante, 58),
        'outline-variant': tom(neutroVariante, 30),
      }
    : {
        'background': tom(neutro, 99),
        'surface': '#ffffff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': tom(neutro, 97),
        'surface-container': tom(neutro, 95),
        'surface-container-high': tom(neutro, 93),
        'surface-container-highest': tom(neutro, 91),
        'on-surface': tom(neutro, 12),
        'on-surface-variant': tom(neutroVariante, 32),
        'outline': tom(neutroVariante, 52),
        'outline-variant': tom(neutroVariante, 82),
      };

  const fundoGrafico = escuro ? neutros['surface'] : '#ffffff';

  return {
    'primary': p.base,
    'on-primary': p.on,
    'primary-container': p.container,
    'on-primary-container': p.onContainer,

    'secondary': s.base,
    'on-secondary': s.on,
    'secondary-container': s.container,
    'on-secondary-container': s.onContainer,

    'tertiary': t.base,
    'on-tertiary': t.on,
    'tertiary-container': t.container,
    'on-tertiary-container': t.onContainer,

    ...neutros,

    // Cores de estado são de sistema: não acompanham a marca, porque o
    // significado ("algo deu errado", "aprovado") vale mais que a
    // identidade visual.
    'error': '#ba1a1a',
    'on-error': '#ffffff',
    'error-container': escuro ? '#93000a' : '#ffdad6',
    'on-error-container': escuro ? '#ffdad6' : '#410002',
    'warning': '#c94400',
    'on-warning': '#ffffff',
    'warning-container': escuro ? '#7e2a00' : '#ffe0b2',
    'on-warning-container': escuro ? '#ffe0b2' : '#3b1a00',
    'success': '#2e7d32',
    'on-success': '#ffffff',
    'success-container': escuro ? '#1b5e20' : '#d7f0d5',
    'on-success-container': escuro ? '#d7f0d5' : '#0b2e0d',
    'info': '#1565c0',
    'on-info': '#ffffff',
    'info-container': escuro ? '#0d47a1' : '#d6e6ff',
    'on-info-container': escuro ? '#d6e6ff' : '#001a3d',

    // Marcas de gráfico: mesmas cores da marca, com contraste calibrado
    'chart-1': corParaGrafico(primaria, fundoGrafico),
    'chart-2': corParaGrafico(terciaria, fundoGrafico),
    'chart-3': corParaGrafico(secundaria, fundoGrafico),
  };
}

/** Aplica a paleta como custom properties no `:root`. */
export function aplicarPaleta(paleta, elemento) {
  const raiz = elemento || document.documentElement;
  Object.entries(paleta).forEach(([token, valor]) => {
    raiz.style.setProperty(`--color-${token}`, valor);
  });
}

/** Remove as custom properties, voltando aos valores compilados no CSS. */
export function limparPaleta(elemento) {
  const raiz = elemento || document.documentElement;
  Object.keys(derivarPaleta()).forEach((token) => {
    raiz.style.removeProperty(`--color-${token}`);
  });
}

/** Valida um hex de 6 dígitos. */
export function ehHexValido(valor) {
  return /^#[0-9a-fA-F]{6}$/.test(String(valor || '').trim());
}
