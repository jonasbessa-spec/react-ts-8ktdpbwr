import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converte erros do Supabase/Fetch em mensagens amigáveis para a interface.
 * Aceita uma mensagem de fallback customizada como segundo argumento.
 */
export function getSupabaseErrorMessage(
  error: unknown,
  fallbackMessage = 'Ocorreu um erro inesperado na operação.'
): string {
  if (!error) return fallbackMessage;

  if (typeof error === 'string') return error;

  if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string; error_description?: string; details?: string };
    if (err.message) return err.message;
    if (err.error_description) return err.error_description;
    if (err.details) return err.details;
  }

  return fallbackMessage;
}