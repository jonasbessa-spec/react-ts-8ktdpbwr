import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Anchor,
  CheckCircle2,
  Download,
  Filter,
  Gauge,
  RefreshCw,
  Search,
  Ship,
  Timer,
  Truck,
} from 'lucide-react';
import { useCockpitData } from '../hooks/useCockpitData';

const formatNumber = (value: number, digits = 0) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value);

const csvValue = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function PlanejamentoOperacional() {
  const { pranchaData, frotaData, loading, error, refetch } = useCockpitData();
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('TODOS');

  const operacoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pranchaData.filter((item) => {
      const texto = `${item.nome_navio} ${item.berco_codigo} ${item.tipo_operacao} ${item.tipo_carga}`.toLowerCase();
      const progresso = Number(item.percentual_concluido || 0);
      const status = progresso >= 100 ? 'CONCLUÍDA' : progresso >= 70 ? 'AVANÇADA' : 'EM ANDAMENTO';
      return (!termo || texto.includes(termo)) && (filtroStatus === 'TODOS' || status === filtroStatus);
    });
  }, [busca, filtroStatus, pranchaData]);

  const resumo = useMemo(() => {
    const total = pranchaData.length;
    const concluido = pranchaData.filter((item) => Number(item.percentual_concluido || 0) >= 100).length;
    const emRisco = pranchaData.filter(
      (item) => Number(item.prancha_realizada_ton_h || 0) < Number(item.meta_prancha_ton_h || 0)
    ).length;
    const media = total
      ? pranchaData.reduce((sum, item) => sum + Number(item.prancha_realizada_ton_h || 0), 0) / total
      : 0;
    const frotaDisponivel = frotaData.filter((item) =>
      ['disponivel', 'em_uso'].includes(String(item.status_atual).toLowerCase())
    ).length;
    return { total, concluido, emRisco, media, frotaDisponivel };
  }, [frotaData, pranchaData]);

  const exportarPlanejamento = () => {
    if (!operacoes.length) return;
    const headers = ['Navio', 'Berço', 'Operação', 'Carga', 'Meta ton/h', 'Realizado ton/h', 'Progresso'];
    const rows = operacoes.map((item) => [
      item.nome_navio,
      item.berco_codigo,
      item.tipo_operacao,
      item.tipo_carga,
      item.meta_prancha_ton_h,
      item.prancha_realizada_ton_h,
      `${item.percentual_concluido}%`,
    ]);
    const blob = new Blob(
      [[headers, ...rows].map((row) => row.map(csvValue).join(';')).join('\n')],
      { type: 'text/csv;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planejamento-operacional-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="space-y-4" aria-label="Planejamento operacional">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700">
            <Anchor size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Planejamento operacional</h3>
            <p className="text-xs font-medium text-slate-500">Navios, berços, ritmo de prancha e disponibilidade da frota</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refetch}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-500 hover:text-blue-700"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          <button
            type="button"
            onClick={exportarPlanejamento}
            disabled={!operacoes.length}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={14} /> Exportar planejamento
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Operações ativas', value: resumo.total, icon: Ship, color: 'text-blue-700 bg-blue-100' },
          { label: 'Concluídas', value: resumo.concluido, icon: CheckCircle2, color: 'text-emerald-700 bg-emerald-100' },
          { label: 'Abaixo da meta', value: resumo.emRisco, icon: AlertTriangle, color: 'text-amber-700 bg-amber-100' },
          { label: 'Média ton/h', value: formatNumber(resumo.media, 1), icon: Gauge, color: 'text-indigo-700 bg-indigo-100' },
          { label: 'Frota disponível/uso', value: resumo.frotaDisponivel, icon: Truck, color: 'text-violet-700 bg-violet-100' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-lg p-2 ${color}`}><Icon size={16} /></span>
              <span className="text-2xl font-black text-slate-900">{value}</span>
            </div>
            <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-700">
            <Filter size={15} className="text-indigo-700" /> Fila de operações e berços
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3">
              <Search size={14} className="text-slate-400" />
              <input
                id="planejamento-busca"
                name="planejamentoBusca"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar navio, berço ou carga"
                className="w-full bg-transparent py-2 text-xs font-semibold outline-none"
              />
            </label>
            <select
              id="planejamento-status"
              name="planejamentoStatus"
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold outline-none"
            >
              <option value="TODOS">Todos os status</option>
              <option value="EM ANDAMENTO">Em andamento</option>
              <option value="AVANÇADA">Avançadas</option>
              <option value="CONCLUÍDA">Concluídas</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Navio / berço</th>
                <th className="p-3">Operação</th>
                <th className="p-3">Ritmo</th>
                <th className="p-3">Progresso</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {operacoes.map((item) => {
                const progresso = Math.min(Number(item.percentual_concluido || 0), 100);
                const abaixoDaMeta = Number(item.prancha_realizada_ton_h || 0) < Number(item.meta_prancha_ton_h || 0);
                return (
                  <tr key={item.operacao_id} className="transition hover:bg-slate-50">
                    <td className="p-3">
                      <p className="font-black text-slate-900">{item.nome_navio}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-slate-500"><Anchor size={12} /> {item.berco_codigo}</p>
                    </td>
                    <td className="p-3 font-semibold capitalize text-slate-700">{item.tipo_operacao} · {item.tipo_carga}</td>
                    <td className={`p-3 font-black ${abaixoDaMeta ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {formatNumber(Number(item.prancha_realizada_ton_h || 0), 1)} / {formatNumber(Number(item.meta_prancha_ton_h || 0), 1)} ton/h
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-indigo-600" style={{ width: `${progresso}%` }} />
                        </div>
                        <span className="font-bold text-slate-700">{formatNumber(progresso, 0)}%</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${abaixoDaMeta ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {abaixoDaMeta ? <Timer size={12} /> : <CheckCircle2 size={12} />}
                        {abaixoDaMeta ? 'Atenção' : 'No ritmo'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!loading && !operacoes.length && (
                <tr><td colSpan={5} className="p-8 text-center font-semibold text-slate-500">Nenhuma operação encontrada para os filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
