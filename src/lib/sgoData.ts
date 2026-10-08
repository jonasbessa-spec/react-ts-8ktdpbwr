import type { ColaboradorRow } from '../types';

export const SGO_DATA_CHANGED_EVENT = 'sgo:data-changed';
export const UNILINK_COLLABORATORS_KEY = 'unilink_colaboradores';
export const SHIP_LINEUP_CACHE_KEY = 'porto-pecem:lineup-cache:v1';

export type CollaboratorSource = 'supabase' | 'cache local' | 'demonstração';

const SAMPLE_COLLABORATORS: ColaboradorRow[] = [
  { id: 'demo-1', nome: 'Mariana Costa', cargo: 'Operadora portuária', turno: 'Turno A', status: 'Ativo', area: 'yard-gate', fonte_dados: 'demonstração' },
  { id: 'demo-2', nome: 'Rafael Oliveira', cargo: 'Supervisor de operações', turno: 'Turno B', status: 'Ativo', area: 'yard-gate', fonte_dados: 'demonstração' },
  { id: 'demo-3', nome: 'Juliana Santos', cargo: 'Assistente de planejamento', turno: 'Turno Comercial', status: 'Ativo', area: 'yard-gate', fonte_dados: 'demonstração' },
  { id: 'demo-4', nome: 'Pedro Almeida', cargo: 'Operador de equipamentos', turno: 'Turno C', status: 'Ativo', area: 'yard-gate', fonte_dados: 'demonstração' },
  { id: 'demo-5', nome: 'Camila Ferreira', cargo: 'Técnica de segurança', turno: 'Turno A', status: 'Ativo', area: 'yard-gate', fonte_dados: 'demonstração' },
];

function readString(row: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }
  return fallback;
}

export function normalizeCollaborators(rows: readonly Record<string, unknown>[], source: CollaboratorSource): ColaboradorRow[] {
  return rows.map((row, index) => ({
    id: readString(row, ['id'], `${source}-${index + 1}`),
    nome: readString(row, ['nome', 'name', 'colaborador'], 'Colaborador sem nome'),
    colaborador: readString(row, ['colaborador']),
    cargo: readString(row, ['cargo', 'role', 'funcao']),
    turno: readString(row, ['turno', 'shift', 'escala']),
    escala: readString(row, ['escala']),
    status: readString(row, ['status'], 'Ativo'),
    matricula: readString(row, ['matricula', 'registration']),
    area: readString(row, ['area', 'alocacao']),
    fonte_dados: source,
  }));
}

export function getCollaboratorFallback(): { collaborators: ColaboradorRow[]; source: Exclude<CollaboratorSource, 'supabase'> } {
  try {
    const stored = window.localStorage.getItem(UNILINK_COLLABORATORS_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((row) => typeof row === 'object' && row !== null)) {
        return {
          collaborators: normalizeCollaborators(parsed as Record<string, unknown>[], 'cache local'),
          source: 'cache local',
        };
      }
    }
  } catch (error) {
    console.warn('Não foi possível ler o cache local do SGO Unilink; serão usados dados demonstrativos.', error);
  }
  return { collaborators: SAMPLE_COLLABORATORS, source: 'demonstração' };
}

export interface BerthAssignmentCandidate {
  berco_programado: string | null;
  berco_atribuicao_automatica?: boolean;
  tipo_carga: string;
  eta: string;
  etd: string | null;
}

const ASSIGNABLE_BERTHS = ['01', '02', '03', '04', '05', '06', '07', '08'] as const;
const EXISTING_BERTHS = [...ASSIGNABLE_BERTHS, '10'];
const berthNumber = (value: unknown): string | null => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized || normalized === 'PENDENTE' || normalized === 'NULL') return null;
  const digits = normalized.replace(/\D/g, '');
  const padded = digits ? digits.padStart(2, '0') : '';
  return EXISTING_BERTHS.includes(padded) ? padded : null;
};
const timestamp = (value: string | null | undefined): number => {
  const parsed = value ? new Date(value).getTime() : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};
const occupancyEnd = (ship: BerthAssignmentCandidate): number => {
  const eta = timestamp(ship.eta);
  const etd = timestamp(ship.etd);
  return Number.isFinite(etd) && etd > eta ? etd : eta + 24 * 60 * 60 * 1000;
};
const cargoPreference = (cargo: string): string[] => {
  const value = cargo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/granel|mineral|grao|carvao|fertiliz/.test(value)) return [...ASSIGNABLE_BERTHS.slice(0, 4), ...ASSIGNABLE_BERTHS.slice(4)];
  if (/aco|madeira|projeto|carga geral/.test(value)) return [...ASSIGNABLE_BERTHS.slice(4), ...ASSIGNABLE_BERTHS.slice(0, 4)];
  return [...ASSIGNABLE_BERTHS];
};

export function assignTentativeBerths<T extends BerthAssignmentCandidate>(ships: readonly T[]): Array<T & { berco_programado: string | null; berco_atribuicao_automatica: boolean }> {
  const ordered = ships
    .map((ship, index) => ({ ship, index, eta: timestamp(ship.eta) }))
    .sort((left, right) => {
      if (!Number.isFinite(left.eta)) return Number.isFinite(right.eta) ? 1 : left.index - right.index;
      if (!Number.isFinite(right.eta)) return -1;
      return left.eta - right.eta || left.index - right.index;
    });
  const scheduled = new Map<string, BerthAssignmentCandidate[]>();
  const result = new Array<T & { berco_programado: string | null; berco_atribuicao_automatica: boolean }>(ships.length);

  for (const ship of ships) {
    const berth = berthNumber(ship.berco_programado);
    if (!berth || !Number.isFinite(timestamp(ship.eta))) continue;
    scheduled.set(berth, [...(scheduled.get(berth) ?? []), ship]);
  }

  for (const { ship, index } of ordered) {
    const existingBerth = berthNumber(ship.berco_programado);
    const arrival = timestamp(ship.eta);
    let selectedBerth = existingBerth;
    let automatic = Boolean(ship.berco_atribuicao_automatica && existingBerth);

    if (!selectedBerth && Number.isFinite(arrival)) {
      const preferences = cargoPreference(ship.tipo_carga);
      selectedBerth = preferences.find((candidate) => {
        const bookings = scheduled.get(candidate) ?? [];
        return bookings.every((booking) => {
          const bookingStart = timestamp(booking.eta);
          const bookingEnd = occupancyEnd(booking);
          return arrival >= bookingEnd || arrival + 24 * 60 * 60 * 1000 <= bookingStart;
        });
      }) ?? null;
      automatic = selectedBerth !== null;
    }

    if (automatic && selectedBerth && Number.isFinite(arrival)) {
      const bookings = scheduled.get(selectedBerth) ?? [];
      bookings.push(ship);
      scheduled.set(selectedBerth, bookings);
    }
    result[index] = { ...ship, berco_programado: selectedBerth, berco_atribuicao_automatica: automatic };
  }
  return result;
}

export function readCachedShips<T>(key: string): T[] {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return [];
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch (error) {
    console.warn('Não foi possível ler o cache local do lineup.', error);
    return [];
  }
}

export function writeCachedShips<T>(key: string, ships: readonly T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(ships));
  } catch (error) {
    console.warn('Não foi possível atualizar o cache local do lineup.', error);
  }
}
