import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  copsoqReports,
  copsoqResponses,
  copsoqAssessments,
  mentalHealthIndicators,
  riskAssessments,
  riskAssessmentItems,
  actionPlans,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export const psychosocialDashboardRouter = router({
  // Resumo geral do dashboard psicossocial
  getSummary: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Buscar último relatório COPSOQ
      const [latestReport] = await db
        .select()
        .from(copsoqReports)
        .where(eq(copsoqReports.tenantId, ctx.tenantId!))
        .orderBy(desc(copsoqReports.generatedAt))
        .limit(1);

      if (!latestReport) {
        return {
          dimensions: null,
          totalRespondents: 0,
          responseRate: 0,
          riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
          overallRiskLevel: "unknown",
        };
      }

      const dimensions = {
        demand: latestReport.averageDemandScore,
        control: latestReport.averageControlScore,
        support: latestReport.averageSupportScore,
        leadership: latestReport.averageLeadershipScore,
        community: latestReport.averageCommunityScore,
        meaning: latestReport.averageMeaningScore,
        trust: latestReport.averageTrustScore,
        justice: latestReport.averageJusticeScore,
        insecurity: latestReport.averageInsecurityScore,
        mentalHealth: latestReport.averageMentalHealthScore,
        burnout: latestReport.averageBurnoutScore,
        violence: latestReport.averageViolenceScore,
      };

      const riskDistribution = {
        low: latestReport.lowRiskCount || 0,
        medium: latestReport.mediumRiskCount || 0,
        high: latestReport.highRiskCount || 0,
        critical: latestReport.criticalRiskCount || 0,
      };

      // Determinar nível geral de risco
      const total =
        riskDistribution.low +
        riskDistribution.medium +
        riskDistribution.high +
        riskDistribution.critical;
      let overallRiskLevel = "low";
      if (total > 0) {
        const criticalHighPercent =
          ((riskDistribution.critical + riskDistribution.high) / total) * 100;
        if (criticalHighPercent > 50) overallRiskLevel = "critical";
        else if (criticalHighPercent > 30) overallRiskLevel = "high";
        else if (criticalHighPercent > 15) overallRiskLevel = "medium";
      }

      return {
        dimensions,
        totalRespondents: latestReport.totalRespondents || 0,
        responseRate: latestReport.responseRate || 0,
        riskDistribution,
        overallRiskLevel,
      };
    }),

  // Tendências ao longo do tempo
  getTrends: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        periods: z.number().default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const reports = await db
        .select()
        .from(copsoqReports)
        .where(eq(copsoqReports.tenantId, ctx.tenantId!))
        .orderBy(desc(copsoqReports.generatedAt))
        .limit(input.periods);

      return reports
        .reverse()
        .map((r) => ({
          period: r.generatedAt,
          dimensions: {
            demand: r.averageDemandScore,
            control: r.averageControlScore,
            support: r.averageSupportScore,
            leadership: r.averageLeadershipScore,
            community: r.averageCommunityScore,
            meaning: r.averageMeaningScore,
            trust: r.averageTrustScore,
            justice: r.averageJusticeScore,
            insecurity: r.averageInsecurityScore,
            mentalHealth: r.averageMentalHealthScore,
            burnout: r.averageBurnoutScore,
            violence: r.averageViolenceScore,
          },
        }));
    }),

  // Comparação por setor
  getSectorComparison: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Buscar relatórios agrupados por assessmentId e depois por setor via assessment
      const reports = await db
        .select({
          report: copsoqReports,
          sectorId: copsoqAssessments.sectorId,
        })
        .from(copsoqReports)
        .innerJoin(
          copsoqAssessments,
          eq(copsoqReports.assessmentId, copsoqAssessments.id)
        )
        .where(eq(copsoqReports.tenantId, ctx.tenantId!))
        .orderBy(desc(copsoqReports.generatedAt));

      // Agrupar por setor
      const sectorMap: Record<string, any[]> = {};
      for (const { report, sectorId } of reports) {
        const key = sectorId || "geral";
        if (!sectorMap[key]) sectorMap[key] = [];
        sectorMap[key].push(report);
      }

      return Object.entries(sectorMap).map(([sectorId, sectorReports]) => {
        const count = sectorReports.length;
        const avg = (field: keyof typeof sectorReports[0]) => {
          const sum = sectorReports.reduce(
            (acc, r) => acc + ((r as any)[field] || 0),
            0
          );
          return Math.round(sum / count);
        };

        return {
          sectorId,
          reportCount: count,
          dimensions: {
            demand: avg("averageDemandScore"),
            control: avg("averageControlScore"),
            support: avg("averageSupportScore"),
            leadership: avg("averageLeadershipScore"),
            community: avg("averageCommunityScore"),
            meaning: avg("averageMeaningScore"),
            trust: avg("averageTrustScore"),
            justice: avg("averageJusticeScore"),
            insecurity: avg("averageInsecurityScore"),
            mentalHealth: avg("averageMentalHealthScore"),
            burnout: avg("averageBurnoutScore"),
            violence: avg("averageViolenceScore"),
          },
        };
      });
    }),

  // Alertas de dimensões críticas
  getAlerts: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const [latestReport] = await db
        .select()
        .from(copsoqReports)
        .where(eq(copsoqReports.tenantId, ctx.tenantId!))
        .orderBy(desc(copsoqReports.generatedAt))
        .limit(1);

      if (!latestReport) return [];

      const dimensionScores = [
        { name: "demand", label: "Demanda de Trabalho", score: latestReport.averageDemandScore },
        { name: "control", label: "Controle", score: latestReport.averageControlScore },
        { name: "support", label: "Apoio Social", score: latestReport.averageSupportScore },
        { name: "leadership", label: "Liderança", score: latestReport.averageLeadershipScore },
        { name: "community", label: "Comunidade", score: latestReport.averageCommunityScore },
        { name: "meaning", label: "Significado do Trabalho", score: latestReport.averageMeaningScore },
        { name: "trust", label: "Confiança", score: latestReport.averageTrustScore },
        { name: "justice", label: "Justiça", score: latestReport.averageJusticeScore },
        { name: "insecurity", label: "Insegurança no Trabalho", score: latestReport.averageInsecurityScore },
        { name: "mentalHealth", label: "Saúde Mental", score: latestReport.averageMentalHealthScore },
        { name: "burnout", label: "Burnout", score: latestReport.averageBurnoutScore },
        { name: "violence", label: "Violência e Assédio", score: latestReport.averageViolenceScore },
      ];

      // Dimensões com score abaixo de 40 são críticas
      return dimensionScores
        .filter((d) => d.score !== null && d.score !== undefined && d.score < 40)
        .map((d) => ({
          dimension: d.name,
          label: d.label,
          score: d.score,
          severity: "critical",
        }));
    }),

  // Tendências históricas com deltas entre avaliações
  getHistoricalTrends: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const reports = await db
        .select()
        .from(copsoqReports)
        .where(eq(copsoqReports.tenantId, ctx.tenantId!))
        .orderBy(copsoqReports.generatedAt);

      const dimensionKeys = [
        "averageDemandScore",
        "averageControlScore",
        "averageSupportScore",
        "averageLeadershipScore",
        "averageCommunityScore",
        "averageMeaningScore",
        "averageTrustScore",
        "averageJusticeScore",
        "averageInsecurityScore",
        "averageMentalHealthScore",
        "averageBurnoutScore",
        "averageViolenceScore",
      ] as const;

      return reports.map((report, index) => {
        const prev = index > 0 ? reports[index - 1] : null;
        const deltas: Record<string, number | null> = {};

        for (const key of dimensionKeys) {
          if (prev && report[key] !== null && prev[key] !== null) {
            deltas[key] = (report[key] || 0) - (prev[key] || 0);
          } else {
            deltas[key] = null;
          }
        }

        return {
          reportId: report.id,
          generatedAt: report.generatedAt,
          title: report.title,
          totalRespondents: report.totalRespondents,
          dimensions: {
            demand: report.averageDemandScore,
            control: report.averageControlScore,
            support: report.averageSupportScore,
            leadership: report.averageLeadershipScore,
            community: report.averageCommunityScore,
            meaning: report.averageMeaningScore,
            trust: report.averageTrustScore,
            justice: report.averageJusticeScore,
            insecurity: report.averageInsecurityScore,
            mentalHealth: report.averageMentalHealthScore,
            burnout: report.averageBurnoutScore,
            violence: report.averageViolenceScore,
          },
          deltas,
        };
      });
    }),

  // Relatório executivo consolidado
  getExecutiveReport: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Último relatório COPSOQ
      const [latestReport] = await db
        .select()
        .from(copsoqReports)
        .where(eq(copsoqReports.tenantId, ctx.tenantId!))
        .orderBy(desc(copsoqReports.generatedAt))
        .limit(1);

      // Último indicador de saúde mental
      const [latestIndicator] = await db
        .select()
        .from(mentalHealthIndicators)
        .where(eq(mentalHealthIndicators.tenantId, ctx.tenantId!))
        .orderBy(desc(mentalHealthIndicators.createdAt))
        .limit(1);

      // Contagem de avaliações de risco
      const riskAssessmentCounts = await db
        .select({
          total: sql<number>`COUNT(*)`,
          completed: sql<number>`SUM(CASE WHEN ${riskAssessments.status} = 'completed' THEN 1 ELSE 0 END)`,
        })
        .from(riskAssessments)
        .where(eq(riskAssessments.tenantId, ctx.tenantId!));

      // Taxa de conclusão de planos de ação
      const actionPlanCounts = await db
        .select({
          total: sql<number>`COUNT(*)`,
          completed: sql<number>`SUM(CASE WHEN ${actionPlans.status} = 'completed' THEN 1 ELSE 0 END)`,
        })
        .from(actionPlans)
        .where(eq(actionPlans.tenantId, ctx.tenantId!));

      const apTotal = actionPlanCounts[0]?.total || 0;
      const apCompleted = actionPlanCounts[0]?.completed || 0;
      const actionPlanCompletionRate =
        apTotal > 0 ? Math.round((apCompleted / apTotal) * 100) : 0;

      return {
        copsoqSummary: latestReport
          ? {
              title: latestReport.title,
              generatedAt: latestReport.generatedAt,
              totalRespondents: latestReport.totalRespondents,
              responseRate: latestReport.responseRate,
              riskDistribution: {
                low: latestReport.lowRiskCount || 0,
                medium: latestReport.mediumRiskCount || 0,
                high: latestReport.highRiskCount || 0,
                critical: latestReport.criticalRiskCount || 0,
              },
            }
          : null,
        mentalHealthIndicators: latestIndicator || null,
        riskAssessments: {
          total: riskAssessmentCounts[0]?.total || 0,
          completed: riskAssessmentCounts[0]?.completed || 0,
        },
        actionPlans: {
          total: apTotal,
          completed: apCompleted,
          completionRate: actionPlanCompletionRate,
        },
      };
    }),

  // Criar/atualizar indicadores de saúde mental
  updateIndicators: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        sectorId: z.string().optional(),
        period: z.string(),
        absenteeismRate: z.number().optional(),
        turnoverRate: z.number().optional(),
        burnoutCases: z.number().optional(),
        stressLevel: z.number().optional(),
        engagementScore: z.number().optional(),
        satisfactionScore: z.number().optional(),
        incidentsReported: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { tenantId, sectorId, period, ...scores } = input;

      // Verificar se já existe indicador para este tenant+period
      const [existing] = await db
        .select()
        .from(mentalHealthIndicators)
        .where(
          and(
            eq(mentalHealthIndicators.tenantId, ctx.tenantId!),
            eq(mentalHealthIndicators.period, period)
          )
        )
        .limit(1);

      if (existing) {
        await db
          .update(mentalHealthIndicators)
          .set(scores)
          .where(eq(mentalHealthIndicators.id, existing.id));
        return { id: existing.id, updated: true };
      }

      const id = nanoid();
      await db.insert(mentalHealthIndicators).values({
        id,
        tenantId: ctx.tenantId!,
        sectorId: sectorId || null,
        period,
        ...scores,
      });

      return { id, updated: false };
    }),
});
