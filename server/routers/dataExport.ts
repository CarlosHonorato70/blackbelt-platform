import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { subscribedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { dsrRequests } from "../../drizzle/schema_nr01";

export const dataExportRouter = router({
  // Lista todas as solicitações DSR do tenant
  list: subscribedProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(dsrRequests)
        .where(eq(dsrRequests.tenantId, input.tenantId))
        .orderBy(desc(dsrRequests.requestDate));
    }),

  // Cria nova solicitação DSR
  create: subscribedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        email: z.string().email("Email inválido"),
        requestType: z.enum(["export", "delete", "rectify"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const id = `dsr_${Date.now()}_${nanoid(8)}`;

      await db.insert(dsrRequests).values({
        id,
        tenantId: input.tenantId,
        email: input.email,
        requestType: input.requestType,
        status: "pendente",
        reason: input.reason || null,
        requestDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id, success: true };
    }),

  // Busca solicitação DSR por ID
  getById: subscribedProcedure
    .input(z.object({ id: z.string(), tenantId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(dsrRequests)
        .where(
          and(
            eq(dsrRequests.id, input.id),
            eq(dsrRequests.tenantId, input.tenantId)
          )
        )
        .limit(1);

      return result[0] || null;
    }),

  // Cancela solicitação DSR (apenas se pendente)
  cancel: subscribedProcedure
    .input(z.object({ id: z.string(), tenantId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificar se existe e está pendente
      const existing = await db
        .select()
        .from(dsrRequests)
        .where(
          and(
            eq(dsrRequests.id, input.id),
            eq(dsrRequests.tenantId, input.tenantId)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Solicitação não encontrada",
        });
      }

      if (existing[0].status !== "pendente") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Apenas solicitações pendentes podem ser canceladas",
        });
      }

      await db
        .delete(dsrRequests)
        .where(
          and(
            eq(dsrRequests.id, input.id),
            eq(dsrRequests.tenantId, input.tenantId)
          )
        );

      return { success: true };
    }),
});
