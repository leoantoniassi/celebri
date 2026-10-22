// ============================================================
// Testes: configuração de e-mail (SMTP) e validação no start
// O "SMTP está configurado?" precisa ter uma única resposta para o
// emailService, para a validação de ambiente e para o script de dev.
// ============================================================
const {
  criarTransporter,
  devLogCodigoAtivo,
  porta,
  remetente,
  smtpConfigurado,
  usarTlsImplicito,
  REMETENTE_PADRAO,
} = require('../config/email');
const { exigirConfiguracaoSmtp, exigirConfiguracao } = require('../config/seguranca');

const SMTP_COMPLETO = {
  NODE_ENV: 'production',
  EMAIL_HOST: 'smtp.exemplo.com',
  EMAIL_PORT: '587',
  EMAIL_USER: 'user@exemplo.com',
  EMAIL_PASS: 'senha-forte',
  EMAIL_FROM: 'Celebri <nao-responda@celebri.local>',
};

const FORTE = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6071';

describe('config/email — leitura das variáveis', () => {
  it('smtpConfigurado é verdadeiro só com EMAIL_HOST preenchido', () => {
    expect(smtpConfigurado({ EMAIL_HOST: 'smtp.exemplo.com' })).toBe(true);
    expect(smtpConfigurado({ EMAIL_HOST: '  smtp.exemplo.com  ' })).toBe(true);
    expect(smtpConfigurado({})).toBe(false);
    expect(smtpConfigurado({ EMAIL_HOST: '' })).toBe(false);
    expect(smtpConfigurado({ EMAIL_HOST: '   ' })).toBe(false);
  });

  it('porta usa o padrão 2525 e descarta valores inválidos', () => {
    expect(porta({})).toBe(2525);
    expect(porta({ EMAIL_PORT: '587' })).toBe(587);
    expect(porta({ EMAIL_PORT: '1025' })).toBe(1025);
    expect(porta({ EMAIL_PORT: 'abc' })).toBe(2525);
    expect(porta({ EMAIL_PORT: '0' })).toBe(2525);
  });

  it('remetente usa EMAIL_FROM e cai no padrão quando vazio', () => {
    expect(remetente({ EMAIL_FROM: 'Celebri <x@y.com>' })).toBe('Celebri <x@y.com>');
    expect(remetente({})).toBe(REMETENTE_PADRAO);
    expect(remetente({ EMAIL_FROM: '  ' })).toBe(REMETENTE_PADRAO);
  });

  it('TLS implícito só na porta 465', () => {
    expect(usarTlsImplicito(465)).toBe(true);
    expect(usarTlsImplicito(587)).toBe(false);
    expect(usarTlsImplicito(1025)).toBe(false);
  });
});

describe('config/email — transporter', () => {
  it('monta host, porta e segurança a partir do env', () => {
    const t = criarTransporter({ EMAIL_HOST: 'smtp.exemplo.com', EMAIL_PORT: '587' });
    expect(t.options.host).toBe('smtp.exemplo.com');
    expect(t.options.port).toBe(587);
    expect(t.options.secure).toBe(false);
  });

  it('usa TLS implícito na 465', () => {
    const t = criarTransporter({ EMAIL_HOST: 'smtp.exemplo.com', EMAIL_PORT: '465' });
    expect(t.options.secure).toBe(true);
  });

  it('envia credenciais quando existem', () => {
    const t = criarTransporter({
      EMAIL_HOST: 'smtp.exemplo.com',
      EMAIL_USER: 'user@exemplo.com',
      EMAIL_PASS: 'senha',
    });
    expect(t.options.auth).toEqual({ user: 'user@exemplo.com', pass: 'senha' });
  });

  it('omite o bloco auth sem credenciais (relay sem autenticação)', () => {
    const t = criarTransporter({ EMAIL_HOST: 'smtp.exemplo.com' });
    expect(t.options.auth).toBeUndefined();
  });
});

describe('config/email — opt-in de log do código', () => {
  it('só liga com DEV_LOG_CODIGO_ACESSO=true e fora de produção', () => {
    expect(devLogCodigoAtivo({ NODE_ENV: 'development', DEV_LOG_CODIGO_ACESSO: 'true' })).toBe(true);
    expect(devLogCodigoAtivo({ NODE_ENV: 'test', DEV_LOG_CODIGO_ACESSO: 'true' })).toBe(true);
    expect(devLogCodigoAtivo({ NODE_ENV: 'development' })).toBe(false);
    expect(devLogCodigoAtivo({ NODE_ENV: 'development', DEV_LOG_CODIGO_ACESSO: 'false' })).toBe(false);
  });

  it('é ignorada em produção, mesmo com a flag ligada', () => {
    expect(devLogCodigoAtivo({ NODE_ENV: 'production', DEV_LOG_CODIGO_ACESSO: 'true' })).toBe(false);
  });
});

describe('exigirConfiguracaoSmtp', () => {
  it('em produção derruba o start sem EMAIL_HOST', () => {
    expect(() => exigirConfiguracaoSmtp({ NODE_ENV: 'production' })).toThrow(/EMAIL_HOST/);
  });

  it('em produção derruba o start com configuração incompleta', () => {
    expect(() =>
      exigirConfiguracaoSmtp({ NODE_ENV: 'production', EMAIL_HOST: 'smtp.exemplo.com' })
    ).toThrow(/incompleta/);
    expect(() =>
      exigirConfiguracaoSmtp({
        NODE_ENV: 'production',
        EMAIL_HOST: 'smtp.exemplo.com',
        EMAIL_USER: 'user@exemplo.com',
        EMAIL_PASS: 'senha-forte',
        EMAIL_FROM: '',
      })
    ).toThrow(/EMAIL_FROM/);
  });

  it('aceita a configuração completa em produção', () => {
    expect(() => exigirConfiguracaoSmtp(SMTP_COMPLETO)).not.toThrow();
  });

  it('em desenvolvimento e em test apenas avisa (não derruba)', () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => exigirConfiguracaoSmtp({ NODE_ENV: 'development' })).not.toThrow();
    expect(() => exigirConfiguracaoSmtp({ NODE_ENV: 'test' })).not.toThrow();
    aviso.mockRestore();
  });

  it('não vaza host, usuário ou senha no aviso de desenvolvimento', () => {
    const aviso = jest.spyOn(console, 'warn').mockImplementation(() => {});
    exigirConfiguracaoSmtp({
      NODE_ENV: 'development',
      EMAIL_HOST: '',
      EMAIL_USER: 'user@segredo.com',
      EMAIL_PASS: 'senha-secreta',
    });
    const texto = aviso.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(texto).toMatch(/SMTP não configurado/);
    expect(texto).not.toMatch(/segredo|senha-secreta|user@/);
    aviso.mockRestore();
  });
});

describe('exigirConfiguracao — o start completo', () => {
  it('recusa produção sem SMTP configurado', () => {
    const env = {
      NODE_ENV: 'production',
      JWT_SECRET: FORTE,
      DB_PASS: 'Zq8!vTn3Lw0xKp',
      FRONTEND_URL: 'https://app.exemplo.com.br',
    };
    expect(() => exigirConfiguracao(env)).toThrow(/EMAIL_HOST/);
  });

  it('aceita produção com SMTP completo', () => {
    const env = {
      NODE_ENV: 'production',
      JWT_SECRET: FORTE,
      DB_PASS: 'Zq8!vTn3Lw0xKp',
      FRONTEND_URL: 'https://app.exemplo.com.br',
      ...SMTP_COMPLETO,
    };
    expect(() => exigirConfiguracao(env)).not.toThrow();
  });
});
