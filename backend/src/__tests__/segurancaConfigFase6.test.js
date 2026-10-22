const { exigirJwtSecret, exigirSenhaBanco, exigirConfiguracao, normalizarAmbiente, lerOrigensCors } = require('../config/seguranca');
const { resolverSsl } = require('../config/dbSsl');

const FORTE = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6071';

describe('NODE_ENV', () => {
  it('normaliza maiúsculas/espaços e vazio vira development', () => {
    expect(normalizarAmbiente({ NODE_ENV: ' Production ' })).toBe('production');
    expect(normalizarAmbiente({})).toBe('development');
  });
  it.each(['prod', 'staging', 'producao'])('valor desconhecido "%s" é recusado (não cai em modo dev)', (v) => {
    expect(() => normalizarAmbiente({ NODE_ENV: v })).toThrow(/não reconhecido/);
    expect(() => exigirConfiguracao({ NODE_ENV: v, JWT_SECRET: FORTE })).toThrow();
  });
  it('exigirConfiguracao grava o valor canônico em env', () => {
    const env = {
      NODE_ENV: 'Production', JWT_SECRET: FORTE, DB_PASS: 'Zq8!vTn3Lw0xKp',
      FRONTEND_URL: 'https://app.exemplo.com.br',
      // SMTP é obrigatório em produção: sem ele o código de primeiro acesso
      // do app nunca é enviado.
      EMAIL_HOST: 'smtp.exemplo.com', EMAIL_PORT: '587',
      EMAIL_USER: 'user@exemplo.com', EMAIL_PASS: 'senha-forte',
      EMAIL_FROM: 'Celebri <nao-responda@celebri.local>',
    };
    exigirConfiguracao(env);
    expect(env.NODE_ENV).toBe('production');
  });
  it('exigirConfiguracao recusa produção sem FRONTEND_URL com mensagem clara', () => {
    const env = { NODE_ENV: 'production', JWT_SECRET: FORTE, DB_PASS: 'Zq8!vTn3Lw0xKp' };
    expect(() => exigirConfiguracao(env)).toThrow(/FRONTEND_URL é obrigatória/);
  });
  it('"Production" mantém FRONTEND_URL obrigatória e SSL ligado', () => {
    expect(() => lerOrigensCors({ NODE_ENV: 'Production' })).toThrow(/FRONTEND_URL/);
    expect(resolverSsl({ NODE_ENV: 'PRODUCTION', DB_HOST: 'x.com' }, jest.fn())).toMatchObject({ rejectUnauthorized: true });
  });
});

describe('JWT_SECRET placeholder em produção', () => {
  it.each([
    'troque-esta-senha-troque-esta-senha-xx',
    'ChangeMe-ChangeMe-ChangeMe-ChangeMe-1',
    'defina-um-segredo-longo-aqui-0123456789',
    'my-super-SECRET-value-0123456789abcdef',
    'mais_alegria_jwt_secret_2026_xxxxxxxxx',
  ])('recusa %s', (v) => {
    expect(() => exigirJwtSecret({ NODE_ENV: 'production', JWT_SECRET: v })).toThrow(/placeholder|exemplo/);
  });
  it('aceita segredo aleatório e não exige placeholder fora de produção', () => {
    expect(() => exigirJwtSecret({ NODE_ENV: 'production', JWT_SECRET: FORTE })).not.toThrow();
    expect(() => exigirJwtSecret({ NODE_ENV: 'development', JWT_SECRET: 'x'.repeat(48) })).not.toThrow();
  });
});

describe('DB_PASS em produção', () => {
  it.each([undefined, '', 'curta', 'troque-esta-senha', 'postgres', 'password123', 'mais_alegria_2026'])(
    'recusa %p',
    (v) => {
      expect(() => exigirSenhaBanco({ NODE_ENV: 'production', DB_PASS: v })).toThrow(/DB_PASS/);
    }
  );
  it('aceita senha forte; dev não exige', () => {
    expect(() => exigirSenhaBanco({ NODE_ENV: 'production', DB_PASS: 'Zq8!vTn3Lw0xKp' })).not.toThrow();
    expect(() => exigirSenhaBanco({ NODE_ENV: 'development', DB_PASS: '' })).not.toThrow();
  });
});

describe('downgrade de SSL', () => {
  it('DB_SSL=false em produção com host externo avisa, sem vazar host nem senha', () => {
    const avisar = jest.fn();
    expect(resolverSsl({ NODE_ENV: 'production', DB_HOST: 'db.interno.exemplo.com', DB_PASS: 'segredo', DB_SSL: 'false' }, avisar)).toBeNull();
    expect(avisar).toHaveBeenCalledTimes(1);
    expect(avisar.mock.calls[0][0]).not.toMatch(/exemplo|segredo/);
  });
  it('sem aviso para host interno ou em dev', () => {
    const avisar = jest.fn();
    resolverSsl({ NODE_ENV: 'production', DB_HOST: 'db', DB_SSL: 'false' }, avisar);
    resolverSsl({ NODE_ENV: 'development', DB_HOST: 'x.com', DB_SSL: 'false' }, avisar);
    expect(avisar).not.toHaveBeenCalled();
  });
});
