import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  Truck, 
  Layers, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  RefreshCw,
  Ship,
  MapPin,
  Send
} from 'lucide-react';

export default function AppLider() {
  const [categoria, setCategoria] = useState<'cm' | 'sr' | 'patio'>('cm');
  const [itens, setItens] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [atualizandoId, setAtualizandoId] = useState<string | number | null>(null);

  // Carregar dados conforme aba
  const carregarDados = async () => {
    setLoading(true);
    try {
      const tabela = categoria === 'cm' ? 'cm' : categoria === 'sr' ? 'sr' : 'equipamentos_patio';
      const { data, error } = await supabase.from(tabela).select('*');
      if (error) throw error;
      setItens(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [categoria]);

  // Alterar Status em Tempo Real
  const alterarStatus = async (item: any, novoStatus: string, novaAtividade?: string) => {
    setAtualizandoId(item.id);
    const tabela = categoria === 'cm' ? 'cm' : categoria === 'sr' ? 'sr' : 'equipamentos_patio';

    let payload: Record<string, any> = {};

    if (categoria === 'patio') {
      payload = { status: novoStatus, observacao: novaAtividade || item.observacao };
    } else {
      payload = { STATUS: novoStatus, ATIVIDADE: novaAtividade || 'OPERANDO' };
    }

    try {
      const { error } = await supabase.from(tabela).update(payload).eq('id', item.id);
      if (error) throw error;
      
      // Atualiza localmente para resposta visual instantânea
      setItens(prev => prev.map(i => i.id === item.id ? { ...i, ...payload } : i));
    } catch (err: any) {
      alert(`Erro ao atualizar: ${err.message}`);
    } finally {
      setAtualizandoId(null);
    }
  };

  const itensFiltrados = itens.filter(i => {
    const term = busca.toLowerCase();
    const iden = String(i.bem || i.FROTA || i.frota || '').toLowerCase();
    return !term || iden.includes(term);
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans max-w-md mx-auto">
      {/* Header Fixo de Campo */}
      <header className="bg-blue-900 p-4 border-b border-blue-800 sticky top-0 z-20 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Ship size={20} />
          </div>
          <div>
            <h1 className="font-black text-sm text-white">PE CÉM - CAMPO</h1>
            <p className="text-[10px] text-blue-200 font-semibold">Apontamento de Turno</p>
          </div>
        </div>

        <button 
          onClick={carregarDados}
          className="p-2 bg-blue-800 rounded-lg text-blue-200 active:scale-95 transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      {/* Seletor de Categoria Mobile */}
      <div className="grid grid-cols-3 gap-1 p-2 bg-slate-950 border-b border-slate-800">
        <button
          onClick={() => setCategoria('cm')}
          className={`py-3 rounded-xl font-extrabold text-xs flex flex-col items-center gap-1 transition ${categoria === 'cm' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 bg-slate-900'}`}
        >
          <Truck size={18} /> Cavalos
        </button>
        <button
          onClick={() => setCategoria('sr')}
          className={`py-3 rounded-xl font-extrabold text-xs flex flex-col items-center gap-1 transition ${categoria === 'sr' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 bg-slate-900'}`}
        >
          <Layers size={18} /> Reboques
        </button>
        <button
          onClick={() => setCategoria('patio')}
          className={`py-3 rounded-xl font-extrabold text-xs flex flex-col items-center gap-1 transition ${categoria === 'patio' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 bg-slate-900'}`}
        >
          <Wrench size={18} /> Pátio
        </button>
      </div>

      {/* Barra de Busca Rápida */}
      <div className="p-3 bg-slate-900">
        <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl px-3">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Digitar número da frota..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-transparent p-3 text-sm text-white font-bold outline-none placeholder-slate-500"
          />
        </div>
      </div>

      {/* Lista de Equipamentos para Ação Rápida */}
      <main className="flex-1 p-3 space-y-3 overflow-y-auto">
        {loading && itens.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-bold">Carregando lista de equipamentos...</div>
        ) : itensFiltrados.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs font-bold">Nenhum equipamento encontrado.</div>
        ) : (
          itensFiltrados.map((item) => {
            const identificacao = item.bem || item.FROTA || item.frota;
            const statusAtual = String(item.status || item.STATUS || '').toUpperCase();
            const eManutencao = statusAtual.includes('MANUTENÇÃO') || statusAtual.includes('PARADO');
            const emProcesso = atualizandoId === item.id;

            return (
              <div 
                key={item.id} 
                className={`bg-slate-800 border rounded-2xl p-4 space-y-3 transition shadow-md ${eManutencao ? 'border-rose-900/60 bg-rose-950/10' : 'border-slate-700'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-lg font-black text-white tracking-wider">{identificacao}</span>
                    <p className="text-xs text-slate-400 font-semibold">{item.categoria || item.TIPO || 'EQUIPAMENTO'}</p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${!eManutencao ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                    {!eManutencao ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                    {statusAtual}
                  </span>
                </div>

                {/* Botões Grandes para Apontamento de Turno com Touch */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    disabled={emProcesso || (!eManutencao && statusAtual === 'OPERACIONAL')}
                    onClick={() => alterarStatus(item, categoria === 'patio' ? 'DISPONÍVEL' : 'OPERACIONAL', 'EM OPERAÇÃO')}
                    className="py-3 bg-emerald-600 active:bg-emerald-700 disabled:opacity-30 text-white rounded-xl text-xs font-black flex justify-center items-center gap-1.5 shadow-md"
                  >
                    {emProcesso ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    LIBERAR / OPERAÇÃO
                  </button>

                  <button
                    disabled={emProcesso || eManutencao}
                    onClick={() => alterarStatus(item, 'MANUTENÇÃO', 'CORRETIVA')}
                    className="py-3 bg-rose-600 active:bg-rose-700 disabled:opacity-30 text-white rounded-xl text-xs font-black flex justify-center items-center gap-1.5 shadow-md"
                  >
                    {emProcesso ? <RefreshCw size={14} className="animate-spin" /> : <AlertTriangle size={16} />}
                    PARAR / MANUTENÇÃO
                  </button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Footer Fixo */}
      <footer className="p-3 bg-slate-950 border-t border-slate-800 text-center text-[10px] text-slate-500 font-bold">
        Porto do Pecém • Gestão em Tempo Real
      </footer>
    </div>
  );
}