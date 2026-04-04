import { getDb } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { tenants } from "../../drizzle/schema";
import {
  complianceChecklist,
  complianceMilestones,
  complianceCertificates,
  riskAssessments,
  riskAssessmentItems,
  copsoqAssessments,
  copsoqResponses,
  copsoqReports,
  copsoqInvites,
  actionPlans,
  interventionPrograms,
  pcmsoRecommendations,
  trainingModules,
  trainingProgress,
  mentalHealthIndicators,
} from "../../drizzle/schema_nr01";
import { log } from "../_core/logger";

// NR-01 Phases
export const NR01_PHASES = [
  { id: "ONBOARDING", name: "Cadastro da Empresa", order: 1 },
  { id: "DIAGNOSTICO", name: "Diagnóstico Inicial", order: 2 },
  { id: "CONFIGURACAO", name: "Configuração do Processo", order: 3 },
  { id: "AVALIACAO", name: "Avaliação COPSOQ-II", order: 4 },
  { id: "ANALISE", name: "Análise e Relatório", order: 5 },
  { id: "INVENTARIO", name: "Inventário de Riscos", order: 6 },
  { id: "PLANO_ACAO", name: "Plano de Ação", order: 7 },
  { id: "TREINAMENTO", name: "Treinamento e Capacitação", order: 8 },
  { id: "DOCUMENTACAO", name: "Documentação (PGR/PCMSO)", order: 9 },
  { id: "CERTIFICACAO", name: "Certificação", order: 10 },
] as const;

export type NR01Phase = typeof NR01_PHASES[number]["id"];

export interface CompanyProfile {
  tenantId: string;
  companyName: string;
  cnpj: string;
  sector?: string;
  headcount?: number;
  tenantType: string;
}

export interface PhaseStatus {
  phase: NR01Phase;
  name: string;
  status: "not_started" | "in_progress" | "completed";
  progress: number; // 0-100
  details: string;
  blockedBy?: string;
}

export interface NR01Status {
  currentPhase: NR01Phase;
  overallProgress: number;
  phases: PhaseStatus[];
  nextActions: SuggestedAction[];
  alerts: string[];
}

export interface SuggestedAction {
  actionType: string;
  label: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  params?: Record<string, any>;
}

