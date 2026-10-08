import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers3, RefreshCw, Search, Truck, Wrench } from 'lucide-react';
import { getDadosIntegrados } from './lib/frotasService';
import { getSupabaseErrorMessage } from './lib/supabase';
import ExecutiveOverview from './components/ExecutiveOverview';
import { Card, CardHeader, EmptyState, ErrorState, LoadingState, tableClass } from './components/ui';
import { cn } from './lib/utils';
import type { OperationalDatabaseRow } from './types';

type Row = OperationalDatabaseRow;
type Tab = 'cm' | 'sr' | 'patio';

const pickText = (row: Row, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
};
const frota = (row: Row) => pickText(row, ['FROTA', 'frota', 'tag', 'codigo', 'placa', 'id']);
const local = (row: Row) => pickText(row, ['LOCALIZAÇÃO', 'LOCALIZACAO', 'localizacao', 'local', 'area']);
const tipo = (row: Row) => pickText(row, ['TIPO', 'tipo', 'categoria', 'modelo']);
const atividade = (row: Row) => pickText(row, ['ATIVIDADE', 'ATIVADE', 'atividade']);
const status = (row: Row) => pickText(row, ['STATUS', 'status', 'status_atual']) || 'Não informado';
export const isAvailable = (row: Row) => !/manuten|parad|indispon|inoperant|quebr|avaria|baixad/i.test(status(row));

const tabs: Array<{ id: Tab; label: string; icon: typeof Truck }> = [
  { id: 'cm', label: 'Cavalos mecânicos', icon: Truck },
  { id: 'sr', label: 'Semirreboques', icon: Layers3 },
  { id: 'patio', label: 'Equipamentos de pátio', icon: Wrench },
];

export function Dashboard() {
  const [dados, setDados] = useState<{ cm: Row[]; sr: Row[]; patio: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('cm');
  const [busca, setBusca] = useState('');
  const [localizacao, setLocalizacao] = useState('TODAS');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getDadosIntegrados();
    setDados({ cm: res.cm, sr: res.sr, patio: res.patio });
    setError(res.error && !res.cm.length && !res.sr.length && !res.patio.length ? getSupabaseErrorMessage(res.error) : null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const lista = dados?.[tab] ?? [];
  const locais = useMemo(() => [...new Set(lista.map(local).filter(Boolean))].sort(), [lista]);
  const filtrada = useMemo(() => lista.filter((row) => {
    const termo = busca.trim().toLowerCase();
    const matchBusca = !termo || `${frota(row)} ${tipo(row)} ${local(row)} ${atividade(row)}`.toLowerCase().includes(termo);
    return matchBusca && (localizacao === 'TODAS' || local(row) === localizacao);
  }), [busca, lista, localizacao]);

  if (loading && !dados) return <LoadingState message="Carregando frota e equipamentos..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const cm = dados?.cm ?? [];
  const sr = dados?.sr ?? [];
  const patio = dados?.patio ?? [];
  const dispCM = cm.filter(isAvailable).length;
  const dispSR = sr.filter(isAvailable).length;
  const dispPatio = patio.filter(isAvailable).length;
  const perc = (part: number, total: number) => (total ? Math.round(part / total * 100) : 0);

  return (
    <div className="space-y-6">
      <ExecutiveOverview
        totalCM={cm.length} dispCM={dispCM}
        totalSR={sr.length} dispSR={dispSR}
        totalPatio={patio.length} dispPatio={dispPatio}
        conjuntosProntos={Math.min(dispCM, dispSR)}
        percCM={perc(dispCM, cm.length)} percSR={perc(dispSR, sr.length)} percPatio={perc(dispPatio, patio.length)}
      />

      <Card>
        <CardHeader
          title="Cadastro de frota"
          subtitle={`${filtrada.length} de ${lista.length} registros`}
          action={<button type="button" onClick={load} className="btn-secondary"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar</button>}
        />
        <div className="flex flex-col gap-3 border-b border-slate-800/80 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-950/60 p-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => { setTab(id); setLocalizacao('TODAS'); }}
                className={cn('flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition', tab === id ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200')}
              >
                <Icon size={13} /> {label} <span className="opacity-70">({dados?.[id].length ?? 0})</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={localizacao} onChange={(e) => setLocalizacao(e.target.value)} className="input">
              <option value="TODAS">Todas as localizações</option>
              {locais.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="input flex items-center gap-2">
              <Search size={14} className="text-slate-500" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar frota, tipo..." className="w-full bg-transparent outline-none placeholder:text-slate-600" />
            </label>
          </div>
        </div>
        {filtrada.length ? (
          <div className={cn(tableClass.wrap, 'max-h-[520px] overflow-y-auto')}>
            <table className={tableClass.table}>
              <thead className={cn(tableClass.thead, 'sticky top-0 bg-slate-900')}>
                <tr><th className={tableClass.th}>Frota</th><th className={tableClass.th}>Tipo</th><th className={tableClass.th}>Atividade</th><th className={tableClass.th}>Localização</th><th className={tableClass.th}>Status</th></tr>
              </thead>
              <tbody>
                {filtrada.map((row, idx) => (
                  <tr key={String(row.id ?? `${frota(row)}-${idx}`)} className={tableClass.tr}>
                    <td className={cn(tableClass.td, 'font-mono font-semibold text-cyan-300')}>{frota(row) || '—'}</td>
                    <td className={tableClass.td}>{tipo(row) || '—'}</td>
                    <td className={tableClass.td}>{atividade(row) || '—'}</td>
                    <td className={tableClass.td}>{local(row) || '—'}</td>
                    <td className={tableClass.td}>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', isAvailable(row) ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300')}>{status(row)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message={lista.length ? 'Nenhum registro corresponde aos filtros.' : 'Nenhum registro cadastrado nesta categoria.'} />}
      </Card>
    </div>
  );
}

export default Dashboard;
