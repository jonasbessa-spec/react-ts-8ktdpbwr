import { createClient } from '@supabase/supabase-js';

// Remove barras no final da URL para evitar erros 400/404 na API de Auth
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Aviso: Variáveis de ambiente do Supabase não configuradas corretamente.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);