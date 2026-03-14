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

  // Criar dados de benchmark nacional + setoriais
  seedBenchmarkData: publicProcedure
    .input(z.object({}))
    .mutation(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verificar se já existem dados
      const existingRows = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(benchmarkData);
      const count = existingRows[0]?.count || 0;

      if (count >= 9) {
        return { seeded: false, message: "Dados de benchmark já existem", total: count };
      }

      const now = new Date();
      const entries = [
        // Média Nacional
        {
          id: nanoid(), dataSource: "national", sectorCode: null,
          sectorName: "Média Nacional", region: "Brasil", period: "2025", sampleSize: 5000,
          avgDemandScore: 55, avgControlScore: 60, avgSupportScore: 65,
          avgLeadershipScore: 58, avgCommunityScore: 62, avgMeaningScore: 70,
          avgTrustScore: 55, avgJusticeScore: 52, avgInsecurityScore: 48,
          avgMentalHealthScore: 60, avgBurnoutScore: 45, avgViolenceScore: 30,
          createdAt: now,
        },
        // Indústria de Transformação — alta demanda, médio controle
        {
          id: nanoid(), dataSource: "sector", sectorCode: "C",
          sectorName: "Indústria de Transformação", region: "Brasil", period: "2025", sampleSize: 1200,
          avgDemandScore: 42, avgControlScore: 55, avgSupportScore: 58,
          avgLeadershipScore: 52, avgCommunityScore: 60, avgMeaningScore: 62,
          avgTrustScore: 50, avgJusticeScore: 48, avgInsecurityScore: 42,
          avgMentalHealthScore: 55, avgBurnoutScore: 48, avgViolenceScore: 28,
          createdAt: now,
        },
        // Construção Civil — alta insegurança, alto burnout
        {
          id: nanoid(), dataSource: "sector", sectorCode: "F",
          sectorName: "Construção Civil", region: "Brasil", period: "2025", sampleSize: 800,
          avgDemandScore: 40, avgControlScore: 48, avgSupportScore: 52,
          avgLeadershipScore: 45, avgCommunityScore: 58, avgMeaningScore: 55,
          avgTrustScore: 48, avgJusticeScore: 44, avgInsecurityScore: 35,
          avgMentalHealthScore: 50, avgBurnoutScore: 42, avgViolenceScore: 35,
          createdAt: now,
        },
        // Comércio — médio geral, baixo significado
        {
          id: nanoid(), dataSource: "sector", sectorCode: "G",
          sectorName: "Comércio", region: "Brasil", period: "2025", sampleSize: 900,
          avgDemandScore: 50, avgControlScore: 55, avgSupportScore: 60,
          avgLeadershipScore: 54, avgCommunityScore: 58, avgMeaningScore: 52,
          avgTrustScore: 52, avgJusticeScore: 50, avgInsecurityScore: 45,
          avgMentalHealthScore: 58, avgBurnoutScore: 48, avgViolenceScore: 32,
          createdAt: now,
        },
        // Transporte e Logística — alta demanda, baixo controle
        {
          id: nanoid(), dataSource: "sector", sectorCode: "H",
          sectorName: "Transporte e Logística", region: "Brasil", period: "2025", sampleSize: 700,
          avgDemandScore: 38, avgControlScore: 45, avgSupportScore: 50,
          avgLeadershipScore: 48, avgCommunityScore: 55, avgMeaningScore: 58,
          avgTrustScore: 46, avgJusticeScore: 44, avgInsecurityScore: 38,
          avgMentalHealthScore: 52, avgBurnoutScore: 44, avgViolenceScore: 30,
          createdAt: now,
        },
        // Alimentação e Hospedagem — alto burnout, baixa liderança
        {
          id: nanoid(), dataSource: "sector", sectorCode: "I",
          sectorName: "Alimentação e Hospedagem", region: "Brasil", period: "2025", sampleSize: 600,
          avgDemandScore: 42, avgControlScore: 50, avgSupportScore: 52,
          avgLeadershipScore: 44, avgCommunityScore: 56, avgMeaningScore: 54,
          avgTrustScore: 48, avgJusticeScore: 46, avgInsecurityScore: 40,
          avgMentalHealthScore: 50, avgBurnoutScore: 40, avgViolenceScore: 34,
          createdAt: now,
        },
        // Tecnologia da Informação — alto controle, alto burnout
        {
          id: nanoid(), dataSource: "sector", sectorCode: "J",
          sectorName: "Tecnologia da Informação", region: "Brasil", period: "2025", sampleSize: 1000,
          avgDemandScore: 45, avgControlScore: 72, avgSupportScore: 65,
          avgLeadershipScore: 62, avgCommunityScore: 60, avgMeaningScore: 68,
          avgTrustScore: 58, avgJusticeScore: 55, avgInsecurityScore: 42,
          avgMentalHealthScore: 55, avgBurnoutScore: 40, avgViolenceScore: 22,
          createdAt: now,
        },
        // Saúde e Serviços Sociais — alta demanda, alto significado
        {
          id: nanoid(), dataSource: "sector", sectorCode: "Q",
          sectorName: "Saúde e Serviços Sociais", region: "Brasil", period: "2025", sampleSize: 1100,
          avgDemandScore: 38, avgControlScore: 55, avgSupportScore: 60,
          avgLeadershipScore: 52, avgCommunityScore: 65, avgMeaningScore: 78,
          avgTrustScore: 54, avgJusticeScore: 50, avgInsecurityScore: 44,
          avgMentalHealthScore: 48, avgBurnoutScore: 38, avgViolenceScore: 35,
          createdAt: now,
        },
        // Educação — alto significado, alta demanda
        {
          id: nanoid(), dataSource: "sector", sectorCode: "P",
          sectorName: "Educação", region: "Brasil", period: "2025", sampleSize: 950,
          avgDemandScore: 40, avgControlScore: 58, avgSupportScore: 62,
          avgLeadershipScore: 55, avgCommunityScore: 64, avgMeaningScore: 75,
          avgTrustScore: 56, avgJusticeScore: 52, avgInsecurityScore: 46,
          avgMentalHealthScore: 52, avgBurnoutScore: 42, avgViolenceScore: 28,
          createdAt: now,
        },
      ];

      // Delete existing and re-insert all (idempotent)
      await db.delete(benchmarkData);

      for (const entry of entries) {
        await db.insert(benchmarkData).values(entry);
      }

      return { seeded: true, total: entries.length };
    }),
});
