import { useState, useEffect } from 'react';
import {
  ScatterChart, Scatter,
  AreaChart, Area,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../../services/api';
import useCoresDoTema from '../../hooks/useCoresDoTema';

// Os três gráficos têm uma única série cada, então não há paleta
// categórica: cada um usa uma marca de cor sólida derivada da identidade
// do buffet (tokens chart-*, garantidos em >= 3:1 contra a superfície).
//
// A versão anterior pintava cada barra de "Uso da Infraestrutura" com uma
// cor diferente de um array fixo. Isso codificava por cor uma identidade
// que o eixo X já dá — e as cores não acompanhavam o tema do cliente.

export default function DashboardCharts() {
  const [data, setData] = useState({ scatter: [], timeSeries: [], infra: [] });
  const [loading, setLoading] = useState(true);
  const cores = useCoresDoTema();

  useEffect(() => {
    api.get('/dashboard/charts').then(res => {
      setData(res.data?.data || { scatter: [], timeSeries: [], infra: [] });
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-center py-10 text-on-surface-variant">Carregando gráficos...</div>;
  }

  // Eixos e grade ficam recessivos: quem tem que saltar é o dado.
  const eixo = { fill: cores['on-surface-variant'], fontSize: 12 };
  const rotulo = { ...eixo, fontWeight: 'bold' };
  const grade = cores['outline-variant'];

  const estiloTooltip = {
    borderRadius: '12px',
    border: `1px solid ${cores['outline-variant']}`,
    background: cores.surface,
    color: cores['on-surface'],
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  };

  // Paleta de cores do gráfico alternando com base no padrão configurado pelo cliente
  const paletaGrafico = [
    cores['chart-1'],
    cores['chart-2'],
    cores['chart-3'],
    cores.secondary,
    cores.tertiary,
    cores.primary,
  ].filter(Boolean);

  const obterCorGrafico = (indice) => {
    if (!paletaGrafico.length) return cores['chart-1'] || '#1CEAFF';
    return paletaGrafico[indice % paletaGrafico.length];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* 1. Gráfico Temporal (Sazonalidade) */}
      <div className="bg-surface p-6 rounded-3xl editorial-shadow border border-outline-variant/10 h-[350px]">
        <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">Sazonalidade Anual</h3>
        {data.timeSeries.length === 0 ? (
          <div className="flex h-full items-center justify-center text-on-surface-variant">Sem dados para exibir</div>
        ) : (
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={data.timeSeries} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorEventos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cores['chart-1']} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={cores['chart-1']} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grade} />
              <XAxis dataKey="mes" tick={eixo} tickLine={false} axisLine={false} label={{ value: 'Mês do Evento', position: 'insideBottom', offset: -15, ...rotulo }} />
              <YAxis tick={eixo} tickLine={false} axisLine={false} allowDecimals={false} label={{ value: 'Qtd de Eventos', angle: -90, position: 'insideLeft', dx: -20, ...rotulo }} />
              <Tooltip
                contentStyle={estiloTooltip}
                itemStyle={{ color: cores['on-surface'], fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="eventos" name="Eventos" stroke={cores['chart-1']} strokeWidth={2} fillOpacity={1} fill="url(#colorEventos)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 2. Gráfico de Barras (Uso da Infraestrutura) */}
      <div className="bg-surface p-6 rounded-3xl editorial-shadow border border-outline-variant/10 h-[350px]">
        <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">Uso da Infraestrutura</h3>
        {data.infra.length === 0 ? (
          <div className="flex h-full items-center justify-center text-on-surface-variant">Sem dados para exibir</div>
        ) : (
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={data.infra} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grade} />
              <XAxis dataKey="name" tick={{ ...eixo, fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: 'Local', position: 'insideBottom', offset: -15, ...rotulo }} />
              <YAxis tick={eixo} tickLine={false} axisLine={false} allowDecimals={false} label={{ value: 'Qtd de Eventos', angle: -90, position: 'insideLeft', dx: -20, ...rotulo }} />
              <Tooltip
                formatter={(value) => [`${value} eventos`, 'Quantidade']}
                cursor={{ fill: cores['outline-variant'], fillOpacity: 0.25 }}
                contentStyle={estiloTooltip}
              />
              {/* As cores das barras alternam dinamicamente respeitando a paleta do tema configurado */}
              <Bar dataKey="value" name="Quantidade" radius={[4, 4, 0, 0]} maxBarSize={45}>
                {data.infra.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name || index}`}
                    fill={obterCorGrafico(index)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 3. Gráfico de Dispersão (Convidados x Custo) */}
      <div className="bg-surface p-6 rounded-3xl editorial-shadow border border-outline-variant/10 h-[350px] lg:col-span-2">
        <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">Correlação: Convidados x Custo Total</h3>
        {data.scatter.length === 0 ? (
          <div className="flex flex-col h-full items-center justify-center text-on-surface-variant p-6 text-center">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">link_off</span>
            <p className="text-sm">Para exibir este gráfico, certifique-se de cadastrar eventos preenchendo a <b>quantidade de pessoas</b> e vinculando a um <b>orçamento</b>.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="80%">
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grade} />
              <XAxis type="number" dataKey="convidados" name="Convidados" tick={eixo} tickLine={false} axisLine={false} label={{ value: 'Número de Convidados', position: 'insideBottom', offset: -15, ...rotulo }} />
              <YAxis type="number" dataKey="custo" name="Custo Total" unit=" R$" tick={eixo} tickLine={false} axisLine={false} label={{ value: 'Custo Total (R$)', angle: -90, position: 'insideLeft', dx: -40, ...rotulo }} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ payload }) => {
                  if (payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-surface text-on-surface p-3 rounded-xl shadow-lg border border-outline-variant">
                        <p className="font-bold">{d.nome}</p>
                        <p className="text-sm text-on-surface-variant">Convidados: {d.convidados}</p>
                        <p className="text-sm font-bold">Custo: R$ {d.custo.toLocaleString()}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Anel de superfície separa pontos sobrepostos com alternância de cores da marca */}
              <Scatter
                name="Festas"
                data={data.scatter}
                fillOpacity={0.85}
                stroke={cores.surface}
                strokeWidth={2}
              >
                {data.scatter.map((entry, index) => (
                  <Cell
                    key={`scatter-cell-${entry.nome || index}`}
                    fill={obterCorGrafico((index + 1) % (paletaGrafico.length || 1))}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
