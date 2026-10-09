const { criarContadorJanela } = require('../utils/janelaContador');

describe('criarContadorJanela', () => {
  test('permite até o máximo e bloqueia o excedente dentro da janela', () => {
    const c = criarContadorJanela({ max: 2, janelaMs: 1000 });
    expect(c.registrar('a', 0)).toBe(true);
    expect(c.registrar('a', 10)).toBe(true);
    expect(c.registrar('a', 20)).toBe(false);
    expect(c.registrar('b', 20)).toBe(true); // chaves independentes
  });

  test('reinicia a contagem depois da janela', () => {
    const c = criarContadorJanela({ max: 1, janelaMs: 1000 });
    expect(c.registrar('a', 0)).toBe(true);
    expect(c.registrar('a', 500)).toBe(false);
    expect(c.registrar('a', 1000)).toBe(true);
  });

  test('limita o número de chaves em memória', () => {
    const c = criarContadorJanela({ max: 1, janelaMs: 1000, maxChaves: 2 });
    ['a', 'b', 'c', 'd'].forEach((k) => c.registrar(k, 0));
    expect(c.registrar('d', 1)).toBe(false); // mais recente preservada
  });
});
