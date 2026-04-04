/**
 * Gerador automatico de Inventario de Riscos Ocupacionais (Psicossociais).
 *
 * Utiliza os dados da avaliacao COPSOQ-II e a analise de IA (Fase 1)
 * para gerar itens de inventario conforme NR-01 (item 1.5.7.1).
 *
 * LGPD: Nenhum dado identificavel e enviado ao LLM.
 */

import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invokeLLM } from "../_core/llm";
import { log } from "../_core/logger";
import { getDb } from "../db";
import {
  copsoqAssessments,
  copsoqReports,
  riskAssessments,
  riskAssessmentItems,
  complianceDocuments,
} from "../../drizzle/schema_nr01";
import { tenants } from "../../drizzle/schema";
import {
  RISK_INVENTORY_PROMPT,
  RISK_INVENTORY_SCHEMA,
  DIMENSION_TO_HAZARDS,
} from "./prompts/risk-inventory";
import type { CopsoqAnalysisResult } from "./nlp";

// ============================================================================
// TYPES
// ============================================================================

export interface RiskInventoryInput {
  assessmentId: string;
  tenantId: string;
  sectorName?: string;
  workerCount?: number;
}

export interface InventoryItem {
  activity: string;
  source: string;
  hazardCode: string;
  mteHazardType: string;
  hazard: string;
  risk: string;
  healthDamage: string;
  origin: "INTERNA" | "EXTERNA";
  classification: "FUNCIONAL" | "POSICIONAL";
  operationalSituation: "ROTINEIRA" | "EMERGENCIAL";
  exposureFrequency: string;
  exposureDuration: string;
  severity: "low" | "medium" | "high" | "critical";
  probability: "rare" | "unlikely" | "possible" | "likely" | "certain";
  riskLevel: "low" | "medium" | "high" | "critical";
  currentControls: string;
  recommendedControls: string;
}

