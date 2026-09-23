import React from 'react';
import { Anchor, LayoutDashboard, Ship, Truck } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-slate-950 p-4 text-slate-100">
      <div className="mb-6 flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="rounded-lg bg-blue-600 p-2 text-white">
          <Anchor className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-white">Porto do Pecém</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Operação</p>
        </div>
      </div>

      <nav className="space-y-2">
        {[
          { label: 'Dashboard', icon: LayoutDashboard },
          { label: 'Navios', icon: Ship },
          { label: 'Frota', icon: Truck }
        ].map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-left text-xs font-semibold text-slate-300 transition hover:border-blue-700 hover:text-white"
          >
            <Icon className="h-4 w-4 text-blue-400" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}