import { useState, useEffect } from 'react';
import { supabase, supabaseConfigured, supabaseConfigError, getSupabaseErrorMessage } from '../lib/supabase';

export interface PranchaKPI {
  operacao_id?: string;
  nome_navio?: string;
  prancha_realizada_ton_h?: number;
  meta_prancha_ton_h?: number;
  percentual_concluido?: number;
  status?: string;
  [key: string]: any;
}

export interface FrotaKPI {
  id?: string;
  equipamento?: string;
  status_atual?: string;
  [key: string]: any;
}

export function useCockpitData() {
  const [data, setData] = useState<any>({
    colaboradores: [],
    operacoes: [],
    pranchaMedia: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    async function loadCockpitData() {
      if (!supabaseConfigured) {
        setData((prev: any) => ({
          ...prev,
          loading: false,
          error: supabaseConfigError
        }));
        return;
      }

      try {
        const [colabRes, opsRes, pranchaRes] = await Promise.all([
          supabase.from('colaboradores').select('*'),
          supabase.from('operacoes_navio').select('*'),
          supabase.from('view_kpi_prancha_operacional').select('*')
        ]);

        if (colabRes.error) {
          console.error("Erro ao buscar colaboradores:", colabRes.error);
        }

        const ops = (pranchaRes.data && pranchaRes.data.length > 0)
          ? pranchaRes.data 
          : (opsRes.data || []);

        const totalPrancha = ops.reduce((acc: number, item: any) => {
          return acc + Number(item.prancha_realizada_ton_h || item.prancha_real || 0);
        }, 0);

        const media = ops.length > 0 ? Number((totalPrancha / ops.length).toFixed(1)) : 0;

        setData({
          colaboradores: colabRes.data || [],
          operacoes: ops,
          pranchaMedia: media,
          loading: false,
          error: colabRes.error ? getSupabaseErrorMessage(colabRes.error) : null
        });
      } catch (err: any) {
        console.error("Erro no useCockpitData:", err);
        setData((prev: any) => ({
          ...prev,
          loading: false,
          error: getSupabaseErrorMessage(err)
        }));
      }
    }

    loadCockpitData();
  }, []);

  return data;
}

export { supabaseConfigured, supabaseConfigError, getSupabaseErrorMessage };