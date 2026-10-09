import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentosPage from './DocumentosPage';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import api from '../../services/api';

jest.mock('../../contexts/AuthContext');
jest.mock('../../contexts/ConfirmContext');
jest.mock('../../services/api');

const mockOpen = jest.fn();
const mockCreateObjectURL = jest.fn(() => 'blob:http://localhost/test-blob');
const mockRevokeObjectURL = jest.fn();

const docSemCaminho = {
  id: 1,
  nomeArquivo: 'Sem Caminho',
  caminhoUrl: '',
  tipoArquivo: 'pdf',
  cliente: { nome: 'Cliente A' },
  evento: null,
};

const docExterno = {
  id: 2,
  nomeArquivo: 'Link Externo',
  caminhoUrl: 'https://drive.google.com/file.pdf',
  tipoArquivo: 'pdf',
  cliente: null,
  evento: { nome: 'Evento B' },
};

const docLocal = {
  id: 3,
  nomeArquivo: 'Local.pdf',
  caminhoUrl: 'contratos/doc.pdf',
  tipoArquivo: 'pdf',
  cliente: { nome: 'Cliente C' },
  evento: null,
};

function setupApiMock(documentos = []) {
  api.get.mockImplementation((url, config) => {
    if (url === '/documentos') {
      return Promise.resolve({ data: { data: documentos } });
    }
    if (url === '/clientes') {
      return Promise.resolve({ data: { data: [] } });
    }
    if (url === '/eventos') {
      return Promise.resolve({ data: { data: [] } });
    }
    if (url?.startsWith('/documentos/') && url.endsWith('/arquivo')) {
      const blob = new Blob(['fake-content'], { type: 'application/pdf' });
      return Promise.resolve({ data: blob });
    }
    return Promise.reject(new Error('not found'));
  });
}

describe('DocumentosPage — handleAbrir', () => {
  beforeAll(() => {
    window.open = mockOpen;
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, nome: 'Gerente', role: 'gerente' } });
    useConfirm.mockReturnValue(jest.fn().mockResolvedValue(true));
  });

  describe('quando doc não possui caminhoUrl', () => {
    test('não chama window.open nem api.get', async () => {
      setupApiMock([docSemCaminho]);
      render(<DocumentosPage />);

      const btn = await screen.findByTitle('Ver localização');
      await userEvent.click(btn);

      expect(mockOpen).not.toHaveBeenCalled();
      expect(api.get).toHaveBeenCalledTimes(3);
      expect(api.get).toHaveBeenCalledWith('/documentos');
      expect(api.get).toHaveBeenCalledWith('/clientes', expect.any(Object));
      expect(api.get).toHaveBeenCalledWith('/eventos', expect.any(Object));
    });
  });

  describe('quando doc possui URL http', () => {
    test('abre window.open com a URL e opções de segurança', async () => {
      setupApiMock([docExterno]);
      render(<DocumentosPage />);

      const btn = await screen.findByTitle('Abrir link');
      await userEvent.click(btn);

      expect(mockOpen).toHaveBeenCalledWith(
        'https://drive.google.com/file.pdf',
        '_blank',
        'noopener,noreferrer',
      );
    });
  });

  describe('quando doc possui caminho local', () => {
    test('faz requisição à API com responseType blob e cria blob URL', async () => {
      setupApiMock([docLocal]);
      render(<DocumentosPage />);

      const btn = await screen.findByTitle('Ver localização');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/documentos/3/arquivo', {
          responseType: 'blob',
        });
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
    });
  });

  describe('quando API retorna erro no caminho local', () => {
    test('exibe alerta de erro', async () => {
      const confirmMock = jest.fn().mockResolvedValue(true);
      useConfirm.mockReturnValue(confirmMock);
      api.get.mockImplementation((url, config) => {
        if (url === '/documentos') {
          return Promise.resolve({ data: { data: [docLocal] } });
        }
        if (url === '/clientes') {
          return Promise.resolve({ data: { data: [] } });
        }
        if (url === '/eventos') {
          return Promise.resolve({ data: { data: [] } });
        }
        if (url?.startsWith('/documentos/') && url.endsWith('/arquivo')) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.reject(new Error('not found'));
      });

      render(<DocumentosPage />);

      const btn = await screen.findByTitle('Ver localização');
      await userEvent.click(btn);

      await waitFor(() => {
        expect(confirmMock).toHaveBeenCalledWith(
          'Erro ao abrir o arquivo. Verifique se o caminho está acessível pelo servidor.',
          expect.objectContaining({ title: 'Erro', showCancel: false }),
        );
      });
    });
  });
});

describe('DocumentosPage — Filtro Cruzado Cliente e Evento', () => {
  const mockClientes = [
    { id: 'cli-1', nome: 'Cliente Alfa' },
    { id: 'cli-2', nome: 'Cliente Beta' },
  ];

  const mockEventos = [
    { id: 'evt-1', nome: 'Evento Alfa 1', clienteId: 'cli-1' },
    { id: 'evt-2', nome: 'Evento Alfa 2', clienteId: 'cli-1' },
    { id: 'evt-3', nome: 'Evento Beta 1', clienteId: 'cli-2' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, nome: 'Gerente', role: 'gerente' } });
    useConfirm.mockReturnValue(jest.fn().mockResolvedValue(true));

    api.get.mockImplementation((url) => {
      if (url === '/documentos') {
        return Promise.resolve({ data: { data: [] } });
      }
      if (url === '/clientes') {
        return Promise.resolve({ data: { data: mockClientes } });
      }
      if (url === '/eventos') {
        return Promise.resolve({ data: { data: mockEventos } });
      }
      return Promise.reject(new Error('not found'));
    });
  });

  test('filtragem dos eventos ao selecionar um cliente', async () => {
    render(<DocumentosPage />);

    // Abre o modal
    const novoBtn = await screen.findByText('Novo Documento');
    await userEvent.click(novoBtn);

    // Seleciona Cliente Alfa
    const clienteSelect = screen.getByLabelText(/Cliente/i, { selector: 'select' });
    await userEvent.selectOptions(clienteSelect, 'cli-1');

    // Verifica se apenas os eventos do Cliente Alfa são exibidos
    const eventoSelect = screen.getByLabelText(/Evento/i, { selector: 'select' });
    const options = Array.from(eventoSelect.options).map(o => o.value);

    expect(options).toContain('evt-1');
    expect(options).toContain('evt-2');
    expect(options).not.toContain('evt-3');
  });

  test('auto-seleção e filtro do cliente ao selecionar um evento', async () => {
    render(<DocumentosPage />);

    // Abre o modal
    const novoBtn = await screen.findByText('Novo Documento');
    await userEvent.click(novoBtn);

    // Seleciona Evento Beta 1
    const eventoSelect = screen.getByLabelText(/Evento/i, { selector: 'select' });
    await userEvent.selectOptions(eventoSelect, 'evt-3');

    // Verifica se o Cliente Beta foi auto-selecionado
    const clienteSelect = screen.getByLabelText(/Cliente/i, { selector: 'select' });
    expect(clienteSelect.value).toBe('cli-2');

    // Verifica se a lista de clientes agora só contém Cliente Beta (e a opção vazia)
    const clientOptions = Array.from(clienteSelect.options).map(o => o.value);
    expect(clientOptions).toContain('cli-2');
    expect(clientOptions).not.toContain('cli-1');
  });
});
