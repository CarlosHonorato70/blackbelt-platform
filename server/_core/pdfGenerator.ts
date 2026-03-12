/**
 * PDF Generator Utility
 * Uses PDFKit to generate professional PDFs with branding support
 */

import PDFDocument from "pdfkit";
import { Readable } from "stream";

export interface PdfBranding {
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  companyName?: string;
}

export interface PdfMetadata {
  title: string;
  subject?: string;
  author?: string;
  keywords?: string[];
  creator?: string;
}

export interface ProposalPdfData {
  proposalNumber: string;
  clientName: string;
  clientEmail?: string;
  date: string;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  notes?: string;
  validUntil?: string;
}

export interface AssessmentPdfData {
  assessmentNumber: string;
  companyName: string;
  date: string;
  sector: string;
  riskLevel: string;
  findings: Array<{
    hazard: string;
    risk: string;
    severity: string;
    probability: string;
    recommendations: string;
  }>;
  summary: string;
  inspector: string;
}

/**
 * Generate a PDF proposal
 */
export async function generateProposalPdf(
  data: ProposalPdfData,
  branding?: PdfBranding,
  metadata?: PdfMetadata
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: metadata?.title || `Proposta #${data.proposalNumber}`,
        Subject: metadata?.subject || "Proposta Comercial",
        Author: metadata?.author || branding?.companyName || "Black Belt Platform",
        Keywords: metadata?.keywords?.join(", ") || "proposta, orçamento",
        Creator: metadata?.creator || "Black Belt Platform PDF Generator",
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const primaryColor = branding?.primaryColor || "#1a1a1a";
    const secondaryColor = branding?.secondaryColor || "#666666";

    // Header with logo/branding
    if (branding?.logoUrl) {
      // TODO: Download and embed logo
      // For now, just show company name
    }

    doc
      .fontSize(24)
      .fillColor(primaryColor)
      .text(branding?.companyName || "Black Belt Platform", { align: "center" });

    doc.moveDown(0.5);
    doc
      .fontSize(16)
      .fillColor(secondaryColor)
      .text("PROPOSTA COMERCIAL", { align: "center" });

    doc.moveDown(2);

    // Proposal info
    doc
      .fontSize(10)
      .fillColor("#000000")
      .text(`Proposta: ${data.proposalNumber}`, 50, doc.y);
    doc.text(`Data: ${data.date}`);
    if (data.validUntil) {
      doc.text(`Válida até: ${data.validUntil}`);
    }

    doc.moveDown(1);

    // Client info
    doc.fontSize(12).fillColor(primaryColor).text("CLIENTE", 50, doc.y);
    doc
      .fontSize(10)
      .fillColor("#000000")
      .text(data.clientName);
    if (data.clientEmail) {
      doc.text(data.clientEmail);
    }

    doc.moveDown(2);

    // Items table
    doc.fontSize(12).fillColor(primaryColor).text("ITENS", 50, doc.y);
    doc.moveDown(0.5);

    // Table header
    const tableTop = doc.y;
    doc
      .fontSize(9)
      .fillColor("#ffffff")
      .rect(50, tableTop, 495, 20)
      .fill(primaryColor);

    doc
      .fillColor("#ffffff")
      .text("Descrição", 60, tableTop + 6, { width: 200 });
    doc.text("Qtd", 270, tableTop + 6, { width: 40, align: "right" });
    doc.text("Valor Unit.", 320, tableTop + 6, { width: 80, align: "right" });
    doc.text("Total", 410, tableTop + 6, { width: 125, align: "right" });

    // Table rows
    let currentY = tableTop + 25;
    doc.fillColor("#000000");

    data.items.forEach((item, index) => {
      if (currentY > 700) {
        // New page if needed
        doc.addPage();
        currentY = 50;
      }

      const rowHeight = 30;
      if (index % 2 === 0) {
        doc.rect(50, currentY, 495, rowHeight).fill("#f5f5f5");
      }

      doc
        .fontSize(9)
        .fillColor("#000000")
        .text(item.name, 60, currentY + 8, { width: 200 });
      if (item.description) {
        doc
          .fontSize(8)
          .fillColor(secondaryColor)
          .text(item.description, 60, currentY + 18, { width: 200 });
      }

      doc
        .fontSize(9)
        .fillColor("#000000")
        .text(item.quantity.toString(), 270, currentY + 8, {
          width: 40,
          align: "right",
        });
      doc.text(`R$ ${(item.unitPrice / 100).toFixed(2)}`, 320, currentY + 8, {
        width: 80,
        align: "right",
      });
      doc.text(`R$ ${(item.total / 100).toFixed(2)}`, 410, currentY + 8, {
        width: 125,
        align: "right",
      });

      currentY += rowHeight;
    });

    // Totals
    currentY += 20;
    doc
      .fontSize(10)
      .fillColor("#000000")
      .text("Subtotal:", 350, currentY, { width: 100, align: "right" });
    doc.text(`R$ ${(data.subtotal / 100).toFixed(2)}`, 460, currentY, {
      width: 75,
      align: "right",
    });

    if (data.discount && data.discount > 0) {
      currentY += 20;
      doc
        .fillColor(secondaryColor)
        .text("Desconto:", 350, currentY, { width: 100, align: "right" });
      doc.text(`-R$ ${(data.discount / 100).toFixed(2)}`, 460, currentY, {
        width: 75,
        align: "right",
      });
    }

    if (data.tax && data.tax > 0) {
      currentY += 20;
      doc
        .fillColor("#000000")
        .text("Impostos:", 350, currentY, { width: 100, align: "right" });
      doc.text(`R$ ${(data.tax / 100).toFixed(2)}`, 460, currentY, {
        width: 75,
        align: "right",
      });
    }

    currentY += 25;
    doc
      .fontSize(12)
      .fillColor(primaryColor)
      .rect(350, currentY - 5, 195, 25)
      .fill(primaryColor);

    doc
      .fillColor("#ffffff")
      .text("TOTAL:", 360, currentY, { width: 90, align: "right" });
    doc.text(`R$ ${(data.total / 100).toFixed(2)}`, 460, currentY, {
      width: 75,
      align: "right",
    });

    // Notes
    if (data.notes) {
      doc.moveDown(3);
      doc
        .fontSize(10)
        .fillColor(primaryColor)
        .text("OBSERVAÇÕES:", 50, doc.y);
      doc
        .fontSize(9)
        .fillColor("#000000")
        .text(data.notes, 50, doc.y + 10, { align: "justify" });
    }

    // Footer
    doc
      .fontSize(8)
      .fillColor(secondaryColor)
      .text(
        `Gerado em ${new Date().toLocaleDateString("pt-BR")} por ${branding?.companyName || "Black Belt Platform"}`,
        50,
        750,
        { align: "center" }
      );

    doc.end();
  });
}

