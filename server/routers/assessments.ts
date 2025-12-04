import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { copsoqAssessments, copsoqResponses, copsoqReports, copsoqInvites } from "../../drizzle/schema_nr01";
import { sendBulkCopsoqInvites } from "../_core/email";

export const assessmentsRouter = router({
  // Criar nova avaliacao
  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        sectorId: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const id = `copsoq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(copsoqAssessments).values({
        id,
        tenantId: input.tenantId,
        sectorId: input.sectorId,
        title: input.title,
        description: input.description,
        assessmentDate: new Date(),
        status: "draft",
      });

      return { id };
    }),

  // Listar avaliacoes
  list: protectedProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(copsoqAssessments)
        .where(eq(copsoqAssessments.tenantId, input.tenantId));
    }),

  // Obter avaliacao por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(copsoqAssessments)
        .where(eq(copsoqAssessments.id, input.id))
        .limit(1);

      return result[0] || null;
    }),

  // Salvar resposta de avaliacao
  submitResponse: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        personId: z.string(),
        tenantId: z.string(),
        responses: z.record(z.string(), z.number()),
        ageGroup: z.string().optional(),
        gender: z.string().optional(),
        yearsInCompany: z.string().optional(),
        mentalHealthSupport: z.string().optional(),
        workplaceImprovement: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Calcular scores por dimensao
      const dimensionScores = calculateDimensionScores(input.responses as Record<string | number, number>);
      const overallRiskLevel = classifyOverallRisk(dimensionScores);

      const responseId = `copsoq_resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db.insert(copsoqResponses).values({
        id: responseId,
        assessmentId: input.assessmentId,
        personId: input.personId,
        tenantId: input.tenantId,
        responses: input.responses,
        ageGroup: input.ageGroup,
        gender: input.gender,
        yearsInCompany: input.yearsInCompany,
        mentalHealthSupport: input.mentalHealthSupport,
        workplaceImprovement: input.workplaceImprovement,
        demandScore: dimensionScores.demanda,
        controlScore: dimensionScores.controle,
        supportScore: dimensionScores.apoio,
        leadershipScore: dimensionScores.lideranca,
        communityScore: dimensionScores.comunidade,
        meaningScore: dimensionScores.significado,
        trustScore: dimensionScores.confianca,
        justiceScore: dimensionScores.justica,
        insecurityScore: dimensionScores.inseguranca,
        mentalHealthScore: dimensionScores.saudeMental,
        burnoutScore: dimensionScores.burnout,
        violenceScore: dimensionScores.violencia,
        overallRiskLevel,
        completedAt: new Date(),
      });

      return { responseId, overallRiskLevel, scores: dimensionScores };
    }),

  // Obter respostas de uma avaliacao
  getResponses: protectedProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(copsoqResponses)
        .where(eq(copsoqResponses.assessmentId, input.assessmentId));
    }),

  // Gerar relatorio
  generateReport: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        tenantId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const responses = await db
        .select()
        .from(copsoqResponses)
        .where(eq(copsoqResponses.assessmentId, input.assessmentId));

      if (responses.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhuma resposta encontrada",
        });
      }

      // Calcular medias
      const totalRespondents = responses.length;
      const avgDemandScore = Math.round(responses.reduce((sum, r) => sum + (r.demandScore || 0), 0) / totalRespondents);
      const avgControlScore = Math.round(responses.reduce((sum, r) => sum + (r.controlScore || 0), 0) / totalRespondents);
      const avgSupportScore = Math.round(responses.reduce((sum, r) => sum + (r.supportScore || 0), 0) / totalRespondents);
      const avgLeadershipScore = Math.round(responses.reduce((sum, r) => sum + (r.leadershipScore || 0), 0) / totalRespondents);
      const avgCommunityScore = Math.round(responses.reduce((sum, r) => sum + (r.communityScore || 0), 0) / totalRespondents);
      const avgMeaningScore = Math.round(responses.reduce((sum, r) => sum + (r.meaningScore || 0), 0) / totalRespondents);
      const avgTrustScore = Math.round(responses.reduce((sum, r) => sum + (r.trustScore || 0), 0) / totalRespondents);
      const avgJusticeScore = Math.round(responses.reduce((sum, r) => sum + (r.justiceScore || 0), 0) / totalRespondents);
      const avgInsecurityScore = Math.round(responses.reduce((sum, r) => sum + (r.insecurityScore || 0), 0) / totalRespondents);
      const avgMentalHealthScore = Math.round(responses.reduce((sum, r) => sum + (r.mentalHealthScore || 0), 0) / totalRespondents);
      const avgBurnoutScore = Math.round(responses.reduce((sum, r) => sum + (r.burnoutScore || 0), 0) / totalRespondents);
      const avgViolenceScore = Math.round(responses.reduce((sum, r) => sum + (r.violenceScore || 0), 0) / totalRespondents);

      // Contar distribuicao de risco
      const lowRiskCount = responses.filter((r) => r.overallRiskLevel === "low").length;
      const mediumRiskCount = responses.filter((r) => r.overallRiskLevel === "medium").length;
      const highRiskCount = responses.filter((r) => r.overallRiskLevel === "high").length;
      const criticalRiskCount = responses.filter((r) => r.overallRiskLevel === "critical").length;

      const reportId = `copsoq_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db.insert(copsoqReports).values({
        id: reportId,
        assessmentId: input.assessmentId,
        tenantId: input.tenantId,
        title: `Relatorio COPSOQ-II - ${new Date().toLocaleDateString("pt-BR")}`,
        totalRespondents,
        responseRate: 100,
        averageDemandScore: avgDemandScore,
        averageControlScore: avgControlScore,
        averageSupportScore: avgSupportScore,
        averageLeadershipScore: avgLeadershipScore,
        averageCommunityScore: avgCommunityScore,
        averageMeaningScore: avgMeaningScore,
        averageTrustScore: avgTrustScore,
        averageJusticeScore: avgJusticeScore,
        averageInsecurityScore: avgInsecurityScore,
        averageMentalHealthScore: avgMentalHealthScore,
        averageBurnoutScore: avgBurnoutScore,
        averageViolenceScore: avgViolenceScore,
        lowRiskCount,
        mediumRiskCount,
        highRiskCount,
        criticalRiskCount,
        generatedAt: new Date(),
      });

      return { reportId };
    }),

  // Obter relatorio
  getReport: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(copsoqReports)
        .where(eq(copsoqReports.id, input.reportId))
        .limit(1);

      return result[0] || null;
    }),

  // Listar convites de avaliacao
  listInvites: protectedProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(copsoqInvites)
        .where(eq(copsoqInvites.tenantId, input.tenantId));
    }),

  // Enviar convites em lote
  sendInvites: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        assessmentTitle: z.string(),
        invitees: z.array(
          z.object({
            email: z.string().email(),
            name: z.string(),
            position: z.string().optional(),
            sector: z.string().optional(),
          })
        ),
        expiresIn: z.number().default(7),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Criar avaliacao
      const assessmentId = `copsoq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await db.insert(copsoqAssessments).values({
        id: assessmentId,
        tenantId: input.tenantId,
        title: input.assessmentTitle,
        assessmentDate: new Date(),
        status: "in_progress",
      });

      // Criar convites
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresIn);

      const invitesToSend = [];
      for (const invitee of input.invitees) {
        const inviteToken = crypto.randomBytes(32).toString("hex");
        const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await db.insert(copsoqInvites).values({
          id: inviteId,
          assessmentId,
          tenantId: input.tenantId,
          respondentEmail: invitee.email,
          respondentName: invitee.name,
          respondentPosition: invitee.position,
          sectorId: invitee.sector,
          inviteToken,
          status: "pending",
          expiresAt,
        });

        invitesToSend.push({
          respondentEmail: invitee.email,
          respondentName: invitee.name,
          assessmentTitle: input.assessmentTitle,
          inviteToken,
          expiresIn: input.expiresIn,
        });
      }

      // Enviar emails em lote
      const result = await sendBulkCopsoqInvites(invitesToSend);

      // Atualizar status dos convites enviados
      for (const invitee of input.invitees) {
        await db
          .update(copsoqInvites)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(copsoqInvites.respondentEmail, invitee.email));
      }

      return {
        assessmentId,
        totalInvites: input.invitees.length,
        successfulSends: result.success,
        failedSends: result.failed,
      };
    }),
});

