import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfirmProvider } from './contexts/ConfirmContext';
import AppLayout from './components/layout/AppLayout';
import BrandLogo from './components/BrandLogo';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ClientesPage from './pages/Clientes/ClientesPage';
import FuncionariosPage from './pages/Funcionarios/FuncionariosPage';
import EventosPage from './pages/Eventos/EventosPage';
import EstoquePage from './pages/Estoque/EstoquePage';
import OrcamentosPage from './pages/Orcamentos/OrcamentosPage';
import DocumentosPage from './pages/Documentos/DocumentosPage';
import CatalogosPage from './pages/Catalogos/CatalogosPage';
import FornecedoresPage from './pages/Fornecedores/FornecedoresPage';
import UsuariosPage from './pages/Usuarios/UsuariosPage';
import CadastrosPage from './pages/Cadastros/CadastrosPage';
import ConfiguracoesPage from './pages/Configuracoes/ConfiguracoesPage';
import DefinirSenhaPage from './pages/DefinirSenha/DefinirSenhaPage';
import RecuperarSenhaPage from './pages/Login/RecuperarSenhaPage';
import RedefinirSenhaPage from './pages/Login/RedefinirSenhaPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo tamanho="lg" />
          <p className="text-sm text-on-surface-variant">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RoleRoute({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function LoginRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  // Se já está logado, redireciona para o dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
      <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
      {/* Rota pública para ativação de conta via convite */}
      <Route path="/definir-senha" element={<DefinirSenhaPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="clientes" element={<ClientesPage />} />
        <Route path="funcionarios" element={<FuncionariosPage />} />
        <Route path="fornecedores" element={<FornecedoresPage />} />
        <Route path="eventos" element={<EventosPage />} />
        <Route path="estoque" element={<EstoquePage />} />
        <Route path="orcamentos" element={<OrcamentosPage />} />
        <Route path="documentos" element={<DocumentosPage />} />
        <Route path="catalogos" element={<CatalogosPage />} />
        <Route path="cadastros" element={<CadastrosPage />} />
        <Route
          path="usuarios"
          element={
            <RoleRoute role="gerente">
              <UsuariosPage />
            </RoleRoute>
          }
        />
        <Route
          path="configuracoes"
          element={<ConfiguracoesPage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ConfirmProvider>
          <AppRoutes />
        </ConfirmProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
