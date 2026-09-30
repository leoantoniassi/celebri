import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';

/* ─── Configuração das tabelas básicas ──────────────────────── */
const TABLES = [
  {
    key: 'funcoes',
    label: 'Funções',
    icon: 'engineering',
    color: 'tertiary',
    endpoint: '/lookup/funcoes',
    description: 'Cargos e funções dos colaboradores',
    placeholder: 'Ex: Recreador, Garçom, Cozinheiro...',
  },
  {
    key: 'categorias-fornecedor',
    label: 'Categorias de Fornecedor',
    icon: 'category',
    color: 'secondary',
    endpoint: '/lookup/categorias-fornecedor',
    description: 'Tipos de fornecedores parceiros',
    placeholder: 'Ex: Alimentos, Bebidas, Decoração...',
  },
  {
    key: 'categorias-produto',
    label: 'Categorias de Produto',
    icon: 'inventory_2',
    color: 'primary',
    endpoint: '/lookup/categorias-produto',
    description: 'Tipos de itens do estoque',
    placeholder: 'Ex: Alimento, Bebida, Descartável...',
  },
  {
    key: 'locais',
    label: 'Locais',
    icon: 'location_on',
    color: 'primary',
    endpoint: '/locais',
    description: 'Espaços e salões de festas para realização de eventos',
    placeholder: 'Ex: Salão de Festas Principal...',
  },
];

/* Tela do app Celebri Staff aberta por quem trabalha em cada função. */
const MODULOS_APP = [
  { valor: '', label: 'Nenhum (só vê a escala)' },
  { valor: 'portaria', label: 'Portaria' },
  { valor: 'garcom', label: 'Garçom' },
  { valor: 'cozinha', label: 'Cozinha' },
];
const nomeModulo = (valor) => MODULOS_APP.find(m => m.valor === (valor || ''))?.label;

/* ─── Mapa de cores por tabela ──────────────────────────────── */
const colorMap = {
  tertiary:  { bg: 'bg-tertiary',   text: 'text-on-tertiary',   light: 'bg-tertiary/10',   textDark: 'text-tertiary',   shadow: 'shadow-tertiary/20',   ring: 'ring-tertiary/30',   border: 'border-tertiary/20' },
  secondary: { bg: 'bg-secondary',  text: 'text-on-secondary',  light: 'bg-secondary/10',  textDark: 'text-secondary',  shadow: 'shadow-secondary/20',  ring: 'ring-secondary/30',  border: 'border-secondary/20' },
  primary:   { bg: 'bg-primary',    text: 'text-on-primary',    light: 'bg-primary/10',    textDark: 'text-on-primary-container', shadow: 'shadow-primary/20', ring: 'ring-primary/30', border: 'border-primary/20' },
};

