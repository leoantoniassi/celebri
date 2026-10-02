import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Editor do layout de mesas de um salão (local). O garçom vê este mapa no
 * app durante o evento. Posições ficam em % para caber em qualquer tela.
 */
export default function MesasLocalModal({ local, onClose }) {
  const [mesas, setMesas] = useState([]);
  const [selecionadaId, setSelecionadaId] = useState(null);
  const [form, setForm] = useState({ numero: '', lugares: 4 });
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const selecionada = mesas.find(m => m.id === selecionadaId) || null;

  const carregar = useCallback(async () => {
    try {
      const { data: res } = await api.get(`/locais/${local.id}/mesas`);
      setMesas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao carregar mesas.');
    } finally {
      setCarregando(false);
    }
  }, [local.id]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (selecionada) setForm({ numero: selecionada.numero, lugares: selecionada.lugares });
  }, [selecionada]);

  const proximoNumero = () => {
    const numeros = mesas.map(m => parseInt(m.numero, 10)).filter(n => !Number.isNaN(n));
    return String(numeros.length ? Math.max(...numeros) + 1 : 1);
  };

  const executar = async (acao) => {
    setErro(null);
    try {
      await acao();
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.message || 'Não foi possível salvar.');
    }
  };

  // Clique no salão: move a mesa selecionada ou cria uma nova ali.
  const cliqueNoSalao = (e) => {
    const area = e.currentTarget.getBoundingClientRect();
    const posX = Math.min(100, Math.max(0, ((e.clientX - area.left) / area.width) * 100));
    const posY = Math.min(100, Math.max(0, ((e.clientY - area.top) / area.height) * 100));

    if (selecionada) {
      executar(() => api.put(`/mesas/${selecionada.id}`, { posX, posY }));
    } else {
      executar(() => api.post(`/locais/${local.id}/mesas`, { numero: proximoNumero(), lugares: 4, posX, posY }));
    }
  };

  const salvarSelecionada = (e) => {
    e.preventDefault();
    executar(() => api.put(`/mesas/${selecionada.id}`, { numero: form.numero, lugares: Number(form.lugares) }));
  };

  const removerSelecionada = () => {
    const id = selecionada.id;
    setSelecionadaId(null);
    executar(() => api.delete(`/mesas/${id}`));
  };

  return (
    <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in" onClick={onClose}>
      <div role="dialog" aria-label={`Mesas de ${local.nome}`}
        className="bg-surface rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
          <div>
            <h3 className="text-xl font-headline font-extrabold text-on-surface">Mesas do salão</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">{local.nome} · {mesas.length} mesa(s)</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full" aria-label="Fechar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <p className="text-xs text-on-surface-variant">
              {selecionada
                ? `Clique no salão para mover a mesa ${selecionada.numero}.`
                : 'Clique num espaço vazio para criar uma mesa. Clique numa mesa para editar ou mover.'}
            </p>
            <div
              className="relative w-full aspect-[4/3] rounded-2xl bg-surface-container-low border-2 border-dashed border-outline-variant/40 cursor-crosshair select-none"
              onClick={cliqueNoSalao}
              data-testid="salao"
            >
              {carregando && <p className="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant">Carregando...</p>}
              {mesas.map(m => (
                <button
                  key={m.id}
                  type="button"
                  title={`Mesa ${m.numero} · ${m.lugares} lugares`}
                  onClick={e => { e.stopPropagation(); setSelecionadaId(m.id === selecionadaId ? null : m.id); }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full font-bold text-sm shadow-md transition-all ${
                    m.id === selecionadaId ? 'bg-secondary text-on-secondary ring-4 ring-secondary/30 scale-110' : 'bg-primary text-on-primary hover:scale-105'
                  }`}
                  style={{ left: `${m.posX}%`, top: `${m.posY}%` }}
                >
                  {m.numero}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {erro && <p className="text-sm text-error bg-error-container/40 p-3 rounded-2xl">{erro}</p>}
            {selecionada ? (
              <form onSubmit={salvarSelecionada} className="space-y-4 p-4 rounded-2xl bg-surface-container-low">
                <h4 className="font-bold text-on-surface">Mesa {selecionada.numero}</h4>
                <div className="space-y-1">
                  <label htmlFor="mesa-numero" className="text-xs font-bold text-on-surface-variant px-3">Número</label>
                  <input id="mesa-numero" required maxLength={10}
                    className="w-full bg-surface border-none rounded-full py-2.5 px-4 focus:ring-2 focus:ring-primary"
                    value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="mesa-lugares" className="text-xs font-bold text-on-surface-variant px-3">Lugares</label>
                  <input id="mesa-lugares" type="number" min={1} max={50} required
                    className="w-full bg-surface border-none rounded-full py-2.5 px-4 focus:ring-2 focus:ring-primary"
                    value={form.lugares} onChange={e => setForm({ ...form, lugares: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 py-2.5 rounded-full bg-primary text-on-primary font-bold">Salvar</button>
                  <button type="button" onClick={removerSelecionada}
                    className="px-4 py-2.5 rounded-full text-error hover:bg-error/10 font-bold" aria-label="Remover mesa">
                    <span className="material-symbols-outlined align-middle">delete</span>
                  </button>
                </div>
                <button type="button" onClick={() => setSelecionadaId(null)} className="w-full text-xs text-on-surface-variant hover:underline">
                  Desmarcar (voltar a criar mesas)
                </button>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-surface-container-low text-sm text-on-surface-variant space-y-2">
                <p>Monte o salão uma vez: todo evento neste local usa este mapa no app do garçom.</p>
                <p>Mesas novas recebem o próximo número livre e 4 lugares; clique nelas para ajustar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
