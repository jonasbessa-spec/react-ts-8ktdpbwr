export interface LocalCollaborator {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  turno: string;
  data_admissao: string;
  inicio_periodo_aquisitivo: string;
  fim_periodo_concessivo: string;
}

export interface LocalCollaboratorsResult {
  collaborators: LocalCollaborator[];
  persistenceAvailable: boolean;
}

export const LOCAL_COLLABORATORS_KEY = 'porto-pecem:colaboradores:v1';

export function isLocalDemoEnvironment(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  const { hostname } = window.location;
  return hostname === 'localhost'
    || hostname === '127.0.0.1'
    || hostname.endsWith('.webcontainer.io')
    || hostname.endsWith('.stackblitz.io');
}

export const SAMPLE_COLLABORATORS: LocalCollaborator[] = [
  {
    id: '1',
    nome: 'Carlos Silva',
    cpf: '123.456.789-01',
    cargo: 'Operador de Escala',
    turno: 'Turno A',
    data_admissao: '2022-03-15',
    inicio_periodo_aquisitivo: '2025-03-15',
    fim_periodo_concessivo: '2026-12-15',
  },
  {
    id: '2',
    nome: 'Ana Souza',
    cpf: '987.654.321-00',
    cargo: 'Supervisor de Turno',
    turno: 'Turno A',
    data_admissao: '2021-06-01',
    inicio_periodo_aquisitivo: '2025-06-01',
    fim_periodo_concessivo: '2027-03-01',
  },
  {
    id: '3',
    nome: 'Roberto Lima',
    cpf: '456.789.123-00',
    cargo: 'Operador de Escala',
    turno: 'Turno B',
    data_admissao: '2023-01-10',
    inicio_periodo_aquisitivo: '2025-01-10',
    fim_periodo_concessivo: '2026-10-10',
  },
];

const isLocalCollaborator = (value: unknown): value is LocalCollaborator => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return ['id', 'nome', 'cpf', 'cargo', 'turno', 'data_admissao', 'inicio_periodo_aquisitivo', 'fim_periodo_concessivo']
    .every((field) => typeof row[field] === 'string');
};

export function initializeLocalCollaborators(): LocalCollaboratorsResult {
  try {
    const stored = window.localStorage.getItem(LOCAL_COLLABORATORS_KEY);
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every(isLocalCollaborator) && parsed.length > 0) {
          return { collaborators: parsed, persistenceAvailable: true };
        }
      } catch (error) {
        console.warn('Os dados locais de colaboradores estavam inválidos; serão recriados com dados de demonstração.', error);
      }
    }
    window.localStorage.setItem(LOCAL_COLLABORATORS_KEY, JSON.stringify(SAMPLE_COLLABORATORS));
    return { collaborators: SAMPLE_COLLABORATORS, persistenceAvailable: true };
  } catch (error) {
    console.warn('Armazenamento local indisponível; os dados de demonstração permanecem apenas na memória.', error);
    return { collaborators: SAMPLE_COLLABORATORS, persistenceAvailable: false };
  }
}

export function saveLocalCollaborators(collaborators: LocalCollaborator[]): void {
  window.localStorage.setItem(LOCAL_COLLABORATORS_KEY, JSON.stringify(collaborators));
}

const normalizeHeader = (value: string) =>
  value.trim().toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

function parseDelimitedRows(text: string): string[][] {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [';', ',', '\t']
    .map((character) => ({ character, count: firstLine.split(character).length - 1 }))
    .sort((left, right) => right.count - left.count)[0].character;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const input = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"' && quoted && input[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseCollaboratorCsv(text: string): LocalCollaborator[] {
  const [headerRow, ...dataRows] = parseDelimitedRows(text);
  if (!headerRow || !dataRows.length) throw new Error('A planilha precisa conter cabeçalho e pelo menos uma linha de dados.');

  const headers = headerRow.map(normalizeHeader);
  const aliases: Record<keyof Omit<LocalCollaborator, 'id'>, string[]> = {
    nome: ['nome', 'colaborador', 'name'],
    cpf: ['cpf', 'documento'],
    cargo: ['cargo', 'funcao', 'role'],
    turno: ['turno', 'shift'],
    data_admissao: ['data_admissao', 'data_de_admissao', 'admissao', 'admission_date'],
    inicio_periodo_aquisitivo: ['inicio_periodo_aquisitivo', 'inicio_do_periodo_aquisitivo', 'periodo_aquisitivo', 'inicio_aquisitivo'],
    fim_periodo_concessivo: ['fim_periodo_concessivo', 'fim_do_periodo_concessivo', 'periodo_concessivo', 'fim_concessivo'],
  };
  const positions = Object.fromEntries(
    Object.entries(aliases).map(([field, names]) => [field, headers.findIndex((header) => names.includes(header))]),
  ) as Record<keyof Omit<LocalCollaborator, 'id'>, number>;
  if (positions.nome < 0) throw new Error('A planilha precisa ter uma coluna Nome ou Colaborador.');

  return dataRows.map((cells) => {
    const value = (field: keyof Omit<LocalCollaborator, 'id'>) => {
      const position = positions[field];
      return position < 0 ? '' : (cells[position] ?? '');
    };
    return {
      id: makeCollaboratorId(),
      nome: value('nome'),
      cpf: value('cpf'),
      cargo: value('cargo'),
      turno: value('turno'),
      data_admissao: normalizeImportDate(value('data_admissao')),
      inicio_periodo_aquisitivo: normalizeImportDate(value('inicio_periodo_aquisitivo')),
      fim_periodo_concessivo: normalizeImportDate(value('fim_periodo_concessivo')),
    };
  }).filter((collaborator) => collaborator.nome.length > 0);
}

export function makeCollaboratorId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `col-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeImportDate(value: string): string {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}
