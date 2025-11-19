import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  riskAssessments,
  riskAssessmentItems,
  riskCategories,
  riskFactors,
  actionPlans,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, isNull } from "drizzle-orm";

export const riskAssessmentsRouter = router({
  // Listar avaliações por tenant
  list: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const assessments = await db
        .select()
        .from(riskAssessments)
        .where(eq(riskAssessments.tenantId, input.tenantId))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return assessments;
    }),

  // Obter avaliação por ID
  getById: protectedProcedure
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
        .from(riskAssessments)
        .where(
          and(
            eq(riskAssessments.id, input.id),
            eq(riskAssessments.tenantId, input.tenantId)
          )
        );

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Assessment not found",
        });
      }

      // Buscar itens da avaliação
      const items = await db
        .select()
        .from(riskAssessmentItems)
        .where(eq(riskAssessmentItems.assessmentId, input.id));

      return {
        ...assessment,
        items,
      };
    }),

  // Criar nova avaliação
  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        sectorId: z.string().optional(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        assessmentDate: z.date(),
        assessor: z.string().optional(),
        methodology: z.string().optional(),
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

      await db.insert(riskAssessments).values({
        id,
        tenantId: input.tenantId,
        sectorId: input.sectorId || null,
        title: input.title,
        description: input.description || null,
        assessmentDate: input.assessmentDate,
        assessor: input.assessor || null,
        status: "draft",
        methodology: input.methodology || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id };
    }),

  // Atualizar avaliação
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
        sectorId: z.string().optional(),
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        assessmentDate: z.date().optional(),
        assessor: z.string().optional(),
        status: z
          .enum(["draft", "in_progress", "completed", "reviewed"])
          .optional(),
        methodology: z.string().optional(),
      })
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
        .update(riskAssessments)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(riskAssessments.id, id),
            eq(riskAssessments.tenantId, tenantId)
          )
        );

      return { success: true };
    }),

  // Deletar avaliação
  delete: protectedProcedure
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

      // Primeiro deletar itens relacionados
      await db
        .delete(riskAssessmentItems)
        .where(eq(riskAssessmentItems.assessmentId, input.id));

      // Depois deletar a avaliação
      await db
        .delete(riskAssessments)
        .where(
          and(
            eq(riskAssessments.id, input.id),
            eq(riskAssessments.tenantId, input.tenantId)
          )
        );

      return { success: true };
    }),

  // Adicionar item de risco à avaliação
  addItem: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        riskFactorId: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        probability: z.enum([
          "rare",
          "unlikely",
          "possible",
          "likely",
          "certain",
        ]),
        affectedPopulation: z.number().optional(),
        currentControls: z.string().optional(),
        observations: z.string().optional(),
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

      // Calcular nível de risco baseado em severidade e probabilidade
      const severityScore = { low: 1, medium: 2, high: 3, critical: 4 }[
        input.severity
      ];
      const probabilityScore = {
        rare: 1,
        unlikely: 2,
        possible: 3,
        likely: 4,
        certain: 5,
      }[input.probability];
      const riskScore = severityScore * probabilityScore;

      let riskLevel: "low" | "medium" | "high" | "critical";
      if (riskScore <= 4) riskLevel = "low";
      else if (riskScore <= 8) riskLevel = "medium";
      else if (riskScore <= 12) riskLevel = "high";
      else riskLevel = "critical";

      await db.insert(riskAssessmentItems).values({
        id,
        assessmentId: input.assessmentId,
        riskFactorId: input.riskFactorId,
        severity: input.severity,
        probability: input.probability,
        riskLevel,
        affectedPopulation: input.affectedPopulation || null,
        currentControls: input.currentControls || null,
        observations: input.observations || null,
        createdAt: new Date(),
      });

      return { id, riskLevel };
    }),

  // Listar categorias de risco
  listCategories: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const categories = await db
      .select()
      .from(riskCategories)
      .orderBy(riskCategories.order);

    return categories;
  }),

  // Listar fatores de risco por categoria
  listFactors: protectedProcedure
    .input(
      z.object({
        categoryId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db.select().from(riskFactors);

      if (input.categoryId) {
        query = query.where(
          eq(riskFactors.categoryId, input.categoryId)
        ) as any;
      }

      const factors = await query.orderBy(riskFactors.order);
      return factors;
    }),

  // Listar planos de ação por tenant
  listActionPlans: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        assessmentItemId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(actionPlans.tenantId, input.tenantId)];

      if (input.assessmentItemId) {
        conditions.push(
          eq(actionPlans.assessmentItemId, input.assessmentItemId)
        );
      }

      const plans = await db
        .select()
        .from(actionPlans)
        .where(and(...conditions))
        .orderBy(desc(actionPlans.createdAt));

      return plans;
    }),

  // Criar plano de ação
  createActionPlan: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        assessmentItemId: z.string().optional(),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        actionType: z.enum([
          "elimination",
          "substitution",
          "engineering",
          "administrative",
          "ppe",
        ]),
        responsibleId: z.string().optional(),
        deadline: z.date().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        budget: z.number().optional(),
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

      await db.insert(actionPlans).values({
        id,
        tenantId: input.tenantId,
        assessmentItemId: input.assessmentItemId || null,
        title: input.title,
        description: input.description || null,
        actionType: input.actionType,
        responsibleId: input.responsibleId || null,
        deadline: input.deadline || null,
        status: "pending",
        priority: input.priority,
        budget: input.budget || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id };
    }),
});
