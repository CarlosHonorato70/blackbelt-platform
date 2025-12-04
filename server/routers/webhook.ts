import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { copsoqInvites, copsoqResponses } from "../../drizzle/schema_nr01";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";

/**
 * Webhook para rastrear conclusão de COPSOQ-II
 * Quando um colaborador conclui o formulário, enviamos uma requisição para este webhook
 * com o token do convite e os dados da resposta
 */

export const webhookRouter = router({
  // Webhook para receber notificação de conclusão de COPSOQ-II
  completeCopsoq: publicProcedure
    .input(
      z.object({
        inviteToken: z.string(),
        assessmentId: z.string(),
        tenantId: z.string(),
        responses: z.record(z.string(), z.number()),
        ageGroup: z.string().optional(),
        gender: z.string().optional(),
        yearsInCompany: z.string().optional(),
        mentalHealthSupport: z.string().optional(),
        workplaceImprovement: z.string().optional(),
        signature: z.string(), // HMAC para verificar autenticidade
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificar assinatura do webhook (HMAC-SHA256)
      const webhookSecret = process.env.WEBHOOK_SECRET || "default-secret";
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(
          JSON.stringify({
            inviteToken: input.inviteToken,
            assessmentId: input.assessmentId,
            tenantId: input.tenantId,
          })
        )
        .digest("hex");

      if (input.signature !== expectedSignature) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Assinatura de webhook inválida",
        });
      }

      // Buscar o convite pelo token
      const invites = await db
        .select()
        .from(copsoqInvites)
        .where(eq(copsoqInvites.inviteToken, input.inviteToken));

      if (invites.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite não encontrado",
        });
      }

      const invite = invites[0];

      // Verificar se o convite ainda é válido
      if (invite.expiresAt && new Date() > invite.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Convite expirado",
        });
      }

      // Verificar se já foi respondido
      if (invite.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este convite já foi respondido",
        });
      }

      // Calcular scores por dimensão
      const dimensionScores = calculateDimensionScores(input.responses);
      const overallRiskLevel = classifyOverallRisk(dimensionScores);

      // Salvar resposta
      const responseId = `copsoq_resp_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await db.insert(copsoqResponses).values({
        id: responseId,
        assessmentId: input.assessmentId,
        personId: invite.id,
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

      // Atualizar status do convite para 'completed'
      await db
        .update(copsoqInvites)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(copsoqInvites.inviteToken, input.inviteToken));

      return {
        success: true,
        responseId,
        message: "Resposta registrada com sucesso",
        overallRiskLevel,
        scores: dimensionScores,
      };
    }),

  // Verificar status de um convite
  checkInviteStatus: publicProcedure
    .input(z.object({ inviteToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const invites = await db
        .select()
        .from(copsoqInvites)
        .where(eq(copsoqInvites.inviteToken, input.inviteToken));

      if (invites.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite não encontrado",
        });
      }

      const invite = invites[0];

      return {
        id: invite.id,
        respondentName: invite.respondentName,
        respondentEmail: invite.respondentEmail,
        status: invite.status,
        expiresAt: invite.expiresAt,
        sentAt: invite.sentAt,
        completedAt: invite.completedAt,
        isExpired: invite.expiresAt ? new Date() > invite.expiresAt : false,
      };
    }),

  // Listar respostas de uma avaliação (para dashboard de rastreamento)
  listResponses: publicProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        tenantId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Buscar todos os convites da avaliação
      const invites = await db
        .select()
        .from(copsoqInvites)
        .where(eq(copsoqInvites.assessmentId, input.assessmentId));

      // Buscar todas as respostas da avaliação
      const responses = await db
        .select()
        .from(copsoqResponses)
        .where(eq(copsoqResponses.assessmentId, input.assessmentId));

      // Combinar dados
      const result = invites.map((invite) => {
        const response = responses.find((r) => r.personId === invite.id);

        return {
          inviteId: invite.id,
          respondentName: invite.respondentName,
          respondentEmail: invite.respondentEmail,
          respondentPosition: invite.respondentPosition,
          status: invite.status,
          sentAt: invite.sentAt,
          completedAt: invite.completedAt,
          expiresAt: invite.expiresAt,
          isExpired: invite.expiresAt ? new Date() > invite.expiresAt : false,
          response: response
            ? {
                responseId: response.id,
                overallRiskLevel: response.overallRiskLevel,
                demandScore: response.demandScore,
                controlScore: response.controlScore,
                supportScore: response.supportScore,
                completedAt: response.completedAt,
              }
            : null,
        };
      });

      return result;
    }),

  // Obter estatísticas de resposta
  getResponseStats: publicProcedure
    .input(
      z.object({
        assessmentId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        return {
          totalInvites: 0,
          responded: 0,
          pending: 0,
          expired: 0,
          responseRate: 0,
        };

      const invites = await db
        .select()
        .from(copsoqInvites)
        .where(eq(copsoqInvites.assessmentId, input.assessmentId));

      const totalInvites = invites.length;
      const responded = invites.filter((i) => i.status === "completed").length;
      const pending = invites.filter((i) => i.status === "pending").length;
      const expired = invites.filter(
        (i) => i.expiresAt && new Date() > i.expiresAt
      ).length;
      const responseRate =
        totalInvites > 0 ? Math.round((responded / totalInvites) * 100) : 0;

      return {
        totalInvites,
        responded,
        pending,
        expired,
        responseRate,
      };
    }),
});

// Funções auxiliares
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
