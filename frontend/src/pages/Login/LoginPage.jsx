import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BrandLogo from '../../components/BrandLogo';
import { useTheme } from '../../contexts/ThemeContext';

export default function LoginPage() {
  const nomeFantasia = useTheme()?.config?.nomeFantasia || 'Celebri';
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, senha);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-stretch">
      {/* Visual Brand Side */}
      <section className="hidden lg:flex w-1/2 relative items-end p-16 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            className="w-full h-full object-cover brightness-50"
            src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80"
            alt="Luxurious event setup"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 text-white max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <BrandLogo tamanho="xl" />
            <h1 className="font-headline font-extrabold text-4xl tracking-tight">{nomeFantasia}</h1>
          </div>
          <p className="font-headline text-2xl font-medium leading-tight">Transformando Sonhos em Celebrações.</p>
          <div className="mt-8 h-1 w-24 bg-primary rounded-full" />
        </div>
      </section>

      {/* Form Side */}
      <section className="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 sm:px-12 md:px-24 bg-surface">
        <div className="w-full max-w-md">
          {/* Mobile Branding */}
          <div className="lg:hidden flex flex-col items-center mb-12">
            <BrandLogo tamanho="lg" className="mb-4 shadow-xl shadow-primary/20" />
            <h2 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">{nomeFantasia}</h2>
          </div>

          {/* Welcome */}
          <div className="mb-10 text-center lg:text-left">
            <h3 className="font-headline text-3xl font-bold text-on-surface mb-2">Bem-vindo de volta</h3>
            <p className="text-on-surface-variant">Acesse sua conta para gerenciar seus eventos</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-2xl text-sm font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-lg">error</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-on-surface-variant ml-4" htmlFor="email">E-mail Corporativo</label>
              <div className="relative">
                <input
                  className="w-full h-14 pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-secondary transition-all placeholder:text-outline"
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">mail</span>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-on-surface-variant ml-4" htmlFor="password">Senha</label>
              <div className="relative">
                <input
                  className="w-full h-14 pl-12 pr-12 py-3 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-secondary transition-all placeholder:text-outline"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">lock</span>
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-tertiary transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <div className="flex justify-end px-4">
                <Link
                  to="/recuperar-senha"
                  className="text-xs font-semibold text-secondary hover:text-primary transition-colors"
                >
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 brand-gradient text-on-primary font-headline font-bold text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Login'}
            </button>
          </form>

          {/* Footer */}
          <footer className="mt-16 text-center">
            <p className="text-on-surface-variant text-sm flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-secondary text-sm filled">favorite</span>
              Design com excelência para eventos inesquecíveis
            </p>
          </footer>
        </div>
      </section>
    </main>
  );
}
