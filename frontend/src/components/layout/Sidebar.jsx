import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import BrandLogo from '../BrandLogo';
import { useTheme } from '../../contexts/ThemeContext';

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/clientes', icon: 'group', label: 'Clientes' },
  { to: '/funcionarios', icon: 'badge', label: 'Colaboradores' },
  { to: '/fornecedores', icon: 'local_shipping', label: 'Fornecedores' },
  { to: '/orcamentos', icon: 'request_quote', label: 'Orçamentos' },
  { to: '/eventos', icon: 'event_available', label: 'Eventos' },
  { to: '/estoque', icon: 'inventory_2', label: 'Estoque' },
  { to: '/documentos', icon: 'description', label: 'Documentos' },
  { to: '/catalogos', icon: 'menu_book', label: 'Catálogos' },
  { to: '/cadastros', icon: 'tune', label: 'Cadastros' },
  { to: '/usuarios', icon: 'admin_panel_settings', label: 'Usuários' },
];

export default function Sidebar({ isOpen, onClose }) {
  const nomeFantasia = useTheme()?.config?.nomeFantasia || 'Celebri';
  const { user } = useAuth();

  return (
    <>
      {/* Overlay para mobile: fundo escuro que fecha o menu ao clicar */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar com transição responsiva */}
      <aside
        className={`fixed left-0 top-0 h-screen z-40 w-64 border-r border-outline-variant/30 bg-surface flex flex-col justify-between transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
      >
        {/* Bloco Superior: Logo */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-4">
            <BrandLogo tamanho="md" className="shadow-sm" />
            <div>
              <h1 className="text-xl font-extrabold text-on-surface leading-none font-headline">{nomeFantasia}</h1>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/70 mt-1">Celebri</p>
            </div>
          </div>
        </div>

        {/* Bloco Central: Nav Items com Rolagem se faltar tela */}
        <nav className="flex-1 overflow-y-auto px-6 py-2 space-y-1 custom-scrollbar">
          {navItems.filter(item => !['/usuarios', '/cadastros'].includes(item.to) || user?.role === 'gerente').map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={onClose} // Fecha o menu no mobile ao clicar em um link
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-full transition-all text-sm font-medium ${isActive
                  ? 'bg-primary text-on-primary font-bold shadow-md shadow-primary/20'
                  : 'text-on-surface-variant hover:bg-primary/10'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`material-symbols-outlined ${isActive ? 'filled' : ''}`}>{icon}</span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bloco Inferior: User Profile */}
        <div className="p-6 border-t border-outline-variant/30 bg-surface">
          <div className="flex items-center gap-3 p-2.5 bg-surface-container rounded-full">
            <div className="w-10 h-10 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center font-bold text-xs shrink-0">
              {(user?.nome || 'Admin').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-on-surface truncate">{user?.nome || 'Admin'}</p>
              <p className="text-xs text-on-surface-variant truncate capitalize">{user?.role || 'admin'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}