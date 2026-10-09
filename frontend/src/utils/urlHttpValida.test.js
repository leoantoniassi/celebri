import { urlHttpValida } from './validators';

describe('urlHttpValida', () => {
  test.each(['', '   ', null, undefined, 'https://drive.google.com/x', 'http://a.com'])('aceita %p', (v) => {
    expect(urlHttpValida(v)).toBe(true);
  });

  test.each(['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'ftp://a.com', 'C:\\Catalogos\\a.pdf', 'a.com', 'https://'])('rejeita %p', (v) => {
    expect(urlHttpValida(v)).toBe(false);
  });
});
