import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const num = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/**
 * Produtos reservados para o evento. É o que a cozinha vê na aba
 * "Estoque" do app Celebri Staff, com alerta de estoque baixo.
 */
export default function ProdutosEventoModal({ evento, onClose }) {
  const [itens, setItens] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [form, setForm] = useState({ produtoId: '', quantidade: '' });
  const [editando, setEditando] = useState({});
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const { data: res } = await api.get(`/eventos/${evento.id}/produtos`);
      setItens(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setErro(err.response?.data?.message || 'Erro ao carregar os produtos do evento.');
    }
  }, [evento.id]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    api.get('/produtos', { params: { page: 1, limit: 100 } })
      .then(({ data: res }) => setProdutos(Array.isArray(res.data) ? res.data : []))
      .catch(() => setErro('Erro ao carregar a lista de produtos do estoque.'));
  }, []);

  const produtoSelecionado = produtos.find(p => p.id === form.produtoId);

  const adicionar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      await api.post(`/eventos/${evento.id}/produtos`, {
        produtoId: form.produtoId,
        quantidade: Number(form.quantidade),
      });
      setForm({ produtoId: '', quantidade: '' });
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.message || 'Não foi possível adicionar.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarQuantidade = async (item) => {
    const valor = editando[item.id];
    if (valor === undefined || Number(valor) === Number(item.quantidade)) return;
    setErro(null);
    try {
      await api.put(`/evento-produtos/${item.id}`, { quantidade: Number(valor) });
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.message || 'Não foi possível atualizar a quantidade.');
    } finally {
      setEditando(({ [item.id]: _descartado, ...resto }) => resto);
    }
  };

  const remover = async (id) => {
    try {
      await api.delete(`/evento-produtos/${id}`);
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.message || 'Não foi possível remover.');
    }
  };

  return (
    <div className="fixed inset-0 bg-on-surface/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in" onClick={onClose}>
      <div role="dialog" aria-label="Produtos do evento"
        className="bg-surface rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/20">
          <div>
            <h3 className="text-xl font-headline font-extrabold text-on-surface">Produtos do evento</h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {evento.nome} · aparecem na aba Estoque da cozinha no app
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full" aria-label="Fechar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <form onSubmit={adicionar} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-7 space-y-1">
              <label htmlFor="evp-produto" className="text-xs font-bold text-on-surface-variant px-3">Produto do estoque *</label>
              <select id="evp-produto" required
                className="w-full bg-surface-container-low border-none rounded-full py-2.5 px-4 focus:ring-2 focus:ring-tertiary text-sm"
                value={form.produtoId} onChange={e => setForm({ ...form, produtoId: e.target.value })}>
                <option value="">Selecione…</option>
                {produtos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({num(p.quantidade)} {p.unidadeMedida || 'un'} em estoque)
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-7 sm:col-span-3 space-y-1">
              <label htmlFor="evp-qtd" className="text-xs font-bold text-on-surface-variant px-3">
                Qtd. reservada{produtoSelecionado ? ` (${produtoSelecionado.unidadeMedida || 'un'})` : ''} *
              </label>
              <input id="evp-qtd" type="number" min={0.01} step="any" required
                className="w-full bg-surface-container-low border-none rounded-full py-2.5 px-4 focus:ring-2 focus:ring-tertiary text-sm"
                value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} />
            </div>
            <button type="submit" disabled={salvando} aria-label="Adicionar produto ao evento"
              className="col-span-5 sm:col-span-2 h-10 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center gap-1 font-bold text-sm disabled:opacity-50">
              <span className="material-symbols-outlined">add</span>
            </button>
          </form>

          {erro && <p className="text-sm text-error">{erro}</p>}

          {itens.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-6">Nenhum produto reservado para este evento.</p>
          ) : (
            <ul className="space-y-2">
              {itens.map(item => {
                const p = item.produto || {};
                const unidade = p.unidadeMedida || 'un';
                const baixo = Number(p.quantidade) <= Number(p.estoqueMinimo);
                return (
                  <li key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-surface-container-low">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-on-surface truncate">{p.nome || 'Produto removido'}</p>
                        {baixo && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-error/10 text-error shrink-0">Estoque baixo</span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Em estoque: {num(p.quantidade)} {unidade} (mín. {num(p.estoqueMinimo)})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input type="number" min={0.01} step="any" aria-label={`Quantidade reservada de ${p.nome}`}
                        className="w-24 bg-surface border border-outline-variant/40 rounded-full py-1.5 px-3 text-sm text-right focus:ring-2 focus:ring-tertiary"
                        value={editando[item.id] ?? Number(item.quantidade)}
                        onChange={e => setEditando({ ...editando, [item.id]: e.target.value })}
                        onBlur={() => salvarQuantidade(item)}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
                      <span className="text-xs text-on-surface-variant w-8">{unidade}</span>
                      <button onClick={() => remover(item.id)} title="Remover do evento"
                        className="p-2 rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error">
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
