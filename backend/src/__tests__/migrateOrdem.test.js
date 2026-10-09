const fs = require('fs');
const path = require('path');
const { listarArquivos } = require('../../scripts/migrate');

const DIR = path.resolve(__dirname, '..', '..', '..', 'database', 'migrations');

describe('ordem das migrations', () => {
  const arquivos = listarArquivos();

  it('não há nomes duplicados e todos têm prefixo numérico', () => {
    expect(new Set(arquivos).size).toBe(arquivos.length);
    arquivos.forEach((a) => expect(a).toMatch(/^\d{3}_.+\.sql$/));
  });

  it('a ordem é estável e igual à ordenação lexicográfica do nome completo', () => {
    expect(arquivos).toEqual([...arquivos].sort());
    expect(listarArquivos()).toEqual(arquivos);
    expect(arquivos).toEqual(fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort());
  });

  it('prefixos repetidos (006, 008) têm ordem determinística pelo sufixo', () => {
    const i = (n) => arquivos.indexOf(n);
    expect(i('006_expand_logo_url.sql')).toBeGreaterThanOrEqual(0);
    expect(i('006_expand_logo_url.sql')).toBeLessThan(i('006_usuario_funcionario_link.sql'));
    expect(i('008_codigo_primeiro_acesso.sql')).toBeLessThan(i('008_update_empresa_celebri.sql'));
  });

  it('os prefixos nunca regridem (sem migration nova inserida no meio)', () => {
    const pref = arquivos.map((a) => Number(a.slice(0, 3)));
    expect(pref).toEqual([...pref].sort((a, b) => a - b));
  });
});
