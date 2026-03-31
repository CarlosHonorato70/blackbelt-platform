/**
 * Gerador automatico de Plano de Acao para Mitigacao de Riscos Psicossociais.
 *
 * Utiliza o inventario de riscos (Fase 2) e a analise COPSOQ-II (Fase 1)
 * para gerar plano de acao conforme NR-01 (item 1.5.5.2).
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
  actionPlans,
  complianceDocuments,
} from "../../drizzle/schema_nr01";
import { tenants } from "../../drizzle/schema";
import { ACTION_PLAN_PROMPT, ACTION_PLAN_SCHEMA } from "./prompts/action-plan";
import type { CopsoqAnalysisResult } from "./nlp";
import type { InventoryItem } from "./riskInventoryGenerator";

// ============================================================================
// TYPES
// ============================================================================

export interface ActionPlanInput {
  assessmentId: string;
  tenantId: string;
  sectorName?: string;
}

export interface ActionItem {
  riskIdentified: string;
  hazardCode: string;
  situationDescription: string;
  controlMeasure: string;
  actionType: "elimination" | "substitution" | "engineering" | "administrative" | "ppe";
  responsibleRole: string;
  deadline: string;
  priority: "urgent" | "high" | "medium" | "low";
  monthlySchedule: boolean[];
  expectedImpact: string;
  kpiIndicator: string;
}

export interface GeneralAction {
  title: string;
  description: string;
  frequency: string;
  responsibleRole: string;
}

export interface ActionPlanResult {
  assessmentId: string;
  complianceDocumentId: string;
  planTitle: string;
  actions: ActionItem[];
  generalActions: GeneralAction[];
  monitoringStrategy: string;
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
 * Formata itens do inventario para o prompt.
 */
function formatInventoryForPrompt(
  items: Array<{
    riskFactorId: string | null;
    severity: string | null;
    probability: string | null;
    riskLevel: string | null;
    observations: string | null;
    hazardCode: string | null;
  }>
): string {
  if (items.length === 0) return "(Nenhum item de inventario encontrado)";

  return items
    .map((item, i) => {
      return `${i + 1}. [${item.hazardCode || item.riskFactorId}] Severidade: ${item.severity}, Probabilidade: ${item.probability}, Nivel: ${item.riskLevel}\n   ${item.observations || "Sem observacoes"}`;
    })
    .join("\n");
}

/**
 * Mapeia prioridade do plano para o enum do banco.
 */
function mapPriority(p: string): "low" | "medium" | "high" | "urgent" {
  const map: Record<string, "low" | "medium" | "high" | "urgent"> = {
    urgent: "urgent",
    high: "high",
    medium: "medium",
    low: "low",
  };
  return map[p] || "medium";
}

/**
 * Mapeia actionType do plano para o enum do banco.
 */
