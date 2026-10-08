import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, supabaseConfigured, supabaseConfigError, getSupabaseErrorMessage } from '../lib/supabase';
import { getCollaboratorFallback, normalizeCollaborators, SGO_DATA_CHANGED_EVENT, type CollaboratorSource } from '../lib/sgoData';
import type { ColaboradorRow, OperationalDatabaseRow } from '../types';

export interface PranchaKPI extends OperationalDatabaseRow {
  operacao_id?: string | null;
  nome_navio?: string;
  prancha_realizada_ton_h?: number | null;
  prancha_real?: number | null;
  meta_prancha_ton_h?: number | null;
  percentual_concluido?: number | null;
  status?: string;
}

export interface FrotaKPI extends OperationalDatabaseRow {
  equipamento?: string;
  status_atual?: string;
}

interface CockpitState {
  colaboradores: ColaboradorRow[];
  colaboradoresSource: CollaboratorSource;
  operacoes: PranchaKPI[];
  frota: FrotaKPI[];
  pranchaMedia: number;
  loading: boolean;
  error: string | null;
  updatedAt: Date | null;
}

const initialState: CockpitState = {
  colaboradores: [],
  colaboradoresSource: 'demonstração',
  operacoes: [],
  frota: [],
  pranchaMedia: 0,
  loading: true,
  error: null,
  updatedAt: null,
};

export function useCockpitData() {
  const [data, setData] = useState<CockpitState>(initialState);
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!supabaseConfigured) {
      const fallback = getCollaboratorFallback();
      if (requestId === requestSequence.current) {
        setData((prev) => ({
          ...prev,
          colaboradores: fallback.collaborators,
          colaboradoresSource: fallback.source,
          loading: false,
          error: null,
        }));
      }
      return;
    }

    setData((prev) => ({ ...prev, loading: true }));
    try {
      const [colabRes, opsRes, pranchaRes, frotaRes] = await Promise.all([
        supabase.from('colaboradores').select('*'),
        supabase.from('operacoes_navio').select('*'),
        supabase.from('view_kpi_prancha_operacional').select('*'),
        supabase.from('equipamentos_patio').select('*'),
      ]);
      if (requestId !== requestSequence.current) return;

      const ops = ((pranchaRes.data && pranchaRes.data.length > 0)
        ? pranchaRes.data
        : (opsRes.data || [])) as PranchaKPI[];
      const remoteCollaborators = (colabRes.data || []) as Record<string, unknown>[];
      const collaboratorData = remoteCollaborators.length
        ? { collaborators: normalizeCollaborators(remoteCollaborators, 'supabase'), source: 'supabase' as const }
        : getCollaboratorFallback();
      const totalPrancha = ops.reduce(
        (acc, item) => acc + Number(item.prancha_realizada_ton_h || item.prancha_real || 0),
        0,
      );
      const media = ops.length > 0 ? Number((totalPrancha / ops.length).toFixed(1)) : 0;

      const blocking = pranchaRes.error && opsRes.error ? pranchaRes.error : null;
      setData({
        colaboradores: collaboratorData.collaborators,
        colaboradoresSource: collaboratorData.source,
        operacoes: ops,
        frota: (frotaRes.data || []) as FrotaKPI[],
        pranchaMedia: media,
        loading: false,
        error: blocking ? getSupabaseErrorMessage(blocking) : null,
        updatedAt: new Date(),
      });
    } catch (err) {
      if (requestId !== requestSequence.current) return;
      console.error('Erro no useCockpitData:', err);
      const fallback = getCollaboratorFallback();
      setData((prev) => ({
        ...prev,
        colaboradores: fallback.collaborators,
        colaboradoresSource: fallback.source,
        loading: false,
        error: getSupabaseErrorMessage(err),
      }));
    }
  }, []);

  useEffect(() => {
    void load();
    const onSgoDataChanged = () => { void load(); };
    window.addEventListener(SGO_DATA_CHANGED_EVENT, onSgoDataChanged);
    return () => window.removeEventListener(SGO_DATA_CHANGED_EVENT, onSgoDataChanged);
  }, [load]);

  return { ...data, reload: load };
}

export { supabaseConfigured, supabaseConfigError, getSupabaseErrorMessage };
