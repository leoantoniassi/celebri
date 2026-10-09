const path = require('path');
const fs = require('fs');
const os = require('os');
const { detectarTipo, isUrlExterna, sanitizarCaminhoLocal } = require('../utils/fileUtils');

describe('fileUtils', () => {
  describe('detectarTipo', () => {
    test('deve retornar jpg para extensões jpg e jpeg', () => {
      expect(detectarTipo('documento.jpg')).toBe('jpg');
      expect(detectarTipo('documento.jpeg')).toBe('jpg');
    });

    test('deve retornar png para extensão png', () => {
      expect(detectarTipo('imagem.png')).toBe('png');
    });

    test('deve retornar pdf para outras extensões ou caminhos sem extensão reconhecida', () => {
      expect(detectarTipo('documento.pdf')).toBe('pdf');
      expect(detectarTipo('documento.txt')).toBe('pdf');
      expect(detectarTipo('')).toBe('pdf');
    });
  });

  describe('isUrlExterna', () => {
    test('deve retornar true para urls http ou https', () => {
      expect(isUrlExterna('http://exemplo.com/docs/contrato.pdf')).toBe(true);
      expect(isUrlExterna('https://drive.google.com/doc')).toBe(true);
      expect(isUrlExterna('HTTP://EXEMPLO.COM')).toBe(true);
    });

    test('deve retornar false para caminhos locais', () => {
      expect(isUrlExterna('C:\\Users\\documento.pdf')).toBe(false);
      expect(isUrlExterna('/Users/documento.pdf')).toBe(false);
      expect(isUrlExterna('contrato.pdf')).toBe(false);
      expect(isUrlExterna('')).toBe(false);
      expect(isUrlExterna(null)).toBe(false);
    });
  });

  describe('sanitizarCaminhoLocal', () => {
    const EMPRESA_A = '11111111-1111-4111-8111-111111111111';
    const EMPRESA_B = '22222222-2222-4222-8222-222222222222';
    let base;
    let fora;
    const original = process.env.DOCUMENTOS_DIR;

    beforeAll(() => {
      base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'docs-base-')));
      fora = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'docs-fora-')));
      process.env.DOCUMENTOS_DIR = base;
      fs.mkdirSync(path.join(base, EMPRESA_A, 'sub'), { recursive: true });
      fs.mkdirSync(path.join(base, EMPRESA_B), { recursive: true });
      fs.writeFileSync(path.join(base, EMPRESA_A, 'sub', 'ok.pdf'), 'x');
      fs.writeFileSync(path.join(base, EMPRESA_B, 'segredo.pdf'), 'x');
      fs.writeFileSync(path.join(fora, 'externo.pdf'), 'x');
      fs.symlinkSync(path.join(fora, 'externo.pdf'), path.join(base, EMPRESA_A, 'link.pdf'));
      fs.symlinkSync(fora, path.join(base, EMPRESA_A, 'dirlink'));
      fs.symlinkSync(path.join(base, EMPRESA_B), path.join(base, EMPRESA_A, 'outro'));
    });

    afterAll(() => {
      if (original === undefined) delete process.env.DOCUMENTOS_DIR;
      else process.env.DOCUMENTOS_DIR = original;
      fs.rmSync(base, { recursive: true, force: true });
      fs.rmSync(fora, { recursive: true, force: true });
    });

    test('resolve caminho relativo dentro da pasta do tenant', async () => {
      const res = await sanitizarCaminhoLocal('sub/ok.pdf', EMPRESA_A);
      expect(res).toBe(path.join(base, EMPRESA_A, 'sub', 'ok.pdf'));
    });

    test('aceita separador de barra invertida em caminho relativo', async () => {
      const res = await sanitizarCaminhoLocal('sub\\ok.pdf', EMPRESA_A);
      expect(res).toBe(path.join(base, EMPRESA_A, 'sub', 'ok.pdf'));
    });

    test('arquivo inexistente devolve caminho dentro do tenant (404 fica com o chamador)', async () => {
      const res = await sanitizarCaminhoLocal('nao-existe.pdf', EMPRESA_A);
      expect(res).toBe(path.join(base, EMPRESA_A, 'nao-existe.pdf'));
    });

    test.each([
      ['absoluto unix', '/etc/passwd.pdf'],
      ['absoluto unix existente', '/tmp/docs-fora-x/externo.pdf'],
      ['absoluto windows', 'C:\\Users\\franc\\documento.pdf'],
      ['absoluto windows com barra', 'C:/Users/documento.pdf'],
      ['UNC', '\\\\servidor\\share\\a.pdf'],
      ['parent traversal', '../outro/a.pdf'],
      ['parent traversal no meio', 'sub/../../x.pdf'],
      ['parent traversal windows', 'C:\\Users\\..\\documento.pdf'],
      ['byte nulo', 'ok.pdf\0.png'],
      ['extensão inválida', 'documento.exe'],
      ['sem extensão', 'documento'],
      ['vazio', ''],
    ])('rejeita %s', async (_nome, entrada) => {
      expect(await sanitizarCaminhoLocal(entrada, EMPRESA_A)).toBeNull();
    });

    test('rejeita entrada que não é string', async () => {
      expect(await sanitizarCaminhoLocal(null, EMPRESA_A)).toBeNull();
      expect(await sanitizarCaminhoLocal({}, EMPRESA_A)).toBeNull();
    });

    test('rejeita tenant ausente ou inválido', async () => {
      expect(await sanitizarCaminhoLocal('sub/ok.pdf')).toBeNull();
      expect(await sanitizarCaminhoLocal('sub/ok.pdf', null)).toBeNull();
      expect(await sanitizarCaminhoLocal('sub/ok.pdf', '../x')).toBeNull();
    });

    test('não acessa arquivo de outro tenant', async () => {
      // O arquivo de B só existe na pasta de B; para A resolve em A (inexistente)
      const res = await sanitizarCaminhoLocal('segredo.pdf', EMPRESA_A);
      expect(res).toBe(path.join(base, EMPRESA_A, 'segredo.pdf'));
      expect(fs.existsSync(res)).toBe(false);
    });

    test.each([
      ['%2e%2e/x.pdf'], ['..%2fx.pdf'], ['..\\x.pdf'], ['./../x.pdf'], ['sub/../../x.pdf'],
      ['.. /x.pdf'], ['../ /x.pdf'], ['\uff0e\uff0e/x.pdf\0'], ['a.pdf\0.exe'], ['a.exe\0.pdf'],
      ['a.pdf:stream'], ['file:///etc/passwd.pdf'], ['//host/share/a.pdf'], ['\\\\host\\s\\a.pdf'],
      ['C:\\a.pdf'], ['a.pdf.'], ['sub./a.pdf'], ['a.pdf.exe'], ['a.PDF.exe'], ['a.exe'],
      ['.env.pdf'], ['.git/x.png'], ['sub/.hidden.pdf'], ['/etc/passwd'], ['\n../x.pdf'],
    ])('rejeita bypass %j', async (entrada) => {
      expect(await sanitizarCaminhoLocal(entrada, EMPRESA_A)).toBeNull();
    });

    test('aceita extensão maiúscula legítima', async () => {
      expect(await sanitizarCaminhoLocal('sub/OK.PDF', EMPRESA_A)).toBe(path.join(base, EMPRESA_A, 'sub', 'OK.PDF'));
    });

    test('bloqueia symlink de arquivo que escapa da pasta', async () => {
      expect(await sanitizarCaminhoLocal('link.pdf', EMPRESA_A)).toBeNull();
    });

    test('bloqueia symlink de diretório que escapa da pasta', async () => {
      expect(await sanitizarCaminhoLocal('dirlink/externo.pdf', EMPRESA_A)).toBeNull();
    });

    test('bloqueia symlink que aponta para a pasta de outro tenant', async () => {
      expect(await sanitizarCaminhoLocal('outro/segredo.pdf', EMPRESA_A)).toBeNull();
    });
  });
});
