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
  type CriticalDimension,
  type Recommendation,
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
  averageLeadershipScore: "Liderança",
  averageCommunityScore: "Comunidade no Trabalho",
  averageMeaningScore: "Significado do Trabalho",
  averageTrustScore: "Confiança",
  averageJusticeScore: "Justiça",
  averageInsecurityScore: "Insegurança no Trabalho",
  averageMentalHealthScore: "Saúde Mental",
  averageBurnoutScore: "Burnout",
  averageViolenceScore: "Violência e Assédio",
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

// ============================================================================
// FALLBACK ANALYSIS (rule-based, no AI required)
// ============================================================================

const DIMENSION_RECOMMENDATIONS: Record<string, { title: string; description: string; impact: string }> = {
  "Demandas Quantitativas": {
    title: "Reduzir sobrecarga de trabalho",
    description: "Revisar distribuição de tarefas, contratar reforço ou automatizar processos repetitivos para diminuir a pressão sobre os colaboradores.",
    impact: "Redução de absenteísmo e burnout em 15-25%",
  },
  "Controle sobre o Trabalho": {
    title: "Aumentar autonomia dos colaboradores",
    description: "Implementar gestão participativa, permitindo que colaboradores tenham mais influência sobre ritmo, métodos e prioridades do trabalho.",
    impact: "Melhoria no engajamento e satisfação em 20-30%",
  },
  "Suporte Social": {
    title: "Fortalecer rede de apoio no trabalho",
    description: "Criar programas de mentoria, grupos de apoio e canais de comunicação abertos entre colegas e gestores.",
    impact: "Redução de isolamento e melhoria no clima organizacional",
  },
  "Liderança": {
    title: "Desenvolver competências de liderança",
    description: "Investir em treinamento de gestores em comunicação, feedback construtivo e gestão de conflitos.",
    impact: "Melhoria na confiança e produtividade das equipes",
  },
  "Comunidade no Trabalho": {
    title: "Promover senso de pertencimento",
    description: "Organizar atividades de integração, reconhecer contribuições individuais e coletivas, e fomentar colaboração entre equipes.",
    impact: "Redução de turnover e aumento de coesão",
  },
  "Significado do Trabalho": {
    title: "Conectar propósito ao trabalho diário",
    description: "Comunicar claramente a missão organizacional e mostrar como cada função contribui para os objetivos maiores.",
    impact: "Aumento de motivação intrínseca e comprometimento",
  },
  "Confiança": {
    title: "Construir cultura de confiança",
    description: "Promover transparência nas decisões, cumprir promessas e criar espaços seguros para expressão de opiniões.",
    impact: "Melhoria na colaboração e inovação",
  },
  "Justiça": {
    title: "Garantir equidade nos processos",
    description: "Revisar critérios de promoção, distribuição de trabalho e reconhecimento para assegurar tratamento justo e imparcial.",
    impact: "Redução de conflitos e aumento de satisfação",
  },
  "Insegurança no Trabalho": {
    title: "Reduzir insegurança laboral",
    description: "Comunicar com clareza sobre estabilidade, planos de carreira e mudanças organizacionais. Oferecer capacitação contínua.",
    impact: "Redução de ansiedade e melhoria no desempenho",
  },
  "Saúde Mental": {
    title: "Implementar programa de saúde mental",
    description: "Oferecer acesso a profissionais de saúde mental, criar campanhas de conscientização e capacitar gestores para identificar sinais de alerta.",
    impact: "Redução de afastamentos por transtornos mentais em 20-40%",
  },
  "Burnout": {
    title: "Prevenir esgotamento profissional",
    description: "Implementar pausas regulares, limitar horas extras, promover equilíbrio trabalho-vida e monitorar carga de trabalho individualmente.",
    impact: "Redução de presenteísmo e absenteísmo",
  },
  "Violência e Assédio": {
    title: "Fortalecer política anti-assédio",
    description: "Implementar canal de denúncias confidencial, treinar todos os colaboradores sobre condutas aceitáveis e aplicar consequências claras.",
    impact: "Ambiente de trabalho mais seguro e respeitoso",
  },
};

/**
 * Gera analise rule-based quando IA nao esta disponivel.
 * Produz resultado compativel com CopsoqAnalysisResult.
 */
