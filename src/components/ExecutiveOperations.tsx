import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getSupabaseErrorMessage } from '../lib/utils';
import MetricCard from './ui/MetricCard';
import { Ship, Anchor, Activity, AlertTriangle } from 'lucide-react';

export const ExecutiveOperations: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEmEspera: 0,
    totalAtracados: 0,
    operacoesAtivas: 0,
  });

  useEffect(() => {
    let active = true;

    async function fetchOperationsData() {
      try {
        setLoading(true);
        setNotice(null);

        const { data, error } = await supabase
          .from('previsao_navios_pecem')
          .select('*');

        if (error) throw error;

        if (active && data) {
          const emEspera = data.filter((ship) => ship.status === 'previsto' || ship.status === 'fundeado').length;
          const atracados = data.filter((ship) => ship.status === 'atracado').length;
          const operando = data.filter((ship) => ship.status === 'atracado' || ship.status === 'operando').length;

          setStats({
            totalEmEspera: emEspera,
            totalAtracados: atracados,
            operacoesAtivas: operando,
          });
        }
      } catch (cause) {
        if (active) setNotice(getSupabaseErrorMessage(cause, 'Módulos operacionais indisponíveis.'));
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchOperationsData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Operações Executivas</h2>
          <p className="text-slate-400 text-sm">Visão geral do fluxo de embarcações e atracações</p>
        </div>
      </div>

      {notice && (
        <div className="p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <span className="text-sm">{notice}</span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-800/50 animate-pulse border border-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Aguardando / Fundeados"
            value={stats.totalEmEspera}
            description="Navios previstos no fondeadeiro"
            icon={Anchor}
          />
          <MetricCard
            title="Navios Atracados"
            value={stats.totalAtracados}
            description="Em berço operacional"
            icon={Ship}
          />
          <MetricCard
            title="Operações Ativas"
            value={stats.operacoesAtivas}
            description="Carregamento e descarga"
            icon={Activity}
          />
        </div>
      )}
    </div>
  );
};

export default ExecutiveOperations;