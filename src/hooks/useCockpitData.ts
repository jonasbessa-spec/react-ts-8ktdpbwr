import { useCallback, useEffect, useState } from 'react';
import { getSupabaseErrorMessage, supabase, supabaseConfigured, supabaseConfigError } from '../lib/supabase';

export interface PranchaKPI {
  operacao_id: string;
  nome_navio: string;
  imo_number?: string;
  berco_codigo: string;
  tipo_operacao: string;
  tipo_carga: string;
  meta_prancha_ton_h: number;
  prancha_realizada_ton_h: number;
  percentual_concluido: number;
  horas_operadas: number;
}

export interface FrotaKPI {
  equipamento_id: string;
  tag: string;
  categoria: string;
  status_atual: string;
  minutos_parado_hoje: number;
}

export function useCockpitData() {
  const [pranchaData, setPranchaData] = useState<PranchaKPI[]>([]);
  const [frotaData, setFrotaData] = useState<FrotaKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!supabaseConfigured) {
      setPranchaData([]);
      setFrotaData([]);
      setError(
        supabaseConfigError ||
        'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.'
      );
      setLoading(false);
      return;
    }

    try {
      const [pranchaResult, frotaResult] = await Promise.all([
        supabase.from('view_kpi_prancha_operacional').select('*'),
        supabase.from('view_kpi_disponibilidade_frota').select('*')
      ]);

      if (pranchaResult.error) throw pranchaResult.error;
      if (frotaResult.error) throw frotaResult.error;

      setPranchaData((pranchaResult.data ?? []) as PranchaKPI[]);
      setFrotaData((frotaResult.data ?? []) as FrotaKPI[]);
    } catch (cause) {
      const message = getSupabaseErrorMessage(cause, 'Não foi possível carregar os indicadores.');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (!supabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel('cockpit-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operacoes_navio' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interrupcoes_operacionais' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { pranchaData, frotaData, loading, error, refetch: fetchData };
}