import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { complianceDocuments } from "../../drizzle/schema_nr01";
import { eq, and, desc } from "drizzle-orm";

export const complianceReportsRouter = router({
  // Listar documentos de compliance
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        documentType: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(complianceDocuments.tenantId, ctx.tenantId!)];

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
  get: tenantProcedure
    .input(
      z.object({
        id: z.string(),
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

      const [document] = await db
        .select()
        .from(complianceDocuments)
        .where(
          and(
            eq(complianceDocuments.id, input.id),
            eq(complianceDocuments.tenantId, ctx.tenantId!)
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
  create: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        documentType: z.string(),
        title: z.string(),
        description: z.string().optional(),
        fileUrl: z.string().optional(),
        version: z.string(),
        validFrom: z.coerce.date(),
        validUntil: z.coerce.date().optional(),
        signedBy: z.string().optional(),
        signedAt: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const id = nanoid();

      await db.insert(complianceDocuments).values({
        id,
        tenantId: ctx.tenantId!,
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
  update: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string().optional(),
      }).passthrough()
    )
    .mutation(async ({ ctx, input }) => {
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
            eq(complianceDocuments.tenantId, ctx.tenantId!)
          )
        );

      return { success: true };
    }),

  // Deletar documento
  delete: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
            eq(complianceDocuments.tenantId, ctx.tenantId!)
          )
        );

      return { success: true };
    }),

  // Assinar documento
  sign: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string().optional(),
        signedBy: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
            eq(complianceDocuments.tenantId, ctx.tenantId!)
          )
        );

      return { success: true };
    }),

  // Arquivar documento
  archive: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
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
            eq(complianceDocuments.tenantId, ctx.tenantId!)
          )
        );

      return { success: true };
    }),
});
