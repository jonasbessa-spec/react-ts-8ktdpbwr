import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Anchor, CalendarDays, ChevronRight, Clock3, Loader2, MapPin, Pencil, Plus, Ship, Upload, Users, X } from 'lucide-react';
import {
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
import {
  initializeLocalCollaborators,
  makeCollaboratorId,
  parseCollaboratorCsv,
  saveLocalCollaborators,
  type LocalCollaborator,
} from '../lib/localCollaborators';
import { getCollaboratorFallback, SGO_DATA_CHANGED_EVENT } from '../lib/sgoData';
import FilterSidebarPlanning, { type PlanningCollaborator, type PlanningFilters } from './FilterSidebarPlanning';

interface ShipRecord {
  id: string;
  name: string;
  imo: string;
  berth: string;
  cargo: string;
  status: string;
  eta: string;
  etaRaw: string;
  etd: string;
  pilot: string;
  tons: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'navio' | 'manutencao' | 'equipe' | 'diretoria';
}

type Row = Record<string, unknown>;

const PALETTE = ['#22d3ee', '#818cf8', '#34d399', '#fbbf24', '#f472b6', '#94a3b8'];
const TOTAL_BERTHS = 9; // 01–08 e 10
const tooltipStyle = { background: '#0f1d2f', border: '1px solid #28425f', borderRadius: 8, color: '#e2e8f0', fontSize: 12 };

const shiftLabel: Record<PlanningCollaborator['shift'], string> = { A: 'Turno A', B: 'Turno B', C: 'Turno C', commercial: 'Comercial' };
const regimeLabel: Record<PlanningCollaborator['regime'], string> = { '12x36': '12x36', '6x1': '6x1', '5x2': '5x2', 'on-call': 'Sobreaviso' };
const areaLabel: Record<PlanningCollaborator['area'], string> = { 'berth-1-tmg': 'Berço 1 · TMG', 'berth-2-containers-apm': 'Berço 2 · Contêineres/APM', 'berth-3-4-general-cargo': 'Berços 3/4 · Cargas gerais', 'yard-gate': 'Pátio · GATE' };
const statusLabel: Record<PlanningCollaborator['status'], string> = { present: 'Presente', 'scheduled-day-off': 'Folga', 'medical-leave': 'Licença', training: 'Treinamento', absent: 'Falta' };
const emptyCollaboratorForm = (): Omit<LocalCollaborator, 'id'> => ({
  nome: '',
  cpf: '',
  cargo: '',
  turno: 'Turno A',
  data_admissao: '',
  inicio_periodo_aquisitivo: '',
  fim_periodo_concessivo: '',
});

const toPlanningCollaborator = (row: LocalCollaborator): PlanningCollaborator => {
  const shift = row.turno.match(/\b([ABC])\b/)?.[1];
  return {
    id: row.id,
    name: row.nome,
    registration: row.cpf || row.id,
    cpf: row.cpf,
    jobTitle: row.cargo,
    admissionDate: row.data_admissao,
    acquisitionStart: row.inicio_periodo_aquisitivo,
    concessionEnd: row.fim_periodo_concessivo,
    shift: shift === 'A' || shift === 'B' || shift === 'C' ? shift : 'commercial',
    regime: '12x36',
    status: 'present',
    area: 'yard-gate',
    extraHours: 0,
  };
};

const toPlanningRow = (row: Row, index: number): PlanningCollaborator => {
  const rawShift = String(row.turno ?? row.shift ?? row.escala ?? '');
  const shift = rawShift.match(/\b([ABC])\b/i)?.[1]?.toUpperCase();
  const rawStatus = String(row.status ?? 'Ativo').toLocaleLowerCase('pt-BR');
  const status: PlanningCollaborator['status'] = /folga/.test(rawStatus) ? 'scheduled-day-off'
    : /licen|atestado/.test(rawStatus) ? 'medical-leave'
      : /trein/.test(rawStatus) ? 'training'
        : /falta|ausente/.test(rawStatus) ? 'absent' : 'present';
  return {
    id: String(row.id ?? `col-${index + 1}`),
    name: String(row.nome ?? row.name ?? row.colaborador ?? 'Colaborador sem nome'),
    registration: String(row.matricula ?? row.registration ?? row.cpf ?? row.id ?? '--'),
    jobTitle: String(row.cargo ?? row.role ?? row.funcao ?? ''),
    shift: shift === 'A' || shift === 'B' || shift === 'C' ? shift : 'commercial',
    regime: pick(row.regime, ['12x36', '6x1', '5x2', 'on-call'] as const, '12x36'),
    status,
    area: pick(row.area ?? row.alocacao, ['berth-1-tmg', 'berth-2-containers-apm', 'berth-3-4-general-cargo', 'yard-gate'] as const, 'yard-gate'),
    extraHours: Number(row.horas_extras ?? row.overtime ?? 0) || 0,
  };
};

const formatDateTime = (value: unknown) => {
  if (!value) return '--';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
};

const toRecord = (row: Row, index: number): ShipRecord => ({
  id: String(row.id ?? row.navio_id ?? `ship-${index}`),
  name: String(row.nome_navio ?? row.navio ?? row.name ?? 'Navio sem identificação'),
  imo: String(row.imo ?? row.imo_number ?? '--'),
  berth: row.berco_programado || row.berco || row.berco_codigo ? `Berço ${row.berco_programado ?? row.berco ?? row.berco_codigo}` : 'Berço pendente',
  cargo: String(row.tipo_carga ?? row.carga ?? 'Não informado'),
  status: String(row.status ?? 'PROGRAMADO'),
  eta: formatDateTime(row.eta),
  etaRaw: String(row.eta ?? ''),
  etd: formatDateTime(row.etd),
  pilot: String(row.pratico ?? row.pilot ?? 'A definir'),
  tons: Number(row.quantidade_toneladas ?? row.volume_toneladas ?? 0) || 0,
});

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(String(value) as T) ? (String(value) as T) : fallback;

const isOperating = (status: string) => /OPERA|ATRACAD/i.test(status);

function EmptyChart({ message }: { message: string }) {
  return <div className="chart-empty">{message}</div>;
}

export default function ExecutiveOperations({ demoMode = false }: { demoMode?: boolean }) {
  const [ships, setShips] = useState<ShipRecord[]>([]);
  const [localStore] = useState(() => demoMode
    ? initializeLocalCollaborators()
    : { collaborators: [] as LocalCollaborator[], persistenceAvailable: true });
  const [localRecords, setLocalRecords] = useState<LocalCollaborator[]>(localStore.collaborators);
  const [collaborators, setCollaborators] = useState<PlanningCollaborator[]>(() =>
    demoMode ? localStore.collaborators.map(toPlanningCollaborator) : [],
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [prancha, setPrancha] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'supabase' | 'empty' | 'local' | 'cache local' | 'demonstração'>(
    demoMode ? 'local' : 'empty',
  );
  const [filters, setFilters] = useState<PlanningFilters>({ search: '', window: 'today', shift: 'all', regime: 'all', status: 'all', area: 'all' });
  const [selectedShip, setSelectedShip] = useState<ShipRecord | null>(null);
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('week');
  const [notice, setNotice] = useState<string | null>(null);
  const [editingCollaborator, setEditingCollaborator] = useState<string | null>(null);
  const [collaboratorForm, setCollaboratorForm] = useState(emptyCollaboratorForm);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (demoMode) {
      setLoading(false);
      setCollaborators(localStore.collaborators.map(toPlanningCollaborator));
      setSource('local');
      if (!localStore.persistenceAvailable) {
        setNotice('O navegador bloqueou o localStorage. Os dados de teste estão disponíveis apenas enquanto esta página permanecer aberta.');
      }
      return;
    }
    if (!supabaseConfigured) {
      const fallback = getCollaboratorFallback();
      setCollaborators(fallback.collaborators.map(toPlanningRow));
      setSource(fallback.source);
      setLoading(false);
      return;
    }
    let active = true;
    let requestSequence = 0;
    const loadOptionalModules = async () => {
      const requestId = ++requestSequence;
      setLoading(true);
      try {
        const [forecastResult, collaboratorsResult, eventsResult, pranchaResult] = await Promise.all([
          supabase.from('previsao_navios').select('*').order('eta', { ascending: true }).limit(60),
          supabase.from('colaboradores').select('*').limit(300),
          supabase.from('calendario_operacional').select('*').limit(30),
          supabase.from('view_kpi_prancha_operacional').select('*'),
        ]);
        let shipRows = forecastResult.data as Row[] | null;
        if (forecastResult.error || !shipRows?.length) {
          const legacy = await supabase.from('lineup_navios').select('*').limit(60);
          if (!legacy.error && legacy.data?.length) shipRows = legacy.data;
        }
        if (!active || requestId !== requestSequence) return;

        const records = (shipRows || []).map(toRecord).filter((ship) => !/container|cont[eê]iner/i.test(ship.cargo));
        setShips(records);

        const remoteCollaborators = (collaboratorsResult.data || []) as Row[];
        if (remoteCollaborators.length) {
          setCollaborators(remoteCollaborators.map(toPlanningRow));
          setSource('supabase');
        } else {
          const fallback = getCollaboratorFallback();
          setCollaborators(fallback.collaborators.map(toPlanningRow));
          setSource(fallback.source);
        }
        if (eventsResult.data?.length) {
          setEvents(eventsResult.data.map((row: Row, index) => ({
            id: String(row.id ?? `evt-${index}`),
            title: String(row.titulo ?? row.title ?? 'Evento operacional'),
            date: formatDateTime(row.data ?? row.date) === '--' ? 'A definir' : formatDateTime(row.data ?? row.date),
            type: pick(row.tipo, ['navio', 'manutencao', 'equipe', 'diretoria'] as const, 'navio'),
          })));
        }
        const pranchaRows = (pranchaResult.data || []) as Row[];
        const values = pranchaRows.map((row) => Number(row.prancha_realizada_ton_h ?? 0)).filter((value) => value > 0);
        setPrancha(values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null);

      } catch (cause) {
        if (active && requestId === requestSequence) {
          const fallback = getCollaboratorFallback();
          setCollaborators(fallback.collaborators.map(toPlanningRow));
          setSource(fallback.source);
          setNotice(getSupabaseErrorMessage(cause, 'Módulos operacionais indisponíveis.'));
        }
      } finally {
        if (active && requestId === requestSequence) setLoading(false);
      }
    };
    void loadOptionalModules();
    const onSgoDataChanged = () => { void loadOptionalModules(); };
    window.addEventListener(SGO_DATA_CHANGED_EVENT, onSgoDataChanged);
    return () => {
      active = false;
      window.removeEventListener(SGO_DATA_CHANGED_EVENT, onSgoDataChanged);
    };
  }, [demoMode, localStore]);

  const filteredShips = useMemo(() => ships.filter((ship) => {
    const term = filters.search.trim().toLowerCase();
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

  // Tonelagem prevista por dia (ETA) nos próximos 7 dias.
  const volumeData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, offset) => {
      const day = new Date(today.getTime() + offset * 86400000);
      const next = day.getTime() + 86400000;
      const dayShips = ships.filter((ship) => {
        const eta = new Date(ship.etaRaw).getTime();
        return eta >= day.getTime() && eta < next;
      });
      return {
        day: day.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', ''),
        toneladas: Math.round(dayShips.reduce((sum, ship) => sum + ship.tons, 0) / 1000 * 10) / 10,
        navios: dayShips.length,
      };
    });
  }, [ships]);
  const hasVolume = volumeData.some((item) => item.navios > 0);

  const berthData = useMemo(() => {
    const counts = new Map<string, number>();
    ships.filter((ship) => ship.berth !== 'Berço pendente').forEach((ship) => counts.set(ship.berth, (counts.get(ship.berth) || 0) + 1));
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([berth, value]) => ({ berth: berth.replace('Berço ', 'B'), value }));
  }, [ships]);

  const cargoData = useMemo(() => {
    const totals = new Map<string, number>();
    ships.forEach((ship) => totals.set(ship.cargo, (totals.get(ship.cargo) || 0) + (ship.tons || 1)));
    const sum = [...totals.values()].reduce((acc, value) => acc + value, 0);
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5).reduce((acc, [, value]) => acc + value, 0);
    if (rest) top.push(['Outros', rest]);
    return top.map(([name, value], index) => ({ name, value: sum ? Math.round(value / sum * 100) : 0, color: PALETTE[index % PALETTE.length] }));
  }, [ships]);

  const operating = ships.filter((ship) => isOperating(ship.status));
  const occupiedBerths = new Set(operating.map((ship) => ship.berth).filter((berth) => berth !== 'Berço pendente')).size;
  const occupancy = ships.length ? Math.round(occupiedBerths / TOTAL_BERTHS * 100) : null;

  const exportSchedule = () => {
    const rows = filteredCollaborators.map((item) => [item.name, item.registration, shiftLabel[item.shift], regimeLabel[item.regime], statusLabel[item.status], areaLabel[item.area], item.extraHours ?? 0]);
    const csv = '﻿' + [['Nome', 'Matrícula', 'Turno', 'Regime', 'Status', 'Área', 'Horas extras'], ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'escala-operacional-pecem.csv'; link.click(); URL.revokeObjectURL(url);
  };

  const commitLocalRecords = (next: LocalCollaborator[]) => {
    try {
      saveLocalCollaborators(next);
      setLocalRecords(next);
      setCollaborators(next.map(toPlanningCollaborator));
      setSource('local');
      setNotice('Dados salvos neste navegador.');
      setEditingCollaborator(null);
      setCollaboratorForm(emptyCollaboratorForm());
      setFormOpen(false);
    } catch (cause) {
      setNotice(`Não foi possível salvar no armazenamento local: ${getSupabaseErrorMessage(cause)}`);
    }
  };

  const submitCollaborator = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cpfKey = collaboratorForm.cpf.replace(/\D/g, '');
    const duplicate = localRecords.some((row) =>
      row.id !== editingCollaborator
      && cpfKey.length > 0
      && row.cpf.replace(/\D/g, '') === cpfKey,
    );
    if (duplicate) {
      setNotice('Já existe um colaborador cadastrado com este CPF.');
      return;
    }
    const record: LocalCollaborator = {
      ...collaboratorForm,
      id: editingCollaborator ?? makeCollaboratorId(),
    };
    const next = editingCollaborator
      ? localRecords.map((row) => row.id === editingCollaborator ? record : row)
      : [...localRecords, record];
    commitLocalRecords(next);
  };

  const startEditingCollaborator = (row: LocalCollaborator) => {
    setEditingCollaborator(row.id);
    setCollaboratorForm({
      nome: row.nome,
      cpf: row.cpf,
      cargo: row.cargo,
      turno: row.turno,
      data_admissao: row.data_admissao,
      inicio_periodo_aquisitivo: row.inicio_periodo_aquisitivo,
      fim_periodo_concessivo: row.fim_periodo_concessivo,
    });
    setFormOpen(true);
  };

  const importCollaborators = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    try {
      const imported = parseCollaboratorCsv(await file.text());
      if (!imported.length) throw new Error('A planilha não contém colaboradores com nome preenchido.');
      const next = [...localRecords];
      let added = 0;
      let updated = 0;
      for (const row of imported) {
        const cpfKey = row.cpf.replace(/\D/g, '');
        const existingIndex = cpfKey
          ? next.findIndex((item) => item.cpf.replace(/\D/g, '') === cpfKey)
          : -1;
        if (existingIndex >= 0) {
          next[existingIndex] = { ...row, id: next[existingIndex].id };
          updated += 1;
        } else {
          next.push(row);
          added += 1;
        }
      }
      commitLocalRecords(next);
      setNotice(`${added} colaborador(es) incluído(s) e ${updated} atualizado(s) pela planilha.`);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : 'Não foi possível importar a planilha.');
    }
  };

  const simulate = (current: PlanningFilters) => {
    const scoped = collaborators.filter((item) => current.area === 'all' || item.area === current.area);
    const available = scoped.filter((item) => item.status === 'present');
    const absent = scoped.filter((item) => item.status === 'absent' || item.status === 'medical-leave');
    setNotice(scoped.length
      ? `Simulação: ${available.length} presentes e ${absent.length} ausentes/licença ${current.area === 'all' ? 'em todas as áreas' : `em ${areaLabel[current.area]}`}.`
      : 'Simulação indisponível: nenhum colaborador cadastrado para o recorte.');
  };

  return (
    <section className="executive-operations" aria-label="Gestão executiva portuária">
      {notice && <div className="module-notice">{notice}<button type="button" onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={14} /></button></div>}
      <div className="module-heading">
        <div><span className="module-kicker"><span className="live-dot" /> Módulos executivos {source === 'supabase' ? '· SGO Unilink / Supabase' : source === 'local' || source === 'demonstração' ? '· demonstração local' : source === 'cache local' ? '· cache local' : '· aguardando dados'}</span><h2>Visão do gerente de planejamento operacional</h2></div>
        {loading && <span className="syncing"><Loader2 size={14} className="animate-spin" /> Sincronizando módulos</span>}
      </div>

      <div className="executive-kpi-grid">
        <div><span>Espera média · praticagem</span><strong>-- <small>min</small></strong><em className="kpi-neutral">Sem fonte integrada</em></div>
        <div><span>Prancha média</span><strong>{prancha !== null ? Math.round(prancha).toLocaleString('pt-BR') : '--'} <small>ton/h</small></strong><em className="kpi-neutral">{prancha !== null ? 'Operações em andamento' : 'Sem dados'}</em></div>
        <div><span>Ocupação dos berços</span><strong>{occupancy ?? '--'} <small>%</small></strong><em className="kpi-neutral">{occupancy !== null ? `${occupiedBerths} de ${TOTAL_BERTHS} berços operando` : 'Sem dados'}</em></div>
        <div><span>Navios operando agora</span><strong>{operating.length} <small>/ {ships.length}</small></strong><em className="kpi-neutral">{ships.length ? 'Lineup carga geral' : 'Sem lineup'}</em></div>
      </div>

      <div className="chart-grid">
        <div className="module-card chart-wide">
          <div className="module-card-header"><div><h3>Volume previsto de chegada</h3><p>Próximos 7 dias · mil toneladas por ETA</p></div><span className="chart-legend"><i className="legend-current" /> Toneladas</span></div>
          {hasVolume ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeData}>
                <CartesianGrid stroke="#1e334a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,.08)' }} formatter={(value) => [`${Number(value ?? 0).toLocaleString('pt-BR')} mil t`, 'Volume']} />
                <Bar dataKey="toneladas" fill="#22d3ee" radius={[5, 5, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="Nenhuma chegada prevista nos próximos 7 dias." />}
        </div>
        <div className="module-card">
          <div className="module-card-header"><div><h3>Navios por berço</h3><p>Lineup carregado</p></div></div>
          {berthData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={berthData} layout="vertical">
                <CartesianGrid stroke="#1e334a" horizontal={false} />
                <XAxis type="number" allowDecimals={false} stroke="#64748b" fontSize={11} />
                <YAxis dataKey="berth" type="category" stroke="#94a3b8" fontSize={11} width={36} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(148,163,184,.08)' }} formatter={(value) => [Number(value ?? 0), 'Navios']} />
                <Bar dataKey="value" fill="#818cf8" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="Sem navios com berço definido." />}
        </div>
        <div className="module-card">
          <div className="module-card-header"><div><h3>Mix de cargas</h3><p>Participação por volume previsto</p></div></div>
          {cargoData.length ? (
            <div className="pie-wrap">
              <ResponsiveContainer width={170} height={190}>
                <PieChart><Pie data={cargoData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} stroke="none">{cargoData.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => `${Number(value ?? 0)}%`} /></PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">{cargoData.map((item) => <span key={item.name}><i style={{ background: item.color }} /><span className="truncate">{item.name}</span><b>{item.value}%</b></span>)}</div>
            </div>
          ) : <EmptyChart message="Sem cargas no lineup." />}
        </div>
      </div>

      <div className="planning-module">
        <FilterSidebarPlanning collaborators={collaborators} onFiltersChange={setFilters} onSimulate={simulate} onExport={exportSchedule} />
        <div className="module-card collaborator-matrix">
          <div className="module-card-header">
            <div><h3><Users size={16} /> Matriz de escala e alocação</h3><p>{filteredCollaborators.length} colaboradores no recorte selecionado</p></div>
            {demoMode ? (
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-slate-200 hover:border-cyan-400 hover:text-cyan-300">
                  <Upload size={14} /> Importar CSV/TSV
                  <input type="file" accept=".csv,.tsv,text/csv,text/tab-separated-values" className="sr-only" onChange={(event) => { void importCollaborators(event); }} />
                </label>
                <button type="button" onClick={() => { setEditingCollaborator(null); setCollaboratorForm(emptyCollaboratorForm()); setFormOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300"><Plus size={14} /> Novo</button>
              </div>
            ) : <span className="filter-chip">Tabela colaboradores</span>}
          </div>
          {demoMode && (
            <div className="space-y-3 border-b border-slate-700/70 p-4">
              <p className="text-xs text-slate-400">Modo local: alterações ficam neste navegador. Importe uma planilha CSV/TSV com cabeçalhos Nome, CPF, Cargo, Turno, Data de admissão, Início do período aquisitivo e Fim do período concessivo.</p>
              {formOpen ? (
                <form onSubmit={submitCollaborator} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="space-y-1 text-xs text-slate-400">Nome<input required value={collaboratorForm.nome} onChange={(event) => setCollaboratorForm((current) => ({ ...current, nome: event.target.value }))} className="input w-full" /></label>
                  <label className="space-y-1 text-xs text-slate-400">CPF<input required value={collaboratorForm.cpf} onChange={(event) => setCollaboratorForm((current) => ({ ...current, cpf: event.target.value }))} className="input w-full" /></label>
                  <label className="space-y-1 text-xs text-slate-400">Cargo<input required value={collaboratorForm.cargo} onChange={(event) => setCollaboratorForm((current) => ({ ...current, cargo: event.target.value }))} className="input w-full" /></label>
                  <label className="space-y-1 text-xs text-slate-400">Turno<input required value={collaboratorForm.turno} onChange={(event) => setCollaboratorForm((current) => ({ ...current, turno: event.target.value }))} className="input w-full" /></label>
                  <label className="space-y-1 text-xs text-slate-400">Data de admissão<input required type="date" value={collaboratorForm.data_admissao} onChange={(event) => setCollaboratorForm((current) => ({ ...current, data_admissao: event.target.value }))} className="input w-full" /></label>
                  <label className="space-y-1 text-xs text-slate-400">Início do período aquisitivo<input required type="date" value={collaboratorForm.inicio_periodo_aquisitivo} onChange={(event) => setCollaboratorForm((current) => ({ ...current, inicio_periodo_aquisitivo: event.target.value }))} className="input w-full" /></label>
                  <label className="space-y-1 text-xs text-slate-400">Fim do período concessivo<input required type="date" value={collaboratorForm.fim_periodo_concessivo} onChange={(event) => setCollaboratorForm((current) => ({ ...current, fim_periodo_concessivo: event.target.value }))} className="input w-full" /></label>
                  <div className="flex items-end gap-2">
                    <button type="submit" className="rounded-lg bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300">{editingCollaborator ? 'Salvar edição' : 'Adicionar'}</button>
                    <button type="button" onClick={() => { setEditingCollaborator(null); setCollaboratorForm(emptyCollaboratorForm()); setFormOpen(false); }} className="rounded-lg border border-slate-600 px-4 py-2 text-xs font-bold text-slate-200 hover:border-slate-400">Cancelar</button>
                  </div>
                </form>
              ) : null}
            </div>
          )}
          {filteredCollaborators.length ? (
            <div className="collaborator-table-wrap">
              <table className="collaborator-table">
                {demoMode ? (
                  <>
                    <thead><tr><th>Colaborador</th><th>CPF</th><th>Cargo</th><th>Turno</th><th>Admissão</th><th>Período aquisitivo</th><th>Fim concessivo</th><th>Ações</th></tr></thead>
                    <tbody>{filteredCollaborators.map((item) => {
                      const sourceRow = localRecords.find((row) => row.id === String(item.id));
                      return <tr key={item.id}>
                        <td><strong>{item.name}</strong></td>
                        <td>{item.cpf || item.registration}</td>
                        <td>{item.jobTitle || '—'}</td>
                        <td>{shiftLabel[item.shift]}</td>
                        <td>{item.admissionDate || '—'}</td>
                        <td>{item.acquisitionStart || '—'}</td>
                        <td>{item.concessionEnd || '—'}</td>
                        <td>{sourceRow && <button type="button" onClick={() => startEditingCollaborator(sourceRow)} className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-200 hover:border-cyan-400 hover:text-cyan-300" aria-label={`Editar ${item.name}`}><Pencil size={12} /> Editar</button>}</td>
                      </tr>;
                    })}</tbody>
                  </>
                ) : (
                  <>
                    <thead><tr><th>Colaborador</th><th>Turno / regime</th><th>Área</th><th>Status</th><th>HE</th></tr></thead>
                    <tbody>{filteredCollaborators.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.registration}</small></td><td>{shiftLabel[item.shift]} · {regimeLabel[item.regime]}</td><td>{areaLabel[item.area]}</td><td><span className={`collaborator-status collaborator-${item.status}`}>{statusLabel[item.status]}</span></td><td>{item.extraHours ?? 0}h</td></tr>)}</tbody>
                  </>
                )}
              </table>
            </div>
          ) : <EmptyChart message={collaborators.length ? 'Nenhum colaborador corresponde aos filtros.' : 'Nenhum colaborador cadastrado.'} />}
        </div>
      </div>

      <div className="lineup-calendar-grid">
        <div className="module-card lineup-card">
          <div className="module-card-header"><div><h3><Ship size={16} /> Lineup de navios</h3><p>{filteredShips.length} embarcações monitoradas · clique para detalhar</p></div></div>
          {filteredShips.length ? (
            <div className="lineup-list">{filteredShips.map((ship) => <button type="button" className="ship-row" key={ship.id} onClick={() => setSelectedShip(ship)}><span className={`ship-dot ${isOperating(ship.status) ? 'is-operating' : ''}`} /><span className="ship-main"><strong>{ship.name}</strong><small>IMO {ship.imo} · {ship.berth} · {ship.cargo}</small></span><span className="ship-time"><b>{ship.eta}</b><small>ETA</small></span><ChevronRight size={16} className="ship-arrow" /></button>)}</div>
          ) : <EmptyChart message="Nenhum navio no lineup." />}
        </div>
        <div className="module-card calendar-card">
          <div className="module-card-header"><div><h3><CalendarDays size={16} /> Calendário operacional</h3><p>Eventos críticos do terminal</p></div><div className="calendar-tabs">{(['month', 'week', 'day'] as const).map((view) => <button type="button" className={calendarView === view ? 'active' : ''} key={view} onClick={() => setCalendarView(view)}>{view === 'month' ? 'Mês' : view === 'week' ? 'Semana' : 'Dia'}</button>)}</div></div>
          {events.length ? (
            <div className="calendar-events">{events.map((event) => <div className="calendar-event" key={event.id}><span className={`event-dot event-${event.type}`} /><div><strong>{event.title}</strong><small>{event.date}</small></div></div>)}</div>
          ) : <EmptyChart message="Nenhum evento em calendario_operacional." />}
        </div>
      </div>

      {selectedShip && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setSelectedShip(null)}>
          <aside className="ship-drawer" role="dialog" aria-modal="true" aria-label={`Detalhes de ${selectedShip.name}`} onClick={(event) => event.stopPropagation()}>
            <button type="button" className="drawer-close" onClick={() => setSelectedShip(null)} aria-label="Fechar detalhes"><X size={18} /></button>
            <span className="module-kicker"><Anchor size={13} /> Detalhe da operação</span>
            <h2>{selectedShip.name}</h2>
            <p className="drawer-subtitle">IMO {selectedShip.imo} · acompanhamento do lineup</p>
            <div className="drawer-status">{selectedShip.status}</div>
            <dl>
              <dt>Berço</dt><dd><MapPin size={14} /> {selectedShip.berth}</dd>
              <dt>Carga</dt><dd>{selectedShip.cargo}</dd>
              <dt>Volume</dt><dd>{selectedShip.tons ? `${selectedShip.tons.toLocaleString('pt-BR')} t` : 'Não informado'}</dd>
              <dt>ETA / ETD</dt><dd><Clock3 size={14} /> {selectedShip.eta} / {selectedShip.etd}</dd>
              <dt>Prático responsável</dt><dd><Users size={14} /> {selectedShip.pilot}</dd>
            </dl>
          </aside>
        </div>
      )}
    </section>
  );
}
