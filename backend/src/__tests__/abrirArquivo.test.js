const path = require('path');
const fs = require('fs');
const os = require('os');
const request = require('supertest');
const express = require('express');

jest.mock('../services/documentoService');
jest.mock('../utils/fileUtils');
jest.mock('../middleware/auth', () => (req, res, next) => { req.user = { id: 'u-1', role: 'gerente' }; next(); });
jest.mock('../middleware/roles', () => () => (req, res, next) => next());

const documentoService = require('../services/documentoService');
const { sanitizarCaminhoLocal, arquivoExiste } = require('../utils/fileUtils');
const router = require('../routes/documentos.routes');

describe('GET /documentos/:id/arquivo — abrirArquivo', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/documentos', router);
    app.use((err, _req, res, _next) => {
      const status = err.statusCode || 500;
      res.status(status).json({ success: false, message: err.message });
    });
  });

  describe('cenários de erro', () => {
    test('deve retornar 404 quando documento não é encontrado', async () => {
      const err = new Error('Documento não encontrado.');
      err.statusCode = 404;
      documentoService.findDocumentoOrFail.mockRejectedValue(err);

      const res = await request(app).get('/documentos/00000000-0000-4000-8000-000000000999/arquivo');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        message: 'Documento não encontrado.',
      });
    });

    test('deve retornar 400 quando documento possui URL externa', async () => {
      const doc = { id: 1, caminhoUrl: 'http://drive.google.com/doc.pdf', nomeArquivo: 'doc.pdf' };
      documentoService.findDocumentoOrFail.mockResolvedValue(doc);
      documentoService.infoArquivo.mockReturnValue({ caminho: doc.caminhoUrl, isExterno: true });

      const res = await request(app).get('/documentos/00000000-0000-4000-8000-000000000001/arquivo');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        message: 'Este documento não possui um arquivo local.',
      });
    });

    test('deve retornar 400 quando caminho é inválido ou extensão não permitida', async () => {
      const doc = { id: 2, caminhoUrl: '../malicioso.exe', nomeArquivo: 'virus.exe' };
      documentoService.findDocumentoOrFail.mockResolvedValue(doc);
      documentoService.infoArquivo.mockReturnValue({ caminho: doc.caminhoUrl, isExterno: false });
      sanitizarCaminhoLocal.mockReturnValue(null);

      const res = await request(app).get('/documentos/00000000-0000-4000-8000-000000000002/arquivo');

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        message: 'Caminho de arquivo inválido.',
      });
    });

    test('deve retornar 404 quando arquivo não existe no disco', async () => {
      const doc = { id: 3, caminhoUrl: 'contrato.pdf', nomeArquivo: 'contrato.pdf' };
      documentoService.findDocumentoOrFail.mockResolvedValue(doc);
      documentoService.infoArquivo.mockReturnValue({ caminho: doc.caminhoUrl, isExterno: false });
      sanitizarCaminhoLocal.mockReturnValue('/uploads/documentos/contrato.pdf');
      arquivoExiste.mockResolvedValue(false);

      const res = await request(app).get('/documentos/00000000-0000-4000-8000-000000000003/arquivo');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        message: 'Arquivo não encontrado no diretório de documentos.',
      });
    });
  });

  describe('cenário de sucesso', () => {
    test('deve fazer download do arquivo com status 200 quando tudo é válido', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-test-'));
      const tmpFile = path.join(tmpDir, 'contrato.pdf');
      fs.writeFileSync(tmpFile, 'conteúdo fake do pdf');

      const doc = { id: 4, caminhoUrl: 'contrato.pdf', nomeArquivo: 'contrato.pdf' };
      documentoService.findDocumentoOrFail.mockResolvedValue(doc);
      documentoService.infoArquivo.mockReturnValue({ caminho: doc.caminhoUrl, isExterno: false });
      sanitizarCaminhoLocal.mockReturnValue(tmpFile);
      arquivoExiste.mockResolvedValue(true);

      const res = await request(app).get('/documentos/00000000-0000-4000-8000-000000000004/arquivo');

      expect(res.status).toBe(200);

      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