function mapActionType(
  t: string
): "elimination" | "substitution" | "engineering" | "administrative" | "ppe" {
  const map: Record<string, "elimination" | "substitution" | "engineering" | "administrative" | "ppe"> = {
    elimination: "elimination",
    substitution: "substitution",
    engineering: "engineering",
    administrative: "administrative",
    ppe: "ppe",
  };
  return map[t] || "administrative";
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Gera plano de acao para mitigacao de riscos psicossociais via IA.
 *
 * Pre-requisito: inventario de riscos gerado (via generateRiskInventory).
 */
export async function generateActionPlan(
  input: ActionPlanInput
): Promise<ActionPlanResult> {
  const { assessmentId, tenantId, sectorName } = input;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. Buscar tenant
  const [tenant] = await db
    .select({ name: tenants.name })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tenantName = tenant?.name || "Organizacao";

  // 2. Buscar assessment
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
    throw new Error("Report COPSOQ-II não encontrado.");
  }

  const aiAnalysis = report.aiAnalysis as CopsoqAnalysisResult | null;

  // 4. Buscar inventario de riscos (gerado pela IA ou manual)
  const riskAssessmentsList = await db
    .select()
    .from(riskAssessments)
    .where(eq(riskAssessments.tenantId, tenantId));

  // Pegar o mais recente
  const latestRA = riskAssessmentsList.sort(
    (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
  )[0];

  let inventoryItems: typeof riskAssessmentItems.$inferSelect[] = [];
  if (latestRA) {
    inventoryItems = await db
      .select()
      .from(riskAssessmentItems)
      .where(eq(riskAssessmentItems.assessmentId, latestRA.id));
  }

  // 5. Montar prompt
  const inventoryText = formatInventoryForPrompt(
    inventoryItems.map((i) => ({
      riskFactorId: i.riskFactorId,
      severity: i.severity,
      probability: i.probability,
      riskLevel: i.riskLevel,
      observations: i.observations,
      hazardCode: (i as any).hazardCode || null,
    }))
  );

  const analysisText = aiAnalysis
    ? `Resumo: ${aiAnalysis.executiveSummary}\n\nRecomendacoes IA:\n${aiAnalysis.recommendations
        ?.map((r) => `- [P${r.priority}] ${r.title}: ${r.description}`)
        .join("\n") || "(sem recomendacoes)"}`
    : "(Análise IA não disponível)";

  const userPrompt = `## Dados para Geração do Plano de Ação

**Empresa:** ${tenantName}
**Setor:** ${sectorName || "Geral"}
**Avaliacao:** ${assessment.title}

### Inventário de Riscos Psicossociais (${inventoryItems.length} itens)

${inventoryText}

### Analise COPSOQ-II (IA)

${analysisText}

### Distribuicao de Risco dos Respondentes

- Baixo: ${report.lowRiskCount || 0}
- Medio: ${report.mediumRiskCount || 0}
- Alto: ${report.highRiskCount || 0}
- Critico: ${report.criticalRiskCount || 0}

Gere o plano de acao completo para mitigacao dos riscos psicossociais identificados, incluindo acoes especificas e acoes gerais obrigatorias conforme NR-01.`;

  log.info("ActionPlan: Starting generation", {
    assessmentId,
    tenantId,
    inventoryItems: inventoryItems.length,
  });

  // 6. Chamar LLM
  const result = await invokeLLM({
    messages: [
      { role: "system", content: ACTION_PLAN_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: ACTION_PLAN_SCHEMA,
    },
  });

  // 7. Extrair e parsear
  const choice = result.choices[0];
  if (!choice) throw new Error("ActionPlan: LLM returned no choices");

  const rawContent = typeof choice.message.content === "string"
    ? choice.message.content
    : Array.isArray(choice.message.content)
      ? choice.message.content
          .filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("")
      : "";

  if (!rawContent) throw new Error("ActionPlan: LLM returned empty content");

  let parsed: {
    planTitle: string;
    actions: ActionItem[];
    generalActions: GeneralAction[];
    monitoringStrategy: string;
  };
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    log.error("ActionPlan: Failed to parse LLM response", {
      content: rawContent.substring(0, 500),
    });
    throw new Error("ActionPlan: Resposta do LLM não é JSON válido");
  }

  if (!Array.isArray(parsed.actions) || parsed.actions.length === 0) {
    throw new Error("ActionPlan: LLM não gerou ações");
  }

  // 8. Persistir — acoes especificas
  for (const action of parsed.actions) {
    // Tentar vincular ao item de inventario correspondente
    const matchingItem = inventoryItems.find(
      (i) => (i as any).hazardCode === action.hazardCode || i.riskFactorId === action.hazardCode
    );

    await db.insert(actionPlans).values({
      id: `ap_${nanoid(12)}`,
      tenantId,
      assessmentItemId: matchingItem?.id || null,
      title: action.controlMeasure.substring(0, 255),
      description: `${action.situationDescription}\n\nImpacto esperado: ${action.expectedImpact}`,
      actionType: mapActionType(action.actionType),
      deadline: new Date(Date.now() + parseDays(action.deadline) * 86400000),
      status: "pending",
      priority: mapPriority(action.priority),
      aiGenerated: true,
      monthlySchedule: action.monthlySchedule,
      kpiIndicator: action.kpiIndicator,
      expectedImpact: action.expectedImpact,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 9. Persistir — acoes gerais (como action plans sem assessmentItemId)
  for (const ga of parsed.generalActions) {
    await db.insert(actionPlans).values({
      id: `ap_g_${nanoid(12)}`,
      tenantId,
      assessmentItemId: null,
      title: ga.title.substring(0, 255),
      description: `${ga.description}\n\nFrequencia: ${ga.frequency}`,
      actionType: "administrative",
      status: "pending",
      priority: "medium",
      aiGenerated: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // 10. Criar registro de compliance
  const compDocId = `cd_ap_${nanoid(12)}`;
  await db.insert(complianceDocuments).values({
    id: compDocId,
    tenantId,
    documentType: "action_plan",
    title: parsed.planTitle,
    description: `Gerado automaticamente por IA. ${parsed.actions.length} acoes especificas + ${parsed.generalActions.length} acoes gerais. Estrategia: ${parsed.monitoringStrategy.substring(0, 200)}`,
    version: "1.0",
    validFrom: new Date(),
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const tokensUsed = result.usage
    ? result.usage.prompt_tokens + result.usage.completion_tokens
    : 0;

  log.info("ActionPlan: Generation completed", {
    complianceDocumentId: compDocId,
    specificActions: parsed.actions.length,
    generalActions: parsed.generalActions.length,
    model: result.model,
    tokensUsed,
  });

  return {
    assessmentId,
    complianceDocumentId: compDocId,
    planTitle: parsed.planTitle,
    actions: parsed.actions,
    generalActions: parsed.generalActions,
    monitoringStrategy: parsed.monitoringStrategy,
    metadata: {
      model: result.model || "gemini-2.5-flash",
      tokensUsed,
      generatedAt: new Date().toISOString(),
    },
  };
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Parseia prazos relativos (ex: "30 dias", "60 dias") para numero de dias.
 */
function parseDays(deadline: string): number {
  const match = deadline.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  // Defaults por prioridade
  if (deadline.toLowerCase().includes("imediato")) return 15;
  if (deadline.toLowerCase().includes("urgente")) return 30;
  return 90;
}
