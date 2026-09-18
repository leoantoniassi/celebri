import { useTheme } from '../contexts/ThemeContext';

// ============================================================
// Marca do tenant
// ============================================================
// Único lugar que decide como a identidade do buffet aparece. Antes o
// ícone `celebration` estava repetido em 9 pontos do código — trocar a
// logo exigia mexer em todos.
//
// Sem logo configurada, cai no ícone padrão dentro do círculo da cor
// primária, que é o visual que o sistema já tinha.
// ============================================================

const TAMANHOS = {
  sm: { caixa: 'w-8 h-8', icone: 'text-lg' },
  md: { caixa: 'w-10 h-10', icone: 'text-2xl' },
  lg: { caixa: 'w-12 h-12', icone: 'text-3xl' },
  xl: { caixa: 'w-16 h-16', icone: 'text-4xl' },
};

export default function BrandLogo({ tamanho = 'md', className = '' }) {
  const tema = useTheme();
  const config = tema?.config;
  const { caixa, icone } = TAMANHOS[tamanho] || TAMANHOS.md;
  const nome = config?.nomeFantasia || 'Celebri';

  if (config?.logoUrl) {
    return (
      <img
        src={config.logoUrl}
        alt={nome}
        className={`${caixa} rounded-full object-contain ${className}`}
      />
    );
  }

  return (
    <div
      className={`${caixa} rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 ${className}`}
      aria-label={nome}
    >
      <span className={`material-symbols-outlined filled ${icone}`}>celebration</span>
    </div>
  );
}

/** Nome fantasia do tenant, para títulos e cabeçalhos. */
export function BrandName({ className = '' }) {
  const tema = useTheme();
  return <span className={className}>{tema?.config?.nomeFantasia || 'Celebri'}</span>;
}
