import { supabase, supabaseConfigured, supabaseConfigError } from './supabase';
import type { OperationalDatabaseRow } from '../types';

export interface ResumoOperacional {
  id?: string;
  equipamento?: string;
  status_atual?: string;
  prancha_realizada_ton_h?: number;
  meta_prancha_ton_h?: number;
  [key: string]: unknown;
}

type Row = OperationalDatabaseRow;

const isCavalo = (row: Row) => /cavalo|^cm\b|trator/i.test(String(row.TIPO ?? row.tipo ?? row.categoria ?? ''));
const isSemi = (row: Row) => /semi|^sr\b|reboque|carreta/i.test(String(row.TIPO ?? row.tipo ?? row.categoria ?? ''));

/**
 * Lê as tabelas de frota. Usa `cm`, `sr` e `equipamentos_patio` (as tabelas
 * protegidas pela migration de RLS) e, se `cm`/`sr` não existirem, tenta a
 * tabela única `frotas`, separando cavalos e semirreboques pela coluna TIPO.
 */
export const getDadosIntegrados = async () => {
  if (!supabaseConfigured) return { cm: [], sr: [], patio: [], operacoes: [], error: new Error(supabaseConfigError || '') };
  try {
    const [cmRes, srRes, patioRes, operacoesRes] = await Promise.all([
      supabase.from('cm').select('*'),
      supabase.from('sr').select('*'),
      supabase.from('equipamentos_patio').select('*'),
      supabase.from('operacoes_navio').select('*'),
    ]);

    let cm: Row[] = cmRes.data || [];
    let sr: Row[] = srRes.data || [];
    let fallbackError = null;

    if (cmRes.error && srRes.error) {
      const frotasRes = await supabase.from('frotas').select('*');
      fallbackError = frotasRes.error;
      const frotas: Row[] = frotasRes.data || [];
      cm = frotas.filter(isCavalo);
      sr = frotas.filter((row) => isSemi(row) || !isCavalo(row));
    }

    return {
      cm,
      sr,
      patio: patioRes.data || [],
      operacoes: operacoesRes.data || [],
      error: fallbackError || (cmRes.error && srRes.error && patioRes.error ? cmRes.error : null),
    };
  } catch (err) {
    console.error('Erro em getDadosIntegrados:', err);
    return { cm: [], sr: [], patio: [], operacoes: [], error: err };
  }
};