/**
 * Generate an assessment report PDF
 */
export async function generateAssessmentPdf(
  data: AssessmentPdfData,
  branding?: PdfBranding,
  metadata?: PdfMetadata
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: metadata?.title || `Avaliação #${data.assessmentNumber}`,
        Subject: metadata?.subject || "Avaliação de Riscos NR-01",
        Author: metadata?.author || branding?.companyName || "Black Belt Platform",
        Keywords: metadata?.keywords?.join(", ") || "avaliação, riscos, NR-01",
        Creator: metadata?.creator || "Black Belt Platform PDF Generator",
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const primaryColor = branding?.primaryColor || "#1a1a1a";
    const secondaryColor = branding?.secondaryColor || "#666666";

    // Header
    doc
      .fontSize(24)
      .fillColor(primaryColor)
      .text(branding?.companyName || "Black Belt Platform", { align: "center" });

    doc.moveDown(0.5);
    doc
      .fontSize(16)
      .fillColor(secondaryColor)
      .text("RELATÓRIO DE AVALIAÇÃO DE RISCOS", { align: "center" });

    doc.moveDown(2);

    // Assessment info
    doc
      .fontSize(10)
      .fillColor("#000000")
      .text(`Avaliação: ${data.assessmentNumber}`, 50, doc.y);
    doc.text(`Data: ${data.date}`);
    doc.text(`Empresa: ${data.companyName}`);
    doc.text(`Setor: ${data.sector}`);

    doc.moveDown(1);

    // Risk level indicator
    const riskColors: Record<string, string> = {
      baixo: "#10b981",
      médio: "#f59e0b",
      alto: "#ef4444",
      crítico: "#7f1d1d",
    };

    const riskColor = riskColors[data.riskLevel.toLowerCase()] || "#666666";

    doc
      .fontSize(12)
      .fillColor(primaryColor)
      .text("NÍVEL DE RISCO GERAL:", 50, doc.y);
    doc
      .fontSize(14)
      .fillColor(riskColor)
      .text(data.riskLevel.toUpperCase(), 200, doc.y - 12);

    doc.moveDown(2);

    // Findings
    doc
      .fontSize(12)
      .fillColor(primaryColor)
      .text("ANÁLISE DE RISCOS", 50, doc.y);
    doc.moveDown(0.5);

    data.findings.forEach((finding, index) => {
      if (doc.y > 650) {
        doc.addPage();
      }

      doc
        .fontSize(10)
        .fillColor(primaryColor)
        .text(`${index + 1}. ${finding.hazard}`, 50, doc.y);

      doc
        .fontSize(9)
        .fillColor("#000000")
        .text(`Risco: ${finding.risk}`, 60, doc.y);
      doc.text(
        `Severidade: ${finding.severity} | Probabilidade: ${finding.probability}`,
        60,
        doc.y
      );

      if (finding.recommendations) {
        doc
          .fontSize(9)
          .fillColor(secondaryColor)
          .text(`Recomendações: ${finding.recommendations}`, 60, doc.y, {
            align: "justify",
          });
      }

      doc.moveDown(1);
    });

    // Summary
    if (data.summary) {
      if (doc.y > 600) {
        doc.addPage();
      }

      doc
        .fontSize(12)
        .fillColor(primaryColor)
        .text("RESUMO EXECUTIVO", 50, doc.y);
      doc.moveDown(0.5);

      doc
        .fontSize(9)
        .fillColor("#000000")
        .text(data.summary, 50, doc.y, { align: "justify" });
    }

    doc.moveDown(2);

    // Inspector signature
    doc
      .fontSize(10)
      .fillColor("#000000")
      .text("Responsável pela avaliação:", 50, doc.y);
    doc.text(data.inspector, 50, doc.y + 40);
    doc.moveTo(50, doc.y + 35).lineTo(250, doc.y + 35).stroke();

    // Footer
    doc
      .fontSize(8)
      .fillColor(secondaryColor)
      .text(
        `Gerado em ${new Date().toLocaleDateString("pt-BR")} por ${branding?.companyName || "Black Belt Platform"}`,
        50,
        750,
        { align: "center" }
      );

    doc.end();
  });
}

