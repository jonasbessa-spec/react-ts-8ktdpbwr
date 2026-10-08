import type { ReactNode } from 'react';

export interface MetricCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  className?: string;
}

export default function MetricCard({
  label,
  value,
  icon,
  description,
  className = '',
}: MetricCardProps) {
  return (
    <article className={`min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`.trim()}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium text-slate-600">{label}</h3>
          <p className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {value}
          </p>
        </div>
        {icon && (
          <div className="flex shrink-0 items-center justify-center rounded-lg bg-blue-50 p-2.5 text-blue-700" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
      {description && <div className="mt-3 break-words text-sm text-slate-500">{description}</div>}
    </article>
  );
}