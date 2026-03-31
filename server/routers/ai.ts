/**
 * Router tRPC para funcionalidades de IA.
 *
 * Expoe endpoints para:
 * - analyzeCopsoq: Gera analise NLP de uma avaliacao COPSOQ-II
 * - getAnalysis: Busca analise IA previamente gerada
 * - generateInventory: Gera inventario de riscos NR-01 via IA
 * - getInventory: Busca inventario gerado
 * - generatePlan: Gera plano de acao NR-01 via IA
 * - getPlan: Busca plano de acao gerado
 */

import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, subscribedProcedure, tenantProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  copsoqReports,
  riskAssessments,
  riskAssessmentItems,
  actionPlans,
} from "../../drizzle/schema_nr01";
import { generateAiReport, generateFallbackAnalysis } from "../_ai/reports";
import { generateRiskInventory } from "../_ai/riskInventoryGenerator";
import { generateActionPlan } from "../_ai/actionPlanGenerator";
import type { CopsoqAnalysisResult } from "../_ai/nlp";
import { log } from "../_core/logger";

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

        // Erros de configuracao (API key) ou LLM → fallback rule-based
        if (
          message.includes("OPENAI_API_KEY") ||
          message.includes("NLP:") ||
          message.includes("LLM")
        ) {
          log.info("AI Router: AI unavailable, generating rule-based fallback", {
            reason: message,
            assessmentId: input.assessmentId,
          });

          try {
            // Fetch the existing report to generate fallback
            const db = await getDb();
            if (!db) throw new Error("DB unavailable");

            const [report] = await db
              .select()
              .from(copsoqReports)
              .where(
                eq(copsoqReports.tenantId, ctx.tenantId!)
              )
              .orderBy(desc(copsoqReports.generatedAt))
              .limit(1);

            if (report) {
              const fallback = generateFallbackAnalysis(report as Record<string, unknown>);

              // Save to database
              await db
                .update(copsoqReports)
                .set({
                  aiAnalysis: fallback,
                  aiGeneratedAt: new Date(),
                  aiModel: "rule-based",
                })
                .where(eq(copsoqReports.id, report.id));

              return {
                reportId: report.id,
                analysis: fallback,
              };
            }
          } catch (fallbackError) {
            log.error("AI Router: Fallback also failed", {
              error: String(fallbackError),
            });
          }

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Servico de IA nao configurado e fallback falhou. Contate o administrador.",
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

  /**
   * Busca analise IA existente pelo assessmentId (nao pelo reportId).
   * Usado pelo frontend para detectar analise pre-existente ao montar o painel.
   */
  getAnalysisByAssessment: tenantProcedure
    .input(
      z.object({
        assessmentId: z.string().min(1, "ID da avaliacao e obrigatorio"),
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
          aiAnalysis: copsoqReports.aiAnalysis,
          aiGeneratedAt: copsoqReports.aiGeneratedAt,
          aiModel: copsoqReports.aiModel,
        })
        .from(copsoqReports)
        .where(
          and(
            eq(copsoqReports.assessmentId, input.assessmentId),
            eq(copsoqReports.tenantId, ctx.tenantId!)
          )
        )
        .limit(1);

      if (!report || !report.aiAnalysis) {
        return null;
      }

      return {
        reportId: report.id,
        analysis: report.aiAnalysis as CopsoqAnalysisResult,
        generatedAt: report.aiGeneratedAt?.toISOString() || null,
        model: report.aiModel || null,
      };
    }),

  // ========================================================================
  // FASE 2: Inventario de Riscos + Plano de Acao
  // ========================================================================

  /**
   * Gera inventario de riscos psicossociais via IA.
   * Requer COPSOQ-II analisado (Fase 1) + assinatura ativa.
   */
  generateInventory: subscribedProcedure
    .input(
      z.object({
        assessmentId: z.string().min(1),
        sectorName: z.string().optional(),
        workerCount: z.number().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateRiskInventory({
          assessmentId: input.assessmentId,
          tenantId: ctx.tenantId!,
          sectorName: input.sectorName,
          workerCount: input.workerCount,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("not found") || msg.includes("nao encontrado")) {
          throw new TRPCError({ code: "NOT_FOUND", message: msg });
        }
        if (msg.includes("Execute ai.analyzeCopsoq")) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Execute a analise COPSOQ-II primeiro (ai.analyzeCopsoq).",
          });
        }
        if (msg.includes("OPENAI_API_KEY")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Servico de IA nao configurado.",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar inventario de riscos.",
        });
      }
    }),

  /**
   * Busca inventario de riscos gerado por IA para um assessment.
   */
  getInventory: tenantProcedure
    .input(
      z.object({
        assessmentId: z.string().min(1),
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

      // Buscar risk assessments do tenant (gerados por IA)
      const assessmentsList = await db
        .select()
        .from(riskAssessments)
        .where(
          and(
            eq(riskAssessments.tenantId, ctx.tenantId!),
          )
        )
        .orderBy(desc(riskAssessments.createdAt));

      if (assessmentsList.length === 0) return null;

      // Pegar o mais recente
      const latest = assessmentsList[0];

      const items = await db
        .select()
        .from(riskAssessmentItems)
        .where(eq(riskAssessmentItems.assessmentId, latest.id));

      return {
        riskAssessmentId: latest.id,
        title: latest.title,
        description: latest.description,
        methodology: latest.methodology,
        assessor: latest.assessor,
        createdAt: latest.createdAt?.toISOString() || null,
        items: items.map((i) => ({
          id: i.id,
          hazardCode: (i as any).hazardCode || i.riskFactorId,
          severity: i.severity,
          probability: i.probability,
          riskLevel: i.riskLevel,
          affectedPopulation: i.affectedPopulation,
          currentControls: i.currentControls,
          observations: i.observations,
          aiGenerated: (i as any).aiGenerated || false,
        })),
      };
    }),

  /**
   * Gera plano de acao para mitigacao de riscos psicossociais via IA.
   * Requer inventario de riscos gerado + assinatura ativa.
   */
  generatePlan: subscribedProcedure
    .input(
      z.object({
        assessmentId: z.string().min(1),
        sectorName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await generateActionPlan({
          assessmentId: input.assessmentId,
          tenantId: ctx.tenantId!,
          sectorName: input.sectorName,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("not found") || msg.includes("nao encontrado")) {
          throw new TRPCError({ code: "NOT_FOUND", message: msg });
        }
        if (msg.includes("OPENAI_API_KEY")) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Servico de IA nao configurado.",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro ao gerar plano de acao.",
        });
      }
    }),

  /**
   * Busca plano de acao gerado por IA.
   */
  getPlan: tenantProcedure
    .input(
      z.object({
        assessmentId: z.string().min(1),
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

      // Buscar action plans gerados por IA para este tenant
      const plans = await db
        .select()
        .from(actionPlans)
        .where(
          eq(actionPlans.tenantId, ctx.tenantId!)
        )
        .orderBy(desc(actionPlans.createdAt));

      if (plans.length === 0) return null;

      return {
        totalActions: plans.length,
        actions: plans.map((p) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          actionType: p.actionType,
          priority: p.priority,
          status: p.status,
          deadline: p.deadline?.toISOString() || null,
          monthlySchedule: (p as any).monthlySchedule || null,
          kpiIndicator: (p as any).kpiIndicator || null,
          expectedImpact: (p as any).expectedImpact || null,
          aiGenerated: (p as any).aiGenerated || false,
          createdAt: p.createdAt?.toISOString() || null,
        })),
      };
    }),
});
