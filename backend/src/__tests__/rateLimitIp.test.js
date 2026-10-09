// Chave de limite por IP: IPv4-mapeado, IPv6 agrupado em /64 e limpeza do contador.
const { chaveDoIp, limitarRequisicoes } = require('../middleware/rateLimit');

describe('chaveDoIp', () => {
  test('IPv4 e IPv4-mapeado dão a mesma chave', () => {
    expect(chaveDoIp('::ffff:203.0.113.5')).toBe('203.0.113.5');
    expect(chaveDoIp('203.0.113.5')).toBe('203.0.113.5');
  });

  test('IPv6 do mesmo /64 compartilha a chave; /64 diferente não', () => {
    const a = chaveDoIp('2001:db8:1:2::1');
    expect(chaveDoIp('2001:db8:1:2:ffff:ffff:ffff:ffff')).toBe(a);
    expect(chaveDoIp('2001:0DB8:0001:0002:0:0:0:9')).toBe(a);
    expect(chaveDoIp('2001:db8:1:3::1')).not.toBe(a);
    expect(a).toMatch(/\/64$/);
  });

  test('IPv6 com :: no início e entrada vazia não quebram', () => {
    expect(chaveDoIp('::1')).toBe('0:0:0:0::/64');
    expect(chaveDoIp(undefined)).toBe('');
  });
});

describe('limitarRequisicoes', () => {
  test('libera até max, depois responde 429 por IP; outro IP segue livre', () => {
    const mw = limitarRequisicoes({ janelaMs: 60000, max: 2 });
    const res = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });
    const next = jest.fn();
    mw({ ip: '1.1.1.1' }, res(), next);
    mw({ ip: '1.1.1.1' }, res(), next);
    const bloqueada = res();
    mw({ ip: '1.1.1.1' }, bloqueada, next);
    mw({ ip: '2.2.2.2' }, res(), next);

    expect(next).toHaveBeenCalledTimes(3);
    expect(bloqueada.status).toHaveBeenCalledWith(429);
  });
});
