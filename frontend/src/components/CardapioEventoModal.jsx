import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const STATUS = {
  pendente: { label: 'Pendente', classe: 'bg-surface-container-high text-on-surface-variant' },
  preparando: { label: 'Preparando', classe: 'bg-tertiary/10 text-tertiary' },
  servido: { label: 'Servido', classe: 'bg-success-container text-on-success-container' },
};

/** "HH:MM" do dia do evento → ISO; vazio = sem horário. */
function horarioNoDiaDoEvento(evento, hhmm) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const dia = new Date(evento.dataEvento);
  dia.setHours(h, m, 0, 0);
  return dia.toISOString();
}

const formatarHora = (iso) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—');

/**
 * Cardápio/cronograma da cozinha: o que será servido, quanto e a que horas.
 * A cozinha acompanha e marca o andamento pelo app.
 */
export default function CardapioEventoModal({ evento, onClose }) {
  const [itens, setItens] = useState([]);
  const [form, setForm] = useState({ item: '', quantidade: '', unidade: 'un', hora: '' });
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data: res } = await api.get(`/eventos/${evento.id}/servicos`);
      setItens(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao carregar o cardápio.');
    }
  }, [evento.id]);

  useEffect(() => { carregar(); }, [carregar]);

  const adicionar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await api.post(`/eventos/${evento.id}/servicos`, {
        item: form.item,
        quantidade: form.quantidade === '' ? null : Number(form.quantidade),
        unidade: form.unidade,
        horario: horarioNoDiaDoEvento(evento, form.hora),
      });
      setForm({ item: '', quantidade: '', unidade: form.unidade, hora: '' });
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.message || 'Não foi possível adicionar.');
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id) => {
    try {
      await api.delete(`/servicos/${id}`);
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.message || 'Não foi possível remover.');
    }
  };

  const adultos = evento.qtdAdultos || 0;
  const criancas = evento.qtdCriancas || 0;

  return (
    <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in" onClick={onClose}>
      <div role="dialog" aria-label="Cardápio da cozinha"
        className="bg-surface rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
          <div>
            <h3 className="text-xl font-headline font-extrabold text-on-surface">Cardápio da cozinha</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {evento.nome} · {evento.qtdPessoas || 0} pessoas ({adultos} adultos, {criancas} crianças)
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full" aria-label="Fechar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <form onSubmit={adicionar} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-5 space-y-1">
              <label htmlFor="svc-item" className="text-xs font-bold text-on-surface-variant px-3">O que será servido *</label>
              <input id="svc-item" required maxLength={150} placeholder="Ex: Salgados fritos"
                className="w-full bg-surface-container-low border-none rounded-full py-2.5 px-4 focus:ring-2 focus:ring-tertiary text-sm"
                value={form.item} onChange={e => setForm({ ...form, item: e.target.value })} />
            </div>
            <div className="col-span-4 sm:col-span-2 space-y-1">
              <label htmlFor="svc-qtd" className="text-xs font-bold text-on-surface-variant px-3">Qtd.</label>
              <input id="svc-qtd" type="number" min={0} step="any"
                className="w-full bg-surface-container-low border-none rounded-full py-2.5 px-4 focus:ring-2 focus:ring-tertiary text-sm"
                value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} />
            </div>
            <div className="col-span-3 sm:col-span-2 space-y-1">
              <label htmlFor="svc-un" className="text-xs font-bold text-on-surface-variant px-3">Unid.</label>
              <input id="svc-un" maxLength={30}
                className="w-full bg-surface-container-low border-none rounded-full py-2.5 px-4 focus:ring-2 focus:ring-tertiary text-sm"
                value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} />
            </div>
            <div className="col-span-3 sm:col-span-2 space-y-1">
              <label htmlFor="svc-hora" className="text-xs font-bold text-on-surface-variant px-3">Horário</label>
              <input id="svc-hora" type="time"
                className="w-full bg-surface-container-low border-none rounded-full py-2.5 px-3 focus:ring-2 focus:ring-tertiary text-sm"
                value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} />
            </div>
            <button type="submit" disabled={salvando} aria-label="Adicionar ao cardápio"
              className="col-span-2 sm:col-span-1 h-10 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center disabled:opacity-50">
              <span className="material-symbols-outlined">add</span>
            </button>
          </form>

          {erro && <p className="text-sm text-error">{erro}</p>}

          {itens.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-6">Nada no cardápio ainda.</p>
          ) : (
            <ul className="space-y-2">
              {itens.map(s => (
                <li key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-surface-container-low">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm font-bold text-tertiary w-12 shrink-0">{formatarHora(s.horario)}</span>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-on-surface truncate">{s.item}</p>
                      <p className="text-xs text-on-surface-variant">
                        {s.quantidade !== null ? `${Number(s.quantidade).toLocaleString('pt-BR')} ${s.unidade || ''}` : 'Quantidade livre'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS[s.status]?.classe}`}>
                      {STATUS[s.status]?.label}
                    </span>
                    <button onClick={() => remover(s.id)} title="Remover do cardápio"
                      className="p-2 rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error">
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
