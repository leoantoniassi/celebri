const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolverSsl } = require('../config/dbSsl');

const sem = () => jest.fn();

describe('resolverSsl', () => {
  it('desenvolvimento: sem SSL', () => {
    expect(resolverSsl({ NODE_ENV: 'development', DB_HOST: 'db.exemplo.com' }, sem())).toBeNull();
  });

  it.each(['db', 'localhost', 'postgres', '127.0.0.1'])('produção com host interno %s: sem SSL', (host) => {
    expect(resolverSsl({ NODE_ENV: 'production', DB_HOST: host }, sem())).toBeNull();
  });

  it('produção com host externo: SSL verificado por padrão', () => {
    const avisar = sem();
    expect(resolverSsl({ NODE_ENV: 'production', DB_HOST: 'db.exemplo.com' }, avisar)).toEqual({
      require: true,
      rejectUnauthorized: true,
    });
    expect(avisar).not.toHaveBeenCalled();
  });

  it('DB_SSL=false desliga mesmo em produção externa; DB_SSL=true liga em dev', () => {
    expect(resolverSsl({ NODE_ENV: 'production', DB_HOST: 'x.com', DB_SSL: 'false' }, sem())).toBeNull();
    expect(resolverSsl({ NODE_ENV: 'development', DB_HOST: 'db', DB_SSL: 'true' }, sem())).toEqual({
      require: true,
      rejectUnauthorized: true,
    });
  });

  it('DB_SSL_CA como conteúdo PEM: rejectUnauthorized true com ca', () => {
    const pem = '-----BEGIN CERTIFICATE-----\\nabc\\n-----END CERTIFICATE-----';
    const r = resolverSsl({ NODE_ENV: 'production', DB_HOST: 'x.com', DB_SSL_CA: pem }, sem());
    expect(r.rejectUnauthorized).toBe(true);
    expect(r.ca).toContain('BEGIN CERTIFICATE-----\nabc\n');
  });

  it('DB_SSL_CA como caminho de arquivo; CA prevalece sobre REJECT_UNAUTHORIZED=false', () => {
    const f = path.join(os.tmpdir(), `ca-${process.pid}.pem`);
    fs.writeFileSync(f, '-----BEGIN CERTIFICATE-----\nzzz\n-----END CERTIFICATE-----\n');
    try {
      const r = resolverSsl(
        { NODE_ENV: 'production', DB_HOST: 'x.com', DB_SSL_CA: f, DB_SSL_REJECT_UNAUTHORIZED: 'false' },
        sem()
      );
      expect(r.rejectUnauthorized).toBe(true);
      expect(r.ca).toContain('zzz');
    } finally {
      fs.unlinkSync(f);
    }
  });

  it('DB_SSL_CA com arquivo inexistente falha com mensagem clara', () => {
    expect(() =>
      resolverSsl({ NODE_ENV: 'production', DB_HOST: 'x.com', DB_SSL_CA: '/nao/existe.pem' }, sem())
    ).toThrow(/DB_SSL_CA/);
  });

  it('rejectUnauthorized:false só com DB_SSL_REJECT_UNAUTHORIZED=false explícito, com aviso', () => {
    const avisar = sem();
    const r = resolverSsl(
      { NODE_ENV: 'production', DB_HOST: 'x.com', DB_SSL_REJECT_UNAUTHORIZED: 'false' },
      avisar
    );
    expect(r).toEqual({ require: true, rejectUnauthorized: false });
    expect(avisar).toHaveBeenCalledTimes(1);
    const r2 = resolverSsl({ NODE_ENV: 'production', DB_HOST: 'x.com', DB_SSL_REJECT_UNAUTHORIZED: 'talvez' }, sem());
    expect(r2.rejectUnauthorized).toBe(true);
  });
});

describe('config/database.js usa resolverSsl', () => {
  const ENV = { ...process.env };
  afterEach(() => {
    process.env = { ...ENV };
    jest.resetModules();
  });

  function carregar(env) {
    Object.assign(process.env, env);
    jest.resetModules();
    const Sequelize = jest.fn(function () { return { addHook: jest.fn(), define: jest.fn() }; });
    jest.doMock('sequelize', () => ({ Sequelize, Op: {}, DataTypes: {} }));
    try { require('../config/database'); } catch (_) { /* hooks de tenant podem exigir instância real */ }
    return Sequelize.mock.calls[0][3].dialectOptions;
  }

  it('dev: dialectOptions sem ssl', () => {
    expect(carregar({ NODE_ENV: 'development', DB_HOST: 'db.exemplo.com', DB_SSL: '' }).ssl).toBeUndefined();
  });

  it('produção host externo: ssl presente e verificado', () => {
    const o = carregar({ NODE_ENV: 'production', DB_HOST: 'db.exemplo.com', DB_SSL: '' });
    expect(o.ssl).toEqual({ require: true, rejectUnauthorized: true });
  });
});
