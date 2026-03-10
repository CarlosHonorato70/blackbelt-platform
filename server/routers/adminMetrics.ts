import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tenants, users, subscriptions, plans, supportTickets } from "../../drizzle/schema";
import { copsoqAssessments } from "../../drizzle/schema_nr01";
import { eq, and, sql, desc, gte, lte, like, or } from "drizzle-orm";

export const adminMetricsRouter = router({
  overview: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const [tenantStats] = await database.select({ total: sql`COUNT(*)`, active: sql`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)` }).from(tenants);
    const [userStats] = await database.select({ total: sql`COUNT(*)` }).from(users);
    const [subStats] = await database.select({ total: sql`COUNT(*)`, active: sql`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`, trialing: sql`SUM(CASE WHEN status = 'trialing' THEN 1 ELSE 0 END)`, pastDue: sql`SUM(CASE WHEN status = 'past_due' THEN 1 ELSE 0 END)`, revenue: sql`SUM(CASE WHEN status = 'active' THEN currentPrice ELSE 0 END)` }).from(subscriptions);
    let openTickets = 0;
    try { const [ts] = await database.select({ c: sql`COUNT(*)` }).from(supportTickets).where(sql`status IN ('open','in_progress')`); openTickets = Number(ts?.c) || 0; } catch {}
    return { tenants: { total: Number(tenantStats?.total) || 0, active: Number(tenantStats?.active) || 0 }, users: { total: Number(userStats?.total) || 0 }, subscriptions: { total: Number(subStats?.total) || 0, active: Number(subStats?.active) || 0, trialing: Number(subStats?.trialing) || 0, pastDue: Number(subStats?.pastDue) || 0, monthlyRevenue: Number(subStats?.revenue) || 0 }, tickets: { open: openTickets } };
  }),

  tenantsList: adminProcedure
    .input(z.object({ search: z.string().optional(), limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const allTenants = input?.search
        ? await database.select().from(tenants).where(or(like(tenants.name, `%${input.search}%`), like(tenants.cnpj, `%${input.search}%`))).orderBy(desc(tenants.createdAt)).limit(input?.limit || 50)
        : await database.select().from(tenants).orderBy(desc(tenants.createdAt)).limit(input?.limit || 50);
      const results = [];
      for (const tenant of allTenants) {
        const [uc] = await database.select({ count: sql`COUNT(*)` }).from(users).where(eq(users.tenantId, tenant.id));
        const [la] = await database.select({ last: sql`MAX(lastSignedIn)` }).from(users).where(eq(users.tenantId, tenant.id));
        const [sub] = await database.select({ subscription: subscriptions, plan: plans }).from(subscriptions).leftJoin(plans, eq(subscriptions.planId, plans.id)).where(eq(subscriptions.tenantId, tenant.id)).limit(1);
        let ac = 0;
        try { const [r] = await database.select({ count: sql`COUNT(*)` }).from(copsoqAssessments).where(eq(copsoqAssessments.tenantId, tenant.id)); ac = Number(r?.count) || 0; } catch {}
        results.push({ ...tenant, usersCount: Number(uc?.count) || 0, lastActivity: la?.last || null, assessmentsCount: ac, subscriptionStatus: sub?.subscription?.status || "none", planName: sub?.plan?.displayName || "Sem plano" });
      }
      return results;
    }),

  alerts: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const now = new Date();
    const in7Days = new Date(now); in7Days.setDate(in7Days.getDate() + 7);
    const ago30Days = new Date(now); ago30Days.setDate(ago30Days.getDate() - 30);
    const expiringTrials = await database.select({ subscription: subscriptions, tenantName: tenants.name }).from(subscriptions).innerJoin(tenants, eq(subscriptions.tenantId, tenants.id)).where(and(eq(subscriptions.status, "trialing"), gte(subscriptions.trialEnd, now), lte(subscriptions.trialEnd, in7Days)));
    const pastDue = await database.select({ subscription: subscriptions, tenantName: tenants.name }).from(subscriptions).innerJoin(tenants, eq(subscriptions.tenantId, tenants.id)).where(eq(subscriptions.status, "past_due"));
    return {
      expiringTrials: expiringTrials.map(t => ({ tenantId: t.subscription.tenantId, tenantName: t.tenantName, trialEnd: t.subscription.trialEnd, type: "trial_expiring" })),
      pastDue: pastDue.map(t => ({ tenantId: t.subscription.tenantId, tenantName: t.tenantName, type: "past_due" })),
    };
  }),
});
