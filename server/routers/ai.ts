/**
 * Router tRPC para funcionalidades de IA.
 *
 * Expoe endpoints para:
 * - analyzeCopsoq: Gera analise NLP de uma avaliacao COPSOQ-II
 * - getAnalysis: Busca analise IA previamente gerada
 */

import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, subscribedProcedure, tenantProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { copsoqReports } from "../../drizzle/schema_nr01";
import { generateAiReport } from "../_ai/reports";
import type { CopsoqAnalysisResult } from "../_ai/nlp";

export const aiRouter = router({
  /**
   * Gera analise de IA para uma avaliacao COPSOQ-II.
   * Requer assinatura ativa (subscribedProcedure).
   *
   * - Busca dados da avaliacao e report existente
   * - Envia para analise NLP (Gemini 2.5 Flash)
   * - Salva resultado no banco
   * - Retorna analise completa
   */
  analyzeCopsoq: subscribedProcedure
    .input(
      z.object({
        assessmentId: z.string().min(1, "ID da avaliacao e obrigatorio"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await generateAiReport({
          assessmentId: input.assessmentId,
          tenantId: ctx.tenantId!,
        });

        return {
          reportId: result.reportId,
          analysis: result.analysis,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        // Erros de negocio (assessment nao encontrado, report nao existe, etc.)
        if (
          message.includes("not found") ||
          message.includes("Generate the base report first")
        ) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message,
          });
        }

        // Erros de configuracao (API key, etc.)
        if (message.includes("OPENAI_API_KEY")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Servico de IA nao configurado. Contate o administrador.",
          });
        }

        // Erros de LLM (falha na chamada, formato invalido)
        if (message.includes("NLP:") || message.includes("LLM")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Erro ao processar analise de IA. Tente novamente.",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro inesperado ao gerar analise de IA.",
        });
      }
    }),

  /**
   * Busca analise de IA previamente gerada para um report.
   * Requer autenticacao e tenant (tenantProcedure).
   */
  getAnalysis: tenantProcedure
    .input(
      z.object({
        reportId: z.string().min(1, "ID do relatorio e obrigatorio"),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const [report] = await db
        .select({
          id: copsoqReports.id,
          assessmentId: copsoqReports.assessmentId,
          tenantId: copsoqReports.tenantId,
          title: copsoqReports.title,
          aiAnalysis: copsoqReports.aiAnalysis,
          aiGeneratedAt: copsoqReports.aiGeneratedAt,
          aiModel: copsoqReports.aiModel,
        })
        .from(copsoqReports)
        .where(eq(copsoqReports.id, input.reportId))
        .limit(1);

      if (!report) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Relatorio nao encontrado",
        });
      }

      // Validar isolamento de tenant
      if (report.tenantId !== ctx.tenantId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Acesso negado a este relatorio",
        });
      }

      return {
        reportId: report.id,
        assessmentId: report.assessmentId,
        title: report.title,
        analysis: (report.aiAnalysis as CopsoqAnalysisResult) || null,
        generatedAt: report.aiGeneratedAt?.toISOString() || null,
        model: report.aiModel || null,
      };
    }),
});
