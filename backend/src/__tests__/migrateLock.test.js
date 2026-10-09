const mockQuery = jest.fn();
const mockClient = { connect: jest.fn(), end: jest.fn(), query: (...a) => mockQuery(...a) };
jest.mock('pg', () => ({ Client: jest.fn(() => mockClient) }));

const { rodarMigrations, LOCK_MIGRATIONS } = require('../../scripts/migrate');

const sqls = () => mockQuery.mock.calls.map((c) => String(c[0]));

describe('migrate: advisory lock', () => {
  beforeEach(() => {
    mockQuery.mockReset().mockResolvedValue({ rows: [] });
    mockClient.connect.mockReset().mockResolvedValue();
    mockClient.end.mockReset().mockResolvedValue();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('adquire o lock antes de tudo e libera antes de encerrar', async () => {
    await rodarMigrations();
    const q = sqls();
    expect(q[0]).toMatch(/pg_advisory_lock/);
    expect(mockQuery.mock.calls[0][1]).toEqual([LOCK_MIGRATIONS]);
    expect(q[1]).toMatch(/CREATE TABLE IF NOT EXISTS schema_migrations/);
    expect(q[q.length - 1]).toMatch(/pg_advisory_unlock/);
    expect(mockClient.end).toHaveBeenCalled();
  });

  it('libera o lock mesmo se uma migration falhar (com ROLLBACK)', async () => {
    mockQuery.mockImplementation(async (sql) => {
      if (/^BEGIN/.test(sql)) return { rows: [] };
      if (/INSERT INTO schema_migrations/.test(sql)) throw new Error('falha simulada');
      return { rows: [] };
    });
    await expect(rodarMigrations()).rejects.toThrow('falha simulada');
    const q = sqls();
    expect(q).toContain('ROLLBACK');
    expect(q[q.length - 1]).toMatch(/pg_advisory_unlock/);
    expect(mockClient.end).toHaveBeenCalled();
  });

  it('com tudo já aplicado: não abre transação, mas adquire e libera o lock', async () => {
    const { listarArquivos } = require('../../scripts/migrate');
    const todas = listarArquivos().map((version) => ({ version }));
    mockQuery.mockImplementation(async (sql) =>
      /SELECT version FROM schema_migrations/.test(sql) ? { rows: todas } : { rows: [] });
    await rodarMigrations();
    const q = sqls();
    expect(q.some((s) => /^BEGIN/.test(s))).toBe(false);
    expect(q[0]).toMatch(/pg_advisory_lock/);
    expect(q[q.length - 1]).toMatch(/pg_advisory_unlock/);
  });

  it('não tenta liberar o lock se a aquisição falhou, e ainda encerra a conexão', async () => {
    mockQuery.mockRejectedValueOnce(new Error('sem lock'));
    await expect(rodarMigrations()).rejects.toThrow('sem lock');
    expect(sqls().some((s) => /pg_advisory_unlock/.test(s))).toBe(false);
    expect(mockClient.end).toHaveBeenCalled();
  });

  it('engole erro ao liberar o lock (conexão caída) sem mascarar o resultado', async () => {
    mockQuery.mockImplementation(async (sql) => {
      if (/pg_advisory_unlock/.test(sql)) throw new Error('conexão caiu');
      return { rows: [] };
    });
    await expect(rodarMigrations()).resolves.toBeUndefined();
    expect(mockClient.end).toHaveBeenCalled();
  });
});

describe('migrate CLI: falha de conexão', () => {
  const { spawnSync } = require('child_process');
  const path = require('path');

  it('sai com código 1 e não vaza a senha do banco', () => {
    const r = spawnSync(process.execPath, [path.resolve(__dirname, '..', '..', 'scripts', 'migrate.js')], {
      cwd: path.resolve(__dirname, '..', '..'),
      env: { PATH: process.env.PATH, NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_PORT: '1', DB_USER: 'u', DB_NAME: 'd', DB_PASS: 'SenhaSecretaXYZ123' },
      encoding: 'utf8',
      timeout: 15000,
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/Migration falhou/);
    expect(r.stdout + r.stderr).not.toContain('SenhaSecretaXYZ123');
  });
});
