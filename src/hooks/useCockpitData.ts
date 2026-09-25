import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
      try {
        const [colabRes, opsRes, pranchaRes] = await Promise.all([
          supabase.from('colaboradores').select('*'),
          supabase.from('operacoes_navio').select('*'),
          supabase.from('view_kpi_prancha_operacional').select('*')
        ]);

        const ops = pranchaRes.data && pranchaRes.data.length > 0 
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
          error: null
        });
      } catch (err: any) {
        console.error("Erro no useCockpitData:", err);
        setData((prev: any) => ({ ...prev, loading: false, error: err.message }));
      }
    }

    loadCockpitData();
  }, []);

  return data;
}