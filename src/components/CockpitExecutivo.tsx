import React from 'react';
import {
  Anchor,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  Ship,
  TrendingUp,
  Truck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCockpitData } from '../hooks/useCockpitData';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

export const CockpitExecutivo: React.FC = () => {
  const { pranchaData, frotaData, loading, error } = useCockpitData();

  const totalNaviosAtivos = pranchaData.length;
  const pranchaMediaRealizada = pranchaData.length > 0
    ? (pranchaData.reduce((acc, curr) => acc + Number(curr.prancha_realizada_ton_h || 0), 0) / pranchaData.length).toFixed(1)
    : '0.0';
  const equipamentosInoperantes = frotaData.filter(
    (f) => f.status_atual === 'inoperante' || f.status_atual === 'manutencao_corretiva'
  ).length;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-6 space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Anchor className="h-7 w-7 text-blue-500" />
            Cockpit Executivo Operacional
          </h1>
          <p className="text-sm text-slate-400">Monitoramento de Prancha, Berços e Frota em Tempo Real</p>
        </div>

        <div className="flex items-center gap-3 no-print">
          <button
            type="button"
            onClick={() => exportToExcel(pranchaData, frotaData)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-500"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel (.csv)
          </button>

          <button
            type="button"
            onClick={exportToPDF}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-900/20 transition hover:bg-blue-500"
          >
            <FileText className="h-4 w-4" />
            Gerar Relatório PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">NAVIOS EM OPERAÇÃO</p>
              <p className="mt-1 text-3xl font-extrabold text-white">{totalNaviosAtivos}</p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-3 text-blue-400">
              <Ship className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">PRANCHA MÉDIA (TON/H)</p>
              <p className="mt-1 text-3xl font-extrabold text-emerald-400">{pranchaMediaRealizada}</p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">FROTA EM MANUTENÇÃO/PARADA</p>
              <p className="mt-1 text-3xl font-extrabold text-amber-400">{equipamentosInoperantes}</p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-3 text-amber-400">
              <Truck className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">EFICIÊNCIA GERAL (OEE)</p>
              <p className="mt-1 text-3xl font-extrabold text-blue-400">88.4%</p>
            </div>
            <div className="rounded-lg bg-indigo-500/10 p-3 text-indigo-400">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">Desempenho da Prancha Operacional por Navio</h2>
            <p className="text-xs text-slate-400">Comparativo directo de ritmo realizado versus meta do contrato</p>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">Carregando indicadores...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pranchaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="nome_navio" stroke="#64748b" fontSize={12} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Bar dataKey="meta_prancha_ton_h" name="Meta (Ton/h)" fill="#334155" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="prancha_realizada_ton_h" name="Realizado (Ton/h)" radius={[4, 4, 0, 0]}>
                    {pranchaData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.prancha_realizada_ton_h >= entry.meta_prancha_ton_h ? '#10b981' : '#f59e0b'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-1 text-base font-semibold text-white">Disponibilidade da Frota</h2>
          <p className="mb-4 text-xs text-slate-400">Monitoramento em tempo real de equipamentos</p>

          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {frotaData.map((item) => (
              <div key={item.equipamento_id} className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{item.tag}</p>
                  <p className="text-xs text-slate-500">{item.categoria}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      item.status_atual === 'em_uso'
                        ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        : item.status_atual === 'disponivel'
                          ? 'border border-blue-500/20 bg-blue-500/10 text-blue-400'
                          : 'border border-red-500/20 bg-red-500/10 text-red-400'
                    }`}
                  >
                    {item.status_atual.replace('_', ' ')}
                  </span>
                  {item.minutos_parado_hoje > 0 && (
                    <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      {Math.round(item.minutos_parado_hoje)}m parado
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-4 text-base font-semibold text-white">Matriz Executiva de Operações nos Berços</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950 text-[11px] font-semibold uppercase text-slate-400">
              <tr>
                <th className="p-3">Berço</th>
                <th className="p-3">Navio / IMO</th>
                <th className="p-3">Tipo Operação</th>
                <th className="p-3">Progresso</th>
                <th className="p-3 text-right">Meta (Ton/h)</th>
                <th className="p-3 text-right">Realizado (Ton/h)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {pranchaData.map((row) => (
                <tr key={row.operacao_id} className="transition-colors hover:bg-slate-800/30">
                  <td className="p-3 font-semibold text-blue-400">{row.berco_codigo}</td>
                  <td className="p-3">
                    <div className="font-medium text-white">{row.nome_navio}</div>
                    <div className="text-xs text-slate-500">{row.imo_number ?? '-'}</div>
                  </td>
                  <td className="p-3">
                    <span className="capitalize">{row.tipo_operacao}</span> ({row.tipo_carga})
                  </td>
                  <td className="w-48 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span>{row.percentual_concluido}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${Math.min(row.percentual_concluido, 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono">{row.meta_prancha_ton_h}</td>
                  <td className={`p-3 text-right font-mono font-bold ${row.prancha_realizada_ton_h >= row.meta_prancha_ton_h ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {row.prancha_realizada_ton_h}
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Em Ritmo
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};