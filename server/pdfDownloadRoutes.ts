/**
 * PDF Download REST Routes
 * Authenticated endpoints that generate and stream NR-01 PDFs.
 * Used by the AI agent to provide direct download links in the chat.
 */

import type { Express, Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { verifySessionToken } from "./_core/cookies";
import { getUserById, getDb } from "./db";
import { log } from "./_core/logger";
import {
  generateGenericReportPdf,
  generateInventoryPdf,
  generateActionPlanPdf,
  type GenericReportData,
  type PdfSection,
  type PdfBranding,
  type InventoryPdfData,
  type ActionPlanPdfData,
} from "./_core/pdfGenerator";
import {
  riskAssessmentItems,
  riskAssessments,
  riskFactors,
  copsoqReports,
  copsoqResponses,
  copsoqAssessments,
  complianceCertificates,
  complianceChecklist,
  actionPlans,
  trainingModules,
  trainingProgress,
} from "../drizzle/schema_nr01";
import { tenants, proposals, proposalItems, people } from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const branding: PdfBranding = { companyName: "Black Belt Platform", primaryColor: "#1a365d" };

const SEVERITY_LABELS: Record<string, string> = { low: "Leve", medium: "Moderada", high: "Grave", critical: "Gravissima" };
const PROBABILITY_LABELS: Record<string, string> = { rare: "Rara", unlikely: "Improvavel", possible: "Possivel", likely: "Provavel", certain: "Certa" };
const RISK_LABELS: Record<string, string> = { low: "Baixo", medium: "Medio", high: "Alto", critical: "Critico" };
const RISK_COLORS: Record<string, string> = { low: "#10b981", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("pt-BR");
}

// ============================================================================
// Auth middleware for PDF routes
// ============================================================================

async function authenticateRequest(req: Request, res: Response): Promise<{ userId: string; tenantId: string } | null> {
  const sessionToken = req.cookies?.[COOKIE_NAME];
  if (!sessionToken) {
    res.status(401).json({ error: "Autenticacao necessaria" });
    return null;
  }

  const result = verifySessionToken(sessionToken);
  if (!result) {
    res.status(401).json({ error: "Sessao invalida ou expirada" });
    return null;
  }

  const user = await getUserById(result.userId);
  if (!user || !user.tenantId) {
    res.status(403).json({ error: "Usuario nao encontrado" });
    return null;
  }

  return { userId: user.id, tenantId: user.tenantId };
}

// Validate that the companyId belongs to this user's tenant (child company)
async function validateCompanyAccess(tenantId: string, companyId: string, db: any): Promise<boolean> {
  const [company] = await db.select({ id: tenants.id, parentTenantId: tenants.parentTenantId })
    .from(tenants)
    .where(eq(tenants.id, companyId))
    .limit(1);

  if (!company) return false;
  // Allow if it's the user's own tenant or a child company
  return company.id === tenantId || company.parentTenantId === tenantId;
}

// ============================================================================
// PDF generators per document type
// ============================================================================

type PdfGenerator = (companyId: string, db: any) => Promise<{ buffer: Buffer; filename: string }>;

const pdfGenerators: Record<string, PdfGenerator> = {

  // Relatorio COPSOQ-II
  async copsoq(companyId, db) {
    const [report] = await db.select().from(copsoqReports)
      .where(eq(copsoqReports.tenantId, companyId))
      .orderBy(desc(copsoqReports.generatedAt)).limit(1);

    const [tenant] = await db.select({ name: tenants.name }).from(tenants)
      .where(eq(tenants.id, companyId)).limit(1);

    const sections: PdfSection[] = [
      { type: "title", content: "Relatorio de Avaliacao Psicossocial COPSOQ-II" },
    ];

    if (report) {
      sections.push({
        type: "kpis", kpis: [
          { label: "Respondentes", value: String(report.totalRespondents || 0), color: "#1a365d" },
          { label: "Taxa de Resposta", value: `${report.responseRate || 0}%`, color: "#10b981" },
          { label: "Riscos Criticos", value: String(report.criticalRiskCount || 0), color: "#ef4444" },
          { label: "Riscos Altos", value: String(report.highRiskCount || 0), color: "#f97316" },
        ],
      });

      // Dimension columns matching copsoq_reports schema (schema_nr01.ts)
      const dimensionFields = [
        "averageDemandScore", "averageControlScore", "averageSupportScore",
        "averageLeadershipScore", "averageCommunityScore", "averageMeaningScore",
        "averageTrustScore", "averageJusticeScore", "averageInsecurityScore",
        "averageMentalHealthScore", "averageBurnoutScore", "averageViolenceScore",
      ];

      const dimensionLabels: Record<string, string> = {
        averageDemandScore: "Exigencias Quantitativas",
        averageControlScore: "Influencia no Trabalho",
        averageSupportScore: "Apoio Social",
        averageLeadershipScore: "Qualidade da Lideranca",
        averageCommunityScore: "Comunidade Social",
        averageMeaningScore: "Significado do Trabalho",
        averageTrustScore: "Confianca Horizontal",
        averageJusticeScore: "Justica e Respeito",
        averageInsecurityScore: "Inseguranca no Trabalho",
        averageMentalHealthScore: "Saude Mental",
        averageBurnoutScore: "Burnout",
        averageViolenceScore: "Violencia e Assedio",
      };

      const rows = dimensionFields
        .filter((f) => (report as any)[f] != null)
        .map((f) => {
          const val = Number((report as any)[f]) || 0;
          const level = val >= 66 ? "Critico" : val >= 50 ? "Alto" : val >= 33 ? "Medio" : "Favoravel";
          const color = val >= 66 ? "#ef4444" : val >= 50 ? "#f97316" : val >= 33 ? "#f59e0b" : "#10b981";
          return { cells: [dimensionLabels[f] || f, `${val.toFixed(1)}`, level], accentColor: color };
        });

      if (rows.length > 0) {
        sections.push({ type: "divider" });
        sections.push({ type: "title", content: "Resultados por Dimensao" });
        sections.push({
          type: "table",
          columns: [
            { header: "Dimensao", width: 200 },
            { header: "Score", width: 80, align: "center" },
            { header: "Nivel de Risco", width: 100, align: "center" },
          ],
          rows,
        });
      }

      if (report.recommendations) {
        sections.push({ type: "divider" });
        sections.push({ type: "title", content: "Recomendacoes" });
        sections.push({ type: "text", content: String(report.recommendations) });
      }
    } else {
      sections.push({ type: "text", content: "Nenhuma avaliacao COPSOQ-II concluida para esta empresa." });
    }

    const buffer = await generateGenericReportPdf({
      reportTitle: "Relatorio COPSOQ-II",
      reportSubtitle: "Avaliacao Psicossocial — NR-01",
      companyName: tenant?.name,
      date: fmtDate(new Date()),
      sections,
    }, branding);
    return { buffer, filename: "relatorio-copsoq-ii.pdf" };
  },

  // Inventario de Riscos Psicossociais
  async inventario(companyId, db) {
    const [tenant] = await db.select({ name: tenants.name }).from(tenants)
      .where(eq(tenants.id, companyId)).limit(1);

    const [assessment] = await db.select().from(riskAssessments)
      .where(eq(riskAssessments.tenantId, companyId))
      .orderBy(desc(riskAssessments.createdAt)).limit(1);

    if (!assessment) {
      const buffer = await generateGenericReportPdf({
        reportTitle: "Inventario de Riscos Psicossociais",
        companyName: tenant?.name,
        date: fmtDate(new Date()),
        sections: [{ type: "text", content: "Nenhum inventario de riscos gerado para esta empresa." }],
      }, branding);
      return { buffer, filename: "inventario-riscos.pdf" };
    }

    // JOIN with riskFactors to get the actual risk name
    const items = await db.select({
      id: riskAssessmentItems.id,
      hazardCode: riskAssessmentItems.hazardCode,
      severity: riskAssessmentItems.severity,
      probability: riskAssessmentItems.probability,
      riskLevel: riskAssessmentItems.riskLevel,
      affectedPopulation: riskAssessmentItems.affectedPopulation,
      currentControls: riskAssessmentItems.currentControls,
      observations: riskAssessmentItems.observations,
      riskFactorName: riskFactors.name,
      riskFactorDesc: riskFactors.description,
    })
      .from(riskAssessmentItems)
      .leftJoin(riskFactors, eq(riskAssessmentItems.riskFactorId, riskFactors.id))
      .where(eq(riskAssessmentItems.assessmentId, assessment.id));

    const pdfData: InventoryPdfData = {
      companyName: tenant?.name || "Empresa",
      sector: assessment.title || "Geral",
      date: fmtDate(new Date()),
      methodology: assessment.methodology || "COPSOQ-II + IA",
      assessor: assessment.assessor || "Sistema IA",
      items: items.map((i: any) => ({
        hazardCode: i.hazardCode || "\u2014",
        hazard: i.riskFactorName || "Risco psicossocial",
        risk: i.riskFactorDesc || i.observations || "\u2014",
        healthDamage: "Estresse, ansiedade, burnout",
        severity: i.severity || "medium",
        probability: i.probability || "possible",
        riskLevel: i.riskLevel || "medium",
        currentControls: i.currentControls || "Nenhum identificado",
        recommendedControls: i.observations || "Implementar medidas preventivas",
      })),
      totalWorkers: items[0]?.affectedPopulation ? Number(items[0].affectedPopulation) : undefined,
    };

    const buffer = await generateInventoryPdf(pdfData, branding, {
      title: "Inventario de Riscos Ocupacionais \u2014 Psicossociais",
    });
    return { buffer, filename: "inventario-riscos-psicossociais.pdf" };
  },

  // Plano de Acao
  async plano(companyId, db) {
    const [tenant] = await db.select({ name: tenants.name }).from(tenants)
      .where(eq(tenants.id, companyId)).limit(1);

    const plans = await db.select().from(actionPlans)
      .where(eq(actionPlans.tenantId, companyId))
      .orderBy(desc(actionPlans.createdAt));

    if (plans.length === 0) {
      const buffer = await generateGenericReportPdf({
        reportTitle: "Plano de Acao",
        companyName: tenant?.name,
        date: fmtDate(new Date()),
        sections: [{ type: "text", content: "Nenhum plano de acao gerado para esta empresa." }],
      }, branding);
      return { buffer, filename: "plano-acao.pdf" };
    }

    const pdfData: ActionPlanPdfData = {
      companyName: tenant?.name || "Empresa",
      sector: "Geral",
      date: fmtDate(new Date()),
      planTitle: "Plano de Acao \u2014 Mitigacao de Riscos Psicossociais",
      actions: plans.map((p: any) => ({
        riskIdentified: p.title || "\u2014",
        controlMeasure: p.description || "\u2014",
        actionType: p.actionType || "administrative",
        responsibleRole: "Gestao de RH",
        deadline: p.deadline ? new Date(p.deadline).toLocaleDateString("pt-BR") : "\u2014",
        priority: p.priority || "medium",
        monthlySchedule: p.monthlySchedule || [],
        expectedImpact: p.expectedImpact || "",
        kpiIndicator: p.kpiIndicator || "",
      })),
      generalActions: [],
      monitoringStrategy: "Acompanhamento mensal de indicadores COPSOQ-II com reavaliacao trimestral.",
    };

    const buffer = await generateActionPlanPdf(pdfData, branding, {
      title: "Plano de Acao \u2014 Mitigacao de Riscos Psicossociais",
    });
    return { buffer, filename: "plano-acao-nr01.pdf" };
  },

  // Programa de Treinamento
  async treinamento(companyId, db) {
    const [tenant] = await db.select({ name: tenants.name }).from(tenants)
      .where(eq(tenants.id, companyId)).limit(1);

    const modules = await db.select().from(trainingModules)
      .where(eq(trainingModules.tenantId, companyId))
      .orderBy(desc(trainingModules.createdAt));

    const sections: PdfSection[] = [
      { type: "title", content: "Programa de Treinamento \u2014 NR-01" },
    ];

    if (modules.length > 0) {
      sections.push({
        type: "kpis", kpis: [
          { label: "Total de Modulos", value: String(modules.length), color: "#1a365d" },
          { label: "Carga Horaria Total", value: `${modules.reduce((s: number, m: any) => s + Math.round((m.duration || 0) / 60), 0)}h`, color: "#3b82f6" },
        ],
      });

      sections.push({
        type: "table",
        columns: [
          { header: "Modulo", width: 180 },
          { header: "Descricao", width: 200 },
          { header: "Duracao", width: 60, align: "center" },
          { header: "Obrigatorio", width: 60, align: "center" },
        ],
        rows: modules.map((m: any) => ({
          cells: [
            m.title || "\u2014",
            m.description || "\u2014",
            `${Math.round((m.duration || 0) / 60)}h`,
            m.mandatory ? "Sim" : "Nao",
          ],
        })),
      });
    } else {
      sections.push({ type: "text", content: "Nenhum programa de treinamento gerado para esta empresa." });
    }

    const buffer = await generateGenericReportPdf({
      reportTitle: "Programa de Treinamento",
      reportSubtitle: "Capacitacao em Saude Mental e Riscos Psicossociais",
      companyName: tenant?.name,
      date: fmtDate(new Date()),
      sections,
    }, branding);
    return { buffer, filename: "programa-treinamento.pdf" };
  },

  // Proposta Comercial (from proposals table — shows BOTH initial and final)
  async proposta(companyId, db) {
    const [tenant] = await db.select({ name: tenants.name, cnpj: tenants.cnpj }).from(tenants)
      .where(eq(tenants.id, companyId)).limit(1);

    // Get ALL proposals for this company (initial + final)
    const allProposals = await db.select().from(proposals)
      .where(eq(proposals.clientId, companyId))
      .orderBy(desc(proposals.createdAt));

    const sections: PdfSection[] = [];

    if (allProposals.length === 0) {
      sections.push({ type: "text", content: "Nenhuma proposta comercial gerada para esta empresa." });
    }

    for (const proposal of allProposals) {
      // Fetch line items for this proposal
      const items = await db.select().from(proposalItems)
        .where(eq(proposalItems.proposalId, proposal.id));

      const isFinal = proposal.title?.toLowerCase().includes("final");
      sections.push({ type: "divider" });
      sections.push({ type: "title", content: proposal.title || "Proposta Comercial" });
      sections.push({
        type: "kpis", kpis: [
          { label: "Status", value: proposal.status === "sent" ? "Enviada" : "Rascunho", color: proposal.status === "sent" ? "#10b981" : "#f59e0b" },
          { label: "Valor Total", value: `R$ ${((proposal.totalValue || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "#1a365d" },
          { label: "Desconto", value: `${proposal.discountPercent || 0}%`, color: "#3b82f6" },
          { label: "Validade", value: fmtDate(proposal.validUntil), color: "#6b7280" },
        ],
      });

      if (items.length > 0) {
        sections.push({
          type: "table",
          columns: [
            { header: "Servico", width: 250 },
            { header: "Qtd", width: 40, align: "center" },
            { header: "Valor Unit.", width: 90, align: "right" },
            { header: "Subtotal", width: 90, align: "right" },
          ],
          rows: items.map((it: any) => ({
            cells: [
              it.serviceName,
              String(it.quantity || 1),
              `R$ ${((it.unitPrice || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
              `R$ ${((it.subtotal || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            ],
          })),
        });
      }

      // --- Structured sections instead of raw markdown dump ---

      if (isFinal) {
        // === COPSOQ Results ===
        const copsoqReport = await db.select().from(copsoqReports)
          .where(eq(copsoqReports.tenantId, companyId))
          .orderBy(desc(copsoqReports.createdAt))
          .limit(1);

        if (copsoqReport.length > 0) {
          const r = copsoqReport[0];
          sections.push({ type: "spacer" });
          sections.push({ type: "subtitle", content: "Resultados COPSOQ-II" });
          sections.push({ type: "text", content: `Respondentes: ${r.totalRespondents || 0} | Taxa de resposta: ${r.responseRate || 0}%` });
          sections.push({
            type: "table",
            columns: [
              { header: "Dimensao", width: 280 },
              { header: "Score", width: 80, align: "center" },
              { header: "Nivel", width: 100, align: "center" },
            ],
            rows: [
              { label: "Exigencias Quantitativas", score: r.averageDemandScore },
              { label: "Influencia no Trabalho", score: r.averageControlScore },
              { label: "Apoio Social", score: r.averageSupportScore },
              { label: "Lideranca", score: r.averageLeadershipScore },
              { label: "Comunidade no Trabalho", score: r.averageCommunityScore },
              { label: "Significado do Trabalho", score: r.averageMeaningScore },
              { label: "Confianca", score: r.averageTrustScore },
              { label: "Justica", score: r.averageJusticeScore },
              { label: "Inseguranca no Trabalho", score: r.averageInsecurityScore },
              { label: "Saude Mental", score: r.averageMentalHealthScore },
              { label: "Burnout", score: r.averageBurnoutScore },
              { label: "Violencia e Assedio", score: r.averageViolenceScore },
            ]
              .filter((d) => d.score != null)
              .map((d) => ({
                cells: [
                  d.label,
                  String(d.score),
                  (d.score ?? 0) >= 75 ? "Critico" : (d.score ?? 0) >= 50 ? "Alto" : (d.score ?? 0) >= 25 ? "Medio" : "Baixo",
                ],
              })),
          });

          // Risk distribution from COPSOQ report
          if (r.lowRiskCount != null || r.mediumRiskCount != null || r.highRiskCount != null || r.criticalRiskCount != null) {
            sections.push({
              type: "kpis", kpis: [
                { label: "Risco Baixo", value: String(r.lowRiskCount || 0), color: "#10b981" },
                { label: "Risco Medio", value: String(r.mediumRiskCount || 0), color: "#f59e0b" },
                { label: "Risco Alto", value: String(r.highRiskCount || 0), color: "#f97316" },
                { label: "Risco Critico", value: String(r.criticalRiskCount || 0), color: "#ef4444" },
              ],
            });
          }
        }

        // === Risks Summary ===
        const assessments = await db.select({ id: riskAssessments.id }).from(riskAssessments)
          .where(eq(riskAssessments.tenantId, companyId));

        if (assessments.length > 0) {
          const assessmentIds = assessments.map((a: any) => a.id);
          const riskItems = await db.select({
            riskLevel: riskAssessmentItems.riskLevel,
            count: sql<number>`COUNT(*)`,
          }).from(riskAssessmentItems)
            .where(sql`${riskAssessmentItems.assessmentId} IN (${sql.join(assessmentIds.map((id: any) => sql`${id}`), sql`, `)})`)
            .groupBy(riskAssessmentItems.riskLevel);

          if (riskItems.length > 0) {
            sections.push({ type: "spacer" });
            sections.push({ type: "subtitle", content: "Resumo de Riscos Identificados" });
            sections.push({
              type: "table",
              columns: [
                { header: "Nivel de Risco", width: 200 },
                { header: "Quantidade", width: 100, align: "center" },
              ],
              rows: riskItems.map((ri: any) => ({
                cells: [
                  RISK_LABELS[ri.riskLevel] || ri.riskLevel,
                  String(ri.count),
                ],
              })),
            });
          }
        }

        // === Action Plans Summary ===
        const plans = await db.select({
          status: actionPlans.status,
          count: sql<number>`COUNT(*)`,
        }).from(actionPlans)
          .where(eq(actionPlans.tenantId, companyId))
          .groupBy(actionPlans.status);

        if (plans.length > 0) {
          const statusLabels: Record<string, string> = {
            pending: "Pendente",
            in_progress: "Em Andamento",
            completed: "Concluido",
            cancelled: "Cancelado",
          };
          sections.push({ type: "spacer" });
          sections.push({ type: "subtitle", content: "Planos de Acao" });
          sections.push({
            type: "table",
            columns: [
              { header: "Status", width: 200 },
              { header: "Quantidade", width: 100, align: "center" },
            ],
            rows: plans.map((p: any) => ({
              cells: [statusLabels[p.status] || p.status, String(p.count)],
            })),
          });
        }

        // === Recommended Services ===
        sections.push({ type: "spacer" });
        sections.push({ type: "subtitle", content: "Servicos Recomendados" });
        sections.push({
          type: "list", items: [
            "Diagnostico Psicossocial Completo (COPSOQ-II + entrevistas)",
            "Inventario de Riscos Psicossociais conforme NR-01",
            "Plano de Acao com cronograma e responsaveis",
            "Treinamento de Gestores em Saude Mental Ocupacional",
            "Programa de Acompanhamento e Monitoramento Continuo",
            "Certificacao de Conformidade NR-01",
          ],
        });

        // === ROI Estimate ===
        const [empCount] = await db.select({
          total: sql<number>`COUNT(*)`,
        }).from(people)
          .where(eq(people.tenantId, companyId));

        const employeeCount = empCount?.total || 50;
        const dailyAbsentCost = 400; // R$400/day average cost
        const estimatedDaysAvoided = Math.round(employeeCount * 0.36); // ~18 days per 50 employees
        const annualSavings = dailyAbsentCost * estimatedDaysAvoided;

        sections.push({ type: "spacer" });
        sections.push({ type: "subtitle", content: "Estimativa de ROI" });
        sections.push({ type: "text", content: `Base de calculo: ${employeeCount} colaboradores cadastrados` });
        sections.push({
          type: "table",
          columns: [
            { header: "Indicador", width: 280 },
            { header: "Valor", width: 180, align: "right" },
          ],
          rows: [
            { cells: ["Custo medio de absenteismo/dia", `R$ ${dailyAbsentCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`] },
            { cells: ["Dias de ausencia evitados (estimativa/ano)", String(estimatedDaysAvoided)] },
            { cells: ["Economia anual estimada", `R$ ${annualSavings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`] },
            { cells: ["Reducao estimada de turnover", "15% a 25%"] },
            { cells: ["Melhoria de produtividade estimada", "10% a 20%"] },
          ],
        });

        // === Cronograma ===
        const planDeadlines = await db.select({
          title: actionPlans.title,
          deadline: actionPlans.deadline,
          status: actionPlans.status,
        }).from(actionPlans)
          .where(eq(actionPlans.tenantId, companyId))
          .orderBy(actionPlans.deadline)
          .limit(10);

        if (planDeadlines.length > 0) {
          const statusLabels2: Record<string, string> = {
            pending: "Pendente",
            in_progress: "Em Andamento",
            completed: "Concluido",
            cancelled: "Cancelado",
          };
          sections.push({ type: "spacer" });
          sections.push({ type: "subtitle", content: "Cronograma de Implementacao" });
          sections.push({
            type: "table",
            columns: [
              { header: "Acao", width: 230 },
              { header: "Prazo", width: 100, align: "center" },
              { header: "Status", width: 100, align: "center" },
            ],
            rows: planDeadlines.map((p: any) => ({
              cells: [
                p.title,
                fmtDate(p.deadline),
                statusLabels2[p.status] || p.status,
              ],
            })),
          });
        }

        // === Payment Terms ===
        sections.push({ type: "spacer" });
        sections.push({ type: "subtitle", content: "Condicoes de Pagamento" });
        sections.push({
          type: "table",
          columns: [
            { header: "Etapa", width: 280 },
            { header: "Percentual", width: 100, align: "center" },
          ],
          rows: [
            { cells: ["Assinatura do contrato", "40%"] },
            { cells: ["Inicio dos trabalhos", "30%"] },
            { cells: ["Entrega final", "30%"] },
          ],
        });

        // === Next Steps ===
        sections.push({ type: "spacer" });
        sections.push({ type: "subtitle", content: "Proximos Passos" });
        sections.push({
          type: "list", items: [
            "1. Aprovacao da proposta pelo cliente",
            "2. Assinatura do contrato de prestacao de servicos",
            "3. Inicio do diagnostico e implementacao conforme cronograma",
          ],
        });

      } else {
        // Initial proposal — brief text only
        sections.push({ type: "spacer" });
        sections.push({ type: "text", content: "Esta e uma proposta inicial de estimativa de custos para servicos de gestao de riscos psicossociais conforme NR-01. Os valores apresentados sao baseados no escopo preliminar e podem ser ajustados apos o diagnostico completo." });
      }
    }

    const buffer = await generateGenericReportPdf({
      reportTitle: "Propostas Comerciais NR-01",
      reportSubtitle: `${tenant?.name || "Empresa"} \u2014 CNPJ: ${tenant?.cnpj || ""}`,
      companyName: tenant?.name,
      date: fmtDate(new Date()),
      sections,
    }, branding);
    return { buffer, filename: "propostas-comerciais-nr01.pdf" };
  },

  // Certificado de Conformidade
  async certificado(companyId, db) {
    const [tenant] = await db.select({ name: tenants.name, cnpj: tenants.cnpj }).from(tenants)
      .where(eq(tenants.id, companyId)).limit(1);

    const [cert] = await db.select().from(complianceCertificates)
      .where(eq(complianceCertificates.tenantId, companyId))
      .orderBy(desc(complianceCertificates.issuedAt)).limit(1);

    const sections: PdfSection[] = [];

    if (cert) {
      sections.push(
        { type: "spacer" },
        { type: "title", content: "CERTIFICADO DE CONFORMIDADE NR-01" },
        { type: "spacer" },
        { type: "text", content: `Certificamos que a empresa ${tenant?.name || "organizacao"} (CNPJ: ${tenant?.cnpj || ""}) atende aos requisitos da Norma Regulamentadora NR-01 para gestao de riscos psicossociais ocupacionais.` },
        {
          type: "kpis", kpis: [
            { label: "Numero do Certificado", value: cert.certificateNumber, color: "#1a365d" },
            { label: "Score de Conformidade", value: `${cert.complianceScore}%`, color: cert.complianceScore >= 70 ? "#10b981" : "#ef4444" },
            { label: "Status", value: cert.status === "active" ? "Ativo" : cert.status === "expired" ? "Expirado" : "Revogado", color: cert.status === "active" ? "#10b981" : "#ef4444" },
          ],
        },
        { type: "divider" },
        {
          type: "table", columns: [
            { header: "Campo", width: 180 },
            { header: "Valor", width: 300 },
          ], rows: [
            { cells: ["Emitido em", fmtDate(cert.issuedAt)] },
            { cells: ["Valido ate", fmtDate(cert.validUntil)] },
            { cells: ["Emitido por", cert.issuedBy || "\u2014"] },
          ],
        },
        { type: "spacer" },
        { type: "signature", signatureName: cert.issuedBy || "Responsavel Tecnico", signatureRole: "Auditor de Conformidade NR-01" },
      );
    } else {
      sections.push({ type: "text", content: "Nenhum certificado de conformidade emitido para esta empresa." });
    }

    const buffer = await generateGenericReportPdf({
      reportTitle: "Certificado de Conformidade NR-01",
      reportSubtitle: `${tenant?.name || "Empresa"} — CNPJ: ${tenant?.cnpj || ""}`,
      companyName: tenant?.name,
      date: fmtDate(cert?.issuedAt || new Date()),
      sections,
    }, branding);
    return { buffer, filename: `certificado-conformidade-nr01.pdf` };
  },

  // Checklist de Conformidade
  async checklist(companyId, db) {
    const [tenant] = await db.select({ name: tenants.name }).from(tenants)
      .where(eq(tenants.id, companyId)).limit(1);

    const items = await db.select().from(complianceChecklist)
      .where(eq(complianceChecklist.tenantId, companyId));

    const statusLabels: Record<string, string> = {
      compliant: "Conforme",
      partial: "Parcial",
      non_compliant: "Nao Conforme",
    };
    const statusColors: Record<string, string> = {
      compliant: "#10b981",
      partial: "#f59e0b",
      non_compliant: "#ef4444",
    };

    const compliant = items.filter((i) => i.status === "compliant").length;
    const partial = items.filter((i) => i.status === "partial").length;
    const total = items.length;
    const score = total > 0 ? Math.round(((compliant + partial * 0.5) / total) * 100) : 0;

    const sections: PdfSection[] = [
      { type: "title", content: "Checklist de Conformidade NR-01" },
      {
        type: "kpis", kpis: [
          { label: "Score", value: `${score}%`, color: score >= 70 ? "#10b981" : "#ef4444" },
          { label: "Conforme", value: String(compliant), color: "#10b981" },
          { label: "Parcial", value: String(partial), color: "#f59e0b" },
          { label: "Nao Conforme", value: String(total - compliant - partial), color: "#ef4444" },
        ],
      },
      {
        type: "table",
        columns: [
          { header: "Codigo", width: 90 },
          { header: "Requisito", width: 280 },
          { header: "Status", width: 80, align: "center" },
        ],
        rows: items.map((i) => ({
          cells: [i.requirementCode, i.requirementText, statusLabels[i.status] || i.status],
          accentColor: statusColors[i.status],
        })),
      },
    ];

    const buffer = await generateGenericReportPdf({
      reportTitle: "Checklist de Conformidade",
      reportSubtitle: "NR-01 \u2014 Riscos Psicossociais",
      companyName: tenant?.name,
      date: fmtDate(new Date()),
      sections,
    }, branding);
    return { buffer, filename: "checklist-conformidade.pdf" };
  },
};

// ============================================================================
// Route registration
// ============================================================================

export function registerPdfDownloadRoutes(app: Express) {
  /**
   * GET /api/pdf/:type/:companyId
   * Downloads a PDF document for the given company.
   * Authenticated via session cookie.
   *
   * Types: copsoq, inventario, plano, treinamento, proposta, certificado, checklist
   */
  app.get("/api/pdf/:type/:companyId", async (req: Request, res: Response) => {
    try {
      const auth = await authenticateRequest(req, res);
      if (!auth) return; // Response already sent

      const { type, companyId } = req.params;

      if (!type || !companyId) {
        return res.status(400).json({ error: "Tipo e companyId sao obrigatorios" });
      }

      const generator = pdfGenerators[type];
      if (!generator) {
        return res.status(400).json({ error: `Tipo de PDF desconhecido: ${type}. Tipos validos: ${Object.keys(pdfGenerators).join(", ")}` });
      }

      const db = await getDb();
      if (!db) {
        return res.status(503).json({ error: "Banco de dados indisponivel" });
      }

      // Validate access
      const hasAccess = await validateCompanyAccess(auth.tenantId, companyId, db);
      if (!hasAccess) {
        return res.status(403).json({ error: "Sem permissao para acessar esta empresa" });
      }

      // Payment check: company users can only download if payment is complete
      // Consultants (parent tenant) always have access
      const isCompanyUser = auth.tenantId === companyId;
      if (isCompanyUser && type !== "proposta") {
        const [finalProposal] = await db.select({ paymentStatus: proposals.paymentStatus })
          .from(proposals)
          .where(and(
            eq(proposals.clientId, companyId),
            sql`proposalType = 'final'`,
            sql`status = 'approved'`
          ))
          .orderBy(desc(proposals.createdAt))
          .limit(1);

        if (finalProposal && finalProposal.paymentStatus !== "paid") {
          return res.status(402).json({
            error: "Aguardando confirmacao de pagamento",
            paymentStatus: finalProposal.paymentStatus || "pending",
            message: "Os documentos serao liberados apos a confirmacao do pagamento pela consultoria.",
          });
        }
      }

      const { buffer, filename } = await generator(companyId, db);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", buffer.length);
      res.send(buffer);

    } catch (error: any) {
      log.error("[PDF Download] Error", { error: error.message, type: req.params.type, companyId: req.params.companyId });
      res.status(500).json({ error: "Erro ao gerar PDF" });
    }
  });
}
