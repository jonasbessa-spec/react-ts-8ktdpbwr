import React from 'react';
import { SlidersHorizontal, Search } from 'lucide-react';

interface Props {
  filtros: {
    data: string;
    plantao: string;
    funcao: string;
    setor: string;
    status: string;
    busca: string;
  };
  setFiltros: React.Dispatch<React.SetStateAction<any>>;
  opcoes: {
    plantoes: string[];
    funcoes: string[];
    setores: string[];
  };
  onLimpar: () => void;
}

export const GlobalFilters: React.FC<Props> = ({ filtros, setFiltros, opcoes, onLimpar }) => {
  return (
    <div className="bg-[#0f172a] p-4 rounded-xl border border-[#1e293b] flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="text-xs font-extrabold text-slate-400 flex items-center gap-2">
          <SlidersHorizontal size={14} /> FILTROS GLOBAIS
        </span>
        <button onClick={onLimpar} className="text-xs font-semibold text-blue-500 hover:text-blue-400">
          Limpar filtros
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <input
          id="global-data"
          name="data"
          type="date"
          value={filtros.data}
          onChange={(e) => setFiltros((prev: any) => ({ ...prev, data: e.target.value }))}
          className="bg-[#0b0f19] border border-[#334155] text-slate-100 text-xs rounded-lg px-3 py-2 outline-none"
        />

        <select
          id="global-plantao"
          name="plantao"
          value={filtros.plantao}
          onChange={(e) => setFiltros((prev: any) => ({ ...prev, plantao: e.target.value }))}
          className="bg-[#0b0f19] border border-[#334155] text-slate-100 text-xs rounded-lg px-3 py-2 outline-none"
        >
          <option value="TODOS">Todos os plantões</option>
          {opcoes.plantoes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          id="global-funcao"
          name="funcao"
          value={filtros.funcao}
          onChange={(e) => setFiltros((prev: any) => ({ ...prev, funcao: e.target.value }))}
          className="bg-[#0b0f19] border border-[#334155] text-slate-100 text-xs rounded-lg px-3 py-2 outline-none"
        >
          <option value="TODAS">Todas as funções</option>
          {opcoes.funcoes.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <select
          id="global-setor"
          name="setor"
          value={filtros.setor}
          onChange={(e) => setFiltros((prev: any) => ({ ...prev, setor: e.target.value }))}
          className="bg-[#0b0f19] border border-[#334155] text-slate-100 text-xs rounded-lg px-3 py-2 outline-none"
        >
          <option value="TODOS">Todos os setores</option>
          {opcoes.setores.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          id="global-status"
          name="status"
          value={filtros.status}
          onChange={(e) => setFiltros((prev: any) => ({ ...prev, status: e.target.value }))}
          className="bg-[#0b0f19] border border-[#334155] text-slate-100 text-xs rounded-lg px-3 py-2 outline-none"
        >
          <option value="TODOS">Todos os status</option>
          <option value="ATIVO">Ativos</option>
          <option value="FÉRRIAS">Férias</option>
          <option value="AFASTADO">Afastados</option>
        </select>

        <div className="flex items-center bg-[#0b0f19] border border-[#334155] rounded-lg px-2">
          <Search size={14} className="text-slate-500" />
          <input
            id="global-busca"
            name="busca"
            type="text"
            placeholder="Pesquisar por nome..."
            value={filtros.busca}
            onChange={(e) => setFiltros((prev: any) => ({ ...prev, busca: e.target.value }))}
            className="bg-transparent text-xs text-slate-100 p-2 outline-none w-full"
          />
        </div>
      </div>
    </div>
  );
};