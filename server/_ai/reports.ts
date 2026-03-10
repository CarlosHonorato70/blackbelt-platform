/**
 * Modulo de geracao de relatorios com IA.
 *
 * Orquestra a analise NLP: busca dados do assessment no banco,
 * agrega scores, coleta respostas abertas e chama analyzeCopsoqResponses().
 * Salva o resultado no campo aiAnalysis da tabela copsoqReports.
 */

import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "../db";
import { log } from "../_core/logger";
import {
  copsoqAssessments,
  copsoqResponses,
  copsoqReports,
} from "../../drizzle/schema_nr01";
import {
  analyzeCopsoqResponses,
  type CopsoqAnalysisInput,
  type CopsoqAnalysisResult,
} from "./nlp";

// ============================================================================
// TYPES
// ============================================================================

export interface AiReportResult {
  reportId: string;
  analysis: CopsoqAnalysisResult;
}

// ============================================================================
// DIMENSION MAPPING
// ============================================================================

/**
 * Mapeamento entre nomes de colunas do banco e labels legiveis.
 * Mantido em sincronia com copsoqReports schema.
 */
const DIMENSION_MAP: Record<string, string> = {
  averageDemandScore: "Demandas Quantitativas",
  averageControlScore: "Controle sobre o Trabalho",
  averageSupportScore: "Suporte Social",
  averageLeadershipScore: "Lideranca",
  averageCommunityScore: "Comunidade no Trabalho",
  averageMeaningScore: "Significado do Trabalho",
  averageTrustScore: "Confianca",
  averageJusticeScore: "Justica",
  averageInsecurityScore: "Inseguranca no Trabalho",
  averageMentalHealthScore: "Saude Mental",
  averageBurnoutScore: "Burnout",
  averageViolenceScore: "Violencia e Assedio",
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extrai scores medios do report existente.
 */
function extractAverageScores(
  report: Record<string, unknown>
): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const [column, label] of Object.entries(DIMENSION_MAP)) {
    const value = report[column];
    scores[label] = typeof value === "number" ? value : 0;
  }

  return scores;
}

/**
 * Extrai distribuicao de risco do report.
 */
function extractRiskDistribution(report: Record<string, unknown>) {
  return {
    low: typeof report.lowRiskCount === "number" ? report.lowRiskCount : 0,
    medium: typeof report.mediumRiskCount === "number" ? report.mediumRiskCount : 0,
    high: typeof report.highRiskCount === "number" ? report.highRiskCount : 0,
    critical: typeof report.criticalRiskCount === "number" ? report.criticalRiskCount : 0,
  };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Gera um relatorio com analise de IA para uma avaliacao COPSOQ-II.
 *
 * Fluxo:
 * 1. Busca assessment e valida que pertence ao tenant
 * 2. Busca ou cria report com dados agregados
 * 3. Coleta respostas abertas (anonimizadas)
 * 4. Chama NLP para analise
 * 5. Salva resultado no banco
 *
 * @param assessmentId - ID da avaliacao COPSOQ-II
 * @param tenantId - ID do tenant (isolamento multi-tenant)
 * @returns reportId + analise completa
 */
export async function generateAiReport(params: {
  assessmentId: string;
  tenantId: string;
}): Promise<AiReportResult> {
  const { assessmentId, tenantId } = params;
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 1. Buscar assessment e validar tenant
  const [assessment] = await db
    .select()
    .from(copsoqAssessments)
    .where(
      and(
        eq(copsoqAssessments.id, assessmentId),
        eq(copsoqAssessments.tenantId, tenantId)
      )
    )
    .limit(1);

  if (!assessment) {
    throw new Error(`Assessment not found: ${assessmentId}`);
  }

  // 2. Buscar report existente
  const [existingReport] = await db
    .select()
    .from(copsoqReports)
    .where(eq(copsoqReports.assessmentId, assessmentId))
    .limit(1);

  if (!existingReport) {
    throw new Error(
      `No report found for assessment ${assessmentId}. Generate the base report first.`
    );
  }

  // 3. Coletar respostas abertas (LGPD: apenas textos anonimos, sem IDs/nomes/emails)
  const responses = await db
    .select({
      mentalHealthSupport: copsoqResponses.mentalHealthSupport,
      workplaceImprovement: copsoqResponses.workplaceImprovement,
    })
    .from(copsoqResponses)
    .where(eq(copsoqResponses.assessmentId, assessmentId));

  // 4. Montar input para NLP
  const nlpInput: CopsoqAnalysisInput = {
    assessmentTitle: assessment.title,
    totalRespondents: existingReport.totalRespondents || responses.length,
    averageScores: extractAverageScores(existingReport as Record<string, unknown>),
    riskDistribution: extractRiskDistribution(existingReport as Record<string, unknown>),
    openResponses: responses.map((r) => ({
      mentalHealthSupport: r.mentalHealthSupport,
      workplaceImprovement: r.workplaceImprovement,
    })),
  };

  log.info("AI Reports: Starting analysis", {
    assessmentId,
    tenantId,
    respondents: nlpInput.totalRespondents,
    openResponses: responses.length,
  });

  // 5. Chamar NLP
  const analysis = await analyzeCopsoqResponses(nlpInput);

  // 6. Salvar no banco
  await db
    .update(copsoqReports)
    .set({
      aiAnalysis: analysis,
      aiGeneratedAt: new Date(),
      aiModel: analysis.metadata.model,
    })
    .where(eq(copsoqReports.id, existingReport.id));

  log.info("AI Reports: Analysis saved to database", {
    reportId: existingReport.id,
    model: analysis.metadata.model,
    tokensUsed: analysis.metadata.tokensUsed,
  });

  return {
    reportId: existingReport.id,
    analysis,
  };
}