// Get the NR-01 compliance status for a specific company/tenant
export async function getNR01Status(tenantId: string): Promise<NR01Status> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Gather data in parallel
  const [
    checklistItems,
    milestones,
    assessments,
    invites,
    responses,
    reports,
    riskAssessmentList,
    actionPlanList,
    programs,
    pcmsoRecs,
    certificates,
  ] = await Promise.all([
    db.select().from(complianceChecklist).where(eq(complianceChecklist.tenantId, tenantId)),
    db.select().from(complianceMilestones).where(eq(complianceMilestones.tenantId, tenantId)),
    db.select().from(copsoqAssessments).where(eq(copsoqAssessments.tenantId, tenantId)).orderBy(desc(copsoqAssessments.createdAt)).limit(1),
    db.select({ count: sql<number>`COUNT(*)` }).from(copsoqInvites).where(eq(copsoqInvites.tenantId, tenantId)),
    db.select({ count: sql<number>`COUNT(*)` }).from(copsoqResponses).where(eq(copsoqResponses.tenantId, tenantId)),
    db.select().from(copsoqReports).where(eq(copsoqReports.tenantId, tenantId)).orderBy(desc(copsoqReports.generatedAt)).limit(1),
    db.select().from(riskAssessments).where(eq(riskAssessments.tenantId, tenantId)).orderBy(desc(riskAssessments.createdAt)).limit(1),
    db.select().from(actionPlans).where(eq(actionPlans.tenantId, tenantId)),
    db.select().from(interventionPrograms).where(eq(interventionPrograms.tenantId, tenantId)),
    db.select().from(pcmsoRecommendations).where(eq(pcmsoRecommendations.tenantId, tenantId)),
    db.select().from(complianceCertificates).where(eq(complianceCertificates.tenantId, tenantId)).orderBy(desc(complianceCertificates.issuedAt)).limit(1),
  ]);

  const hasChecklist = checklistItems.length > 0;
  const hasMilestones = milestones.length > 0;
  const hasAssessment = assessments.length > 0;
  const inviteCount = invites[0]?.count || 0;
  const responseCount = responses[0]?.count || 0;
  const hasReport = reports.length > 0 && reports[0].aiAnalysis;
  const hasInventory = riskAssessmentList.length > 0;
  const hasActionPlan = actionPlanList.length > 0;
  const hasTraining = programs.length > 0;
  const hasPcmso = pcmsoRecs.length > 0;
  const hasCertificate = certificates.length > 0 && certificates[0].status === "active";

  // Calculate compliance score
  const compliant = checklistItems.filter(i => i.status === "compliant").length;
  const partial = checklistItems.filter(i => i.status === "partial").length;
  const notApplicable = checklistItems.filter(i => i.status === "not_applicable").length;
  const applicable = checklistItems.length - notApplicable;
  const complianceScore = applicable > 0 ? Math.round(((compliant + partial * 0.5) / applicable) * 100) : 0;

  // Determine phase statuses
  const phases: PhaseStatus[] = [
    {
      phase: "ONBOARDING",
      name: "Cadastro da Empresa",
      status: "completed", // if we're here, onboarding is done
      progress: 100,
      details: "Empresa cadastrada",
    },
    {
      phase: "DIAGNOSTICO",
      name: "Diagnóstico Inicial",
      status: hasChecklist && hasMilestones ? "completed" : hasChecklist || hasMilestones ? "in_progress" : "not_started",
      progress: hasChecklist && hasMilestones ? 100 : hasChecklist || hasMilestones ? 50 : 0,
      details: hasChecklist && hasMilestones ? "Checklist e milestones configurados" : "Aguardando configuração inicial",
    },
    {
      phase: "CONFIGURACAO",
      name: "Configuração do Processo",
      status: hasChecklist && hasMilestones ? "completed" : "not_started",
      progress: hasChecklist && hasMilestones ? 100 : 0,
      details: `${checklistItems.length} itens no checklist, ${milestones.length} milestones`,
    },
    {
      phase: "AVALIACAO",
      name: "Avaliação COPSOQ-II",
      status: responseCount > 0 ? (inviteCount > 0 && responseCount >= inviteCount * 0.7 ? "completed" : "in_progress") : hasAssessment ? "in_progress" : "not_started",
      progress: inviteCount > 0 ? Math.min(100, Math.round((responseCount / inviteCount) * 100)) : hasAssessment ? 10 : 0,
      details: hasAssessment ? `${responseCount} respostas de ${inviteCount} convites` : "Nenhuma avaliação criada",
    },
    {
      phase: "ANALISE",
      name: "Análise e Relatório",
      status: hasReport ? "completed" : "not_started",
      progress: hasReport ? 100 : 0,
      details: hasReport ? "Análise IA concluída" : "Aguardando análise",
      blockedBy: !hasAssessment || responseCount === 0 ? "AVALIACAO" : undefined,
    },
    {
      phase: "INVENTARIO",
      name: "Inventário de Riscos",
      status: hasInventory ? "completed" : "not_started",
      progress: hasInventory ? 100 : 0,
      details: hasInventory ? "Inventário gerado" : "Aguardando inventário",
      blockedBy: !hasReport ? "ANALISE" : undefined,
    },
    {
      phase: "PLANO_ACAO",
      name: "Plano de Ação",
      status: hasActionPlan ? (actionPlanList.some(a => a.status === "completed") ? "completed" : "in_progress") : "not_started",
      progress: hasActionPlan ? Math.round((actionPlanList.filter(a => a.status === "completed").length / actionPlanList.length) * 100) : 0,
      details: hasActionPlan ? `${actionPlanList.filter(a => a.status === "completed").length}/${actionPlanList.length} ações concluídas` : "Aguardando plano",
      blockedBy: !hasInventory ? "INVENTARIO" : undefined,
    },
    {
      phase: "TREINAMENTO",
      name: "Treinamento e Capacitação",
      status: hasTraining ? "in_progress" : "not_started",
      progress: hasTraining ? 50 : 0,
      details: hasTraining ? `${programs.length} programas criados` : "Nenhum treinamento",
    },
    {
      phase: "DOCUMENTACAO",
      name: "Documentação (PGR/PCMSO)",
      status: hasPcmso ? "in_progress" : "not_started",
      progress: hasPcmso ? 50 : 0,
      details: hasPcmso ? `${pcmsoRecs.length} recomendações PCMSO` : "Aguardando documentação",
    },
    {
      phase: "CERTIFICACAO",
      name: "Certificação",
      status: hasCertificate ? "completed" : complianceScore >= 80 ? "in_progress" : "not_started",
      progress: hasCertificate ? 100 : 0,
      details: hasCertificate ? "Certificado emitido" : `Score: ${complianceScore}% (mínimo 80%)`,
    },
  ];

  // Determine current phase (first incomplete)
  const currentPhase = phases.find(p => p.status !== "completed")?.phase || "CERTIFICACAO";

  // Calculate overall progress
  const overallProgress = Math.round(phases.reduce((sum, p) => sum + p.progress, 0) / phases.length);

  // Generate suggested actions based on current phase
  const nextActions = generateSuggestedActions(currentPhase, phases, {
    hasChecklist, hasMilestones, hasAssessment, inviteCount, responseCount,
    hasReport, hasInventory, hasActionPlan, hasTraining, hasPcmso, hasCertificate, complianceScore,
  });

  // Generate alerts
  const alerts = generateAlerts(milestones, actionPlanList, complianceScore, responseCount, inviteCount);

  return { currentPhase, overallProgress, phases, nextActions, alerts };
}

