import React from 'react';
import { 
  Ship, 
  TrendingUp, 
  AlertTriangle, 
  Truck, 
  Clock, 
  Anchor,
  CheckCircle2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useCockpitData } from './useCockpitData';

export const CockpitExecutivo: React.FC = () => {
  const { pranchaData, frotaData, loading } = useCockpitData();

  // Métricas Consolidadas Executivas
  const totalNaviosAtivos = pranchaData.length;
  const pranchaMediaRealizada = pranchaData.length > 0
    ? (pranchaData.reduce((acc, curr) => acc + Number(curr.prancha_realizada_ton_h), 0) / pranchaData.length).toFixed(1)
    : '0.0';

  const equipamentosInoperantes = frotaData.filter(f => f.status_atual === 'inoperante' || f.status_atual === 'manutencao_corretiva').length;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-6 space-y-6">
      
      {/* HEADER DA DIRETORIA / OPERAÇÃO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-[#38bdf8] items-center gap-2">
            <Anchor className="h-7 w-7 text-blue-500" />
            Cockpit Executivo Operacional
          </h1>
          <p className="text-sm text-slate-400">Monitoramento de Prancha, Berços e Frota em Tempo Real</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Supabase Realtime Ativo
          </span>
        </div>
      </div>

      {/* CARDS DE KPIS DE ALTO NÍVEL */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">NAVIOS EM OPERAÇÃO</p>
            <p className="text-3xl font-extrabold text-white mt-1">{totalNaviosAtivos}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
            <Ship className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">PRANCHA MÉDIA (TON/H)</p>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1">{pranchaMediaRealizada}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">FROTA EM MANUTENÇÃO/PARADA</p>
            <p className="text-3xl font-extrabold text-amber-400 mt-1">{equipamentosInoperantes}</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
            <Truck className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">EFICIÊNCIA GERAL (OEE)</p>
            <p className="text-3xl font-extrabold text-blue-400 mt-1">88.4%</p>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
            <Clock className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: GRÁFICO COMPARATIVO E TABELA DE BERÇOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO DE PRANCHA OPERACIONAL (META VS REALIZADO) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">Desempenho da Prancha Operacional por Navio</h2>
            <p className="text-xs text-slate-400">Comparativo direto de Ritmo Realizado (Ton/h) vs. Meta do Contrato</p>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pranchaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="nome_navio" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
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
          </div>
        </div>

        {/* STATUS RÁPIDO DA FROTA / DISPONIBILIDADE */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <h2 className="text-base font-semibold text-white mb-1">Disponibilidade da Frota</h2>
          <p className="text-xs text-slate-400 mb-4">Monitoramento em tempo real de equipamentos</p>
          
          <div className="space-y-3 overflow-y-auto max-h-64 pr-1">
            {frotaData.map((item) => (
              <div key={item.equipamento_id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{item.tag}</p>
                  <p className="text-xs text-slate-500">{item.categoria}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                    item.status_atual === 'em_uso' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    item.status_atual === 'disponivel' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {item.status_atual.replace('_', ' ')}
                  </span>
                  {item.minutos_parado_hoje > 0 && (
                    <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1 justify-end">
                      <AlertTriangle className="h-3 w-3" /> {Math.round(item.minutos_parado_hoje)}m parado
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* MATRIZ DE ATRACAÇÃO E DETALHAMENTO DE OPERAÇÕES */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Matriz Executiva de Operações nos Berços</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
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
                <tr key={row.operacao_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-semibold text-blue-400">{row.berco_codigo}</td>
                  <td className="p-3">
                    <div className="font-medium text-white">{row.nome_navio}</div>
                    <div className="text-xs text-slate-500">{row.imo_number}</div>
                  </td>
                  <td className="p-3">
                    <span className="capitalize">{row.tipo_operacao}</span> ({row.tipo_carga})
                  </td>
                  <td className="p-3 w-48">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{row.percentual_concluido}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(row.percentual_concluido, 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono">{row.meta_prancha_ton_h}</td>
                  <td className={`p-3 text-right font-mono font-bold ${
                    row.prancha_realizada_ton_h >= row.meta_prancha_ton_h ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {row.prancha_realizada_ton_h}
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
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
};import React from 'react';
import { 
  Ship, 
  TrendingUp, 
  AlertTriangle, 
  Truck, 
  Clock, 
  Anchor,
  CheckCircle2,
  FileSpreadsheet,  // Ícone Excel
  FileText           // Ícone PDF
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { useCockpitData } from '../hooks/useCockpitData';

export const CockpitExecutivo: React.FC = () => {
  const { pranchaData, frotaData, loading } = useCockpitData();

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-6 space-y-6">
      
      {/* HEADER DA DIRETORIA COM BOTÕES DE EXPORTAÇÃO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Anchor className="h-7 w-7 text-blue-500" />
            Cockpit Executivo Operacional
          </h1>
          <p className="text-sm text-slate-400">Monitoramento de Prancha, Berços e Frota em Tempo Real</p>
        </div>
        
        {/* BOTÕES DE EXPORTAÇÃO (CLASSE no-print OCULTA ELES NO PDF) */}
        <div className="flex items-center gap-3 no-print">
          <button
            onClick={() => exportToExcel(pranchaData, frotaData)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-lg shadow-emerald-900/20"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel (.csv)
          </button>

          <button
            onClick={() => exportToPDF()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all shadow-lg shadow-blue-900/20"
          >
            <FileText className="h-4 w-4" />
            Gerar Relatório PDF
          </button>
        </div>
      </div>

      {/* CONTEÚDO DO DASHBOARD (CARDS, GRÁFICOS E TABELAS) PERMANECE AQUI */}
      
    </div>
  );
};