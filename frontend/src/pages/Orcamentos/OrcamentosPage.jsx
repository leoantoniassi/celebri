import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { formatCurrency } from '../../utils/formatters';
import Toast from '../../components/Toast';
import WhatsAppIcon from '../../components/WhatsAppIcon';

const EMPTY_FORM = { clienteId: '', nome: '', valorTotal: 0, dataValidade: '', dataEvento: '', horarioTermino: '', observacoes: '', localId: '', produtos: [], qtdPessoas: 0, qtdAdultos: 0, qtdCriancas: 0, qtdBebes: 0 };

const sortByName = (items) => items.slice().sort((a, b) => a.nome.localeCompare(b.nome));

function toBrasiliaISO(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
  return formatter.format(date).replace(" ", "T");
}

function toUTC(val) {
  if (!val) return "";
  try {
    if (val.includes("Z") || val.includes("+") || (val.lastIndexOf("-") > 10 && val.includes(":"))) {
      const d = new Date(val);
      if (isNaN(d.getTime())) return "";
      return d.toISOString();
    }
    const suffix = val.length === 16 ? ":00-03:00" : "-03:00";
    const d = new Date(val + suffix);
    if (isNaN(d.getTime())) return "";
    return d.toISOString();
  } catch {
    return "";
  }
}

function parseDate(d) {
  if (!d) return null;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [year, month, day] = d.split('-');
    return new Date(year, month - 1, day);
  }
  return new Date(d);
}

function formatDate(d) {
  const date = parseDate(d);
  return date
    ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" })
    : "";
}

