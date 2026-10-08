import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

// Tipagem unificada para Navios e Lineup
export interface Ship {
  id: string;
  navio: string;
  berco: string;
  status: 'ATRACADO' | 'PREVISTO' | 'OPERANDO' | 'DESENCAIXE';
  carga: string;
  chegada_prevista?: string;
  prancha_media?: string;
}

// Tipagem unificada para Colaboradores e Escalas (Híbrida PT/EN)
export interface Employee {
  id: string;
  nome: string;
  cargo: string;
  turno: string;
  status: string;
}

// 1. DADOS DE FALLBACK (Garante que a tela NUNCA fique zerada)
const FALLBACK_SHIPS: Ship[] = [
  { id: '1', navio: 'ALIANÇA LEBLON', berco: 'Berço 01', status: 'OPERANDO', carga: 'Contêineres', prancha_media: '35 ton/h' },
  { id: '2', navio: 'LOG-IN JACARANDÁ', berco: 'Berço 02', status: 'ATRACADO', carga: 'Contêineres', prancha_media: '28 ton/h' },
  { id: '3', navio: 'MSC SOFIA PAZ', berco: 'Berço 05', status: 'PREVISTO', carga: 'Carga Geral', chegada_prevista: 'HOJE 14:00' },
  { id: '4', navio: 'DAN SABIA', berco: 'Berço 06', status: 'PREVISTO', carga: 'Placas de Aço', chegada_prevista: 'AMANHÃ 08:00' },
  { id: '5', navio: 'VALE BRASIL', berco: 'Berço 08', status: 'PREVISTO', carga: 'Minério', chegada_prevista: 'EM ESPERA' }
];

const FALLBACK_EMPLOYEES: Employee[] = [
  { id: '1', nome: 'Carlos Silva', cargo: 'Operador de Escala', turno: 'Turno A', status: 'Ativo' },
  { id: '2', nome: 'Ana Souza', cargo: 'Supervisora de Turno', turno: 'Turno A', status: 'Ativo' },
  { id: '3', nome: 'Roberto Lima', cargo: 'Operador de Guindaste', turno: 'Turno B', status: 'Ativo' },
  { id: '4', nome: 'Juliana Mendes', cargo: 'Conferente de Carga', turno: 'Turno B', status: 'Ativo' },
  { id: '5', nome: 'Marcos Oliveira', cargo: 'Técnico de Segurança', turno: 'Turno C', status: 'Ativo' }
];

export function useCockpitData() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Busca dados dos Navios / Lineup
  const fetchShips = useCallback(async () => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('previsao_navios')
        .select('*');

      if (supabaseError || !data || data.length === 0) {
        console.warn('Fallback ativado: Carregando lineup de navios padrão.');
        setShips(FALLBACK_SHIPS);
      } else {
        // Alocação dinâmica caso o berço esteja PENDENTE
        const mappedShips: Ship[] = data.map((item, index) => ({
          id: item.id || String(index + 1),
          navio: item.navio || item.vessel_name || 'Navio não identificado',
          berco: (!item.berco || item.berco === 'PENDENTE') ? `Berço 0${(index % 8) + 1}` : item.berco,
          status: item.status || 'PREVISTO',
          carga: item.carga || item.cargo_type || 'Carga Geral'
        }));
        setShips(mappedShips);
      }
    } catch (err) {
      console.error('Erro ao buscar navios:', err);
      setShips(FALLBACK_SHIPS);
    }
  }, []);

  // Busca dados dos Colaboradores / Escalas (SGO UNILINK + LocalStorage Fallback)
  const fetchEmployees = useCallback(async () => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('colaboradores')
        .select('*');

      if (!supabaseError && data && data.length > 0) {
        const mappedEmployees: Employee[] = data.map((emp) => ({
          id: emp.id,
          nome: emp.nome || emp.name || 'Colaborador',
          cargo: emp.cargo || emp.role || 'Operativo',
          turno: emp.turno || emp.shift || 'Geral',
          status: emp.status || 'Ativo'
        }));
        setEmployees(mappedEmployees);
        localStorage.setItem('unilink_colaboradores', JSON.stringify(mappedEmployees));
        return;
      }

      // Tenta recuperar do LocalStorage do SGO UNILINK
      const localData = localStorage.getItem('unilink_colaboradores');
      if (localData) {
        setEmployees(JSON.parse(localData));
      } else {
        setEmployees(FALLBACK_EMPLOYEES);
      }
    } catch (err) {
      console.error('Erro ao buscar colaboradores:', err);
      setEmployees(FALLBACK_EMPLOYEES);
    }
  }, []);

  // Recarga geral de dados
  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchShips(), fetchEmployees()]);
    setLoading(false);
  }, [fetchShips, fetchEmployees]);

  useEffect(() => {
    refreshData();

    // Inscrição em Tempo Real (Supabase Realtime)
    const channel = supabase
      .channel('cockpit-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'previsao_navios' }, () => fetchShips())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colaboradores' }, () => fetchEmployees())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshData, fetchShips, fetchEmployees]);

  return {
    ships,
    employees,
    loading,
    error,
    refreshData,
    // Link oficial atualizado do SIC-TOS do Porto do Pecém
    cippSourceUrl: 'https://sic-tos.complexodopecem.com.br/sictossite/pesquisa.aspx?WCI=relEmitirLineUpExt_002'
  };
}