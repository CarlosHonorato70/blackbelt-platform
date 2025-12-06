/**
 * SUBSCRIPTIONS ROUTER - tRPC
 * 
 * Gestão de assinaturas, planos e limites de uso
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  plans,
  subscriptions,
  usageMetrics,
  featureFlags,
  planFeatures,
  invoices,
  tenants,
} from "../../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const subscriptionsRouter = router({
  // ============================================================================
  // PLANOS PÚBLICOS
  // ============================================================================

  /**
   * Listar planos públicos disponíveis
   */
  listPublicPlans: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
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
      if (!db) throw new Error("Database not available");
      
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new Error("Plano não encontrado");
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
  getCurrentSubscription: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) {
      throw new Error("Tenant não selecionado");
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

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
      if (!ctx.tenantId) {
        throw new Error("Tenant não selecionado");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar se já existe assinatura
      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, ctx.tenantId))
        .limit(1);

      if (existing) {
        throw new Error("Tenant já possui uma assinatura");
      }

      // Buscar plano
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new Error("Plano não encontrado");
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
        tenantId: ctx.tenantId,
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
        throw new Error("Tenant não selecionado");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

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
      throw new Error("Tenant não selecionado");
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

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
      throw new Error("Tenant não selecionado");
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

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
        throw new Error("Tenant não selecionado");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar novo plano
      const [newPlan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.newPlanId))
        .limit(1);

      if (!newPlan) {
        throw new Error("Plano não encontrado");
      }

      // Buscar assinatura atual
      const [currentSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, ctx.tenantId))
        .limit(1);

      if (!currentSub) {
        throw new Error("Assinatura não encontrada");
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
      throw new Error("Tenant não selecionado");
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

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
      throw new Error("Assinatura não encontrada");
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
        throw new Error("Tenant não selecionado");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

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
        throw new Error("Tenant não selecionado");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

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
        throw new Error("Tenant não selecionado");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

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
        throw new Error("Fatura não encontrada");
      }

      return invoice;
    }),
});
