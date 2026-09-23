import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Filter,
  Play,
  Search,
  Users,
  X,
} from 'lucide-react';

export type PlanningWindow = 'today' | 'next-7-days' | 'current-month';
export type PlanningShift = 'A' | 'B' | 'C' | 'commercial';
export type PlanningRegime = '12x36' | '6x1' | '5x2' | 'on-call';
export type PlanningStatus =
  | 'present'
  | 'scheduled-day-off'
  | 'medical-leave'
  | 'training'
  | 'absent';
export type PlanningArea =
  | 'berth-1-tmg'
  | 'berth-2-containers-apm'
  | 'berth-3-4-general-cargo'
  | 'yard-gate';

export interface PlanningCollaborator {
  id: string | number;
  name: string;
  registration: string;
  shift: PlanningShift;
  regime: PlanningRegime;
  status: PlanningStatus;
  area: PlanningArea;
  extraHours?: number;
}

export interface PlanningFilters {
  search: string;
  window: PlanningWindow;
  shift: PlanningShift | 'all';
  regime: PlanningRegime | 'all';
  status: PlanningStatus | 'all';
  area: PlanningArea | 'all';
}

export interface FilterSidebarPlanningProps {
  collaborators: PlanningCollaborator[];
  onFiltersChange: (filters: PlanningFilters) => void;
  onSimulate: (filters: PlanningFilters) => void;
  onExport: (filters: PlanningFilters, collaborators: PlanningCollaborator[]) => void;
}

const initialFilters: PlanningFilters = {
  search: '',
  window: 'today',
  shift: 'all',
  regime: 'all',
  status: 'all',
  area: 'all',
};

const windowOptions: Array<{ value: PlanningWindow; label: string }> = [
  { value: 'today', label: 'Hoje' },
  { value: 'next-7-days', label: 'Próximos 7 dias' },
  { value: 'current-month', label: 'Mês vigente' },
];

const shiftOptions = [
  { value: 'A' as const, label: 'A', detail: '07–13' },
  { value: 'B' as const, label: 'B', detail: '13–19' },
  { value: 'C' as const, label: 'C', detail: '19–07' },
  { value: 'commercial' as const, label: 'Comercial', detail: 'Admin' },
];

const regimeOptions: Array<{ value: PlanningRegime; label: string }> = [
  { value: '12x36', label: '12x36' },
  { value: '6x1', label: '6x1' },
  { value: '5x2', label: '5x2' },
  { value: 'on-call', label: 'Sobreaviso' },
];

const statusOptions: Array<{ value: PlanningStatus; label: string }> = [
  { value: 'present', label: 'Presente' },
  { value: 'scheduled-day-off', label: 'Folga Programada' },
  { value: 'medical-leave', label: 'Atestado/Licença' },
  { value: 'training', label: 'Em Treinamento' },
  { value: 'absent', label: 'Falta' },
];

const areaOptions: Array<{ value: PlanningArea; label: string }> = [
  { value: 'berth-1-tmg', label: 'Berço 1 TMG' },
  { value: 'berth-2-containers-apm', label: 'Berço 2 Contêineres/APM' },
  { value: 'berth-3-4-general-cargo', label: 'Berço 3/4 Cargas Gerais' },
  { value: 'yard-gate', label: 'Pátio/GATE' },
];

const selectClass =
  'w-full appearance-none rounded-lg border border-slate-700/80 bg-slate-950/70 px-3 py-2.5 text-xs font-semibold text-slate-200 outline-none transition focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40';

