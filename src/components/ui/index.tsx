import type { ReactNode } from 'react';
import { Inbox, Loader2, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-xl shadow-black/10', className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, icon, action }: { title: string; subtitle?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
      <div className="min-w-0">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">{icon}{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const tones = {
  blue: 'text-blue-300 bg-blue-500/10',
  cyan: 'text-cyan-300 bg-cyan-500/10',
  emerald: 'text-emerald-300 bg-emerald-500/10',
  amber: 'text-amber-300 bg-amber-500/10',
  red: 'text-red-300 bg-red-500/10',
  violet: 'text-violet-300 bg-violet-500/10',
} as const;

export function KpiCard({ label, value, unit, hint, icon, tone = 'blue' }: { label: string; value: ReactNode; unit?: string; hint?: string; icon?: ReactNode; tone?: keyof typeof tones }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        {icon && <span className={cn('rounded-lg p-1.5', tones[tone])}>{icon}</span>}
      </div>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-white tabular-nums">
        {value}{unit && <span className="ml-1 text-sm font-semibold text-slate-400">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return <div className="flex min-h-[240px] items-center justify-center gap-3 text-sm text-slate-400"><Loader2 size={18} className="animate-spin text-cyan-400" /> {message}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200" role="alert">
      <TriangleAlert size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1">{message}</div>
      {onRetry && <button type="button" onClick={onRetry} className="rounded-md border border-red-400/40 px-2.5 py-1 text-xs font-semibold hover:bg-red-500/20">Tentar de novo</button>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-slate-500"><Inbox size={22} className="text-slate-600" />{message}</div>;
}

export const tableClass = {
  wrap: 'overflow-x-auto',
  table: 'w-full text-left text-sm',
  thead: 'text-[11px] uppercase tracking-wider text-slate-500',
  th: 'px-5 py-3 font-semibold whitespace-nowrap',
  tr: 'border-t border-slate-800/70 hover:bg-slate-800/30',
  td: 'px-5 py-3 whitespace-nowrap text-slate-300',
};
