/**
 * SUBSCRIPTIONS ROUTER - tRPC
 * 
 * Gestão de assinaturas, planos e limites de uso
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router , tenantProcedure} from "../_core/trpc";
import { getDb } from "../db";
import {
  plans,
  subscriptions,
  usageMetrics,
  featureFlags,
  planFeatures,
  invoices,
  tenants,
  tenantCredits,
  creditTransactions,
  pendingCopsoqPayments,
} from "../../drizzle/schema";
import { copsoqAssessments, copsoqInvites } from "../../drizzle/schema_nr01";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { ensureTenantForUser } from "../_core/tenantHelpers";
import { sendBulkCopsoqInvites } from "../_core/email";
import { log } from "../_core/logger";
import { createOneTimeCharge } from "./asaas";

// Helper: libera convites pendentes após pagamento confirmado
async function releasePendingInvites(db: any, payment: any) {
  try {
    const invitees = typeof payment.invitees === "string" ? JSON.parse(payment.invitees) : payment.invitees;

    const assessmentId = `copsoq_${Date.now()}_${nanoid(8)}`;
    await db.insert(copsoqAssessments).values({
      id: assessmentId,
      tenantId: payment.tenantId,
      title: payment.assessmentTitle,
      assessmentDate: new Date(),
      status: "in_progress",
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitesToSend = [];
    for (const invitee of invitees) {
      const inviteToken = crypto.randomBytes(32).toString("hex");
      const inviteId = `invite_${Date.now()}_${nanoid(8)}`;

      await db.insert(copsoqInvites).values({
        id: inviteId,
        assessmentId,
        tenantId: payment.tenantId,
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
        assessmentTitle: payment.assessmentTitle,
        inviteToken,
        expiresIn: 7,
        tenantId: payment.tenantId,
      });
    }

    const result = await sendBulkCopsoqInvites(invitesToSend);

    for (const invitee of invitees) {
      await db.update(copsoqInvites)
        .set({ status: "sent", sentAt: new Date() })
        .where(eq(copsoqInvites.respondentEmail, invitee.email));
    }

    // Update subscription counters
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, payment.tenantId)).limit(1);
    if (sub) {
      await db.update(subscriptions)
        .set({
          copsoqInvitesSent: (sub.copsoqInvitesSent || 0) + payment.totalInvites,
          copsoqExtraCharges: (sub.copsoqExtraCharges || 0) + payment.chargeAmount,
          totalPrice: (sub.currentPrice || 0) + (sub.copsoqExtraCharges || 0) + payment.chargeAmount,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sub.id));
    }

    log.info(`[Billing] Payment confirmed, ${invitesToSend.length} invites released for tenant ${payment.tenantId}`);
    return result;
  } catch (err) {
    log.error("[Billing] Failed to release pending invites", { error: String(err) });
    throw err;
  }
}

export const subscriptionsRouter = router({
  /**
   * Get subscription status for the current tenant
   * Returns plan name, status, and basic limits
   */
  getStatus: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const [result] = await db
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.tenantId, ctx.tenantId))
      .limit(1);

    if (!result) {
      // Return a default active status when no subscription record exists
      return {
        status: "active" as const,
        planName: "Padrão",
        isActive: true,
        trialEnd: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        limits: {
          maxUsersPerTenant: 5,
          maxStorageGB: 1,
        },
      };
    }

    const isActive = result.subscription.status === "active" || result.subscription.status === "trialing";

    return {
      status: result.subscription.status,
      planName: result.plan.name,
      planDisplayName: result.plan.displayName,
      isActive,
      trialEnd: result.subscription.trialEnd,
      currentPeriodEnd: result.subscription.currentPeriodEnd,
      cancelAtPeriodEnd: result.subscription.cancelAtPeriodEnd,
      limits: {
        maxUsersPerTenant: result.plan.maxUsersPerTenant,
        maxStorageGB: result.plan.maxStorageGB,
      },
      billing: {
        monthlyPrice: result.plan.monthlyPrice,
        copsoqInvitesSent: result.subscription.copsoqInvitesSent || 0,
        copsoqInvitesIncluded: result.plan.copsoqInvitesIncluded || 0,
        pricePerCopsoqInvite: result.plan.pricePerCopsoqInvite || 0,
        copsoqExtraCharges: result.subscription.copsoqExtraCharges || 0,
        totalPrice: result.subscription.totalPrice || result.subscription.currentPrice,
      },
    };
  }),

  // ============================================================================
  // PLANOS PÚBLICOS
  // ============================================================================

  /**
   * Listar planos públicos disponíveis
   */
  listPublicPlans: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    const publicPlans = await db
      .select()
      .from(plans)
      .where(and(eq(plans.isActive, true), eq(plans.isPublic, true)))
      .orderBy(plans.sortOrder);

    return publicPlans;
  }),

  /**
   * Obter detalhes de um plano específico
   */
  getPlan: publicProcedure
    .input(z.object({ planId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plano não encontrado" });
      }

      // Buscar features do plano
      const features = await db
        .select({
          id: featureFlags.id,
          name: featureFlags.name,
          displayName: featureFlags.displayName,
          description: featureFlags.description,
          category: featureFlags.category,
          isEnabled: planFeatures.isEnabled,
        })
        .from(planFeatures)
        .innerJoin(featureFlags, eq(planFeatures.featureId, featureFlags.id))
        .where(eq(planFeatures.planId, input.planId));

      return {
        ...plan,
        features,
      };
    }),

  // ============================================================================
  // GESTÃO DE ASSINATURAS (Protegido)
  // ============================================================================

  /**
   * Obter assinatura do tenant atual
   */
  getCurrentSubscription: tenantProcedure.query(async ({ ctx }) => {

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const [subscription] = await db
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.tenantId, ctx.tenantId))
      .limit(1);

    return subscription || null;
  }),

  /**
   * Criar assinatura (período de teste)
   */
  createTrialSubscription: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Garantir que usuário tenha tenant (auto-cria se necessário)
      const tenantId = await ensureTenantForUser(ctx.user.id, ctx.user.name, ctx.user.email, ctx.user.tenantId);
      if (!tenantId) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar sua organização. Tente novamente." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificar se já existe assinatura
      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId))
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Tenant já possui uma assinatura" });
      }

      // Buscar plano
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plano não encontrado" });
      }

      // Calcular datas
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + plan.trialDays);

      const periodEnd = new Date(now);
      if (input.billingCycle === "monthly") {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const price =
        input.billingCycle === "monthly"
          ? plan.monthlyPrice
          : plan.yearlyPrice;

      // Criar assinatura
      const subscriptionId = nanoid();
      await db.insert(subscriptions).values({
        id: subscriptionId,
        tenantId: tenantId,
        planId: input.planId,
        status: "trialing",
        billingCycle: input.billingCycle,
        startDate: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd: trialEnd,
        currentPrice: price,
        autoRenew: true,
        cancelAtPeriodEnd: false,
      });

      return { subscriptionId, status: "trialing", trialEnd };
    }),

  /**
   * Atualizar método de pagamento
   */
  updatePaymentMethod: protectedProcedure
    .input(
      z.object({
        stripeCustomerId: z.string().optional(),
        stripeSubscriptionId: z.string().optional(),
        mercadoPagoSubscriptionId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Tenant não selecionado" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(subscriptions)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.tenantId, ctx.tenantId));

      return { success: true };
    }),

  /**
   * Cancelar assinatura (no final do período)
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.tenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Tenant não selecionado" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.tenantId, ctx.tenantId));

    return { success: true, message: "Assinatura cancelada no final do período" };
  }),

  /**
   * Reativar assinatura cancelada
   */
  reactivateSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.tenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Tenant não selecionado" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    await db
      .update(subscriptions)
      .set({
        cancelAtPeriodEnd: false,
        canceledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.tenantId, ctx.tenantId));

    return { success: true, message: "Assinatura reativada" };
  }),

  /**
   * Alterar plano (upgrade/downgrade)
   */
  changePlan: protectedProcedure
    .input(
      z.object({
        newPlanId: z.string(),
        billingCycle: z.enum(["monthly", "yearly"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Tenant não selecionado" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Buscar novo plano
      const [newPlan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.newPlanId))
        .limit(1);

      if (!newPlan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plano não encontrado" });
      }

      // Buscar assinatura atual
      const [currentSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, ctx.tenantId))
        .limit(1);

      if (!currentSub) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assinatura não encontrada" });
      }

      const billingCycle = input.billingCycle || currentSub.billingCycle;
      const newPrice =
        billingCycle === "monthly"
          ? newPlan.monthlyPrice
          : newPlan.yearlyPrice;

      // Atualizar assinatura
      await db
        .update(subscriptions)
        .set({
          planId: input.newPlanId,
          billingCycle,
          currentPrice: newPrice,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.tenantId, ctx.tenantId));

      return {
        success: true,
        message: "Plano alterado com sucesso",
        newPlanId: input.newPlanId,
      };
    }),

  // ============================================================================
  // USAGE & LIMITS
  // ============================================================================

  /**
   * Verificar limites do plano atual
   */
  checkLimits: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Tenant não selecionado" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Buscar assinatura e plano
    const [subscription] = await db
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.tenantId, ctx.tenantId))
      .limit(1);

    if (!subscription) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Assinatura não encontrada" });
    }

    // Buscar métricas de uso atuais
    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(1); // Primeiro dia do mês

    const [usage] = await db
      .select()
      .from(usageMetrics)
      .where(
        and(
          eq(usageMetrics.tenantId, ctx.tenantId),
          gte(usageMetrics.periodStart, periodStart)
        )
      )
      .orderBy(desc(usageMetrics.createdAt))
      .limit(1);

    const currentUsage = usage || {
      activeUsers: 0,
      storageUsedGB: 0,
      apiRequests: 0,
      assessmentsCreated: 0,
      proposalsGenerated: 0,
    };

    const plan = subscription.plan;

    return {
      limits: {
        maxTenants: plan.maxTenants,
        maxUsersPerTenant: plan.maxUsersPerTenant,
        maxStorageGB: plan.maxStorageGB,
        maxApiRequestsPerDay: plan.maxApiRequestsPerDay,
      },
      usage: currentUsage,
      withinLimits: {
        users:
          plan.maxUsersPerTenant === -1 ||
          currentUsage.activeUsers <= plan.maxUsersPerTenant,
        storage:
          plan.maxStorageGB === -1 ||
          currentUsage.storageUsedGB <= plan.maxStorageGB * 100, // centavos
        apiRequests:
          plan.maxApiRequestsPerDay === -1 ||
          currentUsage.apiRequests <= plan.maxApiRequestsPerDay,
      },
    };
  }),

  /**
   * Registrar uso (chamado periodicamente pelo sistema)
   */
  recordUsage: protectedProcedure
    .input(
      z.object({
        activeUsers: z.number().optional(),
        storageUsedGB: z.number().optional(),
        apiRequests: z.number().optional(),
        assessmentsCreated: z.number().optional(),
        proposalsGenerated: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Tenant não selecionado" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const now = new Date();
      const periodStart = new Date(now);
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);

      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);
      periodEnd.setHours(23, 59, 59, 999);

      await db.insert(usageMetrics).values({
        id: nanoid(),
        tenantId: ctx.tenantId,
        periodStart,
        periodEnd,
        activeUsers: input.activeUsers || 0,
        storageUsedGB: input.storageUsedGB || 0,
        apiRequests: input.apiRequests || 0,
        assessmentsCreated: input.assessmentsCreated || 0,
        proposalsGenerated: input.proposalsGenerated || 0,
      });

      return { success: true };
    }),

  // ============================================================================
  // FATURAS
  // ============================================================================

  /**
   * Listar faturas do tenant
   */
  listInvoices: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        status: z
          .enum(["draft", "open", "paid", "void", "uncollectible"])
          .optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Tenant não selecionado" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [eq(invoices.tenantId, ctx.tenantId)];
      if (input.status) {
        conditions.push(eq(invoices.status, input.status));
      }

      const invoicesList = await db
        .select()
        .from(invoices)
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt))
        .limit(input.limit);

      return invoicesList;
    }),

  /**
   * Obter fatura específica
   */
  getInvoice: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Tenant não selecionado" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [invoice] = await db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, input.invoiceId),
            eq(invoices.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });
      }

      return invoice;
    }),

  // ============================================================================
  // CRÉDITOS PRÉ-PAGOS
  // ============================================================================

  getCreditBalance: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { balance: 0 };
    const [credits] = await db.select().from(tenantCredits).where(eq(tenantCredits.tenantId, ctx.tenantId)).limit(1);
    return { balance: credits?.balance || 0 };
  }),

  getCreditHistory: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(creditTransactions)
      .where(eq(creditTransactions.tenantId, ctx.tenantId))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(50);
  }),

  // ============================================================================
  // PAGAMENTO DE EXCEDENTES COPSOQ
  // ============================================================================

  getPendingPayment: tenantProcedure
    .input(z.object({ paymentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [payment] = await db.select()
        .from(pendingCopsoqPayments)
        .where(and(eq(pendingCopsoqPayments.id, input.paymentId), eq(pendingCopsoqPayments.tenantId, ctx.tenantId)))
        .limit(1);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
      return payment;
    }),

  payExceedents: tenantProcedure
    .input(z.object({
      pendingPaymentId: z.string(),
      method: z.enum(["pix", "credit_card", "credits"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [payment] = await db.select()
        .from(pendingCopsoqPayments)
        .where(and(eq(pendingCopsoqPayments.id, input.pendingPaymentId), eq(pendingCopsoqPayments.tenantId, ctx.tenantId)))
        .limit(1);

      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Pagamento pendente nao encontrado" });
      if (payment.paymentStatus === "paid") throw new TRPCError({ code: "BAD_REQUEST", message: "Pagamento ja realizado" });

      if (input.method === "credits") {
        // Pay with credits
        const [credits] = await db.select().from(tenantCredits).where(eq(tenantCredits.tenantId, ctx.tenantId)).limit(1);
        const balance = credits?.balance || 0;

        if (balance < payment.chargeAmount) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Saldo insuficiente. Tem R$ ${(balance / 100).toFixed(2)}, precisa R$ ${(payment.chargeAmount / 100).toFixed(2)}` });
        }

        await db.update(tenantCredits)
          .set({ balance: balance - payment.chargeAmount, updatedAt: new Date() })
          .where(eq(tenantCredits.tenantId, ctx.tenantId));

        await db.insert(creditTransactions).values({
          id: nanoid(), tenantId: ctx.tenantId, type: "usage",
          amount: -payment.chargeAmount,
          description: `${payment.exceedentCount} convites COPSOQ excedentes`,
          referenceId: payment.id,
        });

        await db.update(pendingCopsoqPayments)
          .set({ paymentStatus: "paid", paymentMethod: "credits", paidAt: new Date() })
          .where(eq(pendingCopsoqPayments.id, payment.id));

        // Release invites
        await releasePendingInvites(db, payment);

        return { success: true, method: "credits" };
      }

      // PIX or credit_card via Asaas
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, ctx.tenantId)).limit(1);
      const asaasCustomerId = sub?.asaasCustomerId;

      if (!asaasCustomerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sem cliente Asaas vinculado. Assine um plano primeiro." });
      }

      const charge = await createOneTimeCharge({
        customerId: asaasCustomerId,
        value: payment.chargeAmount / 100,
        description: `${payment.exceedentCount} convites COPSOQ excedentes — ${payment.assessmentTitle}`,
        billingType: input.method === "pix" ? "PIX" : "CREDIT_CARD",
        externalReference: payment.id,
      });

      await db.update(pendingCopsoqPayments)
        .set({
          asaasPaymentId: charge.id,
          paymentMethod: input.method,
          pixQrCode: charge.pixQrCode || null,
          pixCopyPaste: charge.pixCopyPaste || null,
        })
        .where(eq(pendingCopsoqPayments.id, payment.id));

      return {
        success: true,
        method: input.method,
        asaasPaymentId: charge.id,
        pixQrCode: charge.pixQrCode,
        pixCopyPaste: charge.pixCopyPaste,
        invoiceUrl: charge.invoiceUrl,
      };
    }),

  // Called by Asaas webhook when payment is confirmed
  confirmExceedentPayment: publicProcedure
    .input(z.object({ pendingPaymentId: z.string(), token: z.string() }))
    .mutation(async ({ input }) => {
      if (input.token !== (process.env.MAINTENANCE_TOKEN || "klinikos-2026")) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [payment] = await db.select()
        .from(pendingCopsoqPayments)
        .where(eq(pendingCopsoqPayments.id, input.pendingPaymentId))
        .limit(1);

      if (!payment || payment.paymentStatus === "paid") return { success: false };

      await db.update(pendingCopsoqPayments)
        .set({ paymentStatus: "paid", paidAt: new Date() })
        .where(eq(pendingCopsoqPayments.id, payment.id));

      await releasePendingInvites(db, payment);

      return { success: true };
    }),

  // Check if a pending payment was completed (polling from frontend)
  checkPaymentStatus: tenantProcedure
    .input(z.object({ pendingPaymentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { status: "unknown" };
      const [payment] = await db.select()
        .from(pendingCopsoqPayments)
        .where(and(eq(pendingCopsoqPayments.id, input.pendingPaymentId), eq(pendingCopsoqPayments.tenantId, ctx.tenantId)))
        .limit(1);
      return { status: payment?.paymentStatus || "unknown" };
    }),

  // Purchase credits via Asaas (PIX or card)
  purchaseCredits: tenantProcedure
    .input(z.object({
      amount: z.number().min(1000), // min R$10
      method: z.enum(["pix", "credit_card"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, ctx.tenantId)).limit(1);
      if (!sub?.asaasCustomerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Sem cliente Asaas vinculado. Assine um plano primeiro." });
      }

      const charge = await createOneTimeCharge({
        customerId: sub.asaasCustomerId,
        value: input.amount / 100,
        description: `Compra de creditos BlackBelt - R$ ${(input.amount / 100).toFixed(2)}`,
        billingType: input.method === "pix" ? "PIX" : "CREDIT_CARD",
        externalReference: `credits_${ctx.tenantId}_${Date.now()}`,
      });

      // Credits will be added when payment is confirmed via webhook
      // For now, store a pending credit purchase
      await db.insert(creditTransactions).values({
        id: nanoid(), tenantId: ctx.tenantId, type: "purchase",
        amount: input.amount, description: `Compra de creditos (aguardando pagamento)`,
        referenceId: charge.id,
      });

      return {
        asaasPaymentId: charge.id,
        pixQrCode: charge.pixQrCode,
        pixCopyPaste: charge.pixCopyPaste,
        invoiceUrl: charge.invoiceUrl,
      };
    }),
});
