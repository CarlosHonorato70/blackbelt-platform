/**
 * Modulo NLP para analise de respostas COPSOQ-II.
 *
 * Utiliza o invokeLLM() existente (Gemini 2.5 Flash) para:
 * - Analisar scores quantitativos das 12 dimensoes psicossociais
 * - Processar respostas abertas (sentimento, temas, insights)
 * - Gerar recomendacoes priorizadas
 *
 * LGPD: Nenhum dado identificavel (ID, nome, email) e enviado ao LLM.
 * Apenas scores numericos e textos anonimos.
 */

import { invokeLLM } from "../_core/llm";
import { log } from "../_core/logger";
import {
  COPSOQ_ANALYSIS_PROMPT,
  COPSOQ_ANALYSIS_SCHEMA,
} from "./prompts/copsoq-analysis";

// ============================================================================
// TYPES
// ============================================================================

export interface CopsoqAnalysisInput {
  assessmentTitle: string;
  totalRespondents: number;
  averageScores: Record<string, number>;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  openResponses: Array<{
    mentalHealthSupport: string | null;
    workplaceImprovement: string | null;
  }>;
}

export interface CriticalDimension {
  dimension: string;
  score: number;
  severity: "low" | "medium" | "high" | "critical";
  analysis: string;
}

export interface QualitativeAnalysis {
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  emergentThemes: string[];
  keyInsights: string[];
}

export interface Recommendation {
  priority: number;
  title: string;
  description: string;
  expectedImpact: string;
}

export interface CopsoqAnalysisResult {
  executiveSummary: string;
  criticalDimensions: CriticalDimension[];
  qualitativeAnalysis: QualitativeAnalysis;
  recommendations: Recommendation[];
  metadata: {
    model: string;
    tokensUsed: number;
    analyzedAt: string;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Filtra e limpa respostas abertas para envio ao LLM.
 * Remove entradas vazias e limita o total para evitar exceder tokens.
 */
function prepareOpenResponses(
  responses: CopsoqAnalysisInput["openResponses"]
): string[] {
  const cleaned: string[] = [];

  for (const r of responses) {
    if (r.mentalHealthSupport?.trim()) {
      cleaned.push(`[Suporte a saude mental]: ${r.mentalHealthSupport.trim()}`);
    }
    if (r.workplaceImprovement?.trim()) {
      cleaned.push(`[Melhoria no ambiente]: ${r.workplaceImprovement.trim()}`);
    }
  }

  // Limita a 100 respostas para nao exceder janela de contexto
  const MAX_RESPONSES = 100;
  if (cleaned.length > MAX_RESPONSES) {
    log.info("NLP: Truncating open responses for LLM", {
      total: cleaned.length,
      limit: MAX_RESPONSES,
    });
    return cleaned.slice(0, MAX_RESPONSES);
  }

  return cleaned;
}

/**
 * Formata o prompt do usuario com os dados da avaliacao.
 */
function buildUserPrompt(input: CopsoqAnalysisInput): string {
  const openTexts = prepareOpenResponses(input.openResponses);

  return `## Dados da Avaliação COPSOQ-II

**Titulo:** ${input.assessmentTitle}
**Total de Respondentes:** ${input.totalRespondents}

### Scores Medios por Dimensao (0-100)

${Object.entries(input.averageScores)
  .map(([dim, score]) => `- ${dim}: ${score}`)
  .join("\n")}

### Distribuicao de Risco

- Baixo: ${input.riskDistribution.low} respondentes
- Medio: ${input.riskDistribution.medium} respondentes
- Alto: ${input.riskDistribution.high} respondentes
- Critico: ${input.riskDistribution.critical} respondentes

### Respostas Abertas (${openTexts.length} respostas anonimas)

${openTexts.length > 0 ? openTexts.join("\n") : "(Nenhuma resposta aberta fornecida)"}

Analise os dados acima e forneca sua analise completa em JSON.`;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Analisa respostas COPSOQ-II utilizando IA (Gemini 2.5 Flash).
 *
 * @param input - Dados agregados da avaliacao (sem dados identificaveis)
 * @returns Analise estruturada com resumo, dimensoes criticas, insights e recomendacoes
 * @throws Error se a chamada LLM falhar ou retornar formato invalido
 */
export async function analyzeCopsoqResponses(
  input: CopsoqAnalysisInput
): Promise<CopsoqAnalysisResult> {
  log.info("NLP: Starting COPSOQ-II analysis", {
    title: input.assessmentTitle,
    respondents: input.totalRespondents,
    openResponses: input.openResponses.length,
  });

  const userPrompt = buildUserPrompt(input);

  const result = await invokeLLM({
    messages: [
      { role: "system", content: COPSOQ_ANALYSIS_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: COPSOQ_ANALYSIS_SCHEMA,
    },
  });

  // Extrair conteudo da resposta
  const choice = result.choices[0];
  if (!choice) {
    throw new Error("NLP: LLM returned no choices");
  }

  const rawContent = typeof choice.message.content === "string"
    ? choice.message.content
    : Array.isArray(choice.message.content)
      ? choice.message.content
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("")
      : "";

  if (!rawContent) {
    throw new Error("NLP: LLM returned empty content");
  }

  // Parse JSON da resposta
  let parsed: Omit<CopsoqAnalysisResult, "metadata">;
  try {
    parsed = JSON.parse(rawContent);
  } catch (parseError) {
    log.error("NLP: Failed to parse LLM response as JSON", {
      content: rawContent.substring(0, 500),
      error: String(parseError),
    });
    throw new Error("NLP: LLM response is not valid JSON");
  }

  // Validar campos essenciais
  if (
    !parsed.executiveSummary ||
    !Array.isArray(parsed.criticalDimensions) ||
    !parsed.qualitativeAnalysis ||
    !Array.isArray(parsed.recommendations)
  ) {
    throw new Error("NLP: LLM response is missing required fields");
  }

  const tokensUsed = result.usage
    ? result.usage.prompt_tokens + result.usage.completion_tokens
    : 0;

  log.info("NLP: COPSOQ-II analysis completed", {
    model: result.model,
    tokensUsed,
    criticalDimensions: parsed.criticalDimensions.length,
    recommendations: parsed.recommendations.length,
  });

  return {
    ...parsed,
    metadata: {
      model: result.model || "gemini-2.5-flash",
      tokensUsed,
      analyzedAt: new Date().toISOString(),
    },
  };
}
