import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { derivarPaleta, aplicarPaleta, PALETA_PADRAO } from '../utils/theme';

// ============================================================
// Identidade visual do tenant
// ============================================================
// Busca a marca do buffet em /api/tenant/config e injeta as cores como
// custom properties no :root. Como o index.css usa `@theme` do Tailwind
// v4 (e não `@theme inline`), as utilities compilam para var(--color-X)
// — então sobrescrever a variável em runtime retinge a interface inteira,
// inclusive os modificadores de opacidade tipo `bg-primary/20`.
// ============================================================

const CHAVE_CACHE = 'celebri:tenant';
const CHAVE_MODO_ESCURO = 'celebri:modo-escuro';

const ThemeContext = createContext(null);

const CONFIG_PADRAO = {
  nomeFantasia: 'Celebri',
  slug: null,
  logoUrl: null,
  cores: PALETA_PADRAO,
};

/** Lê a preferência salva de modo escuro (ou segue a preferência do sistema). */
export function lerPreferenciaModoEscuro() {
  try {
    const salvo = localStorage.getItem(CHAVE_MODO_ESCURO);
    if (salvo === 'dark') return true;
    if (salvo === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

/** Lê o cache gravado no último acesso. Usado para pintar antes da rede responder. */
export function lerCache() {
  try {
    const bruto = localStorage.getItem(CHAVE_CACHE);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

function gravarCache(config, paleta) {
  try {
    // A paleta derivada vai junto para que o script inline do index.html
    // possa repintar antes do primeiro paint, sem carregar este módulo.
    localStorage.setItem(CHAVE_CACHE, JSON.stringify({ ...config, paleta }));
  } catch {
    // Modo privado ou storage cheio: o tema ainda funciona, só sem cache.
  }
}

export function ThemeProvider({ children }) {
  const [modoEscuro, setModoEscuro] = useState(lerPreferenciaModoEscuro);
  const [config, setConfig] = useState(() => lerCache() || CONFIG_PADRAO);
  const [carregando, setCarregando] = useState(true);

  // Sincroniza a classe .dark no <html> e a paleta correspondente
  useEffect(() => {
    const raiz = document.documentElement;
    if (modoEscuro) {
      raiz.classList.add('dark');
      try {
        localStorage.setItem(CHAVE_MODO_ESCURO, 'dark');
      } catch {}
    } else {
      raiz.classList.remove('dark');
      try {
        localStorage.setItem(CHAVE_MODO_ESCURO, 'light');
      } catch {}
    }
    const paleta = derivarPaleta(config.cores, { escuro: modoEscuro });
    aplicarPaleta(paleta);
    gravarCache(config, paleta);
  }, [modoEscuro, config]);

  const aplicar = useCallback((cores, escuro = modoEscuro) => {
    const paleta = derivarPaleta(cores, { escuro });
    aplicarPaleta(paleta);
    return paleta;
  }, [modoEscuro]);

  const toggleModoEscuro = useCallback(() => {
    setModoEscuro((anterior) => !anterior);
  }, []);

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/tenant/config');
      const recebido = { ...CONFIG_PADRAO, ...data.data };
      setConfig(recebido);
      gravarCache(recebido, aplicar(recebido.cores, modoEscuro));
      return recebido;
    } catch {
      // Backend fora do ar ou empresa não resolvida: segue com o que
      // estiver em cache (ou com a paleta padrão). A tela de login não
      // pode ficar em branco por causa disso.
      return null;
    } finally {
      setCarregando(false);
    }
  }, [aplicar, modoEscuro]);

  useEffect(() => {
    // Pinta imediatamente com o cache, depois confirma com o servidor.
    aplicar(config.cores, modoEscuro);
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Aplica cores sem salvar — usado pelo preview ao vivo em /configuracoes. */
  const aplicarPreview = useCallback((cores) => {
    aplicar({ ...config.cores, ...cores }, modoEscuro);
  }, [aplicar, config.cores, modoEscuro]);

  /** Descarta o preview e volta para as cores salvas. */
  const descartarPreview = useCallback(() => {
    aplicar(config.cores, modoEscuro);
  }, [aplicar, config.cores, modoEscuro]);

  /** Chamado após salvar em /configuracoes, para propagar a mudança. */
  const atualizarConfig = useCallback((novaConfig) => {
    const mesclada = { ...CONFIG_PADRAO, ...novaConfig };
    setConfig(mesclada);
    gravarCache(mesclada, aplicar(mesclada.cores, modoEscuro));
  }, [aplicar, modoEscuro]);

  return (
    <ThemeContext.Provider
      value={{
        config,
        modoEscuro,
        toggleModoEscuro,
        carregando,
        recarregar: carregar,
        aplicarPreview,
        descartarPreview,
        atualizarConfig,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
