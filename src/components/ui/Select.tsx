import type { SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export default function Select({
  id,
  label,
  error,
  className = '',
  wrapperClassName = '',
  children,
  'aria-describedby': ariaDescribedBy,
  ...props
}: SelectProps) {
  const selectId = id || props.name;
  const errorId = error && selectId ? `${selectId}-error` : undefined;
  const describedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`min-w-0 ${wrapperClassName}`.trim()}>
      {label && selectId && (
        <label htmlFor={selectId} className="mb-1 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        {...props}
        id={selectId}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy}
        className={`w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 ${className}`.trim()}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-1 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}