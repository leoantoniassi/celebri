// ============================================================
// Testes: cabeçalhos de segurança do frontend (nginx.conf x vercel.json)
// ============================================================
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..', '..', '..', 'frontend');
const nginx = fs.readFileSync(path.join(raiz, 'nginx.conf'), 'utf8');
const vercel = JSON.parse(fs.readFileSync(path.join(raiz, 'vercel.json'), 'utf8'));

const nginxSemComentarios = nginx.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');

function cabecalhosNginx(bloco) {
  const out = {};
  for (const m of bloco.matchAll(/add_header\s+(\S+)\s+"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

// Trecho de uma location (até a próxima location/fim do server)
function location(nome) {
  const inicio = nginxSemComentarios.indexOf(`location ${nome} {`);
  expect(inicio).toBeGreaterThan(-1);
  const resto = nginxSemComentarios.slice(inicio + 1);
  const prox = resto.search(/\n\s*location /);
  return prox === -1 ? resto : resto.slice(0, prox);
}

const vercelGlobal = Object.fromEntries(
  vercel.headers.find((h) => h.source === '/(.*)').headers.map((h) => [h.key, h.value])
);
const nginxServer = cabecalhosNginx(nginxSemComentarios.split(/\n\s*location /)[0]);

const OBRIGATORIOS = [
  'Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options',
  'Referrer-Policy', 'Permissions-Policy',
];

describe('cabeçalhos de segurança do frontend', () => {
  test.each(OBRIGATORIOS)('%s presente e idêntico em nginx e vercel', (nome) => {
    expect(nginxServer[nome]).toBeDefined();
    expect(vercelGlobal[nome]).toBe(nginxServer[nome]);
  });

  test('valores fixos esperados', () => {
    expect(vercelGlobal['X-Content-Type-Options']).toBe('nosniff');
    expect(vercelGlobal['X-Frame-Options']).toBe('DENY');
    expect(vercelGlobal['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(vercelGlobal['Permissions-Policy']).toMatch(/camera=\(\)/);
    expect(vercelGlobal['Permissions-Policy']).toMatch(/geolocation=\(\)/);
  });

  test('CSP estrita: sem unsafe-inline/unsafe-eval em script e diretivas-chave', () => {
    const csp = vercelGlobal['Content-Security-Policy'];
    const diretivas = Object.fromEntries(csp.split(';').map((d) => d.trim().split(/\s+(.*)/s).slice(0, 2)));
    expect(diretivas['default-src']).toBe("'self'");
    expect(diretivas['script-src']).toBe("'self'");
    expect(csp).not.toMatch(/unsafe-eval/);
    expect(diretivas['object-src']).toBe("'none'");
    expect(diretivas['frame-ancestors']).toBe("'none'");
    expect(diretivas['base-uri']).toBe("'self'");
    expect(diretivas['form-action']).toBe("'self'");
    expect(diretivas['style-src']).toMatch(/fonts\.googleapis\.com/);
    expect(diretivas['font-src']).toMatch(/fonts\.gstatic\.com/);
    expect(csp).not.toMatch(/\*/);
  });

  test('vercel envia HSTS; nginx do container não ativa HSTS (TLS é do host)', () => {
    expect(vercelGlobal['Strict-Transport-Security']).toMatch(/max-age=\d+/);
    expect(nginxSemComentarios).not.toMatch(/Strict-Transport-Security/);
    expect(nginx).toMatch(/#\s+add_header Strict-Transport-Security/);
  });

  test.each(['/', '/assets/'])('location %s repete os cabeçalhos de segurança (add_header não herda)', (loc) => {
    const h = cabecalhosNginx(location(loc));
    for (const nome of OBRIGATORIOS) expect(h[nome]).toBe(nginxServer[nome]);
  });

  test('location /api/ repete nosniff/DENY/Permissions-Policy e deixa CSP e Referrer ao backend', () => {
    const h = cabecalhosNginx(location('/api/'));
    expect(h['X-Content-Type-Options']).toBe('nosniff');
    expect(h['X-Frame-Options']).toBe('DENY');
    expect(h['Permissions-Policy']).toBe(nginxServer['Permissions-Policy']);
    expect(h['Content-Security-Policy']).toBeUndefined();
    expect(h['Referrer-Policy']).toBeUndefined();
  });

  test('nginx: server_tokens off, dotfiles bloqueados e proxy com X-Forwarded-For', () => {
    expect(nginxSemComentarios).toMatch(/server_tokens off;/);
    expect(nginxSemComentarios).toMatch(/location ~ \/\\\.\(\?!well-known\)/);
    expect(location('/api/')).toMatch(/proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;/);
    expect(location('/api/')).toMatch(/proxy_set_header X-Real-IP/);
    expect(nginx).toMatch(/TRUST_PROXY/);
  });

  test('cache: index sem cache e assets com hash imutáveis (nginx e vercel)', () => {
    expect(cabecalhosNginx(location('/'))['Cache-Control']).toBe('no-cache');
    expect(cabecalhosNginx(location('/assets/'))['Cache-Control']).toMatch(/immutable/);
    expect(vercelGlobal['Cache-Control']).toBe('no-cache');
    const assets = vercel.headers.find((h) => h.source === '/assets/(.*)').headers;
    expect(assets.find((h) => h.key === 'Cache-Control').value).toMatch(/immutable/);
  });

  test('index.html não tem script inline (compatível com script-src self)', () => {
    const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(fs.existsSync(path.join(raiz, 'public', 'tema-inicial.js'))).toBe(true);
  });
});
