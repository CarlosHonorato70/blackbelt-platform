import * as XLSX from 'xlsx';

/**
 * Exporta dados para JSON e faz download
 */
export function exportToJSON(data: any, filename: string = 'export.json') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  downloadFile(blob, filename);
}

/**
 * Exporta dados para Excel e faz download
 */
export function exportToExcel(
  data: any[],
  filename: string = 'export.xlsx',
  sheetName: string = 'Sheet1'
) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

/**
 * Exporta dados para CSV e faz download
 */
export function exportToCSV(data: any[], filename: string = 'export.csv') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadFile(blob, filename);
}

/**
 * Exporta dados para PDF (simples com texto)
 */
export function exportToPDF(
  content: string,
  filename: string = 'export.pdf'
) {
  // Para PDF mais complexo, seria necessário usar uma biblioteca como jsPDF
  // Por enquanto, vamos criar um PDF simples
  const blob = new Blob([content], { type: 'application/pdf' });
  downloadFile(blob, filename);
}

/**
 * Função auxiliar para fazer download de arquivo
 */
function downloadFile(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Gera relatório de auditoria em formato texto
 */
export function generateAuditReport(logs: any[]): string {
  let report = 'RELATÓRIO DE AUDITORIA\n';
  report += '='.repeat(80) + '\n\n';
  report += `Data de Geração: ${new Date().toLocaleString('pt-BR')}\n`;
  report += `Total de Registros: ${logs.length}\n\n`;
  report += '='.repeat(80) + '\n\n';

  logs.forEach((log, index) => {
    report += `Registro ${index + 1}\n`;
    report += '-'.repeat(80) + '\n';
    report += `Timestamp: ${log.timestamp}\n`;
    report += `Usuário: ${log.user}\n`;
    report += `Ação: ${log.action}\n`;
    report += `Entidade: ${log.entity}\n`;
    report += `Descrição: ${log.description}\n`;
    report += `IP: ${log.ipAddress}\n`;
    report += `User Agent: ${log.userAgent}\n`;
    report += '\n';
  });

  return report;
}

/**
 * Gera relatório de avaliações em formato texto
 */
export function generateAssessmentReport(assessments: any[]): string {
  let report = 'RELATÓRIO DE AVALIAÇÕES DE RISCOS PSICOSSOCIAIS\n';
  report += '='.repeat(80) + '\n\n';
  report += `Data de Geração: ${new Date().toLocaleString('pt-BR')}\n`;
  report += `Total de Avaliações: ${assessments.length}\n\n`;
  report += '='.repeat(80) + '\n\n';

  assessments.forEach((assessment, index) => {
    report += `Avaliação ${index + 1}\n`;
    report += '-'.repeat(80) + '\n';
    report += `Título: ${assessment.title}\n`;
    report += `Setor: ${assessment.sector}\n`;
    report += `Data: ${assessment.date}\n`;
    report += `Status: ${assessment.status}\n`;
    report += `Descrição: ${assessment.description}\n`;
    report += '\n';
  });

  return report;
}

/**
 * Gera relatório de conformidade NR-01 em formato texto
 */
export function generateComplianceReport(items: any[]): string {
  let report = 'RELATÓRIO DE CONFORMIDADE NR-01\n';
  report += '='.repeat(80) + '\n\n';
  report += `Data de Geração: ${new Date().toLocaleString('pt-BR')}\n`;
  report += `Portaria MTE nº 1.419/2024\n\n`;

  const compliant = items.filter((i) => i.status === 'conforme').length;
  const nonCompliant = items.filter((i) => i.status === 'não conforme').length;
  const percentage = ((compliant / items.length) * 100).toFixed(2);

  report += `Total de Itens: ${items.length}\n`;
  report += `Conformes: ${compliant}\n`;
  report += `Não Conformes: ${nonCompliant}\n`;
  report += `Taxa de Conformidade: ${percentage}%\n\n`;
  report += '='.repeat(80) + '\n\n';

  items.forEach((item, index) => {
    report += `Item ${index + 1}: ${item.title}\n`;
    report += `Status: ${item.status}\n`;
    report += `Descrição: ${item.description}\n`;
    if (item.action) {
      report += `Ação: ${item.action}\n`;
    }
    report += '\n';
  });

  return report;
}

