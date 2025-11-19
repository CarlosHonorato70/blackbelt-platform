import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { complianceDocuments } from "../../drizzle/schema_nr01";
import { eq, and, desc } from "drizzle-orm";

export const complianceReportsRouter = router({
  // Listar documentos de compliance

    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(complianceDocuments.tenantId, input.tenantId)];

      if (input.documentType) {
        conditions.push(
          eq(complianceDocuments.documentType, input.documentType)
        );
      }

      if (input.status) {
        conditions.push(eq(complianceDocuments.status, input.status));
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

    .mutation(async ({ input }) => {
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
        documentType: input.documentType,
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
ain
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
