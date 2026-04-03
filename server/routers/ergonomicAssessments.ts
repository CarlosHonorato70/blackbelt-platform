import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  ergonomicAssessments,
  ergonomicItems,
  actionPlans,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

export const ergonomicAssessmentsRouter = router({
  // Listar avaliações ergonômicas com contagem de itens
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const assessments = await db
        .select()
        .from(ergonomicAssessments)
        .where(eq(ergonomicAssessments.tenantId, ctx.tenantId!))
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

      const [assessment] = await db
        .select()
        .from(ergonomicAssessments)
        .where(
          and(
            eq(ergonomicAssessments.id, input.id),
            eq(ergonomicAssessments.tenantId, ctx.tenantId!)
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
  create: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        sectorId: z.string().optional(),
        title: z.string(),
        assessorName: z.string().optional(),
        assessmentDate: z.coerce.date(),
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

      await db.insert(ergonomicAssessments).values({
        id,
        tenantId: ctx.tenantId!,
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
  update: tenantProcedure
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
      if (data.status !== undefined) updateData.status = data.status;
      if (data.assessorName !== undefined) updateData.assessorName = data.assessorName;
      if (data.methodology !== undefined) updateData.methodology = data.methodology;
      if (data.overallRiskLevel !== undefined) updateData.overallRiskLevel = data.overallRiskLevel;

      await db
        .update(ergonomicAssessments)
        .set(updateData)
        .where(and(eq(ergonomicAssessments.id, id), eq(ergonomicAssessments.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // Deletar avaliação (itens primeiro, depois avaliação)
  delete: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
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
        .where(and(eq(ergonomicAssessments.id, input.id), eq(ergonomicAssessments.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // Adicionar item ergonômico
  addItem: tenantProcedure
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
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verify assessment belongs to tenant
      const [assessment] = await db.select().from(ergonomicAssessments).where(and(eq(ergonomicAssessments.id, input.assessmentId), eq(ergonomicAssessments.tenantId, ctx.tenantId!)));
      if (!assessment) throw new TRPCError({ code: "NOT_FOUND", message: "Avaliação não encontrada" });

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
  updateItem: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        riskLevel: z.enum(["acceptable", "moderate", "high", "critical"]).optional(),
        observation: z.string().optional(),
        recommendation: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verify item belongs to tenant's assessment
      const [item] = await db.select({ id: ergonomicItems.id }).from(ergonomicItems).innerJoin(ergonomicAssessments, eq(ergonomicItems.assessmentId, ergonomicAssessments.id)).where(and(eq(ergonomicItems.id, input.id), eq(ergonomicAssessments.tenantId, ctx.tenantId!)));
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });

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
  deleteItem: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verify item belongs to tenant's assessment
      const [item] = await db.select({ id: ergonomicItems.id }).from(ergonomicItems).innerJoin(ergonomicAssessments, eq(ergonomicItems.assessmentId, ergonomicAssessments.id)).where(and(eq(ergonomicItems.id, input.id), eq(ergonomicAssessments.tenantId, ctx.tenantId!)));
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });

      await db
        .delete(ergonomicItems)
        .where(eq(ergonomicItems.id, input.id));

      return { success: true };
    }),

  // Gerar planos de ação automaticamente a partir dos itens de risco alto/crítico
  generateActionPlans: tenantProcedure
    .input(z.object({ assessmentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verify assessment belongs to tenant
      const [assessment] = await db.select().from(ergonomicAssessments).where(
        and(eq(ergonomicAssessments.id, input.assessmentId), eq(ergonomicAssessments.tenantId, ctx.tenantId!))
      );
      if (!assessment) throw new TRPCError({ code: "NOT_FOUND", message: "Avaliação não encontrada" });

      // Get all items with high or critical risk
      const items = await db.select().from(ergonomicItems)
        .where(eq(ergonomicItems.assessmentId, input.assessmentId));

      const riskItems = items.filter(i => i.riskLevel === "high" || i.riskLevel === "critical");
      if (riskItems.length === 0) {
        return { created: 0, message: "Nenhum item com risco alto ou crítico encontrado." };
      }

      const CATEGORY_LABELS: Record<string, string> = {
        workstation: "Posto de trabalho",
        posture: "Postura",
        repetition: "Repetitividade",
        lighting: "Iluminação",
        noise: "Ruído",
        organization: "Organização do trabalho",
        psychosocial: "Psicossocial",
      };

      const ACTION_TYPE_MAP: Record<string, "elimination" | "substitution" | "engineering" | "administrative" | "ppe"> = {
        workstation: "engineering",
        posture: "administrative",
        repetition: "administrative",
        lighting: "engineering",
        noise: "engineering",
        organization: "administrative",
        psychosocial: "administrative",
      };

      const createdPlans = [];
      for (const item of riskItems) {
        const planId = nanoid();
        const categoryLabel = CATEGORY_LABELS[item.category] || item.category;
        const actionType = ACTION_TYPE_MAP[item.category] || "administrative";
        const priority = item.riskLevel === "critical" ? "urgent" as const : "high" as const;

        // Set deadline: 30 days for critical, 90 for high
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + (item.riskLevel === "critical" ? 30 : 90));

        await db.insert(actionPlans).values({
          id: planId,
          tenantId: ctx.tenantId!,
          assessmentItemId: item.id,
          title: `[NR-17] ${categoryLabel}: ${item.factor}`,
          description: item.recommendation || `Mitigar risco ergonômico: ${item.observation || item.factor}`,
          actionType,
          deadline,
          status: "pending",
          priority,
          regulatoryBasis: "NR-17 (Ergonomia) — AEP/AET",
          templateType: item.riskLevel === "critical" ? "nr01_corrective" : "nr01_preventive",
          verificationMethod: `Reavaliação ergonômica do item "${item.factor}" após implementação`,
          effectivenessIndicator: `Redução do nível de risco de "${item.riskLevel}" para "acceptable" ou "moderate"`,
          aiGenerated: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        createdPlans.push({ id: planId, title: `[NR-17] ${categoryLabel}: ${item.factor}`, priority });
      }

      return {
        created: createdPlans.length,
        plans: createdPlans,
        message: `${createdPlans.length} plano(s) de ação criado(s) a partir de itens ergonômicos de risco alto/crítico.`,
      };
    }),

  // Listar planos de ação relacionados a uma avaliação ergonômica
  listRelatedActionPlans: tenantProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Get all item IDs from this assessment
      const items = await db.select({ id: ergonomicItems.id }).from(ergonomicItems)
        .where(eq(ergonomicItems.assessmentId, input.assessmentId));

      if (items.length === 0) return [];

      const itemIds = items.map(i => i.id);

      // Find action plans linked to these items
      const plans = await db.select().from(actionPlans)
        .where(
          and(
            eq(actionPlans.tenantId, ctx.tenantId!),
            sql`${actionPlans.assessmentItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`
          )
        )
        .orderBy(desc(actionPlans.createdAt));

      return plans;
    }),
});
