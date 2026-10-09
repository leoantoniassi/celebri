import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { urlHttpValida } from '../../utils/validators';

export default function CatalogosPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [catalogos, setCatalogos] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ titulo: '', descricao: '', precoBase: '', urlExterna: '' });
  const [saving, setSaving] = useState(false);

  const fetchCatalogos = async () => {
    try {
      const { data: res } = await api.get('/catalogos');
      setCatalogos(Array.isArray(res.data) ? res.data : []);
    } catch {}
  };

  useEffect(() => { fetchCatalogos(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ titulo: '', descricao: '', precoBase: '', urlExterna: '' });
    setShowPanel(true);
  };

  const openEdit = (c) => {
    setEditing(c.id);
    setForm({
      titulo: c.titulo || '',
      descricao: c.descricao || '',
      precoBase: c.precoBase || '',
      urlExterna: c.urlExterna || '',
    });
    setShowPanel(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!urlHttpValida(form.urlExterna)) {
      await confirm('O link do catálogo deve começar com http:// ou https://.', { title: 'Link inválido', showCancel: false });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        precoBase: form.precoBase,
        urlExterna: form.urlExterna.trim(),
      };

      if (editing) {
        await api.put(`/catalogos/${editing}`, payload);
      } else {
        await api.post('/catalogos', payload);
      }

      setShowPanel(false);
      fetchCatalogos();
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao salvar catálogo', { title: 'Erro', showCancel: false });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirm('Deseja realmente excluir este catálogo?'))) return;
    try {
      await api.delete(`/catalogos/${id}`);
      fetchCatalogos();
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao excluir', { title: 'Erro', showCancel: false });
    }
  };

  const formatPrice = (val) => {
    if (!val) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div>
      {/* Header */}
      <section className="px-2 pb-6">
        <div className="flex justify-between items-end mb-10">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight mb-2">Catálogos</h2>
            <p className="text-on-surface-variant">Gerencie os catálogos de buffet e envie para seus clientes via WhatsApp.</p>
          </div>
          <button
            onClick={openNew}
            className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>Novo Catálogo</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface p-6 rounded-xl border border-outline-variant/10 editorial-shadow">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total de Catálogos</p>
            <p className="text-3xl font-headline font-extrabold text-tertiary">{catalogos.length}</p>
          </div>
          <div className="bg-surface p-6 rounded-xl border border-outline-variant/10 editorial-shadow">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Ativos</p>
            <p className="text-3xl font-headline font-extrabold text-primary">{catalogos.filter(c => c.ativo).length}</p>
          </div>
          <div className="bg-surface p-6 rounded-xl border border-outline-variant/10 editorial-shadow flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface filled">menu_book</span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Com Link Externo</p>
              <p className="text-3xl font-headline font-extrabold text-secondary">{catalogos.filter(c => c.urlExterna).length}</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface rounded-xl editorial-shadow overflow-hidden border border-outline-variant/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant text-xs uppercase tracking-[0.15em] font-bold">
                  <th className="px-6 py-5">Título</th>
                  <th className="px-6 py-5">Descrição</th>
                  <th className="px-6 py-5">Preço Base</th>
                  <th className="px-6 py-5">Link</th>
                  <th className="px-6 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {catalogos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-5xl text-outline/30 block mb-4">menu_book</span>
                      Nenhum catálogo cadastrado ainda.
                    </td>
                  </tr>
                )}
                {catalogos.map((c) => (
                  <tr key={c.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-on-primary-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-lg">menu_book</span>
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{c.titulo}</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${c.ativo ? 'bg-primary/20 text-on-surface' : 'bg-error/10 text-error'}`}>
                            {c.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant max-w-xs">
                      <p className="truncate max-w-[220px]">{c.descricao || '—'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-tertiary">{formatPrice(c.precoBase)}</td>
                    <td className="px-6 py-4">
                      {c.urlExterna && urlHttpValida(c.urlExterna) ? (
                        <a href={c.urlExterna} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-primary underline flex items-center gap-1 hover:text-tertiary transition-colors">
                          <span className="material-symbols-outlined text-sm">link</span>
                          Ver link
                        </a>
                      ) : <span className="text-xs text-on-surface-variant/50">—</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEdit(c)} className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center hover:bg-primary/20 transition-all" title="Editar">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        {user?.role !== 'operador' && (
                          <button onClick={() => handleDelete(c.id)} className="w-9 h-9 rounded-full bg-error-container/20 text-error flex items-center justify-center hover:bg-error hover:text-on-error transition-all" title="Excluir">
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
          <div className="px-6 py-4 bg-surface-container-low text-xs font-bold text-on-surface-variant border-t border-outline-variant/10">
            <p>{catalogos.length} catálogo(s) cadastrado(s)</p>
          </div>
        </div>
      </section>

      {/* Slide-over Panel */}
      {showPanel && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex justify-end fade-in" onClick={() => setShowPanel(false)}>
          <div className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col slide-in-right rounded-l-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-headline font-extrabold text-on-surface">{editing ? 'Editar Catálogo' : 'Novo Catálogo'}</h3>
                <p className="text-sm text-on-surface-variant mt-1">Preencha as informações do catálogo de buffet.</p>
              </div>
              <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <form id="catalogo-form" className="space-y-6" onSubmit={handleSave}>
                {/* Título */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Título *</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all"
                    placeholder="Ex: Buffet Infantil Completo"
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    required
                  />
                </div>

                {/* Descrição */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Descrição</label>
                  <textarea
                    className="w-full bg-surface-container-low border-none rounded-2xl py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all resize-none"
                    placeholder="Descreva o que está incluso no buffet..."
                    rows={3}
                    value={form.descricao}
                    onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  />
                </div>

                {/* Preço Base */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Preço Base (R$)</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all"
                    type="number"
                    placeholder="0,00"
                    step="0.01"
                    min="0"
                    value={form.precoBase}
                    onChange={(e) => setForm({ ...form, precoBase: e.target.value })}
                  />
                </div>

                {/* URL / Caminho */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Link do Catálogo</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all"
                    type="text" inputMode="url"
                    placeholder="https://drive.google.com/..."
                    value={form.urlExterna}
                    onChange={(e) => setForm({ ...form, urlExterna: e.target.value })}
                  />
                  <p className="text-[11px] text-on-surface-variant px-4">Informe o link público do catálogo (deve começar com http:// ou https://).</p>
                </div>

              </form>
            </div>

            <div className="p-8 bg-surface-container-low flex gap-4 rounded-tl-3xl">
              <button onClick={() => setShowPanel(false)} className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3.5 rounded-full font-bold hover:bg-surface transition-all">
                Cancelar
              </button>
              <button type="submit" form="catalogo-form" disabled={saving} className="flex-[2] bg-primary text-on-primary py-3.5 rounded-full font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
