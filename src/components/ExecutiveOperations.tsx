import { useEffect, useMemo, useState } from 'react';
import {
  Anchor,
  CalendarDays,
  ChevronRight,
  Clock3,
  Download,
  Loader2,
  MapPin,
  Ship,
  Users,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getSupabaseErrorMessage, supabase, supabaseConfigured } from '../lib/supabase';
import FilterSidebarPlanning, {
  type PlanningCollaborator,
  type PlanningFilters,
} from './FilterSidebarPlanning';

interface ShipRecord {
  id: string;
  name: string;
  imo: string;
  berth: string;
  cargo: string;
  status: string;
  eta: string;
  etd: string;
  pilot: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'navio' | 'manutencao' | 'equipe' | 'diretoria';
}

const volumeData: Array<{ day: string; atual: number; anterior: number }> = [];
const berthData: Array<{ berth: string; value: number }> = [];
const cargoData: Array<{ name: string; value: number; color: string }> = [];
const shiftLabel: Record<PlanningCollaborator['shift'], string> = { A: 'Turno A', B: 'Turno B', C: 'Turno C', commercial: 'Comercial' };
const regimeLabel: Record<PlanningCollaborator['regime'], string> = { '12x36': '12x36', '6x1': '6x1', '5x2': '5x2', 'on-call': 'Sobreaviso' };
const areaLabel: Record<PlanningCollaborator['area'], string> = { 'berth-1-tmg': 'Berço 1 · TMG', 'berth-2-containers-apm': 'Berço 2 · Contêineres/APM', 'berth-3-4-general-cargo': 'Berços 3/4 · Cargas gerais', 'yard-gate': 'Pátio · GATE' };
const statusLabel: Record<PlanningCollaborator['status'], string> = { present: 'Presente', 'scheduled-day-off': 'Folga', 'medical-leave': 'Licença', training: 'Treinamento', absent: 'Falta' };

const toRecord = (row: Record<string, unknown>, index: number): ShipRecord => ({
  id: String(row.id ?? row.navio_id ?? `ship-${index}`),
  name: String(row.nome_navio ?? row.navio ?? row.name ?? 'Navio sem identificação'),
  imo: String(row.imo ?? row.imo_number ?? '--'),
  berth: String(row.berco ?? row.berco_codigo ?? '--'),
  cargo: String(row.carga ?? row.tipo_carga ?? 'Não informado'),
  status: String(row.status ?? 'Fundeado'),
  eta: String(row.eta ?? '--'),
  etd: String(row.etd ?? '--'),
  pilot: String(row.pratico ?? row.pilot ?? 'A definir'),
});