function generateSuggestedActions(
  currentPhase: NR01Phase,
  phases: PhaseStatus[],
  state: Record<string, any>
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  switch (currentPhase) {
    case "DIAGNOSTICO":
    case "CONFIGURACAO":
      if (!state.hasChecklist) {
        actions.push({ actionType: "seed_checklist", label: "Popular Checklist NR-01", description: "Criar os 25 itens de verificação obrigatórios", priority: "high" });
      }
      if (!state.hasMilestones) {
        actions.push({ actionType: "seed_milestones", label: "Criar Cronograma", description: "Gerar milestones padrão NR-01 com datas-alvo", priority: "high" });
      }
      break;
    case "AVALIACAO":
      if (!state.hasAssessment) {
        actions.push({ actionType: "create_assessment", label: "Criar Avaliação COPSOQ-II", description: "Iniciar avaliação psicossocial com 76 questões", priority: "urgent" });
      } else if (state.inviteCount === 0) {
        actions.push({ actionType: "send_invites", label: "Enviar Convites", description: "Enviar convites de avaliação por email", priority: "urgent" });
      } else if (state.responseCount < state.inviteCount * 0.7) {
        actions.push({ actionType: "send_reminders", label: "Enviar Lembretes", description: `${state.responseCount}/${state.inviteCount} respostas — enviar lembretes`, priority: "high" });
      }
      break;
    case "ANALISE":
      if (!state.hasReport) {
        actions.push({ actionType: "analyze_copsoq", label: "Gerar Análise IA", description: "Analisar respostas com inteligência artificial", priority: "urgent" });
      }
      break;
    case "INVENTARIO":
      if (!state.hasInventory) {
        actions.push({ actionType: "generate_inventory", label: "Gerar Inventário de Riscos", description: "Criar inventário de riscos baseado na análise COPSOQ", priority: "urgent" });
      }
      break;
    case "PLANO_ACAO":
      if (!state.hasActionPlan) {
        actions.push({ actionType: "generate_plan", label: "Gerar Plano de Ação", description: "Criar plano de ação com medidas preventivas", priority: "urgent" });
      }
      break;
    case "TREINAMENTO":
      if (!state.hasTraining) {
        actions.push({ actionType: "create_training", label: "Criar Programa de Treinamento", description: "Criar programas baseados nos riscos identificados", priority: "high" });
      }
      break;
    case "DOCUMENTACAO":
      if (!state.hasPcmso) {
        actions.push({ actionType: "generate_pcmso", label: "Gerar Recomendações PCMSO", description: "Integrar riscos ao PCMSO", priority: "high" });
      }
      actions.push({ actionType: "generate_gro", label: "Gerar Documento GRO", description: "Gerenciamento de Riscos Ocupacionais consolidado (NR-01 §1.5)", priority: "high" });
      actions.push({ actionType: "generate_pdf", label: "Gerar Documentação PDF", description: "Exportar relatórios e laudos em PDF", priority: "medium" });
      break;
    case "CERTIFICACAO":
      if (state.complianceScore >= 80 && !state.hasCertificate) {
        actions.push({ actionType: "issue_certificate", label: "Emitir Certificado", description: `Score ${state.complianceScore}% — pronto para certificação`, priority: "urgent" });
      }
      break;
  }

  return actions;
}

