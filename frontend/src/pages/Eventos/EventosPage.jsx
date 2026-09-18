import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import Toast from "../../components/Toast";
import WhatsAppIcon from "../../components/WhatsAppIcon";
import useDeleteWithConfirm from "../../hooks/useDeleteWithConfirm";

export default function EventosPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [eventos, setEventos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [clientes, setClientes] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [locais, setLocais] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [capacidadeLocal, setCapacidadeLocal] = useState(null);

  // Filtros
  const [filtroLocal, setFiltroLocal] = useState("");
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false);
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    dataEvento: "",
    horarioTermino: "",
    localId: "",
    clienteId: "",
    orcamentoId: "",
    orcamento: "",
    qtdPessoas: 0,
    qtdAdultos: 0,
    qtdCriancas: 0,
    qtdBebes: 0,
    observacoes: "",
  });

  // ─── Escala States ────────────────────────────────────────────
  const [showEscalaModal, setShowEscalaModal] = useState(false);
  const [showCriarEscalaModal, setShowCriarEscalaModal] = useState(false);
  const [escalaAtual, setEscalaAtual] = useState([]);
  const [loadingEscala, setLoadingEscala] = useState(false);
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState([]);
  const [loadingDisponiveis, setLoadingDisponiveis] = useState(false);
  const [filtroFuncao, setFiltroFuncao] = useState("");
  const [selecionados, setSelecionados] = useState([]);
  const [salvandoEscala, setSalvandoEscala] = useState(false);
  const [errosEscala, setErrosEscala] = useState([]);
  const [toast, setToast] = useState(null);
  const { executeDelete } = useDeleteWithConfirm();

  const fetchData = async () => {
    try {
      const params = { page, limit: 10 };
      if (filtroLocal) params.localId = filtroLocal;
      
      if (mostrarCancelados) {
        params.status = 'cancelado';
      } else if (mostrarConcluidos) {
        params.status = 'concluido';
      }

      const { data: res } = await api.get("/eventos", { params });
      const items = Array.isArray(res.data) ? res.data : [];
      setEventos(items);
      setTotal(res.pagination?.total || items.length);
    } catch {}
  };

  useEffect(() => {
    fetchData();
  }, [page, filtroLocal, mostrarConcluidos, mostrarCancelados]);

  useEffect(() => {
    api
      .get("/clientes", { params: { limit: 100 } })
      .then((r) => {
        const items = Array.isArray(r.data.data) ? r.data.data : [];
        setClientes(items);
      })
      .catch(() => {});
    api
      .get("/orcamentos")
      .then((r) => {
        const items = Array.isArray(r.data.data) ? r.data.data : [];
        setOrcamentos(items);
      })
      .catch(() => {});
    api
      .get("/locais?limit=100")
      .then((r) => {
        const items = Array.isArray(r.data.data) ? r.data.data : [];
        setLocais(items);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (form.localId && locais.length > 0) {
      const local = locais.find(l => l.id === form.localId);
      setCapacidadeLocal(local?.capacidadeMaxima || null);
    } else {
      setCapacidadeLocal(null);
    }
  }, [form.localId, locais]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const toUTC = (val) => {
        if (!val) return "";
        if (val.includes("Z") || val.includes("+") || (val.lastIndexOf("-") > 10 && val.includes(":"))) {
          return new Date(val).toISOString();
        }
        const suffix = val.length === 16 ? ":00-03:00" : "-03:00";
        return new Date(val + suffix).toISOString();
      };
      const payload = {
        ...form,
        dataEvento: toUTC(form.dataEvento),
        horarioTermino: toUTC(form.horarioTermino),
      };
      const { data: res } = editing
        ? await api.put(`/eventos/${editing}`, payload)
        : await api.post("/eventos", payload);
      if (res.warning) {
        setToast({
          message: `Evento ${editing ? "atualizado" : "criado"} com sucesso! Aviso: ${res.warning}`,
          type: "warning",
        });
      } else {
        setToast({
          message: `Evento ${editing ? "atualizado" : "criado"} com sucesso!`,
          type: "success",
        });
      }
      setShowPanel(false);
      setEditing(null);
      fetchData();
    } catch (err) {
      await confirm(err.response?.data?.message || "Erro", { title: 'Erro', showCancel: false });
    }
  };

  const handleDelete = async (id) => {
    const toast = await executeDelete(id, '/eventos', 'Evento', fetchData);
    if (toast) setToast(toast);
  };

  const handleCancel = async (id) => {
    if (!(await confirm('Tem certeza que deseja cancelar este evento?', { title: 'Cancelar Evento', isDanger: true }))) return;
    try {
      await api.patch(`/eventos/${id}/status`, { status: 'cancelado' });
      setToast({ message: 'Evento cancelado com sucesso!', type: 'success' });
      fetchData();
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao cancelar evento', { title: 'Erro', showCancel: false });
    }
  };

  const handleWhatsApp = async (id) => {
    try {
      const { data: res } = await api.get(`/eventos/${id}/whatsapp`);
      if (res.data?.link) {
        window.open(res.data.link, '_blank');
      }
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao gerar link do WhatsApp', { title: 'Erro', showCancel: false });
    }
  };

  // ─── Escala Handlers ───────────────────────────────────────────

  const handleVerEscala = async (evt) => {
    setEscalaAtual([]);
    setLoadingEscala(true);
    setShowEscalaModal(true);
    try {
      const { data: res } = await api.get(`/escala/evento/${evt.id}`);
      setEscalaAtual(Array.isArray(res.data) ? res.data : []);
    } catch {
      setEscalaAtual([]);
    } finally {
      setLoadingEscala(false);
    }
  };

  const handleRemoverDaEscala = async (escalaId) => {
    if (!(await confirm("Remover este funcionário da escala?"))) return;
    try {
      await api.delete(`/escala/${escalaId}`);
      // Atualiza a lista após remover
      const { data: res } = await api.get(`/escala/evento/${selectedEvento.id}`);
      setEscalaAtual(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      await confirm(err.response?.data?.message || "Erro ao remover da escala.", { title: 'Erro', showCancel: false });
    }
  };

  const handleAbrirCriarEscala = async (evt) => {
    setSelecionados([]);
    setFiltroFuncao("");
    setErrosEscala([]);
    setFuncionariosDisponiveis([]);
    setLoadingDisponiveis(true);
    setShowCriarEscalaModal(true);
    try {
      const { data: res } = await api.get(`/escala/disponiveis/${evt.id}`);
      setFuncionariosDisponiveis(Array.isArray(res.data) ? res.data : []);
    } catch {
      setFuncionariosDisponiveis([]);
    } finally {
      setLoadingDisponiveis(false);
    }
  };

  const handleSalvarEscala = async () => {
    if (selecionados.length === 0) {
      await confirm("Selecione ao menos um funcionário.", { title: 'Atenção', showCancel: false });
      return;
    }
    setSalvandoEscala(true);
    setErrosEscala([]);
    try {
      const { data: res } = await api.post("/escala/lote", {
        eventoId: selectedEvento.id,
        funcionarioIds: selecionados,
      });
      const errs = res.data?.erros || [];
      setErrosEscala(errs);
      if (errs.length === 0) {
        setShowCriarEscalaModal(false);
      }
      // Atualiza lista de disponíveis após salvar
      const { data: res2 } = await api.get(`/escala/disponiveis/${selectedEvento.id}`);
      setFuncionariosDisponiveis(Array.isArray(res2.data) ? res2.data : []);
      setSelecionados([]);
    } catch (err) {
      await confirm(err.response?.data?.message || "Erro ao salvar escala.", { title: 'Erro', showCancel: false });
    } finally {
      setSalvandoEscala(false);
    }
  };

  const toggleSelecionado = (id) => {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Funções únicas para o filtro
  const funcoesUnicas = [...new Map(
    funcionariosDisponiveis
      .filter(f => f.funcao)
      .map(f => [f.funcao.id, f.funcao])
  ).values()].sort((a, b) => a.nome.localeCompare(b.nome));

  const funcionariosFiltrados = filtroFuncao
    ? funcionariosDisponiveis.filter(f => f.funcao?.id === filtroFuncao)
    : funcionariosDisponiveis;

  const statusBadge = (s) => {
    const m = {
      pendente: "bg-primary-container text-on-primary-container",
      planejamento: "bg-primary-container text-on-primary-container",
      cancelado: "bg-error-container text-on-error-container",
      concluido: "bg-secondary-container text-on-secondary-container",
    };
    return m[s] || "bg-surface-container text-on-surface-variant";
  };

  const toBrasiliaISO = (d) => {
    if (!d) return "";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "";
    const formatter = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    return formatter.format(date).replace(" ", "T");
  };

  const parseDate = (d) => {
    if (!d) return null;
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [year, month, day] = d.split('-');
      return new Date(year, month - 1, day);
    }
    return new Date(d);
  };

  const formatDate = (d) => {
    const date = parseDate(d);
    return date
      ? date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "America/Sao_Paulo",
        })
      : "";
  };
  const formatTime = (d) => {
    const date = parseDate(d);
    return date
      ? date.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        })
      : "";
  };

  return (
    <div>
      <section className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">
            Eventos
          </h2>
          <p className="text-on-surface-variant">
            Gerencie a programação dos eventos e aloque equipes.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setForm({
              nome: "",
              dataEvento: "",
              horarioTermino: "",
              localId: "",
              clienteId: "",
              orcamentoId: "",
              orcamento: "",
              qtdPessoas: 0,
              qtdAdultos: 0,
              qtdCriancas: 0,
              qtdBebes: 0,
              observacoes: "",
            });
            setShowPanel(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-full shadow-lg shadow-primary/30 hover:scale-[1.02] transition-transform"
        >
          <span className="material-symbols-outlined">add</span> Novo Evento
        </button>
      </section>

      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Table */}
        <div className="col-span-12 lg:col-span-8 bg-surface p-6 rounded-2xl shadow-sm border border-outline-variant/30">

          {/* Header e Filtros */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
            <h3 className="text-xl font-bold font-headline">Agenda de Eventos</h3>
            <div className="flex items-center gap-3">
              {/* Filtro de concluídos */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mostrarConcluidos}
                  onChange={(e) => {
                    setMostrarConcluidos(e.target.checked);
                    if (e.target.checked) setMostrarCancelados(false);
                  }}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm font-medium text-on-surface-variant">Concluídos</span>
              </label>

              {/* Filtro de cancelados */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={mostrarCancelados}
                  onChange={(e) => {
                    setMostrarCancelados(e.target.checked);
                    if (e.target.checked) setMostrarConcluidos(false);
                  }}
                  className="w-4 h-4 rounded accent-error"
                />
                <span className="text-sm font-medium text-on-surface-variant">Cancelados</span>
              </label>
              <select
                className="bg-surface-container-low border-none rounded-full py-2 px-4 focus:ring-2 focus:ring-primary text-sm font-medium outline-none"
                value={filtroLocal}
                onChange={(e) => setFiltroLocal(e.target.value)}
              >
                <option value="">Todos os locais</option>
                {locais.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(loc => <option key={loc.id} value={loc.id}>{loc.nome}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="text-on-surface-variant text-xs uppercase tracking-widest font-bold">
                  <th className="pb-4 px-4">Evento</th>
                  <th className="pb-4 px-4 hidden sm:table-cell min-w-[160px]">Data & Hora</th>
                  <th className="pb-4 px-4 hidden md:table-cell">Local</th>
                  <th className="pb-4 px-4 hidden sm:table-cell">Cliente</th>
                  <th className="pb-4 px-4">Status</th>
                  <th className="pb-4 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {eventos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-on-surface-variant">
                      Nenhum evento.
                    </td>
                  </tr>
                )}
                {eventos.map((evt) => (
                  <tr
                    key={evt.id}
                    className={`group hover:bg-surface-container-low transition-colors cursor-pointer ${selectedEvento?.id === evt.id ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                    onClick={() => setSelectedEvento(evt)}
                  >
                    <td className="py-4 px-4 font-semibold text-sm">{evt.nome}</td>
                    <td className="py-4 px-4 text-sm hidden sm:table-cell whitespace-nowrap">
                      {formatDate(evt.dataEvento)}{" "}
                      <span className="text-outline block text-[11px]">
                        {formatTime(evt.dataEvento)} — {formatTime(evt.horarioTermino)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm capitalize hidden md:table-cell">{evt.local?.nome || evt.local || "—"}</td>
                    <td className="py-4 px-4 text-sm hidden sm:table-cell">{evt.cliente?.nome || evt.Cliente?.nome || "—"}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge(evt.status)}`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWhatsApp(evt.id);
                          }}
                          className="w-8 h-8 rounded-full bg-secondary text-on-secondary flex items-center justify-center hover:scale-110 transition-all shadow-md shadow-secondary/20 mr-1"
                          title="WhatsApp"
                        >
                          <WhatsAppIcon className="w-4 h-4" />
                        </button>
                        {evt.status !== 'cancelado' && evt.status !== 'concluido' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancel(evt.id);
                            }}
                            className="p-1.5 text-error hover:bg-error/10 rounded-full"
                            title="Cancelar"
                          >
                            <span className="material-symbols-outlined text-lg">block</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditing(evt.id);
                            setForm({
                              nome: evt.nome || "",
                              dataEvento: toBrasiliaISO(evt.dataEvento),
                              horarioTermino: toBrasiliaISO(evt.horarioTermino),
                              localId: evt.localId || evt.local?.id || "",
                              clienteId: evt.clienteId || "",
                              orcamentoId: evt.orcamentoId || "",
                              orcamento: evt.valorOrcamento || "",
                              qtdPessoas: evt.qtdPessoas || 0,
                              qtdAdultos: evt.qtdAdultos || 0,
                              qtdCriancas: evt.qtdCriancas || 0,
                              qtdBebes: evt.qtdBebes || 0,
                              observacoes: evt.observacoes || "",
                            });
                            setShowPanel(true);
                          }}
                          className="p-1.5 text-on-surface-variant hover:text-primary rounded-full transition-colors"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        {user?.role !== "operador" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(evt.id);
                            }}
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

        {/* Detail Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {selectedEvento ? (
            <>
              <div className="bg-tertiary text-on-tertiary p-6 rounded-2xl relative overflow-hidden shadow-xl">
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2">Detalhes do Evento</h3>
                  <p className="text-sm opacity-80 mb-6">{selectedEvento.nome}</p>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                      <span>Local</span>
                      <span className="font-bold capitalize">{selectedEvento.local?.nome || selectedEvento.local || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                      <span>Data</span>
                      <span className="font-bold">
                        {formatDate(selectedEvento.dataEvento)} • {formatTime(selectedEvento.dataEvento)} — {formatTime(selectedEvento.horarioTermino)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                      <span>Cliente</span>
                      <span className="font-bold">{selectedEvento.cliente?.nome || selectedEvento.Cliente?.nome || "—"}</span>
                    </div>
                    <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                      <span>Status</span>
                      <span className="font-bold uppercase">{selectedEvento.status}</span>
                    </div>
                    {selectedEvento.valorOrcamento > 0 && (
                      <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                        <span>Orçamento</span>
                        <span className="font-bold text-primary">
                          R$ {Number(selectedEvento.valorOrcamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Público</span>
                      <span className="font-bold">
                        {selectedEvento.qtdPessoas || 0} pessoas
                      </span>
                    </div>
                    {selectedEvento.local?.capacidadeMaxima && (
                      <div className="flex justify-between text-sm border-b border-white/10 pb-2">
                        <span>Capacidade do Local</span>
                        <span className="font-bold">{selectedEvento.local.capacidadeMaxima} pessoas</span>
                      </div>
                    )}
                    {selectedEvento.local?.capacidadeMaxima && (selectedEvento.qtdPessoas || 0) > selectedEvento.local.capacidadeMaxima && (
                      <div className="flex items-start gap-2.5 text-xs bg-error-container border border-error/30 text-on-error-container p-3.5 rounded-2xl mt-4 shadow-sm">
                        <span className="material-symbols-outlined text-base text-red-400 mt-0.5 shrink-0">warning</span>
                        <div>
                          <p className="font-bold text-red-200">Capacidade Excedida</p>
                          <p className="opacity-80 mt-0.5">Este evento tem mais convidados ({selectedEvento.qtdPessoas}) do que a capacidade do salão ({selectedEvento.local.capacidadeMaxima} pessoas).</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedEvento.observacoes && (
                    <p className="mt-4 text-sm opacity-80 italic">{selectedEvento.observacoes}</p>
                  )}
                </div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-surface/5 rounded-full blur-3xl" />
              </div>

              {/* ─── Botões de Escala ────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleVerEscala(selectedEvento)}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 bg-surface border-2 border-tertiary text-tertiary rounded-2xl font-bold text-sm hover:bg-tertiary hover:text-on-tertiary transition-all shadow-sm group"
                >
                  <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">groups</span>
                  Ver Escala
                </button>
                <button
                  onClick={() => handleAbrirCriarEscala(selectedEvento)}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 bg-tertiary text-on-tertiary rounded-2xl font-bold text-sm hover:brightness-110 transition-all shadow-md shadow-tertiary/30 group"
                >
                  <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">person_add</span>
                  Criar Escala
                </button>
              </div>
            </>
          ) : (
            <div className="bg-surface-container-high rounded-2xl p-8 text-center">
              <span className="material-symbols-outlined text-5xl text-outline/30 mb-4">event</span>
              <p className="text-sm text-on-surface-variant">Selecione um evento para ver os detalhes</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal: Ver Escala ─────────────────────────────────── */}
      {showEscalaModal && (
        <div
          className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in"
          onClick={() => setShowEscalaModal(false)}
        >
          <div
            className="bg-surface rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <div>
                <h3 className="text-xl font-headline font-extrabold text-on-surface">Escala do Evento</h3>
                <p className="text-sm text-on-surface-variant mt-0.5">{selectedEvento?.nome}</p>
              </div>
              <button
                onClick={() => setShowEscalaModal(false)}
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingEscala ? (
                <div className="flex items-center justify-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                  Carregando escala...
                </div>
              ) : escalaAtual.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-5xl text-outline/30 block mb-3">group_off</span>
                  <p className="text-on-surface-variant text-sm">Nenhum funcionário escalado ainda.</p>
                  <button
                    onClick={() => {
                      setShowEscalaModal(false);
                      handleAbrirCriarEscala(selectedEvento);
                    }}
                    className="mt-4 px-6 py-2 bg-tertiary text-on-tertiary rounded-full font-bold text-sm hover:brightness-110 transition-all"
                  >
                    Criar Escala Agora
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {escalaAtual.map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl group hover:bg-tertiary/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-sm">
                          {entry.funcionario?.nome?.slice(0, 2).toUpperCase() || "??"}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm">{entry.funcionario?.nome || "—"}</p>
                          <p className="text-xs text-on-surface-variant">
                            {entry.funcionario?.funcao?.nome || "Sem função"}
                          </p>
                        </div>
                      </div>
                      {user?.role !== "operador" && (
                        <button
                          onClick={() => handleRemoverDaEscala(entry.id)}
                          className="p-1.5 text-outline hover:text-error rounded-full hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remover da escala"
                        >
                          <span className="material-symbols-outlined text-lg">person_remove</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-outline-variant/20 bg-surface-container-low/30 flex justify-between items-center">
              <p className="text-xs text-on-surface-variant font-medium">
                {escalaAtual.length} funcionário{escalaAtual.length !== 1 ? 's' : ''} escalado{escalaAtual.length !== 1 ? 's' : ''}
              </p>
              <button
                onClick={() => {
                  setShowEscalaModal(false);
                  handleAbrirCriarEscala(selectedEvento);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-tertiary text-on-tertiary rounded-full font-bold text-sm hover:brightness-110 transition-all"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Criar Escala ───────────────────────────────── */}
      {showCriarEscalaModal && (
        <div
          className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in"
          onClick={() => setShowCriarEscalaModal(false)}
        >
          <div
            className="bg-surface rounded-3xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
              <div>
                <h3 className="text-xl font-headline font-extrabold text-on-surface">Criar Escala</h3>
                <p className="text-sm text-on-surface-variant mt-0.5">{selectedEvento?.nome}</p>
              </div>
              <button
                onClick={() => setShowCriarEscalaModal(false)}
                className="p-2 hover:bg-surface-container rounded-full transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Filtro por Função */}
            <div className="px-6 pt-4 pb-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-2">
                Filtrar por Função
              </label>
              <select
                className="w-full bg-surface-container-low border-none rounded-full py-2.5 px-5 focus:ring-2 focus:ring-tertiary text-sm font-medium outline-none"
                value={filtroFuncao}
                onChange={e => setFiltroFuncao(e.target.value)}
              >
                <option value="">Todas as funções</option>
                {funcoesUnicas.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>

              {/* Contador */}
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-on-surface-variant">
                  {funcionariosFiltrados.length} funcionário{funcionariosFiltrados.length !== 1 ? 's' : ''} disponível{funcionariosFiltrados.length !== 1 ? 'eis' : ''}
                </p>
                {selecionados.length > 0 && (
                  <p className="text-xs font-bold text-tertiary">
                    {selecionados.length} selecionado{selecionados.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Lista de Funcionários */}
            <div className="flex-1 overflow-y-auto px-6 py-2">
              {loadingDisponiveis ? (
                <div className="flex items-center justify-center py-12 text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                  Buscando disponíveis...
                </div>
              ) : funcionariosFiltrados.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-5xl text-outline/30 block mb-3">group_off</span>
                  <p className="text-on-surface-variant text-sm">
                    {filtroFuncao
                      ? "Nenhum funcionário disponível com esta função neste dia."
                      : "Todos os funcionários já estão ocupados neste dia."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {funcionariosFiltrados.map(func => {
                    const isChecked = selecionados.includes(func.id);
                    return (
                      <label
                        key={func.id}
                        className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all select-none ${
                          isChecked
                            ? 'bg-tertiary/10 ring-2 ring-tertiary/30'
                            : 'bg-surface-container-low hover:bg-surface-container'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelecionado(func.id)}
                          className="w-4 h-4 rounded accent-tertiary shrink-0"
                        />
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isChecked ? 'bg-tertiary text-on-tertiary' : 'bg-outline/10 text-on-surface-variant'}`}>
                            {func.nome?.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-on-surface text-sm truncate">{func.nome}</p>
                            <p className="text-xs text-on-surface-variant truncate">{func.funcao?.nome || 'Sem função'}</p>
                          </div>
                        </div>
                        {isChecked && (
                          <span className="material-symbols-outlined text-tertiary text-xl shrink-0">check_circle</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Erros */}
              {errosEscala.length > 0 && (
                <div className="mt-4 p-4 bg-error/10 rounded-2xl border border-error/20">
                  <p className="text-sm font-bold text-error mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">warning</span>
                    Conflitos encontrados:
                  </p>
                  <ul className="space-y-1">
                    {errosEscala.map((err, i) => (
                      <li key={i} className="text-xs text-error/80">• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-outline-variant/20 bg-surface-container-low/30 flex gap-3">
              <button
                onClick={() => setShowCriarEscalaModal(false)}
                className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3 rounded-full font-bold text-sm hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarEscala}
                disabled={selecionados.length === 0 || salvandoEscala}
                className="flex-[2] bg-tertiary text-on-tertiary py-3 rounded-full font-bold text-sm shadow-lg shadow-tertiary/30 hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {salvandoEscala ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">group_add</span>
                    Adicionar {selecionados.length > 0 ? `(${selecionados.length})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel */}
      {showPanel && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex justify-end fade-in" onClick={() => setShowPanel(false)}>
          <div className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col slide-in-right rounded-l-3xl" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-outline-variant/30 flex justify-between">
              <div><h3 className="text-2xl font-headline font-extrabold">{editing ? "Editar Evento" : "Novo Evento"}</h3></div>
              <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-surface-container rounded-full"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <form id="evt-form" className="space-y-6" onSubmit={handleSave}>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Nome do Evento</label>
                  <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Local</label>
                  <select className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.localId} onChange={e => setForm({ ...form, localId: e.target.value })} required>
                    <option value="">Selecione o local...</option>
                    {locais.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(loc => <option key={loc.id} value={loc.id}>{loc.nome}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Data e Hora</label>
                    <input type="datetime-local" className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.dataEvento} onChange={e => setForm({ ...form, dataEvento: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Horário de Término</label>
                    <input type="datetime-local" className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.horarioTermino} onChange={e => setForm({ ...form, horarioTermino: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Cliente</label>
                    <select className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })} required>
                      <option value="">Selecione...</option>
                      {clientes.slice().sort((a, b) => a.nome.localeCompare(b.nome)).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Orçamento (R$)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.orcamento} onChange={e => setForm({ ...form, orcamento: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Vincular Orçamento (opcional)</label>
                  <select className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.orcamentoId} onChange={e => {
                    const selectedId = e.target.value;
                    if (selectedId) {
                      const orc = orcamentos.find(o => o.id === selectedId);
                      setForm({ ...form, orcamentoId: selectedId, orcamento: orc ? orc.valorTotal : form.orcamento });
                    } else {
                      setForm({ ...form, orcamentoId: "" });
                    }
                  }}>
                    <option value="">Nenhum</option>
                    {orcamentos.slice().sort((a, b) => Number(a.valorTotal) - Number(b.valorTotal)).map(o => <option key={o.id} value={o.id}>R$ {o.valorTotal} - {o.status}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-2">Total</label>
                    <input type="number" className="w-full bg-surface-container-low border-none rounded-full py-3 px-4 focus:ring-2 focus:ring-primary text-center opacity-70 cursor-not-allowed" placeholder="0" value={(form.qtdAdultos || 0) + (form.qtdCriancas || 0) + (form.qtdBebes || 0)} readOnly />
                  </div>
                  {capacidadeLocal && ((form.qtdAdultos || 0) + (form.qtdCriancas || 0) + (form.qtdBebes || 0)) > 0 && ((form.qtdAdultos || 0) + (form.qtdCriancas || 0) + (form.qtdBebes || 0)) > capacidadeLocal && (
                    <div className="col-span-4 p-3 bg-error/10 border border-error/20 rounded-2xl flex items-start gap-2">
                      <span className="material-symbols-outlined text-error text-base mt-0.5">warning</span>
                      <div>
                        <p className="text-sm font-bold text-error">Capacidade excedida!</p>
                        <p className="text-xs text-error/80">
                          O total de convidados ({(form.qtdAdultos || 0) + (form.qtdCriancas || 0) + (form.qtdBebes || 0)}) ultrapassa a capacidade máxima do local ({capacidadeLocal} pessoas).
                        </p>
                      </div>
                    </div>
                  )}
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
            <div className="p-8 bg-surface-container-low flex gap-4">
              <button type="button" onClick={() => setShowPanel(false)} className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3.5 rounded-full font-bold">Cancelar</button>
              <button type="submit" form="evt-form" className="flex-[2] bg-primary text-on-primary py-3.5 rounded-full font-bold shadow-lg shadow-primary/20">Salvar</button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
