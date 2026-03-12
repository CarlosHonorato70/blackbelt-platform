import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  generateGenericReportPdf,
  type GenericReportData,
  type PdfSection,
  type PdfBranding,
} from "../_core/pdfGenerator";
import {
  riskAssessmentItems,
  riskAssessments,
  pcmsoRecommendations,
  copsoqReports,
  complianceMilestones,
  complianceChecklist,
  complianceCertificates,
  complianceDocuments,
  benchmarkData,
  psychosocialSurveys,
  surveyResponses,
  trainingModules,
  trainingProgress,
  anonymousReports,
  deadlineAlerts,
  ergonomicAssessments,
  ergonomicItems,
  esocialExports,
  financialParameters,
  actionPlans,
  mentalHealthIndicators,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

const SEVERITY_LABELS: Record<string, string> = { low: "Leve", medium: "Moderada", high: "Grave", critical: "Gravissima" };
const PROBABILITY_LABELS: Record<string, string> = { rare: "Rara", unlikely: "Improvavel", possible: "Possivel", likely: "Provavel", certain: "Certa" };
const RISK_LABELS: Record<string, string> = { low: "Baixo", medium: "Medio", high: "Alto", critical: "Critico" };
const RISK_COLORS: Record<string, string> = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };

const branding: PdfBranding = { companyName: "Black Belt Platform", primaryColor: "#1a365d" };

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function fmtCurrency(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

export const nr01PdfExportRouter = router({
  // 1. Matriz de Risco
  exportRiskMatrix: publicProcedure
    .input(z.object({ tenantId: z.string(), assessmentId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const assessments = await db.select().from(riskAssessments)
        .where(input.assessmentId
          ? and(eq(riskAssessments.tenantId, input.tenantId), eq(riskAssessments.id, input.assessmentId))
          : eq(riskAssessments.tenantId, input.tenantId));

      const ids = assessments.map((a) => a.id);
      const items = ids.length > 0
        ? await db.select().from(riskAssessmentItems).where(sql`${riskAssessmentItems.assessmentId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
        : [];

      // Build severity x probability matrix counts
      const matrix: Record<string, Record<string, number>> = {};
      for (const s of ["low", "medium", "high", "critical"]) {
        matrix[s] = {};
        for (const p of ["rare", "unlikely", "possible", "likely", "certain"]) {
          matrix[s][p] = 0;
        }
      }
      items.forEach((item) => { matrix[item.severity][item.probability]++; });

      const rows = Object.entries(matrix).map(([sev, probs]) => ({
        cells: [SEVERITY_LABELS[sev] || sev, ...Object.values(probs).map(String)],
        accentColor: RISK_COLORS[sev],
      }));

      const sections: PdfSection[] = [
        { type: "title", content: "Matriz de Risco — Severidade x Probabilidade" },
        { type: "kpis", kpis: [
          { label: "Total de Riscos", value: String(items.length), color: "#1a365d" },
          { label: "Criticos", value: String(items.filter((i) => i.riskLevel === "critical").length), color: "#ef4444" },
          { label: "Altos", value: String(items.filter((i) => i.riskLevel === "high").length), color: "#f97316" },
          { label: "Medios", value: String(items.filter((i) => i.riskLevel === "medium").length), color: "#f59e0b" },
        ]},
        { type: "table", columns: [
          { header: "Severidade", width: 90 },
          { header: "Rara", width: 70, align: "center" },
          { header: "Improvavel", width: 70, align: "center" },
          { header: "Possivel", width: 70, align: "center" },
          { header: "Provavel", width: 70, align: "center" },
          { header: "Certa", width: 70, align: "center" },
        ], rows },
      ];

      const reportData: GenericReportData = {
        reportTitle: "Matriz de Risco Psicossocial",
        reportSubtitle: "Analise Severidade x Probabilidade — NR-01",
        date: fmtDate(new Date()),
        sections,
      };

      const buffer = await generateGenericReportPdf(reportData, branding);
      return { filename: "matriz-risco.pdf", data: buffer.toString("base64") };
    }),

  // 2. Integracao PCMSO
  exportPcmsoIntegration: publicProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const recs = await db.select().from(pcmsoRecommendations)
        .where(eq(pcmsoRecommendations.tenantId, input.tenantId));

      const sections: PdfSection[] = [
        { type: "title", content: "Recomendacoes PCMSO — Integracao PGR" },
        { type: "text", content: `Total de recomendacoes: ${recs.length}` },
        { type: "table", columns: [
          { header: "Tipo de Exame", width: 110 },
          { header: "Frequencia", width: 80 },
          { header: "Populacao-Alvo", width: 120 },
          { header: "Base Medica", width: 120 },
          { header: "Prioridade", width: 65 },
        ], rows: recs.map((r) => ({
          cells: [r.examType, r.frequency || "—", r.targetPopulation || "—", r.medicalBasis || "—", RISK_LABELS[r.priority || "medium"] || "Medio"],
          accentColor: RISK_COLORS[r.priority || "medium"],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Integracao PGR + PCMSO",
        reportSubtitle: "Recomendacoes de Saude Ocupacional — NR-01 / NR-07",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "pcmso-integracao.pdf", data: buffer.toString("base64") };
    }),

  // 3. Dashboard Psicossocial
  exportPsychosocialDashboard: publicProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [report] = await db.select().from(copsoqReports)
        .where(eq(copsoqReports.tenantId, input.tenantId))
        .orderBy(desc(copsoqReports.generatedAt)).limit(1);

      if (!report) {
        const buffer = await generateGenericReportPdf({
          reportTitle: "Dashboard Psicossocial",
          date: fmtDate(new Date()),
          sections: [{ type: "text", content: "Nenhum relatorio COPSOQ disponivel para este tenant." }],
        }, branding);
        return { filename: "dashboard-psicossocial.pdf", data: buffer.toString("base64") };
      }

      const dims = [
        { label: "Demanda", score: report.averageDemandScore },
        { label: "Controle", score: report.averageControlScore },
        { label: "Apoio Social", score: report.averageSupportScore },
        { label: "Lideranca", score: report.averageLeadershipScore },
        { label: "Comunidade", score: report.averageCommunityScore },
        { label: "Significado", score: report.averageMeaningScore },
        { label: "Confianca", score: report.averageTrustScore },
        { label: "Justica", score: report.averageJusticeScore },
        { label: "Inseguranca", score: report.averageInsecurityScore },
        { label: "Saude Mental", score: report.averageMentalHealthScore },
        { label: "Burnout", score: report.averageBurnoutScore },
        { label: "Violencia", score: report.averageViolenceScore },
      ];

      const total = (report.lowRiskCount || 0) + (report.mediumRiskCount || 0) + (report.highRiskCount || 0) + (report.criticalRiskCount || 0);
      const sections: PdfSection[] = [
        { type: "title", content: "Resumo do Dashboard Psicossocial" },
        { type: "kpis", kpis: [
          { label: "Respondentes", value: String(report.totalRespondents || 0), color: "#1a365d" },
          { label: "Taxa de Resposta", value: `${report.responseRate || 0}%`, color: "#10b981" },
          { label: "Risco Alto/Critico", value: `${total > 0 ? Math.round(((report.highRiskCount || 0) + (report.criticalRiskCount || 0)) / total * 100) : 0}%`, color: "#ef4444" },
        ]},
        { type: "subtitle", content: "Scores por Dimensao COPSOQ-II" },
        { type: "table", columns: [
          { header: "Dimensao", width: 160 },
          { header: "Score (0-100)", width: 100, align: "center" },
          { header: "Nivel", width: 100, align: "center" },
        ], rows: dims.map((d) => {
          const s = d.score || 0;
          const level = s >= 70 ? "Bom" : s >= 40 ? "Atencao" : "Critico";
          const color = s >= 70 ? "#10b981" : s >= 40 ? "#f59e0b" : "#ef4444";
          return { cells: [d.label, String(s), level], accentColor: color };
        })},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Dashboard Psicossocial",
        reportSubtitle: "Analise COPSOQ-II — 12 Dimensoes",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "dashboard-psicossocial.pdf", data: buffer.toString("base64") };
    }),

  // 4. Tendencias de Avaliacao
  exportAssessmentTrends: publicProcedure
    .input(z.object({ tenantId: z.string(), periods: z.number().default(6) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const reports = await db.select().from(copsoqReports)
        .where(eq(copsoqReports.tenantId, input.tenantId))
        .orderBy(desc(copsoqReports.generatedAt)).limit(input.periods);

      const sorted = reports.reverse();
      const sections: PdfSection[] = [
        { type: "title", content: "Tendencias ao Longo do Tempo" },
        { type: "text", content: `Periodos analisados: ${sorted.length}` },
        { type: "table", columns: [
          { header: "Periodo", width: 80 },
          { header: "Respondentes", width: 70, align: "center" },
          { header: "Demanda", width: 55, align: "center" },
          { header: "Controle", width: 55, align: "center" },
          { header: "Apoio", width: 55, align: "center" },
          { header: "Burnout", width: 55, align: "center" },
          { header: "Saude Mental", width: 60, align: "center" },
        ], rows: sorted.map((r) => ({
          cells: [
            fmtDate(r.generatedAt),
            String(r.totalRespondents || 0),
            String(r.averageDemandScore || 0),
            String(r.averageControlScore || 0),
            String(r.averageSupportScore || 0),
            String(r.averageBurnoutScore || 0),
            String(r.averageMentalHealthScore || 0),
          ],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Tendencias de Avaliacao Psicossocial",
        reportSubtitle: "Evolucao Temporal dos Indicadores COPSOQ-II",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "tendencias-avaliacao.pdf", data: buffer.toString("base64") };
    }),

  // 5. Calculadora Financeira
  exportFinancialCalculator: publicProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [params] = await db.select().from(financialParameters)
        .where(eq(financialParameters.tenantId, input.tenantId)).limit(1);

      const fp = {
        averageSalary: params?.averageSalary || 500000,
        headcount: params?.headcount || 100,
        avgReplacementCost: params?.avgReplacementCost || 1500000,
        dailyAbsenteeismCost: params?.dailyAbsenteeismCost || 25000,
        finePerWorker: params?.finePerWorker || 670808,
        litigationAvgCost: params?.litigationAvgCost || 5000000,
      };

      const [indicators] = await db.select().from(mentalHealthIndicators)
        .where(eq(mentalHealthIndicators.tenantId, input.tenantId))
        .orderBy(desc(mentalHealthIndicators.createdAt)).limit(1);

      const absenteeismRate = (indicators?.absenteeismRate || 0) / 100;
      const turnoverRate = (indicators?.turnoverRate || 0) / 100;
      const burnoutCases = indicators?.burnoutCases || 0;
      const workDays = 252;

      const absentCost = Math.round((absenteeismRate / 100) * fp.headcount * fp.dailyAbsenteeismCost * workDays);
      const turnoverCost = Math.round((turnoverRate / 100) * fp.headcount * fp.avgReplacementCost);
      const fineRisk = fp.headcount * fp.finePerWorker;
      const litigationRisk = burnoutCases * fp.litigationAvgCost;
      const totalRisk = absentCost + turnoverCost + fineRisk + litigationRisk;

      const sections: PdfSection[] = [
        { type: "title", content: "Analise de Risco Financeiro" },
        { type: "kpis", kpis: [
          { label: "Risco Total Anual", value: fmtCurrency(totalRisk), color: "#ef4444" },
          { label: "Headcount", value: String(fp.headcount), color: "#1a365d" },
          { label: "Casos Burnout", value: String(burnoutCases), color: "#f97316" },
        ]},
        { type: "subtitle", content: "Detalhamento dos Custos" },
        { type: "table", columns: [
          { header: "Componente", width: 200 },
          { header: "Valor Estimado", width: 150, align: "right" },
        ], rows: [
          { cells: ["Absenteismo Anual", fmtCurrency(absentCost)] },
          { cells: ["Turnover Anual", fmtCurrency(turnoverCost)] },
          { cells: ["Risco de Multas (NR-01)", fmtCurrency(fineRisk)], accentColor: "#f97316" },
          { cells: ["Risco Litigioso (Burnout)", fmtCurrency(litigationRisk)], accentColor: "#ef4444" },
          { cells: ["TOTAL", fmtCurrency(totalRisk)], accentColor: "#1a365d" },
        ]},
        { type: "subtitle", content: "Parametros Utilizados" },
        { type: "table", columns: [
          { header: "Parametro", width: 200 },
          { header: "Valor", width: 150, align: "right" },
        ], rows: [
          { cells: ["Salario Medio", fmtCurrency(fp.averageSalary)] },
          { cells: ["Custo Reposicao", fmtCurrency(fp.avgReplacementCost)] },
          { cells: ["Custo Diario Absenteismo", fmtCurrency(fp.dailyAbsenteeismCost)] },
          { cells: ["Multa por Trabalhador", fmtCurrency(fp.finePerWorker)] },
          { cells: ["Custo Medio Litigio", fmtCurrency(fp.litigationAvgCost)] },
        ]},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Calculadora de Risco Financeiro",
        reportSubtitle: "Impacto Economico da Nao-Conformidade NR-01",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "risco-financeiro.pdf", data: buffer.toString("base64") };
    }),

  // 6. Cronograma de Compliance
  exportComplianceTimeline: publicProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const milestones = await db.select().from(complianceMilestones)
        .where(eq(complianceMilestones.tenantId, input.tenantId))
        .orderBy(complianceMilestones.order);

      const completed = milestones.filter((m) => m.status === "completed").length;
      const total = milestones.length;

      const sections: PdfSection[] = [
        { type: "title", content: "Cronograma de Adequacao NR-01" },
        { type: "kpis", kpis: [
          { label: "Total Etapas", value: String(total), color: "#1a365d" },
          { label: "Concluidas", value: String(completed), color: "#10b981" },
          { label: "Progresso", value: `${total > 0 ? Math.round((completed / total) * 100) : 0}%`, color: "#3b82f6" },
        ]},
        { type: "table", columns: [
          { header: "#", width: 30, align: "center" },
          { header: "Etapa", width: 180 },
          { header: "Categoria", width: 90 },
          { header: "Prazo", width: 80 },
          { header: "Conclusao", width: 80 },
          { header: "Status", width: 80, align: "center" },
        ], rows: milestones.map((m, i) => {
          const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluido", overdue: "Atrasado" };
          const statusColors: Record<string, string> = { pending: "#6b7280", in_progress: "#3b82f6", completed: "#10b981", overdue: "#ef4444" };
          return {
            cells: [String(i + 1), m.title, m.category, fmtDate(m.targetDate), fmtDate(m.completedDate), statusLabels[m.status] || m.status],
            accentColor: statusColors[m.status],
          };
        })},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Cronograma de Adequacao NR-01",
        reportSubtitle: "Marcos e Prazos de Conformidade",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "cronograma-compliance.pdf", data: buffer.toString("base64") };
    }),

  // 7. Checklist de Conformidade
  exportComplianceChecklist: publicProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const items = await db.select().from(complianceChecklist)
        .where(eq(complianceChecklist.tenantId, input.tenantId));

      const compliant = items.filter((i) => i.status === "compliant").length;
      const partial = items.filter((i) => i.status === "partial").length;
      const nonCompliant = items.filter((i) => i.status === "non_compliant").length;
      const total = items.length;
      const score = total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;

      const statusLabels: Record<string, string> = { compliant: "Conforme", partial: "Parcial", non_compliant: "Nao Conforme", not_applicable: "N/A" };
      const statusColors: Record<string, string> = { compliant: "#10b981", partial: "#f59e0b", non_compliant: "#ef4444", not_applicable: "#6b7280" };

      const sections: PdfSection[] = [
        { type: "title", content: "Checklist de Conformidade Legal" },
        { type: "kpis", kpis: [
          { label: "Score de Conformidade", value: `${score}%`, color: score >= 70 ? "#10b981" : "#ef4444" },
          { label: "Conformes", value: String(compliant), color: "#10b981" },
          { label: "Parciais", value: String(partial), color: "#f59e0b" },
          { label: "Nao Conformes", value: String(nonCompliant), color: "#ef4444" },
        ]},
        { type: "table", columns: [
          { header: "Codigo", width: 80 },
          { header: "Requisito", width: 200 },
          { header: "Categoria", width: 90 },
          { header: "Status", width: 80, align: "center" },
        ], rows: items.map((item) => ({
          cells: [item.requirementCode, item.requirementText, item.category, statusLabels[item.status] || item.status],
          accentColor: statusColors[item.status],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatorio de Conformidade Legal",
        reportSubtitle: "Checklist NR-01 — Requisitos Regulatorios",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "checklist-conformidade.pdf", data: buffer.toString("base64") };
    }),

  // 8. Certificado de Conformidade
  exportComplianceCertificate: publicProcedure
    .input(z.object({ tenantId: z.string(), certificateId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const certs = await db.select().from(complianceCertificates)
        .where(input.certificateId
          ? and(eq(complianceCertificates.tenantId, input.tenantId), eq(complianceCertificates.id, input.certificateId))
          : eq(complianceCertificates.tenantId, input.tenantId))
        .orderBy(desc(complianceCertificates.issuedAt)).limit(1);

      const cert = certs[0];
      if (!cert) {
        const buffer = await generateGenericReportPdf({
          reportTitle: "Certificado de Conformidade",
          date: fmtDate(new Date()),
          sections: [{ type: "text", content: "Nenhum certificado disponivel para este tenant." }],
        }, branding);
        return { filename: "certificado.pdf", data: buffer.toString("base64") };
      }

      const sections: PdfSection[] = [
        { type: "spacer" },
        { type: "title", content: "CERTIFICADO DE CONFORMIDADE NR-01" },
        { type: "spacer" },
        { type: "text", content: `Certificamos que a organizacao atende aos requisitos da Norma Regulamentadora NR-01 para gestao de riscos psicossociais ocupacionais.` },
        { type: "kpis", kpis: [
          { label: "Numero do Certificado", value: cert.certificateNumber, color: "#1a365d" },
          { label: "Score de Conformidade", value: `${cert.complianceScore}%`, color: cert.complianceScore >= 70 ? "#10b981" : "#ef4444" },
          { label: "Status", value: cert.status === "active" ? "Ativo" : cert.status === "expired" ? "Expirado" : "Revogado", color: cert.status === "active" ? "#10b981" : "#ef4444" },
        ]},
        { type: "divider" },
        { type: "table", columns: [
          { header: "Campo", width: 180 },
          { header: "Valor", width: 300 },
        ], rows: [
          { cells: ["Emitido em", fmtDate(cert.issuedAt)] },
          { cells: ["Valido ate", fmtDate(cert.validUntil)] },
          { cells: ["Emitido por", cert.issuedBy || "—"] },
        ]},
        { type: "spacer" },
        { type: "signature", signatureName: cert.issuedBy || "Responsavel Tecnico", signatureRole: "Auditor de Conformidade NR-01" },
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Certificado de Conformidade NR-01",
        reportSubtitle: "Gestao de Riscos Psicossociais Ocupacionais",
        date: fmtDate(cert.issuedAt),
        sections,
      }, branding);
      return { filename: `certificado-${cert.certificateNumber}.pdf`, data: buffer.toString("base64") };
    }),

  // 9. Laudo Tecnico
  exportLaudoTecnico: publicProcedure
    .input(z.object({ tenantId: z.string(), documentId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const docs = await db.select().from(complianceDocuments)
        .where(input.documentId
          ? and(eq(complianceDocuments.tenantId, input.tenantId), eq(complianceDocuments.id, input.documentId))
          : and(eq(complianceDocuments.tenantId, input.tenantId), eq(complianceDocuments.documentType, "laudo_tecnico")))
        .orderBy(desc(complianceDocuments.createdAt)).limit(1);

      const doc = docs[0];
      if (!doc) {
        const buffer = await generateGenericReportPdf({
          reportTitle: "Laudo Tecnico",
          date: fmtDate(new Date()),
          sections: [{ type: "text", content: "Nenhum laudo tecnico disponivel." }],
        }, branding);
        return { filename: "laudo-tecnico.pdf", data: buffer.toString("base64") };
      }

      const sections: PdfSection[] = [
        { type: "title", content: doc.title },
        { type: "text", content: doc.description || "" },
        { type: "divider" },
        { type: "table", columns: [
          { header: "Campo", width: 150 },
          { header: "Valor", width: 340 },
        ], rows: [
          { cells: ["Tipo", "Laudo Tecnico"] },
          { cells: ["Versao", doc.version || "1.0"] },
          { cells: ["Valido de", fmtDate(doc.validFrom)] },
          { cells: ["Valido ate", fmtDate(doc.validUntil)] },
          { cells: ["Status", doc.status] },
          { cells: ["Profissional", doc.professionalName || "—"] },
          { cells: ["Registro", doc.professionalRegistry || "—"] },
        ]},
      ];

      // Append content structure if available
      if (doc.contentStructure && Array.isArray(doc.contentStructure)) {
        sections.push({ type: "divider" });
        for (const section of doc.contentStructure as Array<{ title?: string; content?: string }>) {
          if (section.title) sections.push({ type: "subtitle", content: section.title });
          if (section.content) sections.push({ type: "text", content: section.content });
        }
      }

      sections.push(
        { type: "spacer" },
        { type: "signature", signatureName: doc.professionalName || "Responsavel Tecnico", signatureRole: "Profissional de SST", signatureRegistry: doc.professionalRegistry || undefined },
      );

      const buffer = await generateGenericReportPdf({
        reportTitle: "Laudo Tecnico — Riscos Psicossociais",
        reportSubtitle: "Conforme NR-01 item 1.5.7",
        date: fmtDate(doc.validFrom),
        sections,
      }, branding);
      return { filename: "laudo-tecnico.pdf", data: buffer.toString("base64") };
    }),

  // 10. Benchmark Comparativo
  exportBenchmark: publicProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const benchmarks = await db.select().from(benchmarkData);
      const [report] = await db.select().from(copsoqReports)
        .where(eq(copsoqReports.tenantId, input.tenantId))
        .orderBy(desc(copsoqReports.generatedAt)).limit(1);

      const dimKeys = [
        { key: "Demanda", tenant: report?.averageDemandScore, benchFn: (b: any) => b.avgDemandScore },
        { key: "Controle", tenant: report?.averageControlScore, benchFn: (b: any) => b.avgControlScore },
        { key: "Apoio Social", tenant: report?.averageSupportScore, benchFn: (b: any) => b.avgSupportScore },
        { key: "Lideranca", tenant: report?.averageLeadershipScore, benchFn: (b: any) => b.avgLeadershipScore },
        { key: "Burnout", tenant: report?.averageBurnoutScore, benchFn: (b: any) => b.avgBurnoutScore },
        { key: "Saude Mental", tenant: report?.averageMentalHealthScore, benchFn: (b: any) => b.avgMentalHealthScore },
      ];

      const nationalBench = benchmarks.find((b) => b.dataSource === "national");

      const sections: PdfSection[] = [
        { type: "title", content: "Comparativo com Benchmarks" },
        { type: "table", columns: [
          { header: "Dimensao", width: 120 },
          { header: "Sua Empresa", width: 90, align: "center" },
          { header: "Media Nacional", width: 90, align: "center" },
          { header: "Diferenca", width: 90, align: "center" },
        ], rows: dimKeys.map((d) => {
          const tenantVal = d.tenant || 0;
          const benchVal = nationalBench ? d.benchFn(nationalBench) || 0 : 0;
          const diff = tenantVal - benchVal;
          return {
            cells: [d.key, String(tenantVal), String(benchVal), `${diff >= 0 ? "+" : ""}${diff}`],
            accentColor: diff >= 0 ? "#10b981" : "#ef4444",
          };
        })},
      ];

      if (benchmarks.length > 1) {
        sections.push(
          { type: "subtitle", content: "Fontes de Benchmark Disponiveis" },
          { type: "table", columns: [
            { header: "Fonte", width: 100 },
            { header: "Setor", width: 150 },
            { header: "Regiao", width: 100 },
            { header: "Periodo", width: 70 },
            { header: "Amostra", width: 70, align: "center" },
          ], rows: benchmarks.map((b) => ({
            cells: [b.dataSource, b.sectorName || "—", b.region || "—", b.period || "—", String(b.sampleSize || 0)],
          }))},
        );
      }

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatorio Comparativo — Benchmark",
        reportSubtitle: "Comparacao com Dados Nacionais e Setoriais",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "benchmark-comparativo.pdf", data: buffer.toString("base64") };
    }),

  // 11. Pesquisa de Clima
  exportClimateSurvey: publicProcedure
    .input(z.object({ tenantId: z.string(), surveyId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [survey] = await db.select().from(psychosocialSurveys)
        .where(and(eq(psychosocialSurveys.tenantId, input.tenantId), eq(psychosocialSurveys.id, input.surveyId)));

      if (!survey) throw new TRPCError({ code: "NOT_FOUND", message: "Pesquisa nao encontrada" });

      const responses = await db.select().from(surveyResponses)
        .where(and(eq(surveyResponses.tenantId, input.tenantId), eq(surveyResponses.surveyId, input.surveyId)));

      const totalResponses = responses.length;
      const avgScore = totalResponses > 0 ? Math.round(responses.reduce((sum, r) => sum + (r.score || 0), 0) / totalResponses) : 0;

      const riskDist = { low: 0, medium: 0, high: 0, critical: 0 };
      responses.forEach((r) => { if (r.riskLevel) riskDist[r.riskLevel as keyof typeof riskDist]++; });

      const sections: PdfSection[] = [
        { type: "title", content: survey.title },
        { type: "text", content: survey.description || "" },
        { type: "kpis", kpis: [
          { label: "Total Respostas", value: String(totalResponses), color: "#1a365d" },
          { label: "Score Medio", value: String(avgScore), color: avgScore >= 70 ? "#10b981" : "#f59e0b" },
          { label: "Tipo", value: survey.surveyType, color: "#6b7280" },
        ]},
        { type: "subtitle", content: "Distribuicao de Risco" },
        { type: "table", columns: [
          { header: "Nivel de Risco", width: 150 },
          { header: "Quantidade", width: 100, align: "center" },
          { header: "Percentual", width: 100, align: "center" },
        ], rows: Object.entries(riskDist).map(([level, count]) => ({
          cells: [RISK_LABELS[level] || level, String(count), `${totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0}%`],
          accentColor: RISK_COLORS[level],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatorio de Pesquisa de Clima",
        reportSubtitle: survey.title,
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: `pesquisa-clima-${input.surveyId}.pdf`, data: buffer.toString("base64") };
    }),

  // 12. Relatorio de Treinamento
  exportTrainingReport: publicProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const modules = await db.select().from(trainingModules)
        .where(eq(trainingModules.tenantId, input.tenantId));

      const progress = await db.select().from(trainingProgress)
        .where(eq(trainingProgress.tenantId, input.tenantId));

      const totalModules = modules.length;
      const completedProgress = progress.filter((p) => p.status === "completed").length;
      const totalProgress = progress.length;
      const completionRate = totalProgress > 0 ? Math.round((completedProgress / totalProgress) * 100) : 0;
      const avgScore = completedProgress > 0
        ? Math.round(progress.filter((p) => p.quizScore !== null).reduce((sum, p) => sum + (p.quizScore || 0), 0) / Math.max(1, progress.filter((p) => p.quizScore !== null).length))
        : 0;

      const sections: PdfSection[] = [
        { type: "title", content: "Progresso de Treinamento" },
        { type: "kpis", kpis: [
          { label: "Modulos", value: String(totalModules), color: "#1a365d" },
          { label: "Taxa Conclusao", value: `${completionRate}%`, color: completionRate >= 70 ? "#10b981" : "#f59e0b" },
          { label: "Nota Media Quiz", value: String(avgScore), color: avgScore >= 70 ? "#10b981" : "#ef4444" },
        ]},
        { type: "subtitle", content: "Modulos de Treinamento" },
        { type: "table", columns: [
          { header: "Modulo", width: 200 },
          { header: "Duracao (min)", width: 80, align: "center" },
          { header: "Nota Minima", width: 80, align: "center" },
          { header: "Inscritos", width: 70, align: "center" },
          { header: "Concluidos", width: 70, align: "center" },
        ], rows: modules.map((m) => {
          const modProgress = progress.filter((p) => p.moduleId === m.id);
          const modCompleted = modProgress.filter((p) => p.status === "completed").length;
          return {
            cells: [m.title, String(m.duration || 0), String(m.passingScore || 70), String(modProgress.length), String(modCompleted)],
            accentColor: modCompleted === modProgress.length && modProgress.length > 0 ? "#10b981" : "#f59e0b",
          };
        })},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatorio de Treinamento Digital",
        reportSubtitle: "Capacitacao em Riscos Psicossociais — NR-01",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "treinamento.pdf", data: buffer.toString("base64") };
    }),

  // 13. Denuncias Anonimas (sem PII)
  exportAnonymousReports: publicProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const reports = await db.select().from(anonymousReports)
        .where(eq(anonymousReports.tenantId, input.tenantId));

      const catCounts: Record<string, number> = {};
      const sevCounts: Record<string, number> = {};
      const statusCounts: Record<string, number> = {};

      reports.forEach((r) => {
        catCounts[r.category] = (catCounts[r.category] || 0) + 1;
        sevCounts[r.severity] = (sevCounts[r.severity] || 0) + 1;
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      });

      const catLabels: Record<string, string> = { harassment: "Assedio", discrimination: "Discriminacao", violence: "Violencia", workload: "Sobrecarga", leadership: "Lideranca", other: "Outros" };
      const statusLabels: Record<string, string> = { received: "Recebido", investigating: "Em Investigacao", resolved: "Resolvido", dismissed: "Descartado" };

      const sections: PdfSection[] = [
        { type: "title", content: "Resumo de Denuncias Anonimas" },
        { type: "text", content: "Este relatorio apresenta dados agregados sem informacoes pessoais identificaveis (PII)." },
        { type: "kpis", kpis: [
          { label: "Total Denuncias", value: String(reports.length), color: "#1a365d" },
          { label: "Resolvidas", value: String(statusCounts["resolved"] || 0), color: "#10b981" },
          { label: "Em Investigacao", value: String(statusCounts["investigating"] || 0), color: "#f59e0b" },
        ]},
        { type: "subtitle", content: "Por Categoria" },
        { type: "table", columns: [
          { header: "Categoria", width: 180 },
          { header: "Quantidade", width: 100, align: "center" },
          { header: "Percentual", width: 100, align: "center" },
        ], rows: Object.entries(catCounts).map(([cat, count]) => ({
          cells: [catLabels[cat] || cat, String(count), `${reports.length > 0 ? Math.round((count / reports.length) * 100) : 0}%`],
        }))},
        { type: "subtitle", content: "Por Severidade" },
        { type: "table", columns: [
          { header: "Severidade", width: 180 },
          { header: "Quantidade", width: 100, align: "center" },
        ], rows: Object.entries(sevCounts).map(([sev, count]) => ({
          cells: [RISK_LABELS[sev] || sev, String(count)],
          accentColor: RISK_COLORS[sev],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Canal de Denuncia Anonima — Relatorio",
        reportSubtitle: "Dados Agregados (Sem PII)",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "denuncias-anonimas.pdf", data: buffer.toString("base64") };
    }),

  // 14. Alertas de Prazos
  exportDeadlineAlerts: publicProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const alerts = await db.select().from(deadlineAlerts)
        .where(eq(deadlineAlerts.tenantId, input.tenantId))
        .orderBy(deadlineAlerts.alertDate);

      const pending = alerts.filter((a) => a.status === "pending").length;
      const sent = alerts.filter((a) => a.status === "sent").length;

      const statusLabels: Record<string, string> = { pending: "Pendente", sent: "Enviado", acknowledged: "Confirmado", expired: "Expirado" };
      const statusColors: Record<string, string> = { pending: "#f59e0b", sent: "#3b82f6", acknowledged: "#10b981", expired: "#6b7280" };

      const sections: PdfSection[] = [
        { type: "title", content: "Alertas de Vencimento e Prazos" },
        { type: "kpis", kpis: [
          { label: "Total Alertas", value: String(alerts.length), color: "#1a365d" },
          { label: "Pendentes", value: String(pending), color: "#f59e0b" },
          { label: "Enviados", value: String(sent), color: "#3b82f6" },
        ]},
        { type: "table", columns: [
          { header: "Data", width: 80 },
          { header: "Tipo Entidade", width: 90 },
          { header: "Mensagem", width: 200 },
          { header: "Canal", width: 60, align: "center" },
          { header: "Status", width: 70, align: "center" },
        ], rows: alerts.map((a) => ({
          cells: [fmtDate(a.alertDate), a.entityType, a.message, a.channel, statusLabels[a.status] || a.status],
          accentColor: statusColors[a.status],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatorio de Alertas de Prazos",
        reportSubtitle: "Monitoramento de Vencimentos NR-01",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "alertas-prazos.pdf", data: buffer.toString("base64") };
    }),

  // 15. Avaliacao Ergonomica
  exportErgonomicAssessment: publicProcedure
    .input(z.object({ tenantId: z.string(), assessmentId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const [assessment] = await db.select().from(ergonomicAssessments)
        .where(and(eq(ergonomicAssessments.tenantId, input.tenantId), eq(ergonomicAssessments.id, input.assessmentId)));

      if (!assessment) throw new TRPCError({ code: "NOT_FOUND", message: "Avaliacao ergonomica nao encontrada" });

      const items = await db.select().from(ergonomicItems)
        .where(eq(ergonomicItems.assessmentId, input.assessmentId));

      const riskLabels: Record<string, string> = { acceptable: "Aceitavel", moderate: "Moderado", high: "Alto", critical: "Critico" };
      const riskColors: Record<string, string> = { acceptable: "#10b981", moderate: "#f59e0b", high: "#f97316", critical: "#ef4444" };
      const catLabels: Record<string, string> = { workstation: "Posto de Trabalho", posture: "Postura", repetition: "Repeticao", lighting: "Iluminacao", noise: "Ruido", organization: "Organizacao", psychosocial: "Psicossocial" };

      const sections: PdfSection[] = [
        { type: "title", content: assessment.title },
        { type: "text", content: assessment.methodology || "" },
        { type: "kpis", kpis: [
          { label: "Total Itens", value: String(items.length), color: "#1a365d" },
          { label: "Risco Geral", value: riskLabels[assessment.overallRiskLevel || "acceptable"] || "—", color: riskColors[assessment.overallRiskLevel || "acceptable"] || "#6b7280" },
          { label: "Avaliador", value: assessment.assessorName || "—", color: "#6b7280" },
        ]},
        { type: "table", columns: [
          { header: "Categoria", width: 90 },
          { header: "Fator", width: 130 },
          { header: "Risco", width: 70, align: "center" },
          { header: "Observacao", width: 110 },
          { header: "Recomendacao", width: 110 },
        ], rows: items.map((item) => ({
          cells: [catLabels[item.category] || item.category, item.factor, riskLabels[item.riskLevel] || item.riskLevel, item.observation || "—", item.recommendation || "—"],
          accentColor: riskColors[item.riskLevel],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Avaliacao Ergonomica Preliminar — AEP",
        reportSubtitle: "Conforme NR-17 — Analise Ergonomica do Trabalho",
        date: fmtDate(assessment.assessmentDate),
        sections,
      }, branding);
      return { filename: `avaliacao-ergonomica-${input.assessmentId}.pdf`, data: buffer.toString("base64") };
    }),

  // 16. Relatorio eSocial
  exportEsocialReport: publicProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const exports = await db.select().from(esocialExports)
        .where(eq(esocialExports.tenantId, input.tenantId))
        .orderBy(desc(esocialExports.createdAt));

      const statusLabels: Record<string, string> = { draft: "Rascunho", validated: "Validado", submitted: "Enviado", accepted: "Aceito", rejected: "Rejeitado" };
      const statusColors: Record<string, string> = { draft: "#6b7280", validated: "#3b82f6", submitted: "#f59e0b", accepted: "#10b981", rejected: "#ef4444" };

      const accepted = exports.filter((e) => e.status === "accepted").length;

      const sections: PdfSection[] = [
        { type: "title", content: "Historico de Exportacoes eSocial" },
        { type: "kpis", kpis: [
          { label: "Total Exportacoes", value: String(exports.length), color: "#1a365d" },
          { label: "Aceitas", value: String(accepted), color: "#10b981" },
          { label: "Rejeitadas", value: String(exports.filter((e) => e.status === "rejected").length), color: "#ef4444" },
        ]},
        { type: "table", columns: [
          { header: "Evento", width: 70 },
          { header: "Status", width: 80, align: "center" },
          { header: "Enviado em", width: 90 },
          { header: "Codigo Resposta", width: 90 },
          { header: "Mensagem", width: 180 },
        ], rows: exports.map((e) => ({
          cells: [e.eventType, statusLabels[e.status] || e.status, fmtDate(e.submittedAt), e.responseCode || "—", e.responseMessage || "—"],
          accentColor: statusColors[e.status],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatorio de Exportacao eSocial",
        reportSubtitle: "Eventos S-2220 e S-2240",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "esocial-exportacoes.pdf", data: buffer.toString("base64") };
    }),

  // 17. Relatorio Executivo
  exportExecutiveReport: publicProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Dashboard summary
      const [latestReport] = await db.select().from(copsoqReports)
        .where(eq(copsoqReports.tenantId, input.tenantId))
        .orderBy(desc(copsoqReports.generatedAt)).limit(1);

      // Financial calculation
      const [params] = await db.select().from(financialParameters)
        .where(eq(financialParameters.tenantId, input.tenantId)).limit(1);

      const fp = {
        headcount: params?.headcount || 100,
        finePerWorker: params?.finePerWorker || 670808,
        litigationAvgCost: params?.litigationAvgCost || 5000000,
        dailyAbsenteeismCost: params?.dailyAbsenteeismCost || 25000,
        avgReplacementCost: params?.avgReplacementCost || 1500000,
      };

      const [indicators] = await db.select().from(mentalHealthIndicators)
        .where(eq(mentalHealthIndicators.tenantId, input.tenantId))
        .orderBy(desc(mentalHealthIndicators.createdAt)).limit(1);

      const fineRisk = fp.headcount * fp.finePerWorker;
      const burnoutCases = indicators?.burnoutCases || 0;
      const litigationRisk = burnoutCases * fp.litigationAvgCost;

      // Compliance score
      const checklistItems = await db.select().from(complianceChecklist)
        .where(eq(complianceChecklist.tenantId, input.tenantId));

      const compliant = checklistItems.filter((i) => i.status === "compliant").length;
      const partial = checklistItems.filter((i) => i.status === "partial").length;
      const totalChecklist = checklistItems.length;
      const complianceScore = totalChecklist > 0 ? Math.round(((compliant + partial * 0.5) / totalChecklist) * 100) : 0;

      // Action plans
      const plans = await db.select({
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`SUM(CASE WHEN ${actionPlans.status} = 'completed' THEN 1 ELSE 0 END)`,
      }).from(actionPlans).where(eq(actionPlans.tenantId, input.tenantId));

      const apTotal = plans[0]?.total || 0;
      const apCompleted = plans[0]?.completed || 0;

      const sections: PdfSection[] = [
        { type: "title", content: "1. Resumo Psicossocial" },
        ...(latestReport ? [
          { type: "kpis" as const, kpis: [
            { label: "Respondentes", value: String(latestReport.totalRespondents || 0), color: "#1a365d" },
            { label: "Taxa Resposta", value: `${latestReport.responseRate || 0}%`, color: "#10b981" },
            { label: "Risco Critico", value: String(latestReport.criticalRiskCount || 0), color: "#ef4444" },
            { label: "Risco Alto", value: String(latestReport.highRiskCount || 0), color: "#f97316" },
          ]},
        ] : [
          { type: "text" as const, content: "Nenhuma avaliacao COPSOQ disponivel." },
        ]),
        { type: "divider" },
        { type: "title", content: "2. Conformidade Legal" },
        { type: "kpis", kpis: [
          { label: "Score Conformidade", value: `${complianceScore}%`, color: complianceScore >= 70 ? "#10b981" : "#ef4444" },
          { label: "Requisitos Atendidos", value: `${compliant}/${totalChecklist}`, color: "#1a365d" },
          { label: "Planos de Acao", value: `${apCompleted}/${apTotal} concluidos`, color: "#3b82f6" },
        ]},
        { type: "divider" },
        { type: "title", content: "3. Impacto Financeiro" },
        { type: "kpis", kpis: [
          { label: "Risco de Multas", value: fmtCurrency(fineRisk), color: "#f97316" },
          { label: "Risco Litigioso", value: fmtCurrency(litigationRisk), color: "#ef4444" },
          { label: "Casos Burnout", value: String(burnoutCases), color: "#f59e0b" },
        ]},
        { type: "divider" },
        { type: "title", content: "4. Indicadores de Saude" },
        { type: "table", columns: [
          { header: "Indicador", width: 200 },
          { header: "Valor", width: 150, align: "center" },
        ], rows: [
          { cells: ["Taxa de Absenteismo", `${((indicators?.absenteeismRate || 0) / 100).toFixed(2)}%`] },
          { cells: ["Taxa de Turnover", `${((indicators?.turnoverRate || 0) / 100).toFixed(2)}%`] },
          { cells: ["Nivel de Estresse", `${indicators?.stressLevel || 0}/100`] },
          { cells: ["Engajamento", `${indicators?.engagementScore || 0}/100`] },
          { cells: ["Satisfacao", `${indicators?.satisfactionScore || 0}/100`] },
        ]},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatorio Executivo — Gestao Psicossocial",
        reportSubtitle: "Visao Consolidada NR-01",
        date: fmtDate(new Date()),
        sections,
      }, branding);
      return { filename: "relatorio-executivo.pdf", data: buffer.toString("base64") };
    }),
});
