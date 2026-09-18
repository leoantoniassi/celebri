import { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { derivarPaleta, contraste, ehHexValido, PALETA_PADRAO } from '../../utils/theme';
import Toast from '../../components/Toast';
import BrandLogo from '../../components/BrandLogo';

/* ─── Cores base configuráveis ──────────────────────────────── */
const CAMPOS_COR = [
  {
    chave: 'primaria',
    label: 'Cor primária',
    descricao: 'Botões de ação, item ativo do menu e destaques. É a cor que mais aparece.',
  },
  {
    chave: 'secundaria',
    label: 'Cor secundária',
    descricao: 'Confirmações, links e detalhes de apoio.',
  },
  {
    chave: 'terciaria',
    label: 'Cor terciária',
    descricao: 'Ícones e acentos pontuais.',
  },
];

/* Amostras de token que valem a pena mostrar no preview. */
const AMOSTRAS = [
  { token: 'primary', sobre: 'on-primary', label: 'Primária' },
  { token: 'secondary', sobre: 'on-secondary', label: 'Secundária' },
  { token: 'tertiary', sobre: 'on-tertiary', label: 'Terciária' },
  { token: 'primary-container', sobre: 'on-primary-container', label: 'Container' },
  { token: 'surface-container', sobre: 'on-surface', label: 'Superfície' },
  { token: 'chart-1', sobre: 'surface', label: 'Gráficos' },
];

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const { config, modoEscuro, toggleModoEscuro, atualizarConfig, aplicarPreview, descartarPreview } = useTheme();

  const ehGerente = user?.role === 'gerente';

  const [form, setForm] = useState({ nomeFantasia: '', logoUrl: '', cores: PALETA_PADRAO });
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);

  // Sincroniza o formulário quando a config do tenant chega ou muda.
  useEffect(() => {
    if (!config) return;
    setForm({
      nomeFantasia: config.nomeFantasia || '',
      logoUrl: config.logoUrl || '',
      cores: { ...PALETA_PADRAO, ...config.cores },
    });
  }, [config]);

  // Ao sair da tela, descarta qualquer preview não salvo.
  useEffect(() => () => descartarPreview(), [descartarPreview]);

  const alterarCor = useCallback((chave, valor) => {
    setForm((atual) => {
      const cores = { ...atual.cores, [chave]: valor };
      if (ehHexValido(valor)) aplicarPreview(cores);
      return { ...atual, cores };
    });
  }, [aplicarPreview]);

  const restaurarPadrao = () => {
    setForm((atual) => ({ ...atual, cores: PALETA_PADRAO }));
    aplicarPreview(PALETA_PADRAO);
  };

  const cancelar = () => {
    descartarPreview();
    setForm({
      nomeFantasia: config?.nomeFantasia || '',
      logoUrl: config?.logoUrl || '',
      cores: { ...PALETA_PADRAO, ...config?.cores },
    });
  };

  const salvar = async (e) => {
    e.preventDefault();
    if (!ehGerente) return;

    const invalida = CAMPOS_COR.find(({ chave }) => !ehHexValido(form.cores[chave]));
    if (invalida) {
      setToast({ type: 'error', message: `${invalida.label} inválida. Use o formato #RRGGBB.` });
      return;
    }
    if (!form.nomeFantasia.trim()) {
      setToast({ type: 'error', message: 'Informe o nome fantasia.' });
      return;
    }

    setSalvando(true);
    try {
      let urlTratada = form.logoUrl.trim();
      if (urlTratada && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(urlTratada) && !/^\/\//.test(urlTratada)) {
        urlTratada = `https://${urlTratada}`;
      }

      const { data } = await api.put('/tenant/config', {
        nomeFantasia: form.nomeFantasia.trim(),
        logoUrl: urlTratada || null,
        cores: form.cores,
      });
      atualizarConfig(data.data);
      setToast({ type: 'success', message: 'Identidade visual atualizada!' });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.response?.data?.message || 'Não foi possível salvar.',
      });
    } finally {
      setSalvando(false);
    }
  };

  // Paleta derivada das cores em edição — alimenta o preview e o aviso
  // de contraste, sem depender do que já foi salvo.
  const paleta = derivarPaleta(form.cores, { escuro: modoEscuro });
  const alterado =
    form.nomeFantasia !== (config?.nomeFantasia || '') ||
    form.logoUrl !== (config?.logoUrl || '') ||
    CAMPOS_COR.some(({ chave }) => form.cores[chave] !== config?.cores?.[chave]);

  return (
    <div>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-extrabold text-on-surface tracking-tight font-headline">Configurações</h2>
          <p className="text-on-surface-variant font-medium">
            Gerencie preferências de exibição e identidade visual do sistema.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── Coluna esquerda ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Seção: Aparência (Modo Escuro) — Disponível para QUALQUER usuário */}
          <section className="bg-surface p-6 rounded-3xl editorial-shadow border border-outline-variant/10">
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">Aparência</h3>
            <p className="text-xs text-on-surface-variant mb-6">
              Ajuste o tema de exibição de acordo com sua preferência individual.
            </p>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant/20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">
                    {modoEscuro ? "dark_mode" : "light_mode"}
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-on-surface text-base">Modo Escuro</h4>
                  <p className="text-xs text-on-surface-variant">
                    {modoEscuro
                      ? "O tema escuro está ativado para economizar energia e reduzir o cansaço visual."
                      : "O tema claro está ativado com superfícies limpas e iluminadas."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleModoEscuro}
                id="btn-config-modo-escuro"
                aria-pressed={modoEscuro}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  modoEscuro ? "bg-primary" : "bg-outline-variant/60"
                }`}
              >
                <span className="sr-only">Alternar modo escuro</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-surface shadow-md ring-0 transition duration-200 ease-in-out ${
                    modoEscuro ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Seção: Identidade Visual (Marca e Cores) — Exclusivo para Gerente */}
          {ehGerente ? (
            <form onSubmit={salvar} className="space-y-6">
              {/* Marca */}
              <section className="bg-surface p-6 rounded-3xl editorial-shadow border border-outline-variant/10">
                <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">Marca</h3>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-on-surface-variant ml-4" htmlFor="nomeFantasia">
                      Nome fantasia
                    </label>
                    <input
                      id="nomeFantasia"
                      type="text"
                      maxLength={150}
                      className="w-full h-14 px-5 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-secondary transition-all placeholder:text-outline"
                      placeholder="Nome do seu buffet"
                      value={form.nomeFantasia}
                      onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-on-surface-variant ml-4" htmlFor="logoUrl">
                      URL da logo <span className="font-normal text-outline">(opcional)</span>
                    </label>
                    <input
                      id="logoUrl"
                      type="text"
                      maxLength={2048}
                      className="w-full h-14 px-5 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-secondary transition-all placeholder:text-outline"
                      placeholder="https://seusite.com.br/logo.png"
                      value={form.logoUrl}
                      onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                    />
                    <p className="text-xs text-on-surface-variant ml-4">
                      Sem logo, o sistema usa o ícone padrão sobre a cor primária.
                    </p>
                  </div>
                </div>
              </section>

              {/* Cores */}
              <section className="bg-surface p-6 rounded-3xl editorial-shadow border border-outline-variant/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Cores base</h3>
                  <button
                    type="button"
                    onClick={restaurarPadrao}
                    className="text-xs font-semibold text-secondary hover:text-primary transition-colors"
                  >
                    Restaurar padrão
                  </button>
                </div>

                <div className="space-y-5">
                  {CAMPOS_COR.map(({ chave, label, descricao }) => {
                    const valor = form.cores[chave] || '';
                    const valida = ehHexValido(valor);
                    return (
                      <div key={chave} className="flex items-start gap-4">
                        <input
                          type="color"
                          aria-label={label}
                          value={valida ? valor : '#000000'}
                          onChange={(e) => alterarCor(chave, e.target.value.toUpperCase())}
                          className="w-14 h-14 rounded-2xl border border-outline-variant cursor-pointer shrink-0 bg-surface-container-low"
                        />
                        <div className="flex-1 space-y-1">
                          <label className="block text-sm font-semibold text-on-surface">{label}</label>
                          <p className="text-xs text-on-surface-variant">{descricao}</p>
                          <input
                            type="text"
                            value={valor}
                            onChange={(e) => alterarCor(chave, e.target.value.toUpperCase())}
                            className={`mt-1 w-36 h-10 px-4 font-mono text-sm bg-surface-container-low border-none rounded-full focus:ring-2 transition-all ${
                              valida ? 'focus:ring-secondary' : 'ring-2 ring-error'
                            }`}
                            placeholder="#RRGGBB"
                          />
                          {!valida && valor && (
                            <p className="text-xs text-error mt-1">Use o formato #RRGGBB.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-info-container text-on-info-container rounded-2xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-xl shrink-0">verified</span>
                  <p className="text-xs">
                    Os outros ~40 tons do sistema — fundos, bordas e cores de texto — são calculados
                    a partir destas três, sempre com contraste suficiente para leitura. Não há como
                    escolher uma combinação que deixe a interface ilegível.
                  </p>
                </div>
              </section>
            </form>
          ) : (
            <div className="p-6 rounded-3xl bg-surface border border-outline-variant/10 text-on-surface-variant">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-xl text-secondary">info</span>
                <h4 className="font-bold text-on-surface text-sm">Personalização de Marca</h4>
              </div>
              <p className="text-xs">
                A personalização de logo, nome do buffet e paleta de cores corporativa é gerenciada exclusivamente por usuários com perfil de Gerente.
              </p>
            </div>
          )}
        </div>

        {/* ─── Coluna direita: preview (se gerente) ou card informativo ─── */}
        <aside className="space-y-6 lg:sticky lg:top-24 self-start">
          <section className="bg-surface p-6 rounded-3xl editorial-shadow border border-outline-variant/10">
            <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">Pré-visualização</h3>

            <div className="flex items-center gap-3 mb-6">
              <BrandLogo tamanho="md" logoUrl={form.logoUrl} nomeFantasia={form.nomeFantasia} />
              <div>
                <p className="font-headline font-extrabold text-on-surface leading-none">
                  {form.nomeFantasia || 'Seu Buffet'}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/70 mt-1">Celebri</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {AMOSTRAS.map(({ token, sobre, label }) => (
                <div
                  key={token}
                  className="rounded-xl p-3 text-xs font-semibold"
                  style={{ background: paleta[token], color: paleta[sobre] }}
                >
                  {label}
                  <span className="block font-mono font-normal opacity-70 mt-0.5">
                    {contraste(paleta[token], paleta[sobre]).toFixed(1)}:1
                  </span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-2xl bg-surface-container-low mb-4 border border-outline-variant/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-2">Exemplo nos Gráficos</span>
              <div className="flex items-end gap-1.5 h-10 px-1">
                {[paleta['chart-1'], paleta['chart-2'], paleta['chart-3'], paleta.secondary, paleta.tertiary, paleta.primary].map((cor, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t transition-all duration-300"
                    style={{
                      height: `${[40, 75, 55, 90, 65, 80][i]}%`,
                      backgroundColor: cor,
                    }}
                    title={`Cor ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            <button
              type="button"
              className="w-full h-12 brand-gradient text-on-primary font-headline font-bold rounded-full shadow-lg shadow-primary/20 mb-3"
            >
              Botão de ação
            </button>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold">
              <span className="material-symbols-outlined text-lg">dashboard</span>
              Item de menu ativo
            </div>
          </section>

          {/* Ações para Gerente */}
          {ehGerente && (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={salvar}
                disabled={salvando || !alterado}
                className="w-full h-14 brand-gradient text-on-primary font-headline font-bold text-lg rounded-full shadow-lg shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
              >
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
              {alterado && (
                <button
                  type="button"
                  onClick={cancelar}
                  className="w-full h-12 rounded-full font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Descartar
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
