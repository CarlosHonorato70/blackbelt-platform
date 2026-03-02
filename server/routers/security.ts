/**
 * Phase 7: Security Management Router
 * 
 * Manages:
 * - IP whitelisting (Enterprise)
import { log } from "../_core/logger";
 * - Session management
 * - Security alerts
 * - Login attempts monitoring
 */

import { z } from "zod";
import { router, protectedProcedure, tenantProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  ipWhitelist,
  sessions,
  securityAlerts,
  loginAttempts,
} from "../../drizzle/schema";
import { eq, and, desc, gte, count } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Security Router
 */
export const securityRouter = router({
  // ============================================================================
  // IP WHITELISTING (Enterprise feature)
  // ============================================================================

  /**
   * List IP whitelist entries for tenant
   */
  listWhitelistedIPs: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const ips = await db.query.ipWhitelist.findMany({
      where: eq(ipWhitelist.tenantId, ctx.tenantId),
      orderBy: [desc(ipWhitelist.createdAt)],
    });

    return ips;
  }),

  /**
   * Add IP to whitelist
   */
  addWhitelistedIP: tenantProcedure
    .input(
      z.object({
        ipAddress: z.string().regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Check if IP already exists
      const existing = await db.query.ipWhitelist.findFirst({
        where: and(
          eq(ipWhitelist.tenantId, ctx.tenantId),
          eq(ipWhitelist.ipAddress, input.ipAddress)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "IP address already in whitelist",
        });
      }

      const id = nanoid();
      await db.insert(ipWhitelist).values({
        id,
        tenantId: ctx.tenantId,
        ipAddress: input.ipAddress,
        description: input.description || null,
        createdBy: ctx.user.id,
        active: true,
      });

      return { success: true, id };
    }),

  /**
   * Remove IP from whitelist
   */
  removeWhitelistedIP: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      await db
        .delete(ipWhitelist)
        .where(and(eq(ipWhitelist.id, input.id), eq(ipWhitelist.tenantId, ctx.tenantId)));

      return { success: true };
    }),

  /**
   * Toggle IP whitelist entry active status
   */
  toggleWhitelistedIP: tenantProcedure
    .input(z.object({ id: z.string(), active: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      await db
        .update(ipWhitelist)
        .set({ active: input.active, updatedAt: new Date() })
        .where(and(eq(ipWhitelist.id, input.id), eq(ipWhitelist.tenantId, ctx.tenantId)));

      return { success: true };
    }),

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * List active sessions for current user
   */
  listSessions: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const userSessions = await db.query.sessions.findMany({
      where: and(
        eq(sessions.userId, ctx.user.id),
        eq(sessions.active, true),
        gte(sessions.expiresAt, new Date())
      ),
      orderBy: [desc(sessions.lastActivity)],
    });

    return userSessions.map((session) => ({
      ...session,
      deviceInfo: session.deviceInfo ? JSON.parse(session.deviceInfo as string) : null,
    }));
  }),

  /**
   * Revoke a specific session
   */
  revokeSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Verify session belongs to user
      const session = await db.query.sessions.findFirst({
        where: and(eq(sessions.id, input.sessionId), eq(sessions.userId, ctx.user.id)),
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      await db
        .update(sessions)
        .set({ active: false })
        .where(eq(sessions.id, input.sessionId));

      return { success: true };
    }),

  /**
   * Revoke all sessions except current
   */
  revokeAllSessions: protectedProcedure
    .input(z.object({ currentSessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      await db
        .update(sessions)
        .set({ active: false })
        .where(and(eq(sessions.userId, ctx.user.id)));

      // Reactivate current session
      await db
        .update(sessions)
        .set({ active: true })
        .where(eq(sessions.id, input.currentSessionId));

      return { success: true };
    }),

  // ============================================================================
  // SECURITY ALERTS
  // ============================================================================

  /**
   * List security alerts for tenant
   */
  listAlerts: tenantProcedure
    .input(
      z.object({
        resolved: z.boolean().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const conditions = [eq(securityAlerts.tenantId, ctx.tenantId)];
      
      if (input.resolved !== undefined) {
        conditions.push(eq(securityAlerts.resolved, input.resolved));
      }
      
      if (input.severity) {
        conditions.push(eq(securityAlerts.severity, input.severity));
      }

      const alerts = await db.query.securityAlerts.findMany({
        where: and(...conditions),
        limit: input.perPage,
        offset: (input.page - 1) * input.perPage,
        orderBy: [desc(securityAlerts.createdAt)],
      });

      return alerts.map((alert) => ({
        ...alert,
        metadata: alert.metadata ? JSON.parse(alert.metadata as string) : null,
      }));
    }),

  /**
   * Resolve a security alert
   */
  resolveAlert: tenantProcedure
    .input(z.object({ alertId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      await db
        .update(securityAlerts)
        .set({
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy: ctx.user.id,
        })
        .where(
          and(eq(securityAlerts.id, input.alertId), eq(securityAlerts.tenantId, ctx.tenantId))
        );

      return { success: true };
    }),

  /**
   * Get security stats for tenant
   */
  getSecurityStats: tenantProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    // Last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Count alerts by severity
    const alerts = await db.query.securityAlerts.findMany({
      where: and(
        eq(securityAlerts.tenantId, ctx.tenantId),
        gte(securityAlerts.createdAt, thirtyDaysAgo)
      ),
    });

    const alertsBySeverity = {
      critical: alerts.filter((a) => a.severity === "critical").length,
      high: alerts.filter((a) => a.severity === "high").length,
      medium: alerts.filter((a) => a.severity === "medium").length,
      low: alerts.filter((a) => a.severity === "low").length,
    };

    // Count active sessions
    const activeSessions = await db.query.sessions.findMany({
      where: and(
        eq(sessions.tenantId, ctx.tenantId),
        eq(sessions.active, true),
        gte(sessions.expiresAt, new Date())
      ),
    });

    // Count failed login attempts
    const failedLogins = await db.query.loginAttempts.findMany({
      where: and(
        eq(loginAttempts.success, false),
        gte(loginAttempts.createdAt, thirtyDaysAgo)
      ),
    });

    return {
      totalAlerts: alerts.length,
      unresolvedAlerts: alerts.filter((a) => !a.resolved).length,
      alertsBySeverity,
      activeSessions: activeSessions.length,
      failedLoginAttempts: failedLogins.length,
      whitelistedIPs: await db.query.ipWhitelist.findMany({
        where: and(eq(ipWhitelist.tenantId, ctx.tenantId), eq(ipWhitelist.active, true)),
      }).then((ips) => ips.length),
    };
  }),

  // ============================================================================
  // LOGIN ATTEMPTS MONITORING
  // ============================================================================

  /**
   * List recent login attempts
   */
  listLoginAttempts: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(20),
        success: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const conditions = [eq(loginAttempts.userId, ctx.user.id)];
      
      if (input.success !== undefined) {
        conditions.push(eq(loginAttempts.success, input.success));
      }

      const attempts = await db.query.loginAttempts.findMany({
        where: and(...conditions),
        limit: input.perPage,
        offset: (input.page - 1) * input.perPage,
        orderBy: [desc(loginAttempts.createdAt)],
      });

      return attempts;
    }),
});

/**
 * Helper: Create security alert
 */
export async function createSecurityAlert(
  tenantId: string,
  alertType: string,
  severity: "low" | "medium" | "high" | "critical",
  message: string,
  metadata?: any,
  userId?: string,
  ipAddress?: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(securityAlerts).values({
      id: nanoid(),
      tenantId,
      userId: userId || null,
      alertType,
      severity,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress: ipAddress || null,
      resolved: false,
    });
  } catch (error) {
    log.error("Failed to create security alert", { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Helper: Log login attempt
 */
export async function logLoginAttempt(
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  userId?: string,
  failureReason?: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(loginAttempts).values({
      id: nanoid(),
      email,
      userId: userId || null,
      success,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      failureReason: failureReason || null,
    });
  } catch (error) {
    log.error("Failed to log login attempt", { error: error instanceof Error ? error.message : String(error) });
  }
}
