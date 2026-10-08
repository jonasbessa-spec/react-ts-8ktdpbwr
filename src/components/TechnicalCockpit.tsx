import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BarChart3, Clock3, Database, Gauge, Loader2, Radio, Ship, Users, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { assignTentativeBerths, getCollaboratorFallback, normalizeCollaborators, SGO_DATA_CHANGED_EVENT, type CollaboratorSource } from '../lib/sgoData';

type Row = Record<string, unknown>;
const BERTHS = ['01', '02', '03', '04', '05', '06', '07', '08'];
const COLORS = ['#3b82f6', '#22d3ee', '#14b8a6', '#f59e0b', '#a78bfa', '#f472b6'];
const AREA_LABEL: Record<string, string> = { 'berth-1-tmg': 'Berço 1 · TMG', 'berth-2-containers-apm': 'Berço 2 · APM', 'berth-3-4-general-cargo': 'Berços 3/4', 'yard-gate': 'Pátio · GATE' };
const areaName = (value: string) => AREA_LABEL[value] || value;
const tons = (value: number) => value >= 1000 ? `${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : value.toLocaleString('pt-BR');
const text = (row: Row, keys: string[]) => keys.map((key) => row[key]).find((value) => value !== undefined && value !== null && value !== '')?.toString() || '';
const number = (row: Row, keys: string[]) => Number(text(row, keys)) || 0;
const TOOLTIP = { background: '#0f1d2f', border: '1px solid #28425f', borderRadius: 8, color: '#e2e8f0', fontSize: 12 };
const AXIS = { stroke: '#64748b', fontSize: 11, tickLine: false };
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

export default function TechnicalCockpit({ period, demoMode = false }: { period: string; demoMode?: boolean }) {
  const [ships, setShips] = useState<Row[]>([]);
  const [people, setPeople] = useState<Row[]>([]);
  const [collaboratorSource, setCollaboratorSource] = useState<CollaboratorSource>('demonstração');
  const [equipment, setEquipment] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const requestId = ++requestSequence.current;
      setLoading(true);
      try {
        const bounds = periodBounds(period);
        if (!supabaseConfigured) {
          const fallback = getCollaboratorFallback();
          if (active) {
            setShips([]);
            setPeople(fallback.collaborators);
            setCollaboratorSource(fallback.source);
            setEquipment([]);
            setError('');
          }
          return;
        }
        const results = await Promise.all([
          supabase.from('previsao_navios').select('*').gte('eta', bounds.start).lt('eta', bounds.end),
          supabase.from('colaboradores').select('*'),
          supabase.from('equipamentos_patio').select('*')
        ]);
        if (!active || requestId !== requestSequence.current) return;
        const rawPeople = (results[1].data || []) as Row[];
        const fallback = rawPeople.length ? null : getCollaboratorFallback();
        setPeople(rawPeople.length ? normalizeCollaborators(rawPeople, 'supabase') : fallback?.collaborators ?? []);
        setCollaboratorSource(rawPeople.length ? 'supabase' : fallback?.source ?? 'demonstração');
        const rawShips = (results[0].data || []) as Row[];
        const assignedShips = assignTentativeBerths(rawShips.map((row) => ({
          ...row,
          berco_programado: text(row, ['berco_programado', 'berco']) || null,
          tipo_carga: text(row, ['tipo_carga', 'carga']),
          eta: text(row, ['eta']),
          etd: text(row, ['etd']) || null,
        })));
        setShips(assignedShips
          .filter((row) => BERTHS.includes(String(row.berco_programado ?? '')))
          .filter((row) => !/container|porta[- ]?conteiner/i.test(text(row, ['tipo_carga', 'carga']))));
        setEquipment((results[2].data || []) as Row[]);
        const firstError = results[0].error || results[2].error;
        setError(firstError?.message ?? '');
      } catch (cause) {
        if (!active || requestId !== requestSequence.current) return;
        const fallback = getCollaboratorFallback();
        setPeople(fallback.collaborators);
        setCollaboratorSource(fallback.source);
        setError(cause instanceof Error ? cause.message : 'Falha ao consultar os indicadores.');
      } finally {
        if (active && requestId === requestSequence.current) setLoading(false);
      }
    };
    void load();
    const onSgoDataChanged = () => { void load(); };
    window.addEventListener(SGO_DATA_CHANGED_EVENT, onSgoDataChanged);
    return () => {
      active = false;
      window.removeEventListener(SGO_DATA_CHANGED_EVENT, onSgoDataChanged);
    };
  }, [demoMode, period]);

  const berthData = useMemo(() => {
    const grouped = new Map<string, Record<string, number | string>>();
    ships.forEach((row) => {
      const day = dateKey(text(row, ['eta', 'atualizado_em']));
      const berth = text(row, ['berco_programado', 'berco']);
      if (!day || !BERTHS.includes(berth)) return;
      const current = grouped.get(day) || { day, berco05: 0, berco06: 0, berco07: 0, berco08: 0, navios: 0 };
      current[`berco${berth}`] = Number(current[`berco${berth}`] || 0) + number(row, ['quantidade_toneladas', 'volume_toneladas']);
      current.navios = Number(current.navios || 0) + 1;
      grouped.set(day, current);
    });
    const order = (value: string) => { const [d, m] = value.split('/').map(Number); return m * 100 + d; };
    return Array.from(grouped.values()).sort((a, b) => order(String(a.day)) - order(String(b.day)));
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
  const allocation = useMemo(() => {
    const areas = new Set([
      ...equipment.map((row) => text(row, ['categoria', 'area']) || 'Não informado'),
      ...people.map((row) => text(row, ['area', 'alocacao']) || 'Não informado'),
    ]);
    return [...areas].map((area) => ({
      area: areaName(area),
      equipamentos: equipment.filter((row) =>
        (text(row, ['categoria', 'area']) || 'Não informado') === area
        && !/manuten|parad|indispon/i.test(text(row, ['status'])),
      ).length,
      colaboradores: people.filter((row) =>
        (text(row, ['area', 'alocacao']) || 'Não informado') === area,
      ).length,
    }));
  }, [equipment, people]);

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
      <article className="technical-card technical-wide"><header><div><h3>Volume diário por berço</h3><p>Movimentação prevista nos berços 05–08</p></div><BarChart3 size={17} /></header>{berthData.length ? <ResponsiveContainer width="100%" height={235}><BarChart data={berthData}><CartesianGrid stroke="#1e293b" vertical={false} /><XAxis dataKey="day" {...AXIS} /><YAxis {...AXIS} tickFormatter={(value: number) => tons(value)} width={56} /><Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(148,163,184,.08)' }} formatter={(value, name) => [`${Number(value ?? 0).toLocaleString('pt-BR')} t`, String(name)]} /><Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />{BERTHS.map((berth, index) => <Bar key={berth} dataKey={`berco${berth}`} name={`Berço ${berth}`} stackId="volume" fill={COLORS[index]} isAnimationActive={false} radius={index === BERTHS.length - 1 ? [4, 4, 0, 0] : 0} />)}</BarChart></ResponsiveContainer> : <div className="technical-empty">{emptyMessage}</div>}</article>
      <article className="technical-card"><header><div><h3>Janela operacional</h3><p>Navios programados por berço</p></div><Activity size={17} /></header><ResponsiveContainer width="100%" height={235}><BarChart data={berthTotals}><CartesianGrid stroke="#1e293b" vertical={false} /><XAxis dataKey="berth" {...AXIS} /><YAxis allowDecimals={false} {...AXIS} /><Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(148,163,184,.08)' }} /><Bar dataKey="navios" name="Navios" fill="#22d3ee" radius={[5, 5, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></article>
      <article className="technical-card"><header><div><h3>Tipos de carga geral</h3><p>Contêineres excluídos</p></div><Database size={17} /></header>{cargoData.length ? <div className="technical-donut"><ResponsiveContainer width={160} height={190}><PieChart><Pie data={cargoData} dataKey="value" nameKey="name" stroke="none" isAnimationActive={false} innerRadius={48} outerRadius={76}>{cargoData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(148,163,184,.08)' }} /></PieChart></ResponsiveContainer><div>{cargoData.map((item) => <p key={item.name}><i style={{ background: item.color }} />{item.name}<b>{tons(item.value)} t</b></p>)}</div></div> : <div className="technical-empty">{emptyMessage}</div>}</article>
      <article className="technical-card technical-wide"><header><div><h3>Alocação de pessoal vs. equipamentos</h3><p>Colaboradores: {collaboratorSource} · alocação por área cadastrada</p></div><Users size={17} /></header>{allocation.length ? <ResponsiveContainer width="100%" height={235}><BarChart data={allocation} layout="vertical"><CartesianGrid stroke="#1e293b" horizontal={false} /><XAxis type="number" allowDecimals={false} {...AXIS} /><YAxis type="category" dataKey="area" width={110} {...AXIS} /><Tooltip contentStyle={TOOLTIP} cursor={{ fill: 'rgba(148,163,184,.08)' }} /><Bar dataKey="equipamentos" name="Equipamentos" fill="#3b82f6" radius={[0, 4, 4, 0]} isAnimationActive={false} /><Bar dataKey="colaboradores" name="Colaboradores" fill="#14b8a6" radius={[0, 4, 4, 0]} isAnimationActive={false} /><Legend wrapperStyle={{ fontSize: 11, color: "#94a3b8" }} /></BarChart></ResponsiveContainer> : <div className="technical-empty">{emptyMessage}</div>}</article>
    </div>
  </section>;
}