function formatDateTime(d) {
  if (!d) return "—";
  const date = parseDate(d);
  if (!date) return "—";
  return date.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function formatTime(d) {
  const date = parseDate(d);
  return date
    ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : "";
}

export default function OrcamentosPage() {
  const { user } = useAuth();
  const isOperador = user?.role === 'operador';
  const confirm = useConfirm();
  const [orcamentos, setOrcamentos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [clientes, setClientes] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState(null);
  const [locais, setLocais] = useState([]);
  const [filtroLocal, setFiltroLocal] = useState('');
  const [mostrarReprovados, setMostrarReprovados] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    api.get('/locais?limit=100').then(r => {
      const items = Array.isArray(r.data.data) ? r.data.data : [];
      setLocais(items);
    }).catch(() => {});
  }, []);

  const fetchData = async () => {
    try {
      const params = { page, limit: 10 };
      if (filtroLocal) params.localId = filtroLocal;
      if (mostrarReprovados) params.incluirReprovados = 'true';

      const { data: res } = await api.get('/orcamentos', { params });
      const items = Array.isArray(res.data) ? res.data : [];
      setOrcamentos(items);
      setTotal(res.pagination?.total || items.length);
    } catch { }
  };

  useEffect(() => { fetchData(); }, [page, filtroLocal, mostrarReprovados]);

  useEffect(() => { api.get('/clientes', { params: { limit: 100 } }).then(r => { const items = Array.isArray(r.data.data) ? r.data.data : []; setClientes(items); }).catch(() => { }); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.dataEvento || !form.horarioTermino) {
      await confirm("Data e horário do evento e de término são obrigatórios.", { title: 'Atenção', showCancel: false });
      return;
    }
    const dataEventoUTC = toUTC(form.dataEvento);
    const horarioTerminoUTC = toUTC(form.horarioTermino);
    if (!dataEventoUTC || !horarioTerminoUTC) {
      await confirm("Data ou horário inválido. Verifique os valores informados.", { title: 'Atenção', showCancel: false });
      return;
    }
    if (new Date(horarioTerminoUTC) <= new Date(dataEventoUTC)) {
      await confirm("Horário de término deve ser posterior à data de início do evento.", { title: 'Atenção', showCancel: false });
      return;
    }
    try {
      const payload = {
        ...form,
        dataEvento: dataEventoUTC,
        horarioTermino: horarioTerminoUTC,
      };
      let res;
      if (editing) {
        const response = await api.put(`/orcamentos/${editing}`, payload);
        res = response.data;
      } else {
        const response = await api.post('/orcamentos', payload);
        res = response.data;
      }
      
      if (res.warning) {
        setToast({ message: `Orçamento salvo com sucesso! Aviso: ${res.warning}`, type: 'warning' });
      } else {
        setToast({ message: `Orçamento salvo com sucesso!`, type: 'success' });
      }
      
      setShowPanel(false); setEditing(null); fetchData();
    } catch (err) { await confirm(err.response?.data?.message || err.response?.data?.error || 'Erro', { title: 'Erro', showCancel: false }); }
  };

  const handleStatus = async (id, status) => {
    try { await api.patch(`/orcamentos/${id}/status`, { status }); fetchData(); } catch (err) { await confirm(err.response?.data?.error || 'Erro', { title: 'Erro', showCancel: false }); }
  };

  const handleDelete = async (id) => { if (!(await confirm('Excluir orçamento?'))) return; try { await api.delete(`/orcamentos/${id}`); fetchData(); } catch (err) { await confirm(err.response?.data?.error || 'Erro', { title: 'Erro', showCancel: false }); } };

  const handleConfirm = async (id) => {
    if (!(await confirm('Você tem certeza que deseja confirmar este orçamento? Ele será convertido em um evento automaticamente.', { title: 'Confirmar Orçamento', isDanger: false }))) return;
    try {
      await api.post(`/orcamentos/${id}/confirmar`);
      setToast({ message: 'Orçamento aprovado e convertido em evento!', type: 'success' });
      fetchData();
    } catch (err) {
      await confirm(err.response?.data?.error || 'Erro ao confirmar orçamento', { title: 'Erro', showCancel: false });
    }
  };

  const handleReject = async (id) => {
    if (!(await confirm('Você tem certeza que deseja rejeitar este orçamento? Ele será marcado como reprovado e removido.', { title: 'Rejeitar Orçamento', isDanger: true }))) return;
    try {
      await api.post(`/orcamentos/${id}/rejeitar`);
      setToast({ message: 'Orçamento reprovado com sucesso!', type: 'success' });
      fetchData();
    } catch (err) {
      await confirm(err.response?.data?.error || 'Erro ao rejeitar orçamento', { title: 'Erro', showCancel: false });
    }
  };

  const handleWhatsApp = async (id) => {
    try {
      const { data: res } = await api.get(`/orcamentos/${id}/whatsapp`);
      window.open(res.data?.link || res.url, '_blank');
    } catch (err) {
      await confirm('Erro ao abrir o WhatsApp', { title: 'Erro', showCancel: false });
    }
  };

  const statusBadge = (s) => {
    const m = { aprovado: 'bg-secondary-container text-on-secondary-container', pendente: 'bg-primary-container text-on-primary-container', rejeitado: 'bg-error-container text-on-error-container', reprovado: 'bg-error-container text-on-error-container' };
    return m[s] || 'bg-surface-container text-on-surface-variant';
  };

  return (
    <div>
      <section className="flex justify-between items-end mb-10">
        <div><h2 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">Orçamentos</h2><p className="text-on-surface-variant">Gerencie propostas e negociações festivas.</p></div>
        <button onClick={() => { setEditing(null); setForm({ ...EMPTY_FORM }); setShowPanel(true); }} className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-full shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform">
          <span className="material-symbols-outlined">add</span> Novo Orçamento
        </button>
      </section>

      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Table */}
        <div className="col-span-12 lg:col-span-8 bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant/30">

          {/* Header e Filtros */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <h3 className="text-xl font-bold font-headline">Listagem</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mostrarReprovados}
                  onChange={(e) => { setMostrarReprovados(e.target.checked); setPage(1); }}
                  className="w-4 h-4 rounded accent-error"
                />
                <span className="text-sm font-medium text-on-surface-variant">Reprovados</span>
              </label>
              <select
                className="bg-surface-container-low border-none rounded-full py-2 px-4 focus:ring-2 focus:ring-primary text-sm font-medium outline-none"
                value={filtroLocal}
                onChange={(e) => setFiltroLocal(e.target.value)}
              >
                <option value="">Todos os locais</option>
                {sortByName(locais).map(loc => <option key={loc.id} value={loc.id}>{loc.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">
                  <th className="pb-4 px-4">Orçamento (Evento)</th>
                  <th className="pb-4 px-4 hidden sm:table-cell min-w-[160px]">Data & Hora</th>
                  <th className="pb-4 px-4 hidden sm:table-cell">Cliente</th>
                  <th className="pb-4 px-4 hidden md:table-cell">Local</th>
                  <th className="pb-4 px-4">Valor Total</th>
                  <th className="pb-4 px-4">Status</th>
                  <th className="pb-4 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.length === 0 && <tr><td colSpan={7} className="py-12 text-center text-on-surface-variant">Nenhum orçamento.</td></tr>}
                {orcamentos.map((o) => (
                  <tr key={o.id} className="group hover:bg-surface-container-low transition-colors cursor-pointer" onClick={() => setSelected(o)}>
                    <td className="py-4 px-4 font-semibold text-sm">{o.nome || '—'}</td>
                    <td className="py-4 px-4 text-sm hidden sm:table-cell whitespace-nowrap">
                      {formatDate(o.dataEvento)}{" "}
                      <span className="text-outline block text-[11px]">
                        {formatTime(o.dataEvento)} — {formatTime(o.horarioTermino)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm hidden sm:table-cell">{o.cliente?.nome || o.Cliente?.nome || '—'}</td>
                    <td className="py-4 px-4 text-sm capitalize hidden md:table-cell">{o.local?.nome || o.local || '—'}</td>
                    <td className="py-4 px-4 font-bold text-sm">{formatCurrency(o.valorTotal)}</td>
                    <td className="py-4 px-4"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(o.status)}`}>{o.status}</span></td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleWhatsApp(o.id); }}
                          className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:scale-110 transition-all shadow-md shadow-secondary/20 mr-1"
                          title="WhatsApp"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                        </button>
                        {o.status === 'pendente' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); handleConfirm(o.id); }}
                              className="p-1.5 text-secondary hover:bg-secondary/10 rounded-full"
                              title="Aprovar e Confirmar"
                            >
                              <span className="material-symbols-outlined text-lg">check</span>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleReject(o.id); }}
                              className="p-1.5 text-error hover:bg-error/10 rounded-full"
                              title="Rejeitar"
                            >
                              <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setEditing(o.id);
                            setForm({
                              ...EMPTY_FORM,
                              clienteId: o.clienteId || o.cliente?.id || o.Cliente?.id || '',
                              nome: o.nome || '',
                              valorTotal: o.valorTotal || 0,
                              dataValidade: o.dataValidade ? toBrasiliaISO(o.dataValidade).slice(0, 10) : '',
                              dataEvento: toBrasiliaISO(o.dataEvento),
                              horarioTermino: toBrasiliaISO(o.horarioTermino),
                              observacoes: o.observacoes || '',
                              localId: o.localId || o.local?.id || '',
                              qtdPessoas: o.qtdPessoas || 0,
                              qtdAdultos: o.qtdAdultos || 0,
                              qtdCriancas: o.qtdCriancas || 0,
                              qtdBebes: o.qtdBebes || 0,
                            });
                            setShowPanel(true);
                          }}
                          className="p-1.5 text-on-surface-variant hover:text-primary rounded-full transition-colors"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        {!isOperador && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(o.id); }}
                            className="p-1.5 text-on-surface-variant hover:text-error rounded-full"
                            title="Excluir"
                          >
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
        </div>

        {/* Detail */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {selected ? (
            <div className="bg-tertiary text-on-tertiary p-6 rounded-2xl relative overflow-hidden shadow-xl">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Detalhes</h3>
                {selected.nome && <p className="text-lg font-bold mb-1">{selected.nome}</p>}
                <p className="text-sm opacity-80 mb-6">{selected.Cliente?.nome || selected.cliente?.nome || 'Cliente'}</p>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2"><span>Local</span><span className="font-bold capitalize">{selected.local?.nome || selected.local || '—'}</span></div>
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2"><span>Valor Total</span><span className="font-bold text-primary">{formatCurrency(selected.valorTotal)}</span></div>
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2"><span>Data do Evento</span><span className="font-bold">{formatDateTime(selected.dataEvento)}</span></div>
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2"><span>Término</span><span className="font-bold">{formatDateTime(selected.horarioTermino)}</span></div>
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2"><span>Validade</span><span className="font-bold">{formatDate(selected.dataValidade)}</span></div>
                  <div className="flex justify-between text-sm border-b border-white/10 pb-2"><span>Público</span><span className="font-bold">{selected.qtdPessoas || 0} pessoas</span></div>
                  <div className="flex justify-between text-sm"><span>Status</span><span className="font-bold uppercase">{selected.status}</span></div>
                </div>
                {selected.observacoes && <p className="mt-4 text-sm opacity-80 italic">{selected.observacoes}</p>}
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-surface/5 rounded-full blur-3xl" />
            </div>
          ) : (
            <div className="bg-surface-container-high rounded-2xl p-8 text-center"><span className="material-symbols-outlined text-5xl text-outline/30 mb-4">request_quote</span><p className="text-sm text-on-surface-variant">Selecione um orçamento</p></div>
          )}
        </div>
      </div>

      {/* Panel */}
      {showPanel && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex justify-end fade-in" onClick={() => setShowPanel(false)}>
          <div className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col slide-in-right rounded-l-3xl" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-outline-variant/30 flex justify-between"><div><h3 className="text-2xl font-headline font-extrabold">{editing ? 'Editar Orçamento' : 'Novo Orçamento'}</h3></div><button onClick={() => setShowPanel(false)} className="p-2 hover:bg-surface-container rounded-full"><span className="material-symbols-outlined">close</span></button></div>
            <div className="flex-1 overflow-y-auto p-8">
              <form id="orc-form" className="space-y-6" onSubmit={handleSave}>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Nome do Evento</label>
                  <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Cliente</label><select className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })} required><option value="">Selecione...</option>{sortByName(clientes).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>

                {/* Seleção do Local */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Local</label>
                  <select className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.localId} onChange={e => setForm({ ...form, localId: e.target.value })} required>
                    <option value="">Selecione o local...</option>
                    {sortByName(locais).map(loc => <option key={loc.id} value={loc.id}>{loc.nome}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Valor Total</label>
                  <input type="number" step="0.01" placeholder="0.00" className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.valorTotal || ''} onChange={e => setForm({ ...form, valorTotal: e.target.value ? Number(e.target.value) : 0 })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Data de Validade</label>
                  <input type="date" className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.dataValidade} onChange={e => setForm({ ...form, dataValidade: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Data e Hora do Evento</label><input type="datetime-local" className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.dataEvento} onChange={e => setForm({ ...form, dataEvento: e.target.value })} required /></div>
                  <div className="space-y-2"><label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Horário de Término</label><input type="datetime-local" className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.horarioTermino} onChange={e => setForm({ ...form, horarioTermino: e.target.value })} required /></div>
                </div>
                
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-2">Total</label>
                    <input type="number" className="w-full bg-surface-container-low border-none rounded-full py-3 px-4 focus:ring-2 focus:ring-primary text-center opacity-70 cursor-not-allowed" placeholder="0" value={(form.qtdAdultos || 0) + (form.qtdCriancas || 0) + (form.qtdBebes || 0)} readOnly />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-2">Adultos</label>
                    <input type="number" className="w-full bg-surface-container-low border-none rounded-full py-3 px-4 focus:ring-2 focus:ring-primary text-center" placeholder="0" value={form.qtdAdultos || ""} onChange={e => setForm({ ...form, qtdAdultos: e.target.value === '' ? 0 : Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-2">Crianças</label>
                    <input type="number" className="w-full bg-surface-container-low border-none rounded-full py-3 px-4 focus:ring-2 focus:ring-primary text-center" placeholder="0" value={form.qtdCriancas || ""} onChange={e => setForm({ ...form, qtdCriancas: e.target.value === '' ? 0 : Number(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-2">Bebês</label>
                    <input type="number" className="w-full bg-surface-container-low border-none rounded-full py-3 px-4 focus:ring-2 focus:ring-primary text-center" placeholder="0" value={form.qtdBebes || ""} onChange={e => setForm({ ...form, qtdBebes: e.target.value === '' ? 0 : Number(e.target.value) })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Observações</label>
                  <textarea className="w-full bg-surface-container-low border-none rounded-2xl py-3.5 px-6 focus:ring-2 focus:ring-primary resize-none" rows={3} value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
                </div>
              </form>
            </div>
            <div className="p-8 bg-surface-container-low flex gap-4"><button type="button" onClick={() => setShowPanel(false)} className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3.5 rounded-full font-bold">Cancelar</button><button type="submit" form="orc-form" className="flex-[2] bg-secondary text-on-secondary py-3.5 rounded-full font-bold shadow-lg shadow-secondary/20">Salvar & Enviar</button></div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}