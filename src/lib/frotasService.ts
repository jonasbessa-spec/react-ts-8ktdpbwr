import { supabase } from './supabase';

type DatabaseRow = Record<string, unknown>;

export interface Equipamento {
  id: string;
  codigo_bem: string;
  descricao: string;
  tipo_equipamento: 'cavalos' | 'semirreboques' | 'patio';
  status: 'disponivel' | 'em_uso' | 'manutencao';
  localizacao?: string;
  turno?: string;
}

export interface ResumoOperacional {
  equipamentos: {
    semirreboquesTotal: number;
    cavalosTotal: number;
    listaSemirreboques: DatabaseRow[];
  };
  staff: {
    emTurno: number;
    totalColaboradores: number;
  };
  operacoes: {
    pranchaMedia: number;
  };
}

export async function getDadosIntegrados(): Promise<ResumoOperacional> {
  const [cmRes, srRes, staffRes, operationsRes, boardRes] = await Promise.all([
    supabase.from('cm').select('*'),
    supabase.from('sr').select('*'),
    supabase.from('colaboradores').select('*'),
    supabase.from('operacoes_navio').select('*'),
    supabase.from('view_kpi_prancha_operacional').select('*'),
  ]);

  const error = cmRes.error || srRes.error || staffRes.error || operationsRes.error || boardRes.error;
  if (error) throw error;

  const operations = boardRes.data?.length ? boardRes.data : operationsRes.data || [];
  const rates = operations
    .map((row) => Number(row.prancha_realizada_ton_h ?? row.prancha_real ?? 0))
    .filter(Number.isFinite);
  const presentStatuses = new Set(['presente', 'present', 'em turno', 'operando']);
  const staffOnDuty = (staffRes.data || []).filter((row) =>
    presentStatuses.has(String(row.status || '').trim().toLowerCase()),
  ).length;

  return {
    equipamentos: {
      semirreboquesTotal: srRes.data?.length || 0,
      cavalosTotal: cmRes.data?.length || 0,
      listaSemirreboques: srRes.data || [],
    },
    staff: {
      emTurno: staffOnDuty,
      totalColaboradores: staffRes.data?.length || 0,
    },
    operacoes: {
      pranchaMedia: rates.length
        ? Number((rates.reduce((total, rate) => total + rate, 0) / rates.length).toFixed(1))
        : 0,
    },
  };
}

export const getEquipamentos = async (): Promise<Equipamento[]> => {
  const [cmRes, srRes, patioRes] = await Promise.all([
    supabase.from('cm').select('*'),
    supabase.from('sr').select('*'),
    supabase.from('equipamentos_patio').select('*')
  ]);

  const error = cmRes.error || srRes.error || patioRes.error;
  if (error) throw error;

  const mapEquipment = (
    rows: DatabaseRow[],
    type: Equipamento['tipo_equipamento'],
    defaultCode: string,
    defaultDescription: string,
  ): Equipamento[] => rows.map((item, index) => {
    const status = String(item.STATUS ?? item.status ?? '').toLowerCase();
    const rawCode = item.FROTA ?? item.frota ?? item.codigo ?? item.bem;
    const code = String(rawCode ?? defaultCode);
    const normalizedStatus = status.includes('manut') || status.includes('parado')
      ? 'manutencao'
      : status.includes('uso') || status.includes('operando')
        ? 'em_uso'
        : 'disponivel';
    return {
      id: String(item.id ?? rawCode ?? `${type}-${index}`),
      codigo_bem: code,
      descricao: String(item.TIPO ?? item.tipo ?? item.MODELO ?? item.categoria ?? defaultDescription),
      tipo_equipamento: type,
      status: normalizedStatus,
      localizacao: String(item.LOCALIZACAO ?? item.localizacao ?? 'PORTO'),
    };
  });

  return [
    ...mapEquipment((srRes.data || []) as DatabaseRow[], 'semirreboques', 'SR', 'Semirreboque'),
    ...mapEquipment((cmRes.data || []) as DatabaseRow[], 'cavalos', 'CM', 'Cavalo Mecânico'),
    ...mapEquipment((patioRes.data || []) as DatabaseRow[], 'patio', 'EQP', 'Equipamento Pátio'),
  ];
};