export function generateFallbackAnalysis(
  report: Record<string, unknown>
): CopsoqAnalysisResult {
  const scores = extractAverageScores(report);
  const riskDist = extractRiskDistribution(report);
  const total = riskDist.low + riskDist.medium + riskDist.high + riskDist.critical;

  // Classify dimensions by risk
  const criticalDims: CriticalDimension[] = [];
  const allScores: number[] = [];

  for (const [label, score] of Object.entries(scores)) {
    allScores.push(score);
    let severity: "low" | "medium" | "high" | "critical" = "low";
    if (score < 30) severity = "critical";
    else if (score < 45) severity = "high";
    else if (score < 60) severity = "medium";

    if (severity !== "low") {
      const analysis = score < 30
        ? `Score de ${score}/100 indica situação crítica que requer intervenção imediata.`
        : score < 45
        ? `Score de ${score}/100 indica risco elevado que demanda atenção prioritária.`
        : `Score de ${score}/100 está abaixo da média esperada e merece monitoramento.`;

      criticalDims.push({ dimension: label, score, severity, analysis });
    }
  }

  // Sort by score ascending (worst first)
  criticalDims.sort((a, b) => a.score - b.score);

  // Overall average
  const avgScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 50;

  // Determine sentiment
  const sentiment: "positive" | "neutral" | "negative" | "mixed" =
    avgScore >= 65 ? "positive" : avgScore >= 50 ? "neutral" : avgScore >= 35 ? "mixed" : "negative";

  // Executive summary
  const criticalCount = criticalDims.filter(d => d.severity === "critical").length;
  const highCount = criticalDims.filter(d => d.severity === "high").length;
  const mediumCount = criticalDims.filter(d => d.severity === "medium").length;

  let summaryParts: string[] = [];
  summaryParts.push(`A avaliação COPSOQ-II contou com ${total || "N/A"} respondentes.`);
  summaryParts.push(`O score médio geral é de ${avgScore}/100.`);

  if (criticalCount > 0) {
    summaryParts.push(`${criticalCount} dimensão(ões) apresenta(m) risco crítico e requer(em) intervenção imediata.`);
  }
  if (highCount > 0) {
    summaryParts.push(`${highCount} dimensão(ões) está(ão) em risco alto.`);
  }
  if (criticalCount === 0 && highCount === 0) {
    summaryParts.push("Nenhuma dimensão apresenta risco crítico ou alto, indicando um ambiente psicossocial razoável.");
  }

  const riskHighPercent = total > 0
    ? Math.round(((riskDist.critical + riskDist.high) / total) * 100)
    : 0;
  summaryParts.push(`${riskHighPercent}% dos respondentes estão nas faixas de risco alto ou crítico.`);

  // Emergent themes from critical dimensions
  const themes = criticalDims.slice(0, 5).map(d => d.dimension);

  // Key insights
  const insights: string[] = [];
  if (criticalDims.some(d => d.dimension.includes("Burnout"))) {
    insights.push("Indicadores de burnout elevados sugerem sobrecarga crônica de trabalho.");
  }
  if (criticalDims.some(d => d.dimension.includes("Violência"))) {
    insights.push("Scores de violência/assédio requerem atenção imediata e canal de denúncias.");
  }
  if (criticalDims.some(d => d.dimension.includes("Saúde Mental"))) {
    insights.push("Saúde mental comprometida — considerar programa de apoio psicológico.");
  }
  if (criticalDims.some(d => d.dimension.includes("Insegurança"))) {
    insights.push("Alta insegurança no trabalho pode estar gerando ansiedade e queda de desempenho.");
  }
  if (criticalDims.some(d => d.dimension.includes("Liderança"))) {
    insights.push("Deficiências na liderança impactam diretamente apoio social e clima organizacional.");
  }
  if (insights.length === 0) {
    insights.push("Os resultados gerais indicam um ambiente psicossocial estável com oportunidades pontuais de melhoria.");
  }

  // Recommendations from top critical dimensions
  const recommendations: Recommendation[] = criticalDims.slice(0, 5).map((dim, idx) => {
    const rec = DIMENSION_RECOMMENDATIONS[dim.dimension];
    return {
      priority: idx + 1,
      title: rec?.title || `Melhorar ${dim.dimension}`,
      description: rec?.description || `Desenvolver plano de ação para a dimensão ${dim.dimension} (score: ${dim.score}/100).`,
      expectedImpact: rec?.impact || "Melhoria nos indicadores psicossociais",
    };
  });

  // If no critical dims, add a generic positive recommendation
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 1,
      title: "Manter monitoramento contínuo",
      description: "Os resultados são positivos. Recomenda-se manter avaliações periódicas e programas preventivos para sustentar o bom clima organizacional.",
      expectedImpact: "Sustentação dos indicadores positivos e prevenção de riscos futuros",
    });
  }

  return {
    executiveSummary: summaryParts.join(" "),
    criticalDimensions: criticalDims.slice(0, 5),
    qualitativeAnalysis: {
      sentiment,
      emergentThemes: themes,
      keyInsights: insights,
    },
    recommendations,
    metadata: {
      model: "rule-based",
      tokensUsed: 0,
      analyzedAt: new Date().toISOString(),
    },
  };
}
