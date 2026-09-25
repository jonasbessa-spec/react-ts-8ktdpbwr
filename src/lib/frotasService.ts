import { supabase } from './supabase';

export interface Equipamento {
  id: string;
  codigo_bem: string;
  descricao: string;
  tipo_equipamento: 'cavalos' | 'semirreboques' | 'patio';
  status: 'disponivel' | 'em_uso' | 'manutencao';
  localizacao?: string;
  turno?: string;
}

export const getEquipamentos = async (): Promise<Equipamento[]> => {
  try {
    const [cmRes, srRes, patioRes] = await Promise.all([
      supabase.from('cm').select('*'),
      supabase.from('sr').select('*'),
      supabase.from('equipamentos_patio').select('*')
    ]);

    const lista: Equipamento[] = [];

    // Mapeia Semirreboques (ex: SR10000, SR10005)
    if (srRes.data) {
      srRes.data.forEach((item: any) => {
        lista.push({
          id: item.id || item.FROTA || Math.random().toString(),
          codigo_bem: item.FROTA || 'SR',
          descricao: item.TIPO || 'Semirreboque',
          tipo_equipamento: 'semirreboques',
          status: (item.STATUS || '').toLowerCase().includes('manut') ? 'manutencao' : 'disponivel',
          localizacao: item.LOCALIZACAO || 'PORTO',
          turno: 'Turno 1 - Diurno'
        });
      });
    }

    // Mapeia Cavalos Mecânicos (CM)
    if (cmRes.data) {
      cmRes.data.forEach((item: any) => {
        lista.push({
          id: item.id || item.FROTA || Math.random().toString(),
          codigo_bem: item.FROTA || item.codigo || 'CM',
          descricao: item.TIPO || item.MODELO || 'Cavalo Mecânico',
          tipo_equipamento: 'cavalos',
          status: (item.STATUS || '').toLowerCase().includes('manut') ? 'manutencao' : 'disponivel',
          localizacao: item.LOCALIZACAO || 'PORTO',
          turno: 'Turno 1 - Diurno'
        });
      });
    }

    // Mapeia Equipamentos de Pátio
    if (patioRes.data) {
      patioRes.data.forEach((item: any) => {
        lista.push({
          id: item.id || item.FROTA || Math.random().toString(),
          codigo_bem: item.FROTA || item.codigo || 'EQP',
          descricao: item.TIPO || 'Equipamento Pátio',
          tipo_equipamento: 'patio',
          status: (item.STATUS || '').toLowerCase().includes('manut') ? 'manutencao' : 'disponivel',
          localizacao: item.LOCALIZACAO || 'PÁTIO',
          turno: 'Turno 1 - Diurno'
        });
      });
    }

    return lista;
  } catch (err) {
    console.error("Erro ao carregar dados do Supabase:", err);
    return [];
  }
};