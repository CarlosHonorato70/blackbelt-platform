/**
 * Phase 8: Advanced Analytics Router
 * 
 * Provides comprehensive analytics for:
 * - Administrators (MRR, churn, conversion, ARPU, LTV)
 * - Clients (assessments, proposals, resource usage, ROI)
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  subscriptions,
  assessments,
  proposals,
  users,
  tenants,
  apiKeyUsage,
} from "../../drizzle/schema";
import { eq, and, gte, lte, count, sql, desc } from "drizzle-orm";

/**
 * Date range input schema
 */
const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/**
 * Analytics Router
 */
export const analyticsRouter = router({
  // ============================================================================
  // ADMIN METRICS
  // ============================================================================

  /**
   * Get MRR (Monthly Recurring Revenue)
   */
  getAdminMRR: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Check if user has admin role
      // TODO: Implement role checking when user roles are finalized
      // For now, all authenticated users can access (change this in production!)
      // Uncomment when roles are implemented:
      // const user = await db.query.users.findFirst({
      //   where: eq(users.id, ctx.userId)
      // });
      // if (user?.role !== 'admin' && user?.role !== 'owner') {
      //   throw new TRPCError({
      //     code: 'FORBIDDEN',
      //     message: 'Admin access required'
      //   });
      // }
      // if (!ctx.isAdmin) throw new TRPCError({ code: "FORBIDDEN" });

      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 12));
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      // Get active subscriptions
      const activeSubscriptions = await db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.status, "active"),
          gte(subscriptions.currentPeriodStart, startDate),
          lte(subscriptions.currentPeriodStart, endDate)
        ),
      });

      // Calculate MRR by month
      const mrrByMonth: Record<string, number> = {};
      
      activeSubscriptions.forEach((sub) => {
        const month = new Date(sub.currentPeriodStart!).toISOString().substring(0, 7);
        const monthlyAmount = calculateMonthlyAmount(sub.amount, sub.interval);
        mrrByMonth[month] = (mrrByMonth[month] || 0) + monthlyAmount;
      });

      // Calculate current MRR
      const currentMonth = new Date().toISOString().substring(0, 7);
      const currentMRR = mrrByMonth[currentMonth] || 0;

      // Calculate MRR growth
      const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
        .toISOString()
        .substring(0, 7);
      const lastMRR = mrrByMonth[lastMonth] || 0;
      const mrrGrowth = lastMRR > 0 ? ((currentMRR - lastMRR) / lastMRR) * 100 : 0;

      return {
        currentMRR,
        mrrGrowth,
        mrrByMonth: Object.entries(mrrByMonth)
          .map(([month, amount]) => ({ month, amount }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      };
    }),

  /**
   * Get Churn Rate
   */
  getAdminChurnRate: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 12));
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      // Get all subscriptions in period
      const allSubs = await db.query.subscriptions.findMany({
        where: and(
          gte(subscriptions.createdAt, startDate),
          lte(subscriptions.createdAt, endDate)
        ),
      });

      // Get canceled subscriptions
      const canceledSubs = allSubs.filter((sub) => sub.status === "canceled");

      // Calculate churn by month
      const churnByMonth: Record<
        string,
        { total: number; churned: number; rate: number }
      > = {};

      allSubs.forEach((sub) => {
        const month = new Date(sub.createdAt).toISOString().substring(0, 7);
        if (!churnByMonth[month]) {
          churnByMonth[month] = { total: 0, churned: 0, rate: 0 };
        }
        churnByMonth[month].total++;
        if (sub.status === "canceled") {
          churnByMonth[month].churned++;
        }
      });

      // Calculate rates
      Object.keys(churnByMonth).forEach((month) => {
        const data = churnByMonth[month];
        data.rate = data.total > 0 ? (data.churned / data.total) * 100 : 0;
      });

      // Current month churn
      const currentMonth = new Date().toISOString().substring(0, 7);
      const currentChurnRate = churnByMonth[currentMonth]?.rate || 0;

      return {
        currentChurnRate,
        churnByMonth: Object.entries(churnByMonth)
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      };
    }),

  /**
   * Get Conversion Rate (trial → paid)
   */
  getAdminConversionRate: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 6));
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      // Get all subscriptions in period
      const allSubs = await db.query.subscriptions.findMany({
        where: and(
          gte(subscriptions.createdAt, startDate),
          lte(subscriptions.createdAt, endDate)
        ),
      });

      // Count trial and converted
      const trialSubs = allSubs.filter((sub) => sub.planId === "trial");
      const convertedSubs = allSubs.filter(
        (sub) => sub.planId !== "trial" && sub.status === "active"
      );

      const conversionRate =
        trialSubs.length > 0 ? (convertedSubs.length / trialSubs.length) * 100 : 0;

      // By month
      const conversionByMonth: Record<string, { trials: number; converted: number }> = {};

      allSubs.forEach((sub) => {
        const month = new Date(sub.createdAt).toISOString().substring(0, 7);
        if (!conversionByMonth[month]) {
          conversionByMonth[month] = { trials: 0, converted: 0 };
        }
        if (sub.planId === "trial") {
          conversionByMonth[month].trials++;
        }
        if (sub.planId !== "trial" && sub.status === "active") {
          conversionByMonth[month].converted++;
        }
      });

      return {
        conversionRate,
        totalTrials: trialSubs.length,
        totalConverted: convertedSubs.length,
        conversionByMonth: Object.entries(conversionByMonth)
          .map(([month, data]) => ({
            month,
            ...data,
            rate: data.trials > 0 ? (data.converted / data.trials) * 100 : 0,
          }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      };
    }),

  /**
   * Get ARPU (Average Revenue Per User)
   */
  getAdminARPU: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 12));
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      // Get active subscriptions
      const activeSubscriptions = await db.query.subscriptions.findMany({
        where: and(
          eq(subscriptions.status, "active"),
          gte(subscriptions.createdAt, startDate),
          lte(subscriptions.createdAt, endDate)
        ),
      });

      // Get unique tenants
      const uniqueTenants = new Set(activeSubscriptions.map((sub) => sub.tenantId));
      const totalUsers = uniqueTenants.size;

      // Calculate total revenue
      const totalRevenue = activeSubscriptions.reduce(
        (sum, sub) => sum + (sub.amount || 0),
        0
      );

      const arpu = totalUsers > 0 ? totalRevenue / totalUsers : 0;

      return {
        arpu,
        totalRevenue,
        totalUsers,
      };
    }),

  /**
   * Get LTV (Lifetime Value)
   */
  getAdminLTV: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    // Get all subscriptions
    const allSubs = await db.query.subscriptions.findMany();

    // Calculate average subscription duration (in months)
    const subsWithDuration = allSubs
      .filter((sub) => sub.createdAt && sub.canceledAt)
      .map((sub) => {
        const duration =
          (new Date(sub.canceledAt!).getTime() - new Date(sub.createdAt).getTime()) /
          (1000 * 60 * 60 * 24 * 30); // Convert to months
        return duration;
      });

    const avgDuration =
      subsWithDuration.length > 0
        ? subsWithDuration.reduce((a, b) => a + b, 0) / subsWithDuration.length
        : 12; // Default to 12 months

    // Calculate average monthly revenue per user
    const activeSubs = allSubs.filter((sub) => sub.status === "active");
    const avgMonthlyRevenue =
      activeSubs.length > 0
        ? activeSubs.reduce((sum, sub) => {
            const monthly = calculateMonthlyAmount(sub.amount, sub.interval);
            return sum + monthly;
          }, 0) / activeSubs.length
        : 0;

    // LTV = Average Monthly Revenue × Average Customer Lifespan
    const ltv = avgMonthlyRevenue * avgDuration;

    return {
      ltv,
      avgMonthlyRevenue,
      avgDurationMonths: avgDuration,
    };
  }),

  /**
   * Get popular plans
   */
  getAdminPopularPlans: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    // Get all active subscriptions grouped by plan
    const subs = await db.query.subscriptions.findMany({
      where: eq(subscriptions.status, "active"),
    });

    const planCounts: Record<string, number> = {};
    subs.forEach((sub) => {
      planCounts[sub.planId] = (planCounts[sub.planId] || 0) + 1;
    });

    const plans = Object.entries(planCounts)
      .map(([planId, count]) => ({ planId, count }))
      .sort((a, b) => b.count - a.count);

    return { plans };
  }),

  /**
   * Get user growth
   */
  getAdminUserGrowth: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 12));
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      // Get users by month
      const newUsers = await db.query.users.findMany({
        where: and(gte(users.createdAt, startDate), lte(users.createdAt, endDate)),
      });

      const usersByMonth: Record<string, number> = {};
      newUsers.forEach((user) => {
        const month = new Date(user.createdAt).toISOString().substring(0, 7);
        usersByMonth[month] = (usersByMonth[month] || 0) + 1;
      });

      return {
        usersByMonth: Object.entries(usersByMonth)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => a.month.localeCompare(b.month)),
        totalNewUsers: newUsers.length,
      };
    }),

  // ============================================================================
  // CLIENT METRICS
  // ============================================================================

  /**
   * Get assessments completed by period
   */
  getClientAssessments: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 6));
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      // Get assessments for tenant
      const tenantAssessments = await db.query.assessments.findMany({
        where: and(
          eq(assessments.tenantId, ctx.tenantId),
          gte(assessments.createdAt, startDate),
          lte(assessments.createdAt, endDate)
        ),
      });

      // Group by month
      const assessmentsByMonth: Record<string, number> = {};
      tenantAssessments.forEach((assessment) => {
        const month = new Date(assessment.createdAt).toISOString().substring(0, 7);
        assessmentsByMonth[month] = (assessmentsByMonth[month] || 0) + 1;
      });

      return {
        total: tenantAssessments.length,
        byMonth: Object.entries(assessmentsByMonth)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      };
    }),

  /**
   * Get proposals generated and acceptance rate
   */
  getClientProposals: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(new Date().setMonth(new Date().getMonth() - 6));
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      // Get proposals for tenant
      const tenantProposals = await db.query.proposals.findMany({
        where: and(
          eq(proposals.tenantId, ctx.tenantId),
          gte(proposals.createdAt, startDate),
          lte(proposals.createdAt, endDate)
        ),
      });

      // Count by status
      const accepted = tenantProposals.filter((p) => p.status === "accepted").length;
      const rejected = tenantProposals.filter((p) => p.status === "rejected").length;
      const pending = tenantProposals.filter((p) => p.status === "pending").length;

      const acceptanceRate =
        tenantProposals.length > 0 ? (accepted / tenantProposals.length) * 100 : 0;

      // Group by month
      const proposalsByMonth: Record<string, { total: number; accepted: number }> = {};
      tenantProposals.forEach((proposal) => {
        const month = new Date(proposal.createdAt).toISOString().substring(0, 7);
        if (!proposalsByMonth[month]) {
          proposalsByMonth[month] = { total: 0, accepted: 0 };
        }
        proposalsByMonth[month].total++;
        if (proposal.status === "accepted") {
          proposalsByMonth[month].accepted++;
        }
      });

      return {
        total: tenantProposals.length,
        accepted,
        rejected,
        pending,
        acceptanceRate,
        byMonth: Object.entries(proposalsByMonth)
          .map(([month, data]) => ({
            month,
            ...data,
            rate: data.total > 0 ? (data.accepted / data.total) * 100 : 0,
          }))
          .sort((a, b) => a.month.localeCompare(b.month)),
      };
    }),

  /**
   * Get resource usage (users, storage, API)
   */
  getClientResourceUsage: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    // Count users in tenant
    const tenantUsers = await db.query.users.findMany({
      where: eq(users.tenantId, ctx.tenantId),
    });

    // Count API calls (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const apiCalls = await db.query.apiKeyUsage.findMany({
      where: gte(apiKeyUsage.createdAt, thirtyDaysAgo),
    });

    // Get subscription limits
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.tenantId, ctx.tenantId),
        eq(subscriptions.status, "active")
      ),
    });

    // Calculate storage usage
    // TODO: Implement actual storage calculation based on your file storage system
    // For now, returning 0. In production:
    // - If using S3: Query S3 bucket size for tenant files
    // - If using local storage: Calculate file sizes in tenant directory
    // - If using database: Sum up sizes of blob/binary columns
    const storageUsed = 0; // Placeholder - implement based on storage backend

    return {
      users: {
        current: tenantUsers.length,
        limit: getSubscriptionLimit(subscription?.planId, "users"),
        percentage: Math.round((tenantUsers.length / getSubscriptionLimit(subscription?.planId, "users")) * 100),
      },
      storage: {
        current: storageUsed,
        limit: getSubscriptionLimit(subscription?.planId, "storage"),
        percentage: storageUsed > 0 ? Math.round((storageUsed / getSubscriptionLimit(subscription?.planId, "storage")) * 100) : 0,
      },
      apiCalls: {
        current: apiCalls.length,
        limit: getSubscriptionLimit(subscription?.planId, "apiCalls"),
        percentage: Math.round((apiCalls.length / getSubscriptionLimit(subscription?.planId, "apiCalls")) * 100),
      },
    };
  }),

  /**
   * Get estimated ROI
   */
  getClientROI: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    // Get subscription cost
    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.tenantId, ctx.tenantId),
        eq(subscriptions.status, "active")
      ),
    });

    const monthlyCost = subscription
      ? calculateMonthlyAmount(subscription.amount, subscription.interval)
      : 0;

    // Count assessments (compliance = avoided penalties)
    const totalAssessments = await db.query.assessments.findMany({
      where: eq(assessments.tenantId, ctx.tenantId),
    });

    // Estimate savings (avg penalty = R$ 5,000 per non-compliance)
    const avgPenaltyPerViolation = 5000;
    const estimatedSavings = totalAssessments.length * avgPenaltyPerViolation;

    // ROI = (Savings - Cost) / Cost * 100
    const roi =
      monthlyCost > 0 ? ((estimatedSavings - monthlyCost) / monthlyCost) * 100 : 0;

    return {
      roi,
      monthlyCost,
      estimatedSavings,
      assessmentsCompleted: totalAssessments.length,
    };
  }),
});

/**
 * Helper: Convert subscription amount to monthly
 */
function calculateMonthlyAmount(
  amount: number | null,
  interval: string | null
): number {
  if (!amount) return 0;

  switch (interval) {
    case "month":
      return amount;
    case "year":
      return amount / 12;
    case "day":
      return amount * 30;
    default:
      return amount;
  }
}

/**
 * Helper: Get subscription plan limits
 */
function getSubscriptionLimit(
  planId: string | undefined,
  resource: "users" | "storage" | "apiCalls"
): number {
  const limits: Record<string, Record<string, number>> = {
    trial: { users: 3, storage: 1024, apiCalls: 100 },
    basic: { users: 10, storage: 10240, apiCalls: 1000 },
    professional: { users: 50, storage: 51200, apiCalls: 10000 },
    enterprise: { users: -1, storage: -1, apiCalls: -1 }, // Unlimited
  };

  return limits[planId || "trial"]?.[resource] || 0;
}
