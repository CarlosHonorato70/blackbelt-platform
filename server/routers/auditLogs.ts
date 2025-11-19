import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { auditLogs } from "../../drizzle/schema";
import { eq, and, desc, gte, lte, isNull } from "drizzle-orm";

export const auditLogsRouter = router({
  // Listar logs de auditoria

    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];

      if (input.tenantId !== undefined) {
        if (input.tenantId === "") {
          conditions.push(isNull(auditLogs.tenantId));
        } else {
          conditions.push(eq(auditLogs.tenantId, input.tenantId));
        }
      }

      if (input.userId) {
        conditions.push(eq(auditLogs.userId, input.userId));
      }

      if (input.entityType) {
        conditions.push(eq(auditLogs.entityType, input.entityType));
      }

      if (input.action) {
        conditions.push(eq(auditLogs.action, input.action));
      }

      if (input.startDate) {
        conditions.push(gte(auditLogs.timestamp, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(auditLogs.timestamp, input.endDate));
      }

      let query = db.select().from(auditLogs);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const logs = await query
        .orderBy(desc(auditLogs.timestamp))
        .limit(input.limit)
        .offset(input.offset);

      return logs;
    }),

  // Obter log específico

    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [log] = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.id, input.id));

      if (!log) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Audit log not found",
        });
      }

      return log;
    }),

  // Estatísticas de auditoria

    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        return {
          total: 0,
          byAction: {},
          byEntityType: {},
          byUser: {},
        };

      const conditions = [];

      if (input.tenantId !== undefined) {
        if (input.tenantId === "") {
          conditions.push(isNull(auditLogs.tenantId));
        } else {
          conditions.push(eq(auditLogs.tenantId, input.tenantId));
        }
      }

      if (input.startDate) {
        conditions.push(gte(auditLogs.timestamp, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(auditLogs.timestamp, input.endDate));
      }

      let query = db.select().from(auditLogs);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const logs = await query;

      // Calcular estatísticas
      const stats = {
        total: logs.length,
        byAction: {} as Record<string, number>,
        byEntityType: {} as Record<string, number>,
        byUser: {} as Record<string, number>,
      };

      logs.forEach(log => {
        // Por ação
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

        // Por tipo de entidade
        stats.byEntityType[log.entityType] =
          (stats.byEntityType[log.entityType] || 0) + 1;

        // Por usuário
        stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
      });

      return stats;
    }),
});
