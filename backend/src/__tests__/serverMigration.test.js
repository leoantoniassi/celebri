// server.js: falha de migration deve derrubar o processo (exit 1).
describe('server.js - migrations no start', () => {
  const ENV = { ...process.env };
  let exitSpy;
  let errSpy;

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'x'.repeat(48);
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined);
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    process.env = { ...ENV };
    jest.restoreAllMocks();
    jest.dontMock('../app');
    jest.dontMock('../config/database');
    jest.dontMock('../../scripts/migrate');
  });

  function mocks(rodarMigrations) {
    const listen = jest.fn();
    jest.doMock('../app', () => ({ listen }));
    jest.doMock('../config/database', () => ({ authenticate: jest.fn().mockResolvedValue() }));
    jest.doMock('../models', () => ({}));
    jest.doMock('../../scripts/migrate', () => ({ rodarMigrations }));
    return listen;
  }

  const aguardar = () => new Promise((r) => setImmediate(r));

  it('migration falha: exit(1) com mensagem clara e sem abrir a porta', async () => {
    const listen = mocks(jest.fn().mockRejectedValue(new Error('boom')));
    require('../server');
    await aguardar();
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errSpy.mock.calls.flat().join(' ')).toMatch(/migrations/i);
    expect(listen).not.toHaveBeenCalled();
  });

  it('migration ok: abre a porta e não encerra', async () => {
    const listen = mocks(jest.fn().mockResolvedValue());
    require('../server');
    await aguardar();
    expect(exitSpy).not.toHaveBeenCalled();
    expect(listen).toHaveBeenCalled();
  });
});
