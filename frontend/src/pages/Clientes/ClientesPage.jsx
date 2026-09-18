import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { validarCpfCnpj } from '../../utils/validators';
import { formatCpfCnpj } from '../../utils/formatters';
import Toast from '../../components/Toast';
import WhatsAppIcon from '../../components/WhatsAppIcon';
import useDeleteWithConfirm from '../../hooks/useDeleteWithConfirm';

export default function ClientesPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [clientes, setClientes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', telefoneResidencial: '', rgCpf: '' });
  const [toast, setToast] = useState(null);
  const { executeDelete } = useDeleteWithConfirm();

  // Estado do modal de envio de catálogo
  const [showCatModal, setShowCatModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [catalogos, setCatalogos] = useState([]);
  const [selectedCatalogo, setSelectedCatalogo] = useState(null);

  const fetchClientes = async () => {
    try {
      const { data: res } = await api.get('/clientes', { params: { page, limit: 10, busca: search } });
      const items = Array.isArray(res.data) ? res.data : (res.rows || []);
      setClientes(items);
      setTotal(res.pagination?.total || items.length);
    } catch {}
  };

  useEffect(() => { fetchClientes(); }, [page, search]);

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!validarCpfCnpj(form.rgCpf)) {
      await confirm('CPF ou CNPJ inválido!', { title: 'Erro', showCancel: false });
      return;
    }

    try {
      if (editing) {
        await api.put(`/clientes/${editing}`, form);
      } else {
        await api.post('/clientes', form);
      }
      setShowPanel(false);
      setEditing(null);
      setForm({ nome: '', email: '', telefone: '', telefoneResidencial: '', rgCpf: '' });
      fetchClientes();
    } catch (err) {
      if (err.response?.data?.action === 'reactivate') {
        const wantsReactivate = await confirm(err.response.data.message + ' Deseja reativá-lo?', { title: 'Cliente Desativado', showCancel: true, confirmText: 'Reativar' });
        if (wantsReactivate) {
          try {
            await api.post(`/clientes/${err.response.data.clienteId}/reativar`);
            setToast({ type: 'success', message: 'Cliente reativado com sucesso!' });
            setShowPanel(false);
            setEditing(null);
            setForm({ nome: '', email: '', telefone: '', telefoneResidencial: '', rgCpf: '' });
            fetchClientes();
          } catch (reactivateErr) {
            await confirm(reactivateErr.response?.data?.message || 'Erro ao reativar cliente', { title: 'Erro', showCancel: false });
          }
        }
      } else {
        await confirm(err.response?.data?.message || 'Erro ao salvar', { title: 'Erro', showCancel: false });
      }
    }
  };

  const handleEdit = (c) => {
    setForm({ nome: c.nome, email: c.email || '', telefone: c.telefone, telefoneResidencial: c.telefoneResidencial || '', rgCpf: c.rgCpf });
    setEditing(c.id);
    setShowPanel(true);
  };

  const handleDelete = async (id) => {
    const toast = await executeDelete(id, '/clientes', 'Cliente', fetchClientes);
    if (toast) setToast(toast);
  };

  const handleWhatsApp = async (id) => {
    try {
      const { data: res } = await api.get(`/clientes/${id}/whatsapp`);
      window.open(res.data?.link || res.url, '_blank');
    } catch {}
  };

  // Abre o modal de catálogo e busca a lista
  const openCatModal = async (cliente) => {
    setSelectedCliente(cliente);
    setSelectedCatalogo(null);
    try {
      const { data: res } = await api.get('/catalogos');
      setCatalogos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCatalogos([]);
    }
    setShowCatModal(true);
  };

  // Gera o link do WhatsApp com a mensagem do catálogo
  const handleEnviarCatalogo = () => {
    if (!selectedCatalogo) return;

    const phone = (selectedCliente.telefone || '').replace(/\D/g, '');
    const nome = selectedCliente.nome?.split(' ')[0] || selectedCliente.nome;

    let msg = `Ola ${nome}! Segue nossa opcao de buffet:\n\n${selectedCatalogo.titulo}`;
    if (selectedCatalogo.descricao) msg += `\n${selectedCatalogo.descricao}`;
    if (selectedCatalogo.precoBase) {
      const preco = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedCatalogo.precoBase);
      msg += `\n\nA partir de ${preco}`;
    }
    if (selectedCatalogo.urlExterna && selectedCatalogo.urlExterna.startsWith('http')) {
      msg += `\n\nConfira aqui: ${selectedCatalogo.urlExterna}`;
    }
    msg += '\n\nQualquer duvida, estamos a disposicao!';

    const link = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
    window.open(link, '_blank');
    setShowCatModal(false);
  };

  const initials = (name) => (name || 'NA').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div>
      {/* Header */}
      <section className="px-2 pb-6">
        <div className="flex justify-between items-end mb-10">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight mb-2">Clientes</h2>
            <p className="text-on-surface-variant">Gerencie os organizadores de eventos e parceiros corporativos.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setForm({ nome: '', email: '', telefone: '', telefoneResidencial: '', rgCpf: '' }); setShowPanel(true); }}
            className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span>Novo Cliente</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface p-6 rounded-xl border border-outline-variant/10 editorial-shadow">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total Ativos</p>
            <p className="text-3xl font-headline font-extrabold text-tertiary">{total}</p>
          </div>
          <div className="md:col-span-2 bg-surface p-6 rounded-xl border border-outline-variant/10 editorial-shadow">
            <input
              className="w-full bg-surface-container-low border-none rounded-full py-3 px-6 focus:ring-2 focus:ring-primary transition-all placeholder:text-on-surface-variant/60 text-sm"
              placeholder="Pesquisar clientes por nome ou email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface rounded-xl editorial-shadow overflow-hidden border border-outline-variant/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container text-on-surface-variant text-xs uppercase tracking-[0.15em] font-bold">
                  <th className="px-6 py-5">Nome &amp; Email</th>
                  <th className="px-6 py-5">CPF/CNPJ</th>
                  <th className="px-6 py-5">Telefone</th>
                  <th className="px-6 py-5">Tel. Residencial</th>
                  <th className="px-6 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {clientes.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">Nenhum cliente encontrado.</td></tr>
                )}
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 text-on-primary-container flex items-center justify-center font-bold text-sm">
                          {initials(c.nome)}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface">{c.nome}</p>
                          <p className="text-xs text-on-surface-variant">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant font-mono">{formatCpfCnpj(c.rgCpf)}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{c.telefone}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{c.telefoneResidencial || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleWhatsApp(c.id)} className="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:scale-110 transition-all shadow-md shadow-secondary/20" title="WhatsApp">
                          <WhatsAppIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => openCatModal(c)} className="w-9 h-9 rounded-full bg-primary/20 text-on-surface flex items-center justify-center hover:bg-primary hover:text-on-primary hover:scale-110 transition-all shadow-md shadow-primary/10" title="Enviar Catálogo">
                          <span className="material-symbols-outlined text-lg">menu_book</span>
                        </button>
                        <button onClick={() => handleEdit(c)} className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center hover:bg-primary/20 transition-all">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        {user?.role !== 'operador' && (
                          <button onClick={() => handleDelete(c.id)} className="w-9 h-9 rounded-full bg-error-container/20 text-error flex items-center justify-center hover:bg-error hover:text-on-error transition-all">
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
            <p>Mostrando {clientes.length} de {total} registros</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <span className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-on-primary font-bold shadow-sm">{page}</span>
              <button onClick={() => setPage(page + 1)} disabled={clientes.length < 10} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-highest transition-colors disabled:opacity-30">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Slide-over Panel — Cadastro/Edição de Cliente */}
      {showPanel && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex justify-end fade-in" onClick={() => setShowPanel(false)}>
          <div className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col slide-in-right rounded-l-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-headline font-extrabold text-on-surface">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <p className="text-sm text-on-surface-variant mt-1">Preencha os dados do cliente.</p>
              </div>
              <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <form id="client-form" className="space-y-6" onSubmit={handleSave}>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Nome Completo</label>
                  <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all" placeholder="Ex: Maria Silva" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Email <span className="lowercase font-normal text-on-surface-variant/60">(opcional)</span></label>
                    <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all" type="email" placeholder="email@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Celular</label>
                    <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all" placeholder="(11) 98765-4321" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Tel. Residencial <span className="lowercase font-normal text-on-surface-variant/60">(opcional)</span></label>
                    <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all" placeholder="(11) 3333-3333" value={form.telefoneResidencial} onChange={(e) => setForm({ ...form, telefoneResidencial: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">CPF/CNPJ</label>
                  <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all" placeholder="000.000.000-00" value={form.rgCpf} onChange={(e) => { const raw = e.target.value; const digits = raw.replace(/\D/g, ''); if (digits.length > 14) return; setForm({ ...form, rgCpf: formatCpfCnpj(digits) }); }} required />
                </div>
              </form>
            </div>
            <div className="p-8 bg-surface-container-low flex gap-4 rounded-tl-3xl">
              <button onClick={() => setShowPanel(false)} className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3.5 rounded-full font-bold hover:bg-surface transition-all">Cancelar</button>
              <button type="submit" form="client-form" className="flex-[2] bg-primary text-on-primary py-3.5 rounded-full font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Enviar Catálogo por WhatsApp */}
      {showCatModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex items-center justify-center fade-in px-4" onClick={() => setShowCatModal(false)}>
          <div className="w-full max-w-md bg-surface rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-7 border-b border-outline-variant/30 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-headline font-extrabold text-on-surface">Enviar Catálogo</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Para: <span className="font-bold text-on-surface">{selectedCliente?.nome}</span>
                </p>
              </div>
              <button onClick={() => setShowCatModal(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Lista de Catálogos */}
            <div className="p-6 max-h-80 overflow-y-auto space-y-3">
              {catalogos.length === 0 && (
                <div className="text-center py-8 text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl text-outline/30 block mb-2">menu_book</span>
                  <p className="text-sm">Nenhum catálogo cadastrado.</p>
                  <p className="text-xs mt-1">Cadastre catálogos na seção <span className="font-bold">Catálogos</span>.</p>
                </div>
              )}
              {catalogos.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatalogo(cat)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                    selectedCatalogo?.id === cat.id
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant/30 hover:border-primary/40 hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${selectedCatalogo?.id === cat.id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-lg">menu_book</span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-on-surface text-sm truncate">{cat.titulo}</p>
                      {cat.precoBase && (
                        <p className="text-xs text-tertiary font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.precoBase)}
                        </p>
                      )}
                    </div>
                    {selectedCatalogo?.id === cat.id && (
                      <span className="material-symbols-outlined text-primary ml-auto">check_circle</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Prévia da mensagem */}
            {selectedCatalogo && (
              <div className="px-6 pb-4">
                <div className="bg-surface-container-low rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Prévia da mensagem</p>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Olá {selectedCliente?.nome?.split(' ')[0]}! 🎉 Segue nossa opção de buffet:{' '}
                    <strong>{selectedCatalogo.titulo}</strong>
                    {selectedCatalogo.urlExterna ? ' 🔗 Com link' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="p-6 pt-2 flex gap-3">
              <button onClick={() => setShowCatModal(false)} className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3 rounded-full font-bold hover:bg-surface-container transition-all text-sm">
                Cancelar
              </button>
              <button
                onClick={handleEnviarCatalogo}
                disabled={!selectedCatalogo}
                className="flex-[2] bg-secondary text-on-secondary py-3 rounded-full font-bold shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <WhatsAppIcon className="w-5 h-5" />
                Enviar via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
