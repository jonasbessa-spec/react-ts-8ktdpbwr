import React, { useState } from 'react';
import { useCockpitData } from '../hooks/useCockpitData';

export const PlanejamentoOperacional: React.FC = () => {
  const { colaboradores, operacoes: pranchaData, loading, error } = useCockpitData();
  const [busca, setBusca] = useState('');
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
        Erro ao carregar planejamento: {error}
      </div>
    );
  }

  const operacoesFiltradas = pranchaData.filter((item: any) => {
    const nome = item.nome_navio || '';
    return nome.toLowerCase().includes(busca.toLowerCase());
  });

  const total = pranchaData.length;
  const concluido = pranchaData.filter((item: any) => Number(item.percentual_concluido || 0) >= 100).length;

  const abaixoMeta = pranchaData.filter(
    (item: any) => Number(item.prancha_realizada_ton_h || 0) < Number(item.meta_prancha_ton_h || 0)
  );

  const mediaPrancha = total > 0
    ? pranchaData.reduce((sum: number, item: any) => sum + Number(item.prancha_realizada_ton_h || 0), 0) / total
    : 0;

  const frotaDisponivel = frotaData.filter((item: any) => item.status_atual === 'operacional');

  const rows = operacoesFiltradas.map((item: any) => [
    item.nome_navio || 'Navio sem nome',
    item.prancha_realizada_ton_h || 0,
    item.meta_prancha_ton_h || 0,
    `${item.percentual_concluido || 0}%`
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Planejamento Operacional</h1>
        <input
          type="text"
          placeholder="Buscar por navio..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Painel resumido */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Total Operações</p>
          <p className="text-2xl font-bold text-gray-800">{total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Operações Concluídas</p>
          <p className="text-2xl font-bold text-green-600">{concluido}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Abaixo da Meta</p>
          <p className="text-2xl font-bold text-red-600">{abaixoMeta.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
          <p className="text-sm font-medium text-gray-500">Frota Disponível</p>
          <p className="text-2xl font-bold text-blue-600">{frotaDisponivel.length}</p>
        </div>
      </div>

      {/* Lista de Operações */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-700">Listagem das Operações</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Navio</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Realizado (t/h)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Meta (t/h)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% Concluído</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {operacoesFiltradas.map((item: any) => {
              return (
                <tr key={item.operacao_id || item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.nome_navio || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.prancha_realizada_ton_h || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.meta_prancha_ton_h || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.percentual_concluido || 0}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};