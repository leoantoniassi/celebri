import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';

export default function UsuariosPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [usuarios, setUsuarios] = useState([]);
  const [total, setTotal] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [showConvitePanel, setShowConvitePanel] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'operador' });
  const [formConvite, setFormConvite] = useState({ nome: '', email: '', role: 'operador' });
  const [conviteLoading, setConviteLoading] = useState(false);
  const [conviteFeedback, setConviteFeedback] = useState({ type: '', message: '' });

  // Apenas gerentes podem ver e gerenciar usuários, ou operadores podem ver?
  // Se for uma tela de gestão, vamos assumir que o backend protege. 
  // No frontend, vamos buscar.
  const fetchData = async () => {
    try {
      const { data: res } = await api.get('/usuarios');
      const items = Array.isArray(res.data) ? res.data : [];
      setUsuarios(items);
      setTotal(res.pagination?.total || items.length);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvidar = async (e) => {
    e.preventDefault();
    setConviteLoading(true);
    setConviteFeedback({ type: '', message: '' });
    try {
      const { data: res } = await api.post('/usuarios/convidar', formConvite);
      setConviteFeedback({ type: 'success', message: res.message });
      setFormConvite({ nome: '', email: '', role: 'operador' });
      fetchData();
      setTimeout(() => {
        setShowConvitePanel(false);
        setConviteFeedback({ type: '', message: '' });
      }, 2500);
    } catch (err) {
      setConviteFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Erro ao enviar convite.',
      });
    } finally {
      setConviteLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        // Se a senha estiver vazia, removemos do payload para não atualizar
        const payload = { ...form };
        if (!payload.senha) delete payload.senha;
        await api.put(`/usuarios/${editing}`, payload);
      } else {
        await api.post('/usuarios', form);
      }
      setShowPanel(false);
      setEditing(null);
      setForm({ nome: '', email: '', senha: '', role: 'operador' });
      fetchData();
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao salvar usuário', { title: 'Erro', showCancel: false });
    }
  };

  const handleEdit = (u) => {
    setForm({ nome: u.nome, email: u.email, role: u.role, senha: '' });
    setEditing(u.id);
    setShowPanel(true);
  };

  const handleDelete = async (id) => {
    if (!(await confirm('Excluir este usuário permanentemente?'))) return;
    try {
      await api.delete(`/usuarios/${id}`);
      fetchData();
    } catch (err) {
      await confirm(err.response?.data?.message || 'Erro ao excluir usuário', { title: 'Erro', showCancel: false });
    }
  };

  const initials = (n) => (n || 'NA').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();

  const roleColor = (r) => {
    return r === 'gerente' 
      ? 'bg-primary/20 text-on-primary font-bold' 
      : 'bg-surface-container text-on-surface-variant';
  };

  // Se o usuário logado não for gerente, podemos bloquear a tela ou apenas ocultar ações
  // Mas como a rota do backend também vai bloquear as ações, vamos apenas desenhar a UI.
  // Idealmente, operadores nem deveriam acessar esta tela.
  if (user?.role !== 'gerente') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-6xl text-error opacity-80">lock</span>
          <h2 className="text-2xl font-bold text-on-surface">Acesso Negado</h2>
          <p className="text-on-surface-variant">Apenas gerentes podem acessar o painel de permissões.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-2">
          <h2 className="text-4xl font-extrabold text-on-surface tracking-tight font-headline">Acessos</h2>
          <p className="text-on-surface-variant font-medium">Criação de Usuários e Permissões do Sistema.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            id="btn-convidar-usuario"
            onClick={() => { setConviteFeedback({ type: '', message: '' }); setFormConvite({ nome: '', email: '', role: 'operador' }); setShowConvitePanel(true); }}
            className="inline-flex items-center gap-2 px-6 py-4 bg-surface-container border-2 border-primary/30 text-on-surface rounded-full font-bold hover:bg-primary/10 hover:border-primary active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined text-primary">forward_to_inbox</span> Convidar por E-mail
          </button>
          <button
            id="btn-novo-usuario"
            onClick={() => { setEditing(null); setForm({ nome: '', email: '', senha: '', role: 'operador' }); setShowPanel(true); }}
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-full font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined">admin_panel_settings</span> Novo Usuário
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-tertiary p-6 rounded-xl text-on-tertiary relative overflow-hidden shadow-lg shadow-tertiary/20">
            <div className="relative z-10">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70">Contas do Sistema</p>
              <h3 className="text-4xl font-black mt-2">{total}</h3>
              <p className="text-sm font-medium mt-1">Usuários Registrados</p>
            </div>
            <span className="material-symbols-outlined absolute -bottom-4 -right-4 text-8xl opacity-10">shield_person</span>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl space-y-2 text-sm text-on-surface-variant">
            <p><strong>Gerente:</strong> Acesso total, pode criar/editar e excluir dados no sistema.</p>
            <p><strong>Operador:</strong> Pode criar e editar registros, mas <em>não possui</em> permissão para deletar dados.</p>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <div className="bg-surface border border-surface-container-high rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Nome do Usuário</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Acesso (Login)</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Permissão</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">Status</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {usuarios.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">Nenhum usuário encontrado.</td></tr>
                  )}
                  {usuarios.map((u) => (
                    <tr key={u.id} className="group hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-on-primary-container ring-2 ring-primary/20">
                            {initials(u.nome)}
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{u.nome}</p>
                            <p className="text-xs text-on-surface-variant">Criado em: {new Date(u.criadoEm).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-sm font-medium text-on-surface">{u.email}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1 ${roleColor(u.role)} text-xs rounded-full uppercase tracking-tight inline-flex items-center gap-1`}>
                          {u.role === 'gerente' && <span className="material-symbols-outlined text-[14px]">shield</span>}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {u.status === 'pendente' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-warning-container text-on-warning-container text-xs rounded-full font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                            Pendente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-success-container text-on-success-container text-xs rounded-full font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button onClick={() => handleEdit(u)} className="p-2 text-on-surface-variant hover:text-tertiary transition-colors" title="Editar">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        {user?.id !== u.id && (
                          <button onClick={() => handleDelete(u.id)} className="p-2 text-on-surface-variant hover:text-error transition-colors" title="Excluir">
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Convite por E-mail */}
      {showConvitePanel && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex justify-end fade-in" onClick={() => setShowConvitePanel(false)}>
          <div className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col slide-in-right rounded-l-3xl" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-primary">forward_to_inbox</span>
                  <h3 className="text-2xl font-headline font-extrabold">Convidar Usuário</h3>
                </div>
                <p className="text-sm text-on-surface-variant">Um link de ativação será enviado por e-mail.</p>
              </div>
              <button onClick={() => setShowConvitePanel(false)} className="p-2 hover:bg-surface-container rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {/* Feedback de sucesso/erro */}
              {conviteFeedback.message && (
                <div className={`mb-6 p-4 rounded-2xl text-sm font-medium flex items-start gap-2 ${
                  conviteFeedback.type === 'success'
                    ? 'bg-success-container text-on-success-container'
                    : 'bg-error-container text-on-error-container'
                }`}>
                  <span className={`material-symbols-outlined text-lg flex-shrink-0 ${
                    conviteFeedback.type === 'success' ? 'text-emerald-600' : 'text-error'
                  }`}>
                    {conviteFeedback.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  {conviteFeedback.message}
                </div>
              )}

              <form id="convite-form" className="space-y-6" onSubmit={handleConvidar}>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Nome Completo</label>
                  <input
                    className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                    value={formConvite.nome}
                    onChange={e => setFormConvite({ ...formConvite, nome: e.target.value })}
                    placeholder="Nome do novo colaborador"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">E-mail para Convite</label>
                  <input
                    type="email"
                    className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary"
                    value={formConvite.email}
                    onChange={e => setFormConvite({ ...formConvite, email: e.target.value })}
                    placeholder="colaborador@empresa.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Nível de Permissão</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormConvite({ ...formConvite, role: 'operador' })}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formConvite.role === 'operador' ? 'border-primary bg-primary/10' : 'border-surface-container-high bg-surface hover:bg-surface-container-low'}`}
                    >
                      <span className="material-symbols-outlined">person</span>
                      <span className="font-bold">Operador</span>
                      <span className="text-xs text-on-surface-variant text-center">Apenas cria/edita</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormConvite({ ...formConvite, role: 'gerente' })}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${formConvite.role === 'gerente' ? 'border-primary bg-primary/10' : 'border-surface-container-high bg-surface hover:bg-surface-container-low'}`}
                    >
                      <span className="material-symbols-outlined">shield_person</span>
                      <span className="font-bold">Gerente</span>
                      <span className="text-xs text-on-surface-variant text-center">Acesso total</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-warning-container rounded-2xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 flex-shrink-0">info</span>
                  <p className="text-xs text-amber-800">
                    O colaborador receberá um e-mail com um link para definir sua senha. O link expira em <strong>24 horas</strong>.
                  </p>
                </div>
              </form>
            </div>

            <div className="p-8 bg-surface-container-low flex gap-4">
              <button
                onClick={() => setShowConvitePanel(false)}
                className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3.5 rounded-full font-bold"
              >
                Cancelar
              </button>
              <button
                id="btn-enviar-convite"
                type="submit"
                form="convite-form"
                disabled={conviteLoading}
                className="flex-[2] bg-primary text-on-primary py-3.5 rounded-full font-bold shadow-xl shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {conviteLoading ? (
                  <><span className="w-4 h-4 border-2 border-on-primary/40 border-t-on-primary rounded-full animate-spin" /> Enviando...</>
                ) : (
                  <><span className="material-symbols-outlined text-[18px]">send</span> Enviar Convite</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-in Form Panel — Novo / Editar Usuário */}
      {showPanel && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-md z-50 flex justify-end fade-in" onClick={() => setShowPanel(false)}>
          <div className="w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col slide-in-right rounded-l-3xl" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-outline-variant/30 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-headline font-extrabold">{editing ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              </div>
              <button onClick={() => setShowPanel(false)} className="p-2 hover:bg-surface-container rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <form id="usuario-form" className="space-y-6" onSubmit={handleSave}>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Nome Completo</label>
                  <input className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} required />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">E-mail (Login)</label>
                  <input type="email" className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Senha {editing && '(Deixe em branco para não alterar)'}</label>
                  <input type="password" placeholder={editing ? '••••••••' : ''} className="w-full bg-surface-container-low border-none rounded-full py-3.5 px-6 focus:ring-2 focus:ring-primary" value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} required={!editing} minLength={10} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-4">Nível de Permissão</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setForm({...form, role: 'operador'})}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${form.role === 'operador' ? 'border-primary bg-primary/10' : 'border-surface-container-high bg-surface hover:bg-surface-container-low'}`}
                    >
                      <span className="material-symbols-outlined">person</span>
                      <span className="font-bold">Operador</span>
                      <span className="text-xs text-on-surface-variant text-center">Apenas cria/edita</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({...form, role: 'gerente'})}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${form.role === 'gerente' ? 'border-primary bg-primary/10' : 'border-surface-container-high bg-surface hover:bg-surface-container-low'}`}
                    >
                      <span className="material-symbols-outlined">shield_person</span>
                      <span className="font-bold">Gerente</span>
                      <span className="text-xs text-on-surface-variant text-center">Acesso total</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-8 bg-surface-container-low flex gap-4">
              <button onClick={() => setShowPanel(false)} className="flex-1 border-2 border-outline-variant text-on-surface-variant py-3.5 rounded-full font-bold">
                Cancelar
              </button>
              <button type="submit" form="usuario-form" className="flex-[2] bg-primary text-on-primary py-3.5 rounded-full font-bold shadow-xl shadow-primary/30">
                Salvar Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
