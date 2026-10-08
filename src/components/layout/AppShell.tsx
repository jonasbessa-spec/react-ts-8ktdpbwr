import { lazy, Suspense, useEffect, useState } from 'react';
import { ClipboardPen, Gauge, LayoutDashboard, LogOut, Menu, Radio, Ship, Truck, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { SGO_DATA_CHANGED_EVENT } from '../../lib/sgoData';
import Sidebar, { type NavItem } from './Sidebar';
import { cn } from '../../lib/utils';

const TechnicalCockpit = lazy(() => import('../TechnicalCockpit'));
const ShipBerthForecast = lazy(() => import('../ShipBerthForecast'));
const CockpitExecutivo = lazy(() => import('../CockpitExecutivo'));
const ExecutiveOperations = lazy(() => import('../ExecutiveOperations'));
const AppLider = lazy(() => import('../../AppLider'));
const Dashboard = lazy(() => import('../../Dashboard'));

type PageId = 'visao' | 'navios' | 'produtividade' | 'planejamento' | 'frota' | 'apontamento';

const NAV: NavItem<PageId>[] = [
  { id: 'visao', label: 'Visão geral', description: 'Indicadores técnicos dos berços 05–08, frota e pessoal', icon: LayoutDashboard },
  { id: 'navios', label: 'Previsão de navios', description: 'Line-up de carga geral, berços e rastreamento AIS', icon: Ship },
  { id: 'produtividade', label: 'Produtividade', description: 'Prancha realizada vs. meta por operação', icon: Gauge },
  { id: 'planejamento', label: 'Planejamento', description: 'Escala, alocação de equipes e calendário operacional', icon: Users },
  { id: 'frota', label: 'Frota', description: 'Disponibilidade de cavalos, semirreboques e pátio', icon: Truck },
  { id: 'apontamento', label: 'Apontamento de campo', description: 'Registro rápido de paradas e interrupções', icon: ClipboardPen },
];

const PERIODS = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: '7 dias' },
  { id: 'mes', label: 'Mês' },
];

const ROLE_LABEL = { admin: 'Administrador', developer: 'Desenvolvedor', viewer: 'Leitura' } as const;

const readHash = (): PageId => {
  const value = window.location.hash.replace('#/', '').replace('#', '');
  return (NAV.some((item) => item.id === value) ? value : 'visao') as PageId;
};

export default function AppShell({ demoMode = false }: { demoMode?: boolean }) {
  const { user, role, signOut } = useAuth();
  const [page, setPage] = useState<PageId>(() =>
    demoMode && !window.location.hash ? 'planejamento' : readHash(),
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [period, setPeriod] = useState('semana');
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'offline'>(
    supabaseConfigured ? 'connecting' : 'offline',
  );

  useEffect(() => {
    const onHash = () => setPage(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setRealtimeStatus('offline');
      return;
    }
    let active = true;
    const refreshData = () => window.dispatchEvent(new Event(SGO_DATA_CHANGED_EVENT));
    const channel = supabase.channel('mudancas-sgo')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colaboradores' }, refreshData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'previsao_navios' }, refreshData)
      .subscribe((status) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus('offline');
          console.warn(`Canal Realtime SGO indisponível: ${status}`);
        }
      });
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const select = (id: PageId) => {
    if (window.location.hash !== `#/${id}`) window.location.hash = `/${id}`;
    setPage(id);
    window.scrollTo({ top: 0 });
  };

  const current = NAV.find((item) => item.id === page) ?? NAV[0];
  const initials = (user?.email || '?').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-slate-100">
      <Sidebar items={NAV} active={page} onSelect={select} open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 border-b border-slate-800/80 bg-[#0b0f19]/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button type="button" onClick={() => setMenuOpen(true)} className="rounded-lg border border-slate-800 p-2 text-slate-300 hover:text-white lg:hidden" aria-label="Abrir menu"><Menu size={18} /></button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-bold text-white sm:text-xl">{current.label}</h1>
              <p className="hidden truncate text-xs text-slate-400 sm:block">{current.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right md:block">
                <p className="max-w-[220px] truncate text-xs font-semibold text-slate-200">{demoMode ? 'Demonstração local' : user?.email}</p>
                <p className={cn('text-[10px] font-bold uppercase tracking-wider', role === 'viewer' ? 'text-slate-500' : 'text-cyan-300')}>{demoMode ? 'Dados neste navegador' : ROLE_LABEL[role]}</p>
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-xs font-bold text-slate-200" title={demoMode ? 'Demonstração local' : user?.email ?? ''}>{demoMode ? 'DL' : initials}</span>
              <span className={cn('hidden items-center gap-1 text-[10px] font-semibold sm:inline-flex', realtimeStatus === 'connected' ? 'text-emerald-300' : 'text-amber-300')} title={realtimeStatus === 'connected' ? 'Atualizações ao vivo do SGO conectadas' : 'Atualizações ao vivo indisponíveis'}>
                <Radio size={13} /> {realtimeStatus === 'connected' ? 'Ao vivo' : 'Offline'}
              </span>
              {!demoMode && <button type="button" onClick={() => { void signOut(); }} className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:border-red-500/40 hover:text-red-300" aria-label="Sair" title="Sair"><LogOut size={16} /></button>}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <Suspense fallback={<p role="status" className="py-12 text-center text-sm text-slate-400">Carregando módulo...</p>}>
              {page === 'visao' && (
                <>
                  <div className="mb-4 flex justify-end">
                    <div className="flex gap-1 rounded-lg bg-slate-900/80 p-1 ring-1 ring-slate-800">
                      {PERIODS.map((item) => (
                        <button key={item.id} type="button" onClick={() => setPeriod(item.id)} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition', period === item.id ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-slate-100')}>{item.label}</button>
                      ))}
                    </div>
                  </div>
                  <TechnicalCockpit period={period} demoMode={demoMode} />
                </>
              )}
              {page === 'navios' && <ShipBerthForecast demoMode={demoMode} />}
              {page === 'produtividade' && <CockpitExecutivo />}
              {page === 'planejamento' && <ExecutiveOperations demoMode={demoMode} />}
              {page === 'frota' && <Dashboard />}
              {page === 'apontamento' && <AppLider />}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
