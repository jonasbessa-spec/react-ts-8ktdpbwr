import { createClient } from '@supabase/supabase-js';

// Sanitização da URL removendo barras extras no final
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validação de configuração
export const supabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://')
);

export const supabaseConfigError = !supabaseConfigured
  ? 'Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausentes ou inválidas.'
  : null;

// Cliente Supabase
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// Helper para formatação de mensagens de erro
export function getSupabaseErrorMessage(
  error: unknown,
  fallback = 'Erro desconhecido no banco de dados.',
): string {
  if (typeof error === 'string' && error) return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null) {
    const details = error as { message?: unknown; error_description?: unknown };
    if (typeof details.message === 'string' && details.message) return details.message;
    if (typeof details.error_description === 'string' && details.error_description) {
      return details.error_description;
    }
    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      return fallback;
    }
  }
  return fallback;
}