import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface PranchaKPI {
  operacao_id: string;
  nome_navio: string;
  imo_number: string | null;
  berco_codigo: string;
  tipo_operacao: string;
  tipo_carga: string;
  meta_prancha_ton_h: number;
  prancha_realizada_ton_h: number;
  percentual_concluido: number;
  horas_operadas: number;
}

export interface FrotaKPI {
  tag: string;
  categoria: string;
  status_atual: string;
  minutos_parado_hoje: number;
}

interface CockpitData {
  pranchaData: PranchaKPI[];
  frotaData: FrotaKPI[];
  loading: boolean;
  error: string | null;
}

type DatabaseRow = Record<string, unknown>;

const readText = (row: DatabaseRow, keys: string[], fallback = ''): string => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return String(value);
  }
  return fallback;
};

const readNumber = (row: DatabaseRow, keys: string[]): number => {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
};

export function useCockpitData() {
  const [data, setData] = useState<CockpitData>({
    pranchaData: [],
    frotaData: [],
    loading: true,
    error: null
  });
  const mounted = useRef(false);
  const requestId = useRef(0);

  const refetch = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (mounted.current) {
      setData((current) => ({ ...current, loading: true, error: null }));
    }
    try {
      const [operationsResult, boardResult, cmResult, srResult, yardResult] = await Promise.all([
        supabase.from('operacoes_navio').select('*'),
        supabase.from('view_kpi_prancha_operacional').select('*'),
        supabase.from('cm').select('*'),
        supabase.from('sr').select('*'),
        supabase.from('equipamentos_patio').select('*'),
      ]);
      const error = operationsResult.error || boardResult.error || cmResult.error || srResult.error || yardResult.error;
      if (error) throw error;
      if (!mounted.current || currentRequest !== requestId.current) return;

      const rawOperations = (boardResult.data?.length ? boardResult.data : operationsResult.data || []) as DatabaseRow[];
      const rawFleet = [
        ...((cmResult.data || []) as DatabaseRow[]).map((row) => ({ ...row, _category: 'Cavalo mecânico' })),
        ...((srResult.data || []) as DatabaseRow[]).map((row) => ({ ...row, _category: 'Semirreboque' })),
        ...((yardResult.data || []) as DatabaseRow[]).map((row) => ({ ...row, _category: 'Equipamento de pátio' })),
      ];
      setData({
        pranchaData: rawOperations.map((row, index) => ({
          operacao_id: readText(row, ['operacao_id', 'id'], `operacao-${index}`),
          nome_navio: readText(row, ['nome_navio', 'navio'], 'Navio sem identificação'),
          imo_number: readText(row, ['imo_number', 'imo']) || null,
          berco_codigo: readText(row, ['berco_codigo', 'berco'], 'Pendente'),
          tipo_operacao: readText(row, ['tipo_operacao', 'operacao'], 'Não informado'),
          tipo_carga: readText(row, ['tipo_carga', 'carga'], 'Não informado'),
          meta_prancha_ton_h: readNumber(row, ['meta_prancha_ton_h']),
          prancha_realizada_ton_h: readNumber(row, ['prancha_realizada_ton_h', 'prancha_real']),
          percentual_concluido: readNumber(row, ['percentual_concluido']),
          horas_operadas: readNumber(row, ['horas_operadas']),
        })),
        frotaData: rawFleet.map((row) => ({
          tag: readText(row, ['tag', 'FROTA', 'frota', 'bem', 'codigo'], 'Sem identificação'),
          categoria: readText(row, ['categoria', '_category'], 'Equipamento'),
          status_atual: readText(row, ['status_atual', 'STATUS', 'status'], 'desconhecido').toLowerCase(),
          minutos_parado_hoje: readNumber(row, ['minutos_parado_hoje', 'minutos_parado', 'dias_parado']),
        })),
        loading: false,
        error: null,
      });
    } catch (cause) {
      if (!mounted.current || currentRequest !== requestId.current) return;
      const message = cause instanceof Error ? cause.message : 'Não foi possível carregar os dados do cockpit.';
      console.error('Erro no useCockpitData:', cause);
      setData((current) => ({ ...current, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refetch();
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, [refetch]);

  return { ...data, refetch };
}