export default function ExecutiveOperations() {
  const [ships, setShips] = useState<ShipRecord[]>([]);
  const [collaborators, setCollaborators] = useState<PlanningCollaborator[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'supabase' | 'empty'>('empty');
  const [filters, setFilters] = useState<PlanningFilters>({ search: '', window: 'today', shift: 'all', regime: 'all', status: 'all', area: 'all' });
  const [selectedShip, setSelectedShip] = useState<ShipRecord | null>(null);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('week');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    let active = true;
    const loadOptionalModules = async () => {
      setLoading(true);
      try {
        const [shipsResult, collaboratorsResult, eventsResult] = await Promise.all([
          supabase.from('lineup_navios').select('*').limit(30),
          supabase.from('colaboradores').select('*').limit(100),
          supabase.from('calendario_operacional').select('*').limit(30),
        ]);
        if (!active) return;
        if (shipsResult.data?.length) setShips(shipsResult.data.map(toRecord));
        if (collaboratorsResult.data?.length) {
          setCollaborators(collaboratorsResult.data.map((row, index) => ({
            id: String(row.id ?? `col-${index}`),
            name: String(row.nome ?? row.name ?? 'Colaborador'),
            registration: String(row.matricula ?? row.registration ?? '--'),
            shift: (String(row.turno ?? 'commercial') as PlanningCollaborator['shift']),
            regime: (String(row.regime ?? '12x36') as PlanningCollaborator['regime']),
            status: (String(row.status ?? 'present') as PlanningCollaborator['status']),
            area: (String(row.area ?? row.alocacao ?? 'yard-gate') as PlanningCollaborator['area']),
            extraHours: Number(row.horas_extras ?? row.overtime ?? 0),
          })));
        }
        if (eventsResult.data?.length) {
          setEvents(eventsResult.data.map((row, index) => ({
            id: String(row.id ?? `evt-${index}`),
            title: String(row.titulo ?? row.title ?? 'Evento operacional'),
            date: String(row.data ?? row.date ?? 'A definir'),
            type: (String(row.tipo ?? 'navio') as CalendarEvent['type']),
          })));
        }
        setSource(shipsResult.data?.length || collaboratorsResult.data?.length ? 'supabase' : 'empty');
      } catch (cause) {
        if (active) setNotice(getSupabaseErrorMessage(cause, 'Módulos operacionais indisponíveis.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadOptionalModules();
    return () => { active = false; };
  }, []);

  const filteredShips = useMemo(() => ships.filter((ship) => {
    const term = filters.search.toLowerCase();
    return !term || `${ship.name} ${ship.imo} ${ship.berth} ${ship.cargo}`.toLowerCase().includes(term);
  }), [filters.search, ships]);
  const filteredCollaborators = useMemo(() => collaborators.filter((item) => {
    const term = filters.search.trim().toLowerCase();
    return (!term || `${item.name} ${item.registration}`.toLowerCase().includes(term))
      && (filters.shift === 'all' || item.shift === filters.shift)
      && (filters.regime === 'all' || item.regime === filters.regime)
      && (filters.status === 'all' || item.status === filters.status)
      && (filters.area === 'all' || item.area === filters.area);
  }), [collaborators, filters]);

  const present = collaborators.filter((item) => item.status === 'present').length;
  const overtime = collaborators.reduce((sum, item) => sum + (item.extraHours ?? 0), 0);
  const coverage = collaborators.length ? Math.round((present / collaborators.length) * 100) : 0;

  const exportSchedule = () => {
    const rows = collaborators.map((item) => [item.name, item.registration, item.shift, item.regime, item.status, item.area, item.extraHours ?? 0]);
    const csv = [['Nome', 'Matrícula', 'Turno', 'Regime', 'Status', 'Área', 'Horas extras'], ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'escala-operacional-pecem.csv'; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <section className="executive-operations" aria-label="Gestão executiva portuária">
      {notice && <div className="module-notice">{notice}<button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={14} /></button></div>}
      <div className="module-heading">
        <div><span className="module-kicker"><span className="live-dot" /> Módulos executivos {source === 'supabase' ? '• dados Supabase' : '• aguardando dados'}</span><h2>Visão do gerente de planejamento operacional</h2></div>
        {loading && <span className="syncing"><Loader2 size={14} className="animate-spin" /> Sincronizando módulos</span>}
      </div>

      <div className="executive-kpi-grid">
        <div><span>Espera média · praticagem</span><strong>-- <small>min</small></strong><em className="kpi-neutral">Sem dados</em></div>
        <div><span>Prancha média</span><strong>-- <small>ton/h</small></strong><em className="kpi-neutral">Sem dados</em></div>
        <div><span>Ocupação dos berços</span><strong>-- <small>%</small></strong><em className="kpi-neutral">Sem dados</em></div>
        <div><span>Navios operando agora</span><strong>{ships.filter((ship) => ship.status === 'Operando').length} <small>/ {ships.length}</small></strong><em className="kpi-neutral">Lineup atualizado</em></div>
      </div>

      <div className="chart-grid">
        <div className="module-card chart-wide"><div className="module-card-header"><div><h3>Volume de cargas movimentadas</h3><p>Comparativo mensal · mil toneladas</p></div><span className="chart-legend"><i className="legend-current" /> Atual <i className="legend-previous" /> Mês anterior</span></div><ResponsiveContainer width="100%" height={220}><AreaChart data={volumeData}><defs><linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity=".28" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs><CartesianGrid stroke="#1e334a" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} /><Tooltip contentStyle={{ background: '#0f1d2f', border: '1px solid #28425f', borderRadius: 8, color: '#e2e8f0' }} /><Area type="monotone" dataKey="atual" stroke="#22d3ee" fill="url(#volumeFill)" strokeWidth={2} /><Area type="monotone" dataKey="anterior" stroke="#64748b" fill="none" strokeDasharray="5 5" /></AreaChart></ResponsiveContainer></div>
        <div className="module-card"><div className="module-card-header"><div><h3>Ocupação por berço</h3><p>Uso operacional atual</p></div></div><ResponsiveContainer width="100%" height={220}><BarChart data={berthData} layout="vertical"><CartesianGrid stroke="#1e334a" horizontal={false} /><XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} /><YAxis dataKey="berth" type="category" stroke="#94a3b8" fontSize={11} /><Tooltip contentStyle={{ background: '#0f1d2f', border: '1px solid #28425f', borderRadius: 8, color: '#e2e8f0' }} /><Bar dataKey="value" fill="#818cf8" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div>
        <div className="module-card"><div className="module-card-header"><div><h3>Mix de cargas</h3><p>Distribuição do período</p></div></div><div className="pie-wrap"><ResponsiveContainer width="52%" height={190}><PieChart><Pie data={cargoData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3}>{cargoData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={{ background: '#0f1d2f', border: '1px solid #28425f', borderRadius: 8 }} /></PieChart></ResponsiveContainer><div className="pie-legend">{cargoData.map((item) => <span key={item.name}><i style={{ background: item.color }} />{item.name}<b>{item.value}%</b></span>)}</div></div></div>
      </div>

      <div className="planning-module"><FilterSidebarPlanning collaborators={collaborators} onFiltersChange={setFilters} onSimulate={() => setNotice('Simulação criada: 2 colaboradores disponíveis para remanejamento no Berço 2.')} onExport={exportSchedule} /><div className="module-card collaborator-matrix"><div className="module-card-header"><div><h3><Users size={16} /> Matriz de escala e alocação</h3><p>{filteredCollaborators.length} colaboradores no recorte selecionado</p></div><span className="filter-chip">Tempo real</span></div><div className="collaborator-table-wrap"><table className="collaborator-table"><thead><tr><th>Colaborador</th><th>Turno / regime</th><th>Área</th><th>Status</th><th>HE</th></tr></thead><tbody>{filteredCollaborators.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.registration}</small></td><td>{shiftLabel[item.shift]} · {regimeLabel[item.regime]}</td><td>{areaLabel[item.area]}</td><td><span className={`collaborator-status collaborator-${item.status}`}>{statusLabel[item.status]}</span></td><td>{item.extraHours ?? 0}h</td></tr>)}</tbody></table></div></div></div>

      <div className="lineup-calendar-grid">
        <div className="module-card lineup-card"><div className="module-card-header"><div><h3><Ship size={16} /> Lineup de navios</h3><p>{filteredShips.length} embarcações monitoradas · clique para detalhar</p></div><div className="filter-chip">Todos os status</div></div><div className="lineup-list">{filteredShips.map((ship) => <button type="button" className="ship-row" key={ship.id} onClick={() => setSelectedShip(ship)}><span className={`ship-status status-${ship.status.toLowerCase().replace(/ /g, '-')}`} /><span className="ship-main"><strong>{ship.name}</strong><small>IMO {ship.imo} · {ship.berth} · {ship.cargo}</small></span><span className="ship-time"><b>{ship.eta}</b><small>ETA</small></span><ChevronRight size={16} className="ship-arrow" /></button>)}</div></div>
        <div className="module-card calendar-card"><div className="module-card-header"><div><h3><CalendarDays size={16} /> Calendário operacional</h3><p>Eventos críticos do terminal</p></div><div className="calendar-tabs">{(['month', 'week', 'day'] as const).map((view) => <button type="button" className={calendarView === view ? 'active' : ''} key={view} onClick={() => setCalendarView(view)}>{view === 'month' ? 'Mês' : view === 'week' ? 'Semana' : 'Dia'}</button>)}</div></div><div className="calendar-events">{events.map((event) => <div className="calendar-event" key={event.id}><span className={`event-dot event-${event.type}`} /><div><strong>{event.title}</strong><small>{event.date} · {calendarView === 'day' ? 'visão detalhada' : 'Pecém'}</small></div></div>)}</div></div>
      </div>

      {selectedShip && <div className="drawer-backdrop" role="presentation" onClick={() => setSelectedShip(null)}><aside className="ship-drawer" role="dialog" aria-modal="true" aria-label={`Detalhes de ${selectedShip.name}`} onClick={(event) => event.stopPropagation()}><button type="button" className="drawer-close" onClick={() => setSelectedShip(null)} aria-label="Fechar detalhes"><X size={18} /></button><span className="module-kicker"><Anchor size={13} /> Detalhe da operação</span><h2>{selectedShip.name}</h2><p className="drawer-subtitle">IMO {selectedShip.imo} · acompanhamento do lineup</p><div className="drawer-status">{selectedShip.status}</div><dl><dt>Berço</dt><dd><MapPin size={14} /> {selectedShip.berth}</dd><dt>Carga</dt><dd>{selectedShip.cargo}</dd><dt>ETA / ETD</dt><dd><Clock3 size={14} /> {selectedShip.eta} / {selectedShip.etd}</dd><dt>Prático responsável</dt><dd><Users size={14} /> {selectedShip.pilot}</dd></dl></aside></div>}
    </section>
  );
}
