import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "../_core/trpc";
import { requireActiveSubscription } from "../_core/subscriptionMiddleware";
import { getDb } from "../db";
import { benchmarkData, copsoqReports } from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

export const benchmarkRouter = router({
  // Comparação empresa vs benchmark
  getComparison: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        sectorCode: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Último relatório COPSOQ do tenant
      const [latestReport] = await db
        .select()
        .from(copsoqReports)
        .where(eq(copsoqReports.tenantId, input.tenantId))
        .orderBy(desc(copsoqReports.generatedAt))
        .limit(1);

      if (!latestReport) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nenhum relatório COPSOQ encontrado para este tenant",
        });
      }

      // Buscar benchmark correspondente (por setor ou nacional)
      let benchmarkConditions;
      if (input.sectorCode) {
        benchmarkConditions = and(
          eq(benchmarkData.dataSource, "sector"),
          eq(benchmarkData.sectorCode, input.sectorCode)
        );
      } else {
        benchmarkConditions = eq(benchmarkData.dataSource, "national");
      }

      const [benchmark] = await db
        .select()
        .from(benchmarkData)
        .where(benchmarkConditions)
        .orderBy(desc(benchmarkData.createdAt))
        .limit(1);

      const company = {
        demand: latestReport.averageDemandScore,
        control: latestReport.averageControlScore,
        support: latestReport.averageSupportScore,
        leadership: latestReport.averageLeadershipScore,
        community: latestReport.averageCommunityScore,
        meaning: latestReport.averageMeaningScore,
        trust: latestReport.averageTrustScore,
        justice: latestReport.averageJusticeScore,
        insecurity: latestReport.averageInsecurityScore,
        mentalHealth: latestReport.averageMentalHealthScore,
        burnout: latestReport.averageBurnoutScore,
        violence: latestReport.averageViolenceScore,
      };

      const benchmarkDimensions = benchmark
        ? {
            demand: benchmark.avgDemandScore,
            control: benchmark.avgControlScore,
            support: benchmark.avgSupportScore,
            leadership: benchmark.avgLeadershipScore,
            community: benchmark.avgCommunityScore,
            meaning: benchmark.avgMeaningScore,
            trust: benchmark.avgTrustScore,
            justice: benchmark.avgJusticeScore,
            insecurity: benchmark.avgInsecurityScore,
            mentalHealth: benchmark.avgMentalHealthScore,
            burnout: benchmark.avgBurnoutScore,
            violence: benchmark.avgViolenceScore,
          }
        : null;

      return {
        company,
        benchmark: benchmarkDimensions,
        sampleSize: benchmark?.sampleSize || 0,
        dataSource: benchmark?.dataSource || "unavailable",
      };
    }),

  // Listar todos os benchmarks disponíveis
  listBenchmarks: publicProcedure
    .input(z.object({}))
    .query(async () => {
      const db = await getDb();
      if (!db) return [];

      const benchmarks = await db
        .select()
        .from(benchmarkData)
        .orderBy(benchmarkData.dataSource);

      return benchmarks;
    }),

  // Criar dados de benchmark nacional (admin only)
  seedBenchmarkData: publicProcedure
    .input(z.object({}))
    .mutation(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verificar se já existem dados nacionais
      const [existing] = await db
        .select()
        .from(benchmarkData)
        .where(eq(benchmarkData.dataSource, "national"))
        .limit(1);

      if (existing) {
        return { seeded: false, message: "Dados de benchmark nacional já existem" };
      }

      const id = nanoid();

      await db.insert(benchmarkData).values({
        id,
        dataSource: "national",
        sectorCode: null,
        sectorName: "Média Nacional",
        region: "Brasil",
        period: "2025",
        sampleSize: 5000,
        avgDemandScore: 55,
        avgControlScore: 60,
        avgSupportScore: 65,
        avgLeadershipScore: 58,
        avgCommunityScore: 62,
        avgMeaningScore: 70,
        avgTrustScore: 55,
        avgJusticeScore: 52,
        avgInsecurityScore: 48,
        avgMentalHealthScore: 60,
        avgBurnoutScore: 45,
        avgViolenceScore: 30,
        createdAt: new Date(),
      });

      return { seeded: true, id };
    }),
});