export function FilterSidebarPlanning({
  collaborators,
  onFiltersChange,
  onSimulate,
  onExport,
}: FilterSidebarPlanningProps) {
  const [filters, setFilters] = useState<PlanningFilters>(initialFilters);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const filteredCollaborators = useMemo(() => {
    const query = filters.search.trim().toLocaleLowerCase();
    return collaborators.filter((collaborator) => {
      const matchesSearch =
        !query ||
        collaborator.name.toLocaleLowerCase().includes(query) ||
        collaborator.registration.toLocaleLowerCase().includes(query);
      return (
        matchesSearch &&
        (filters.shift === 'all' || collaborator.shift === filters.shift) &&
        (filters.regime === 'all' || collaborator.regime === filters.regime) &&
        (filters.status === 'all' || collaborator.status === filters.status) &&
        (filters.area === 'all' || collaborator.area === filters.area)
      );
    });
  }, [collaborators, filters]);

  const presentCount = filteredCollaborators.filter(({ status }) => status === 'present').length;
  const coverage = filteredCollaborators.length
    ? Math.round((presentCount / filteredCollaborators.length) * 100)
    : 0;
  const extraHours = filteredCollaborators.reduce((total, collaborator) => total + (collaborator.extraHours || 0), 0);

  const updateFilter = <K extends keyof PlanningFilters>(key: K, value: PlanningFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = () => setFilters(initialFilters);

  return (
    <aside
      aria-label="Filtros do planejamento executivo"
      className="flex w-full flex-col gap-5 rounded-2xl border border-slate-700/70 bg-gradient-to-b from-[#101e31] to-[#0a1424] p-5 text-slate-100 shadow-2xl shadow-black/20 lg:max-w-[320px]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-700/60 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="rounded-lg bg-cyan-400/10 p-2 text-cyan-300"><Filter size={17} /></span>
          <div>
            <h2 className="text-sm font-black tracking-wide text-white">Filtros de planejamento</h2>
            <p className="mt-0.5 text-[11px] text-slate-400">Visão executiva de escala</p>
          </div>
        </div>
        <button type="button" onClick={clearFilters} className="text-slate-500 transition hover:text-cyan-300" aria-label="Limpar filtros">
          <X size={16} />
        </button>
      </div>

      <label htmlFor="planning-search" className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">Colaborador</span>
        <span className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950/70 px-3 focus-within:border-cyan-400">
          <Search size={15} className="shrink-0 text-slate-500" />
          <input
            id="planning-search"
            name="planningSearch"
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Nome ou matrícula"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-xs font-semibold text-slate-100 outline-none placeholder:text-slate-600"
          />
        </span>
      </label>

      <fieldset className="space-y-2">
        <legend className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.14em] text-slate-400"><CalendarDays size={13} /> Janela temporal</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-950/60 p-1">
          {windowOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filters.window === option.value}
              onClick={() => updateFilter('window', option.value)}
              className={`rounded-md px-1 py-2 text-[10px] font-bold transition ${filters.window === option.value ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <FilterSelect id="planning-shift" name="planningShift" label="Turno" value={filters.shift} onChange={(value) => updateFilter('shift', value as PlanningFilters['shift'])}>
        <option value="all">Todos os turnos</option>
        {shiftOptions.map((option) => <option key={option.value} value={option.value}>{option.label} · {option.detail}</option>)}
      </FilterSelect>
      <FilterSelect id="planning-regime" name="planningRegime" label="Regime" value={filters.regime} onChange={(value) => updateFilter('regime', value as PlanningFilters['regime'])}>
        <option value="all">Todos os regimes</option>
        {regimeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </FilterSelect>
      <FilterSelect id="planning-status" name="planningStatus" label="Status" value={filters.status} onChange={(value) => updateFilter('status', value as PlanningFilters['status'])}>
        <option value="all">Todos os status</option>
        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </FilterSelect>
      <FilterSelect id="planning-area" name="planningArea" label="Área" value={filters.area} onChange={(value) => updateFilter('area', value as PlanningFilters['area'])}>
        <option value="all">Todas as áreas</option>
        {areaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </FilterSelect>

      <div className="grid grid-cols-3 gap-2 border-y border-slate-700/60 py-4">
        <Metric icon={<Check size={14} />} label="Cobertura turno" value={`${coverage}%`} tone="text-emerald-300" />
        <Metric icon={<Users size={14} />} label="Colaboradores" value={filteredCollaborators.length} tone="text-cyan-300" />
        <Metric icon={<Clock3 size={14} />} label="Horas extras" value={`${extraHours}h`} tone="text-amber-300" />
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => onSimulate(filters)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2.5 text-xs font-black text-slate-950 transition hover:bg-cyan-300">
          <Play size={14} /> Simular
        </button>
        <button type="button" onClick={() => onExport(filters, filteredCollaborators)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-3 py-2.5 text-xs font-bold text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300" aria-label="Exportar planejamento filtrado">
          <Download size={14} /> Exportar
        </button>
      </div>
    </aside>
  );
}

export default FilterSidebarPlanning;

interface FilterSelectProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}

function FilterSelect({ id, name, label, value, onChange, children }: FilterSelectProps) {
  return (
    <label htmlFor={id} className="relative space-y-2">
      <span className="block text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{label}</span>
      <select id={id} name={name} value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
        {children}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute bottom-3 right-3 text-slate-500" />
    </label>
  );
}

function Metric({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <div className="text-center">
      <div className={`mx-auto mb-1 flex w-fit items-center gap-1 text-base font-black ${tone}`}>{icon}{value}</div>
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
