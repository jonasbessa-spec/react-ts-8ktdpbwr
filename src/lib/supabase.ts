import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'public-anon-key';

export const supabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

export function getSupabaseErrorMessage(cause: unknown, fallback: string) {
  const message = cause instanceof Error ? cause.message : '';
  const details = typeof cause === 'object' && cause !== null
    ? JSON.stringify(cause)
    : String(cause ?? '');
  const status = typeof cause === 'object' && cause !== null && 'status' in cause
    ? String((cause as { status?: unknown }).status)
    : '';

  if (status === '401' || /401|unauthorized|invalid api key|invalid jwt|apikey/i.test(`${message} ${details}`)) {
    return 'Supabase rejeitou a chave (HTTP 401). No arquivo .env, use a chave pública anon/publishable do mesmo projeto em Settings > API e reinicie o Vite.';
  }

  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return 'Não foi possível acessar o Supabase. Verifique sua internet, a URL do projeto e bloqueadores do navegador.';
  }

  return message || fallback;
}