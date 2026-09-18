import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import BrandLogo from '../../components/BrandLogo';
import { useTheme } from '../../contexts/ThemeContext';

export default function RecuperarSenhaPage() {
  const nomeFantasia = useTheme()?.config?.nomeFantasia || 'Celebri';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/recuperar-senha', { email });
      setSucesso(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao processar a solicitação. Tente novamente.');
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
            src="https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=80"
            alt="Pessoas celebrando um evento festivo"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        </div>
        <div className="relative z-10 text-white max-w-lg">
          <div className="flex items-center gap-3 mb-6">
            <BrandLogo tamanho="xl" />
            <h1 className="font-headline font-extrabold text-4xl tracking-tight">{nomeFantasia}</h1>
          </div>
          <p className="font-headline text-2xl font-medium leading-tight">
            Tudo o que você precisa para gerenciar seus eventos em um só lugar.
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
                <span className="material-symbols-outlined text-5xl text-on-primary-container filled">mail</span>
              </div>
              <div>
                <h3 className="font-headline text-3xl font-bold text-on-surface mb-2">E-mail Enviado!</h3>
                <p className="text-on-surface-variant text-sm px-2">
                  Se o e-mail digitado estiver cadastrado no sistema, você receberá um link de recuperação válido por 1 hora.
                </p>
              </div>
              <div className="pt-4">
                <Link
                  id="btn-voltar-login-sucesso"
                  to="/login"
                  className="w-full h-14 bg-surface-container-high text-on-surface font-headline font-bold text-lg rounded-full flex items-center justify-center gap-2 hover:bg-surface-container-highest transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                  Voltar para o Login
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-10 text-center lg:text-left">
                <h3 className="font-headline text-3xl font-bold text-on-surface mb-2">Recuperar Senha</h3>
                <p className="text-on-surface-variant">
                  Insira o seu e-mail corporativo abaixo para receber as instruções de recuperação.
                </p>
              </div>

              {/* Erro */}
              {error && (
                <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-2xl text-sm font-medium flex items-start gap-2 animate-shake">
                  <span className="material-symbols-outlined text-error text-lg flex-shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Formulário */}
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* E-mail */}
                <div className="space-y-2">
                  <label
                    className="block text-sm font-semibold text-on-surface-variant ml-4"
                    htmlFor="email"
                  >
                    E-mail Corporativo
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full h-14 pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary transition-all placeholder:text-outline"
                    />
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-tertiary">
                      mail
                    </span>
                  </div>
                </div>

                {/* Botão Submit */}
                <button
                  id="btn-recuperar-senha"
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-14 brand-gradient text-on-primary font-headline font-bold text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-on-primary/40 border-t-on-primary rounded-full animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">send</span>
                      Enviar Link de Redefinição
                    </>
                  )}
                </button>
              </form>

              {/* Voltar para Login */}
              <div className="mt-8 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-secondary hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Voltar para o Login
                </Link>
              </div>

              {/* Footer */}
              <footer className="mt-16 text-center">
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
