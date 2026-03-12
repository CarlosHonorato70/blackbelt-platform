import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "../_core/trpc";
import { requireActiveSubscription } from "../_core/subscriptionMiddleware";
import { getDb } from "../db";
import {
  pcmsoRecommendations,
  riskAssessmentItems,
  riskFactors,
} from "../../drizzle/schema_nr01";
import { eq, and, desc } from "drizzle-orm";

export const pcmsoIntegrationRouter = router({
  // Listar recomendações PCMSO por tenant
  list: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        riskAssessmentId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(pcmsoRecommendations.tenantId, input.tenantId)];

      if (input.riskAssessmentId) {
        conditions.push(
          eq(pcmsoRecommendations.riskAssessmentId, input.riskAssessmentId)
        );
      }

      const recommendations = await db
        .select()
        .from(pcmsoRecommendations)
        .where(and(...conditions))
        .orderBy(desc(pcmsoRecommendations.createdAt));

      return recommendations;
    }),

  // Gerar recomendações PCMSO automaticamente a partir de avaliação de risco
  generate: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        riskAssessmentId: z.string(),
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

      // Buscar itens de risco alto/crítico da avaliação
      const items = await db
        .select({
          item: riskAssessmentItems,
          factor: riskFactors,
        })
        .from(riskAssessmentItems)
        .innerJoin(riskFactors, eq(riskAssessmentItems.riskFactorId, riskFactors.id))
        .where(eq(riskAssessmentItems.assessmentId, input.riskAssessmentId));

      const highRiskItems = items.filter(
        (i) => i.item.severity === "high" || i.item.severity === "critical"
      );

      if (highRiskItems.length === 0) {
        return { generated: 0, ids: [] };
      }

      const ids: string[] = [];

      for (const { item, factor } of highRiskItems) {
        const id = nanoid();
        ids.push(id);

        // Determinar tipo de exame baseado no fator de risco
        const factorNameLower = factor.name.toLowerCase();
        let examType = "Avaliação de Saúde Mental";
        if (factorNameLower.includes("estresse") || factorNameLower.includes("stress")) {
          examType = "Avaliação Psicológica";
        } else if (factorNameLower.includes("burnout") || factorNameLower.includes("esgotamento")) {
          examType = "Avaliação Psiquiátrica";
        } else if (factorNameLower.includes("violência") || factorNameLower.includes("assédio") || factorNameLower.includes("violence")) {
          examType = "Triagem SRQ-20";
        }

        // Frequência baseada na severidade
        let frequency = "Bienal";
        if (item.severity === "critical") {
          frequency = "Semestral";
        } else if (item.severity === "high") {
          frequency = "Anual";
        }

        await db.insert(pcmsoRecommendations).values({
          id,
          tenantId: input.tenantId,
          riskAssessmentId: input.riskAssessmentId,
          riskFactorId: item.riskFactorId,
          examType,
          frequency,
          targetPopulation: item.affectedPopulation
            ? `${item.affectedPopulation} trabalhadores expostos`
            : null,
          medicalBasis: `Baseado em avaliação de risco - Severidade: ${item.severity}, Fator: ${factor.name}`,
          priority: item.severity === "critical" ? "urgent" : "high",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return { generated: ids.length, ids };
    }),

  // Atualizar recomendação PCMSO
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        examType: z.string().optional(),
        frequency: z.string().optional(),
        targetPopulation: z.string().optional(),
        medicalBasis: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
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

      if (data.examType !== undefined) updateData.examType = data.examType;
      if (data.frequency !== undefined) updateData.frequency = data.frequency;
      if (data.targetPopulation !== undefined) updateData.targetPopulation = data.targetPopulation;
      if (data.medicalBasis !== undefined) updateData.medicalBasis = data.medicalBasis;
      if (data.priority !== undefined) updateData.priority = data.priority;

      await db
        .update(pcmsoRecommendations)
        .set(updateData)
        .where(eq(pcmsoRecommendations.id, id));

      return { success: true };
    }),

  // Deletar recomendação PCMSO
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .delete(pcmsoRecommendations)
        .where(eq(pcmsoRecommendations.id, input.id));

      return { success: true };
    }),
});
