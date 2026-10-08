import { PranchaKPI, FrotaKPI } from '../hooks/useCockpitData';

const cell = (value: unknown) => `"${value === undefined || value === null || value === '' ? '' : String(value).replace(/"/g, '""')}"`;
const line = (values: unknown[]) => values.map(cell).join(';') + '\n';

/**
 * Exporta os dados consolidados da prancha e da frota em CSV (abre no Excel).
 */
export function exportToExcel(pranchaData: PranchaKPI[], frotaData: FrotaKPI[]) {
  let csvContent = '﻿'; // BOM para acentuação correta no Excel
  csvContent += 'RELATÓRIO EXECUTIVO - OPERAÇÕES E PRANCHA OPERACIONAL\n';
  csvContent += `Data de Emissão:;${new Date().toLocaleString('pt-BR')}\n\n`;

  csvContent += 'Navio;IMO;Berço;Operação;Tipo Carga;Meta (Ton/h);Realizado (Ton/h);Progresso (%);Horas Operadas\n';
  pranchaData.forEach((item) => {
    csvContent += line([
      item.nome_navio,
      item.imo_number ?? item.imo,
      item.berco_codigo ?? item.berco,
      item.tipo_operacao,
      item.tipo_carga,
      item.meta_prancha_ton_h,
      item.prancha_realizada_ton_h,
      item.percentual_concluido !== undefined && item.percentual_concluido !== null ? `${item.percentual_concluido}%` : '',
      item.horas_operadas,
    ]);
  });

  if (frotaData.length) {
    csvContent += '\n\nSTATUS DA FROTA E DISPONIBILIDADE\n';
    csvContent += 'Tag;Categoria;Status Atual;Tempo Parado Hoje (min)\n';
    frotaData.forEach((item) => {
      const parado = Number(item.minutos_parado_hoje);
      csvContent += line([
        item.tag ?? item.codigo ?? item.FROTA,
        item.categoria ?? item.TIPO,
        item.status_atual ?? item.status ?? item.STATUS,
        Number.isFinite(parado) ? Math.round(parado) : '',
      ]);
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Relatorio_Executivo_Porto_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Aciona o modo de impressão executivo estilizado para geração de PDF.
 */
export function exportToPDF() {
  window.print();
}
