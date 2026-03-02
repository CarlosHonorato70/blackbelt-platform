import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "../_core/trpc";
import { requireActiveSubscription } from "../_core/subscriptionMiddleware";
import { getDb } from "../db";
import { complianceDocuments } from "../../drizzle/schema_nr01";
import { eq, and, desc } from "drizzle-orm";

export const complianceReportsRouter = router({
  // Listar documentos de compliance
  list: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        documentType: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(complianceDocuments.tenantId, input.tenantId)];

      if (input.documentType) {
        conditions.push(
          eq(complianceDocuments.documentType, input.documentType as any)
        );
      }

      if (input.status) {
        conditions.push(eq(complianceDocuments.status, input.status as any));
      }

      const documents = await db
        .select()
        .from(complianceDocuments)
        .where(and(...conditions))
        .orderBy(desc(complianceDocuments.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return documents;
    }),

  // Obter documento por ID
  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [document] = await db
        .select()
        .from(complianceDocuments)
        .where(
          and(
            eq(complianceDocuments.id, input.id),
            eq(complianceDocuments.tenantId, input.tenantId)
          )
        );

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Compliance document not found",
        });
      }

      return document;
    }),

  // Criar novo documento
  create: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        documentType: z.string(),
        title: z.string(),
        description: z.string().optional(),
        fileUrl: z.string().optional(),
        version: z.string(),
        validFrom: z.date(),
        validUntil: z.date().optional(),
        signedBy: z.string().optional(),
        signedAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await requireActiveSubscription(input.tenantId);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const id = nanoid();

      await db.insert(complianceDocuments).values({
        id,
        tenantId: input.tenantId,
        documentType: input.documentType as any,
        title: input.title,
        description: input.description || null,
        fileUrl: input.fileUrl || null,
        version: input.version,
        validFrom: input.validFrom,
        validUntil: input.validUntil || null,
        status: "draft",
        signedBy: input.signedBy || null,
        signedAt: input.signedAt || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id };
    }),

  // Atualizar documento
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
      }).passthrough()
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { id, tenantId, ...updates } = input;

      await db
        .update(complianceDocuments)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(complianceDocuments.id, id),
            eq(complianceDocuments.tenantId, tenantId)
          )
        );

      return { success: true };
    }),

  // Deletar documento
  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .delete(complianceDocuments)
        .where(
          and(
            eq(complianceDocuments.id, input.id),
            eq(complianceDocuments.tenantId, input.tenantId)
          )
        );

      return { success: true };
    }),

  // Assinar documento
  sign: publicProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
        signedBy: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await requireActiveSubscription(input.tenantId);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(complianceDocuments)
        .set({
          signedBy: input.signedBy,
          signedAt: new Date(),
          status: "active",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(complianceDocuments.id, input.id),
            eq(complianceDocuments.tenantId, input.tenantId)
          )
        );

      return { success: true };
    }),

  // Arquivar documento
  archive: publicProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(complianceDocuments)
        .set({
          status: "archived",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(complianceDocuments.id, input.id),
            eq(complianceDocuments.tenantId, input.tenantId)
          )
        );

      return { success: true };
    }),
});
