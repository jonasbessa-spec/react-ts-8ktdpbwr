import React, { useState, useEffect, useMemo } from 'react';
import { getSupabaseErrorMessage, supabase, supabaseConfigured, supabaseConfigError } from './lib/supabase';
import PlanejamentoOperacional from './components/PlanejamentoOperacional';
import { 
  LayoutDashboard, 
  Truck, 
  Layers, 
  Wrench, 
  Radio, 
  Search, 
  SlidersHorizontal, 
  Download, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  PlusCircle, 
  X,
  FilterX,
  Ship,
  Anchor,
  Activity
} from 'lucide-react';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<'dashboard' | 'cm' | 'sr' | 'patio'>('dashboard');
  const [turno, setTurno] = useState('Diurno');
  
  // Estados de dados do Supabase
  const [cavalos, setCavalos] = useState<any[]>([]);
  const [reboques, setReboques] = useState<any[]>([]);
  const [equipamentosPatio, setEquipamentosPatio] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null);

  // Modal de Novo Cadastro
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [novoItem, setNovoItem] = useState({
    origem: 'cm',
    categoria: 'GUINDASTES',
    codigoOuBem: '',
    swlOuTipo: '',
    localizacao: 'PÁTIO',
    atividade: 'DISPONÍVEL',
    status: 'OPERACIONAL',
    dias_parado: 0,
    observacao: ''
  });

  // Filtros Globais
  const [filtros, setFiltros] = useState({
    busca: '',
    status: 'TODOS',
    categoria: 'TODOS'
  });

  // Paginação
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 8;

  // Função para buscar os dados do Supabase
  const carregarDados = async () => {
    setLoading(true);
    setErroCarregamento(null);

    if (!supabaseConfigured) {
      setErroCarregamento(
        supabaseConfigError ||
        'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente.'
      );
      setLoading(false);
      return;
    }

    try {
      const [resCM, resSR, resPatio] = await Promise.all([
        supabase.from('cm').select('*'),
        supabase.from('sr').select('*'),
        supabase.from('equipamentos_patio').select('*').order('categoria', { ascending: true })
      ]);

      const primeiroErro = resCM.error || resSR.error || resPatio.error;
      if (primeiroErro) throw primeiroErro;

      if (resCM.data) setCavalos(resCM.data);
      if (resSR.data) setReboques(resSR.data);
      if (resPatio.data) setEquipamentosPatio(resPatio.data);
    } catch (cause) {
      const message = getSupabaseErrorMessage(cause, 'Não foi possível sincronizar os equipamentos.');
      console.error('Erro na sincronização:', cause);
      setErroCarregamento(message);
    } finally {
      setLoading(false);
    }
  };

  // Carregamento Inicial + Assinatura de Canais Realtime
  useEffect(() => {
    carregarDados();

    if (!supabaseConfigured) {
      return;
    }

    // Inscrição em tempo real para refletir inputs dos líderes no PWA
    const canalCM = supabase
      .channel('realtime-cm-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cm' }, () => {
        carregarDados();
      })
      .subscribe();

    const canalSR = supabase
      .channel('realtime-sr-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sr' }, () => {
        carregarDados();
      })
      .subscribe();

    const canalPatio = supabase
      .channel('realtime-patio-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipamentos_patio' }, () => {
        carregarDados();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canalCM);
      supabase.removeChannel(canalSR);
      supabase.removeChannel(canalPatio);
    };
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [filtros, abaAtiva]);

  // Auxiliar para leitura de campos de dados flexíveis
  const getValor = (item: any, chaves: string[]) => {
    for (const k of chaves) {
      if (item[k] !== undefined && item[k] !== null && item[k] !== '') return String(item[k]);
    }
    return '-';
  };

  // Cadastro de novos equipamentos
  const handleCadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoItem.codigoOuBem.trim()) {
      alert('Informe a identificação do equipamento.');
      return;
    }

    setSalvando(true);
    try {
      if (novoItem.origem === 'patio') {
        const payloadPatio = {
          categoria: novoItem.categoria.toUpperCase(),
          bem: novoItem.codigoOuBem.toUpperCase(),
          swl: novoItem.swlOuTipo ? novoItem.swlOuTipo.toUpperCase() : null,
          status: novoItem.status.toUpperCase(),
          dias_parado: Number(novoItem.dias_parado) || 0,
          observacao: novoItem.observacao || null
        };
        const { error } = await supabase.from('equipamentos_patio').insert([payloadPatio]);
        if (error) throw error;
      } else {
        const tabela = novoItem.origem === 'cm' ? 'cm' : 'sr';
        const payloadFrota: Record<string, any> = {
          FROTA: novoItem.codigoOuBem.toUpperCase(),
          LOCALIZAÇÃO: novoItem.localizacao.toUpperCase(),
          TIPO: novoItem.swlOuTipo ? novoItem.swlOuTipo.toUpperCase() : 'PADRÃO',
          STATUS: novoItem.status.toUpperCase(),
          ATIVIDADE: novoItem.atividade.toUpperCase()
        };

        let { error } = await supabase.from(tabela).insert([payloadFrota]);
        if (error && error.message.includes("ATIVIDADE")) {
          delete payloadFrota.ATIVIDADE;
          const retry = await supabase.from(tabela).insert([payloadFrota]);
          error = retry.error;
        }
        if (error) throw error;
      }

      alert('Equipamento cadastrado com sucesso!');
      setModalAberto(false);
      setNovoItem({
        origem: 'cm',
        categoria: 'GUINDASTES',
        codigoOuBem: '',
        swlOuTipo: '',
        localizacao: 'PÁTIO',
        atividade: 'DISPONÍVEL',
        status: 'OPERACIONAL',
        dias_parado: 0,
        observacao: ''
      });
      carregarDados();
    } catch (err: any) {
      alert(`Erro ao cadastrar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  // Cálculos de Frota e Indicadores
  const totalCM = cavalos.length;
  const indispCM = cavalos.filter(c => {
    const s = getValor(c, ['STATUS', 'status']).toLowerCase();
    return s.includes('manutenção') || s.includes('parado') || s.includes('corretiva');
  }).length;
  const dispCM = Math.max(0, totalCM - indispCM);

  const totalSR = reboques.length;
  const indispSR = reboques.filter(r => {
    const s = getValor(r, ['STATUS', 'status']).toLowerCase();
    return s.includes('manutenção') || s.includes('parado') || s.includes('corretiva');
  }).length;
  const dispSR = Math.max(0, totalSR - indispSR);

  const totalPatio = equipamentosPatio.length;
  const dispPatio = equipamentosPatio.filter(p => String(p.status).toUpperCase() === 'DISPONÍVEL').length;

  // Indicadores Gerenciais Pecém
  const conjuntosProntos = Math.min(dispCM, dispSR);
  const percCM = totalCM > 0 ? Math.round((dispCM / totalCM) * 100) : 0;
  const percSR = totalSR > 0 ? Math.round((dispSR / totalSR) * 100) : 0;
  const percPatio = totalPatio > 0 ? Math.round((dispPatio / totalPatio) * 100) : 0;

  // Agrupamento de categorias de Pátio
  const detalheCategorias = useMemo(() => {
    const mapa: Record<string, { total: number; disp: number }> = {};
    equipamentosPatio.forEach(e => {
      const cat = e.categoria || 'OUTROS';
      if (!mapa[cat]) mapa[cat] = { total: 0, disp: 0 };
      mapa[cat].total += 1;
      if (String(e.status).toUpperCase() === 'DISPONÍVEL') mapa[cat].disp += 1;
    });
    return Object.entries(mapa).map(([categoria, qtds]) => ({
      categoria,
      total: qtds.total,
      disp: qtds.disp,
      perc: qtds.total > 0 ? Math.round((qtds.disp / qtds.total) * 100) : 0
    }));
  }, [equipamentosPatio]);

  // Aplicador de Filtros
  const dadosFiltrados = useMemo(() => {
    const buscaLower = filtros.busca.trim().toLowerCase();

    const aplicarFiltros = (item: any, ePatio = false) => {
      const identificacao = ePatio 
        ? String(item.bem || '').toLowerCase() 
        : getValor(item, ['FROTA', 'frota']).toLowerCase();
      
      const obsOuTipo = ePatio 
        ? String(item.observacao || '').toLowerCase() 
        : getValor(item, ['TIPO', 'tipo']).toLowerCase();

      const st = ePatio 
        ? String(item.status || '').toUpperCase() 
        : getValor(item, ['STATUS', 'status']).toUpperCase();

      const cat = ePatio ? String(item.categoria || '').toUpperCase() : 'OUTROS';

      const bateBusca = !buscaLower || identificacao.includes(buscaLower) || obsOuTipo.includes(buscaLower);

      let bateStatus = true;
      if (filtros.status !== 'TODOS') {
        if (filtros.status === 'OPERACIONAL') {
          bateStatus = st.includes('OPERACIONAL') || st.includes('DISPONÍVEL');
        } else if (filtros.status === 'MANUTENÇÃO') {
          bateStatus = st.includes('MANUTENÇÃO') || st.includes('CORRETIVA') || st.includes('PARADO');
        }
      }

      const bateCategoria = filtros.categoria === 'TODOS' || cat === filtros.categoria;

      return bateBusca && bateStatus && bateCategoria;
    };

    if (abaAtiva === 'cm') return cavalos.filter(item => aplicarFiltros(item, false));
    if (abaAtiva === 'sr') return reboques.filter(item => aplicarFiltros(item, false));
    if (abaAtiva === 'patio') return equipamentosPatio.filter(item => aplicarFiltros(item, true));

    return [
      ...cavalos.map(c => ({ ...c, _origem: 'CM' })),
      ...reboques.map(r => ({ ...r, _origem: 'SR' })),
      ...equipamentosPatio.map(p => ({ ...p, _origem: 'PATIO' }))
    ].filter(item => aplicarFiltros(item, item._origem === 'PATIO'));

  }, [abaAtiva, cavalos, reboques, equipamentosPatio, filtros]);

  // Lógica de Paginação
  const totalPaginas = Math.ceil(dadosFiltrados.length / itensPorPagina) || 1;
  const dadosPaginados = useMemo(() => {
    const inicio = (pagina - 1) * itensPorPagina;
    return dadosFiltrados.slice(inicio, inicio + itensPorPagina);
  }, [dadosFiltrados, pagina]);

  // Exportação CSV
  const exportarCSV = () => {
    if (dadosFiltrados.length === 0) return;
    const escaparCSV = (valor: unknown) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
    const headers = ['IDENTIFICAÇÃO / FROTA', 'TIPO / CATEGORIA', 'STATUS', 'LOCAL / OBS'];
    const rows = dadosFiltrados.map(item => {
      const isPatio = item._origem === 'PATIO' || abaAtiva === 'patio';
      return [
        escaparCSV(isPatio ? item.bem : getValor(item, ['FROTA', 'frota'])),
        escaparCSV(isPatio ? item.categoria : getValor(item, ['TIPO', 'tipo'])),
        escaparCSV(isPatio ? item.status : getValor(item, ['STATUS', 'status'])),
        escaparCSV(isPatio ? (item.observacao || '') : getValor(item, ['LOCALIZAÇÃO', 'LOCALIZACAO']))
      ];
    });

    const csvContent = [headers.map(escaparCSV).join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_pecem_${abaAtiva}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800 font-sans">
      {/* Sidebar - Azul Porto do Pecém */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col justify-between p-4 shrink-0 shadow-xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2 py-3 border-b border-blue-800">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-md">
              <Anchor size={22} />
            </div>
            <div>
              <h1 className="font-extrabold text-white text-base leading-tight">Porto do Pecém</h1>
              <p className="text-[11px] text-blue-200 font-medium">Gestão Operacional</p>
            </div>
          </div>

          <nav aria-label="Seções do painel" className="space-y-1.5">
            <button 
              onClick={() => setAbaAtiva('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${abaAtiva === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-100 hover:bg-blue-800'}`}
            >
              <div className="flex items-center gap-3"><LayoutDashboard size={16} /> Painel Gerencial</div>
            </button>
            <button 
              onClick={() => setAbaAtiva('cm')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${abaAtiva === 'cm' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-100 hover:bg-blue-800'}`}
            >
              <div className="flex items-center gap-3"><Truck size={16} /> Cavalos Mecânicos</div>
              <span className="bg-blue-950 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">{totalCM}</span>
            </button>
            <button 
              onClick={() => setAbaAtiva('sr')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${abaAtiva === 'sr' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-100 hover:bg-blue-800'}`}
            >
              <div className="flex items-center gap-3"><Layers size={16} /> Semirreboques</div>
              <span className="bg-blue-950 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">{totalSR}</span>
            </button>
            <button 
              onClick={() => setAbaAtiva('patio')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${abaAtiva === 'patio' ? 'bg-blue-600 text-white shadow-md' : 'text-blue-100 hover:bg-blue-800'}`}
            >
              <div className="flex items-center gap-3"><Wrench size={16} /> Equipamentos Pátio</div>
              <span className="bg-blue-950 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">{totalPatio}</span>
            </button>
          </nav>
        </div>

        <div className="space-y-3 pt-4 border-t border-blue-800">
          <button 
            onClick={() => setModalAberto(true)}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md"
          >
            <PlusCircle size={16} /> Novo Cadastro
          </button>

          <button 
            onClick={carregarDados}
            className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 text-blue-100 text-xs font-bold py-2 rounded-xl transition border border-blue-700"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-white' : ''} /> Atualizar Painel
          </button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
        {erroCarregamento && (
          <div
            className="flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            <span>Falha ao sincronizar os dados: {erroCarregamento}</span>
            <button
              type="button"
              onClick={carregarDados}
              className="shrink-0 font-bold underline underline-offset-2"
            >
              Tentar novamente
            </button>
          </div>
        )}
        {/* Topbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200 p-4 rounded-2xl shadow-sm gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">
                {abaAtiva === 'dashboard' ? 'Planejamento e Controle de Equipamentos - Porto do Pecém' : 
                 abaAtiva === 'cm' ? 'Gestão de Cavalos Mecânicos (CM)' : 
                 abaAtiva === 'sr' ? 'Gestão de Semirreboques (SR)' : 'Equipamentos e Máquinas de Pátio'}
              </h2>
              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Radio size={10} className="animate-pulse text-emerald-600" /> Ao Vivo (Realtime)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Visão consolidada para produtividade de berço e operações de navio</p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={exportarCSV}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl transition shadow-sm"
            >
              <Download size={14} /> Exportar CSV
            </button>
            <select 
              value={turno} 
              onChange={(e) => setTurno(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="Diurno">Turno 1 - Diurno</option>
              <option value="Noturno">Turno 2 - Noturno</option>
            </select>
          </div>
        </div>

        {/* MÓDULO GERENCIAL: Prontidão para Operação de Navio */}
        {abaAtiva === 'dashboard' && (
          <div className="space-y-6">
            <PlanejamentoOperacional />
            {/* Status de Prontidão do Berço */}
            <div className="bg-blue-900 text-white p-5 rounded-2xl border border-blue-800 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-blue-700 p-3 rounded-2xl text-white">
                  <Ship size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black tracking-wide">CAPACIDADE DE ATENDIMENTO A NAVIOS</h3>
                    <span className="bg-blue-500/30 text-blue-100 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-md">OP. SIMULTÂNEA</span>
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Você possui <strong className="text-white text-sm">{conjuntosProntos} conjuntos (CM + SR)</strong> operacionais para embarque/desembarque imediato.
                  </p>
                </div>
              </div>
              <div className="bg-blue-950/80 border border-blue-800 px-4 py-2.5 rounded-xl text-center">
                <p className="text-[10px] font-bold text-blue-300 uppercase">Status Operacional</p>
                <p className="text-sm font-black text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
                  <Activity size={14} /> {percCM >= 80 ? 'PRONTO PARA OPERAR' : 'REQUER ATENÇÃO'}
                </p>
              </div>
            </div>

            {/* Cards Indicadores de Frota (CM, SR, PÁTIO) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black text-slate-500 uppercase">Cavalos Mecânicos (CM)</p>
                  <div className="bg-blue-100 p-2 rounded-xl text-blue-700"><Truck size={20} /></div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{dispCM}</span>
                  <span className="text-sm font-bold text-slate-400">/ {totalCM} Total</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percCM}%` }}></div>
                </div>
                <p className="text-[11px] font-bold text-blue-700 mt-2">{percCM}% Disponível no Terminal</p>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black text-slate-500 uppercase">Semirreboques (SR)</p>
                  <div className="bg-blue-100 p-2 rounded-xl text-blue-700"><Layers size={20} /></div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{dispSR}</span>
                  <span className="text-sm font-bold text-slate-400">/ {totalSR} Total</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percSR}%` }}></div>
                </div>
                <p className="text-[11px] font-bold text-blue-700 mt-2">{percSR}% Disponível no Terminal</p>
              </div>

              <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-black text-slate-500 uppercase">Equipamentos de Pátio</p>
                  <div className="bg-blue-100 p-2 rounded-xl text-blue-700"><Wrench size={20} /></div>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{dispPatio}</span>
                  <span className="text-sm font-bold text-slate-400">/ {totalPatio} Total</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${percPatio}%` }}></div>
                </div>
                <p className="text-[11px] font-bold text-emerald-700 mt-2">{percPatio}% Disponível no Terminal</p>
              </div>
            </div>

            {/* Gráfico Visual de Disponibilidade por Categoria do Pátio */}
            <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Disponibilidade por Categoria Operacional (Guindastes, Reach Stackers, Forklifts)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {detalheCategorias.map((item) => (
                  <div key={item.categoria} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-extrabold text-slate-800">{item.categoria}</span>
                      <span className="font-black text-blue-900">{item.disp} / {item.total} ({item.perc}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full ${item.perc >= 75 ? 'bg-emerald-500' : item.perc >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                        style={{ width: `${item.perc}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Painel de Filtros Integrados */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-blue-700" /> Filtros Operacionais
            </span>
            {(filtros.busca || filtros.status !== 'TODOS' || filtros.categoria !== 'TODOS') && (
              <button 
                onClick={() => setFiltros({ busca: '', status: 'TODOS', categoria: 'TODOS' })}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 transition flex items-center gap-1"
              >
                <FilterX size={14} /> Limpar Filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-3 focus-within:border-blue-600 transition">
              <Search size={16} className="text-slate-400" />
              <input
                id="filtro-busca"
                name="busca"
                type="text"
                placeholder="Buscar por Frota, BEM ou Observação..."
                value={filtros.busca}
                onChange={(e) => setFiltros(p => ({ ...p, busca: e.target.value }))}
                className="bg-transparent text-xs text-slate-900 p-2.5 outline-none w-full font-bold placeholder-slate-400"
              />
            </div>

            <select
              id="filtro-status"
              name="status"
              value={filtros.status}
              onChange={(e) => setFiltros(p => ({ ...p, status: e.target.value }))}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:border-blue-600"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="OPERACIONAL">Operacional / Disponível</option>
              <option value="MANUTENÇÃO">Manutenção / Parado</option>
            </select>

            <select
              id="filtro-categoria"
              name="categoria"
              value={filtros.categoria}
              onChange={(e) => setFiltros(p => ({ ...p, categoria: e.target.value }))}
              disabled={abaAtiva === 'cm' || abaAtiva === 'sr'}
              className="bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 outline-none focus:border-blue-600 disabled:opacity-40"
            >
              <option value="TODOS">Todas as Categorias</option>
              <option value="GUINDASTES">GUINDASTES</option>
              <option value="REACH STACKERS">REACH STACKERS</option>
              <option value="FORKLIFT KALMAR">FORKLIFT KALMAR</option>
              <option value="FORKLIFT HYSTER">FORKLIFT HYSTER</option>
              <option value="FORKLIFT SOCMA">FORKLIFT SOCMA</option>
              <option value="EP">EP</option>
              <option value="GERADORES">GERADORES</option>
            </select>
          </div>
        </div>

        {/* Tabela de Controle de Equipamentos */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Registros e Disponibilidade ({dadosFiltrados.length})
            </h3>
            <span className="text-[11px] text-slate-600 font-bold">Página {pagina} de {totalPaginas}</span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-slate-500 text-xs font-bold flex flex-col items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-blue-700" />
              Sincronizando frotas com o Supabase...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200">
                    <th className="p-3.5">IDENTIFICAÇÃO</th>
                    <th className="p-3.5">CATEGORIA / TIPO</th>
                    <th className="p-3.5">LOCAL / SWL</th>
                    <th className="p-3.5">STATUS OPERACIONAL</th>
                    <th className="p-3.5">DIAS PARADO / ATIVIDADE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-bold text-slate-800">
                  {dadosPaginados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                        Nenhum equipamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    dadosPaginados.map((item, idx) => {
                      const isPatio = item._origem === 'PATIO' || abaAtiva === 'patio';
                      const bemOuFrota = isPatio ? item.bem : getValor(item, ['FROTA', 'frota']);
                      const catOuTipo = isPatio ? item.categoria : getValor(item, ['TIPO', 'tipo']);
                      const locOuSwl = isPatio ? (item.swl || '-') : getValor(item, ['LOCALIZAÇÃO', 'LOCALIZACAO']);
                      const st = isPatio ? String(item.status || '').toUpperCase() : getValor(item, ['STATUS', 'status']).toUpperCase();
                      const isManutencao = st.includes('MANUTENÇÃO') || st.includes('PARADO') || st.includes('CORRETIVA');

                      return (
                        <tr key={item.id || idx} className="hover:bg-blue-50/50 transition">
                          <td className="p-3.5 font-black text-blue-900 text-sm tracking-wide">{bemOuFrota}</td>
                          <td className="p-3.5 text-slate-700">{catOuTipo}</td>
                          <td className="p-3.5 text-slate-600">{locOuSwl}</td>
                          <td className="p-3.5">
                            {!isManutencao ? (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                                <CheckCircle2 size={12} /> OPERACIONAL
                              </span>
                            ) : (
                              <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-black px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                                <XCircle size={12} /> {st}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-600">
                            {isPatio ? (item.observacao || (item.dias_parado > 0 ? `${item.dias_parado}d parado` : '-')) : getValor(item, ['ATIVIDADE', 'ATIVADE'])}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginação */}
          <div className="flex justify-between items-center p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 font-bold">
            <span>Exibindo <strong>{dadosPaginados.length}</strong> de <strong>{dadosFiltrados.length}</strong> equipamentos</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPagina(p => Math.max(p - 1, 1))}
                disabled={pagina === 1}
                aria-label="Página anterior"
                className="p-2 bg-white border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-100 text-slate-800 transition"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPagina(p => Math.min(p + 1, totalPaginas))}
                disabled={pagina === totalPaginas}
                aria-label="Próxima página"
                className="p-2 bg-white border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-100 text-slate-800 transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Cadastro */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div
            aria-labelledby="cadastro-titulo"
            aria-modal="true"
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            role="dialog"
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
              <h3 id="cadastro-titulo" className="text-sm font-black text-slate-900 flex items-center gap-2">
                <PlusCircle size={18} className="text-blue-700" /> Cadastrar Novo Equipamento
              </h3>
              <button
                type="button"
                aria-label="Fechar cadastro"
                onClick={() => setModalAberto(false)}
                className="text-slate-400 hover:text-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCadastrar} className="p-5 space-y-4 text-xs font-bold text-slate-800">
              <div>
                <label className="block text-slate-700 mb-1.5">Tipo de Frota</label>
                <select 
                  id="cadastro-origem"
                  name="origem"
                  value={novoItem.origem}
                  onChange={(e) => setNovoItem(p => ({ ...p, origem: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-blue-600"
                >
                  <option value="cm">Cavalo Mecânico (CM)</option>
                  <option value="sr">Semirreboque (SR)</option>
                  <option value="patio">Equipamento de Pátio (Guindastes, Forklift...)</option>
                </select>
              </div>

              {novoItem.origem === 'patio' ? (
                <>
                  <div>
                    <label className="block text-slate-700 mb-1.5">Categoria *</label>
                    <select 
                      id="cadastro-categoria"
                      name="categoria"
                      value={novoItem.categoria}
                      onChange={(e) => setNovoItem(p => ({ ...p, categoria: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 outline-none focus:border-blue-600"
                    >
                      <option value="GUINDASTES">GUINDASTES</option>
                      <option value="REACH STACKERS">REACH STACKERS</option>
                      <option value="FORKLIFT KALMAR">FORKLIFT KALMAR</option>
                      <option value="FORKLIFT HYSTER">FORKLIFT HYSTER</option>
                      <option value="FORKLIFT SOCMA">FORKLIFT SOCMA</option>
                      <option value="EP">EP</option>
                      <option value="GERADORES">GERADORES</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 mb-1.5">Identificação BEM *</label>
                      <input 
                        id="cadastro-bem"
                        name="codigoOuBem"
                        type="text" 
                        placeholder="Ex: CN01"
                        value={novoItem.codigoOuBem}
                        onChange={(e) => setNovoItem(p => ({ ...p, codigoOuBem: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-blue-600"
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 mb-1.5">SWL (Capacidade)</label>
                      <input 
                        id="cadastro-swl"
                        name="swlOuTipo"
                        type="text" 
                        placeholder="Ex: 40 TON"
                        value={novoItem.swlOuTipo}
                        onChange={(e) => setNovoItem(p => ({ ...p, swlOuTipo: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 mb-1.5">Código da Frota *</label>
                    <input 
                      id="cadastro-frota"
                      name="codigoOuBem"
                      type="text" 
                      placeholder="Ex: CM-1050"
                      value={novoItem.codigoOuBem}
                      onChange={(e) => setNovoItem(p => ({ ...p, codigoOuBem: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-blue-600"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 mb-1.5">Localização</label>
                    <input 
                      id="cadastro-localizacao"
                      name="localizacao"
                      type="text" 
                      placeholder="Ex: PÁTIO"
                      value={novoItem.localizacao}
                      onChange={(e) => setNovoItem(p => ({ ...p, localizacao: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setModalAberto(false)}
                  className="w-1/2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={salvando}
                  className="w-1/2 bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-md"
                >
                  {salvando ? <RefreshCw size={14} className="animate-spin" /> : 'Salvar Equipamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}