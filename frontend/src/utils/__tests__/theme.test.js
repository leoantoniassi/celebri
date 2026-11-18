import { derivarPaleta, contraste } from '../theme';

// Marcas de gráfico (chart-*) precisam de >= 3:1 contra a superfície
// (WCAG 1.4.11) nos dois modos — senão os pontos do Dashboard somem.
const MARCAS = {
  padrao: {},
  azulMarinho: { primaria: '#1a237e', secundaria: '#0d1b2a', terciaria: '#1F357F' },
  preto: { primaria: '#111111' },
  amareloClaro: { primaria: '#FEDC57', secundaria: '#fff59d', terciaria: '#e0f7fa' },
};

describe('derivarPaleta — cores de gráfico visíveis', () => {
  test.each(Object.entries(MARCAS).flatMap(([nome, cores]) => [
    [nome, 'claro', cores, false],
    [nome, 'escuro', cores, true],
  ]))('%s no modo %s: chart-1..3 com contraste >= 3:1', (_nome, _modo, cores, escuro) => {
    const paleta = derivarPaleta(cores, { escuro });
    ['chart-1', 'chart-2', 'chart-3'].forEach((token) => {
      expect(contraste(paleta[token], paleta.surface)).toBeGreaterThanOrEqual(3);
    });
  });
});
