import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProdutosEventoModal from '../ProdutosEventoModal';
import api from '../../services/api';

jest.mock('../../services/api');

const evento = { id: 'evt-1', nome: 'Festa da Ana' };

const produtosEstoque = [
  { id: 'prd-1', nome: 'Refrigerante 2L', quantidade: '40.00', estoqueMinimo: '10.00', unidadeMedida: 'un' },
  { id: 'prd-2', nome: 'Farinha', quantidade: '3.00', estoqueMinimo: '5.00', unidadeMedida: 'kg' },
];

const reservados = [
  { id: 'evp-1', quantidade: '2.00', produto: produtosEstoque[1] },
];

describe('ProdutosEventoModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/eventos/evt-1/produtos') return Promise.resolve({ data: { data: reservados } });
      if (url === '/produtos') return Promise.resolve({ data: { data: produtosEstoque } });
      return Promise.reject(new Error('not found'));
    });
    api.post.mockResolvedValue({ data: { success: true } });
    api.put.mockResolvedValue({ data: { success: true } });
    api.delete.mockResolvedValue({ data: { success: true } });
  });

  test('lista os produtos reservados e sinaliza estoque baixo', async () => {
    render(<ProdutosEventoModal evento={evento} onClose={() => {}} />);

    expect(await screen.findByText('Farinha')).toBeInTheDocument();
    expect(screen.getByText('Estoque baixo')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/produtos', { params: { page: 1, limit: 100 } });
  });

  test('adiciona um produto ao evento com produtoId e quantidade', async () => {
    render(<ProdutosEventoModal evento={evento} onClose={() => {}} />);
    await screen.findByRole('option', { name: /Refrigerante 2L/ });

    fireEvent.change(screen.getByLabelText(/Produto do estoque/), { target: { value: 'prd-1' } });
    fireEvent.change(screen.getByLabelText(/Qtd. reservada/), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar produto ao evento' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/eventos/evt-1/produtos', { produtoId: 'prd-1', quantidade: 12.5 });
    });
  });

  test('edita a quantidade reservada ao sair do campo', async () => {
    render(<ProdutosEventoModal evento={evento} onClose={() => {}} />);
    const campo = await screen.findByLabelText('Quantidade reservada de Farinha');

    fireEvent.change(campo, { target: { value: '4' } });
    fireEvent.blur(campo);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/evento-produtos/evp-1', { quantidade: 4 });
    });
  });

  test('remove o produto do evento', async () => {
    render(<ProdutosEventoModal evento={evento} onClose={() => {}} />);
    await screen.findByText('Farinha');

    fireEvent.click(screen.getByTitle('Remover do evento'));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/evento-produtos/evp-1'));
  });
});
