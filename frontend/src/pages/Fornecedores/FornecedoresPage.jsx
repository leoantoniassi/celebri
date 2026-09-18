import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { validarCpfCnpj } from '../../utils/validators';
import { formatCpfCnpj } from '../../utils/formatters';
import WhatsAppIcon from '../../components/WhatsAppIcon';

export default function FornecedoresPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [fornecedores, setFornecedores] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', cnpj: '', categoriaId: '' });
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    api.get('/lookup/categorias-fornecedor')
      .then(r => {
        const items = Array.isArray(r.data.data) ? r.data.data : [];
        setCategorias(items);
      })
      .catch(() => {});
  }, []);

  const fetchFornecedores = async () => {
    try {
      const params = { page, limit: 10, busca: search };
      if (categoriaFiltro) params.categoriaId = categoriaFiltro;
      const { data: res } = await api.get('/fornecedores', { params });
      const items = Array.isArray(res.data) ? res.data : (res.rows || []);
      setFornecedores(items);
      setTotal(res.pagination?.total || items.length);
    } catch {}
  };

  useEffect(() => { fetchFornecedores(); }, [page, search, categoriaFiltro]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validarCpfCnpj(form.cnpj)) {
      await confirm('CNPJ inválido!', { title: 'Atenção', showCancel: false });
      return;
    }
    try {
      if (editing) {
        await api.put(`/fornecedores/${editing}`, form);
      } else {
        await api.post('/fornecedores', form);
      }
      setShowPanel(false);
      setEditing(null);
      setForm({ nome: '', email: '', telefone: '', cnpj: '', categoriaId: '' });
      fetchFornecedores();
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao salvar', { title: 'Erro', showCancel: false });
    }
  };

  const handleEdit = (f) => {
    setForm({ nome: f.nome, email: f.email, telefone: f.telefone, cnpj: f.cnpj, categoriaId: f.categoriaId || f.categoria?.id || '' });
    setEditing(f.id);
    setShowPanel(true);
  };

  const handleDelete = async (id) => {
    if (!(await confirm('Deseja realmente excluir este fornecedor?'))) return;
    try {
      await api.delete(`/fornecedores/${id}`);
      fetchFornecedores();
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao excluir', { title: 'Erro', showCancel: false });
    }
  };

  const handleWhatsApp = async (id) => {
    try {
      const { data: res } = await api.get(`/fornecedores/${id}/whatsapp`);
      window.open(res.data?.link || res.url, '_blank');
    } catch {}
  };

  const initials = (name) => (name || 'NA').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const categoriaBadgeColor = (catName) => {
    const map = {
      'Alimentos':   'bg-green-100 text-green-700',
      'Bebidas':     'bg-blue-100 text-blue-700',
      'Decoração':   'bg-pink-100 text-pink-700',
      'Mobiliário':  'bg-orange-100 text-orange-700',
      'Audiovisual': 'bg-purple-100 text-purple-700',
      'Limpeza':     'bg-cyan-100 text-cyan-700',
      'Segurança':   'bg-red-100 text-red-700',
    };
    return map[catName] || 'bg-surface-container text-on-surface-variant';
  };

  return (
    <div>
      {/* Header */}
      <section className="px-2 pb-6">
        <div className="flex justify-between items-end mb-10">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight mb-2">Fornecedores</h2>
            <p className="text-on-surface-variant">Gerencie os fornecedores de produtos e serviços para os eventos.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setForm({ nome: '', email: '', telefone: '', cnpj: '', categoriaId: '' }); setShowPanel(true); }}
            className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>Novo Fornecedor</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface p-6 rounded-xl border border-outline-variant/10 editorial-shadow">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Cadastrados</p>
            <p className="text-3xl font-headline font-extrabold text-tertiary">{total}</p>
          </div>
          <div className="md:col-span-2 bg-surface p-6 rounded-xl border border-outline-variant/10 editorial-shadow">
            <input
              className="w-full bg-surface-container-low border-none rounded-full py-3 px-6 focus:ring-2 focus:ring-primary transition-all placeholder:text-on-surface-variant/60 text-sm"
              placeholder="Pesquisar fornecedores por nome, email ou CNPJ..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="bg-surface p-6 rounded-xl border border-outline-variant/10 editorial-shadow">
            <select
              className="w-full bg-surface-container-low border-none rounded-full py-3 px-4 focus:ring-2 focus:ring-primary transition-all text-sm appearance-none"
              value={categoriaFiltro}
              onChange={(e) => { setCategoriaFiltro(e.target.value); setPage(1); }}
            >
              <option value="">Todas as categorias</option>
              {categorias.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.nome}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface rounded-xl editorial-shadow overflow-hidden border border-outline-variant/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant text-xs uppercase tracking-[0.15em] font-bold">
                  <th className="px-6 py-5">Nome & Email</th>
                  <th className="px-6 py-5">CNPJ</th>
                  <th className="px-6 py-5">Telefone</th>
                  <th className="px-6 py-5">Categoria</th>
                  <th className="px-6 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {fornecedores.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">Nenhum fornecedor encontrado.</td></tr>
                )}
                {fornecedores.map((f) => (
                  <tr key={f.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-on-primary-container flex items-center justify-center font-bold text-sm">
                          {initials(f.nome)}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{f.nome}</p>
                          <p className="text-xs text-on-surface-variant">{f.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant font-mono">{formatCpfCnpj(f.cnpj)}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{f.telefone}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${categoriaBadgeColor(f.categoria?.nome)}`}>
                        {f.categoria?.nome || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleWhatsApp(f.id)} className="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:scale-110 transition-all shadow-md shadow-secondary/20" title="WhatsApp">
                          <WhatsAppIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleEdit(f)} className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center hover:bg-primary/20 transition-all" title="Editar">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        {user?.role !== 'operador' && (
                          <button onClick={() => handleDelete(f.id)} className="w-9 h-9 rounded-full bg-error-container/20 text-error flex items-center justify-center hover:bg-error hover:text-on-error transition-all" title="Excluir">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-surface-container-low text-xs font-bold text-on-surface-variant flex items-center justify-between border-t border-outline-variant/10">
            <p>Mostrando {fornecedores.length} de {total} registros</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <span className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-on-primary font-bold shadow-sm">{page}</span>
              <button onClick={() => setPage(page + 1)} disabled={fornecedores.length < 10} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Slide-over Panel — Cadastro/Edição de Fornecedor */}
      {showPanel && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex justify-end fade-in" onClick={() => setShowPanel(false)}>
          <div className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col slide-in-right rounded-l-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-headline font-extrabold text-on-surface">{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
                <p className="text-sm text-on-surface-variant mt-1">Preencha os dados do fornecedor.</p>
              </div>
              <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <form id="supplier-form" className="space-y-6" onSubmit={handleSave}>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Nome / Razão Social</label>
                  <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all" placeholder="Ex: Doces & Bolos Ltda" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Email</label>
                    <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all" type="email" placeholder="email@empresa.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Telefone</label>
                    <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all" placeholder="(11) 3333-4444" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">CNPJ</label>
                  <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all" placeholder="00.000.000/0001-00" value={form.cnpj} onChange={(e) => { const raw = e.target.value; const digits = raw.replace(/\D/g, ''); if (digits.length > 14) return; setForm({ ...form, cnpj: formatCpfCnpj(digits) }); }} required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Categoria</label>
                  <select
                    className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={form.categoriaId}
                    onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                    required
                  >
                    <option value="" disabled>Selecione uma categoria...</option>
                    {categorias.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.nome}</option>
                    ))}
                  </select>
                </div>
              </form>
            </div>
            <div className="p-8 bg-surface-container-low flex gap-4 rounded-tl-3xl">
              <button onClick={() => setShowPanel(false)} className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3.5 rounded-full font-bold hover:bg-surface transition-all">Cancelar</button>
              <button type="submit" form="supplier-form" className="flex-[2] bg-primary text-on-primary py-3.5 rounded-full font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
