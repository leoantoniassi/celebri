import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DefinirSenhaPage from '../DefinirSenhaPage';
import api from '../../../services/api';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>,
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams('token=' + 'a'.repeat(64))],
}));
jest.mock('../../../services/api');
jest.mock('../../../components/BrandLogo', () => () => <div data-testid="logo" />);

const TOKEN = 'a'.repeat(64);

function renderizar() {
  return render(<DefinirSenhaPage />);
}

async function preencherSenhas(user) {
  await user.type(screen.getByLabelText('Nova Senha'), 'SenhaForte123');
  await user.type(screen.getByLabelText('Confirmar Senha'), 'SenhaForte123');
}

describe('DefinirSenhaPage: aceite de termos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.post.mockResolvedValue({ data: { success: true } });
  });

  it('mostra o checkbox com links para termos e política', () => {
    renderizar();
    expect(screen.getByLabelText(/Li e aceito/i)).not.toBeChecked();
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/privacidade#termos');
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
  });

  it('mantém o botão desabilitado até aceitar e não chama a API sem aceite', async () => {
    const user = userEvent.setup();
    renderizar();
    await preencherSenhas(user);
    expect(screen.getByRole('button', { name: /Ativar Minha Conta/i })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('envia aceiteTermos:true junto com token e senha ao aceitar', async () => {
    const user = userEvent.setup();
    renderizar();
    await preencherSenhas(user);
    await user.click(screen.getByLabelText(/Li e aceito/i));
    await user.click(screen.getByRole('button', { name: /Ativar Minha Conta/i }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith(
      '/usuarios/definir-senha',
      { token: TOKEN, senha: 'SenhaForte123', aceiteTermos: true },
    ));
  });
});
