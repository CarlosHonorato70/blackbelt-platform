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

/**
 * Convert buffer to stream
 */
export function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}
