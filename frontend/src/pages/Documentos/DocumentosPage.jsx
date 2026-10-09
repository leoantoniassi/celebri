import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function DocumentosPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [docs, setDocs] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nomeArquivo: '',
    caminhoUrl: '',
    clienteId: '',
    eventoId: '',
  });
  const fetchData = useCallback(async () => {
    try {
      const [docsRes, clientesRes, eventosRes] = await Promise.all([
        api.get('/documentos'),
        api.get('/clientes', { params: { limit: 200 } }),
        api.get('/eventos', { params: { limit: 200 } }),
      ]);
      setDocs(Array.isArray(docsRes.data.data) ? docsRes.data.data : []);
      setClientes(Array.isArray(clientesRes.data.data) ? clientesRes.data.data : (clientesRes.data.rows || []));
      setEventos(Array.isArray(eventosRes.data.data) ? eventosRes.data.data : (eventosRes.data.rows || []));
    } catch {}
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => {
    setEditing(null);
    setForm({ nomeArquivo: '', caminhoUrl: '', clienteId: '', eventoId: '' });
    setShowPanel(true);
  };

  const openEdit = (doc) => {
    setEditing(doc.id);
    setForm({
      nomeArquivo: doc.nomeArquivo || '',
      caminhoUrl: doc.caminhoUrl || '',
      clienteId: doc.clienteId || '',
      eventoId: doc.eventoId || '',
    });
    setShowPanel(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        nomeArquivo: form.nomeArquivo,
        caminhoUrl: form.caminhoUrl,
        clienteId: form.clienteId || null,
        eventoId: form.eventoId || null,
      };
      if (editing) {
        await api.put(`/documentos/${editing}`, payload);
      } else {
        await api.post('/documentos', payload);
      }
      setShowPanel(false);
      fetchData();
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao salvar documento', { title: 'Erro', showCancel: false });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!(await confirm('Deseja realmente excluir este documento?'))) return;
    try {
      await api.delete(`/documentos/${id}`);
      fetchData();
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao excluir', { title: 'Erro', showCancel: false });
    }
  };

  const handleAbrir = async (doc) => {
    if (!doc?.caminhoUrl) return;
    if (/^https?:\/\//i.test(doc.caminhoUrl)) {
      const win = window.open(doc.caminhoUrl, '_blank', 'noopener,noreferrer');
      if (win) win.opener = null;
    } else {
      try {
        const response = await api.get(`/documentos/${doc.id}/arquivo`, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(response.data);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      } catch {
        await confirm('Erro ao abrir o arquivo. Verifique se o caminho está acessível pelo servidor.', { title: 'Erro', showCancel: false });
      }
    }
  };

  const fileIcon = (tipo) => {
    if (tipo === 'pdf') return { icon: 'picture_as_pdf', color: 'text-primary', bg: 'bg-primary/10' };
    if (tipo === 'jpg' || tipo === 'jpeg') return { icon: 'image', color: 'text-secondary', bg: 'bg-secondary/10' };
    if (tipo === 'png') return { icon: 'image', color: 'text-tertiary', bg: 'bg-tertiary/10' };
    return { icon: 'description', color: 'text-primary', bg: 'bg-primary/10' };
  };
  const filteredClientes = useMemo(() => {
    if (!form.eventoId) return clientes;
    const ev = eventos.find(e => e.id === form.eventoId);
    return ev ? clientes.filter(c => c.id === ev.clienteId) : clientes;
  }, [clientes, eventos, form.eventoId]);

  const filteredEventos = useMemo(() => {
    if (!form.clienteId) return eventos;
    return eventos.filter(ev => ev.clienteId === form.clienteId);
  }, [eventos, form.clienteId]);

  const handleClienteChange = useCallback((clienteId) => {
    setForm(prev => {
      let nextEventoId = prev.eventoId;
      if (clienteId && nextEventoId) {
        const ev = eventos.find(e => e.id === nextEventoId);
        if (ev && ev.clienteId !== clienteId) {
          nextEventoId = '';
        }
      }
      return {
        ...prev,
        clienteId,
        eventoId: nextEventoId
      };
    });
  }, [eventos]);

  const handleEventoChange = useCallback((eventoId) => {
    setForm(prev => {
      let nextClienteId = prev.clienteId;
      if (eventoId) {
        const ev = eventos.find(e => e.id === eventoId);
        if (ev && ev.clienteId) {
          nextClienteId = ev.clienteId;
        }
      }
      return {
        ...prev,
        eventoId,
        clienteId: nextClienteId
      };
    });
  }, [eventos]);

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 px-2">
        <div>
          <h2 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">Documentos</h2>
          <p className="text-on-surface-variant">Registre e organize os contratos e arquivos dos seus clientes e eventos.</p>
        </div>
        <button
          onClick={openNew}
          className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold flex items-center gap-2 shadow-xl shadow-primary/30 hover:scale-[1.05] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Novo Documento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 px-2">
        <div className="bg-surface p-6 rounded-xl border border-outline-variant/10 editorial-shadow">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Total de Documentos</p>
          <p className="text-3xl font-headline font-extrabold text-tertiary">{docs.length}</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-outline-variant/10 editorial-shadow">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Contratos PDF</p>
          <p className="text-3xl font-headline font-extrabold text-primary">{docs.filter(d => d.tipoArquivo === 'pdf').length}</p>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-outline-variant/10 editorial-shadow">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">Com Link Externo</p>
          <p className="text-3xl font-headline font-extrabold text-secondary">{docs.filter(d => d.caminhoUrl?.startsWith('http')).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2">
        {docs.length === 0 && (
          <div className="col-span-full text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl text-outline/30 block mb-4">folder_off</span>
            <p className="font-medium">Nenhum documento cadastrado.</p>
            <p className="text-sm mt-1">Clique em &quot;Novo Documento&quot; para começar.</p>
          </div>
        )}
        {docs.map((doc) => {
          const fi = fileIcon(doc.tipoArquivo);
          const isUrl = doc.caminhoUrl?.startsWith('http');
          return (
            <div key={doc.id} className="group bg-surface rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-outline-variant/10">
              <div className={`${fi.bg} p-6 flex items-center justify-center aspect-[3/2] relative`}>
                <span className={`material-symbols-outlined text-6xl ${fi.color}`}>{fi.icon}</span>
                <div className="absolute top-3 right-3">
                  <span className="text-[10px] font-bold uppercase bg-surface/80 backdrop-blur px-2 py-1 rounded-full text-on-surface-variant border border-outline-variant/20">
                    {doc.tipoArquivo?.toUpperCase() || 'DOC'}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-bold text-on-surface truncate mb-2">{doc.nomeArquivo}</h3>

                <div className="space-y-1 mb-4">
                  {doc.cliente && (
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">person</span>
                      <span className="truncate">{doc.cliente.nome}</span>
                    </div>
                  )}
                  {doc.evento && (
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">event</span>
                      <span className="truncate">{doc.evento.nome}</span>
                    </div>
                  )}
                  {!doc.cliente && !doc.evento && (
                    <p className="text-xs text-on-surface-variant/50 italic">Sem vínculo</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleAbrir(doc)}
                      className="p-2 hover:bg-primary/10 rounded-full text-tertiary transition-colors"
                      title={isUrl ? 'Abrir link' : 'Ver localização'}
                    >
                      <span className="material-symbols-outlined text-lg">{isUrl ? 'open_in_new' : 'folder_open'}</span>
                    </button>
                    <button
                      onClick={() => openEdit(doc)}
                      className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant transition-colors"
                      title="Editar"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                  </div>
                  {user?.role !== 'operador' && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 hover:bg-error/10 rounded-full text-error transition-colors"
                      title="Excluir"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showPanel && (
        <div
          className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex justify-end fade-in"
          onClick={() => setShowPanel(false)}
        >
          <div
            className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col slide-in-right rounded-l-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-headline font-extrabold text-on-surface">
                  {editing ? 'Editar Documento' : 'Novo Documento'}
                </h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Registre o caminho ou link do arquivo e vincule ao cliente/evento.
                </p>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <form id="doc-form" className="space-y-6" onSubmit={handleSave}>

                <div className="space-y-2">
                  <label htmlFor="nomeArquivo" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">
                    Nome do Documento *
                  </label>
                  <input
                    id="nomeArquivo"
                    className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all"
                    placeholder="Ex: Contrato João Carlos — Festa Jun/2026"
                    value={form.nomeArquivo}
                    onChange={(e) => setForm({ ...form, nomeArquivo: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="caminhoUrl" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">
                    Localização do Arquivo *
                  </label>
                  <input
                    id="caminhoUrl"
                    className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all"
                    type="text"
                    placeholder="contratos/joao.pdf  ou  https://drive.google.com/..."
                    value={form.caminhoUrl}
                    onChange={(e) => setForm({ ...form, caminhoUrl: e.target.value })}
                    required
                  />
                  <p className="text-[11px] text-on-surface-variant px-4">
                    Caminho relativo à pasta de documentos da empresa ou link público (Google Drive, OneDrive, etc.)
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="clienteId" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">
                    Cliente
                  </label>
                  <select
                    id="clienteId"
                    className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={form.clienteId}
                    onChange={(e) => handleClienteChange(e.target.value)}
                  >
                    <option value="">— Nenhum cliente selecionado —</option>
                    {filteredClientes.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="eventoId" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">
                    Evento (opcional)
                  </label>
                  <select
                    id="eventoId"
                    className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:bg-surface focus:ring-2 focus:ring-primary transition-all appearance-none"
                    value={form.eventoId}
                    onChange={(e) => handleEventoChange(e.target.value)}
                  >
                    <option value="">— Nenhum evento selecionado —</option>
                    {filteredEventos.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.nome}</option>
                    ))}
                  </select>
                </div>

              </form>
            </div>

            <div className="p-8 bg-surface-container-low flex gap-4 rounded-tl-3xl">
              <button
                onClick={() => setShowPanel(false)}
                className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3.5 rounded-full font-bold hover:bg-surface transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="doc-form"
                disabled={saving}
                className="flex-[2] bg-primary text-on-primary py-3.5 rounded-full font-bold shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
