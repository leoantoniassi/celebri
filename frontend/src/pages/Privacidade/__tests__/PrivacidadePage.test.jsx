import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import PrivacidadePage from '../PrivacidadePage';

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...rest }) => <a href={to} {...rest}>{children}</a>,
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams('token=' + 'a'.repeat(64))],
}));
jest.mock('../../../components/BrandLogo', () => () => <div data-testid="logo" />);

describe('PrivacidadePage', () => {
  const renderizar = () => render(<PrivacidadePage />);

  it('mostra categorias de dados, direitos do titular e contato do encarregado', () => {
    renderizar();
    expect(screen.getByRole('heading', { name: /Política de Privacidade/i })).toBeInTheDocument();
    ['Clientes', 'Funcionários', 'Fornecedores', 'Convidados'].forEach((c) => {
      expect(screen.getByText(`${c}:`)).toBeInTheDocument();
    });
    expect(screen.getByText(/art\. 18 da LGPD/i)).toBeInTheDocument();
    expect(screen.getByText('[E-MAIL DO ENCARREGADO]')).toBeInTheDocument();
  });

  it('tem a seção de Termos de Uso (âncora #termos) e link de volta ao login', () => {
    const { container } = renderizar();
    expect(container.querySelector('#termos')).not.toBeNull();
    expect(screen.getByRole('link', { name: /Voltar ao login/i })).toHaveAttribute('href', '/login');
  });

  it('não injeta HTML bruto', () => {
    const { container } = renderizar();
    expect(container.querySelector('script')).toBeNull();
  });
});
