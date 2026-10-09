import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EventosPage from '../EventosPage';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirm } from '../../../contexts/ConfirmContext';
import api from '../../../services/api';

jest.mock('../../../contexts/AuthContext');
jest.mock('../../../contexts/ConfirmContext');
jest.mock('../../../services/api');

const mockLocais = [
  { id: '1', nome: 'Salão 1', capacidadeMaxima: 100 },
  { id: '2', nome: 'Salão 2', capacidadeMaxima: null },
];

function setupApiMock() {
  api.get.mockImplementation((url, _config) => {
    if (url === '/eventos') {
      return Promise.resolve({ data: { data: [], pagination: { total: 0 } } });
    }
    if (url === '/clientes') {
      return Promise.resolve({ data: { data: [] } });
    }
    if (url === '/orcamentos') {
      return Promise.resolve({ data: { data: [] } });
    }
    if (url === '/locais?limit=100') {
      return Promise.resolve({ data: { data: mockLocais } });
    }
    return Promise.resolve({ data: {} });
  });
}

describe('EventosPage — warning de capacidade excedida', () => {
  // Role-based tests para o botão Excluir
  describe('controle de acesso por papel (role) — Excluir', () => {
    function setupApiMockWithEvento() {
      api.get.mockImplementation((url, _config) => {
        if (url === '/eventos') {
          return Promise.resolve({
            data: {
              data: [{
                id: 'evt-1',
                cliente: { nome: 'Cliente Teste' },
                local: { nome: 'Salão' },
                nome: 'Evento Teste',
                dataEvento: '2026-12-31',
                horarioTermino: '2026-12-31T23:59:59.000Z',
                status: 'pendente',
                qtdPessoas: 50,
                qtdAdultos: 30,
                qtdCriancas: 15,
                qtdBebes: 5,
                orcamentoId: null,
                clientId: 'cli-1',
              }],
              pagination: { total: 1 },
            },
          });
        }
        if (url === '/clientes') {
          return Promise.resolve({ data: { data: [] } });
        }
        if (url === '/orcamentos') {
          return Promise.resolve({ data: { data: [] } });
        }
        if (url === '/locais?limit=100') {
          return Promise.resolve({ data: { data: [] } });
        }
        return Promise.resolve({ data: {} });
      });
    }

    test('operador NAO ve botao Excluir em evento', async () => {
      useAuth.mockReturnValue({ user: { id: 2, nome: 'Operador', role: 'operador' } });
      setupApiMockWithEvento();
      render(<EventosPage />);
      expect(await screen.findByText('Cliente Teste')).toBeInTheDocument();
      expect(screen.queryByTitle('Excluir')).not.toBeInTheDocument();
    });

    test('gerente VE botao Excluir em evento', async () => {
      useAuth.mockReturnValue({ user: { id: 1, nome: 'Gerente', role: 'gerente' } });
      setupApiMockWithEvento();
      render(<EventosPage />);
      expect(await screen.findByText('Cliente Teste')).toBeInTheDocument();
      expect(screen.getByTitle('Excluir')).toBeInTheDocument();
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ user: { id: 1, nome: 'Gerente', role: 'gerente' } });
    useConfirm.mockReturnValue(jest.fn().mockResolvedValue(true));
    setupApiMock();
  });

  /** Helper: clica em "Novo Evento" e aguarda o painel abrir */
  async function abrirFormulario(user) {
    await screen.findByText('Novo Evento');
    await user.click(screen.getByText('Novo Evento'));
    await screen.findByText('Salvar');
  }

  test('deve exibir warning quando qtdPessoas excede capacidade do local', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);
    await abrirFormulario(user);

    // Seleciona o 1o select do form (Local = Salão 1, capacidadeMaxima=100)
    const [localSelect] = document.querySelectorAll('#evt-form select');
    await user.selectOptions(localSelect, '1');

    // Pega o 3o input[type=number] (Adultos; o 2o, Total, é readOnly)
    const [, , adultosInput] = document.querySelectorAll('#evt-form input[type="number"]');
    await user.clear(adultosInput);
    await user.type(adultosInput, '150');

    expect(await screen.findByText('Capacidade excedida!')).toBeInTheDocument();
  });

  test('campo Total é readOnly e reflete a soma de Adultos, Crianças e Bebês', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);
    await abrirFormulario(user);

    const [, totalInput, adultosInput, criancasInput, bebesInput] =
      document.querySelectorAll('#evt-form input[type="number"]');
    expect(totalInput).toHaveAttribute('readonly');

    await user.type(adultosInput, '10');
    await user.type(criancasInput, '5');
    await user.type(bebesInput, '2');

    expect(totalInput).toHaveValue(17);
  });

  test('NÃO deve exibir warning quando qtdPessoas está dentro da capacidade', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);
    await abrirFormulario(user);

    const [localSelect] = document.querySelectorAll('#evt-form select');
    await user.selectOptions(localSelect, '1');

    const [, , adultosInput] = document.querySelectorAll('#evt-form input[type="number"]');
    await user.clear(adultosInput);
    await user.type(adultosInput, '80');

    await waitFor(() => {
      expect(screen.queryByText('Capacidade excedida!')).not.toBeInTheDocument();
    });
  });

  test('NÃO deve exibir warning quando local não tem capacidadeMaxima definida', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);
    await abrirFormulario(user);

    const [localSelect] = document.querySelectorAll('#evt-form select');
    await user.selectOptions(localSelect, '2');

    const [, , adultosInput] = document.querySelectorAll('#evt-form input[type="number"]');
    await user.clear(adultosInput);
    await user.type(adultosInput, '150');

    await waitFor(() => {
      expect(screen.queryByText('Capacidade excedida!')).not.toBeInTheDocument();
    });
  });

  test('deve exibir campo "Horário de Término" no formulário de Novo Evento', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);
    await abrirFormulario(user);

    expect(screen.getByText('Horário de Término')).toBeInTheDocument();
  });

  test('campo "Horário de Término" deve ser required', async () => {
    const user = userEvent.setup();
    render(<EventosPage />);
    await abrirFormulario(user);

    const inputs = document.querySelectorAll('#evt-form input[type="datetime-local"]');
    expect(inputs.length).toBe(2);
    // O segundo input datetime-local é o Horário de Término
    expect(inputs[1]).toHaveAttribute('required');
  });
});
