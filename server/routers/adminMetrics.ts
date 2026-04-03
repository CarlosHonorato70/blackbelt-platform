import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tenants, users, subscriptions, plans, supportTickets, userRoles, roles, people, proposals } from "../../drizzle/schema";
import { copsoqAssessments, copsoqReports, riskAssessments, riskAssessmentItems, actionPlans } from "../../drizzle/schema_nr01";
import { eq, and, sql, desc, gte, lte, like, or, inArray } from "drizzle-orm";

export const adminMetricsRouter = router({
  overview: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const [tenantStats] = await database.select({ total: sql`COUNT(*)`, active: sql`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)` }).from(tenants);
    const [userStats] = await database.select({ total: sql`COUNT(*)` }).from(users);
    const [subStats] = await database.select({ total: sql`COUNT(*)`, active: sql`SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END)`, trialing: sql`SUM(CASE WHEN status = 'trialing' THEN 1 ELSE 0 END)`, pastDue: sql`SUM(CASE WHEN status = 'past_due' THEN 1 ELSE 0 END)`, revenue: sql`SUM(CASE WHEN status = 'active' THEN (CASE WHEN billingCycle = 'yearly' THEN ROUND(currentPrice / 12) ELSE currentPrice END) ELSE 0 END)` }).from(subscriptions);
    let openTickets = 0;
    try { const [ts] = await database.select({ c: sql`COUNT(*)` }).from(supportTickets).where(sql`status IN ('open','in_progress')`); openTickets = Number(ts?.c) || 0; } catch {}

    // Churn: subscriptions canceled in last 30 days / total active at start of period
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [canceledStats] = await database.select({ count: sql`SUM(CASE WHEN status = 'canceled' AND updatedAt >= ${thirtyDaysAgo} THEN 1 ELSE 0 END)` }).from(subscriptions);
    const canceledCount = Number(canceledStats?.count) || 0;
    const activeStart = (Number(subStats?.active) || 0) + canceledCount; // approximate
    const churnRate = activeStart > 0 ? Math.round((canceledCount / activeStart) * 100) : 0;

    // Trial-to-paid conversion
    const [conversionStats] = await database.select({
      converted: sql`SUM(CASE WHEN status = 'active' AND trialEnd IS NOT NULL AND trialEnd < NOW() THEN 1 ELSE 0 END)`,
      totalTrialed: sql`SUM(CASE WHEN trialEnd IS NOT NULL THEN 1 ELSE 0 END)`
    }).from(subscriptions);
    const convertedCount = Number(conversionStats?.converted) || 0;
    const totalTrialed = Number(conversionStats?.totalTrialed) || 0;
    const conversionRate = totalTrialed > 0 ? Math.round((convertedCount / totalTrialed) * 100) : 0;

    // ARR = MRR * 12
    const mrr = Number(subStats?.revenue) || 0;
    const arr = mrr * 12;

    return { tenants: { total: Number(tenantStats?.total) || 0, active: Number(tenantStats?.active) || 0 }, users: { total: Number(userStats?.total) || 0 }, subscriptions: { total: Number(subStats?.total) || 0, active: Number(subStats?.active) || 0, trialing: Number(subStats?.trialing) || 0, pastDue: Number(subStats?.pastDue) || 0, monthlyRevenue: Number(subStats?.revenue) || 0 }, tickets: { open: openTickets }, churnRate, conversionRate, arr, canceledSubscriptions: canceledCount };
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

  /**
   * Lista todos os usuários da plataforma com seus níveis de acesso
   */
  usersList: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      limit: z.number().min(1).max(200).default(100),
    }).optional())
    .query(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Buscar todos os usuários
      const allUsers = input?.search
        ? await database.select().from(users).where(
            or(
              like(users.name, `%${input.search}%`),
              like(users.email, `%${input.search}%`)
            )
          ).orderBy(desc(users.createdAt)).limit(input?.limit || 100)
        : await database.select().from(users).orderBy(desc(users.createdAt)).limit(input?.limit || 100);

      const results = [];
      for (const user of allUsers) {
        // Buscar roles do usuário
        const userRolesList = await database
          .select({ roleName: roles.displayName, systemName: roles.systemName })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, user.id));

        // Buscar nome do tenant
        let tenantName: string | null = null;
        let subscriptionStatus: string | null = null;
        if (user.tenantId) {
          const [t] = await database.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);
          tenantName = t?.name || null;

          const [sub] = await database.select({ status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.tenantId, user.tenantId)).limit(1);
          subscriptionStatus = sub?.status || null;
        }

        results.push({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: (user as any).emailVerified || false,
          tenantId: user.tenantId,
          tenantName,
          subscriptionStatus,
          roles: userRolesList.map(r => r.roleName || r.systemName),
          lastSignedIn: (user as any).lastSignedIn || null,
          createdAt: user.createdAt,
        });
      }

      return results;
    }),

  // Dashboard executivo para consultoria (dados reais, não mock)
  executiveDashboard: tenantProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const tenantId = ctx.user.tenantId;
    if (!tenantId) throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant not found" });

    // 1. Empresas filhas (child tenants)
    const childTenants = await database.select({ id: tenants.id, name: tenants.name, cnpj: tenants.cnpj })
      .from(tenants).where(eq(tenants.parentTenantId, tenantId));
    const childIds = childTenants.map(t => t.id);
    const allTenantIds = [tenantId, ...childIds];

    // 2. Total colaboradores
    let totalPeople = 0;
    if (allTenantIds.length > 0) {
      const [pc] = await database.select({ count: sql<number>`COUNT(*)` }).from(people)
        .where(inArray(people.tenantId, allTenantIds));
      totalPeople = Number(pc?.count) || 0;
    }

    // 3. Propostas
    const [proposalStats] = await database.select({
      total: sql<number>`COUNT(*)`,
      approved: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN status IN ('pending_approval','draft') THEN 1 ELSE 0 END)`,
      rejected: sql<number>`SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)`,
    }).from(proposals).where(eq(proposals.tenantId, tenantId));
    const totalProposals = Number(proposalStats?.total) || 0;
    const approvedProposals = Number(proposalStats?.approved) || 0;
    const pendingProposals = Number(proposalStats?.pending) || 0;
    const conversionRate = totalProposals > 0 ? Math.round((approvedProposals / totalProposals) * 100) : 0;

    // 4. Avaliações COPSOQ
    let totalCopsoq = 0, completedCopsoq = 0, activeCopsoq = 0;
    if (allTenantIds.length > 0) {
      const [cs] = await database.select({
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
        active: sql<number>`SUM(CASE WHEN status IN ('active','in_progress') THEN 1 ELSE 0 END)`,
      }).from(copsoqAssessments).where(inArray(copsoqAssessments.tenantId, allTenantIds));
      totalCopsoq = Number(cs?.total) || 0;
      completedCopsoq = Number(cs?.completed) || 0;
      activeCopsoq = Number(cs?.active) || 0;
    }

    // 5. Planos de ação
    let totalActions = 0, completedActions = 0, inProgressActions = 0, pendingActions = 0;
    if (allTenantIds.length > 0) {
      const [as2] = await database.select({
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
        inProgress: sql<number>`SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END)`,
        pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
      }).from(actionPlans).where(inArray(actionPlans.tenantId, allTenantIds));
      totalActions = Number(as2?.total) || 0;
      completedActions = Number(as2?.completed) || 0;
      inProgressActions = Number(as2?.inProgress) || 0;
      pendingActions = Number(as2?.pending) || 0;
    }
    const complianceRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

    // 6. Distribuição de riscos
    let riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };
    if (allTenantIds.length > 0) {
      const riskRows = await database.select({
        level: riskAssessmentItems.riskLevel,
        count: sql<number>`COUNT(*)`,
      }).from(riskAssessmentItems)
        .innerJoin(riskAssessments, eq(riskAssessmentItems.assessmentId, riskAssessments.id))
        .where(inArray(riskAssessments.tenantId, allTenantIds))
        .groupBy(riskAssessmentItems.riskLevel);
      for (const row of riskRows) {
        const level = row.level as keyof typeof riskDistribution;
        if (level in riskDistribution) riskDistribution[level] = Number(row.count) || 0;
      }
    }

    // 7. Dimensões COPSOQ (último relatório de cada empresa)
    let copsoqDimensions: any = null;
    if (allTenantIds.length > 0) {
      const reports = await database.select()
        .from(copsoqReports)
        .where(inArray(copsoqReports.tenantId, allTenantIds))
        .orderBy(desc(copsoqReports.createdAt));

      // Pegar último relatório por tenant
      const latestByTenant = new Map<string, typeof reports[0]>();
      for (const r of reports) {
        if (!latestByTenant.has(r.tenantId)) latestByTenant.set(r.tenantId, r);
      }

      if (latestByTenant.size > 0) {
        const dims = ['demand', 'control', 'support', 'leadership', 'community', 'meaning', 'trust', 'justice', 'insecurity', 'mentalHealth', 'burnout', 'violence'];
        const avgDims: Record<string, number> = {};
        for (const dim of dims) {
          let sum = 0, count = 0;
          for (const [, report] of latestByTenant) {
            const val = (report as any)[dim];
            if (val != null) { sum += Number(val); count++; }
          }
          avgDims[dim] = count > 0 ? Math.round(sum / count) : 0;
        }
        copsoqDimensions = avgDims;
      }
    }

    // 8. Alertas reais
    const alerts = {
      criticalRisks: riskDistribution.critical + riskDistribution.high,
      pendingProposals: pendingProposals,
      activeCopsoq: activeCopsoq,
    };

    return {
      companies: { total: childTenants.length, list: childTenants },
      people: { total: totalPeople },
      proposals: { total: totalProposals, approved: approvedProposals, pending: pendingProposals, conversionRate },
      copsoq: { total: totalCopsoq, completed: completedCopsoq, active: activeCopsoq },
      actionPlans: { total: totalActions, completed: completedActions, inProgress: inProgressActions, pending: pendingActions, complianceRate },
      riskDistribution,
      copsoqDimensions,
      alerts,
    };
  }),
});
