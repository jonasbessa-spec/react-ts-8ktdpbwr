import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle, Download, Gauge, Printer, RefreshCw, Ship, Users, Wrench } from 'lucide-react';
import { useCockpitData } from '../hooks/useCockpitData';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { Card, CardHeader, EmptyState, ErrorState, KpiCard, LoadingState, tableClass } from './ui';
import type { OperationalDatabaseRow } from '../types';

const num = (value: unknown) => Number(value || 0);
const fmt = (value: unknown) => num(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const humanize = (value: unknown) => { const text = String(value || 'N/A').replace(/_/g, ' ').toLowerCase(); return text.charAt(0).toUpperCase() + text.slice(1); };
const isInoperante = (item: OperationalDatabaseRow) => /inoperante|manutencao|manuten|parad|indispon/i.test(String(item.status_atual ?? item.status ?? item.STATUS ?? ''));

export const CockpitExecutivo: React.FC = () => {
  const { colaboradores, colaboradoresSource, operacoes: pranchaData, frota, loading, error, reload, updatedAt } = useCockpitData();
  const [selectedNavioId, setSelectedNavioId] = useState<string>('');
  const [busca, setBusca] = useState('');

  const naviosAbaixoDaMeta = useMemo(
    () => pranchaData.filter((n) => num(n.meta_prancha_ton_h) > 0 && num(n.prancha_realizada_ton_h) < num(n.meta_prancha_ton_h)),
    [pranchaData]
  );
  const mediaPrancha = pranchaData.length
    ? pranchaData.reduce((acc, curr) => acc + num(curr.prancha_realizada_ton_h), 0) / pranchaData.length
    : 0;
  const frotaInoperante = frota.filter(isInoperante);
  const filtradas = pranchaData.filter((item) => String(item.nome_navio || '').toLowerCase().includes(busca.trim().toLowerCase()));
  const selectedId = selectedNavioId || pranchaData[0]?.operacao_id || '';

  if (loading && !updatedAt) return <LoadingState message="Carregando indicadores de produtividade..." />;

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-end gap-2">
        <input
          type="search"
          placeholder="Buscar navio..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400 sm:w-56"
        />
        <button type="button" onClick={reload} className="btn-secondary"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar</button>
        <button type="button" onClick={() => exportToExcel(pranchaData, frota)} disabled={!pranchaData.length} className="btn-secondary"><Download size={14} /> CSV</button>
        <button type="button" onClick={exportToPDF} className="btn-secondary"><Printer size={14} /> PDF</button>
      </div>
      {error && <ErrorState message={`Alguns indicadores não puderam ser atualizados: ${error}`} onRetry={reload} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Média prancha" value={fmt(mediaPrancha)} unit="ton/h" hint={`${pranchaData.length} operações`} icon={<Gauge size={16} />} tone="blue" />
        <KpiCard label="Abaixo da meta" value={naviosAbaixoDaMeta.length} hint="Realizado < meta" icon={<AlertTriangle size={16} />} tone={naviosAbaixoDaMeta.length ? 'red' : 'emerald'} />
        <KpiCard label="Colaboradores" value={colaboradores.length} hint={colaboradoresSource === 'supabase' ? 'SGO Unilink · ao vivo' : `Fallback: ${colaboradoresSource}`} icon={<Users size={16} />} tone="emerald" />
        <KpiCard label="Equip. inoperantes" value={frotaInoperante.length} hint={frota.length ? `de ${frota.length} no pátio` : 'Sem cadastro de pátio'} icon={<Wrench size={16} />} tone="amber" />
      </div>

      {naviosAbaixoDaMeta.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-red-200"><AlertTriangle size={16} /> Navios com produtividade abaixo da meta</h3>
          <ul className="grid gap-1 sm:grid-cols-2">
            {naviosAbaixoDaMeta.map((n) => (
              <li key={n.operacao_id || n.id} className="text-sm text-red-100/90">
                <strong>{n.nome_navio || 'Navio desconhecido'}</strong>: {fmt(n.prancha_realizada_ton_h)} de {fmt(n.meta_prancha_ton_h)} ton/h
                <span className="ml-1 text-red-300/80">({Math.round(num(n.prancha_realizada_ton_h) / num(n.meta_prancha_ton_h) * 100)}%)</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader title="Prancha realizada vs. meta" subtitle="Toneladas por hora, por navio" />
        <div className="p-4">
          {pranchaData.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pranchaData}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="nome_navio" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0f1d2f', border: '1px solid #28425f', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} cursor={{ fill: 'rgba(148,163,184,.08)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                  <Bar dataKey="prancha_realizada_ton_h" fill="#3b82f6" name="Realizada" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="meta_prancha_ton_h" fill="#475569" name="Meta" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <EmptyState message="Nenhuma operação de navio registrada." />}
        </div>
      </Card>

      <Card>
        <CardHeader title="Operações de navios" subtitle={`${filtradas.length} de ${pranchaData.length} operações`} icon={<Ship size={15} className="text-cyan-400" />} />
        {filtradas.length ? (
          <div className={tableClass.wrap}>
            <table className={tableClass.table}>
              <thead className={tableClass.thead}>
                <tr><th className={tableClass.th}>Navio</th><th className={tableClass.th}>Status</th><th className={tableClass.th}>Realizada</th><th className={tableClass.th}>Meta</th><th className={tableClass.th}>Concluído</th></tr>
              </thead>
              <tbody>
                {filtradas.map((row) => {
                  const pct = Math.min(100, num(row.percentual_concluido));
                  const below = num(row.meta_prancha_ton_h) > 0 && num(row.prancha_realizada_ton_h) < num(row.meta_prancha_ton_h);
                  const active = row.operacao_id && row.operacao_id === selectedId;
                  return (
                    <tr key={row.operacao_id || row.id} onClick={() => setSelectedNavioId(row.operacao_id ?? '')} className={`${tableClass.tr} cursor-pointer ${active ? 'bg-cyan-500/5' : ''}`}>
                      <td className={`${tableClass.td} font-semibold text-slate-100`}>{row.nome_navio || '-'}</td>
                      <td className={tableClass.td}><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">{humanize(row.status)}</span></td>
                      <td className={`${tableClass.td} tabular-nums ${below ? 'text-red-300' : 'text-emerald-300'}`}>{fmt(row.prancha_realizada_ton_h)} t/h</td>
                      <td className={`${tableClass.td} tabular-nums`}>{fmt(row.meta_prancha_ton_h)} t/h</td>
                      <td className={tableClass.td}>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${pct}%` }} /></div>
                          <span className="tabular-nums text-xs">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : <EmptyState message={busca ? 'Nenhum navio encontrado para a busca.' : 'Sem operações registradas.'} />}
      </Card>
    </div>
  );
};

export default CockpitExecutivo;
