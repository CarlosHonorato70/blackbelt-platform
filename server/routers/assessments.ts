import crypto from "crypto";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { protectedProcedure, router, tenantProcedure, subscribedProcedure, consultantProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  copsoqAssessments,
  copsoqResponses,
  copsoqReports,
  copsoqInvites,
} from "../../drizzle/schema_nr01";
import { subscriptions, plans, copsoqBillingEvents, tenantCredits, creditTransactions, pendingCopsoqPayments } from "../../drizzle/schema";
import { sendBulkCopsoqInvites, sendEmail } from "../_core/email";
import { log } from "../_core/logger";
import { updateAsaasSubscriptionValue } from "./asaas";
import { users } from "../../drizzle/schema";

export const assessmentsRouter = router({
  // Criar nova avaliacao (somente consultor/admin)
  create: consultantProcedure
    .input(
      z.object({
        
        sectorId: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const id = `copsoq_${Date.now()}_${nanoid(8)}`;
      await db.insert(copsoqAssessments).values({
        id,
        tenantId: ctx.tenantId!,
        sectorId: input.sectorId,
        title: input.title,
        description: input.description,
        assessmentDate: new Date(),
        status: "draft",
      });

      return { id };
    }),

  // Listar avaliacoes
  list: tenantProcedure
    .input(z.object({  }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(copsoqAssessments)
        .where(eq(copsoqAssessments.tenantId, ctx.tenantId!));
    }),

  // Obter avaliacao por ID
  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(copsoqAssessments)
        .where(and(eq(copsoqAssessments.id, input.id), eq(copsoqAssessments.tenantId, ctx.tenantId!)))
        .limit(1);

      return result[0] || null;
    }),

  // Salvar resposta de avaliacao
  submitResponse: tenantProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        personId: z.string(),
        
        responses: z.record(z.string(), z.number()),
        ageGroup: z.string().optional(),
        gender: z.string().optional(),
        yearsInCompany: z.string().optional(),
        mentalHealthSupport: z.string().optional(),
        workplaceImprovement: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Calcular scores por dimensao
      const dimensionScores = calculateDimensionScores(
        input.responses as Record<string | number, number>
      );
      const overallRiskLevel = classifyOverallRisk(dimensionScores);

      const responseId = `copsoq_resp_${Date.now()}_${nanoid(8)}`;

      await db.insert(copsoqResponses).values({
        id: responseId,
        assessmentId: input.assessmentId,
        personId: input.personId,
        tenantId: ctx.tenantId!,
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
  getResponses: tenantProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(copsoqResponses)
        .where(and(
          eq(copsoqResponses.assessmentId, input.assessmentId),
          eq(copsoqResponses.tenantId, ctx.tenantId!)
        ));
    }),

  // Gerar relatorio
  generateReport: tenantProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const responses = await db
        .select()
        .from(copsoqResponses)
        .where(and(
          eq(copsoqResponses.assessmentId, input.assessmentId),
          eq(copsoqResponses.tenantId, ctx.tenantId!)
        ));

      if (responses.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhuma resposta encontrada",
        });
      }

      // Calcular medias
      const totalRespondents = responses.length;
      const avgDemandScore = Math.round(
        responses.reduce((sum, r) => sum + (r.demandScore || 0), 0) /
          totalRespondents
      );
      const avgControlScore = Math.round(
        responses.reduce((sum, r) => sum + (r.controlScore || 0), 0) /
          totalRespondents
      );
      const avgSupportScore = Math.round(
        responses.reduce((sum, r) => sum + (r.supportScore || 0), 0) /
          totalRespondents
      );
      const avgLeadershipScore = Math.round(
        responses.reduce((sum, r) => sum + (r.leadershipScore || 0), 0) /
          totalRespondents
      );
      const avgCommunityScore = Math.round(
        responses.reduce((sum, r) => sum + (r.communityScore || 0), 0) /
          totalRespondents
      );
      const avgMeaningScore = Math.round(
        responses.reduce((sum, r) => sum + (r.meaningScore || 0), 0) /
          totalRespondents
      );
      const avgTrustScore = Math.round(
        responses.reduce((sum, r) => sum + (r.trustScore || 0), 0) /
          totalRespondents
      );
      const avgJusticeScore = Math.round(
        responses.reduce((sum, r) => sum + (r.justiceScore || 0), 0) /
          totalRespondents
      );
      const avgInsecurityScore = Math.round(
        responses.reduce((sum, r) => sum + (r.insecurityScore || 0), 0) /
          totalRespondents
      );
      const avgMentalHealthScore = Math.round(
        responses.reduce((sum, r) => sum + (r.mentalHealthScore || 0), 0) /
          totalRespondents
      );
      const avgBurnoutScore = Math.round(
        responses.reduce((sum, r) => sum + (r.burnoutScore || 0), 0) /
          totalRespondents
      );
      const avgViolenceScore = Math.round(
        responses.reduce((sum, r) => sum + (r.violenceScore || 0), 0) /
          totalRespondents
      );

      // Contar distribuicao de risco
      const lowRiskCount = responses.filter(
        r => r.overallRiskLevel === "low"
      ).length;
      const mediumRiskCount = responses.filter(
        r => r.overallRiskLevel === "medium"
      ).length;
      const highRiskCount = responses.filter(
        r => r.overallRiskLevel === "high"
      ).length;
      const criticalRiskCount = responses.filter(
        r => r.overallRiskLevel === "critical"
      ).length;

      const reportId = `copsoq_report_${Date.now()}_${nanoid(8)}`;

      await db.insert(copsoqReports).values({
        id: reportId,
        assessmentId: input.assessmentId,
        tenantId: ctx.tenantId!,
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
  getReport: tenantProcedure
    .input(z.object({ reportId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(copsoqReports)
        .where(and(
          eq(copsoqReports.id, input.reportId),
          eq(copsoqReports.tenantId, ctx.tenantId!)
        ))
        .limit(1);

      return result[0] || null;
    }),

  // Listar convites de avaliacao
  listInvites: tenantProcedure
    .input(z.object({  }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(copsoqInvites)
        .where(eq(copsoqInvites.tenantId, ctx.tenantId!));
    }),

  // Enviar convites em lote (somente consultor/admin)
  sendInvites: consultantProcedure
    .input(
      z.object({
        
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
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const inviteCount = input.invitees.length;

      // ========== BILLING CHECK: Verificar excedentes ANTES de enviar ==========
      const [sub] = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, ctx.tenantId!))
        .limit(1);

      let exceedentCount = 0;
      let chargeAmount = 0;
      let pricePerInvite = 0;
      let included = 0;

      if (sub) {
        const [plan] = await db.select()
          .from(plans)
          .where(eq(plans.id, sub.planId))
          .limit(1);

        const sentBefore = sub.copsoqInvitesSent || 0;
        const sentAfter = sentBefore + inviteCount;
        included = plan?.copsoqInvitesIncluded || 0;
        pricePerInvite = plan?.pricePerCopsoqInvite || 0;

        if (sentAfter > included && pricePerInvite > 0) {
          const excedentsBefore = Math.max(0, sentBefore - included);
          const excedentsAfter = Math.max(0, sentAfter - included);
          exceedentCount = excedentsAfter - excedentsBefore;
          chargeAmount = exceedentCount * pricePerInvite;
        }
      }

      // Email alert at 80% of included invites
      if (sub && included > 0) {
        const sentBefore = sub.copsoqInvitesSent || 0;
        const sentAfter = sentBefore + inviteCount;
        const pctBefore = Math.round((sentBefore / included) * 100);
        const pctAfter = Math.round((sentAfter / included) * 100);
        if (pctBefore < 80 && pctAfter >= 80 && pctAfter < 100) {
          try {
            const [owner] = await db.select().from(users).where(eq(users.tenantId, ctx.tenantId!)).limit(1);
            if (owner?.email) {
              await sendEmail({
                to: owner.email,
                subject: "[BlackBelt] Voce atingiu 80% dos convites COPSOQ inclusos",
                html: `<h2>Alerta de Uso — BlackBelt Platform</h2>
                  <p>Voce utilizou <strong>${sentAfter} de ${included}</strong> convites COPSOQ inclusos no seu plano.</p>
                  <p>Convites excedentes serao cobrados a <strong>R$ ${(pricePerInvite / 100).toFixed(2)}</strong> cada.</p>
                  <p>Considere comprar creditos pre-pagos para evitar interrupcoes.</p>`,
              });
              log.info(`[Billing] 80% alert sent to ${owner.email}`);
            }
          } catch { /* don't fail on email error */ }
        }
      }

      // If there are exceedents, check for credits or block
      if (chargeAmount > 0) {
        const [credits] = await db.select()
          .from(tenantCredits)
          .where(eq(tenantCredits.tenantId, ctx.tenantId!))
          .limit(1);

        const creditBalance = credits?.balance || 0;

        if (creditBalance >= chargeAmount) {
          // Has enough credits — deduct and continue
          await db.update(tenantCredits)
            .set({ balance: creditBalance - chargeAmount, updatedAt: new Date() })
            .where(eq(tenantCredits.tenantId, ctx.tenantId!));

          await db.insert(creditTransactions).values({
            id: nanoid(),
            tenantId: ctx.tenantId!,
            type: "usage",
            amount: -chargeAmount,
            description: `${exceedentCount} convites COPSOQ excedentes — ${input.assessmentTitle}`,
            referenceId: null,
          });

          log.info(`[Billing] Credits used: tenant=${ctx.tenantId} R$${(chargeAmount / 100).toFixed(2)} for ${exceedentCount} exceedents`);
        } else {
          // NOT enough credits — BLOCK and create pending payment
          const pendingId = nanoid();
          const expiresAt = new Date();
          expiresAt.setMinutes(expiresAt.getMinutes() + 30);

          await db.insert(pendingCopsoqPayments).values({
            id: pendingId,
            tenantId: ctx.tenantId!,
            assessmentTitle: input.assessmentTitle,
            invitees: JSON.stringify(input.invitees),
            totalInvites: inviteCount,
            freeInvites: Math.max(0, inviteCount - exceedentCount),
            exceedentCount,
            chargeAmount,
            paymentStatus: "pending",
            expiresAt,
          });

          log.info(`[Billing] BLOCKED: tenant=${ctx.tenantId} ${exceedentCount} exceedents, R$${(chargeAmount / 100).toFixed(2)} required`);

          return {
            blocked: true,
            pendingPaymentId: pendingId,
            totalInvites: inviteCount,
            freeInvites: Math.max(0, inviteCount - exceedentCount),
            exceedentCount,
            chargeAmount,
            pricePerInvite,
            creditBalance,
            message: `${exceedentCount} convite(s) excedente(s). Valor: R$ ${(chargeAmount / 100).toFixed(2)}. Pague para liberar o envio.`,
          };
        }
      }

      // ========== ENVIO: Criar avaliação e enviar convites ==========
      const assessmentId = `copsoq_${Date.now()}_${nanoid(8)}`;
      await db.insert(copsoqAssessments).values({
        id: assessmentId,
        tenantId: ctx.tenantId!,
        title: input.assessmentTitle,
        assessmentDate: new Date(),
        status: "in_progress",
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresIn);

      const invitesToSend = [];
      for (const invitee of input.invitees) {
        const inviteToken = crypto.randomBytes(32).toString("hex");
        const inviteId = `invite_${Date.now()}_${nanoid(8)}`;

        await db.insert(copsoqInvites).values({
          id: inviteId,
          assessmentId,
          tenantId: ctx.tenantId!,
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
          tenantId: ctx.tenantId!,
        });
      }

      const result = await sendBulkCopsoqInvites(invitesToSend);

      for (const invitee of input.invitees) {
        await db
          .update(copsoqInvites)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(copsoqInvites.respondentEmail, invitee.email));
      }

      // ========== BILLING: Atualizar contadores ==========
      if (sub) {
        const sentBefore = sub.copsoqInvitesSent || 0;
        const sentAfter = sentBefore + inviteCount;
        const totalExtra = (sub.copsoqExtraCharges || 0) + chargeAmount;
        const totalPrice = (sub.currentPrice || 0) + totalExtra;

        await db.update(subscriptions)
          .set({ copsoqInvitesSent: sentAfter, copsoqExtraCharges: totalExtra, totalPrice, updatedAt: new Date() })
          .where(eq(subscriptions.id, sub.id));

        await db.insert(copsoqBillingEvents).values({
          id: nanoid(), tenantId: ctx.tenantId!, subscriptionId: sub.id,
          inviteId: assessmentId, invitesSentBefore: sentBefore, invitesSentAfter: sentAfter, chargeAmount,
        });
      }

      return {
        blocked: false,
        assessmentId,
        totalInvites: inviteCount,
        successfulSends: result.success,
        failedSends: result.failed,
      };
    }),

  // Cancelar convite
  cancelInvite: tenantProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificar se convite existe e pertence ao tenant
      const invite = await db
        .select()
        .from(copsoqInvites)
        .where(and(
          eq(copsoqInvites.id, input.inviteId),
          eq(copsoqInvites.tenantId, ctx.tenantId!)
        ))
        .limit(1);

      if (!invite || invite.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite não encontrado",
        });
      }

      // Não permitir cancelar convites já concluídos
      if (invite[0].status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível cancelar um convite já concluído",
        });
      }

      // Marcar como cancelado
      await db
        .update(copsoqInvites)
        .set({ status: "expired" })
        .where(eq(copsoqInvites.id, input.inviteId));

      return {
        success: true,
        message: "Convite cancelado com sucesso",
      };
    }),
});

