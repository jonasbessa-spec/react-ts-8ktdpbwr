import { createClient } from '@supabase/supabase-js';

const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'public-anon-key';

const cleanEnvValue = (value: unknown) =>
  typeof value === 'string' ? value.trim().replace(/^['"]|['"]$/g, '') : '';

const configuredUrl = cleanEnvValue(import.meta.env.VITE_SUPABASE_URL);
const configuredKey = cleanEnvValue(import.meta.env.VITE_SUPABASE_ANON_KEY);

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.host);
  } catch {
    return false;
  }
};

export const supabaseConfigError = configuredUrl && !isValidHttpUrl(configuredUrl)
  ? 'A variável VITE_SUPABASE_URL na Vercel não é uma URL HTTP/HTTPS válida.'
  : null;

const SUPABASE_URL = isValidHttpUrl(configuredUrl) ? configuredUrl : FALLBACK_URL;
const SUPABASE_ANON_KEY = configuredKey || FALLBACK_KEY;

export const supabaseConfigured = Boolean(
  isValidHttpUrl(configuredUrl) && configuredKey
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
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