import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export interface PranchaKPI {
  operacao_id: string;
  nome_navio: string;
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

  const fetchData = async () => {
    setLoading(true);
    const { data: prancha } = await supabase.from('view_kpi_prancha_operacional').select('*');
    const { data: frota } = await supabase.from('view_kpi_disponibilidade_frota').select('*');

    if (prancha) setPranchaData(prancha);
    if (frota) setFrotaData(frota);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Inscrição em tempo real para atualizações na operação
    const channel = supabase
      .channel('cockpit-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'operacoes_navio' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interrupcoes_operacionais' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { pranchaData, frotaData, loading, refetch: fetchData };
}