// COPSOQ-II reverse-coded questions (official Danish methodology)
// These questions are positively worded — high score = good outcome
// Must invert before averaging: score = 6 - rawScore
const REVERSE_CODED_QUESTIONS = new Set([
  // Controle (autonomia, desenvolvimento, influência) — alto = positivo
  9, 10, 11, 12, 13, 14, 15,
  // Liderança (qualidade, previsibilidade, reconhecimento) — alto = positivo
  23, 24, 25, 26,
  // Liderança adicional (confiança, justiça) — alto = positivo
  30, 31, 32,
  // Comunidade (apoio colegas, pertencimento) — alto = positivo
  27, 28, 29, 33, 34, 35,
  // Significado (propósito, engajamento, compromisso) — alto = positivo
  49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
  // Confiança (confiança horizontal/vertical) — alto = positivo
  40, 41, 42, 43, 44, 45,
  // Justiça (procedimentos, distribuição) — alto = positivo
  46, 47, 48,
]);

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
    const values = questions.map(q => {
      const raw = responses[q] || responses[`q${q}`] || 0;
      if (raw <= 0) return 0;
      // Apply reverse scoring: positively-worded items need inversion
      // so all dimensions use "high score = high risk" consistently
      return REVERSE_CODED_QUESTIONS.has(q) ? (6 - raw) : raw;
    }).filter(v => v > 0);

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
