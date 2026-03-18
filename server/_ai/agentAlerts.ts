import { getDb } from "../db";
import { eq, and, desc, sql, lt, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { agentAlerts } from "../../drizzle/schema_agent";
import {
  complianceMilestones,
  complianceChecklist,
  actionPlans,
  copsoqAssessments,
  copsoqInvites,
  copsoqResponses,
  copsoqReports,
  riskAssessments,
  interventionPrograms,
  pcmsoRecommendations,
  complianceCertificates,
} from "../../drizzle/schema_nr01";
import { tenants } from "../../drizzle/schema";
import { log } from "../_core/logger";

export type AlertType =
  | "deadline_approaching"
  | "deadline_missed"
  | "low_response_rate"
  | "critical_risk_detected"
  | "phase_blocked"
  | "compliance_score_low"
  | "action_overdue"
  | "training_incomplete"
  | "document_missing"
  | "certification_ready";

interface AlertDef {
  type: AlertType;
  severity: "info" | "warning" | "high" | "critical";
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// Scan a tenant for all possible alerts and create new ones
export async function scanTenantAlerts(tenantId: string, companyId?: string): Promise<AlertDef[]> {
  const db = await getDb();
  if (!db) return [];

  const targetTenantId = companyId || tenantId;
  const newAlerts: AlertDef[] = [];
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    // 1. Check overdue milestones
    const overdueMilestones = await db.select().from(complianceMilestones).where(
      and(
        eq(complianceMilestones.tenantId, targetTenantId),
        sql`${complianceMilestones.status} != 'completed'`,
        sql`${complianceMilestones.targetDate} < ${now}`
      )
    );
    for (const m of overdueMilestones) {
      newAlerts.push({
        type: "deadline_missed",
        severity: "critical",
        title: `Prazo vencido: ${m.title}`,
        message: `O milestone "${m.title}" deveria ter sido concluído em ${new Date(m.targetDate).toLocaleDateString("pt-BR")}. Ação imediata necessária.`,
        metadata: { milestoneId: m.id, targetDate: m.targetDate },
      });
    }

    // 2. Check approaching milestones
    const approachingMilestones = await db.select().from(complianceMilestones).where(
      and(
        eq(complianceMilestones.tenantId, targetTenantId),
        sql`${complianceMilestones.status} != 'completed'`,
        sql`${complianceMilestones.targetDate} >= ${now}`,
        sql`${complianceMilestones.targetDate} <= ${sevenDays}`
      )
    );
    for (const m of approachingMilestones) {
      const daysLeft = Math.ceil((new Date(m.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      newAlerts.push({
        type: "deadline_approaching",
        severity: "warning",
        title: `Prazo em ${daysLeft} dias: ${m.title}`,
        message: `O milestone "${m.title}" vence em ${daysLeft} dia(s). Verifique o progresso.`,
        metadata: { milestoneId: m.id, daysLeft },
      });
    }

    // 3. Check overdue action plans
    const overdueActions = await db.select().from(actionPlans).where(
      and(
        eq(actionPlans.tenantId, targetTenantId),
        sql`${actionPlans.status} NOT IN ('completed', 'cancelled')`,
        sql`${actionPlans.deadline} IS NOT NULL`,
        sql`${actionPlans.deadline} < ${now}`
      )
    );
    if (overdueActions.length > 0) {
      newAlerts.push({
        type: "action_overdue",
        severity: "high",
        title: `${overdueActions.length} ação(ões) em atraso`,
        message: `Existem ${overdueActions.length} ações do plano com prazo vencido. Reavalie os cronogramas.`,
        metadata: { count: overdueActions.length, ids: overdueActions.map(a => a.id) },
      });
    }

    // 4. Check low response rate on active assessments
    const [latestAssessment] = await db.select().from(copsoqAssessments).where(
      and(eq(copsoqAssessments.tenantId, targetTenantId), eq(copsoqAssessments.status, "active"))
    ).orderBy(desc(copsoqAssessments.createdAt)).limit(1);

    if (latestAssessment) {
      const [inviteResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(copsoqInvites).where(eq(copsoqInvites.assessmentId, latestAssessment.id));
      const [responseResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(copsoqResponses).where(eq(copsoqResponses.assessmentId, latestAssessment.id));
      const invCount = inviteResult?.count || 0;
      const respCount = responseResult?.count || 0;
      if (invCount > 0 && respCount < invCount * 0.3) {
        const rate = Math.round((respCount / invCount) * 100);
        newAlerts.push({
          type: "low_response_rate",
          severity: "warning",
          title: `Taxa de resposta baixa: ${rate}%`,
          message: `A avaliação COPSOQ-II tem apenas ${respCount} de ${invCount} respostas (${rate}%). Envie lembretes para melhorar a taxa.`,
          metadata: { assessmentId: latestAssessment.id, responseRate: rate },
        });
      }
    }

    // 5. Check compliance score
    const checklistItems = await db.select().from(complianceChecklist).where(eq(complianceChecklist.tenantId, targetTenantId));
    if (checklistItems.length > 0) {
      const compliant = checklistItems.filter(i => i.status === "compliant").length;
      const partial = checklistItems.filter(i => i.status === "partial").length;
      const notApplicable = checklistItems.filter(i => i.status === "not_applicable").length;
      const applicable = checklistItems.length - notApplicable;
      const score = applicable > 0 ? Math.round(((compliant + partial * 0.5) / applicable) * 100) : 0;

      if (score >= 80) {
        // Check if certificate already exists
        const [cert] = await db.select().from(complianceCertificates).where(
          and(eq(complianceCertificates.tenantId, targetTenantId), eq(complianceCertificates.status, "active"))
        ).limit(1);
        if (!cert) {
          newAlerts.push({
            type: "certification_ready",
            severity: "info",
            title: "Pronto para certificação!",
            message: `O score de conformidade atingiu ${score}%. A empresa está apta a receber o certificado de conformidade NR-01.`,
            metadata: { complianceScore: score },
          });
        }
      } else if (score < 60 && score > 0) {
        newAlerts.push({
          type: "compliance_score_low",
          severity: "critical",
          title: `Score de conformidade baixo: ${score}%`,
          message: `O score de conformidade está em ${score}%. O mínimo para certificação é 80%. Ações urgentes necessárias.`,
          metadata: { complianceScore: score },
        });
      }
    }

    // 6. Check critical COPSOQ dimensions
    const [latestReport] = await db.select().from(copsoqReports).where(eq(copsoqReports.tenantId, targetTenantId)).orderBy(desc(copsoqReports.generatedAt)).limit(1);
    if (latestReport) {
      const dimensionScores = {
        demand: latestReport.averageDemandScore,
        burnout: latestReport.averageBurnoutScore,
        violence: latestReport.averageViolenceScore,
        mentalHealth: latestReport.averageMentalHealthScore,
        insecurity: latestReport.averageInsecurityScore,
      };
      const criticalDimensions = Object.entries(dimensionScores).filter(([_, score]) => score !== null && score < 30);
      if (criticalDimensions.length > 0) {
        const dimNames = criticalDimensions.map(([name]) => name).join(", ");
        newAlerts.push({
          type: "critical_risk_detected",
          severity: "critical",
          title: `Riscos críticos detectados`,
          message: `As dimensões ${dimNames} estão em nível crítico (< 30 pontos). Intervenção imediata recomendada.`,
          metadata: { dimensions: Object.fromEntries(criticalDimensions) },
        });
      }
    }

    // Persist new alerts (deduplicate by type + tenantId)
    for (const alert of newAlerts) {
      const [existing] = await db.select().from(agentAlerts).where(
        and(
          eq(agentAlerts.tenantId, targetTenantId),
          eq(agentAlerts.alertType, alert.type),
          eq(agentAlerts.dismissed, false)
        )
      ).limit(1);

      if (!existing) {
        await db.insert(agentAlerts).values({
          id: nanoid(),
          tenantId: targetTenantId,
          companyId: companyId || null,
          alertType: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          metadata: alert.metadata || null,
          dismissed: false,
          createdAt: new Date(),
        });
      }
    }
  } catch (error) {
    log.error("Error scanning tenant alerts", { error: String(error), tenantId: targetTenantId });
  }

  return newAlerts;
}
