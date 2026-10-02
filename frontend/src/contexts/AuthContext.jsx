import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

// ============================================================
// AuthContext — Autenticação + Logout automático por expiração
// ============================================================
// O JWT carrega o campo `exp` (Unix timestamp em segundos).
// Ao carregar o token (login ou refresh da página), calculamos
// quanto tempo falta para ele expirar e agendamos um setTimeout
// que executa o logout antes que a sessão expire no servidor.
//
// Estratégia de logout sem biblioteca:
//   1. Decode manual da segunda parte do JWT (payload base64url).
//   2. setTimeout para `(exp - now - MARGEM_SEGUNDOS)`.
//   3. CustomEvent "celebri:sessao-expirada" disparado pelo api.js
//      quando recebe 401/403, para que o interceptor não precise
//      importar este contexto (evita dependência circular).
//   4. Evento "storage" para sincronizar logout entre múltiplas abas.
// ============================================================

const AuthContext = createContext(null);

/** Decodifica o payload de um JWT sem biblioteca externa. */
function decodeJwtPayload(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Retorna os ms restantes até a expiração do token (negativo = já expirou). */
function msAteExpirar(token, margemSegundos = 10) {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return -1;
  return payload.exp * 1000 - Date.now() - margemSegundos * 1000;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  const timerRef = useRef(null);

  /** Cancela qualquer timer de expiração em andamento. */
  const cancelarTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Executa o logout e limpa o estado. */
  const logout = useCallback((expirado = false) => {
    cancelarTimer();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    if (expirado) setSessaoExpirada(true);
  }, [cancelarTimer]);

  /**
   * Agenda o timeout de logout automático com base no `exp` do JWT.
   * Se o token já expirou, executa o logout imediatamente.
   */
  const agendarLogout = useCallback((token) => {
    cancelarTimer();
    const ms = msAteExpirar(token);
    if (ms <= 0) {
      logout(true);
      return;
    }
    timerRef.current = setTimeout(() => logout(true), ms);
  }, [cancelarTimer, logout]);

  // Inicializa o estado a partir do localStorage (persiste entre reloads)
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (storedUser && storedUser !== 'undefined' && token) {
        // Verifica se o token já expirou antes mesmo de montar a tela
        if (msAteExpirar(token) <= 0) {
          logout(true);
        } else {
          setUser(JSON.parse(storedUser));
          agendarLogout(token);
        }
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, [agendarLogout, logout]);

  // Sincroniza logout entre abas do mesmo navegador
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'token' && !e.newValue) {
        // Token foi removido em outra aba
        cancelarTimer();
        setUser(null);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [cancelarTimer]);

  // Ouve o CustomEvent disparado pelo interceptor do api.js para logout por 401/403
  useEffect(() => {
    const handleSessaoExpirada = () => logout(true);
    window.addEventListener('celebri:sessao-expirada', handleSessaoExpirada);
    return () => window.removeEventListener('celebri:sessao-expirada', handleSessaoExpirada);
  }, [logout]);

  // Limpa o timer ao desmontar
  useEffect(() => cancelarTimer, [cancelarTimer]);

  const login = async (email, senha) => {
    const { data } = await api.post('/auth/login', { email, senha });
    const userData = data.data;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setSessaoExpirada(false);
    setUser(userData);
    agendarLogout(data.token);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        sessaoExpirada,
        limparMensagemExpiracao: () => setSessaoExpirada(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

