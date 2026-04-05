import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tenantProcedure, router } from "../_core/trpc";
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
  resultDisseminations,
  copsoqAssessments,
  copsoqResponses,
} from "../../drizzle/schema_nr01";
import { tenants } from "../../drizzle/schema";
import { interventionPrograms } from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

const SEVERITY_LABELS: Record<string, string> = { low: "Leve", medium: "Moderada", high: "Grave", critical: "Gravíssima" };
const PROBABILITY_LABELS: Record<string, string> = { rare: "Rara", unlikely: "Improvável", possible: "Possível", likely: "Provável", certain: "Certa" };
const RISK_LABELS: Record<string, string> = { low: "Baixo", medium: "Médio", high: "Alto", critical: "Crítico" };
const RISK_COLORS: Record<string, string> = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
const PRIORITY_LABELS: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente", critical: "Crítica" };

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
  exportRiskMatrix: tenantProcedure
    .input(z.object({ tenantId: z.string().optional(), assessmentId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const assessments = await db.select().from(riskAssessments)
        .where(input.assessmentId
          ? and(eq(riskAssessments.tenantId, ctx.tenantId!), eq(riskAssessments.id, input.assessmentId))
          : eq(riskAssessments.tenantId, ctx.tenantId!));

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
          { label: "Críticos", value: String(items.filter((i) => i.riskLevel === "critical").length), color: "#ef4444" },
          { label: "Altos", value: String(items.filter((i) => i.riskLevel === "high").length), color: "#f97316" },
          { label: "Médios", value: String(items.filter((i) => i.riskLevel === "medium").length), color: "#f59e0b" },
        ]},
        { type: "table", columns: [
          { header: "Severidade", width: 90 },
          { header: "Rara", width: 70, align: "center" },
          { header: "Improvável", width: 70, align: "center" },
          { header: "Possível", width: 70, align: "center" },
          { header: "Provável", width: 70, align: "center" },
          { header: "Certa", width: 70, align: "center" },
        ], rows },
      ];

      const reportData: GenericReportData = {
        reportTitle: "Matriz de Risco Psicossocial",
        reportSubtitle: "Análise Severidade x Probabilidade — NR-01",
        date: fmtDate(new Date()),
        sections,
      };

      const buffer = await generateGenericReportPdf(reportData, branding, undefined, ctx.tenantId!);
      return { filename: "matriz-risco.pdf", data: buffer.toString("base64") };
    }),

  // 2. Integracao PCMSO
  exportPcmsoIntegration: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const recs = await db.select().from(pcmsoRecommendations)
        .where(eq(pcmsoRecommendations.tenantId, ctx.tenantId!));

      const sections: PdfSection[] = [
        { type: "title", content: "Recomendações PCMSO — Integração PGR" },
        { type: "text", content: `Total de recomendações: ${recs.length}` },
        { type: "table", columns: [
          { header: "Tipo de Exame", width: 110 },
          { header: "Frequência", width: 80 },
          { header: "População-Alvo", width: 120 },
          { header: "Base Médica", width: 120 },
          { header: "Prioridade", width: 65 },
        ], rows: recs.map((r) => ({
          cells: [r.examType, r.frequency || "—", r.targetPopulation || "—", r.medicalBasis || "—", RISK_LABELS[r.priority || "medium"] || "Médio"],
          accentColor: RISK_COLORS[r.priority || "medium"],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Integração PGR + PCMSO",
        reportSubtitle: "Recomendações de Saúde Ocupacional — NR-01 / NR-07",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "pcmso-integracao.pdf", data: buffer.toString("base64") };
    }),

  // 3. Dashboard Psicossocial
  exportPsychosocialDashboard: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [report] = await db.select().from(copsoqReports)
        .where(eq(copsoqReports.tenantId, ctx.tenantId!))
        .orderBy(desc(copsoqReports.generatedAt)).limit(1);

      if (!report) {
        const buffer = await generateGenericReportPdf({
          reportTitle: "Dashboard Psicossocial",
          date: fmtDate(new Date()),
          sections: [{ type: "text", content: "Nenhum relatório COPSOQ disponível para este tenant." }],
        }, branding, undefined, ctx.tenantId);
        return { filename: "dashboard-psicossocial.pdf", data: buffer.toString("base64") };
      }

      const dims = [
        { label: "Demanda", score: report.averageDemandScore },
        { label: "Controle", score: report.averageControlScore },
        { label: "Apoio Social", score: report.averageSupportScore },
        { label: "Liderança", score: report.averageLeadershipScore },
        { label: "Comunidade", score: report.averageCommunityScore },
        { label: "Significado", score: report.averageMeaningScore },
        { label: "Confiança", score: report.averageTrustScore },
        { label: "Justiça", score: report.averageJusticeScore },
        { label: "Insegurança", score: report.averageInsecurityScore },
        { label: "Saúde Mental", score: report.averageMentalHealthScore },
        { label: "Burnout", score: report.averageBurnoutScore },
        { label: "Violência", score: report.averageViolenceScore },
      ];

      const total = (report.lowRiskCount || 0) + (report.mediumRiskCount || 0) + (report.highRiskCount || 0) + (report.criticalRiskCount || 0);
      const sections: PdfSection[] = [
        { type: "title", content: "Resumo do Dashboard Psicossocial" },
        { type: "kpis", kpis: [
          { label: "Respondentes", value: String(report.totalRespondents || 0), color: "#1a365d" },
          { label: "Taxa de Resposta", value: `${report.responseRate || 0}%`, color: "#10b981" },
          { label: "Risco Alto/Crítico", value: `${total > 0 ? Math.round(((report.highRiskCount || 0) + (report.criticalRiskCount || 0)) / total * 100) : 0}%`, color: "#ef4444" },
        ]},
        { type: "subtitle", content: "Scores por Dimensão COPSOQ-II" },
        { type: "table", columns: [
          { header: "Dimensão", width: 160 },
          { header: "Score (0-100)", width: 100, align: "center" },
          { header: "Nível", width: 100, align: "center" },
        ], rows: dims.map((d) => {
          const s = d.score || 0;
          const level = s >= 70 ? "Bom" : s >= 40 ? "Atenção" : "Crítico";
          const color = s >= 70 ? "#10b981" : s >= 40 ? "#f59e0b" : "#ef4444";
          return { cells: [d.label, String(s), level], accentColor: color };
        })},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Dashboard Psicossocial",
        reportSubtitle: "Análise COPSOQ-II — 12 Dimensões",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "dashboard-psicossocial.pdf", data: buffer.toString("base64") };
    }),

  // 4. Tendencias de Avaliacao
  exportAssessmentTrends: tenantProcedure
    .input(z.object({ tenantId: z.string().optional(), periods: z.number().default(6) }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const reports = await db.select().from(copsoqReports)
        .where(eq(copsoqReports.tenantId, ctx.tenantId!))
        .orderBy(desc(copsoqReports.generatedAt)).limit(input.periods);

      const sorted = reports.reverse();
      const sections: PdfSection[] = [
        { type: "title", content: "Tendências ao Longo do Tempo" },
        { type: "text", content: `Períodos analisados: ${sorted.length}` },
        { type: "table", columns: [
          { header: "Período", width: 80 },
          { header: "Respondentes", width: 70, align: "center" },
          { header: "Demanda", width: 55, align: "center" },
          { header: "Controle", width: 55, align: "center" },
          { header: "Apoio", width: 55, align: "center" },
          { header: "Burnout", width: 55, align: "center" },
          { header: "Saúde Mental", width: 60, align: "center" },
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
        reportTitle: "Tendências de Avaliação Psicossocial",
        reportSubtitle: "Evolução Temporal dos Indicadores COPSOQ-II",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "tendencias-avaliacao.pdf", data: buffer.toString("base64") };
    }),

  // 5. Calculadora Financeira
  exportFinancialCalculator: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [params] = await db.select().from(financialParameters)
        .where(eq(financialParameters.tenantId, ctx.tenantId!)).limit(1);

      const fp = {
        averageSalary: params?.averageSalary || 500000,
        headcount: params?.headcount || 100,
        avgReplacementCost: params?.avgReplacementCost || 1500000,
        dailyAbsenteeismCost: params?.dailyAbsenteeismCost || 25000,
        finePerWorker: params?.finePerWorker || 670808,
        litigationAvgCost: params?.litigationAvgCost || 5000000,
      };

      const [indicators] = await db.select().from(mentalHealthIndicators)
        .where(eq(mentalHealthIndicators.tenantId, ctx.tenantId!))
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
        { type: "title", content: "Análise de Risco Financeiro" },
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
          { cells: ["Absenteísmo Anual", fmtCurrency(absentCost)] },
          { cells: ["Turnover Anual", fmtCurrency(turnoverCost)] },
          { cells: ["Risco de Multas (NR-01)", fmtCurrency(fineRisk)], accentColor: "#f97316" },
          { cells: ["Risco Litígioso (Burnout)", fmtCurrency(litigationRisk)], accentColor: "#ef4444" },
          { cells: ["TOTAL", fmtCurrency(totalRisk)], accentColor: "#1a365d" },
        ]},
        { type: "subtitle", content: "Parâmetros Utilizados" },
        { type: "table", columns: [
          { header: "Parâmetro", width: 200 },
          { header: "Valor", width: 150, align: "right" },
        ], rows: [
          { cells: ["Salário Médio", fmtCurrency(fp.averageSalary)] },
          { cells: ["Custo Reposição", fmtCurrency(fp.avgReplacementCost)] },
          { cells: ["Custo Diário Absenteísmo", fmtCurrency(fp.dailyAbsenteeismCost)] },
          { cells: ["Multa por Trabalhador", fmtCurrency(fp.finePerWorker)] },
          { cells: ["Custo Médio Litígio", fmtCurrency(fp.litigationAvgCost)] },
        ]},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Calculadora de Risco Financeiro",
        reportSubtitle: "Impacto Econômico da Não-Conformidade NR-01",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "risco-financeiro.pdf", data: buffer.toString("base64") };
    }),

  // 6. Cronograma de Compliance
  exportComplianceTimeline: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const milestones = await db.select().from(complianceMilestones)
        .where(eq(complianceMilestones.tenantId, ctx.tenantId!))
        .orderBy(complianceMilestones.order);

      const completed = milestones.filter((m) => m.status === "completed").length;
      const total = milestones.length;

      const sections: PdfSection[] = [
        { type: "title", content: "Cronograma de Adequação NR-01" },
        { type: "kpis", kpis: [
          { label: "Total Etapas", value: String(total), color: "#1a365d" },
          { label: "Concluídas", value: String(completed), color: "#10b981" },
          { label: "Progresso", value: `${total > 0 ? Math.round((completed / total) * 100) : 0}%`, color: "#3b82f6" },
        ]},
        { type: "table", columns: [
          { header: "#", width: 30, align: "center" },
          { header: "Etapa", width: 180 },
          { header: "Categoria", width: 90 },
          { header: "Prazo", width: 80 },
          { header: "Conclusão", width: 80 },
          { header: "Status", width: 80, align: "center" },
        ], rows: milestones.map((m, i) => {
          const statusLabels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", completed: "Concluído", overdue: "Atrasado" };
          const statusColors: Record<string, string> = { pending: "#6b7280", in_progress: "#3b82f6", completed: "#10b981", overdue: "#ef4444" };
          return {
            cells: [String(i + 1), m.title, m.category, fmtDate(m.targetDate), fmtDate(m.completedDate), statusLabels[m.status] || m.status],
            accentColor: statusColors[m.status],
          };
        })},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Cronograma de Adequação NR-01",
        reportSubtitle: "Marcos e Prazos de Conformidade",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "cronograma-compliance.pdf", data: buffer.toString("base64") };
    }),

  // 7. Checklist de Conformidade
  exportComplianceChecklist: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const items = await db.select().from(complianceChecklist)
        .where(eq(complianceChecklist.tenantId, ctx.tenantId!));

      const compliant = items.filter((i) => i.status === "compliant").length;
      const partial = items.filter((i) => i.status === "partial").length;
      const nonCompliant = items.filter((i) => i.status === "non_compliant").length;
      const total = items.length;
      const score = total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;

      const statusLabels: Record<string, string> = { compliant: "Conforme", partial: "Parcial", non_compliant: "Não Conforme", not_applicable: "N/A" };
      const statusColors: Record<string, string> = { compliant: "#10b981", partial: "#f59e0b", non_compliant: "#ef4444", not_applicable: "#6b7280" };

      const sections: PdfSection[] = [
        { type: "title", content: "Checklist de Conformidade Legal" },
        { type: "kpis", kpis: [
          { label: "Score de Conformidade", value: `${score}%`, color: score >= 70 ? "#10b981" : "#ef4444" },
          { label: "Conformes", value: String(compliant), color: "#10b981" },
          { label: "Parciais", value: String(partial), color: "#f59e0b" },
          { label: "Não Conformes", value: String(nonCompliant), color: "#ef4444" },
        ]},
        { type: "table", columns: [
          { header: "Código", width: 80 },
          { header: "Requisito", width: 200 },
          { header: "Categoria", width: 90 },
          { header: "Status", width: 80, align: "center" },
        ], rows: items.map((item) => ({
          cells: [item.requirementCode, item.requirementText, item.category, statusLabels[item.status] || item.status],
          accentColor: statusColors[item.status],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatório de Conformidade Legal",
        reportSubtitle: "Checklist NR-01 — Requisitos Regulatórios",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "checklist-conformidade.pdf", data: buffer.toString("base64") };
    }),

  // 8. Certificado de Conformidade
  exportComplianceCertificate: tenantProcedure
    .input(z.object({ tenantId: z.string().optional(), certificateId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const certs = await db.select().from(complianceCertificates)
        .where(input.certificateId
          ? and(eq(complianceCertificates.tenantId, ctx.tenantId!), eq(complianceCertificates.id, input.certificateId))
          : eq(complianceCertificates.tenantId, ctx.tenantId!))
        .orderBy(desc(complianceCertificates.issuedAt)).limit(1);

      const cert = certs[0];
      if (!cert) {
        const buffer = await generateGenericReportPdf({
          reportTitle: "Certificado de Conformidade",
          date: fmtDate(new Date()),
          sections: [{ type: "text", content: "Nenhum certificado disponível para este tenant." }],
        }, branding, undefined, ctx.tenantId);
        return { filename: "certificado.pdf", data: buffer.toString("base64") };
      }

      const sections: PdfSection[] = [
        { type: "spacer" },
        { type: "title", content: "CERTIFICADO DE CONFORMIDADE NR-01" },
        { type: "spacer" },
        { type: "text", content: `Certificamos que a organização atende aos requisitos da Norma Regulamentadora NR-01 para gestão de riscos psicossociais ocupacionais.` },
        { type: "kpis", kpis: [
          { label: "Número do Certificado", value: cert.certificateNumber, color: "#1a365d" },
          { label: "Score de Conformidade", value: `${cert.complianceScore}%`, color: cert.complianceScore >= 70 ? "#10b981" : "#ef4444" },
          { label: "Status", value: cert.status === "active" ? "Ativo" : cert.status === "expired" ? "Expirado" : "Revogado", color: cert.status === "active" ? "#10b981" : "#ef4444" },
        ]},
        { type: "divider" },
        { type: "table", columns: [
          { header: "Campo", width: 180 },
          { header: "Valor", width: 300 },
        ], rows: [
          { cells: ["Emitido em", fmtDate(cert.issuedAt)] },
          { cells: ["Válido até", fmtDate(cert.validUntil)] },
          { cells: ["Emitido por", cert.issuedBy || "—"] },
        ]},
        { type: "spacer" },
        { type: "text", content: `Verificação online: https://blackbeltconsultoria.com/verify/${cert.certificateNumber}` },
        { type: "spacer" },
        { type: "signature", signatureName: ctx.user?.professionalName || cert.issuedBy || ctx.user?.name || "Responsável Técnico", signatureRole: ctx.user?.professionalRole || "Auditor de Conformidade NR-01", signatureRegistry: ctx.user?.professionalRegistry || undefined },
      ];

      // Add tenant CNPJ if available
      const [certTenant] = await db.select().from(tenants).where(eq(tenants.id, ctx.tenantId!)).limit(1);
      const certCnpj = (certTenant as any)?.cnpj;
      if (certCnpj) {
        sections.splice(3, 0, { type: "text", content: `CNPJ: ${certCnpj}` });
      }

      const buffer = await generateGenericReportPdf({
        reportTitle: "Certificado de Conformidade NR-01",
        reportSubtitle: "Gestão de Riscos Psicossociais Ocupacionais",
        date: fmtDate(cert.issuedAt),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: `certificado-${cert.certificateNumber}.pdf`, data: buffer.toString("base64") };
    }),

  // 9. Laudo Técnico
  exportLaudoTecnico: tenantProcedure
    .input(z.object({ tenantId: z.string().optional(), documentId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const docs = await db.select().from(complianceDocuments)
        .where(input.documentId
          ? and(eq(complianceDocuments.tenantId, ctx.tenantId!), eq(complianceDocuments.id, input.documentId))
          : and(eq(complianceDocuments.tenantId, ctx.tenantId!), eq(complianceDocuments.documentType, "laudo_tecnico")))
        .orderBy(desc(complianceDocuments.createdAt)).limit(1);

      const doc = docs[0];
      if (!doc) {
        const buffer = await generateGenericReportPdf({
          reportTitle: "Laudo Técnico",
          date: fmtDate(new Date()),
          sections: [{ type: "text", content: "Nenhum laudo técnico disponível." }],
        }, branding, undefined, ctx.tenantId);
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
          { cells: ["Tipo", "Laudo Técnico"] },
          { cells: ["Versão", doc.version || "1.0"] },
          { cells: ["Válido de", fmtDate(doc.validFrom)] },
          { cells: ["Válido até", fmtDate(doc.validUntil)] },
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
        { type: "signature", signatureName: doc.professionalName || ctx.user?.professionalName || "Responsável Técnico", signatureRole: ctx.user?.professionalRole || "Profissional de SST", signatureRegistry: doc.professionalRegistry || ctx.user?.professionalRegistry || undefined },
      );

      const buffer = await generateGenericReportPdf({
        reportTitle: "Laudo Técnico — Riscos Psicossociais",
        reportSubtitle: "Conforme NR-01 item 1.5.7",
        date: fmtDate(doc.validFrom),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "laudo-tecnico.pdf", data: buffer.toString("base64") };
    }),

  // 10. Benchmark Comparativo
  exportBenchmark: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const benchmarks = await db.select().from(benchmarkData);
      const [report] = await db.select().from(copsoqReports)
        .where(eq(copsoqReports.tenantId, ctx.tenantId!))
        .orderBy(desc(copsoqReports.generatedAt)).limit(1);

      const dimKeys = [
        { key: "Demanda", tenant: report?.averageDemandScore, benchFn: (b: any) => b.avgDemandScore },
        { key: "Controle", tenant: report?.averageControlScore, benchFn: (b: any) => b.avgControlScore },
        { key: "Apoio Social", tenant: report?.averageSupportScore, benchFn: (b: any) => b.avgSupportScore },
        { key: "Liderança", tenant: report?.averageLeadershipScore, benchFn: (b: any) => b.avgLeadershipScore },
        { key: "Burnout", tenant: report?.averageBurnoutScore, benchFn: (b: any) => b.avgBurnoutScore },
        { key: "Saúde Mental", tenant: report?.averageMentalHealthScore, benchFn: (b: any) => b.avgMentalHealthScore },
      ];

      const nationalBench = benchmarks.find((b) => b.dataSource === "national");

      const sections: PdfSection[] = [
        { type: "title", content: "Comparativo com Benchmarks" },
        { type: "table", columns: [
          { header: "Dimensão", width: 120 },
          { header: "Sua Empresa", width: 90, align: "center" },
          { header: "Média Nacional", width: 90, align: "center" },
          { header: "Diferença", width: 90, align: "center" },
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
          { type: "subtitle", content: "Fontes de Benchmark Disponíveis" },
          { type: "table", columns: [
            { header: "Fonte", width: 100 },
            { header: "Setor", width: 150 },
            { header: "Região", width: 100 },
            { header: "Período", width: 70 },
            { header: "Amostra", width: 70, align: "center" },
          ], rows: benchmarks.map((b) => ({
            cells: [b.dataSource, b.sectorName || "—", b.region || "—", b.period || "—", String(b.sampleSize || 0)],
          }))},
        );
      }

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatório Comparativo — Benchmark",
        reportSubtitle: "Comparação com Dados Nacionais e Setoriais",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "benchmark-comparativo.pdf", data: buffer.toString("base64") };
    }),

  // 11. Pesquisa de Clima
  exportClimateSurvey: tenantProcedure
    .input(z.object({ tenantId: z.string().optional(), surveyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [survey] = await db.select().from(psychosocialSurveys)
        .where(and(eq(psychosocialSurveys.tenantId, ctx.tenantId!), eq(psychosocialSurveys.id, input.surveyId)));

      if (!survey) throw new TRPCError({ code: "NOT_FOUND", message: "Pesquisa não encontrada" });

      const responses = await db.select().from(surveyResponses)
        .where(and(eq(surveyResponses.tenantId, ctx.tenantId!), eq(surveyResponses.surveyId, input.surveyId)));

      const totalResponses = responses.length;
      const avgScore = totalResponses > 0 ? Math.round(responses.reduce((sum, r) => sum + (r.score || 0), 0) / totalResponses) : 0;

      const riskDist = { low: 0, medium: 0, high: 0, critical: 0 };
      responses.forEach((r) => { if (r.riskLevel) riskDist[r.riskLevel as keyof typeof riskDist]++; });

      const sections: PdfSection[] = [
        { type: "title", content: survey.title },
        { type: "text", content: survey.description || "" },
        { type: "kpis", kpis: [
          { label: "Total Respostas", value: String(totalResponses), color: "#1a365d" },
          { label: "Score Médio", value: String(avgScore), color: avgScore >= 70 ? "#10b981" : "#f59e0b" },
          { label: "Tipo", value: survey.surveyType, color: "#6b7280" },
        ]},
        { type: "subtitle", content: "Distribuição de Risco" },
        { type: "table", columns: [
          { header: "Nível de Risco", width: 150 },
          { header: "Quantidade", width: 100, align: "center" },
          { header: "Percentual", width: 100, align: "center" },
        ], rows: Object.entries(riskDist).map(([level, count]) => ({
          cells: [RISK_LABELS[level] || level, String(count), `${totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0}%`],
          accentColor: RISK_COLORS[level],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatório de Pesquisa de Clima",
        reportSubtitle: survey.title,
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: `pesquisa-clima-${input.surveyId}.pdf`, data: buffer.toString("base64") };
    }),

  // 12. Relatorio de Treinamento
  exportTrainingReport: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const modules = await db.select().from(trainingModules)
        .where(eq(trainingModules.tenantId, ctx.tenantId!));

      const progress = await db.select().from(trainingProgress)
        .where(eq(trainingProgress.tenantId, ctx.tenantId!));

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
          { label: "Módulos", value: String(totalModules), color: "#1a365d" },
          { label: "Taxa Conclusão", value: `${completionRate}%`, color: completionRate >= 70 ? "#10b981" : "#f59e0b" },
          { label: "Nota Média Quiz", value: String(avgScore), color: avgScore >= 70 ? "#10b981" : "#ef4444" },
        ]},
        { type: "subtitle", content: "Módulos de Treinamento" },
        { type: "table", columns: [
          { header: "Módulo", width: 200 },
          { header: "Duração (min)", width: 80, align: "center" },
          { header: "Nota Mínima", width: 80, align: "center" },
          { header: "Inscritos", width: 70, align: "center" },
          { header: "Concluídos", width: 70, align: "center" },
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
        reportTitle: "Relatório de Treinamento Digital",
        reportSubtitle: "Capacitação em Riscos Psicossociais — NR-01",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "treinamento.pdf", data: buffer.toString("base64") };
    }),

  // 13. Denuncias Anonimas (sem PII)
  exportAnonymousReports: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const reports = await db.select().from(anonymousReports)
        .where(eq(anonymousReports.tenantId, ctx.tenantId!));

      const catCounts: Record<string, number> = {};
      const sevCounts: Record<string, number> = {};
      const statusCounts: Record<string, number> = {};

      reports.forEach((r) => {
        catCounts[r.category] = (catCounts[r.category] || 0) + 1;
        sevCounts[r.severity] = (sevCounts[r.severity] || 0) + 1;
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      });

      const catLabels: Record<string, string> = { harassment: "Assédio", discrimination: "Discriminação", violence: "Violência", workload: "Sobrecarga", leadership: "Liderança", other: "Outros" };
      const statusLabels: Record<string, string> = { received: "Recebido", investigating: "Em Investigação", resolved: "Resolvido", dismissed: "Descartado" };

      const sections: PdfSection[] = [
        { type: "title", content: "Resumo de Denúncias Anônimas" },
        { type: "text", content: "Este relatório apresenta dados agregados sem informações pessoais identificáveis (PII)." },
        { type: "kpis", kpis: [
          { label: "Total Denúncias", value: String(reports.length), color: "#1a365d" },
          { label: "Resolvidas", value: String(statusCounts["resolved"] || 0), color: "#10b981" },
          { label: "Em Investigação", value: String(statusCounts["investigating"] || 0), color: "#f59e0b" },
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
        reportTitle: "Canal de Denúncia Anônima — Relatório",
        reportSubtitle: "Dados Agregados (Sem PII)",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "denuncias-anonimas.pdf", data: buffer.toString("base64") };
    }),

  // 14. Alertas de Prazos
  exportDeadlineAlerts: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const alerts = await db.select().from(deadlineAlerts)
        .where(eq(deadlineAlerts.tenantId, ctx.tenantId!))
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
        reportTitle: "Relatório de Alertas de Prazos",
        reportSubtitle: "Monitoramento de Vencimentos NR-01",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "alertas-prazos.pdf", data: buffer.toString("base64") };
    }),

  // 15. Avaliacao Ergonomica
  exportErgonomicAssessment: tenantProcedure
    .input(z.object({ tenantId: z.string().optional(), assessmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const [assessment] = await db.select().from(ergonomicAssessments)
        .where(and(eq(ergonomicAssessments.tenantId, ctx.tenantId!), eq(ergonomicAssessments.id, input.assessmentId)));

      if (!assessment) throw new TRPCError({ code: "NOT_FOUND", message: "Avaliação ergonômica não encontrada" });

      const items = await db.select().from(ergonomicItems)
        .where(eq(ergonomicItems.assessmentId, input.assessmentId));

      const riskLabels: Record<string, string> = { acceptable: "Aceitável", moderate: "Moderado", high: "Alto", critical: "Crítico" };
      const riskColors: Record<string, string> = { acceptable: "#10b981", moderate: "#f59e0b", high: "#f97316", critical: "#ef4444" };
      const catLabels: Record<string, string> = { workstation: "Posto de Trabalho", posture: "Postura", repetition: "Repetição", lighting: "Iluminação", noise: "Ruído", organization: "Organização", psychosocial: "Psicossocial" };

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
          { header: "Observação", width: 110 },
          { header: "Recomendação", width: 110 },
        ], rows: items.map((item) => ({
          cells: [catLabels[item.category] || item.category, item.factor, riskLabels[item.riskLevel] || item.riskLevel, item.observation || "—", item.recommendation || "—"],
          accentColor: riskColors[item.riskLevel],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Avaliação Ergonômica Preliminar — AEP",
        reportSubtitle: "Conforme NR-17 — Análise Ergonômica do Trabalho",
        date: fmtDate(assessment.assessmentDate),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: `avaliacao-ergonomica-${input.assessmentId}.pdf`, data: buffer.toString("base64") };
    }),

  // 16. Relatorio eSocial
  exportEsocialReport: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();
      const exports = await db.select().from(esocialExports)
        .where(eq(esocialExports.tenantId, ctx.tenantId!))
        .orderBy(desc(esocialExports.createdAt));

      const statusLabels: Record<string, string> = { draft: "Rascunho", validated: "Validado", submitted: "Enviado", accepted: "Aceito", rejected: "Rejeitado" };
      const statusColors: Record<string, string> = { draft: "#6b7280", validated: "#3b82f6", submitted: "#f59e0b", accepted: "#10b981", rejected: "#ef4444" };

      const accepted = exports.filter((e) => e.status === "accepted").length;

      const sections: PdfSection[] = [
        { type: "title", content: "Histórico de Exportações eSocial" },
        { type: "kpis", kpis: [
          { label: "Total Exportações", value: String(exports.length), color: "#1a365d" },
          { label: "Aceitas", value: String(accepted), color: "#10b981" },
          { label: "Rejeitadas", value: String(exports.filter((e) => e.status === "rejected").length), color: "#ef4444" },
        ]},
        { type: "table", columns: [
          { header: "Evento", width: 70 },
          { header: "Status", width: 80, align: "center" },
          { header: "Enviado em", width: 90 },
          { header: "Código Resposta", width: 90 },
          { header: "Mensagem", width: 180 },
        ], rows: exports.map((e) => ({
          cells: [e.eventType, statusLabels[e.status] || e.status, fmtDate(e.submittedAt), e.responseCode || "—", e.responseMessage || "—"],
          accentColor: statusColors[e.status],
        }))},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatório de Exportação eSocial",
        reportSubtitle: "Eventos S-2220 e S-2240",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "esocial-exportacoes.pdf", data: buffer.toString("base64") };
    }),

  // 17. Relatorio Executivo
  exportExecutiveReport: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await requireDb();

      // Dashboard summary
      const [latestReport] = await db.select().from(copsoqReports)
        .where(eq(copsoqReports.tenantId, ctx.tenantId!))
        .orderBy(desc(copsoqReports.generatedAt)).limit(1);

      // Financial calculation
      const [params] = await db.select().from(financialParameters)
        .where(eq(financialParameters.tenantId, ctx.tenantId!)).limit(1);

      const fp = {
        headcount: params?.headcount || 100,
        finePerWorker: params?.finePerWorker || 670808,
        litigationAvgCost: params?.litigationAvgCost || 5000000,
        dailyAbsenteeismCost: params?.dailyAbsenteeismCost || 25000,
        avgReplacementCost: params?.avgReplacementCost || 1500000,
      };

      const [indicators] = await db.select().from(mentalHealthIndicators)
        .where(eq(mentalHealthIndicators.tenantId, ctx.tenantId!))
        .orderBy(desc(mentalHealthIndicators.createdAt)).limit(1);

      const fineRisk = fp.headcount * fp.finePerWorker;
      const burnoutCases = indicators?.burnoutCases || 0;
      const litigationRisk = burnoutCases * fp.litigationAvgCost;

      // Compliance score
      const checklistItems = await db.select().from(complianceChecklist)
        .where(eq(complianceChecklist.tenantId, ctx.tenantId!));

      const compliant = checklistItems.filter((i) => i.status === "compliant").length;
      const partial = checklistItems.filter((i) => i.status === "partial").length;
      const totalChecklist = checklistItems.length;
      const complianceScore = totalChecklist > 0 ? Math.round(((compliant + partial * 0.5) / totalChecklist) * 100) : 0;

      // Action plans
      const plans = await db.select({
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`SUM(CASE WHEN ${actionPlans.status} = 'completed' THEN 1 ELSE 0 END)`,
      }).from(actionPlans).where(eq(actionPlans.tenantId, ctx.tenantId!));

      const apTotal = plans[0]?.total || 0;
      const apCompleted = plans[0]?.completed || 0;

      const sections: PdfSection[] = [
        { type: "title", content: "1. Resumo Psicossocial" },
        ...(latestReport ? [
          { type: "kpis" as const, kpis: [
            { label: "Respondentes", value: String(latestReport.totalRespondents || 0), color: "#1a365d" },
            { label: "Taxa Resposta", value: `${latestReport.responseRate || 0}%`, color: "#10b981" },
            { label: "Risco Crítico", value: String(latestReport.criticalRiskCount || 0), color: "#ef4444" },
            { label: "Risco Alto", value: String(latestReport.highRiskCount || 0), color: "#f97316" },
          ]},
        ] : [
          { type: "text" as const, content: "Nenhuma avaliação COPSOQ disponível." },
        ]),
        { type: "divider" },
        { type: "title", content: "2. Conformidade Legal" },
        { type: "kpis", kpis: [
          { label: "Score Conformidade", value: `${complianceScore}%`, color: complianceScore >= 70 ? "#10b981" : "#ef4444" },
          { label: "Requisitos Atendidos", value: `${compliant}/${totalChecklist}`, color: "#1a365d" },
          { label: "Planos de Ação", value: `${apCompleted}/${apTotal} concluídos`, color: "#3b82f6" },
        ]},
        { type: "divider" },
        { type: "title", content: "3. Impacto Financeiro" },
        { type: "kpis", kpis: [
          { label: "Risco de Multas", value: fmtCurrency(fineRisk), color: "#f97316" },
          { label: "Risco Litigioso", value: fmtCurrency(litigationRisk), color: "#ef4444" },
          { label: "Casos Burnout", value: String(burnoutCases), color: "#f59e0b" },
        ]},
        { type: "divider" },
        { type: "title", content: "4. Indicadores de Saúde" },
        { type: "table", columns: [
          { header: "Indicador", width: 200 },
          { header: "Valor", width: 150, align: "center" },
        ], rows: [
          { cells: ["Taxa de Absenteísmo", `${((indicators?.absenteeismRate || 0) / 100).toFixed(2)}%`] },
          { cells: ["Taxa de Turnover", `${((indicators?.turnoverRate || 0) / 100).toFixed(2)}%`] },
          { cells: ["Nível de Estresse", `${indicators?.stressLevel || 0}/100`] },
          { cells: ["Engajamento", `${indicators?.engagementScore || 0}/100`] },
          { cells: ["Satisfação", `${indicators?.satisfactionScore || 0}/100`] },
        ]},
      ];

      const buffer = await generateGenericReportPdf({
        reportTitle: "Relatório Executivo — Gestão Psicossocial",
        reportSubtitle: "Visão Consolidada NR-01",
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);
      return { filename: "relatorio-executivo.pdf", data: buffer.toString("base64") };
    }),

  // ══════════════════════════════════════════════════════════════════════
  // PGR CONSOLIDADO — Programa de Gerenciamento de Riscos Psicossociais
  // Documento obrigatório NR-01 item 1.5.3.1 — consolida inventário,
  // plano de ação, cronograma, PCMSO e treinamentos em PDF único.
  // ══════════════════════════════════════════════════════════════════════
  exportConsolidatedPgr: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx }) => {
      const db = await requireDb();
      const tid = ctx.tenantId!;

      // ── 1. Dados da empresa ───────────────────────────────────────
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tid)).limit(1);
      const companyName = tenant?.name || "Empresa";
      const companyCnpj = (tenant as any)?.cnpj || "";

      // ── 2. Avaliação de riscos + itens ────────────────────────────
      const assessmentList = await db.select().from(riskAssessments)
        .where(eq(riskAssessments.tenantId, tid))
        .orderBy(desc(riskAssessments.createdAt));
      const latestAssessment = assessmentList[0];

      let riskItems: any[] = [];
      if (latestAssessment) {
        riskItems = await db.select().from(riskAssessmentItems)
          .where(eq(riskAssessmentItems.assessmentId, latestAssessment.id));
      }

      const criticalItems = riskItems.filter(i => i.riskLevel === "critical");
      const highItems = riskItems.filter(i => i.riskLevel === "high");
      const mediumItems = riskItems.filter(i => i.riskLevel === "medium");
      const lowItems = riskItems.filter(i => i.riskLevel === "low");

      // ── 3. Planos de ação ─────────────────────────────────────────
      const plans = await db.select().from(actionPlans)
        .where(eq(actionPlans.tenantId, tid))
        .orderBy(desc(actionPlans.createdAt));
      const completedPlans = plans.filter(p => p.status === "completed");
      const inProgressPlans = plans.filter(p => p.status === "in_progress");
      const pendingPlans = plans.filter(p => p.status === "pending");

      // ── 4. PCMSO ─────────────────────────────────────────────────
      const pcmso = await db.select().from(pcmsoRecommendations)
        .where(eq(pcmsoRecommendations.tenantId, tid));

      // ── 5. COPSOQ ────────────────────────────────────────────────
      const reports = await db.select().from(copsoqReports)
        .where(eq(copsoqReports.tenantId, tid))
        .orderBy(desc(copsoqReports.createdAt))
        .limit(1);
      const latestReport = reports[0];

      // ── 6. Cronograma ────────────────────────────────────────────
      const milestones = await db.select().from(complianceMilestones)
        .where(eq(complianceMilestones.tenantId, tid))
        .orderBy(complianceMilestones.targetDate);
      const completedMilestones = milestones.filter(m => m.status === "completed");

      // ── 7. Checklist de conformidade ─────────────────────────────
      const checklist = await db.select().from(complianceChecklist)
        .where(eq(complianceChecklist.tenantId, tid));
      const compliantItems = checklist.filter(c => c.status === "compliant");
      const complianceScore = checklist.length > 0
        ? Math.round((compliantItems.length / checklist.length) * 100)
        : 0;

      // ── 8. Treinamentos ──────────────────────────────────────────
      const programs = await db.select().from(interventionPrograms)
        .where(eq(interventionPrograms.tenantId, tid));

      // ══════════════════════════════════════════════════════════════
      // CONSTRUIR PDF
      // ══════════════════════════════════════════════════════════════
      const sections: PdfSection[] = [];

      // ── CAPA ──────────────────────────────────────────────────────
      sections.push({ type: "title", content: "PROGRAMA DE GERENCIAMENTO DE RISCOS" });
      sections.push({ type: "subtitle", content: "Riscos Psicossociais — Conforme NR-01 (Portaria MTE 1.419/2024)" });
      sections.push({ type: "text", content: `Empresa: ${companyName}` });
      if (companyCnpj) {
        sections.push({ type: "text", content: `CNPJ: ${companyCnpj}` });
      }
      sections.push({ type: "text", content: `Data de elaboração: ${fmtDate(new Date())}` });
      if (latestAssessment) {
        sections.push({ type: "text", content: `Avaliação base: ${latestAssessment.title} (${fmtDate(latestAssessment.assessmentDate)})` });
      }
      sections.push({ type: "divider" });

      // ── KPIs GERAIS ───────────────────────────────────────────────
      sections.push({ type: "subtitle", content: "1. Resumo Executivo" });
      sections.push({ type: "kpis", kpis: [
        { label: "Riscos Identificados", value: String(riskItems.length), color: "#1a365d" },
        { label: "Críticos/Altos", value: String(criticalItems.length + highItems.length), color: "#ef4444" },
        { label: "Planos de Ação", value: `${completedPlans.length}/${plans.length}`, color: "#10b981" },
        { label: "Conformidade NR-01", value: `${complianceScore}%`, color: complianceScore >= 80 ? "#10b981" : "#f59e0b" },
      ]});
      sections.push({ type: "spacer" });

      // ── SEÇÃO 2: INVENTÁRIO DE RISCOS ─────────────────────────────
      sections.push({ type: "subtitle", content: "2. Inventário de Riscos Psicossociais" });
      sections.push({ type: "text", content: `Metodologia: COPSOQ-II (Copenhagen Psychosocial Questionnaire) — 76 questões, 12 dimensões. Avaliação realizada em ${fmtDate(latestAssessment?.assessmentDate)}.` });

      if (latestReport) {
        const dims = latestReport as any;
        const dimensionRows = [
          { name: "Demanda de Trabalho", score: dims.averageDemandScore, risk: (dims.averageDemandScore || 0) > 60 },
          { name: "Controle / Autonomia", score: dims.averageControlScore, risk: (dims.averageControlScore || 0) < 40 },
          { name: "Apoio Social", score: dims.averageSupportScore, risk: (dims.averageSupportScore || 0) < 40 },
          { name: "Liderança", score: dims.averageLeadershipScore, risk: (dims.averageLeadershipScore || 0) < 40 },
          { name: "Comunidade", score: dims.averageCommunityScore, risk: (dims.averageCommunityScore || 0) < 40 },
          { name: "Significado do Trabalho", score: dims.averageMeaningScore, risk: (dims.averageMeaningScore || 0) < 40 },
          { name: "Confiança", score: dims.averageTrustScore, risk: (dims.averageTrustScore || 0) < 40 },
          { name: "Justiça", score: dims.averageJusticeScore, risk: (dims.averageJusticeScore || 0) < 40 },
          { name: "Insegurança", score: dims.averageInsecurityScore, risk: (dims.averageInsecurityScore || 0) > 60 },
          { name: "Saúde Mental", score: dims.averageMentalHealthScore, risk: (dims.averageMentalHealthScore || 0) > 60 },
          { name: "Burnout", score: dims.averageBurnoutScore, risk: (dims.averageBurnoutScore || 0) > 60 },
          { name: "Violência e Assédio", score: dims.averageViolenceScore, risk: (dims.averageViolenceScore || 0) > 40 },
        ];

        sections.push({ type: "table", columns: [
          { header: "Dimensão COPSOQ-II", width: 180 },
          { header: "Score (0-100)", width: 90, align: "center" },
          { header: "Nível de Risco", width: 100, align: "center" },
        ], rows: dimensionRows.map(d => ({
          cells: [
            d.name,
            String(d.score ?? "—"),
            d.risk ? "ATENÇÃO" : "Adequado",
          ],
          accentColor: d.risk ? "#ef4444" : "#10b981",
        }))});
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 3: CLASSIFICAÇÃO DE RISCOS ──────────────────────────
      if (riskItems.length > 0) {
        sections.push({ type: "subtitle", content: "3. Classificação dos Riscos (Severidade x Probabilidade)" });

        const MTE_TYPE_LABELS: Record<string, string> = {
          mte_01: "Metas excessivas", mte_02: "Jornada extensa", mte_03: "Falta de autonomia",
          mte_04: "Sobrecarga mental", mte_05: "Assédio moral", mte_06: "Assédio sexual",
          mte_07: "Violência", mte_08: "Insegurança", mte_09: "Conflitos interpessoais",
          mte_10: "Falta de suporte", mte_11: "Falta de reconhecimento", mte_12: "Desequilíbrio trabalho-vida",
          mte_13: "Comunicação ineficiente",
        };

        sections.push({ type: "table", columns: [
          { header: "Fator de Risco", width: 130 },
          { header: "Tipo MTE", width: 80 },
          { header: "Severidade", width: 70, align: "center" },
          { header: "Probabilidade", width: 70, align: "center" },
          { header: "Nível", width: 60, align: "center" },
          { header: "Controles Atuais", width: 120 },
        ], rows: riskItems.map(item => ({
          cells: [
            (() => {
              const riskFactorLabels: Record<string, string> = {
                "PSY-DEMANDA": "Sobrecarga de Demanda de Trabalho",
                "PSY-CONTROLE": "Falta de Autonomia e Controle",
                "PSY-APOIO": "Insuficiência de Apoio Social",
                "PSY-LIDERANCA": "Deficiência na Qualidade de Liderança",
                "PSY-COMUNIDADE": "Fragilidade no Senso de Comunidade",
                "PSY-SIGNIFICADO": "Perda de Significado do Trabalho",
                "PSY-CONFIANCA": "Déficit de Confiança Organizacional",
                "PSY-JUSTICA": "Percepção de Injustiça no Trabalho",
                "PSY-INSEGURANCA": "Insegurança no Emprego",
                "PSY-SAUDEMENTAL": "Comprometimento da Saúde Mental",
                "PSY-BURNOUT": "Síndrome de Burnout",
                "PSY-VIOLENCIA": "Exposição a Violência e Assédio",
              };
              const label = riskFactorLabels[item.riskFactorId] || item.riskFactorId || "—";
              return item.hazardCode ? `${label} (${item.hazardCode})` : label;
            })(),
            item.mteHazardType ? (MTE_TYPE_LABELS[item.mteHazardType] || item.mteHazardType) : "—",
            SEVERITY_LABELS[item.severity] || item.severity,
            PROBABILITY_LABELS[item.probability] || item.probability,
            RISK_LABELS[item.riskLevel] || item.riskLevel,
            item.currentControls || "Nenhum",
          ],
          accentColor: RISK_COLORS[item.riskLevel],
        }))});
        sections.push({ type: "spacer" });
      }

      // ── SEÇÃO 4: PLANO DE AÇÃO ────────────────────────────────────
      sections.push({ type: "subtitle", content: "4. Plano de Ação — Medidas Preventivas e Corretivas" });
      sections.push({ type: "kpis", kpis: [
        { label: "Total de Ações", value: String(plans.length), color: "#1a365d" },
        { label: "Concluídas", value: String(completedPlans.length), color: "#10b981" },
        { label: "Em Andamento", value: String(inProgressPlans.length), color: "#3b82f6" },
        { label: "Pendentes", value: String(pendingPlans.length), color: "#f59e0b" },
      ]});

      if (plans.length > 0) {
        sections.push({ type: "table", columns: [
          { header: "Ação", width: 170 },
          { header: "Prioridade", width: 70, align: "center" },
          { header: "Status", width: 80, align: "center" },
          { header: "Prazo", width: 80, align: "center" },
          { header: "Descrição", width: 130 },
        ], rows: plans.map(p => ({
          cells: [
            p.title,
            PRIORITY_LABELS[p.priority || "medium"] || p.priority || "—",
            p.status === "completed" ? "Concluído" : p.status === "in_progress" ? "Em andamento" : "Pendente",
            fmtDate(p.deadline),
            (p.description || "").slice(0, 60) + ((p.description || "").length > 60 ? "..." : ""),
          ],
          accentColor: p.status === "completed" ? "#10b981" : p.status === "in_progress" ? "#3b82f6" : "#f59e0b",
        }))});
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 5: CRONOGRAMA DE IMPLEMENTAÇÃO ─────────────────────
      sections.push({ type: "subtitle", content: "5. Cronograma de Implementação" });
      if (milestones.length > 0) {
        sections.push({ type: "table", columns: [
          { header: "Etapa", width: 200 },
          { header: "Prazo", width: 90, align: "center" },
          { header: "Status", width: 90, align: "center" },
          { header: "Conclusão", width: 90, align: "center" },
        ], rows: milestones.map(m => ({
          cells: [
            m.title,
            fmtDate(m.targetDate),
            m.status === "completed" ? "Concluído" : m.status === "in_progress" ? "Em andamento" : m.status === "overdue" ? "ATRASADO" : "Pendente",
            m.completedDate ? fmtDate(m.completedDate) : "—",
          ],
          accentColor: m.status === "completed" ? "#10b981" : m.status === "overdue" ? "#ef4444" : "#f59e0b",
        }))});
        sections.push({ type: "text", content: `Progresso: ${completedMilestones.length} de ${milestones.length} etapas concluídas (${milestones.length > 0 ? Math.round((completedMilestones.length / milestones.length) * 100) : 0}%)` });
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 6: INTEGRAÇÃO PCMSO ─────────────────────────────────
      sections.push({ type: "subtitle", content: "6. Integração com PCMSO (NR-07)" });
      sections.push({ type: "text", content: "Recomendações de exames e avaliações de saúde geradas a partir dos riscos identificados:" });
      if (pcmso.length > 0) {
        sections.push({ type: "table", columns: [
          { header: "Tipo de Exame", width: 160 },
          { header: "Frequência", width: 90, align: "center" },
          { header: "Prioridade", width: 80, align: "center" },
          { header: "População Alvo", width: 120 },
          { header: "Base Médica", width: 120 },
        ], rows: pcmso.map(r => ({
          cells: [
            (r as any).examType || "—",
            (r as any).frequency || "—",
            PRIORITY_LABELS[(r as any).priority || "medium"] || (r as any).priority || "—",
            (r as any).targetPopulation || "—",
            ((r as any).medicalBasis || "").slice(0, 50) + (((r as any).medicalBasis || "").length > 50 ? "..." : ""),
          ],
        }))});
      } else {
        sections.push({ type: "text", content: "Nenhuma recomendação PCMSO registrada. Execute o inventário de riscos para gerar recomendações automáticas." });
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 7: PROGRAMA DE TREINAMENTO ──────────────────────────
      sections.push({ type: "subtitle", content: "7. Programa de Capacitação e Treinamento" });
      if (programs.length > 0) {
        sections.push({ type: "table", columns: [
          { header: "Programa", width: 200 },
          { header: "Duração", width: 80, align: "center" },
          { header: "Início", width: 90, align: "center" },
          { header: "Término", width: 90, align: "center" },
        ], rows: programs.map(p => ({
          cells: [
            p.title,
            `${(p as any).duration || "—"}h`,
            fmtDate((p as any).startDate),
            fmtDate((p as any).endDate),
          ],
        }))});
      } else {
        sections.push({ type: "text", content: "Nenhum programa de treinamento cadastrado." });
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 8: CHECKLIST NR-01 ──────────────────────────────────
      sections.push({ type: "subtitle", content: "8. Checklist de Conformidade NR-01" });
      sections.push({ type: "kpis", kpis: [
        { label: "Total Requisitos", value: String(checklist.length), color: "#1a365d" },
        { label: "Conformes", value: String(compliantItems.length), color: "#10b981" },
        { label: "Score", value: `${complianceScore}%`, color: complianceScore >= 80 ? "#10b981" : "#ef4444" },
      ]});
      sections.push({ type: "spacer" });

      // ── RODAPÉ: BASE LEGAL ────────────────────────────────────────
      sections.push({ type: "divider" });
      sections.push({ type: "subtitle", content: "Base Legal e Normativa" });
      sections.push({ type: "list", items: [
        "NR-01 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais (Portaria MTE 1.419/2024)",
        "NR-07 — Programa de Controle Médico de Saúde Ocupacional (PCMSO)",
        "NR-17 — Ergonomia e Condições de Trabalho",
        "Guia MTE — Fatores de Riscos Psicossociais Relacionados ao Trabalho (2024)",
        "COPSOQ-II — Copenhagen Psychosocial Questionnaire (metodologia oficial)",
      ]});
      sections.push({ type: "spacer" });

      // ── ASSINATURA ────────────────────────────────────────────────
      sections.push({ type: "signature", signatureName: ctx.user?.professionalName || ctx.user?.name || "Responsável Técnico", signatureRole: ctx.user?.professionalRole || "Consultor SST", signatureRegistry: ctx.user?.professionalRegistry || undefined });

      // ── GERAR PDF ───���───────────────��─────────────────────────────
      const buffer = await generateGenericReportPdf({
        reportTitle: "PGR — Programa de Gerenciamento de Riscos Psicossociais",
        reportSubtitle: `${companyName} — NR-01 Conforme Portaria MTE 1.419/2024`,
        referenceText: "Documento gerado automaticamente pela BlackBelt Platform",
        companyName,
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);

      return { filename: `pgr-consolidado-${companyName.replace(/\s+/g, "-").toLowerCase()}.pdf`, data: buffer.toString("base64") };
    }),

  // ══════════════════════════════════════════════════════════════════════
  // GRO — Gerenciamento de Riscos Ocupacionais (NR-01 seção 1.5)
  // ══════════════════════════════════════════════════════════════════════
  exportGro: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx }) => {
      const db = await requireDb();
      const tid = ctx.tenantId!;

      // ── Dados da empresa ──────────────────────────────────────────
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tid)).limit(1);
      const companyName = tenant?.name || "Empresa";
      const companyCnpj = (tenant as any)?.cnpj || "";

      // ── Dados paralelos ───────────────────────────────────────────
      const [
        assessmentList, planList, pcmso, reports, milestones, checklist,
        programs, disseminations, indicators,
      ] = await Promise.all([
        db.select().from(riskAssessments).where(eq(riskAssessments.tenantId, tid)).orderBy(desc(riskAssessments.createdAt)),
        db.select().from(actionPlans).where(eq(actionPlans.tenantId, tid)).orderBy(desc(actionPlans.createdAt)),
        db.select().from(pcmsoRecommendations).where(eq(pcmsoRecommendations.tenantId, tid)),
        db.select().from(copsoqReports).where(eq(copsoqReports.tenantId, tid)).orderBy(desc(copsoqReports.createdAt)).limit(1),
        db.select().from(complianceMilestones).where(eq(complianceMilestones.tenantId, tid)).orderBy(complianceMilestones.targetDate),
        db.select().from(complianceChecklist).where(eq(complianceChecklist.tenantId, tid)),
        db.select().from(interventionPrograms).where(eq(interventionPrograms.tenantId, tid)),
        db.select().from(resultDisseminations).where(eq(resultDisseminations.tenantId, tid)),
        db.select().from(mentalHealthIndicators).where(eq(mentalHealthIndicators.tenantId, tid)),
      ]);

      const latestAssessment = assessmentList[0];
      let riskItems: any[] = [];
      if (latestAssessment) {
        riskItems = await db.select().from(riskAssessmentItems).where(eq(riskAssessmentItems.assessmentId, latestAssessment.id));
      }
      const latestReport = reports[0];
      const completedPlans = planList.filter(p => p.status === "completed");
      const compliantItems = checklist.filter(c => c.status === "compliant");
      const complianceScore = checklist.length > 0 ? Math.round((compliantItems.length / checklist.length) * 100) : 0;

      // ── Completude do GRO ─────────────────────────────────────────
      const groSections = [
        { label: "Identificação de Perigos", ok: riskItems.length > 0 },
        { label: "Avaliação de Riscos", ok: !!latestReport },
        { label: "Medidas de Controle", ok: planList.length > 0 },
        { label: "Comunicação", ok: disseminations.length > 0 },
        { label: "Monitoramento", ok: milestones.length > 0 || indicators.length > 0 },
        { label: "Integração PCMSO", ok: pcmso.length > 0 },
        { label: "Capacitação", ok: programs.length > 0 },
        { label: "Conformidade NR-01", ok: complianceScore >= 60 },
      ];
      const groCompleteness = Math.round((groSections.filter(s => s.ok).length / groSections.length) * 100);

      // ══════════════════════════════════════════════════════════════
      // CONSTRUIR PDF GRO
      // ══════════════════════════════════════════════════════════════
      const sections: PdfSection[] = [];

      // ── CAPA ──────────────────────────────────────────────────────
      sections.push({ type: "title", content: "GRO — GERENCIAMENTO DE RISCOS OCUPACIONAIS" });
      sections.push({ type: "subtitle", content: "Riscos Psicossociais — NR-01 (Portaria MTE nº 1.419/2024)" });
      sections.push({ type: "text", content: `Empresa: ${companyName}` });
      if (companyCnpj) sections.push({ type: "text", content: `CNPJ: ${companyCnpj}` });
      sections.push({ type: "text", content: `Data de elaboração: ${fmtDate(new Date())}` });
      sections.push({ type: "text", content: `Completude do GRO: ${groCompleteness}%` });
      sections.push({ type: "divider" });

      // ── RESUMO EXECUTIVO ──────────────────────────────────────────
      sections.push({ type: "subtitle", content: "Resumo Executivo" });
      sections.push({ type: "kpis", kpis: [
        { label: "Completude GRO", value: `${groCompleteness}%`, color: groCompleteness >= 80 ? "#10b981" : groCompleteness >= 50 ? "#f59e0b" : "#ef4444" },
        { label: "Riscos Identificados", value: String(riskItems.length), color: "#1a365d" },
        { label: "Planos de Ação", value: `${completedPlans.length}/${planList.length}`, color: "#10b981" },
        { label: "Conformidade", value: `${complianceScore}%`, color: complianceScore >= 80 ? "#10b981" : "#f59e0b" },
      ]});

      // Status de cada seção do GRO
      sections.push({ type: "table", columns: [
        { header: "Seção do GRO", width: 250 },
        { header: "Status", width: 100, align: "center" },
      ], rows: groSections.map(s => ({
        cells: [s.label, s.ok ? "COMPLETO" : "PENDENTE"],
        accentColor: s.ok ? "#10b981" : "#ef4444",
      }))});
      sections.push({ type: "spacer" });

      // ── SEÇÃO 1: IDENTIFICAÇÃO DE PERIGOS (NR-01 1.5.3.1-1.5.3.3) ─
      sections.push({ type: "subtitle", content: "1. Identificação de Perigos e Fatores de Risco (NR-01 §1.5.3)" });
      sections.push({ type: "text", content: "Levantamento dos fatores de risco psicossociais conforme Guia MTE — 13 tipos de perigo oficiais." });

      if (riskItems.length > 0) {
        const MTE_LABELS: Record<string, string> = {
          mte_01: "Metas excessivas", mte_02: "Jornada extensa", mte_03: "Falta de autonomia",
          mte_04: "Sobrecarga mental", mte_05: "Assédio moral", mte_06: "Assédio sexual",
          mte_07: "Violência", mte_08: "Insegurança", mte_09: "Conflitos interpessoais",
          mte_10: "Falta de suporte", mte_11: "Falta de reconhecimento", mte_12: "Desequilíbrio trabalho-vida",
          mte_13: "Comunicação ineficiente",
        };
        sections.push({ type: "table", columns: [
          { header: "Fator de Risco", width: 150 },
          { header: "Tipo MTE", width: 100, align: "center" },
          { header: "Severidade", width: 70, align: "center" },
          { header: "Probabilidade", width: 80, align: "center" },
          { header: "Nível", width: 60, align: "center" },
        ], rows: riskItems.map(item => ({
          cells: [
            item.riskFactorId || "—",
            item.mteHazardType ? (MTE_LABELS[item.mteHazardType] || item.mteHazardType) : "—",
            SEVERITY_LABELS[item.severity] || item.severity,
            PROBABILITY_LABELS[item.probability] || item.probability,
            RISK_LABELS[item.riskLevel] || item.riskLevel,
          ],
          accentColor: RISK_COLORS[item.riskLevel],
        }))});
      } else {
        sections.push({ type: "text", content: "⚠ Nenhum fator de risco identificado. Execute o inventário de riscos." });
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 2: AVALIAÇÃO (NR-01 1.5.3.4-1.5.3.6) ───────────────
      sections.push({ type: "subtitle", content: "2. Avaliação dos Riscos (NR-01 §1.5.3.4)" });
      sections.push({ type: "text", content: "Metodologia: COPSOQ-II (Copenhagen Psychosocial Questionnaire) — 76 questões, 12 dimensões." });

      if (latestReport) {
        const dims = latestReport as any;
        sections.push({ type: "kpis", kpis: [
          { label: "Respondentes", value: String(dims.totalResponses || 0), color: "#1a365d" },
          { label: "Risco Baixo", value: String(dims.lowRiskCount || 0), color: "#10b981" },
          { label: "Risco Alto", value: String(dims.highRiskCount || 0), color: "#f97316" },
          { label: "Risco Crítico", value: String(dims.criticalRiskCount || 0), color: "#ef4444" },
        ]});
      } else {
        sections.push({ type: "text", content: "⚠ Nenhum relatório COPSOQ-II disponível." });
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 3: MEDIDAS DE CONTROLE (NR-01 1.5.4) ────────────────
      sections.push({ type: "subtitle", content: "3. Medidas de Prevenção e Controle (NR-01 §1.5.4)" });
      sections.push({ type: "text", content: "Plano de ação com hierarquia de controles: eliminação > substituição > engenharia > administrativo > EPI." });

      if (planList.length > 0) {
        sections.push({ type: "kpis", kpis: [
          { label: "Total de Ações", value: String(planList.length), color: "#1a365d" },
          { label: "Concluídas", value: String(completedPlans.length), color: "#10b981" },
          { label: "Em Andamento", value: String(planList.filter(p => p.status === "in_progress").length), color: "#3b82f6" },
          { label: "Pendentes", value: String(planList.filter(p => p.status === "pending").length), color: "#f59e0b" },
        ]});
        sections.push({ type: "table", columns: [
          { header: "Ação", width: 180 },
          { header: "Tipo", width: 80, align: "center" },
          { header: "Prioridade", width: 70, align: "center" },
          { header: "Prazo", width: 80, align: "center" },
          { header: "Status", width: 80, align: "center" },
        ], rows: planList.slice(0, 20).map(p => ({
          cells: [
            p.title.slice(0, 50) + (p.title.length > 50 ? "..." : ""),
            p.actionType || "—",
            PRIORITY_LABELS[p.priority || "medium"] || "—",
            fmtDate(p.deadline),
            p.status === "completed" ? "Concluído" : p.status === "in_progress" ? "Em andamento" : "Pendente",
          ],
          accentColor: p.status === "completed" ? "#10b981" : p.status === "in_progress" ? "#3b82f6" : "#f59e0b",
        }))});
      } else {
        sections.push({ type: "text", content: "⚠ Nenhum plano de ação cadastrado." });
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 4: COMUNICAÇÃO (NR-01 1.5.3.7) ──────────────────────
      sections.push({ type: "subtitle", content: "4. Comunicação e Participação dos Trabalhadores (NR-01 §1.5.3.7)" });
      if (disseminations.length > 0) {
        const totalRecipients = disseminations.reduce((sum, d) => sum + (d.recipientCount || 0), 0);
        sections.push({ type: "kpis", kpis: [
          { label: "Disseminações", value: String(disseminations.length), color: "#1a365d" },
          { label: "Total Destinatários", value: String(totalRecipients), color: "#10b981" },
        ]});
        sections.push({ type: "table", columns: [
          { header: "Método", width: 100 },
          { header: "Destinatários", width: 100, align: "center" },
          { header: "Data", width: 100, align: "center" },
          { header: "Observações", width: 200 },
        ], rows: disseminations.map(d => ({
          cells: [
            d.method || "—",
            String(d.recipientCount || 0),
            fmtDate(d.sentAt),
            (d.notes || "").slice(0, 60) + ((d.notes || "").length > 60 ? "..." : ""),
          ],
        }))});
      } else {
        sections.push({ type: "text", content: "⚠ Nenhuma devolutiva registrada. A NR-01 exige comunicação dos resultados aos trabalhadores." });
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 5: MONITORAMENTO (NR-01 1.5.5) ──────────────────────
      sections.push({ type: "subtitle", content: "5. Monitoramento e Acompanhamento (NR-01 §1.5.5)" });
      if (milestones.length > 0) {
        const completedMs = milestones.filter(m => m.status === "completed");
        sections.push({ type: "text", content: `Progresso: ${completedMs.length} de ${milestones.length} etapas concluídas.` });
        sections.push({ type: "table", columns: [
          { header: "Etapa", width: 200 },
          { header: "Prazo", width: 90, align: "center" },
          { header: "Status", width: 90, align: "center" },
        ], rows: milestones.slice(0, 15).map(m => ({
          cells: [
            m.title,
            fmtDate(m.targetDate),
            m.status === "completed" ? "Concluído" : m.status === "overdue" ? "ATRASADO" : "Pendente",
          ],
          accentColor: m.status === "completed" ? "#10b981" : m.status === "overdue" ? "#ef4444" : "#f59e0b",
        }))});
      } else {
        sections.push({ type: "text", content: "⚠ Nenhum cronograma de monitoramento definido." });
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 6: PCMSO ────────────────────────────────────────────
      sections.push({ type: "subtitle", content: "6. Integração com PCMSO (NR-07)" });
      if (pcmso.length > 0) {
        sections.push({ type: "text", content: `${pcmso.length} recomendação(ões) de saúde integradas.` });
      } else {
        sections.push({ type: "text", content: "⚠ Nenhuma recomendação PCMSO registrada." });
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 7: CAPACITAÇÃO ──────────────────────────────────────
      sections.push({ type: "subtitle", content: "7. Programa de Capacitação (NR-01 §1.5.6)" });
      if (programs.length > 0) {
        sections.push({ type: "text", content: `${programs.length} programa(s) de treinamento cadastrado(s).` });
      } else {
        sections.push({ type: "text", content: "⚠ Nenhum programa de treinamento cadastrado." });
      }
      sections.push({ type: "spacer" });

      // ── SEÇÃO 8: CONFORMIDADE ─────────────────────────────────────
      sections.push({ type: "subtitle", content: "8. Checklist de Conformidade NR-01 (§1.5.7)" });
      sections.push({ type: "kpis", kpis: [
        { label: "Total Requisitos", value: String(checklist.length), color: "#1a365d" },
        { label: "Conformes", value: String(compliantItems.length), color: "#10b981" },
        { label: "Score", value: `${complianceScore}%`, color: complianceScore >= 80 ? "#10b981" : "#ef4444" },
      ]});
      sections.push({ type: "spacer" });

      // ── BASE LEGAL ────────────────────────────────────────────────
      sections.push({ type: "divider" });
      sections.push({ type: "subtitle", content: "Base Legal e Normativa" });
      sections.push({ type: "list", items: [
        "NR-01 — Disposições Gerais e Gerenciamento de Riscos Ocupacionais (Portaria MTE nº 1.419/2024)",
        "NR-07 — Programa de Controle Médico de Saúde Ocupacional (PCMSO)",
        "NR-17 — Ergonomia e Condições de Trabalho",
        "Guia MTE — Fatores de Riscos Psicossociais Relacionados ao Trabalho (2024)",
        "COPSOQ-II — Copenhagen Psychosocial Questionnaire (metodologia validada)",
      ]});
      sections.push({ type: "spacer" });
      sections.push({ type: "signature", signatureName: ctx.user?.professionalName || ctx.user?.name || "Responsável Técnico", signatureRole: ctx.user?.professionalRole || "Consultor SST", signatureRegistry: ctx.user?.professionalRegistry || undefined });

      // ── GERAR PDF ─────────────────────────────────────────────────
      const buffer = await generateGenericReportPdf({
        reportTitle: "GRO — Gerenciamento de Riscos Ocupacionais",
        reportSubtitle: `${companyName} — NR-01 Conforme Portaria MTE nº 1.419/2024`,
        referenceText: "Documento gerado automaticamente pela BlackBelt Platform",
        companyName,
        date: fmtDate(new Date()),
        sections,
      }, branding, undefined, ctx.tenantId);

      // ── Registrar documento de compliance ─────────────────────────
      const { nanoid } = await import("nanoid");
      await db.insert(complianceDocuments).values({
        id: `cd_gro_${nanoid(12)}`,
        tenantId: tid,
        documentType: "gro",
        title: `GRO — Gerenciamento de Riscos Ocupacionais`,
        description: `Completude: ${groCompleteness}%. ${riskItems.length} riscos, ${planList.length} ações, conformidade ${complianceScore}%.`,
        version: "1.0",
        validFrom: new Date(),
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        filename: `gro-${companyName.replace(/\s+/g, "-").toLowerCase()}.pdf`,
        data: buffer.toString("base64"),
        groCompleteness,
      };
    }),
});
