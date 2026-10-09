// ============================================================
// Testes: migration 013 (LGPD) idempotente e refletida em init.sql / setup_producao.sql
// ============================================================
const fs = require('fs');
const path = require('path');

const DB = path.resolve(__dirname, '..', '..', '..', 'database');
const ler = (...p) => fs.readFileSync(path.join(DB, ...p), 'latin1');

const COLUNAS = ['cli_anonimizado_em', 'fun_anonimizado_em', 'for_anonimizado_em', 'usr_termos_aceitos_em', 'usr_termos_versao'];
const COLUNAS_AUDITORIA = ['aud_id', 'aud_emp_id', 'aud_usr_id', 'aud_acao', 'aud_entidade', 'aud_entidade_id', 'aud_ip', 'aud_detalhes', 'aud_criado_em'];

describe('migration 013 (LGPD)', () => {
  const sql = ler('migrations', '013_lgpd_auditoria_anonimizacao.sql');

  test('é idempotente: todo ADD COLUMN/CREATE usa IF NOT EXISTS', () => {
    const comandos = sql.match(/^\s*(ALTER TABLE .*ADD COLUMN.*|CREATE (UNIQUE )?(TABLE|INDEX).*)$/gim) || [];
    expect(comandos.length).toBeGreaterThanOrEqual(9);
    comandos.forEach((c) => expect(c).toMatch(/IF NOT EXISTS/i));
  });

  test('cria auditoria com as colunas pedidas e índice (empresa, criado_em)', () => {
    COLUNAS_AUDITORIA.forEach((c) => expect(sql).toContain(c));
    expect(sql).toMatch(/aud_detalhes\s+JSONB/i);
    expect(sql).toMatch(/aud_criado_em\s+TIMESTAMPTZ/i);
    expect(sql).toMatch(/ON auditoria \(aud_emp_id, aud_criado_em/i);
  });

  test('marca anonimização em clientes, funcionarios, fornecedores e convites', () => {
    ['clientes', 'funcionarios', 'fornecedores'].forEach((t) => expect(sql).toMatch(new RegExp(`ALTER TABLE ${t}\\s+ADD COLUMN IF NOT EXISTS`)));
    expect(sql).toContain('cnv_anonimizado_em');
  });

  test.each(['init.sql', 'setup_producao.sql'])('%s tem paridade (colunas e tabela auditoria)', (arquivo) => {
    const conteudo = ler(arquivo);
    COLUNAS.concat(COLUNAS_AUDITORIA).forEach((c) => expect(conteudo).toContain(c));
    expect(conteudo).toMatch(/CREATE TABLE IF NOT EXISTS auditoria/);
  });
});
