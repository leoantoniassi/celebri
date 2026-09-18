import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import Toast from '../../components/Toast';
import WhatsAppIcon from '../../components/WhatsAppIcon';
import useDeleteWithConfirm from '../../hooks/useDeleteWithConfirm';

export default function FuncionariosPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [funcionarios, setFuncionarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', telefoneResidencial: '', funcaoId: '' });
  const [funcoes, setFuncoes] = useState([]);
  const [toast, setToast] = useState(null);
  const { executeDelete } = useDeleteWithConfirm();

  const [selectedFuncionario, setSelectedFuncionario] = useState(null);
  const [detalhes, setDetalhes] = useState(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);

  useEffect(() => {
    api.get('/lookup/funcoes')
      .then(r => {
        const items = Array.isArray(r.data.data) ? r.data.data : [];
        setFuncoes(items);
      })
      .catch(() => {});
  }, []);

  const fetchData = async () => {
    try {
      const { data: res } = await api.get('/funcionarios', { params: { page, limit: 10, busca: search } });
      const items = Array.isArray(res.data) ? res.data : [];
      setFuncionarios(items);
      setTotal(res.pagination?.total || items.length);
    } catch {}
  };

  useEffect(() => { fetchData(); }, [page, search]);

  useEffect(() => {
    if (selectedFuncionario) {
      setLoadingDetalhes(true);
      api.get(`/funcionarios/${selectedFuncionario.id}/detalhes`)
        .then(r => setDetalhes(r.data.data))
        .catch(() => setDetalhes(null))
        .finally(() => setLoadingDetalhes(false));
    } else {
      setDetalhes(null);
    }
  }, [selectedFuncionario]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/funcionarios/${editing}`, form);
      else await api.post('/funcionarios', form);
      setShowPanel(false); setEditing(null); setForm({ nome: '', email: '', telefone: '', telefoneResidencial: '', funcaoId: '' }); fetchData();
    } catch (err) { await confirm(err.response?.data?.message || 'Erro ao salvar', { title: 'Erro', showCancel: false }); }
  };

  const handleEdit = (f) => { setForm({ nome: f.nome, email: f.email || '', telefone: f.telefone || '', telefoneResidencial: f.telefoneResidencial || '', funcaoId: f.funcaoId || f.funcao?.id || '' }); setEditing(f.id); setShowPanel(true); };
  const handleDelete = async (id) => {
    const toast = await executeDelete(id, '/funcionarios', 'Funcionário', fetchData);
    if (toast) {
      setToast(toast);
      if (selectedFuncionario?.id === id) setSelectedFuncionario(null);
    }
  };
  
  const handleWhatsApp = async (id) => {
    try {
      const { data: res } = await api.get(`/funcionarios/${id}/whatsapp`);
      window.open(res.data?.link || res.url, '_blank');
    } catch (err) {
      await confirm('Erro ao abrir o WhatsApp', { title: 'Erro', showCancel: false });
    }
  };

  const initials = (n) => (n || 'NA').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

  const funcaoColor = (f) => {
    const m = { Recreador: 'bg-secondary/20 text-secondary', 'Garçom': 'bg-tertiary/10 text-tertiary', Cozinheiro: 'bg-primary/20 text-on-primary', 'Segurança': 'bg-error-container/30 text-error' };
    return m[f] || 'bg-surface-container text-on-surface-variant';
  };

  const formatDate = (d) => {
    if (!d) return "";
    const date = new Date(d);
    return isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-extrabold text-on-surface tracking-tight font-headline">Colaboradores</h2>
          <p className="text-on-surface-variant font-medium">Gerencie sua equipe de festas e eventos.</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ nome: '', email: '', telefone: '', telefoneResidencial: '', funcaoId: '' }); setShowPanel(true); }} className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-full font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
          <span className="material-symbols-outlined">person_add</span> Novo Colaborador
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-12 lg:col-span-8 bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant/30">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold font-headline">Equipe Ativa</h3>
              <span className="bg-primary/10 text-primary font-bold px-3 py-1 rounded-full text-sm">{total}</span>
            </div>
            <input className="w-full sm:w-64 bg-surface-container-low border-none rounded-full py-2.5 px-5 focus:ring-2 focus:ring-primary text-sm outline-none" placeholder="Buscar colaborador..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px] border-collapse">
              <thead>
                <tr className="text-on-surface-variant text-xs uppercase tracking-widest font-bold border-b border-surface-container-high">
                  <th className="pb-4 px-4">Nome & Perfil</th>
                  <th className="pb-4 px-4">Contato</th>
                  <th className="pb-4 px-4">Tel. Residencial</th>
                  <th className="pb-4 px-4">Função</th>
                  <th className="pb-4 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {funcionarios.length === 0 && <tr><td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">Nenhum colaborador encontrado.</td></tr>}
                {funcionarios.map((f) => (
                  <tr key={f.id} className={`group hover:bg-surface-container-low transition-colors cursor-pointer ${selectedFuncionario?.id === f.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`} onClick={() => setSelectedFuncionario(f)}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-on-primary-container text-sm">{initials(f.nome)}</div>
                        <div><p className="font-bold text-sm text-on-surface">{f.nome}</p><p className="text-[11px] text-on-surface-variant">ID: #{String(f.id).slice(0, 8)}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><p className="text-sm font-medium text-on-surface">{f.email || '-'}</p><p className="text-xs text-on-surface-variant">{f.telefone || '-'}</p></td>
                    <td className="px-4 py-4 text-sm text-on-surface-variant">{f.telefoneResidencial || '-'}</td>
                    <td className="px-4 py-4"><span className={`px-2.5 py-0.5 ${funcaoColor(f.funcao?.nome)} text-[11px] font-bold rounded-full uppercase tracking-tight`}>{f.funcao?.nome || '—'}</span></td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={(e) => { e.stopPropagation(); handleWhatsApp(f.id); }} className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:scale-110 transition-all shadow-md shadow-secondary/20 mr-1" title="WhatsApp">
                          <WhatsAppIcon className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(f); }} className="p-1.5 text-on-surface-variant hover:text-primary rounded-full transition-colors"><span className="material-symbols-outlined text-lg">edit</span></button>
                        {user?.role !== 'operador' && (
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }} className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded-full"><span className="material-symbols-outlined text-lg">delete</span></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pt-4 mt-4 flex items-center justify-between border-t border-surface-container-high">
            <p className="text-xs text-on-surface-variant font-medium">Mostrando {funcionarios.length} de {total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-2 rounded-full bg-surface border border-surface-container-high hover:bg-primary/10 transition-colors disabled:opacity-30 flex items-center justify-center"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
              <button onClick={() => setPage(page + 1)} disabled={funcionarios.length < 10} className="p-2 rounded-full bg-surface border border-surface-container-high hover:bg-primary/10 transition-colors disabled:opacity-30 flex items-center justify-center"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
            </div>
          </div>
        </div>

        {/* Sidebar de Detalhes */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {selectedFuncionario ? (
            <div className="bg-tertiary text-on-tertiary p-6 rounded-2xl relative overflow-hidden shadow-xl">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-1">Detalhes</h3>
                <p className="text-sm opacity-80 mb-6">{selectedFuncionario.nome}</p>
                
                {loadingDetalhes ? (
                  <div className="flex items-center justify-center py-8">
                    <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
                  </div>
                ) : detalhes ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-white/20 pb-4">
                      <div>
                        <p className="text-xs uppercase tracking-widest opacity-80">Total de Eventos</p>
                        <p className="text-3xl font-black">{detalhes.totalEventos || 0}</p>
                      </div>
                      <span className="material-symbols-outlined text-5xl opacity-20">celebration</span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-3 border-b border-white/20 pb-1">Próximos Eventos</h4>
                      {detalhes.eventosFuturos?.length === 0 ? (
                        <p className="text-xs opacity-70">Nenhum evento agendado.</p>
                      ) : (
                        <div className="space-y-2">
                          {detalhes.eventosFuturos?.slice(0, 5).map(evt => (
                            <div key={evt.id} className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                              <span className="font-bold truncate">{evt.nome}</span>
                              <span className="opacity-80">{formatDate(evt.dataEvento)}</span>
                            </div>
                          ))}
                          {detalhes.eventosFuturos?.length > 5 && (
                            <p className="text-xs text-center opacity-70 mt-2 pt-2">+ {detalhes.eventosFuturos.length - 5} eventos</p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-3 border-b border-white/20 pb-1">Últimos Eventos</h4>
                      {detalhes.eventosPassados?.length === 0 ? (
                        <p className="text-xs opacity-70">Nenhum evento passado.</p>
                      ) : (
                        <div className="space-y-2">
                          {detalhes.eventosPassados?.slice(0, 3).map(evt => (
                            <div key={evt.id} className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                              <span className="font-bold truncate">{evt.nome}</span>
                              <span className="opacity-80">{formatDate(evt.dataEvento)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm opacity-80">Erro ao carregar os detalhes.</p>
                )}
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-surface/5 rounded-full blur-3xl" />
            </div>
          ) : (
            <div className="bg-surface-container-high rounded-2xl p-8 text-center border border-outline-variant/30">
              <span className="material-symbols-outlined text-5xl text-outline/30 mb-4">badge</span>
              <p className="text-sm text-on-surface-variant font-medium">Selecione um colaborador para ver o resumo de escalas e contadores</p>
            </div>
          )}
        </div>
      </div>

      {showPanel && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex justify-end fade-in" onClick={() => setShowPanel(false)}>
          <div className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col slide-in-right rounded-l-3xl" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start">
              <div><h3 className="text-2xl font-headline font-extrabold">{editing ? 'Editar' : 'Novo'} Colaborador</h3></div>
              <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-surface-container rounded-full"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <form id="func-form" className="space-y-6" onSubmit={handleSave}>
                <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Nome</label><input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required /></div>
                <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Email <span className="lowercase font-normal text-on-surface-variant/60">(opcional)</span></label><input type="email" className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Celular</label><input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} required /></div>
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Tel. Resid. <span className="lowercase font-normal text-on-surface-variant/60">(opc)</span></label><input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.telefoneResidencial} onChange={e => setForm({...form, telefoneResidencial: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Função</label>
                  <select className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.funcaoId} onChange={e => setForm({...form, funcaoId: e.target.value})} required>
                    <option value="">Selecione...</option>
                    {funcoes.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(fn => <option key={fn.id} value={fn.id}>{fn.nome}</option>)}
                  </select>
                </div>
              </form>
            </div>
            <div className="p-8 bg-surface-container-low flex gap-4"><button onClick={() => setShowPanel(false)} className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3.5 rounded-full font-bold">Cancelar</button><button type="submit" form="func-form" className="flex-[2] bg-primary text-on-primary py-3.5 rounded-full font-bold shadow-xl shadow-primary/30">Salvar</button></div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
