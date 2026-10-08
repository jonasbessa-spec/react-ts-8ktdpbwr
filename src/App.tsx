import React, { useState, useEffect } from 'react';
import { useCockpitData } from './hooks/useCockpitData';

export default function App() {
  const { ships, employees, loading, refreshData, cippSourceUrl } = useCockpitData();
  const [activeTab, setActiveTab] = useState<'lineup' | 'collaborators'>('lineup');

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6">
      {/* Header / Navegação Principal */}
      <header className="flex flex-col md:flex-row justify-between items-center pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">Porto do Pecém • Gestão Operacional</h1>
          <p className="text-sm text-slate-400">Integração SGO UNILINK + Cockpit Executivo</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('lineup')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'lineup'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🚢 Navios e Lineup
          </button>
          <button
            onClick={() => setActiveTab('collaborators')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'collaborators'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            👥 Colaboradores e Escalas
          </button>
          <button
            onClick={refreshData}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-all"
          >
            🔄 Sincronizar Dados
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="mt-6">
        {activeTab === 'lineup' && (
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-200">Lineup de Navios - Berços CIPP</h2>
              <a
                href={cippSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline"
              >
                🔗 Fonte Oficial CIPP (SIC-TOS)
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ships.map((ship) => (
                <div key={ship.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-md">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50">
                      {ship.berco}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        ship.status === 'OPERANDO'
                          ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/50'
                          : ship.status === 'ATRACADO'
                          ? 'bg-amber-900/50 text-amber-400 border border-amber-700/50'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {ship.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{ship.navio}</h3>
                  <p className="text-sm text-slate-400">Tipo de Carga: <span className="text-slate-200">{ship.carga}</span></p>
                  {ship.prancha_media && (
                    <p className="text-xs text-slate-400 mt-2">Prancha Média: <span className="text-emerald-400 font-mono">{ship.prancha_media}</span></p>
                  )}
                  {ship.chegada_prevista && (
                    <p className="text-xs text-slate-400 mt-1">Previsão: <span className="text-blue-300">{ship.chegada_prevista}</span></p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'collaborators' && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-200">Quadro Operacional de Colaboradores e Escalas</h2>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-md">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-700/50 text-slate-300 text-sm border-b border-slate-700">
                    <th className="p-3">Nome / Colaborador</th>
                    <th className="p-3">Cargo / Função</th>
                    <th className="p-3">Turno / Escala</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 text-sm">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-750/50 transition-colors">
                      <td className="p-3 font-medium text-white">{emp.nome}</td>
                      <td className="p-3 text-slate-300">{emp.cargo}</td>
                      <td className="p-3 text-blue-400 font-mono">{emp.turno}</td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}