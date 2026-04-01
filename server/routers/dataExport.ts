import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { subscribedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { dsrRequests, copsoqResponses, copsoqInvites } from "../../drizzle/schema_nr01";
import { users } from "../../drizzle/schema";
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

  // ============================================================
  // Admin endpoints for DSR processing
  // ============================================================

  adminList: adminProcedure
    .input(z.object({
      status: z.enum(["pendente", "processando", "completo", "erro"]).optional(),
      limit: z.number().min(1).max(200).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      if (input?.status) {
        return db.select().from(dsrRequests)
          .where(eq(dsrRequests.status, input.status))
          .orderBy(desc(dsrRequests.requestDate))
          .limit(input.limit || 50);
      }

      return db.select().from(dsrRequests)
        .orderBy(desc(dsrRequests.requestDate))
        .limit(input?.limit || 50);
    }),

  processExport: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [dsr] = await db.select().from(dsrRequests).where(eq(dsrRequests.id, input.id)).limit(1);
      if (!dsr) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });

      await db.update(dsrRequests).set({ status: "processando", updatedAt: new Date() }).where(eq(dsrRequests.id, input.id));

      try {
        const email = dsr.email;
        const userData: Record<string, any> = {};

        // 1. User account info (excluding passwordHash)
        const userRecords = await db.select({
          id: users.id, name: users.name, email: users.email,
          role: users.role, tenantId: users.tenantId,
          emailVerified: users.emailVerified, createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        }).from(users).where(eq(users.email, email));
        userData.account = userRecords;

        // 2. COPSOQ invites (by respondentEmail)
        const inviteData = await db.select().from(copsoqInvites).where(eq(copsoqInvites.respondentEmail, email));
        if (inviteData.length > 0) userData.copsoqInvites = inviteData;

        // 4. DSR requests history
        const dsrHistory = await db.select().from(dsrRequests).where(eq(dsrRequests.email, email));
        userData.dsrRequests = dsrHistory;

        const exportData = {
          exportDate: new Date().toISOString(),
          dataSubject: email,
          platform: "BlackBelt Platform",
          data: userData,
        };

        const jsonStr = JSON.stringify(exportData, null, 2);
        const fileSize = `${(Buffer.byteLength(jsonStr) / 1024).toFixed(1)} KB`;

        await db.update(dsrRequests).set({
          status: "completo",
          format: "JSON",
          fileSize,
          completionDate: new Date(),
          updatedAt: new Date(),
        }).where(eq(dsrRequests.id, input.id));

        return { success: true, data: exportData, fileSize };
      } catch (err) {
        await db.update(dsrRequests).set({
          status: "erro",
          errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
          updatedAt: new Date(),
        }).where(eq(dsrRequests.id, input.id));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar exportação" });
      }
    }),

  processDeletion: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [dsr] = await db.select().from(dsrRequests).where(eq(dsrRequests.id, input.id)).limit(1);
      if (!dsr) throw new TRPCError({ code: "NOT_FOUND" });
      if (dsr.requestType !== "delete") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta solicitação não é de exclusão" });

      await db.update(dsrRequests).set({ status: "processando", updatedAt: new Date() }).where(eq(dsrRequests.id, input.id));

      try {
        const email = dsr.email;
        const anonymized = `deleted_${Date.now()}@anon.blackbelt`;
        let deletedCount = 0;

        // 1. Delete COPSOQ invites (by respondentEmail)
        await db.delete(copsoqInvites).where(eq(copsoqInvites.respondentEmail, email));
        deletedCount++;

        // 3. Anonymize user account (don't delete - keep for audit)
        await db.update(users).set({
          name: "Usuário Removido",
          email: anonymized,
          passwordHash: null,
          emailVerified: false,
        }).where(eq(users.email, email));
        deletedCount++;

        // Mark DSR as complete
        await db.update(dsrRequests).set({
          status: "completo",
          completionDate: new Date(),
          updatedAt: new Date(),
        }).where(eq(dsrRequests.id, input.id));

        return { success: true, deletedCount };
      } catch (err) {
        await db.update(dsrRequests).set({
          status: "erro",
          errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
          updatedAt: new Date(),
        }).where(eq(dsrRequests.id, input.id));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar exclusão" });
      }
    }),
});