// ============================================================================
// NR-01 AI Document PDFs
// ============================================================================

export interface InventoryPdfData {
  companyName: string;
  sector: string;
  date: string;
  methodology: string;
  assessor: string;
  items: Array<{
    hazardCode: string;
    hazard: string;
    risk: string;
    healthDamage: string;
    severity: string;
    probability: string;
    riskLevel: string;
    currentControls: string;
    recommendedControls: string;
  }>;
  totalWorkers?: number;
}

const RISK_LEVEL_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const RISK_LEVEL_PT: Record<string, string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  critical: "Crítico",
};

const SEVERITY_PT: Record<string, string> = {
  low: "Leve",
  medium: "Moderada",
  high: "Grave",
  critical: "Gravíssima",
};

const PROBABILITY_PT: Record<string, string> = {
  rare: "Rara",
  unlikely: "Improvável",
  possible: "Possível",
  likely: "Provável",
  certain: "Certa",
};

/**
 * Generate NR-01 Risk Inventory PDF
 */
export async function generateInventoryPdf(
  data: InventoryPdfData,
  branding?: PdfBranding,
  metadata?: PdfMetadata
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      info: {
        Title: metadata?.title || "Inventário de Riscos Ocupacionais — Psicossociais",
        Subject: metadata?.subject || "NR-01 item 1.5.7.1",
        Author: metadata?.author || branding?.companyName || "Black Belt Platform",
        Keywords: metadata?.keywords?.join(", ") || "inventário, riscos, NR-01, psicossocial",
        Creator: metadata?.creator || "Black Belt Platform PDF Generator",
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const primaryColor = branding?.primaryColor || "#1a1a1a";
    const secondaryColor = branding?.secondaryColor || "#666666";

    // ── Header ───────────────────────────────────────────────────────────
    doc
      .fontSize(18)
      .fillColor(primaryColor)
      .text(branding?.companyName || "Black Belt Platform", { align: "center" });

    doc.moveDown(0.3);
    doc
      .fontSize(14)
      .fillColor(secondaryColor)
      .text("INVENTÁRIO DE RISCOS OCUPACIONAIS — PSICOSSOCIAIS", { align: "center" });

    doc
      .fontSize(9)
      .fillColor(secondaryColor)
      .text("Conforme NR-01 item 1.5.7.1 — Gerenciamento de Riscos Ocupacionais", { align: "center" });

    doc.moveDown(1);

    // ── Informacoes gerais ───────────────────────────────────────────────
    doc
      .fontSize(9)
      .fillColor("#000000")
      .text(`Empresa: ${data.companyName}    |    Setor: ${data.sector}    |    Data: ${data.date}    |    Responsável: ${data.assessor}${data.totalWorkers ? `    |    Trabalhadores: ${data.totalWorkers}` : ""}`, 40, doc.y);

    doc.moveDown(1);

    // ── Tabela ───────────────────────────────────────────────────────────
    const colWidths = [55, 130, 130, 120, 70, 70, 55, 120];
    const headers = ["Código", "Perigo", "Risco", "Lesão/Agravo", "Severidade", "Probabilidade", "Nível", "Controles Recomendados"];
    const tableLeft = 40;
    const rowHeight = 28;

    // Header row
    let y = doc.y;
    doc.rect(tableLeft, y, colWidths.reduce((a, b) => a + b, 0), 22).fill(primaryColor);

    let x = tableLeft + 4;
    headers.forEach((header, i) => {
      doc.fontSize(7).fillColor("#ffffff").text(header, x, y + 6, { width: colWidths[i] - 8 });
      x += colWidths[i];
    });

    y += 22;

    // Data rows
    data.items.forEach((item, index) => {
      if (y > 500) {
        doc.addPage();
        y = 40;
        // Repeat header
        doc.rect(tableLeft, y, colWidths.reduce((a, b) => a + b, 0), 22).fill(primaryColor);
        let hx = tableLeft + 4;
        headers.forEach((header, i) => {
          doc.fontSize(7).fillColor("#ffffff").text(header, hx, y + 6, { width: colWidths[i] - 8 });
          hx += colWidths[i];
        });
        y += 22;
      }

      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(tableLeft, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill("#f8f9fa");
      }

      // Risk level color indicator
      const riskColor = RISK_LEVEL_COLORS[item.riskLevel] || "#666666";
      doc.rect(tableLeft, y, 3, rowHeight).fill(riskColor);

      x = tableLeft + 4;
      const cellData = [
        item.hazardCode,
        item.hazard,
        item.risk,
        item.healthDamage,
        SEVERITY_PT[item.severity] || item.severity,
        PROBABILITY_PT[item.probability] || item.probability,
        RISK_LEVEL_PT[item.riskLevel] || item.riskLevel,
        item.recommendedControls,
      ];

      cellData.forEach((text, i) => {
        doc
          .fontSize(7)
          .fillColor(i === 6 ? riskColor : "#000000")
          .text(text || "—", x, y + 5, {
            width: colWidths[i] - 8,
            height: rowHeight - 8,
            ellipsis: true,
          });
        x += colWidths[i];
      });

      y += rowHeight;
    });

    // ── Resumo ───────────────────────────────────────────────────────────
    if (y > 480) doc.addPage();
    doc.moveDown(1);

    const counts: Record<string, number> = {};
    data.items.forEach((i) => {
      counts[i.riskLevel] = (counts[i.riskLevel] || 0) + 1;
    });

    doc
      .fontSize(9)
      .fillColor(primaryColor)
      .text("RESUMO:", 40, y + 10);

    doc
      .fontSize(8)
      .fillColor("#000000")
      .text(
        `Total de riscos: ${data.items.length}    |    Críticos: ${counts.critical || 0}    |    Altos: ${counts.high || 0}    |    Médios: ${counts.medium || 0}    |    Baixos: ${counts.low || 0}`,
        40,
        y + 25
      );

    // ── Footer ───────────────────────────────────────────────────────────
    doc
      .fontSize(7)
      .fillColor(secondaryColor)
      .text(
        `Gerado automaticamente por IA — ${branding?.companyName || "Black Belt Platform"} — ${new Date().toLocaleDateString("pt-BR")}`,
        40,
        540,
        { align: "center" }
      );

    doc.end();
  });
}

