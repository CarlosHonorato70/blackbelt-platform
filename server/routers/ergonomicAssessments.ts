import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "../_core/trpc";
import { requireActiveSubscription } from "../_core/subscriptionMiddleware";
import { getDb } from "../db";
import {
  ergonomicAssessments,
  ergonomicItems,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

export const ergonomicAssessmentsRouter = router({
  // Listar avaliações ergonômicas com contagem de itens
  list: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const assessments = await db
        .select()
        .from(ergonomicAssessments)
        .where(eq(ergonomicAssessments.tenantId, input.tenantId))
        .orderBy(desc(ergonomicAssessments.createdAt));

      const result = [];
      for (const assessment of assessments) {
        const [itemCount] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(ergonomicItems)
          .where(eq(ergonomicItems.assessmentId, assessment.id));

        result.push({
          ...assessment,
          itemCount: itemCount?.count || 0,
        });
      }

      return result;
    }),

  // Obter avaliação com todos os itens
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

      const [assessment] = await db
        .select()
        .from(ergonomicAssessments)
        .where(
          and(
            eq(ergonomicAssessments.id, input.id),
            eq(ergonomicAssessments.tenantId, input.tenantId)
          )
        );

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Avaliação ergonômica não encontrada",
        });
      }

      const items = await db
        .select()
        .from(ergonomicItems)
        .where(eq(ergonomicItems.assessmentId, input.id));

      return {
        ...assessment,
        items,
      };
    }),

  // Criar avaliação ergonômica
  create: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        sectorId: z.string().optional(),
        title: z.string(),
        assessorName: z.string().optional(),
        assessmentDate: z.coerce.date(),
        methodology: z.string().optional(),
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

      await db.insert(ergonomicAssessments).values({
        id,
        tenantId: input.tenantId,
        sectorId: input.sectorId || null,
        title: input.title,
        assessorName: input.assessorName || null,
        assessmentDate: input.assessmentDate,
        status: "draft",
        methodology: input.methodology || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id };
    }),

  // Atualizar avaliação
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        status: z.enum(["draft", "in_progress", "completed", "reviewed"]).optional(),
        assessorName: z.string().optional(),
        methodology: z.string().optional(),
        overallRiskLevel: z.enum(["acceptable", "moderate", "high", "critical"]).optional(),
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

      if (data.title !== undefined) updateData.title = data.title;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.assessorName !== undefined) updateData.assessorName = data.assessorName;
      if (data.methodology !== undefined) updateData.methodology = data.methodology;
      if (data.overallRiskLevel !== undefined) updateData.overallRiskLevel = data.overallRiskLevel;

      await db
        .update(ergonomicAssessments)
        .set(updateData)
        .where(eq(ergonomicAssessments.id, id));

      return { success: true };
    }),

  // Deletar avaliação (itens primeiro, depois avaliação)
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Deletar itens primeiro
      await db
        .delete(ergonomicItems)
        .where(eq(ergonomicItems.assessmentId, input.id));

      // Depois deletar a avaliação
      await db
        .delete(ergonomicAssessments)
        .where(eq(ergonomicAssessments.id, input.id));

      return { success: true };
    }),

  // Adicionar item ergonômico
  addItem: publicProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        category: z.enum(["workstation", "posture", "repetition", "lighting", "noise", "organization", "psychosocial"]),
        factor: z.string(),
        riskLevel: z.enum(["acceptable", "moderate", "high", "critical"]),
        observation: z.string().optional(),
        recommendation: z.string().optional(),
        photoUrl: z.string().optional(),
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

      await db.insert(ergonomicItems).values({
        id,
        assessmentId: input.assessmentId,
        category: input.category,
        factor: input.factor,
        riskLevel: input.riskLevel,
        observation: input.observation || null,
        recommendation: input.recommendation || null,
        photoUrl: input.photoUrl || null,
        createdAt: new Date(),
      });

      return { id };
    }),

  // Atualizar item ergonômico
  updateItem: publicProcedure
    .input(
      z.object({
        id: z.string(),
        riskLevel: z.enum(["acceptable", "moderate", "high", "critical"]).optional(),
        observation: z.string().optional(),
        recommendation: z.string().optional(),
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
      const updateData: any = {};

      if (data.riskLevel !== undefined) updateData.riskLevel = data.riskLevel;
      if (data.observation !== undefined) updateData.observation = data.observation;
      if (data.recommendation !== undefined) updateData.recommendation = data.recommendation;

      await db
        .update(ergonomicItems)
        .set(updateData)
        .where(eq(ergonomicItems.id, id));

      return { success: true };
    }),

  // Deletar item ergonômico
  deleteItem: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .delete(ergonomicItems)
        .where(eq(ergonomicItems.id, input.id));

      return { success: true };
    }),
});
