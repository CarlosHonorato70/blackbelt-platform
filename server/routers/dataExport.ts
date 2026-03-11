import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { subscribedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { dsrRequests } from "../../drizzle/schema_nr01";
import { log } from "../_core/logger";

export const dataExportRouter = router({
  // ============================================================
  // Endpoint PUBLICO para nao-usuarios enviarem solicitacoes LGPD
  // ============================================================
  publicDsr: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        email: z.string().email("Email invalido"),
        requestType: z.enum(["export", "delete", "rectify"]),
        reason: z.string().min(10, "Descreva o motivo com pelo menos 10 caracteres"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const id = `dsr_${Date.now()}_${nanoid(8)}`;

      await db.insert(dsrRequests).values({
        id,
        tenantId: "__public__",
        email: input.email,
        requestType: input.requestType,
        status: "pendente",
        reason: `[${input.name}] ${input.reason}`,
        requestDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      log.info("Public DSR request created", { id, email: input.email, type: input.requestType });

      return { success: true, protocol: id };
    }),

  // Lista todas as solicitações DSR do tenant
  list: subscribedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(dsrRequests)
        .where(eq(dsrRequests.tenantId, ctx.tenantId!))
        .orderBy(desc(dsrRequests.requestDate));
    }),

  // Cria nova solicitação DSR
  create: subscribedProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        requestType: z.enum(["export", "delete", "rectify"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const id = `dsr_${Date.now()}_${nanoid(8)}`;

      await db.insert(dsrRequests).values({
        id,
        tenantId: ctx.tenantId!,
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
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(dsrRequests)
        .where(
          and(
            eq(dsrRequests.id, input.id),
            eq(dsrRequests.tenantId, ctx.tenantId!)
          )
        )
        .limit(1);

      return result[0] || null;
    }),

  // Cancela solicitação DSR (apenas se pendente)
  cancel: subscribedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificar se existe e está pendente
      const existing = await db
        .select()
        .from(dsrRequests)
        .where(
          and(
            eq(dsrRequests.id, input.id),
            eq(dsrRequests.tenantId, ctx.tenantId!)
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
            eq(dsrRequests.tenantId, ctx.tenantId!)
          )
        );

      return { success: true };
    }),
});
