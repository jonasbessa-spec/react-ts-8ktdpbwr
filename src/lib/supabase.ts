import { createClient } from '@supabase/supabase-js';

// Sanitização da URL removendo barras extras no final
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const parsedSupabaseUrl = (() => {
  try {
    return new URL(supabaseUrl);
  } catch {
    return null;
  }
})();

// Validação de configuração
export const supabaseConfigured = Boolean(
  parsedSupabaseUrl?.protocol === 'https:' &&
  (parsedSupabaseUrl.pathname === '' || parsedSupabaseUrl.pathname === '/') &&
  supabaseAnonKey
);

export const supabaseConfigError = !supabaseConfigured
  ? 'Configure VITE_SUPABASE_URL com a URL raiz HTTPS do projeto (sem /rest/v1) e VITE_SUPABASE_ANON_KEY.'
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