import { supabase } from './supabase';
import { CavaloMecanico, SemiReboque } from '../types';

export async function getCavalosMecanicos(): Promise<CavaloMecanico[]> {
  try {
    const { data, error } = await supabase
      .from('cm')
      .select('*');

    if (error) {
      console.error('Erro ao buscar Cavalos Mecânicos (cm):', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Falha na requisição cm:', err);
    return [];
  }
}

export async function getSemiReboques(): Promise<SemiReboque[]> {
  try {
    const { data, error } = await supabase
      .from('sr')
      .select('*');

    if (error) {
      console.error('Erro ao buscar Semi-reboques (sr):', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Falha na requisição sr:', err);
    return [];
  }
}