import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { tenantProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  riskAssessments,
  riskAssessmentItems,
  riskCategories,
  riskFactors,
  actionPlans,
  copsoqAssessments,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, isNull } from "drizzle-orm";
import { generateActionPlan } from "../_ai/actionPlanGenerator";

export const riskAssessmentsRouter = router({
  // Listar avaliações por tenant (autenticado + escopo)
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(), // ignorado — usa ctx.tenantId
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const assessments = await db
        .select()
        .from(riskAssessments)
        .where(eq(riskAssessments.tenantId, ctx.tenantId!))
        .orderBy(desc(riskAssessments.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return assessments;
    }),

  // Obter avaliação por ID (com verificação de tenant)
  get: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string().optional(), // ignorado — usa ctx.tenantId
      })
    )
    .query(async ({ ctx, input }) => {
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
            eq(riskAssessments.tenantId, ctx.tenantId!)
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
  create: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(), // ignorado — usa ctx.tenantId
        sectorId: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        assessmentDate: z.coerce.date(),
        assessor: z.string().optional(),
        methodology: z.string().optional(),
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

      await db.insert(riskAssessments).values({
        id,
        tenantId: ctx.tenantId!,
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
  update: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        assessmentDate: z.coerce.date().optional(),
        assessor: z.string().optional(),
        status: z.string().optional(),
        methodology: z.string().optional(),
        sectorId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { id, ...updates } = input;

      await db
        .update(riskAssessments)
        .set({
          ...updates as any,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(riskAssessments.id, id),
            eq(riskAssessments.tenantId, ctx.tenantId!)
          )
        );

      return { success: true };
    }),

  // Deletar avaliação
  delete: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string().optional(), // ignorado — usa ctx.tenantId
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verificar que pertence ao tenant
      const [assessment] = await db
        .select()
        .from(riskAssessments)
        .where(
          and(
            eq(riskAssessments.id, input.id),
            eq(riskAssessments.tenantId, ctx.tenantId!)
          )
        );

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found" });
      }

      // Primeiro deletar itens relacionados
      await db
        .delete(riskAssessmentItems)
        .where(eq(riskAssessmentItems.assessmentId, input.id));

      // Depois deletar a avaliação
      await db
        .delete(riskAssessments)
        .where(eq(riskAssessments.id, input.id));

      return { success: true };
    }),

  // Adicionar item de risco à avaliação (verifica que assessment pertence ao tenant)
  addItem: tenantProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        riskFactorId: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        probability: z.enum(["rare", "unlikely", "possible", "likely", "certain"]),
        affectedPopulation: z.number().optional(),
        currentControls: z.string().optional(),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verificar que a avaliação pertence ao tenant
      const [assessment] = await db
        .select()
        .from(riskAssessments)
        .where(
          and(
            eq(riskAssessments.id, input.assessmentId),
            eq(riskAssessments.tenantId, ctx.tenantId!)
          )
        );

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found or access denied" });
      }

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

  // Atualizar item de risco (com verificação de tenant via assessment)
  updateItem: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        assessmentId: z.string(),
        riskFactorId: z.string().optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        probability: z.enum(["rare", "unlikely", "possible", "likely", "certain"]).optional(),
        affectedPopulation: z.number().optional(),
        currentControls: z.string().optional(),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verificar que a avaliação pertence ao tenant
      const [assessment] = await db
        .select()
        .from(riskAssessments)
        .where(
          and(
            eq(riskAssessments.id, input.assessmentId),
            eq(riskAssessments.tenantId, ctx.tenantId!)
          )
        );

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found or access denied" });
      }

      const updateData: any = {};
      if (input.riskFactorId !== undefined) updateData.riskFactorId = input.riskFactorId;
      if (input.severity !== undefined) updateData.severity = input.severity;
      if (input.probability !== undefined) updateData.probability = input.probability;
      if (input.affectedPopulation !== undefined) updateData.affectedPopulation = input.affectedPopulation;
      if (input.currentControls !== undefined) updateData.currentControls = input.currentControls;
      if (input.observations !== undefined) updateData.observations = input.observations;

      // Recalcular nível de risco se severity ou probability mudaram
      if (input.severity || input.probability) {
        // Buscar item atual para pegar valores existentes
        const [currentItem] = await db
          .select()
          .from(riskAssessmentItems)
          .where(eq(riskAssessmentItems.id, input.id));

        if (currentItem) {
          const sev = input.severity || currentItem.severity;
          const prob = input.probability || currentItem.probability;
          const severityScore = { low: 1, medium: 2, high: 3, critical: 4 }[sev];
          const probabilityScore = { rare: 1, unlikely: 2, possible: 3, likely: 4, certain: 5 }[prob];
          const riskScore = severityScore * probabilityScore;

          let riskLevel: "low" | "medium" | "high" | "critical";
          if (riskScore <= 4) riskLevel = "low";
          else if (riskScore <= 8) riskLevel = "medium";
          else if (riskScore <= 12) riskLevel = "high";
          else riskLevel = "critical";

          updateData.riskLevel = riskLevel;
        }
      }

      await db
        .update(riskAssessmentItems)
        .set(updateData)
        .where(
          and(
            eq(riskAssessmentItems.id, input.id),
            eq(riskAssessmentItems.assessmentId, input.assessmentId)
          )
        );

      return { success: true };
    }),

  // Deletar item de risco (com verificação de tenant via assessment)
  deleteItem: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        assessmentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verificar que a avaliação pertence ao tenant
      const [assessment] = await db
        .select()
        .from(riskAssessments)
        .where(
          and(
            eq(riskAssessments.id, input.assessmentId),
            eq(riskAssessments.tenantId, ctx.tenantId!)
          )
        );

      if (!assessment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found or access denied" });
      }

      await db
        .delete(riskAssessmentItems)
        .where(
          and(
            eq(riskAssessmentItems.id, input.id),
            eq(riskAssessmentItems.assessmentId, input.assessmentId)
          )
        );

      return { success: true };
    }),

  // Listar categorias de risco (dados de referência - apenas autenticado)
  listCategories: protectedProcedure
    .input(z.object({}))
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const categories = await db
        .select()
        .from(riskCategories)
        .orderBy(riskCategories.order);

      return categories;
    }),

  // Listar fatores de risco por categoria (dados de referência - apenas autenticado)
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
  listActionPlans: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(), // ignorado — usa ctx.tenantId
        assessmentItemId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(actionPlans.tenantId, ctx.tenantId!)];

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
  createActionPlan: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(), // ignorado — usa ctx.tenantId
        assessmentItemId: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        actionType: z.string(),
        responsibleId: z.string().optional(),
        deadline: z.coerce.date().optional(),
        priority: z.string(),
        budget: z.number().optional(),
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

      await db.insert(actionPlans).values({
        id,
        tenantId: ctx.tenantId!,
        assessmentItemId: input.assessmentItemId || null,
        title: input.title,
        description: input.description || null,
        actionType: input.actionType as any,
        responsibleId: input.responsibleId || null,
        deadline: input.deadline || null,
        status: "pending",
        priority: input.priority as any,
        budget: input.budget || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id };
    }),

  // Atualizar plano de ação (com verificação de tenant)
  updateActionPlan: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        actionType: z.string().optional(),
        priority: z.string().optional(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        deadline: z.coerce.date().optional(),
        budget: z.number().optional(),
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

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.actionType !== undefined) updateData.actionType = data.actionType;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === "completed") updateData.completedAt = new Date();
      }
      if (data.deadline !== undefined) updateData.deadline = data.deadline;
      if (data.budget !== undefined) updateData.budget = data.budget;

      await db.update(actionPlans).set(updateData).where(
        and(eq(actionPlans.id, id), eq(actionPlans.tenantId, ctx.tenantId!))
      );

      return { success: true };
    }),

  // Deletar plano de ação (com verificação de tenant)
  deleteActionPlan: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db.delete(actionPlans).where(
        and(eq(actionPlans.id, input.id), eq(actionPlans.tenantId, ctx.tenantId!))
      );
      return { success: true };
    }),

  // Gerar planos de ação via IA a partir da avaliação de riscos
  generateActionPlans: tenantProcedure
    .input(
      z.object({
        assessmentId: z.string().optional(),
        sectorName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Find the latest COPSOQ assessment for this tenant
      const copsoqList = await db
        .select()
        .from(copsoqAssessments)
        .where(eq(copsoqAssessments.tenantId, ctx.tenantId!))
        .orderBy(desc(copsoqAssessments.createdAt))
        .limit(1);

      if (copsoqList.length === 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Nenhuma avaliação COPSOQ-II encontrada. Execute primeiro uma pesquisa COPSOQ-II para gerar planos de ação.",
        });
      }

      const result = await generateActionPlan({
        assessmentId: copsoqList[0].id,
        tenantId: ctx.tenantId!,
        sectorName: input.sectorName,
      });

      return {
        planTitle: result.planTitle,
        specificActions: result.actions.length,
        generalActions: result.generalActions.length,
        monitoringStrategy: result.monitoringStrategy,
        model: result.metadata.model,
      };
    }),
});
