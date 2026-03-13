import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { anonymousReports } from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

export const anonymousReportsRouter = router({
  // Submeter denúncia (público - sem autenticação)
  submit: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        category: z.enum(["harassment", "discrimination", "violence", "workload", "leadership", "other"]),
        description: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        isAnonymous: z.boolean().optional(),
        reporterEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const id = nanoid();
      const reportCode = "RPT-" + nanoid(6).toUpperCase();

      await db.insert(anonymousReports).values({
        id,
        tenantId: input.tenantId,
        reportCode,
        category: input.category,
        description: input.description,
        severity: input.severity ?? "medium",
        status: "received",
        isAnonymous: input.isAnonymous ?? true,
        reporterEmail: input.reporterEmail || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { reportCode };
    }),

  // Rastrear denúncia por código (público)
  trackByCode: publicProcedure
    .input(
      z.object({
        reportCode: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [report] = await db
        .select({
          status: anonymousReports.status,
          category: anonymousReports.category,
          createdAt: anonymousReports.createdAt,
          resolvedAt: anonymousReports.resolvedAt,
        })
        .from(anonymousReports)
        .where(eq(anonymousReports.reportCode, input.reportCode));

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Denúncia não encontrada",
        });
      }

      return report;
    }),

  // Listar denúncias por tenant (autenticado)
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        status: z.enum(["received", "investigating", "resolved", "dismissed"]).optional(),
        category: z.enum(["harassment", "discrimination", "violence", "workload", "leadership", "other"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const tid = input.tenantId || ctx.tenantId!;
      const conditions = [eq(anonymousReports.tenantId, tid)];

      if (input.status) {
        conditions.push(eq(anonymousReports.status, input.status));
      }

      if (input.category) {
        conditions.push(eq(anonymousReports.category, input.category));
      }

      const reports = await db
        .select()
        .from(anonymousReports)
        .where(and(...conditions))
        .orderBy(desc(anonymousReports.createdAt));

      return reports;
    }),

  // Atualizar denúncia
  update: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["received", "investigating", "resolved", "dismissed"]).optional(),
        resolution: z.string().optional(),
        assignedTo: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { id, ...data } = input;
      const updateData: any = { updatedAt: new Date() };

      if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === "resolved") {
          updateData.resolvedAt = new Date();
        }
      }
      if (data.resolution !== undefined) updateData.resolution = data.resolution;
      if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

      await db
        .update(anonymousReports)
        .set(updateData)
        .where(eq(anonymousReports.id, id));

      return { success: true };
    }),

  // Estatísticas de denúncias
  getStats: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const tid = input.tenantId || ctx.tenantId!;
      const reports = await db
        .select()
        .from(anonymousReports)
        .where(eq(anonymousReports.tenantId, tid));

      const total = reports.length;

      const byCategory: Record<string, number> = {
        harassment: 0,
        discrimination: 0,
        violence: 0,
        workload: 0,
        leadership: 0,
        other: 0,
      };

      const byStatus: Record<string, number> = {
        received: 0,
        investigating: 0,
        resolved: 0,
        dismissed: 0,
      };

      const bySeverity: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      };

      for (const report of reports) {
        if (report.category) byCategory[report.category] = (byCategory[report.category] || 0) + 1;
        if (report.status) byStatus[report.status] = (byStatus[report.status] || 0) + 1;
        if (report.severity) bySeverity[report.severity] = (bySeverity[report.severity] || 0) + 1;
      }

      return { total, byCategory, byStatus, bySeverity };
    }),
});
