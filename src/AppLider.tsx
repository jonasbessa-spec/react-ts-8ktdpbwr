import React, { useState, useEffect } from 'react';
import {
  Truck,
  AlertTriangle,
  Clock,
  CheckCircle,
  PlusCircle,
  Send,
  Ship,
  RefreshCw
} from 'lucide-react';
import { getSupabaseErrorMessage, supabase } from './lib/supabase';

interface Operacao {
  id: string;
  nome_navio: string;
  berco_codigo: string;
}

interface Equipamento {
  id: string;
  codigo: string;
  tag: string;
  nome: string;
}

const TIPO_LABEL: Record<string, string> = {
  manutencao_equipamento: 'Manutenção de equipamento',
  clima: 'Condições climáticas',
  troca_turno: 'Troca de turno / refeição',
  aguardando_carga: 'Aguardando carga / pátio',
  outros: 'Outros motivos',
};

export default function AppLider() {
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recentes, setRecentes] = useState<Array<{ id: string; tipo: string; inicio: string; descricao?: string | null }>>([]);

  // Formulário de Registo de Interrupção/Gargalo
  const [selectedOperacao, setSelectedOperacao] = useState('');
  const [selectedEquipamento, setSelectedEquipamento] = useState('');
  const [tipoParada, setTipoParada] = useState('manutencao_equipamento');
  const [descricao, setDescricao] = useState('');

  // Carregar dados iniciais
  useEffect(() => {
    void carregarDados();
  }, []);

  const carregarDados = async () => {
    setLoading(true);
    setErro(null);
    try {
      const [operationsResult, equipmentResult, recentResult] = await Promise.all([
        supabase
          .from('view_kpi_prancha_operacional')
          .select('operacao_id, nome_navio, berco_codigo'),
        supabase.from('equipamentos').select('id, codigo, tag, nome'),
        supabase
          .from('interrupcoes_operacionais')
          .select('id, tipo, inicio, descricao')
          .order('inicio', { ascending: false })
          .limit(5),
      ]);
      const queryError = operationsResult.error || equipmentResult.error || recentResult.error;
      if (queryError) throw queryError;

      setOperacoes((operationsResult.data || [])
        .filter((operation) => operation.operacao_id)
        .map((operation) => ({
          id: operation.operacao_id,
          nome_navio: operation.nome_navio,
          berco_codigo: operation.berco_codigo,
        })));
      setEquipamentos(equipmentResult.data || []);
      setRecentes(recentResult.data || []);
    } catch (cause) {
      setErro(`Não foi possível carregar as listas do apontamento: ${getSupabaseErrorMessage(cause)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistarParada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperacao) { setErro('Selecione uma operação/navio.'); return; }
    setErro(null);

    setLoading(true);
    setSucesso(false);

    try {
      const { error } = await supabase
        .from('interrupcoes_operacionais')
        .insert([
          {
            operacao_id: selectedOperacao,
            equipamento_id: selectedEquipamento || null,
            tipo: tipoParada,
            inicio: new Date().toISOString(),
            descricao: descricao
          }
        ]);
      if (error) throw error;
      setSucesso(true);
      setDescricao('');
      setSelectedEquipamento('');
      setTimeout(() => setSucesso(false), 3000);
      void carregarDados();
    } catch (cause) {
      setErro(`Erro ao registrar interrupção: ${getSupabaseErrorMessage(cause)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl text-slate-100">

      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-400">Registre paradas em tempo real; a equipe é notificada pelo cockpit.</p>
        <button
          type="button"
          onClick={() => void carregarDados()}
          aria-label="Recarregar listas"
          className="p-2 bg-slate-900 text-slate-400 hover:text-white rounded-lg border border-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* FORMULÁRIO DE REGISTO RÁPIDO */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm border-b border-slate-800 pb-2">
          <AlertTriangle className="h-4 w-4" />
          Registrar Parada / Interrupção
        </div>

        {sucesso && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Parada registrada com sucesso!
          </div>
        )}

        {erro && (
          <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {erro}
          </div>
        )}

        <form onSubmit={handleRegistarParada} className="space-y-4">

          {/* SELEÇÃO DO NAVIO/OPERAÇÃO */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Navio / Berço *
            </label>
            <select
              value={selectedOperacao}
              onChange={(e) => setSelectedOperacao(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Selecione a Operação...</option>
              {operacoes.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.berco_codigo} - {op.nome_navio}
                </option>
              ))}
            </select>
          </div>

          {/* TIPO DE PARADA */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Motivo da Parada *
            </label>
            <select
              value={tipoParada}
              onChange={(e) => setTipoParada(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="manutencao_equipamento">Manutenção de Equipamento</option>
              <option value="clima">Condições Climáticas (Chuva/Vento)</option>
              <option value="troca_turno">Troca de Turno / Refeição</option>
              <option value="aguardando_carga">Aguardando Carga / Pátio</option>
              <option value="outros">Outros Motivos</option>
            </select>
          </div>

          {/* EQUIPAMENTO ENVOLVIDO (OPCIONAL) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Equipamento Afetado (Opcional)
            </label>
            <select
              value={selectedEquipamento}
              onChange={(e) => setSelectedEquipamento(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Nenhum / Geral da Operação</option>
              {equipamentos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.codigo || eq.tag} - {eq.nome}
                </option>
              ))}
            </select>
          </div>

          {/* OBSERVAÇÃO / DESCRIÇÃO */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Observações
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              placeholder="Descreva brevemente o motivo..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                Registrar parada agora
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm border-b border-slate-800 pb-2 mb-3">
          <Clock className="h-4 w-4 text-cyan-400" />
          Últimas paradas registradas
        </div>
        {recentes.length ? (
          <ul className="space-y-2">
            {recentes.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-200">{TIPO_LABEL[item.tipo] || item.tipo.replace(/_/g, ' ')}</p>
                  {item.descricao && <p className="truncate text-slate-500">{item.descricao}</p>}
                </div>
                <span className="shrink-0 text-slate-400 tabular-nums">{new Date(item.inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-xs text-slate-500">Nenhuma parada registrada ainda.</p>}
      </div>

    </div>
  );
}