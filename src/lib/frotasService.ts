import { supabase } from './supabase';

export interface ResumoOperacional {
  id?: string;
  equipamento?: string;
  status_atual?: string;
  prancha_realizada_ton_h?: number;
  meta_prancha_ton_h?: number;
  [key: string]: any;
}

export const getDadosIntegrados = async () => {
  try {
    const [frotasRes, operacoesRes] = await Promise.all([
      supabase.from('frotas').select('*'),
      supabase.from('operacoes_navio').select('*')
    ]);

    return {
      frotas: frotasRes.data || [],
      operacoes: operacoesRes.data || [],
      error: frotasRes.error || operacoesRes.error || null
    };
  } catch (err: any) {
    console.error('Erro em getDadosIntegrados:', err);
    return { frotas: [], operacoes: [], error: err };
  }
};