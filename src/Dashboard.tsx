import React, { useEffect, useState } from 'react';
import { getDadosIntegrados, ResumoOperacional } from './lib/frotasService';

export function Dashboard() {
  const [dados, setDados] = useState<ResumoOperacional | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      const res = await getDadosIntegrados();
      setDados(res);
      setLoading(false);
    }
    loadAll();
  }, []);

  if (loading) {
    return (
      <div className="p-8 bg-[#0b0f19] text-slate-300 min-h-screen">
        Conectando ao Supabase e carregando frotas, colaboradores e pranchas...
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#0b0f19] text-white min-h-screen space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold">Gestão Integrada Operacional — Porto do Pecém</h1>
        <p className="text-sm text-slate-400">Visão unificada: Frotas, Colaboradores, Navios e Produção</p>
      </div>

      {/* METRICAS CHAVE INTEGRADAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-semibold">SEMIRREBOQUES (SR)</p>
          <p className="text-3xl font-extrabold text-blue-400 mt-1">{dados?.equipamentos.semirreboquesTotal}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-semibold">CAVALOS MECÂNICOS (CM)</p>
          <p className="text-3xl font-extrabold text-blue-400 mt-1">{dados?.equipamentos.cavalosTotal}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-semibold">STAFF / EM TURNO</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-1">{dados?.staff.emTurno} <span className="text-xs text-slate-400">/ {dados?.staff.totalColaboradores}</span></p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-semibold">PRANCHA MÉDIA OPERACIONAL</p>
          <p className="text-3xl font-extrabold text-amber-400 mt-1">{dados?.operacoes.pranchaMedia} <span className="text-xs text-slate-400">t/h</span></p>
        </div>
      </div>

      {/* TABELA DE SEMIRREBOQUES DO SUPABASE */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
        <h2 className="text-base font-bold mb-3">Registros de Frotas (Tabela SR do Banco)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
              <tr>
                <th className="p-3">Frota</th>
                <th className="p-3">Localização</th>
                <th className="p-3">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dados?.equipamentos.listaSemirreboques.slice(0, 10).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-blue-400">{item.FROTA}</td>
                  <td className="p-3">{item.LOCALIZACAO}</td>
                  <td className="p-3">{item.TIPO}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;