export interface RiskInventoryResult {
  assessmentId: string;
  riskAssessmentId: string;
  complianceDocumentId: string;
  companyContext: string;
  inventoryItems: InventoryItem[];
  metadata: {
    model: string;
    tokensUsed: number;
    generatedAt: string;
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Extrai scores do report para o prompt.
 */
function formatScoresForPrompt(report: Record<string, unknown>): string {
  const dimensionColumns: Record<string, string> = {
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

  return Object.entries(dimensionColumns)
    .map(([col, label]) => {
      const value = typeof report[col] === "number" ? report[col] : 0;
      const mapping = DIMENSION_TO_HAZARDS[label];
      const hazards = mapping ? mapping.hazardCodes : [];
      const mteTypes = mapping ? mapping.mteTypes : [];
      return `- ${label}: ${value}/100 (perigos: ${hazards.join(", ")} | MTE: ${mteTypes.join(", ")})`;
    })
    .join("\n");
}

/**
 * Extrai texto da analise IA para contexto adicional.
 */
function formatAiAnalysisForPrompt(analysis: CopsoqAnalysisResult): string {
  const parts: string[] = [];
  parts.push(`Resumo Executivo: ${analysis.executiveSummary}`);

  if (analysis.criticalDimensions?.length > 0) {
    parts.push("\nDimensoes Criticas:");
    for (const dim of analysis.criticalDimensions) {
      parts.push(`- ${dim.dimension} (${dim.score}/100, ${dim.severity}): ${dim.analysis}`);
    }
  }

  if (analysis.recommendations?.length > 0) {
    parts.push("\nRecomendacoes IA:");
    for (const rec of analysis.recommendations) {
      parts.push(`- [P${rec.priority}] ${rec.title}: ${rec.description}`);
    }
  }

  return parts.join("\n");
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Gera inventario de riscos psicossociais automaticamente via IA.
 *
 * Pre-requisito: a avaliacao COPSOQ-II deve ter sido analisada pela IA (Fase 1).
 */
export async function generateRiskInventory(
  input: RiskInventoryInput
): Promise<RiskInventoryResult> {
  const { assessmentId, tenantId, sectorName, workerCount } = input;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Buscar tenant
  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tenantName = tenant?.name || "Organizacao";

  // 2. Buscar assessment e validar tenant
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

  if (!assessment) throw new Error(`Assessment not found: ${assessmentId}`);

  // 3. Buscar report com analise IA
  const [report] = await db
    .select()
    .from(copsoqReports)
    .where(eq(copsoqReports.assessmentId, assessmentId))
    .limit(1);

  if (!report) {
    throw new Error("Report COPSOQ-II não encontrado. Gere o relatório base primeiro.");
  }

  const aiAnalysis = report.aiAnalysis as CopsoqAnalysisResult | null;
  if (!aiAnalysis) {
    throw new Error("Análise de IA não encontrada. Execute ai.analyzeCopsoq primeiro.");
  }

  // 4. Montar prompt do usuario
  const scoresText = formatScoresForPrompt(report as Record<string, unknown>);
  const analysisText = formatAiAnalysisForPrompt(aiAnalysis);

  const userPrompt = `## Dados para Geração do Inventário de Riscos

**Empresa:** ${tenantName}
**Setor:** ${sectorName || "Geral"}
**Trabalhadores expostos:** ${workerCount || report.totalRespondents || "Não informado"}
**Avaliacao:** ${assessment.title}

### Scores COPSOQ-II (medias por dimensao)

${scoresText}

### Analise de IA (previamente gerada)

${analysisText}

### Distribuicao de Risco dos Respondentes

- Baixo: ${report.lowRiskCount || 0}
- Medio: ${report.mediumRiskCount || 0}
- Alto: ${report.highRiskCount || 0}
- Critico: ${report.criticalRiskCount || 0}

Gere o inventario de riscos psicossociais para esta organizacao, seguindo o catalogo NR-01 e o schema fornecido.`;

  log.info("RiskInventory: Starting generation", {
    assessmentId,
    tenantId,
    sectorName,
    workerCount,
  });

  // 5. Chamar LLM
  const result = await invokeLLM({
    messages: [
      { role: "system", content: RISK_INVENTORY_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: RISK_INVENTORY_SCHEMA,
    },
  });

  // 6. Extrair e parsear resposta
  const choice = result.choices[0];
  if (!choice) throw new Error("RiskInventory: LLM returned no choices");

  const rawContent = typeof choice.message.content === "string"
    ? choice.message.content
    : Array.isArray(choice.message.content)
      ? choice.message.content
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("")
      : "";

  if (!rawContent) throw new Error("RiskInventory: LLM returned empty content");

  let parsed: { companyContext: string; items: InventoryItem[] };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    log.error("RiskInventory: Failed to parse LLM response", {
      content: rawContent.substring(0, 500),
    });
    throw new Error("RiskInventory: Resposta do LLM não é JSON válido");
  }

  if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
    throw new Error("RiskInventory: LLM não gerou itens de inventário");
  }

  // 7. Persistir — criar riskAssessment
  const riskAssessmentId = `ra_ai_${Date.now()}_${nanoid(8)}`;
  await db.insert(riskAssessments).values({
    id: riskAssessmentId,
    tenantId,
    sectorId: assessment.sectorId,
    title: `Inventário de Riscos Psicossociais — ${sectorName || "Geral"} (IA)`,
    description: parsed.companyContext,
    assessmentDate: new Date(),
    assessor: "IA — Gemini 2.5 Flash",
    status: "completed",
    methodology: "COPSOQ-II + NLP + Catalogo NR-01 Psicossocial",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 8. Persistir — itens de inventario
  for (const item of parsed.items) {
    await db.insert(riskAssessmentItems).values({
      id: `rai_${nanoid(12)}`,
      assessmentId: riskAssessmentId,
      riskFactorId: item.hazardCode,
      severity: item.severity,
      probability: item.probability,
      riskLevel: item.riskLevel,
      affectedPopulation: workerCount || report.totalRespondents || null,
      currentControls: item.currentControls,
      observations: `${item.hazard} — ${item.risk}. Lesao/Agravo: ${item.healthDamage}. Controle recomendado: ${item.recommendedControls}`,
      aiGenerated: true,
      hazardCode: item.hazardCode,
      mteHazardType: item.mteHazardType || null,
      createdAt: new Date(),
    });
  }

  // 9. Criar registro de compliance
  const compDocId = `cd_inv_${nanoid(12)}`;
  await db.insert(complianceDocuments).values({
    id: compDocId,
    tenantId,
    documentType: "inventory",
    title: `Inventário de Riscos Psicossociais — ${sectorName || "Geral"}`,
    description: `Gerado automaticamente por IA a partir da avaliacao COPSOQ-II "${assessment.title}". ${parsed.items.length} riscos identificados.`,
    version: "1.0",
    validFrom: new Date(),
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const tokensUsed = result.usage
    ? result.usage.prompt_tokens + result.usage.completion_tokens
    : 0;

  log.info("RiskInventory: Generation completed", {
    riskAssessmentId,
    itemsGenerated: parsed.items.length,
    model: result.model,
    tokensUsed,
  });

  return {
    assessmentId,
    riskAssessmentId,
    complianceDocumentId: compDocId,
    companyContext: parsed.companyContext,
    inventoryItems: parsed.items,
    metadata: {
      model: result.model || "gemini-2.5-flash",
      tokensUsed,
      generatedAt: new Date().toISOString(),
    },
  };
}