export default function CadastrosPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState(TABLES[0].key);
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState({});
  const [showPanel, setShowPanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    observacoes: '',
    capacidadeMaxima: '',
  });
  const [search, setSearch] = useState('');

  const activeTable = TABLES.find(t => t.key === activeTab);
  const colors = colorMap[activeTable.color];

  /* ─── Fetch items for a table ─────────────────────────────── */
  const fetchItems = useCallback(async (tableKey) => {
    const table = TABLES.find(t => t.key === tableKey);
    if (!table) return;
    setLoading(prev => ({ ...prev, [tableKey]: true }));
    try {
      const endpoint = tableKey === 'locais' ? `${table.endpoint}?limit=1000` : table.endpoint;
      const { data: res } = await api.get(endpoint);
      const list = Array.isArray(res.data) ? res.data : [];
      setItems(prev => ({ ...prev, [tableKey]: list }));
    } catch {
      setItems(prev => ({ ...prev, [tableKey]: [] }));
    } finally {
      setLoading(prev => ({ ...prev, [tableKey]: false }));
    }
  }, []);

  /* ─── Fetch all tables on mount ───────────────────────────── */
  useEffect(() => {
    TABLES.forEach(t => fetchItems(t.key));
  }, [fetchItems]);

  /* ─── Save (create or update) ─────────────────────────────── */
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = activeTab === 'locais' ? {
        nome: form.nome,
        logradouro: form.logradouro,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        estado: form.estado,
        cep: form.cep,
        observacoes: form.observacoes,
        capacidadeMaxima: form.capacidadeMaxima !== '' ? Number(form.capacidadeMaxima) : null,
      } : {
        nome: form.nome,
        descricao: form.descricao,
        ...(activeTab === 'funcoes' && { modulo: form.modulo || null }),
      };

      if (editing) {
        await api.put(`${activeTable.endpoint}/${editing}`, payload);
      } else {
        await api.post(activeTable.endpoint, payload);
      }
      setShowPanel(false);
      setEditing(null);
      setForm({
        nome: '',
        descricao: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        observacoes: '',
        capacidadeMaxima: '',
      });
      fetchItems(activeTab);
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao salvar', { title: 'Erro', showCancel: false });
    }
  };

  /* ─── Edit ────────────────────────────────────────────────── */
  const handleEdit = (item) => {
    if (activeTab === 'locais') {
      setForm({
        nome: item.nome || '',
        logradouro: item.logradouro || '',
        numero: item.numero || '',
        complemento: item.complemento || '',
        bairro: item.bairro || '',
        cidade: item.cidade || '',
        estado: item.estado || '',
        cep: item.cep || '',
        observacoes: item.observacoes || '',
        capacidadeMaxima: item.capacidadeMaxima || '',
        descricao: '',
      });
    } else {
      setForm({
        nome: item.nome || '',
        descricao: item.descricao || '',
        modulo: item.modulo || '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        observacoes: '',
      });
    }
    setEditing(item.id);
    setShowPanel(true);
  };

  /* ─── Delete ──────────────────────────────────────────────── */
  const handleDelete = async (id) => {
    if (!(await confirm('Excluir este registro? Essa ação não pode ser desfeita.'))) return;
    try {
      await api.delete(`${activeTable.endpoint}/${id}`);
      fetchItems(activeTab);
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao excluir. O registro pode estar em uso.', { title: 'Erro', showCancel: false });
    }
  };

  /* ─── Filter items by search ──────────────────────────────── */
  const currentItems = (items[activeTab] || []).filter(item => {
    const q = search.toLowerCase();
    if (activeTab === 'locais') {
      return (
        item.nome?.toLowerCase().includes(q) ||
        item.logradouro?.toLowerCase().includes(q) ||
        item.bairro?.toLowerCase().includes(q) ||
        item.cidade?.toLowerCase().includes(q) ||
        item.estado?.toLowerCase().includes(q) ||
        item.cep?.toLowerCase().includes(q) ||
        item.observacoes?.toLowerCase().includes(q)
      );
    }
    return (
      item.nome?.toLowerCase().includes(q) ||
      item.descricao?.toLowerCase().includes(q)
    );
  });

  /* ─── Open new panel ──────────────────────────────────────── */
  const openNew = () => {
    setEditing(null);
    setForm({
      nome: '',
      descricao: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      observacoes: '',
      capacidadeMaxima: '',
    });
    setShowPanel(true);
  };

  return (
    <div>
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-extrabold text-on-surface tracking-tight font-headline">Cadastros</h2>
          <p className="text-on-surface-variant font-medium">Gerencie as tabelas básicas do sistema.</p>
        </div>
        <button
          onClick={openNew}
          className={`inline-flex items-center gap-2 px-8 py-4 ${colors.bg} ${colors.text} rounded-full font-bold shadow-lg ${colors.shadow} hover:scale-[1.02] active:scale-[0.98] transition-all`}
        >
          <span className="material-symbols-outlined">add_circle</span>
          Novo Registro
        </button>
      </div>

      {/* ─── Tab Navigation ──────────────────────────────────── */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-1 px-1">
        {TABLES.map(table => {
          const tc = colorMap[table.color];
          const isActive = activeTab === table.key;
          const count = (items[table.key] || []).length;
          return (
            <button
              key={table.key}
              onClick={() => { setActiveTab(table.key); setSearch(''); }}
              className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all whitespace-nowrap ${
                isActive
                  ? `${tc.bg} ${tc.text} shadow-lg ${tc.shadow}`
                  : 'bg-surface border border-surface-container-high text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              <span className={`material-symbols-outlined text-xl ${isActive ? 'filled' : ''}`}>{table.icon}</span>
              <span>{table.label}</span>
              <span className={`ml-1 px-2.5 py-0.5 rounded-full text-xs font-black ${
                isActive ? 'bg-surface/25' : 'bg-surface-container text-on-surface-variant'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Content Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-8">
        {/* ─── Sidebar ────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Pesquisar</p>
            <input
              className="w-full bg-surface border-none rounded-full py-3 px-5 focus:ring-2 focus:ring-primary text-sm"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className={`${colors.bg} p-6 rounded-xl ${colors.text} relative overflow-hidden shadow-lg ${colors.shadow}`}>
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">{activeTable.label}</p>
              <h3 className="text-4xl font-black mt-2">{currentItems.length}</h3>
              <p className="text-sm font-medium mt-1">Registros Cadastrados</p>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-8xl opacity-10">{activeTable.icon}</span>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Sobre</p>
            <p className="text-sm text-on-surface-variant leading-relaxed">{activeTable.description}</p>
          </div>
        </div>

        {/* ─── Table ──────────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-9">
          <div className="bg-surface border border-surface-container-high rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Nome</th>
                    {activeTab === 'locais' ? (
                      <>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Endereço</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Capacidade</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Observações</th>
                      </>
                    ) : (
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Descrição</th>
                    )}
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {loading[activeTab] && (
                    <tr>
                      <td colSpan={activeTab === 'locais' ? 5 : 3} className="px-6 py-12 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!loading[activeTab] && currentItems.length === 0 && (
                    <tr>
                      <td colSpan={activeTab === 'locais' ? 5 : 3} className="px-6 py-12 text-center text-on-surface-variant">
                        <div className="flex flex-col items-center gap-3">
                          <span className={`material-symbols-outlined text-4xl ${colors.textDark} opacity-40`}>{activeTable.icon}</span>
                          <p>Nenhum registro encontrado.</p>
                          <button onClick={openNew} className={`text-sm font-bold ${colors.textDark} hover:underline`}>
                            + Adicionar primeiro registro
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading[activeTab] && currentItems.map(item => (
                    <tr key={item.id} className="group hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full ${colors.light} flex items-center justify-center ${colors.textDark} ring-2 ${colors.ring}`}>
                            <span className="material-symbols-outlined text-lg">{activeTable.icon}</span>
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{item.nome}</p>
                            <p className="text-xs text-on-surface-variant">ID: #{String(item.id).slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      {activeTab === 'locais' ? (
                        <>
                          <td className="px-6 py-5">
                            <p className="text-sm text-on-surface font-medium">
                              {item.logradouro}, {item.numero}{item.complemento ? ` - ${item.complemento}` : ''}
                            </p>
                            <p className="text-xs text-on-surface-variant">{item.bairro} - {item.cidade}/{item.estado} - CEP: {item.cep}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm text-on-surface font-medium">{item.capacidadeMaxima ? `${item.capacidadeMaxima} pessoas` : '—'}</p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-sm text-on-surface-variant truncate max-w-xs">{item.observacoes || '—'}</p>
                          </td>
                        </>
                      ) : (
                        <td className="px-6 py-5">
                          <p className="text-sm text-on-surface-variant">{item.descricao || '—'}</p>
                          {activeTab === 'funcoes' && item.modulo && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-tertiary/10 text-tertiary">
                              <span className="material-symbols-outlined text-sm">smartphone</span>
                              App: {nomeModulo(item.modulo)}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 text-on-surface-variant hover:text-tertiary transition-colors rounded-full hover:bg-tertiary/10"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          {user?.role !== 'operador' && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-error/10"
                              title="Excluir"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-surface-container-low/30 flex items-center justify-between border-t border-surface-container-high">
              <p className="text-xs text-on-surface-variant font-medium">
                {currentItems.length} registro{currentItems.length !== 1 ? 's' : ''} encontrado{currentItems.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Slide-in Panel ──────────────────────────────────── */}
      {showPanel && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex justify-end fade-in" onClick={() => setShowPanel(false)}>
          <div className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col slide-in-right rounded-l-3xl" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-headline font-extrabold">{editing ? 'Editar' : 'Novo'} Registro</h3>
                <p className="text-sm text-on-surface-variant mt-1">{activeTable.label}</p>
              </div>
              <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-surface-container rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <form id="cadastro-form" className="space-y-6" onSubmit={handleSave}>
                {activeTab === 'locais' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Nome do Local *</label>
                      <input
                        className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                        value={form.nome}
                        onChange={e => setForm({ ...form, nome: e.target.value })}
                        placeholder="Ex: Salão Imperial, Chácara Primavera..."
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">CEP *</label>
                        <input
                          className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                          value={form.cep}
                          onChange={e => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 8) val = val.slice(0, 8);
                            if (val.length > 5) {
                              val = `${val.slice(0, 5)}-${val.slice(5)}`;
                            }
                            setForm({ ...form, cep: val });
                          }}
                          placeholder="00000-000"
                          required
                        />
                      </div>
                      
                      <div className="col-span-1 flex items-end">
                        <button
                          type="button"
                          onClick={async () => {
                            const rawCep = form.cep.replace(/\D/g, '');
                            if (rawCep.length === 8) {
                              try {
                                const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
                                const data = await response.json();
                                if (!data.erro) {
                                  setForm(prev => ({
                                    ...prev,
                                    logradouro: data.logradouro || '',
                                    bairro: data.bairro || '',
                                    cidade: data.localidade || '',
                                    estado: data.uf || '',
                                  }));
                                }
                              } catch (e) {
                                console.error(e);
                              }
                            }
                          }}
                          className="w-full bg-primary/10 hover:bg-primary/20 text-primary py-3.5 rounded-full font-bold text-xs transition-colors"
                        >
                          Buscar CEP
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Logradouro *</label>
                        <input
                          className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                          value={form.logradouro}
                          onChange={e => setForm({ ...form, logradouro: e.target.value })}
                          placeholder="Rua, Avenida..."
                          required
                        />
                      </div>
                      <div className="col-span-1 space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Número *</label>
                        <input
                          className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                          value={form.numero}
                          onChange={e => setForm({ ...form, numero: e.target.value })}
                          placeholder="123"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Complemento</label>
                      <input
                        className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                        value={form.complemento || ''}
                        onChange={e => setForm({ ...form, complemento: e.target.value })}
                        placeholder="Apto, Bloco, Sala..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Bairro *</label>
                        <input
                          className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                          value={form.bairro}
                          onChange={e => setForm({ ...form, bairro: e.target.value })}
                          placeholder="Bairro"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Cidade *</label>
                        <input
                          className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                          value={form.cidade}
                          onChange={e => setForm({ ...form, cidade: e.target.value })}
                          placeholder="Cidade"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Estado (UF) *</label>
                      <input
                        className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                        value={form.estado}
                        onChange={e => setForm({ ...form, estado: e.target.value.toUpperCase().slice(0, 2) })}
                        placeholder="SP"
                        maxLength={2}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Capacidade Máxima</label>
                      <input
                        type="number"
                        className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                        value={form.capacidadeMaxima || ''}
                        onChange={e => setForm({ ...form, capacidadeMaxima: e.target.value === '' ? '' : Number(e.target.value) })}
                        placeholder="Ex: 150 pessoas"
                        min={0}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Observações</label>
                      <textarea
                        className="w-full bg-surface-container-low border-none rounded-2xl py-3.5 px-6 focus:ring-2 focus:ring-primary resize-none min-h-[100px]"
                        value={form.observacoes || ''}
                        onChange={e => setForm({ ...form, observacoes: e.target.value })}
                        placeholder="Instruções de acesso, contato no local..."
                        rows={3}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Nome *</label>
                      <input
                        className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                        value={form.nome}
                        onChange={e => setForm({ ...form, nome: e.target.value })}
                        placeholder={activeTable.placeholder}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Descrição</label>
                      <textarea
                        className="w-full bg-surface-container-low border-none rounded-2xl py-3.5 px-6 focus:ring-2 focus:ring-primary resize-none min-h-[120px]"
                        value={form.descricao}
                        onChange={e => setForm({ ...form, descricao: e.target.value })}
                        placeholder="Descrição opcional..."
                        rows={4}
                      />
                    </div>
                    {activeTab === 'funcoes' && (
                      <div className="space-y-2">
                        <label htmlFor="modulo-app" className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Tela no app Celebri Staff</label>
                        <select
                          id="modulo-app"
                          className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                          value={form.modulo || ''}
                          onChange={e => setForm({ ...form, modulo: e.target.value })}
                        >
                          {MODULOS_APP.map(m => <option key={m.valor} value={m.valor}>{m.label}</option>)}
                        </select>
                        <p className="text-xs text-on-surface-variant px-4">
                          Quem trabalhar nesta função vê essa tela no app durante o evento.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </form>
            </div>
            <div className="p-8 bg-surface-container-low flex gap-4">
              <button onClick={() => setShowPanel(false)} className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3.5 rounded-full font-bold">
                Cancelar
              </button>
              <button type="submit" form="cadastro-form" className={`flex-[2] ${colors.bg} ${colors.text} py-3.5 rounded-full font-bold shadow-xl ${colors.shadow}`}>
                {editing ? 'Atualizar' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
