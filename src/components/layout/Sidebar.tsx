import { Anchor, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface NavItem<T extends string = string> {
  id: T;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface SidebarProps<T extends string> {
  items: NavItem<T>[];
  active: T;
  onSelect: (id: T) => void;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar<T extends string>({ items, active, onSelect, open, onClose }: SidebarProps<T>) {
  return (
    <>
      <div className={cn('fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')} onClick={onClose} aria-hidden="true" />
      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-slate-800/80 bg-[#080c15] p-4 text-slate-100 transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navegação principal"
      >
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 text-slate-950">
              <Anchor className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Porto do Pecém</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Gestão operacional</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:text-white lg:hidden" aria-label="Fechar menu"><X size={18} /></button>
        </div>

        <nav className="flex-1 space-y-1">
          {items.map(({ id, label, icon: Icon }) => {
            const isActive = id === active;
            return (
              <button
                key={id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => { onSelect(id); onClose(); }}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition',
                  isActive ? 'bg-cyan-400/10 text-white ring-1 ring-inset ring-cyan-400/30' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-100'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-cyan-300' : 'text-slate-500 group-hover:text-slate-300')} />
                {label}
              </button>
            );
          })}
        </nav>

        <p className="mt-4 border-t border-slate-800/80 pt-4 text-[10px] leading-relaxed text-slate-600">Dados: Supabase · Line-up SIC-TOS (CIPP)</p>
      </aside>
    </>
  );
}
