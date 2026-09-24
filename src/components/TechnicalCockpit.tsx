import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Clock3, Database, Gauge, Loader2, Radio, Ship, Users, Wrench } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase, supabaseConfigured } from '../lib/supabase';

type Row = Record<string, unknown>;
const BERTHS = ['05', '06', '07', '08'];
const COLORS = ['#2563eb', '#0ea5e9', '#14b8a6', '#f59e0b'];
const text = (row: Row, keys: string[]) => keys.map((key) => row[key]).find((value) => value !== undefined && value !== null && value !== '')?.toString() || '';
const number = (row: Row, keys: string[]) => Number(text(row, keys)) || 0;
const emptyMessage = 'Sem dados reais disponíveis para este indicador.';
const periodBounds = (period: string) => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === 'semana') start.setDate(start.getDate() - 6);
  if (period === 'mes') start.setDate(1);
  return { start: start.toISOString(), end: new Date(now.getTime() + 86400000).toISOString() };
};
const dateKey = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export default function TechnicalCockpit({ period }: { period: string }) {
  const [ships, setShips] = useState<Row[]>([]);
  const [people, setPeople] = useState<Row[]>([]);
  const [equipment, setEquipment] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); setError('Supabase não configurado.'); return; }
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      const bounds = periodBounds(period);
      const results = await Promise.all([
        supabase.from('previsao_navios').select('*').in('berco_programado', BERTHS).gte('eta', bounds.start).lt('eta', bounds.end),
        supabase.from('colaboradores').select('*'),
        supabase.from('equipamentos_patio').select('*')
      ]);
      if (!active) return;
      const firstError = results.find((result) => result.error)?.error;
      if (firstError) setError(firstError.message);
      setShips((results[0].data || []).filter((row) => !/container|porta[- ]?conteiner/i.test(text(row, ['tipo_carga', 'carga']))));
      setPeople(results[1].data || []); setEquipment(results[2].data || []); setLoading(false);
    };
    load();
    const channel = supabase.channel('technical-cockpit-live').on('postgres_changes', { event: '*', schema: 'public' }, load).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [period]);

  const berthData = useMemo(() => {
    const grouped = new Map<string, Record<string, number | string>>();
    ships.forEach((row) => {
      const day = dateKey(text(row, ['eta', 'atualizado_em']));
      const berth = text(row, ['berco_programado', 'berco']);
      if (!day || !BERTHS.includes(berth)) return;
      const current = grouped.get(day) || { day };
      current[`berco${berth}`] = Number(current[`berco${berth}`] || 0) + number(row, ['quantidade_toneladas', 'volume_toneladas']);
      current.navios = Number(current.navios || 0) + 1;
      grouped.set(day, current);
    });
    return Array.from(grouped.values()).sort((a, b) => String(a.day).localeCompare(String(b.day)));
  }, [ships]);
  const berthTotals = useMemo(() => BERTHS.map((berth) => ({
    berth: `B${berth}`,
    volume: ships.filter((row) => text(row, ['berco_programado', 'berco']) === berth).reduce((sum, row) => sum + number(row, ['quantidade_toneladas', 'volume_toneladas']), 0),
    navios: ships.filter((row) => text(row, ['berco_programado', 'berco']) === berth).length
  })), [ships]);
  const averageThroughput = useMemo(() => {
    const values = ships.map((row) => {
      const volume = number(row, ['quantidade_toneladas', 'volume_toneladas']);
      const hours = (new Date(text(row, ['etd'])).getTime() - new Date(text(row, ['eta'])).getTime()) / 3600000;
      return volume > 0 && Number.isFinite(hours) && hours > 0 ? volume / hours : 0;
    }).filter(Boolean);
    return values.length ? `${Math.round(values.reduce((sum, value) => sum + value, 0) / values.length).toLocaleString('pt-BR')} ` : '--';
  }, [ships]);
  const turnaround = useMemo(() => {
    const values = ships.map((row) => (new Date(text(row, ['etd'])).getTime() - new Date(text(row, ['eta'])).getTime()) / 3600000).filter((value) => Number.isFinite(value) && value >= 0);
    return values.length ? `${(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)} h` : '--';
  }, [ships]);
  const activeEquipment = equipment.filter((row) => !/manuten|parad|indispon/i.test(text(row, ['status'])));
  const fleetAvailability = equipment.length ? `${Math.round(activeEquipment.length / equipment.length * 100)}%` : '--';
  const occupancy = ships.length ? `${Math.round(ships.filter((row) => /operacao|atracad/i.test(text(row, ['status']))).length / ships.length * 100)}%` : '--';
  const cargoData = useMemo(() => Object.entries(ships.reduce<Record<string, number>>((result, row) => { const cargo = text(row, ['tipo_carga', 'carga']) || 'Não informado'; if (!/container|porta[- ]?conteiner/i.test(cargo)) result[cargo] = (result[cargo] || 0) + number(row, ['quantidade_toneladas', 'volume_toneladas']); return result; }, {})).map(([name, value], index) => ({ name, value, color: COLORS[index % COLORS.length] })), [ships]);
  const allocation = useMemo(() => [...new Set(equipment.map((row) => text(row, ['categoria', 'area']) || 'Não informado'))].map((area) => ({ area, equipamentos: equipment.filter((row) => (text(row, ['categoria', 'area']) || 'Não informado') === area && !/manuten|parad|indispon/i.test(text(row, ['status']))).length, colaboradores: people.filter((row) => text(row, ['area', 'alocacao']) === area).length })), [equipment, people]);

  if (loading) return <div className="technical-state"><Loader2 className="animate-spin" size={20} /> Carregando cockpit técnico...</div>;
  return <section className="technical-cockpit" aria-label="Cockpit técnico gerencial">
    {error && <div className="technical-notice"><Radio size={15} /> {error}</div>}
    <div className="technical-kpis">
      <article><span><Gauge size={15} /> Prancha média</span><strong>{averageThroughput}<small>{averageThroughput === '--' ? '' : 'ton/h'}</small></strong><em>{ships.length ? 'Volume previsto ÷ janela ETA–ETD' : emptyMessage}</em></article>
      <article><span><Ship size={15} /> Ocupação dos berços</span><strong>{occupancy}</strong><em>{ships.length ? `${ships.length} navios no período` : emptyMessage}</em></article>
      <article><span><Clock3 size={15} /> Turn-around time</span><strong>{turnaround}</strong><em>{ships.length ? 'ETA até ETD' : emptyMessage}</em></article>
      <article><span><Wrench size={15} /> Disponibilidade da frota</span><strong>{fleetAvailability}</strong><em>{equipment.length ? `${activeEquipment.length}/${equipment.length} ativos` : emptyMessage}</em></article>
    </div>
    <div className="technical-chart-grid">
      <article className="technical-card technical-wide"><header><div><h3>Volume diário por berço</h3><p>Movimentação prevista nos berços 05–08</p></div><BarChart3 size={17} /></header><ResponsiveContainer width="100%" height={235}><AreaChart data={berthData}><CartesianGrid stroke="#e2e8f0" vertical={false} /><XAxis dataKey="day" /><YAxis /><Tooltip /><Area type="monotone" dataKey="berco05" name="Berço 05" stackId="volume" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={.18} /><Area type="monotone" dataKey="berco06" name="Berço 06" stackId="volume" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={.18} /><Area type="monotone" dataKey="berco07" name="Berço 07" stackId="volume" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={.18} /><Area type="monotone" dataKey="berco08" name="Berço 08" stackId="volume" stroke={COLORS[3]} fill={COLORS[3]} fillOpacity={.18} /></AreaChart></ResponsiveContainer></article>
      <article className="technical-card"><header><div><h3>Janela operacional</h3><p>Navios programados por berço</p></div><Activity size={17} /></header><ResponsiveContainer width="100%" height={235}><BarChart data={berthTotals}><CartesianGrid stroke="#e2e8f0" vertical={false} /><XAxis dataKey="berth" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="navios" name="Navios" fill="#0ea5e9" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></article>
      <article className="technical-card"><header><div><h3>Tipos de carga geral</h3><p>Contêineres excluídos</p></div><Database size={17} /></header>{cargoData.length ? <div className="technical-donut"><ResponsiveContainer width="55%" height={210}><PieChart><Pie data={cargoData} dataKey="value" innerRadius={48} outerRadius={76}>{cargoData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div>{cargoData.map((item) => <p key={item.name}><i style={{ background: item.color }} />{item.name}<b>{item.value.toLocaleString('pt-BR')} t</b></p>)}</div></div> : <div className="technical-empty">{emptyMessage}</div>}</article>
      <article className="technical-card technical-wide"><header><div><h3>Alocação de pessoal vs. equipamentos</h3><p>Ativos por área cadastrada</p></div><Users size={17} /></header>{allocation.length ? <ResponsiveContainer width="100%" height={235}><BarChart data={allocation} layout="vertical"><CartesianGrid stroke="#e2e8f0" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="area" width={100} /><Tooltip /><Bar dataKey="equipamentos" fill="#2563eb" /><Bar dataKey="colaboradores" fill="#14b8a6" /></BarChart></ResponsiveContainer> : <div className="technical-empty">{emptyMessage}</div>}</article>
    </div>
  </section>;
}