// Funcoes auxiliares
function calculateDimensionScores(responses: Record<string | number, number>) {
  const dimensions = {
    demanda: [1, 2, 3, 4, 5],
    controle: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    apoio: [16, 17, 18, 19, 20],
    lideranca: [21, 22, 23, 24, 25, 26, 30, 31, 32, 36, 37, 38, 39],
    comunidade: [27, 28, 29, 33, 34, 35],
    significado: [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
    confianca: [40, 41, 42, 43, 44, 45],
    justica: [46, 47, 48],
    inseguranca: [60],
    saudeMental: [61, 65, 66, 67, 68, 69, 70, 71, 72],
    burnout: [62, 63, 64],
    violencia: [73, 74, 75, 76],
  };

  const scores: Record<string, number> = {};

  for (const [dimension, questions] of Object.entries(dimensions)) {
    const values = questions
      .map((q) => responses[q] || 0)
      .filter((v) => v > 0);
    
    if (values.length === 0) {
      scores[dimension] = 0;
    } else {
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      scores[dimension] = Math.round(average * 20); // Escala 0-100
    }
  }

  return scores as Record<string, number>;
}

function classifyOverallRisk(
  scores: Record<string, number>
): "low" | "medium" | "high" | "critical" {
  const criticalFactors = [
    scores.demanda > 75,
    scores.controle < 25,
    scores.apoio < 25,
    scores.saudeMental > 75,
    scores.burnout > 75,
    scores.violencia > 50,
  ].filter(Boolean).length;

  if (criticalFactors >= 3) return "critical";
  if (criticalFactors >= 2) return "high";
  if (criticalFactors >= 1) return "medium";
  return "low";
}
