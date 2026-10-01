import React, { useState } from 'react';
import { 
  Ship, 
  TrendingUp, 
  AlertTriangle, 
  Truck, 
  Anchor,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  BellRing,
  ArrowDownRight,
  DollarSign,
  PieChart as PieChartIcon,
  Sliders,
  Zap,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { useCockpitData } from '../hooks/useCockpitData';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

export const CockpitExecutivo: React.FC = () => {
  const { pranchaData, frotaData } = useCockpitData();

  // Estado para o Simulador de Cenários
  const [selectedNavioId, setSelectedNavioId] = useState<string>('');
  const [equipamentosAdicionais, setEquipamentosAdicionais] = useState<number>(1);
  const [ganhoPorEquipamento, setGanhoPorEquipamento] = useState<number>(150);

  // Navios críticos (Prancha Realizada < Meta)
  const naviosAbaixoDaMeta = pranchaData.filter(
    n => Number(n.prancha_realizada_ton_h) < Number(n.meta_prancha_ton_h)
  );

  const totalNaviosAtivos = pranchaData.length;
  const pranchaMediaRealizada = pranchaData.length > 0
    ? (pranchaData.reduce((acc, curr) => acc + Number(curr.prancha_realizada_ton_h), 0) / pranchaData.length).toFixed(1)
    : '0.0';

  const equipamentosInoperantes = frotaData.filter(
    f => f.status_atual === 'inoperante' || f.status_atual === 'manutencao_corretiva'
  ).length;

  // Cálculo Financeiro de Demurrage / Despatch
  const TAXA_DIARIA_DEMURRAGE_USD = 15000;
  let totalDemurrageProjetadoUSD = 0;
  let totalDespatchProjetadoUSD = 0;

  pranchaData.forEach(navio => {
    const meta = Number(navio.meta_prancha_ton_h);
    const realizado = Number(navio.prancha_realizada_ton_h);
    if (meta > 0 && realizado > 0) {
      const diferencaPercentual = (meta - realizado) / meta;
      const impactoFinanceiroDiario = diferencaPercentual * TAXA_DIARIA_DEMURRAGE_USD;

      if (impactoFinanceiroDiario > 0) {
        totalDemurrageProjetadoUSD += impactoFinanceiroDiario;
      } else {
        totalDespatchProjetadoUSD += Math.abs(impactoFinanceiroDiario) * 0.5;
      }
    }
  });

  // Dados de Causa-Raiz (Pareto)
  const causaRaizData = [
    { name: 'Manutenção Equip.', horas: 14.5, color: '#ef4444' },
    { name: 'Clima (Chuva/Vento)', horas: 8.0, color: '#f59e0b' },
    { name: 'Aguardando Pátio', horas: 5.2, color: '#3b82f6' },
    { name: 'Troca de Turno', horas: 2.1, color: '#10b981' },
  ];

  // Lógica do Simulador
  const navioSelecionadoSimulacao = pranchaData.find(
    n => n.operacao_id === (selectedNavioId || (pranchaData[0]?.operacao_id || ''))
  ) || pranchaData[0];

  const cargaRestanteEstimada = 12000;
  const pranchaAtual = Number(navioSelecionadoSimulacao?.prancha_realizada_ton_h || 300);
  const pranchaSimulada = pranchaAtual + (equipamentosAdicionais * ganhoPorEquipamento);

  const horasAtuaisRestantes = pranchaAtual > 0 ? (cargaRestanteEstimada / pranchaAtual) : 0;
  const horasSimuladasRestantes = pranchaSimulada > 0 ? (cargaRestanteEstimada / pranchaSimulada) : 0;
  const horasEconomizadas = Math.max(0, horasAtuaisRestantes - horasSimuladasRestantes);
  const economiaUSD = (horasEconomizadas / 24) * TAXA_DIARIA_DEMURRAGE_USD;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-6 space-y-6">
      
      {/* HEADER DA DIRETORIA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Anchor className="h-7 w-7 text-blue-500" />
            Cockpit Executivo Operacional & Financeiro
          </h1>
          <p className="text-sm text-slate-400">Prancha de Carregamento, Análise Financeira e OEE do Porto</p>
        </div>
        
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

      {/* BANNER DE ALERTA CRÍTICO */}
      {naviosAbaixoDaMeta.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-pulse flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg shadow-red-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/20 rounded-lg text-red-400 shrink-0">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-200">
                Atenção: {naviosAbaixoDaMeta.length} {naviosAbaixoDaMeta.length === 1 ? 'operação está' : 'operações estão'} abaixo da meta de prancha contratual!
              </h3>
              <p className="text-xs text-red-300/80 mt-0.5">
                Risco de incidência de Demurrage (multa por estadia excessiva).
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {naviosAbaixoDaMeta.map((n) => (
              <span key={n.operacao_id} className="px-2.5 py-1 bg-red-950/80 border border-red-500/40 text-red-300 rounded-md text-xs font-mono font-semibold flex items-center gap-1">
                <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
                {n.berco_codigo}: {n.nome_navio} ({n.prancha_realizada_ton_h}/{n.meta_prancha_ton_h} t/h)
              </span>
            ))}
          </div>
        </div>
      )}

      {/* KPIS TÁTICOS E FINANCEIROS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">NAVIOS ATIVOS</p>
            <p className="text-3xl font-extrabold text-white mt-1">{totalNaviosAtivos}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
            <Ship className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">PRANCHA MÉDIA</p>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1">{pranchaMediaRealizada} <span className="text-xs font-normal text-slate-400">t/h</span></p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">RISCO DEMURRAGE</p>
            <p className="text-2xl font-extrabold text-red-400 mt-1">
              USD {totalDemurrageProjetadoUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg text-red-400">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">BÔNUS DESPATCH</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">
              USD {totalDespatchProjetadoUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">FROTA INOPERANTE</p>
            <p className="text-3xl font-extrabold text-amber-400 mt-1">{equipamentosInoperantes}</p>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400">
            <Truck className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* SIMULADOR DE SCENARIOS */}
      {navioSelecionadoSimulacao && (
        <div className="bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-slate-900/80 border border-blue-500/30 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-bold text-white">Simulador de Incremento de Prancha e Alocação de Guindastes</h2>
            </div>
            <span className="text-xs px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full font-mono">
              Análise Preditiva
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Selecione o Navio para Simulação</label>
                <select
                  value={selectedNavioId || navioSelecionadoSimulacao.operacao_id}
                  onChange={(e) => setSelectedNavioId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {pranchaData.map((n) => (
                    <option key={n.operacao_id} value={n.operacao_id}>
                      {n.berco_codigo} - {n.nome_navio} ({n.prancha_realizada_ton_h} t/h)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">Guindastes/Equipamentos Extras</span>
                  <span className="text-blue-400 font-bold font-mono">+{equipamentosAdicionais} un.</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={equipamentosAdicionais}
                  onChange={(e) => setEquipamentosAdicionais(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Ganho Estimado por Equipamento (Ton/h)</label>
                <input
                  type="number"
                  value={ganhoPorEquipamento}
                  onChange={(e) => setGanhoPorEquipamento(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg p-2 font-mono"
                />
              </div>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Prancha Atual</span>
                <span className="font-mono text-slate-200 font-semibold">{pranchaAtual} ton/h</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Prancha Projetada</span>
                <span className="font-mono text-emerald-400 font-bold">{pranchaSimulada} ton/h</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Permanência Atual</span>
                <span className="font-mono text-slate-200">{horasAtuaisRestantes.toFixed(1)} h</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Permanência Projetada</span>
                <span className="font-mono text-blue-400 font-bold">{horasSimuladasRestantes.toFixed(1)} h</span>
              </div>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 p-5 rounded-xl flex flex-col justify-between h-full">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Zap className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Impacto do Redirecionamento</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                  <p className="text-2xl font-extrabold text-white font-mono">
                    -{horasEconomizadas.toFixed(1)} <span className="text-sm text-slate-300 font-normal">horas no berço</span>
                  </p>
                </div>

                <div className="flex items-baseline gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
                  <p className="text-2xl font-extrabold text-emerald-400 font-mono">
                    USD {economiaUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 mt-3 italic">
                Aceleração do berço {navioSelecionadoSimulacao.berco_codigo} liberando janela operacional antecipada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">Desempenho da Prancha Operacional por Navio</h2>
            <p className="text-xs text-slate-400">Comparativo Meta vs. Realizado (Ton/Hora)</p>
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
                      fill={entry.prancha_realizada_ton_h >= entry.meta_prancha_ton_h ? '#10b981' : '#ef4444'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-amber-400" />
              Causa-Raiz das Paradas
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Distribuição das horas paradas no turno</p>
          </div>

          <div className="h-48 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={causaRaizData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="horas"
                >
                  {causaRaizData.map((entry, index) => (
                    <Cell key={`cell-pie-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  formatter={(value: any) => [`${value} horas`, 'Tempo Parado']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            {causaRaizData.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-slate-300">{c.name}</span>
                </div>
                <span className="font-mono font-semibold text-slate-200">{c.horas}h</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MATRIZ DE ATRACAÇÃO */}
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
              {pranchaData.map((row) => {
                const abaixoDaMeta = Number(row.prancha_realizada_ton_h) < Number(row.meta_prancha_ton_h);

                return (
                  <tr key={row.operacao_id} className={`transition-colors ${abaixoDaMeta ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-slate-800/30'}`}>
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
                          className={`h-2 rounded-full transition-all duration-500 ${abaixoDaMeta ? 'bg-red-500' : 'bg-blue-500'}`} 
                          style={{ width: `${Math.min(row.percentual_concluido, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono">{row.meta_prancha_ton_h}</td>
                    <td className={`p-3 text-right font-mono font-bold ${abaixoDaMeta ? 'text-red-400' : 'text-emerald-400'}`}>
                      {row.prancha_realizada_ton_h}
                    </td>
                    <td className="p-3 text-center">
                      {abaixoDaMeta ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 font-medium rounded">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Abaixo da Meta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-medium rounded">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Em Ritmo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};