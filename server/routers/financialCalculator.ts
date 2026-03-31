import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  financialParameters,
  mentalHealthIndicators,
  actionPlans,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

export const financialCalculatorRouter = router({
  // Obter parâmetros financeiros do tenant
  getParameters: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [params] = await db
        .select()
        .from(financialParameters)
        .where(eq(financialParameters.tenantId, ctx.tenantId!))
        .limit(1);

      // Retornar valores padrão se não existirem parâmetros
      if (!params) {
        return {
          tenantId: ctx.tenantId!,
          averageSalary: 500000, // R$ 5.000,00
          headcount: 100,
          avgReplacementCost: 1500000, // R$ 15.000,00
          dailyAbsenteeismCost: 25000, // R$ 250,00
          finePerWorker: 670808, // R$ 6.708,08
          litigationAvgCost: 5000000, // R$ 50.000,00
          isDefault: true,
        };
      }

      return { ...params, isDefault: false };
    }),

  // Atualizar parâmetros financeiros (upsert)
  updateParameters: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        averageSalary: z.number().optional(),
        headcount: z.number().optional(),
        avgReplacementCost: z.number().optional(),
        dailyAbsenteeismCost: z.number().optional(),
        finePerWorker: z.number().optional(),
        litigationAvgCost: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { tenantId, ...data } = input;

      // Verificar se já existe
      const [existing] = await db
        .select()
        .from(financialParameters)
        .where(eq(financialParameters.tenantId, ctx.tenantId!))
        .limit(1);

      if (existing) {
        const updateData: any = { updatedAt: new Date() };
        if (data.averageSalary !== undefined) updateData.averageSalary = data.averageSalary;
        if (data.headcount !== undefined) updateData.headcount = data.headcount;
        if (data.avgReplacementCost !== undefined) updateData.avgReplacementCost = data.avgReplacementCost;
        if (data.dailyAbsenteeismCost !== undefined) updateData.dailyAbsenteeismCost = data.dailyAbsenteeismCost;
        if (data.finePerWorker !== undefined) updateData.finePerWorker = data.finePerWorker;
        if (data.litigationAvgCost !== undefined) updateData.litigationAvgCost = data.litigationAvgCost;

        await db
          .update(financialParameters)
          .set(updateData)
          .where(eq(financialParameters.tenantId, ctx.tenantId!));
      } else {
        const id = nanoid();
        await db.insert(financialParameters).values({
          id,
          tenantId: ctx.tenantId!,
          averageSalary: data.averageSalary || 500000,
          headcount: data.headcount || 100,
          avgReplacementCost: data.avgReplacementCost || 1500000,
          dailyAbsenteeismCost: data.dailyAbsenteeismCost || 25000,
          finePerWorker: data.finePerWorker || 670808,
          litigationAvgCost: data.litigationAvgCost || 5000000,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return { success: true };
    }),

  // Calcular riscos financeiros
  calculate: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Buscar parâmetros financeiros
      const [params] = await db
        .select()
        .from(financialParameters)
        .where(eq(financialParameters.tenantId, ctx.tenantId!))
        .limit(1);

      // Usar valores padrão se não houver parâmetros
      const fp = {
        averageSalary: params?.averageSalary || 500000,
        headcount: params?.headcount || 100,
        avgReplacementCost: params?.avgReplacementCost || 1500000,
        dailyAbsenteeismCost: params?.dailyAbsenteeismCost || 25000,
        finePerWorker: params?.finePerWorker || 670808,
        litigationAvgCost: params?.litigationAvgCost || 5000000,
      };

      // Buscar últimos indicadores de saúde mental
      const [indicators] = await db
        .select()
        .from(mentalHealthIndicators)
        .where(eq(mentalHealthIndicators.tenantId, ctx.tenantId!))
        .orderBy(desc(mentalHealthIndicators.createdAt))
        .limit(1);

      const absenteeismRate = (indicators?.absenteeismRate || 0) / 100; // Converter centésimos para fração
      const turnoverRate = (indicators?.turnoverRate || 0) / 100;
      const burnoutCases = indicators?.burnoutCases || 0;

      // Cálculos de custo de risco
      const workDaysPerYear = 252;

      const annualAbsenteeismCost = Math.round(
        (absenteeismRate / 100) * fp.headcount * fp.dailyAbsenteeismCost * workDaysPerYear
      );

      const annualTurnoverCost = Math.round(
        (turnoverRate / 100) * fp.headcount * fp.avgReplacementCost
      );

      const fineRisk = fp.headcount * fp.finePerWorker;

      const litigationRisk = burnoutCases * fp.litigationAvgCost;

      const totalRiskCost =
        annualAbsenteeismCost + annualTurnoverCost + fineRisk + litigationRisk;

      return {
        parameters: fp,
        indicators: {
          absenteeismRate: indicators?.absenteeismRate || 0,
          turnoverRate: indicators?.turnoverRate || 0,
          burnoutCases,
        },
        costs: {
          annualAbsenteeismCost,
          annualTurnoverCost,
          fineRisk,
          litigationRisk,
          totalRiskCost,
        },
      };
    }),
});
