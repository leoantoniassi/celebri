import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import BrandLogo from '../../components/BrandLogo';
import { useTheme } from '../../contexts/ThemeContext';

export default function RedefinirSenhaPage() {
  const nomeFantasia = useTheme()?.config?.nomeFantasia || 'Celebri';
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const senhasIguais = confirmarSenha.length === 0 || senha === confirmarSenha;
  const senhaForte = senha.length >= 6;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token de redefinição de senha não encontrado na URL. Por favor, clique novamente no link do e-mail.');
      return;
    }

    if (!senhaForte) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem. Verifique os campos e tente novamente.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/redefinir-senha', { token, senha });
      setSucesso(true);
      // Redireciona para login após 2.5 segundos
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao redefinir a senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-stretch">
      {/* ── Lado Visual (Brand) ─────────────────────────────── */}
      <section className="hidden lg:flex w-1/2 relative items-end p-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover brightness-50"
            src="https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80"
            alt="Evento decorado com balões e flores"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 text-white max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <BrandLogo tamanho="xl" />
            <h1 className="font-headline font-extrabold text-4xl tracking-tight">{nomeFantasia}</h1>
          </div>
          <p className="font-headline text-2xl font-medium leading-tight">
            Escolha uma senha forte para proteger sua conta e acessar a gestão de eventos.
          </p>
          <div className="mt-8 h-1 w-24 bg-primary rounded-full" />
        </div>
      </section>

      {/* ── Lado do Formulário ──────────────────────────────── */}
      <section className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-12 md:px-24 bg-surface">
        <div className="w-full max-w-md">

          {/* Mobile Branding */}
          <div className="lg:hidden flex flex-col items-center mb-12">
            <BrandLogo tamanho="lg" className="mb-4 shadow-xl shadow-primary/20" />
            <h2 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">{nomeFantasia}</h2>
          </div>

          {/* Tela de Sucesso */}
          {sucesso ? (
            <div className="text-center space-y-6 fade-in">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto animate-bounce">
                <span className="material-symbols-outlined text-5xl text-on-primary-container filled">check_circle</span>
              </div>
              <div>
                <h3 className="font-headline text-3xl font-bold text-on-surface mb-2">Senha Redefinida!</h3>
                <p className="text-on-surface-variant">
                  Sua nova senha foi salva. Redirecionando para a tela de login...
                </p>
              </div>
              <div className="flex justify-center">
                <div className="w-40 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ animation: 'progress-bar 2.5s linear forwards' }}
                  />
                </div>
              </div>
              <style>{`
                @keyframes progress-bar {
                  from { width: 0%; }
                  to { width: 100%; }
                }
              `}</style>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-10 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-on-primary-container rounded-full text-sm font-semibold mb-4">
                  <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                  Redefinição de senha
                </div>
                <h3 className="font-headline text-3xl font-bold text-on-surface mb-2">Escolha uma nova senha</h3>
                <p className="text-on-surface-variant">
                  Defina as novas credenciais de acesso para a sua conta corporativa.
                </p>
              </div>

              {/* Alerta de token ausente */}
              {!token && (
                <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-2xl text-sm font-medium flex items-start gap-2">
                  <span className="material-symbols-outlined text-error text-lg flex-shrink-0">error</span>
                  <span>Link de redefinição inválido. Por favor, utilize o link recebido por e-mail.</span>
                </div>
              )}

              {/* Erro */}
              {error && (
                <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-2xl text-sm font-medium flex items-start gap-2">
                  <span className="material-symbols-outlined text-error text-lg flex-shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Formulário */}
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Nova Senha */}
                <div className="space-y-2">
                  <label
                    className="block text-sm font-semibold text-on-surface-variant ml-4"
                    htmlFor="nova-senha"
                  >
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      id="nova-senha"
                      type={showSenha ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                      minLength={6}
                      className="w-full h-14 pl-12 pr-12 py-3 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary transition-all placeholder:text-outline"
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">
                      lock
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-tertiary transition-colors"
                    >
                      <span className="material-symbols-outlined">
                        {showSenha ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {/* Indicador de força */}
                  {senha.length > 0 && (
                    <div className="flex items-center gap-2 ml-4">
                      <div className="flex gap-1">
                        <div className={`h-1 w-8 rounded-full transition-colors ${senha.length >= 6 ? 'bg-primary' : 'bg-surface-container-high'}`} />
                        <div className={`h-1 w-8 rounded-full transition-colors ${senha.length >= 8 ? 'bg-primary' : 'bg-surface-container-high'}`} />
                        <div className={`h-1 w-8 rounded-full transition-colors ${senha.length >= 10 ? 'bg-primary' : 'bg-surface-container-high'}`} />
                      </div>
                      <span className="text-xs text-on-surface-variant">
                        {senha.length < 6 ? 'Muito curta' : senha.length < 8 ? 'Razoável' : senha.length < 10 ? 'Boa' : 'Forte'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirmar Senha */}
                <div className="space-y-2">
                  <label
                    className="block text-sm font-semibold text-on-surface-variant ml-4"
                    htmlFor="confirmar-senha"
                  >
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <input
                      id="confirmar-senha"
                      type={showConfirmar ? 'text' : 'password'}
                      placeholder="Repita a senha acima"
                      value={confirmarSenha}
                      onChange={(e) => setConfirmarSenha(e.target.value)}
                      required
                      className={`w-full h-14 pl-12 pr-12 py-3 border-none rounded-full focus:ring-2 transition-all placeholder:text-outline ${
                        !senhasIguais
                          ? 'bg-error-container ring-2 ring-error focus:ring-error'
                          : confirmarSenha.length > 0 && senhasIguais
                          ? 'bg-surface-container-low ring-2 ring-primary focus:ring-primary'
                          : 'bg-surface-container-low focus:ring-primary'
                      }`}
                    />
                    <span
                      className={`material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 ${
                        !senhasIguais ? 'text-error' : confirmarSenha.length > 0 ? 'text-primary' : 'text-tertiary'
                      }`}
                    >
                      {!senhasIguais ? 'lock_open' : confirmarSenha.length > 0 ? 'lock' : 'lock'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowConfirmar(!showConfirmar)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-tertiary transition-colors"
                    >
                      <span className="material-symbols-outlined">
                        {showConfirmar ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {/* Feedback de correspondência */}
                  {confirmarSenha.length > 0 && (
                    <p className={`text-xs ml-4 font-medium flex items-center gap-1 ${senhasIguais ? 'text-primary' : 'text-error'}`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {senhasIguais ? 'check_circle' : 'cancel'}
                      </span>
                      {senhasIguais ? 'Senhas coincidem' : 'As senhas não coincidem'}
                    </p>
                  )}
                </div>

                {/* Botão Submit */}
                <button
                  id="btn-redefinir-senha-confirmar"
                  type="submit"
                  disabled={loading || !token || !senhasIguais || !senhaForte}
                  className="w-full h-14 brand-gradient text-on-primary font-headline font-bold text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-on-primary/40 border-t-on-primary rounded-full animate-spin" />
                      Redefinindo senha...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      Redefinir Minha Senha
                    </>
                  )}
                </button>
              </form>

              {/* Footer */}
              <footer className="mt-12 text-center">
                <p className="text-on-surface-variant text-sm flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-sm filled">favorite</span>
                  {nomeFantasia} — Gestão de Eventos
                </p>
              </footer>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
