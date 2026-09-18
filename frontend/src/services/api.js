import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: adiciona token JWT e identifica a empresa (tenant)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Rotas públicas (login, recuperar senha, /tenant/config) não têm JWT,
  // então a empresa precisa ser identificada pelo slug. Em produção o
  // subdomínio já resolve; o header cobre dev e o app mobile.
  const slug = localStorage.getItem('celebri:slug');
  if (slug) {
    config.headers['X-Tenant-Slug'] = slug;
  }

  return config;
});

// Interceptor: trata erros de resposta (como expiração do token)
// Usa CustomEvent para desacoplar do AuthContext e evitar dependência circular.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      const isLoginRequest = error.config?.url?.includes('/auth/login');

      if (!isLoginRequest) {
        const isNaoAutorizado = status === 401 || status === 403;
        const isEmpresaNaoEncontrada =
          status === 404 && data?.message?.includes('Empresa não encontrada');

        if (isNaoAutorizado || isEmpresaNaoEncontrada) {
          // Delega o logout para o AuthContext via CustomEvent.
          // Isso garante que o React gerencie o estado de autenticação
          // de forma correta, sem recorrer a hard-redirects que perdem
          // o histórico e não ativam os listeners do Router.
          window.dispatchEvent(new CustomEvent('celebri:sessao-expirada'));
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
