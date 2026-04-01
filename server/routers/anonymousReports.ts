import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { anonymousReports } from "../../drizzle/schema_nr01";
import { tenants } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const COMPLAINT_CATEGORIES = [
  "assedio_moral", "assedio_sexual", "discrimination",
  "condicoes_trabalho", "violencia_psicologica", "other",
  // Legacy categories kept for backwards compatibility
  "harassment", "violence", "workload", "leadership",
] as const;

function generateProtocol(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BB-${year}-${rand}`;
}

export const anonymousReportsRouter = router({
  // Submeter denúncia (público - sem autenticação, via tenantId)
  submit: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        category: z.enum(COMPLAINT_CATEGORIES),
        description: z.string().min(10, "Descreva a situação com pelo menos 10 caracteres"),
        severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        reporterEmail: z.string().email().optional().or(z.literal("")),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Validate tenantId exists
      const [tenant] = await db
        .select({ id: tenants.id })
        .from(tenants)
        .where(eq(tenants.id, input.tenantId))
        .limit(1);

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empresa não encontrada",
        });
      }

      const id = nanoid();
      const reportCode = generateProtocol();

      await db.insert(anonymousReports).values({
        id,
        tenantId: input.tenantId,
        reportCode,
        category: input.category,
        description: input.description,
        severity: input.severity,
        status: "received",
        isAnonymous: true,
        reporterEmail: input.reporterEmail || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { reportCode };
    }),

  // Rastrear denúncia por código (público)
  getByProtocol: publicProcedure
    .input(
      z.object({
        reportCode: z.string().min(1),
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
          severity: anonymousReports.severity,
          createdAt: anonymousReports.createdAt,
          updatedAt: anonymousReports.updatedAt,
          resolvedAt: anonymousReports.resolvedAt,
        })
        .from(anonymousReports)
        .where(eq(anonymousReports.reportCode, input.reportCode.trim().toUpperCase()));

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Denúncia não encontrada. Verifique o número do protocolo.",
        });
      }

      return report;
    }),

  // Legacy alias for trackByCode
  trackByCode: publicProcedure
    .input(z.object({ reportCode: z.string() }))
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
        status: z.enum(["received", "investigating", "resolved", "dismissed"]).optional(),
        category: z.string().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(anonymousReports.tenantId, ctx.tenantId!)];

      if (input?.status) {
        conditions.push(eq(anonymousReports.status, input.status));
      }
      if (input?.category) {
        conditions.push(eq(anonymousReports.category, input.category as any));
      }
      if (input?.severity) {
        conditions.push(eq(anonymousReports.severity, input.severity));
      }

      const reports = await db
        .select()
        .from(anonymousReports)
        .where(and(...conditions))
        .orderBy(desc(anonymousReports.createdAt));

      return reports;
    }),

  // Atualizar status e notas de denúncia
  updateStatus: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["received", "investigating", "resolved", "dismissed"]).optional(),
        adminNotes: z.string().optional(),
        resolution: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
      if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;
      if (data.resolution !== undefined) updateData.resolution = data.resolution;

      await db
        .update(anonymousReports)
        .set(updateData)
        .where(and(eq(anonymousReports.id, id), eq(anonymousReports.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // Legacy alias
  update: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["received", "investigating", "resolved", "dismissed"]).optional(),
        resolution: z.string().optional(),
        adminNotes: z.string().optional(),
        assignedTo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
      if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;
      if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;

      await db
        .update(anonymousReports)
        .set(updateData)
        .where(and(eq(anonymousReports.id, id), eq(anonymousReports.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // Estatísticas de denúncias
  getStats: tenantProcedure
    .input(z.object({}).optional())
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const reports = await db
        .select()
        .from(anonymousReports)
        .where(eq(anonymousReports.tenantId, ctx.tenantId!));

      const total = reports.length;

      const byCategory: Record<string, number> = {};
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
