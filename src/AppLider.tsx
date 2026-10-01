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
import { supabase } from './lib/supabase';

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

export default function AppLider() {
  const [operacoes, setOperacoes] = useState<Operacao[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  // Formulário de Registo de Interrupção/Gargalo
  const [selectedOperacao, setSelectedOperacao] = useState('');
  const [selectedEquipamento, setSelectedEquipamento] = useState('');
  const [tipoParada, setTipoParada] = useState('manutencao_equipamento');
  const [descricao, setDescricao] = useState('');

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    // Buscar operações ativas nos berços
    const { data: opData } = await supabase
      .from('view_kpi_prancha_operacional')
      .select('operacao_id, nome_navio, berco_codigo');
    
    // Buscar equipamentos
    const { data: eqData } = await supabase
      .from('equipamentos')
      .select('id, codigo, tag, nome');

    if (opData) {
      setOperacoes(opData.map(o => ({
        id: o.operacao_id,
        nome_navio: o.nome_navio,
        berco_codigo: o.berco_codigo
      })));
    }
    if (eqData) setEquipamentos(eqData);
  };

  const handleRegistarParada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperacao) return alert('Selecione uma operação/navio');

    setLoading(true);
    setSucesso(false);

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

    setLoading(false);

    if (error) {
      alert('Erro ao registrar interrupção: ' + error.message);
    } else {
      setSucesso(true);
      setDescricao('');
      setSelectedEquipamento('');
      setTimeout(() => setSucesso(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 max-w-md mx-auto pb-24">
      
      {/* CABEÇALHO MOBILE */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Apontamento de Campo</h1>
            <p className="text-xs text-slate-400">Operações Portuárias & Frota</p>
          </div>
        </div>
        <button 
          onClick={carregarDados}
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
            Parada registrada com sucesso no Supabase!
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
                Registar Parada Agora
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
}