export interface ActionPlanPdfData {
  companyName: string;
  sector: string;
  date: string;
  planTitle: string;
  actions: Array<{
    riskIdentified: string;
    controlMeasure: string;
    actionType: string;
    responsibleRole: string;
    deadline: string;
    priority: string;
    monthlySchedule: boolean[];
    expectedImpact: string;
    kpiIndicator: string;
  }>;
  generalActions: Array<{
    title: string;
    description: string;
    frequency: string;
    responsibleRole: string;
  }>;
  monitoringStrategy: string;
}

const ACTION_TYPE_PT: Record<string, string> = {
  elimination: "Eliminação",
  substitution: "Substituição",
  engineering: "Engenharia",
  administrative: "Administrativa",
  ppe: "EPI",
};

const PRIORITY_PT: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#6b7280",
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/**
 * Generate NR-01 Action Plan PDF
 */
export async function generateActionPlanPdf(
  data: ActionPlanPdfData,
  branding?: PdfBranding,
  metadata?: PdfMetadata
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      info: {
        Title: metadata?.title || "Plano de Ação — Mitigação de Riscos Psicossociais",
        Subject: metadata?.subject || "NR-01 item 1.5.5.2",
        Author: metadata?.author || branding?.companyName || "Black Belt Platform",
        Keywords: metadata?.keywords?.join(", ") || "plano de ação, riscos, NR-01, psicossocial",
        Creator: metadata?.creator || "Black Belt Platform PDF Generator",
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const primaryColor = branding?.primaryColor || "#1a1a1a";
    const secondaryColor = branding?.secondaryColor || "#666666";

    // ── Header ───────────────────────────────────────────────────────────
    doc
      .fontSize(18)
      .fillColor(primaryColor)
      .text(branding?.companyName || "Black Belt Platform", { align: "center" });

    doc.moveDown(0.3);
    doc
      .fontSize(14)
      .fillColor(secondaryColor)
      .text("PLANO DE AÇÃO — MITIGAÇÃO DE RISCOS PSICOSSOCIAIS", { align: "center" });

    doc
      .fontSize(9)
      .fillColor(secondaryColor)
      .text("Conforme NR-01 item 1.5.5.2 — Medidas de Prevenção", { align: "center" });

    doc.moveDown(0.5);

    doc
      .fontSize(9)
      .fillColor("#000000")
      .text(`Empresa: ${data.companyName}    |    Setor: ${data.sector}    |    Data: ${data.date}`, 40, doc.y);

    doc.moveDown(1);

    // ── Secao 1: Acoes Especificas ───────────────────────────────────────
    doc.fontSize(11).fillColor(primaryColor).text("1. AÇÕES ESPECÍFICAS DE MITIGAÇÃO", 40, doc.y);
    doc.moveDown(0.5);

    const colWidths = [140, 150, 70, 60, 80, 55, 70, 90];
    const headers = ["Risco Identificado", "Medida de Controle", "Tipo", "Prioridade", "Responsável", "Prazo", "KPI", "Impacto Esperado"];
    const tableLeft = 40;
    const rowHeight = 30;

    let y = doc.y;
    doc.rect(tableLeft, y, colWidths.reduce((a, b) => a + b, 0), 20).fill(primaryColor);

    let x = tableLeft + 4;
    headers.forEach((header, i) => {
      doc.fontSize(7).fillColor("#ffffff").text(header, x, y + 5, { width: colWidths[i] - 8 });
      x += colWidths[i];
    });
    y += 20;

    data.actions.forEach((action, index) => {
      if (y > 480) {
        doc.addPage();
        y = 40;
        // Repeat header
        doc.rect(tableLeft, y, colWidths.reduce((a, b) => a + b, 0), 20).fill(primaryColor);
        let hx = tableLeft + 4;
        headers.forEach((header, i) => {
          doc.fontSize(7).fillColor("#ffffff").text(header, hx, y + 5, { width: colWidths[i] - 8 });
          hx += colWidths[i];
        });
        y += 20;
      }

      if (index % 2 === 0) {
        doc.rect(tableLeft, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill("#f8f9fa");
      }

      // Priority color indicator
      const prioColor = PRIORITY_COLORS[action.priority] || "#666666";
      doc.rect(tableLeft, y, 3, rowHeight).fill(prioColor);

      x = tableLeft + 4;
      const cellData = [
        action.riskIdentified,
        action.controlMeasure,
        ACTION_TYPE_PT[action.actionType] || action.actionType,
        PRIORITY_PT[action.priority] || action.priority,
        action.responsibleRole,
        action.deadline,
        action.kpiIndicator,
        action.expectedImpact,
      ];

      cellData.forEach((text, i) => {
        doc
          .fontSize(6.5)
          .fillColor(i === 3 ? prioColor : "#000000")
          .text(text || "—", x, y + 5, {
            width: colWidths[i] - 8,
            height: rowHeight - 8,
            ellipsis: true,
          });
        x += colWidths[i];
      });

      y += rowHeight;
    });

    // ── Secao 2: Cronograma Mensal ──────────────────────────────────────
    if (data.actions.some((a) => a.monthlySchedule?.length > 0)) {
      if (y > 400) {
        doc.addPage();
        y = 40;
      } else {
        y += 15;
      }

      doc.fontSize(11).fillColor(primaryColor).text("2. CRONOGRAMA MENSAL", 40, y);
      y += 20;

      const schedColWidths = [200, ...MONTHS.map(() => 45)];
      const schedHeaders = ["Ação", ...MONTHS];

      doc.rect(tableLeft, y, schedColWidths.reduce((a, b) => a + b, 0), 18).fill(primaryColor);
      x = tableLeft + 4;
      schedHeaders.forEach((h, i) => {
        doc.fontSize(7).fillColor("#ffffff").text(h, x, y + 4, {
          width: schedColWidths[i] - 8,
          align: i === 0 ? "left" : "center",
        });
        x += schedColWidths[i];
      });
      y += 18;

      data.actions
        .filter((a) => a.monthlySchedule?.length > 0)
        .forEach((action, index) => {
          if (y > 500) {
            doc.addPage();
            y = 40;
          }

          if (index % 2 === 0) {
            doc.rect(tableLeft, y, schedColWidths.reduce((a, b) => a + b, 0), 18).fill("#f8f9fa");
          }

          x = tableLeft + 4;
          doc.fontSize(6.5).fillColor("#000000").text(
            action.riskIdentified || `Ação ${index + 1}`,
            x, y + 4, { width: schedColWidths[0] - 8, ellipsis: true }
          );
          x += schedColWidths[0];

          for (let m = 0; m < 12; m++) {
            const active = action.monthlySchedule[m] || false;
            if (active) {
              doc.fontSize(8).fillColor("#10b981").text("X", x, y + 4, {
                width: schedColWidths[m + 1] - 8,
                align: "center",
              });
            } else {
              doc.fontSize(7).fillColor("#d1d5db").text("—", x, y + 4, {
                width: schedColWidths[m + 1] - 8,
                align: "center",
              });
            }
            x += schedColWidths[m + 1];
          }

          y += 18;
        });
    }

    // ── Secao 3: Acoes Gerais ───────────────────────────────────────────
    if (data.generalActions.length > 0) {
      if (y > 430) {
        doc.addPage();
        y = 40;
      } else {
        y += 15;
      }

      const sectionNum = data.actions.some((a) => a.monthlySchedule?.length > 0) ? "3" : "2";
      doc.fontSize(11).fillColor(primaryColor).text(`${sectionNum}. AÇÕES GERAIS OBRIGATÓRIAS`, 40, y);
      y += 20;

      data.generalActions.forEach((ga, i) => {
        if (y > 500) {
          doc.addPage();
          y = 40;
        }

        doc.fontSize(8).fillColor(primaryColor).text(`${i + 1}. ${ga.title}`, 50, y);
        y += 12;
        doc.fontSize(7).fillColor("#000000").text(ga.description, 60, y, { width: 650 });
        y += 14;
        doc.fontSize(7).fillColor(secondaryColor).text(
          `Frequência: ${ga.frequency}    |    Responsável: ${ga.responsibleRole}`,
          60, y
        );
        y += 16;
      });
    }

    // ── Secao 4: Estrategia de Monitoramento ────────────────────────────
    if (data.monitoringStrategy) {
      if (y > 460) {
        doc.addPage();
        y = 40;
      } else {
        y += 10;
      }

      const sectionNum = data.actions.some((a) => a.monthlySchedule?.length > 0)
        ? data.generalActions.length > 0 ? "4" : "3"
        : data.generalActions.length > 0 ? "3" : "2";

      doc.fontSize(11).fillColor(primaryColor).text(`${sectionNum}. ESTRATÉGIA DE MONITORAMENTO`, 40, y);
      y += 18;
      doc.fontSize(8).fillColor("#000000").text(data.monitoringStrategy, 50, y, { width: 680 });
    }

    // ── Footer ───────────────────────────────────────────────────────────
    doc
      .fontSize(7)
      .fillColor(secondaryColor)
      .text(
        `Gerado automaticamente por IA — ${branding?.companyName || "Black Belt Platform"} — ${new Date().toLocaleDateString("pt-BR")}`,
        40,
        540,
        { align: "center" }
      );

    doc.end();
  });
}

