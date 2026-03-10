import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { subscriptions, plans, tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as db from "../db";

export const adminSubscriptionsRouter = router({
  adminGetSubscriptionDetails: adminProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [tenant] = await database.select().from(tenants).where(eq(tenants.id, input.tenantId)).limit(1);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Tenant nao encontrado" });
      const [sub] = await database.select({ subscription: subscriptions, plan: plans }).from(subscriptions).innerJoin(plans, eq(subscriptions.planId, plans.id)).where(eq(subscriptions.tenantId, input.tenantId)).limit(1);
      const allPlans = await database.select().from(plans).where(eq(plans.isActive, true));
      return { tenant, subscription: sub?.subscription || null, plan: sub?.plan || null, availablePlans: allPlans };
    }),

  adminExtendTrial: adminProcedure
    .input(z.object({ tenantId: z.string(), extraDays: z.number().min(1).max(365), reason: z.string().min(1, "Motivo e obrigatorio") }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [sub] = await database.select().from(subscriptions).where(eq(subscriptions.tenantId, input.tenantId)).limit(1);
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Assinatura nao encontrada" });
      const currentTrialEnd = sub.trialEnd ? new Date(sub.trialEnd) : new Date();
      currentTrialEnd.setDate(currentTrialEnd.getDate() + input.extraDays);
      await database.update(subscriptions).set({ trialEnd: currentTrialEnd, status: "trialing", updatedAt: new Date() }).where(eq(subscriptions.tenantId, input.tenantId));
      await db.createAuditLog({ tenantId: input.tenantId, userId: ctx.user.id, action: "UPDATE", entityType: "subscription_admin", entityId: sub.id, oldValues: { trialEnd: sub.trialEnd }, newValues: { trialEnd: currentTrialEnd, extraDays: input.extraDays, action: "extend_trial", reason: input.reason }, ipAddress: ctx.req.ip, userAgent: ctx.req.headers["user-agent"] });
      return { success: true, newTrialEnd: currentTrialEnd };
    }),

  adminActivatePlan: adminProcedure
    .input(z.object({ tenantId: z.string(), planId: z.string(), billingCycle: z.enum(["monthly", "yearly"]).default("monthly"), reason: z.string().min(1, "Motivo e obrigatorio") }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [plan] = await database.select().from(plans).where(eq(plans.id, input.planId)).limit(1);
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Plano nao encontrado" });
      const now = new Date();
      const periodEnd = new Date(now);
      if (input.billingCycle === "monthly") periodEnd.setMonth(periodEnd.getMonth() + 1);
      else periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      const price = input.billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
      const [existing] = await database.select().from(subscriptions).where(eq(subscriptions.tenantId, input.tenantId)).limit(1);
      if (existing) {
        await database.update(subscriptions).set({ planId: input.planId, status: "active", billingCycle: input.billingCycle, currentPeriodStart: now, currentPeriodEnd: periodEnd, currentPrice: price, cancelAtPeriodEnd: false, canceledAt: null, updatedAt: now }).where(eq(subscriptions.tenantId, input.tenantId));
      } else {
        await database.insert(subscriptions).values({ id: nanoid(), tenantId: input.tenantId, planId: input.planId, status: "active", billingCycle: input.billingCycle, startDate: now, currentPeriodStart: now, currentPeriodEnd: periodEnd, currentPrice: price, autoRenew: true, cancelAtPeriodEnd: false });
      }
      await db.createAuditLog({ tenantId: input.tenantId, userId: ctx.user.id, action: "UPDATE", entityType: "subscription_admin", entityId: input.tenantId, oldValues: null, newValues: { planId: input.planId, status: "active", action: "activate_plan", reason: input.reason }, ipAddress: ctx.req.ip, userAgent: ctx.req.headers["user-agent"] });
      return { success: true, planName: plan.displayName };
    }),

  adminApplyDiscount: adminProcedure
    .input(z.object({ tenantId: z.string(), discountPercent: z.number().min(1).max(100), reason: z.string().min(1, "Motivo e obrigatorio") }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [sub] = await database.select({ subscription: subscriptions, plan: plans }).from(subscriptions).innerJoin(plans, eq(subscriptions.planId, plans.id)).where(eq(subscriptions.tenantId, input.tenantId)).limit(1);
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Assinatura nao encontrada" });
      const basePrice = sub.subscription.billingCycle === "monthly" ? sub.plan.monthlyPrice : sub.plan.yearlyPrice;
      const newPrice = Math.round(basePrice * (1 - input.discountPercent / 100));
      await database.update(subscriptions).set({ currentPrice: newPrice, updatedAt: new Date() }).where(eq(subscriptions.tenantId, input.tenantId));
      await db.createAuditLog({ tenantId: input.tenantId, userId: ctx.user.id, action: "UPDATE", entityType: "subscription_admin", entityId: sub.subscription.id, oldValues: { currentPrice: sub.subscription.currentPrice }, newValues: { currentPrice: newPrice, discountPercent: input.discountPercent, action: "apply_discount", reason: input.reason }, ipAddress: ctx.req.ip, userAgent: ctx.req.headers["user-agent"] });
      return { success: true, oldPrice: sub.subscription.currentPrice, newPrice };
    }),

  adminForceChangePlan: adminProcedure
    .input(z.object({ tenantId: z.string(), newPlanId: z.string(), billingCycle: z.enum(["monthly", "yearly"]).optional(), reason: z.string().min(1, "Motivo e obrigatorio") }))
    .mutation(async ({ ctx, input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const [sub] = await database.select().from(subscriptions).where(eq(subscriptions.tenantId, input.tenantId)).limit(1);
      if (!sub) throw new TRPCError({ code: "NOT_FOUND", message: "Assinatura nao encontrada" });
      const [newPlan] = await database.select().from(plans).where(eq(plans.id, input.newPlanId)).limit(1);
      if (!newPlan) throw new TRPCError({ code: "NOT_FOUND", message: "Plano nao encontrado" });
      const cycle = input.billingCycle || sub.billingCycle;
      const newPrice = cycle === "monthly" ? newPlan.monthlyPrice : newPlan.yearlyPrice;
      await database.update(subscriptions).set({ planId: input.newPlanId, billingCycle: cycle, currentPrice: newPrice, updatedAt: new Date() }).where(eq(subscriptions.tenantId, input.tenantId));
      await db.createAuditLog({ tenantId: input.tenantId, userId: ctx.user.id, action: "UPDATE", entityType: "subscription_admin", entityId: sub.id, oldValues: { planId: sub.planId, currentPrice: sub.currentPrice }, newValues: { planId: input.newPlanId, currentPrice: newPrice, action: "force_change_plan", reason: input.reason }, ipAddress: ctx.req.ip, userAgent: ctx.req.headers["user-agent"] });
      return { success: true, newPlanName: newPlan.displayName, newPrice };
    }),
});
