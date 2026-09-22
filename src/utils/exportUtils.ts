import { PranchaKPI, FrotaKPI } from '../hooks/useCockpitData';

/**
 * Exporta os dados consolidados da prancha e navios para formato CSV (compatível com Excel)
 */
export function exportToExcel(pranchaData: PranchaKPI[], frotaData: FrotaKPI[]) {
  // Cabeçalho e Linhas da Prancha Operacional
  let csvContent = '\uFEFF'; // BOM para acentuação correta no Excel
  csvContent += 'RELATÓRIO EXECUTIVO - OPERAÇÕES E PRANCHA OPERACIONAL\n';
  csvContent += `Data de Emissão:;${new Date().toLocaleString('pt-BR')}\n\n`;

  csvContent += 'Navio;IMO;Berço;Operação;Tipo Carga;Meta (Ton/h);Realizado (Ton/h);Progresso (%);Horas Operadas\n';

  pranchaData.forEach((item) => {
    csvContent += `"${item.nome_navio}";"${item.imo_number}";"${item.berco_codigo}";"${item.tipo_operacao}";"${item.tipo_carga}";"${item.meta_prancha_ton_h}";"${item.prancha_realizada_ton_h}";"${item.percentual_concluido}%";"${item.horas_operadas}"\n`;
  });

  csvContent += '\n\nSTATUS DA FROTA E DISPONIBILIDADE\n';
  csvContent += 'Tag;Categoria;Status Atual;Tempo Parado Hoje (min)\n';

  frotaData.forEach((item) => {
    csvContent += `"${item.tag}";"${item.categoria}";"${item.status_atual}";"${Math.round(item.minutos_parado_hoje)}"\n`;
  });

  // Criar arquivo Blob e disparar o download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Relatorio_Executivo_Porto_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Aciona o modo de impressão executivo estilizado para geração de PDF
 */
export function exportToPDF() {
  window.print();
}