// ============================================================
// Integração: GET /api/documentos/:id/arquivo (app real, FS temporário)
// Models e auth mockados; fileUtils/documentoService/controller reais.
// ============================================================
const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const EMPRESA_A = '11111111-1111-4111-8111-111111111111';
const EMPRESA_B = '22222222-2222-4222-8222-222222222222';

const mockDocumentos = {};
const mockDocumentoFindOne = jest.fn(async ({ where }) => {
  const doc = mockDocumentos[where.id];
  // Simula o escopo de tenant: só enxerga documentos da empresa corrente.
  return doc && doc.empresaId === EMPRESA_A ? doc : null;
});

jest.mock('../models', () => {
  const stub = () => new Proxy(function () {}, {
    get: (_t, prop) => (prop === '__esModule' ? false : prop === 'then' ? undefined : stub()),
    apply: () => stub(),
  });
  const base = stub();
  return new Proxy({}, {
    get: (_t, prop) => (prop === 'Documento' ? { findOne: (...a) => mockDocumentoFindOne(...a) } : base[prop]),
  });
});

jest.mock('../middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'u1', role: 'operador', empresaId: '11111111-1111-4111-8111-111111111111' };
  next();
});

describe('GET /api/documentos/:id/arquivo (integração)', () => {
  let tmp;
  let app;
  const dirAnterior = process.env.DOCUMENTOS_DIR;

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'docs-int-'));
    process.env.DOCUMENTOS_DIR = tmp;
    fs.mkdirSync(path.join(tmp, EMPRESA_A), { recursive: true });
    fs.mkdirSync(path.join(tmp, EMPRESA_B), { recursive: true });
    fs.writeFileSync(path.join(tmp, EMPRESA_A, 'contrato.pdf'), '%PDF-1.4 conteudo-a');
    fs.writeFileSync(path.join(tmp, EMPRESA_B, 'segredo.pdf'), '%PDF-1.4 conteudo-b');
    app = require('../app');
  });

  afterAll(() => {
    if (dirAnterior === undefined) delete process.env.DOCUMENTOS_DIR;
    else process.env.DOCUMENTOS_DIR = dirAnterior;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  beforeEach(() => {
    for (const k of Object.keys(mockDocumentos)) delete mockDocumentos[k];
  });

  const addDoc = (id, caminhoUrl, empresaId = EMPRESA_A) => {
    mockDocumentos[id] = { id, empresaId, caminhoUrl, nomeArquivo: 'x' };
  };

  test('200 com arquivo válido na pasta do tenant e headers de segurança', async () => {
    addDoc('00000000-0000-4000-8000-0000000000d1', 'contrato.pdf');
    const res = await request(app).get('/api/documentos/00000000-0000-4000-8000-0000000000d1/arquivo').buffer(true).parse((r, cb) => {
      let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => cb(null, d));
    });

    expect(res.status).toBe(200);
    expect(res.body).toBe('%PDF-1.4 conteudo-a');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-disposition']).toBe('inline');
    expect(res.headers['content-security-policy']).toBe("default-src 'none'; sandbox");
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
  });

  test.each(['../' + EMPRESA_B + '/segredo.pdf', '/etc/passwd.pdf', 'a.exe', '.env.pdf', 'a.pdf:x'])(
    '400 para caminho inválido %s, sem vazar o caminho',
    async (caminho) => {
      addDoc('00000000-0000-4000-8000-0000000000d2', caminho);
      const res = await request(app).get('/api/documentos/00000000-0000-4000-8000-0000000000d2/arquivo');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.text).not.toContain(tmp);
      expect(res.text).not.toContain('segredo');
    },
  );

  test('404 para arquivo inexistente, sem vazar o caminho', async () => {
    addDoc('00000000-0000-4000-8000-0000000000d3', 'nao-existe.pdf');
    const res = await request(app).get('/api/documentos/00000000-0000-4000-8000-0000000000d3/arquivo');

    expect(res.status).toBe(404);
    expect(res.text).not.toContain(tmp);
    expect(res.text).not.toContain('nao-existe');
  });

  test('404 para documento de outro tenant', async () => {
    addDoc('00000000-0000-4000-8000-0000000000d4', 'segredo.pdf', EMPRESA_B);
    const res = await request(app).get('/api/documentos/00000000-0000-4000-8000-0000000000d4/arquivo');

    expect(res.status).toBe(404);
    expect(res.text).not.toContain('conteudo-b');
    expect(res.text).not.toContain(tmp);
  });

  test('não serve arquivo de outro tenant via caminho relativo da própria empresa', async () => {
    addDoc('00000000-0000-4000-8000-0000000000d5', 'segredo.pdf'); // existe só na pasta da empresa B
    const res = await request(app).get('/api/documentos/00000000-0000-4000-8000-0000000000d5/arquivo');

    expect(res.status).toBe(404);
    expect(res.text).not.toContain('conteudo-b');
  });

  test('/uploads/... responde 404 (sem servir estático)', async () => {
    const res = await request(app).get(`/uploads/documentos/${EMPRESA_A}/contrato.pdf`);
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('conteudo-a');
  });
});