/**
 * Convert buffer to stream
 */
export function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// ============================================================================
// Generic NR-01 Report PDF Generator
// ============================================================================

export interface PdfKpiCard {
  label: string;
  value: string;
  color?: string;
}

export interface PdfTableColumn {
  header: string;
  width: number;
  align?: "left" | "center" | "right";
}

export interface PdfTableRow {
  cells: string[];
  accentColor?: string;
}

export interface PdfSection {
  type: "title" | "subtitle" | "text" | "kpis" | "table" | "spacer" | "divider" | "signature" | "list";
  // title/subtitle/text
  content?: string;
  // kpis
  kpis?: PdfKpiCard[];
  // table
  columns?: PdfTableColumn[];
  rows?: PdfTableRow[];
  // list
  items?: string[];
  // signature
  signatureName?: string;
  signatureRole?: string;
  signatureRegistry?: string;
}

export interface GenericReportData {
  reportTitle: string;
  reportSubtitle?: string;
  referenceText?: string;
  companyName?: string;
  date?: string;
  sections: PdfSection[];
  landscape?: boolean;
}

/**
 * Generate a generic NR-01 report PDF with configurable sections.
 * Supports: title, subtitle, text, KPI cards, tables, lists, signatures, dividers.
 */
export async function generateGenericReportPdf(
  data: GenericReportData,
  branding?: PdfBranding,
  metadata?: PdfMetadata
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: data.landscape ? "landscape" : "portrait",
      margins: { top: 40, bottom: 50, left: 50, right: 50 },
      info: {
        Title: metadata?.title || data.reportTitle,
        Subject: metadata?.subject || "Relatório NR-01",
        Author: metadata?.author || branding?.companyName || "Black Belt Platform",
        Keywords: metadata?.keywords?.join(", ") || "NR-01, relatório, compliance",
        Creator: "Black Belt Platform PDF Generator",
      },
    });

    const buffers: Buffer[] = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    const primaryColor = branding?.primaryColor || "#1a365d";
    const secondaryColor = branding?.secondaryColor || "#666666";
    const pageWidth = data.landscape ? 842 - 100 : 595 - 100; // A4 minus margins

    // ── Header ──────────────────────────────────────────────────────────
    doc
      .fontSize(18)
      .fillColor(primaryColor)
      .text(branding?.companyName || "Black Belt Platform", { align: "center" });

    doc.moveDown(0.3);
    doc
      .fontSize(14)
      .fillColor(secondaryColor)
      .text(data.reportTitle.toUpperCase(), { align: "center" });

    if (data.reportSubtitle) {
      doc.moveDown(0.2);
      doc.fontSize(10).fillColor(secondaryColor).text(data.reportSubtitle, { align: "center" });
    }

    if (data.referenceText) {
      doc.fontSize(8).fillColor(secondaryColor).text(data.referenceText, { align: "center" });
    }

    doc.moveDown(0.5);

    // Company/date info line
    if (data.companyName || data.date) {
      const infoParts: string[] = [];
      if (data.companyName) infoParts.push(`Empresa: ${data.companyName}`);
      if (data.date) infoParts.push(`Data: ${data.date}`);
      doc.fontSize(9).fillColor("#000000").text(infoParts.join("    |    "), { align: "left" });
      doc.moveDown(0.8);
    }

    // ── Render sections ─────────────────────────────────────────────────
    for (const section of data.sections) {
      // Page break check
      if (doc.y > (data.landscape ? 480 : 700)) {
        doc.addPage();
      }

      switch (section.type) {
        case "title":
          doc.fontSize(12).fillColor(primaryColor).text(section.content || "", { align: "left" });
          doc.moveDown(0.4);
          break;

        case "subtitle":
          doc.fontSize(10).fillColor(primaryColor).text(section.content || "", { align: "left" });
          doc.moveDown(0.3);
          break;

        case "text":
          doc.fontSize(9).fillColor("#000000").text(section.content || "", { align: "justify" });
          doc.moveDown(0.5);
          break;

        case "spacer":
          doc.moveDown(1);
          break;

        case "divider":
          doc.moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).lineWidth(0.5).strokeColor("#e5e7eb").stroke();
          doc.moveDown(0.5);
          break;

        case "kpis":
          if (section.kpis && section.kpis.length > 0) {
            const kpiCount = Math.min(section.kpis.length, 5);
            const kpiWidth = Math.floor(pageWidth / kpiCount) - 8;
            const kpiY = doc.y;

            section.kpis.slice(0, 5).forEach((kpi, i) => {
              const kpiX = 50 + i * (kpiWidth + 8);
              const kpiColor = kpi.color || primaryColor;

              // Card background
              doc.rect(kpiX, kpiY, kpiWidth, 50).lineWidth(1).strokeColor(kpiColor).stroke();
              doc.rect(kpiX, kpiY, kpiWidth, 3).fill(kpiColor);

              // Value
              doc.fontSize(14).fillColor(kpiColor).text(kpi.value, kpiX + 5, kpiY + 10, {
                width: kpiWidth - 10,
                align: "center",
              });

              // Label
              doc.fontSize(7).fillColor(secondaryColor).text(kpi.label, kpiX + 5, kpiY + 30, {
                width: kpiWidth - 10,
                align: "center",
              });
            });

            doc.y = kpiY + 60;
            doc.moveDown(0.3);
          }
          break;

        case "table":
          if (section.columns && section.rows) {
            const tableLeft = 50;
            const rowH = 22;
            let y = doc.y;

            // Header
            const totalWidth = section.columns.reduce((sum, c) => sum + c.width, 0);
            doc.rect(tableLeft, y, totalWidth, 18).fill(primaryColor);

            let x = tableLeft + 3;
            section.columns.forEach((col) => {
              doc.fontSize(7).fillColor("#ffffff").text(col.header, x, y + 4, {
                width: col.width - 6,
                align: col.align || "left",
              });
              x += col.width;
            });
            y += 18;

            // Rows
            section.rows.forEach((row, ri) => {
              if (y > (data.landscape ? 490 : 710)) {
                doc.addPage();
                y = 40;
                // Repeat header
                doc.rect(tableLeft, y, totalWidth, 18).fill(primaryColor);
                let hx = tableLeft + 3;
                section.columns!.forEach((col) => {
                  doc.fontSize(7).fillColor("#ffffff").text(col.header, hx, y + 4, {
                    width: col.width - 6,
                    align: col.align || "left",
                  });
                  hx += col.width;
                });
                y += 18;
              }

              if (ri % 2 === 0) {
                doc.rect(tableLeft, y, totalWidth, rowH).fill("#f8f9fa");
              }

              if (row.accentColor) {
                doc.rect(tableLeft, y, 3, rowH).fill(row.accentColor);
              }

              x = tableLeft + 3;
              row.cells.forEach((cell, ci) => {
                const col = section.columns![ci];
                doc.fontSize(7).fillColor("#000000").text(cell || "—", x, y + 5, {
                  width: (col?.width || 80) - 6,
                  height: rowH - 6,
                  ellipsis: true,
                  align: col?.align || "left",
                });
                x += col?.width || 80;
              });
              y += rowH;
            });

            doc.y = y + 5;
          }
          break;

        case "list":
          if (section.items) {
            section.items.forEach((item) => {
              if (doc.y > (data.landscape ? 490 : 710)) doc.addPage();
              doc.fontSize(8).fillColor("#000000").text(`  •  ${item}`, { indent: 10 });
              doc.moveDown(0.2);
            });
            doc.moveDown(0.3);
          }
          break;

        case "signature":
          if (doc.y > (data.landscape ? 430 : 650)) doc.addPage();
          doc.moveDown(2);
          const sigX = 50;
          doc.moveTo(sigX, doc.y).lineTo(sigX + 250, doc.y).lineWidth(0.5).strokeColor("#000000").stroke();
          doc.moveDown(0.2);
          if (section.signatureName) {
            doc.fontSize(10).fillColor("#000000").text(section.signatureName);
          }
          if (section.signatureRole) {
            doc.fontSize(8).fillColor(secondaryColor).text(section.signatureRole);
          }
          if (section.signatureRegistry) {
            doc.fontSize(8).fillColor(secondaryColor).text(section.signatureRegistry);
          }
          break;
      }
    }

    // ── Footer on every page ────────────────────────────────────────────
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(7)
        .fillColor(secondaryColor)
        .text(
          `${data.reportTitle} — ${branding?.companyName || "Black Belt Platform"} — ${new Date().toLocaleDateString("pt-BR")} — Página ${i + 1} de ${pages.count}`,
          50,
          data.landscape ? 545 : 770,
          { align: "center", width: pageWidth }
        );
    }

    doc.end();
  });
}
