import React, { useState } from 'react';
import { useCockpitData } from '../hooks/useCockpitData';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const CockpitExecutivo: React.FC = () => {
  const { colaboradores, operacoes: pranchaData, loading, error } = useCockpitData();
  const [selectedNavioId, setSelectedNavioId] = useState<string>('');
  const frotaData: any[] = [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md">
        Erro ao carregar dados do Cockpit: {error}
      </div>
    );
  }

  const naviosAbaixoDaMeta = pranchaData.filter(
    (n: any) => Number(n.prancha_realizada_ton_h || 0) < Number(n.meta_prancha_ton_h || 0)
  );

  const mediaPrancha = pranchaData.length > 0
    ? (pranchaData.reduce((acc: number, curr: any) => acc + Number(curr.prancha_realizada_ton_h || 0), 0) / pranchaData.length).toFixed(1)
    : '0';

  const frotaInoperante = frotaData.filter(
    (f: any) => f.status_atual === 'inoperante' || f.status_atual === 'manutencao_corretiva'
  );

  pranchaData.forEach((navio: any) => {
    if (navio.status === 'em_operacao') {
      // Lógica interna de operação
    }
  });

  const selectedNavio = pranchaData.find(
    (n: any) => n.operacao_id === (selectedNavioId || (pranchaData[0]?.operacao_id || ''))
  );

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-800">Cockpit Executivo</h1>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Média Prancha (ton/h)</p>
          <p className="text-2xl font-bold text-blue-600">{mediaPrancha}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Navios Abaixo da Meta</p>
          <p className="text-2xl font-bold text-red-600">{naviosAbaixoDaMeta.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Colaboradores Ativos</p>
          <p className="text-2xl font-bold text-green-600">{colaboradores.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Equipamentos Inoperantes</p>
          <p className="text-2xl font-bold text-orange-600">{frotaInoperante.length}</p>
        </div>
      </div>

      {/* Navios abaixo da meta */}
      {naviosAbaixoDaMeta.length > 0 && (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="text-md font-semibold text-red-800 mb-2">Atenção: Navios com Produtividade Abaixo da Meta</h3>
          <ul className="space-y-1">
            {naviosAbaixoDaMeta.map((n: any) => (
              <li key={n.operacao_id || n.id} className="text-sm text-red-700">
                • <strong>{n.nome_navio || 'Navio Desconhecido'}</strong>: Realizado {n.prancha_realizada_ton_h || 0} ton/h (Meta: {n.meta_prancha_ton_h || 0} ton/h)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lista de Navios */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Operações de Navios</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pranchaData.map((n: any) => (
            <button
              key={n.operacao_id || n.id}
              onClick={() => setSelectedNavioId(n.operacao_id)}
              className={`p-3 text-left rounded-md border transition ${
                (selectedNavio?.operacao_id === n.operacao_id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <p className="font-semibold text-gray-800">{n.nome_navio || 'Sem nome'}</p>
              <p className="text-xs text-gray-500">Status: {n.status || 'N/A'}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Gráficos de Desempenho */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Comparativo Prancha Realizada vs Meta</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pranchaData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome_navio" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="prancha_realizada_ton_h" fill="#3b82f6" name="Realizada" />
              <Bar dataKey="meta_prancha_ton_h" fill="#9ca3af" name="Meta" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela Resumo */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Navio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prancha Realizada</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meta Prancha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Concluído</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pranchaData.map((row: any) => {
              return (
                <tr key={row.operacao_id || row.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.nome_navio || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.prancha_realizada_ton_h || 0} t/h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.meta_prancha_ton_h || 0} t/h</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.percentual_concluido || 0}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};