function generateAlerts(
  milestones: any[],
  actionPlans: any[],
  complianceScore: number,
  responseCount: number,
  inviteCount: number
): string[] {
  const alerts: string[] = [];
  const now = new Date();

  // Check overdue milestones
  const overdueMilestones = milestones.filter(m => m.status !== "completed" && m.targetDate && new Date(m.targetDate) < now);
  if (overdueMilestones.length > 0) {
    alerts.push(`${overdueMilestones.length} milestone(s) em atraso`);
  }

  // Check approaching milestones (7 days)
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const approachingMilestones = milestones.filter(m => m.status !== "completed" && m.targetDate && new Date(m.targetDate) > now && new Date(m.targetDate) <= sevenDays);
  if (approachingMilestones.length > 0) {
    alerts.push(`${approachingMilestones.length} milestone(s) vencendo em 7 dias`);
  }

  // Check overdue action plans
  const overdueActions = actionPlans.filter(a => a.status !== "completed" && a.status !== "cancelled" && a.deadline && new Date(a.deadline) < now);
  if (overdueActions.length > 0) {
    alerts.push(`${overdueActions.length} ação(ões) do plano em atraso`);
  }

  // Low response rate
  if (inviteCount > 0 && responseCount < inviteCount * 0.3) {
    alerts.push(`Taxa de resposta baixa: ${Math.round((responseCount / inviteCount) * 100)}%`);
  }

  // Low compliance score near deadline
  if (complianceScore > 0 && complianceScore < 60) {
    alerts.push(`Score de conformidade baixo: ${complianceScore}%`);
  }

  return alerts;
}

// ============================================================================
// AUTO-TRANSITION: Detect phase completion and advance automatically
// ============================================================================

export interface PhaseTransition {
  fromPhase: NR01Phase;
  toPhase: NR01Phase;
  fromName: string;
  toName: string;
  progress: number;
}

/**
 * Checks if any phase just completed and returns transitions to apply.
 * Call this after any significant action (assessment created, report generated, etc.)
 */
export async function checkAutoTransitions(tenantId: string): Promise<PhaseTransition[]> {
  try {
    const status = await getNR01Status(tenantId);
    const transitions: PhaseTransition[] = [];

    // Find the first incomplete phase
    const firstIncomplete = status.phases.findIndex(p => p.status !== "completed");
    if (firstIncomplete <= 0) return transitions; // nothing to transition or at start

    // Check if the phase before the first incomplete was recently completed
    // (i.e., status changed from in_progress to completed)
    for (let i = 0; i < firstIncomplete; i++) {
      const phase = status.phases[i];
      if (phase.status === "completed" && phase.progress === 100) {
        const nextPhase = status.phases[i + 1];
        if (nextPhase && nextPhase.status !== "completed") {
          // Only report transition if next phase just started (was not_started or has low progress)
          if (nextPhase.status === "not_started" || nextPhase.progress === 0) {
            transitions.push({
              fromPhase: phase.phase,
              toPhase: nextPhase.phase,
              fromName: phase.name,
              toName: nextPhase.name,
              progress: status.overallProgress,
            });
          }
        }
      }
    }

    return transitions;
  } catch (error) {
    log.error("Error checking auto-transitions", { error: String(error), tenantId });
    return [];
  }
}

// Get strategy recommendation based on company profile
export function getCompanyStrategy(headcount: number, sector?: string): {
  assessmentType: string;
  focusDimensions: string[];
  recommendedTimeline: number; // days
  description: string;
} {
  const sectorLower = (sector || "").toLowerCase();
  const isHighRisk = ["saude", "saúde", "health", "seguranca", "segurança", "educacao", "educação", "social"].some(s => sectorLower.includes(s));

  if (headcount < 20) {
    return {
      assessmentType: "simplificada",
      focusDimensions: isHighRisk ? ["violence", "burnout", "demand"] : ["demand", "control", "leadership"],
      recommendedTimeline: 120,
      description: `Empresa pequena (${headcount} func.). Avaliação simplificada focando nos riscos mais críticos do setor.`,
    };
  } else if (headcount <= 100) {
    return {
      assessmentType: "completa",
      focusDimensions: isHighRisk ? ["violence", "burnout", "demand", "support", "mentalHealth"] : ["demand", "control", "leadership", "community", "meaning"],
      recommendedTimeline: 180,
      description: `Empresa média (${headcount} func.). COPSOQ-II completo com análise de todas as dimensões.`,
    };
  } else {
    return {
      assessmentType: "setorial",
      focusDimensions: ["demand", "control", "support", "leadership", "community", "meaning", "trust", "justice", "insecurity", "mentalHealth", "burnout", "violence"],
      recommendedTimeline: 210,
      description: `Empresa grande (${headcount} func.). COPSOQ-II por setor com plano detalhado por área.`,
    };
  }
}
