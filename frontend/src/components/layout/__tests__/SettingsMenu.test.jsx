import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SettingsMenu from '../SettingsMenu';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

let mockUser = { id: '1', nome: 'Admin Teste', role: 'gerente' };
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

const mockToggleModoEscuro = jest.fn();
let mockModoEscuro = false;
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    modoEscuro: mockModoEscuro,
    toggleModoEscuro: mockToggleModoEscuro,
  }),
}));

describe('SettingsMenu Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockModoEscuro = false;
  });

  test('renderiza o menu de configurações para usuário operador e exibe a opção Modo Escuro', () => {
    mockUser = { id: '2', nome: 'Operador Teste', role: 'operador' };
    render(<SettingsMenu />);

    // Operador agora tem acesso ao menu de configurações para alternar o tema
    const btn = screen.getByTitle('Configurações e Ferramentas');
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);

    // Deve exibir o botão de Modo Escuro
    expect(screen.getByText('Modo Escuro')).toBeInTheDocument();
    // NÃO deve exibir a opção de Identidade Visual para operador
    expect(screen.queryByText('Identidade Visual')).not.toBeInTheDocument();

    // Clica no botão de modo escuro
    const darkBtn = screen.getByText('Modo Escuro');
    fireEvent.click(darkBtn);
    expect(mockToggleModoEscuro).toHaveBeenCalledTimes(1);
  });

  test('renderiza o ícone de ferramentas quando o usuário é gerente com Identidade Visual e Modo Escuro', () => {
    mockUser = { id: '1', nome: 'Gerente Teste', role: 'gerente' };
    render(<SettingsMenu />);

    const btn = screen.getByTitle('Configurações e Ferramentas');
    expect(btn).toBeInTheDocument();

    // Clica no botão de configurações
    fireEvent.click(btn);

    // Gerente vê Modo Escuro E Identidade Visual
    expect(screen.getByText('Modo Escuro')).toBeInTheDocument();
    expect(screen.getByText('Identidade Visual')).toBeInTheDocument();
    expect(screen.getByText('Personalizar cores, logo e marca')).toBeInTheDocument();
  });

  test('ao clicar no botão de Modo Escuro, dispara toggleModoEscuro', () => {
    mockUser = { id: '1', nome: 'Gerente Teste', role: 'gerente' };
    render(<SettingsMenu />);

    fireEvent.click(screen.getByTitle('Configurações e Ferramentas'));

    const toggleBtn = screen.getByText('Modo Escuro');
    fireEvent.click(toggleBtn);
    expect(mockToggleModoEscuro).toHaveBeenCalledTimes(1);
  });

  test('ao clicar em Identidade Visual, navega para /configuracoes e fecha o menu', () => {
    mockUser = { id: '1', nome: 'Gerente Teste', role: 'gerente' };
    render(<SettingsMenu />);

    // Abre o menu
    fireEvent.click(screen.getByTitle('Configurações e Ferramentas'));

    // Clica na opção
    fireEvent.click(screen.getByText('Identidade Visual'));

    expect(mockNavigate).toHaveBeenCalledWith('/configuracoes');
    expect(screen.queryByText('Identidade Visual')).not.toBeInTheDocument();
  });
});

