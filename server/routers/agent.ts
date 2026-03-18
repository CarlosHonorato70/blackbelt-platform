import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { tenantProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { agentConversations, agentMessages, agentActions, agentAlerts } from "../../drizzle/schema_agent";
import { eq, and, desc, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { getNR01Status, getCompanyStrategy } from "../_ai/agentOrchestrator";
import { scanTenantAlerts } from "../_ai/agentAlerts";
import { buildAgentSystemPrompt, buildContextMessage } from "../_ai/prompts/agent-system";
import { processCNPJForAgent, formatCNPJ, sectorLabel, isHighRiskSector } from "../_core/cnpjLookup";
import { tenants } from "../../drizzle/schema";
import { complianceChecklist, complianceMilestones } from "../../drizzle/schema_nr01";
import { executeCreateAssessment, executeGenerateInventoryAndPlan, executeCreateTraining, executeCompleteChecklist } from "../_ai/agentExecutor";
import { log } from "../_core/logger";
import * as dbOps from "../db";

// ============================================================================
// ACTION EXECUTOR: Actually creates company and sets up NR-01 process
// ============================================================================

async function executeCreateCompany(
  params: Record<string, any>,
  tenantId: string,
  userId: string
): Promise<{ success: boolean; companyId?: string; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  const cnpj = (params.cnpj || "").replace(/\D/g, "");
  if (cnpj.length !== 14) return { success: false, message: "CNPJ inválido" };

  const formattedCnpj = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

  // Check if already exists — if so, return success with existing ID
  const existing = await dbOps.getTenantByCNPJ(formattedCnpj);
  if (existing) {
    return {
      success: true, companyId: existing.id,
      message: `Empresa **${existing.name}** (${formattedCnpj}) já está cadastrada. Continuando com o processo NR-01.`,
    };
  }

  const companyId = nanoid();
  try {
    // Create company tenant
    await db.insert(tenants).values({
      id: companyId,
      name: params.name || "Empresa",
      cnpj: formattedCnpj,
      street: params.street || null,
      number: params.number || null,
      complement: params.complement || null,
      neighborhood: params.neighborhood || null,
      city: params.city || null,
      state: params.state || null,
      zipCode: params.zipCode || null,
      contactEmail: params.contactEmail || null,
      contactPhone: params.contactPhone || null,
      status: "active",
      strategy: "shared_rls",
      tenantType: "company",
      parentTenantId: tenantId,
    });

    // Auto-seed NR-01 checklist (25 items)
    const nr01Requirements = [
      { code: "NR01-1.5.3.1", text: "Inventário de riscos com fatores psicossociais identificados", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.3.2", text: "Avaliação de riscos psicossociais com metodologia validada", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.3.3", text: "Classificação de riscos por severidade e probabilidade", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.4.1", text: "Plano de ação com medidas preventivas", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.4.2", text: "Hierarquia de controles aplicada", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.4.3", text: "Responsáveis e prazos definidos", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.7.1", text: "PGR com seção de riscos psicossociais", category: "Documentação" },
      { code: "NR01-1.5.7.2", text: "Laudo técnico assinado", category: "Documentação" },
      { code: "NR01-1.5.7.3", text: "Registro de treinamentos", category: "Documentação" },
      { code: "NR07-7.5.1", text: "PCMSO integrado com riscos psicossociais", category: "PCMSO" },
      { code: "NR07-7.5.2", text: "Exames de saúde mental definidos", category: "PCMSO" },
      { code: "NR01-1.5.3.6", text: "COPSOQ-II aplicado", category: "Participação dos Trabalhadores" },
      { code: "NR01-1.5.3.7", text: "Feedback comunicado aos trabalhadores", category: "Participação dos Trabalhadores" },
      { code: "NR01-1.5.5.1", text: "Treinamento de lideranças", category: "Treinamento" },
      { code: "NR01-1.5.5.2", text: "Capacitação da CIPA", category: "Treinamento" },
      { code: "NR01-1.5.5.3", text: "Prevenção ao assédio", category: "Treinamento" },
      { code: "NR01-1.5.6.1", text: "Indicadores de saúde mental monitorados", category: "Monitoramento" },
      { code: "NR01-1.5.6.2", text: "Reavaliação periódica dos riscos", category: "Monitoramento" },
    ];

    for (const req of nr01Requirements) {
      await db.insert(complianceChecklist).values({
        id: nanoid(), tenantId: companyId, requirementCode: req.code,
        requirementText: req.text, category: req.category, status: "non_compliant",
        createdAt: new Date(), updatedAt: new Date(),
      });
    }

    // Auto-seed milestones
    const addDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d; };
    const milestones = [
      { title: "Capacitação da equipe SST", category: "training", targetDate: addDays(30), order: 1 },
      { title: "Definição de metodologia", category: "assessment", targetDate: addDays(45), order: 2 },
      { title: "Aplicação COPSOQ-II", category: "assessment", targetDate: addDays(75), order: 3 },
      { title: "Análise e relatório", category: "inventory", targetDate: addDays(90), order: 4 },
      { title: "Elaboração do PGR psicossocial", category: "documentation", targetDate: addDays(105), order: 5 },
      { title: "Plano de ação preventivo", category: "action_plan", targetDate: addDays(120), order: 6 },
      { title: "Implementação das ações", category: "action_plan", targetDate: addDays(180), order: 7 },
      { title: "Integração PGR+PCMSO", category: "documentation", targetDate: addDays(150), order: 8 },
      { title: "Treinamento de lideranças", category: "training", targetDate: addDays(135), order: 9 },
      { title: "Revisão e auditoria", category: "review", targetDate: addDays(210), order: 10 },
      { title: "Adequação completa NR-01", category: "review", targetDate: new Date("2026-05-26"), order: 11 },
    ];

    for (const m of milestones) {
      await db.insert(complianceMilestones).values({
        id: nanoid(), tenantId: companyId, title: m.title, category: m.category,
        targetDate: m.targetDate, status: "pending", order: m.order,
        createdAt: new Date(), updatedAt: new Date(),
      });
    }

    // Record action
    await db.insert(agentActions).values({
      id: nanoid(), tenantId, actionType: "create_company",
      status: "completed", input: params, output: { companyId, name: params.name },
      startedAt: new Date(), completedAt: new Date(),
    });

    return {
      success: true, companyId,
      message: `Empresa **${params.name}** cadastrada com sucesso! Checklist NR-01 (${nr01Requirements.length} itens) e cronograma (${milestones.length} milestones) configurados automaticamente.`,
    };
  } catch (error: any) {
    log.error("Agent create_company failed", { error: error.message });
    return { success: false, message: `Erro ao cadastrar empresa: ${error.message}` };
  }
}

// Parse action blocks from LLM response
function parseActions(content: string): Array<{ type: string; label: string; params: Record<string, any> }> {
  const actions: Array<{ type: string; label: string; params: Record<string, any> }> = [];
  const actionRegex = /```action\s*\n([\s\S]*?)\n```/g;
  let match;
  while ((match = actionRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      actions.push(parsed);
    } catch { /* skip invalid JSON */ }
  }
  return actions;
}

// Clean action blocks from display content
function cleanContent(content: string): string {
  return content.replace(/```action\s*\n[\s\S]*?\n```/g, "").trim();
}

// Extract CNPJ from text
function extractCNPJ(text: string): string | null {
  const match = text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
  return match ? match[0] : null;
}

// Extract headcount from text
function extractHeadcount(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(?:funcionário|funcionario|empregado|colaborador|trabalhador)/i);
  return match ? parseInt(match[1]) : undefined;
}

// Build strategy text based on company profile
function buildStrategyText(headcount: number, sector: string, sectorName: string, highRisk: boolean): string {
  let riskFocus = "";
  if (highRisk) {
    riskFocus = "\n\n**Atenção:** O setor **" + sectorName + "** é classificado como **alto risco psicossocial**. " +
      "A avaliação terá foco especial nas dimensões de violência, assédio, burnout e demanda emocional.";
  }

  if (headcount < 20) {
    return `**Estratégia recomendada para ${headcount} funcionários (pequeno porte):**
- Avaliação **simplificada** focando nos riscos mais críticos do setor
- Prazo estimado: **120 dias**
- Metodologia: COPSOQ-II adaptado (dimensões prioritárias)${riskFocus}`;
  } else if (headcount <= 100) {
    return `**Estratégia recomendada para ${headcount} funcionários (médio porte):**
- **COPSOQ-II completo** — todas as 12 dimensões psicossociais
- Prazo estimado: **180 dias**
- Análise por grupos de trabalho${riskFocus}`;
  } else {
    return `**Estratégia recomendada para ${headcount} funcionários (grande porte):**
- **COPSOQ-II por setor/departamento** — plano detalhado por área
- Prazo estimado: **210 dias**
- Análise estratificada com relatórios departamentais${riskFocus}`;
  }
}

// ============================================================================
// CONVERSATION MEMORY: Extract context from previous messages
// ============================================================================

interface ConversationContext {
  cnpj?: string;
  companyName?: string;
  sector?: string;
  sectorName?: string;
  headcount?: number;
  highRisk?: boolean;
  address?: string;
  cnpjData?: any;
  lastAction?: string;
  phase?: string;
}

function extractContextFromHistory(messages: Array<{ role: string; content: string; metadata?: any; actionPayload?: any }>): ConversationContext {
  const ctx: ConversationContext = {};

  for (const msg of messages) {
    // Extract CNPJ from any message
    const cnpj = extractCNPJ(msg.content);
    if (cnpj) ctx.cnpj = cnpj.replace(/\D/g, "");

    // Extract headcount from any message
    const hc = extractHeadcount(msg.content);
    if (hc) ctx.headcount = hc;

    // Extract company data from assistant responses
    if (msg.role === "assistant") {
      // Look for company name in table format
      const nameMatch = msg.content.match(/\*\*Razão Social\*\*\s*\|\s*(.+)/);
      if (nameMatch) ctx.companyName = nameMatch[1].trim();

      const fantasyMatch = msg.content.match(/\*\*Nome Fantasia\*\*\s*\|\s*(.+)/);
      if (fantasyMatch && fantasyMatch[1].trim() !== "—") ctx.companyName = fantasyMatch[1].trim();

      const sectorMatch = msg.content.match(/\*\*Setor:\*\*\s*(.+?)(?:\s*⚠️|$)/);
      if (sectorMatch) ctx.sectorName = sectorMatch[1].trim();

      if (msg.content.includes("ALTO RISCO PSICOSSOCIAL")) ctx.highRisk = true;

      // Extract from action payloads (most reliable)
      if (msg.metadata?.actions) {
        for (const action of msg.metadata.actions) {
          if (action.params?.cnpj) ctx.cnpj = action.params.cnpj.replace(/\D/g, "");
          if (action.params?.name) ctx.companyName = action.params.name;
          if (action.params?.sector) ctx.sector = action.params.sector;
          if (action.params?.headcount) ctx.headcount = action.params.headcount;
          ctx.lastAction = action.type;
        }
      }
      if (msg.actionPayload) {
        if (msg.actionPayload.cnpj) ctx.cnpj = msg.actionPayload.cnpj.replace(/\D/g, "");
        if (msg.actionPayload.name) ctx.companyName = msg.actionPayload.name;
        if (msg.actionPayload.sector) ctx.sector = msg.actionPayload.sector;
        if (msg.actionPayload.headcount) ctx.headcount = msg.actionPayload.headcount;
      }
    }
  }

  if (ctx.sector && !ctx.sectorName) ctx.sectorName = sectorLabel(ctx.sector);
  if (ctx.sector) ctx.highRisk = isHighRiskSector(ctx.sector);

  return ctx;
}

// ============================================================================
// FALLBACK WITH MEMORY: Uses conversation history for context
// ============================================================================

async function generateFallbackResponse(
  userMessage: string,
  company: any,
  status: any,
  conversationHistory: Array<{ role: string; content: string; metadata?: any; actionPayload?: any }>,
  tenantId: string,
  userId: string
): Promise<{ content: string; actions: Array<{ type: string; label: string; params: Record<string, any> }> }> {
  const msg = userMessage.toLowerCase();
  const actions: Array<{ type: string; label: string; params: Record<string, any> }> = [];

  // Build memory from conversation history
  const memory = extractContextFromHistory(conversationHistory);

  // ── 1. Current message has CNPJ: do fresh lookup ──
  const cnpj = extractCNPJ(userMessage);
  if (cnpj) {
    const headcount = extractHeadcount(userMessage) || memory.headcount;
    const result = await processCNPJForAgent(cnpj, headcount);

    if (!result.found) return { content: result.message!, actions: [] };
    if (!result.active) return { content: result.message!, actions: [] };

    const data = result.data!;
    const formattedCNPJ = formatCNPJ(cnpj);

    let content = `Consultei a Receita Federal e encontrei os dados da empresa:

**📋 Dados da Empresa:**
| Campo | Valor |
|-------|-------|
| **Razão Social** | ${data.razao_social} |
| **Nome Fantasia** | ${data.nome_fantasia || "—"} |
| **CNPJ** | ${formattedCNPJ} |
| **Situação** | ${data.situacao_cadastral} |
| **CNAE Principal** | ${data.cnae_fiscal} — ${data.cnae_fiscal_descricao} |
| **Porte** | ${data.porte} |
| **Endereço** | ${result.address} |
| **CEP** | ${data.cep} |
| **Telefone** | ${data.telefone || "—"} |
| **Email** | ${data.email || "—"} |
| **Início Atividade** | ${data.data_inicio_atividade} |

**🏭 Classificação NR-01:**
- **Setor:** ${result.sectorName}${result.highRisk ? " ⚠️ **ALTO RISCO PSICOSSOCIAL**" : ""}
`;

    if (headcount) {
      content += "\n" + buildStrategyText(headcount, result.sector!, result.sectorName!, result.highRisk!);
      content += `\n\n**Próximos passos automáticos após cadastro:**
1. ✅ Cadastrar empresa na plataforma
2. ✅ Popular checklist NR-01 (25 itens obrigatórios)
3. ✅ Criar cronograma com milestones personalizados
4. ✅ Criar avaliação COPSOQ-II
5. 📧 Enviar convites para funcionários responderem

Clique em **"Iniciar Processo NR-01"** para prosseguir automaticamente.`;

      actions.push({
        type: "create_company",
        label: "Iniciar Processo NR-01",
        params: {
          cnpj: data.cnpj,
          name: data.nome_fantasia || data.razao_social,
          sector: result.sector,
          headcount,
          street: data.logradouro,
          number: data.numero,
          complement: data.complemento,
          neighborhood: data.bairro,
          city: data.municipio,
          state: data.uf,
          zipCode: data.cep,
          contactPhone: data.telefone,
          contactEmail: data.email,
        },
      });
    } else {
      content += "\nPara definir a estratégia, preciso saber o **número de funcionários** da empresa.";
    }

    return { content, actions };
  }

  // ── 2. User mentions headcount and we already have CNPJ from history ──
  const currentHeadcount = extractHeadcount(userMessage);
  if (currentHeadcount && memory.cnpj) {
    // Re-lookup CNPJ to get fresh data
    const result = await processCNPJForAgent(memory.cnpj, currentHeadcount);
    if (result.found && result.active) {
      const data = result.data!;
      const content = buildStrategyText(currentHeadcount, result.sector!, result.sectorName!, result.highRisk!) + `

Empresa: **${data.nome_fantasia || data.razao_social}** (${formatCNPJ(memory.cnpj)})

**Próximos passos automáticos após cadastro:**
1. ✅ Cadastrar empresa na plataforma
2. ✅ Popular checklist NR-01 (25 itens obrigatórios)
3. ✅ Criar cronograma com milestones personalizados
4. ✅ Criar avaliação COPSOQ-II
5. 📧 Enviar convites para funcionários responderem

Clique em **"Iniciar Processo NR-01"** para prosseguir automaticamente.`;

      actions.push({
        type: "create_company",
        label: "Iniciar Processo NR-01",
        params: {
          cnpj: data.cnpj,
          name: data.nome_fantasia || data.razao_social,
          sector: result.sector,
          headcount: currentHeadcount,
          street: data.logradouro, number: data.numero,
          city: data.municipio, state: data.uf, zipCode: data.cep,
        },
      });
      return { content, actions };
    }
  }

  // ── 3. Execute action: "Executar:" command OR affirmative with data ready ──
  const isExecuteCommand = msg.startsWith("executar:");
  const isAffirmative = /^(sim|ok|pode|prossegu|inici|vamos|confirm|faz|comec|start|go|yes|claro|certo|beleza|bora)/i.test(msg.trim());
  const wantsCopsoq = msg.includes("copsoq") || msg.includes("avaliação") || msg.includes("avaliacao") || msg.includes("criar avaliação") || msg.includes("criar avaliacao") || (isExecuteCommand && msg.includes("copsoq"));

  // Handle COPSOQ / assessment creation — AUTO-EXECUTE
  if ((wantsCopsoq || ((isExecuteCommand || isAffirmative) && memory.lastAction === "create_assessment")) && memory.cnpj) {
    const formattedCnpj = memory.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    const existingCompany = await dbOps.getTenantByCNPJ(formattedCnpj);
    if (existingCompany) {
      const result = await executeCreateAssessment(existingCompany.id, existingCompany.name, memory.headcount || 5);
      if (result.success) {
        return {
          content: result.message + `\n\n**Próxima etapa:** Gerar inventário de riscos e plano de ação com base nos resultados.`,
          actions: [
            { type: "generate_inventory", label: "Gerar Inventário e Plano de Ação", params: { assessmentId: result.assessmentId, companyId: existingCompany.id } },
          ],
        };
      }
      return { content: result.message, actions: [] };
    }
  }

  // Handle Risk Inventory + Action Plan generation
  const wantsInventory = msg.includes("inventário") || msg.includes("inventario") || msg.includes("plano de ação") || msg.includes("plano de acao") || msg.includes("risco");
  if ((wantsInventory || ((isExecuteCommand || isAffirmative) && memory.lastAction === "generate_inventory")) && memory.cnpj) {
    const formattedCnpj = memory.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    const existingCompany = await dbOps.getTenantByCNPJ(formattedCnpj);
    if (existingCompany) {
      // Find latest assessment
      const db2 = await getDb();
      if (db2) {
        const { copsoqAssessments } = await import("../../drizzle/schema_nr01");
        const [latestAssessment] = await db2.select().from(copsoqAssessments)
          .where(eq(copsoqAssessments.tenantId, existingCompany.id))
          .orderBy(desc(copsoqAssessments.createdAt)).limit(1);
        if (latestAssessment) {
          const result = await executeGenerateInventoryAndPlan(existingCompany.id, latestAssessment.id, existingCompany.name, memory.headcount || 5);
          if (result.success) {
            return {
              content: result.message + `\n\n**Próxima etapa:** Criar programa de treinamento sobre riscos psicossociais.`,
              actions: [
                { type: "create_training", label: "Criar Programa de Treinamento", params: { companyId: existingCompany.id } },
              ],
            };
          }
          return { content: result.message, actions: [] };
        }
      }
    }
  }

  // Handle Training Program creation
  const wantsTraining = msg.includes("treinamento") || msg.includes("capacitação") || msg.includes("capacitacao") || msg.includes("training");
  if ((wantsTraining || ((isExecuteCommand || isAffirmative) && memory.lastAction === "create_training")) && memory.cnpj) {
    const formattedCnpj = memory.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    const existingCompany = await dbOps.getTenantByCNPJ(formattedCnpj);
    if (existingCompany) {
      const result = await executeCreateTraining(existingCompany.id, existingCompany.name);
      if (result.success) {
        return {
          content: result.message + `\n\n**Próxima etapa:** Finalizar checklist e emitir certificado de conformidade.`,
          actions: [
            { type: "complete_checklist", label: "Finalizar e Emitir Certificado", params: { companyId: existingCompany.id } },
          ],
        };
      }
      return { content: result.message, actions: [] };
    }
  }

  // Handle Checklist completion + Certificate issuance
  const wantsCertificate = msg.includes("certificado") || msg.includes("certificação") || msg.includes("certificacao") || msg.includes("checklist") || msg.includes("finalizar") || msg.includes("documentação") || msg.includes("documentacao") || msg.includes("pgr") || msg.includes("pcmso");
  if ((wantsCertificate || ((isExecuteCommand || isAffirmative) && (memory.lastAction === "complete_checklist" || memory.lastAction === "create_training"))) && memory.cnpj) {
    const formattedCnpj = memory.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    const existingCompany = await dbOps.getTenantByCNPJ(formattedCnpj);
    if (existingCompany) {
      const result = await executeCompleteChecklist(existingCompany.id);
      return { content: result.message, actions: [] };
    }
  }

  if ((isExecuteCommand || isAffirmative) && memory.cnpj && memory.headcount && memory.lastAction === "create_company") {
    // EXECUTE: Actually create the company
    const result = await processCNPJForAgent(memory.cnpj, memory.headcount);
    if (result.found && result.active) {
      const data = result.data!;
      const execResult = await executeCreateCompany({
        cnpj: data.cnpj,
        name: data.nome_fantasia || data.razao_social,
        sector: result.sector,
        headcount: memory.headcount,
        street: data.logradouro, number: data.numero, complement: data.complemento,
        neighborhood: data.bairro, city: data.municipio, state: data.uf,
        zipCode: data.cep, contactPhone: data.telefone, contactEmail: data.email,
      }, tenantId, userId);

      if (execResult.success) {
        return {
          content: `**Processo NR-01 iniciado com sucesso!**

${execResult.message}

**O que foi configurado automaticamente:**
- Empresa cadastrada na plataforma
- Checklist de conformidade NR-01 populado
- Cronograma com 11 milestones e prazos
- Prazo final: **26/05/2026**

**Próxima etapa: Diagnóstico Inicial**
Agora precisamos criar a avaliação COPSOQ-II e enviar para os ${memory.headcount} funcionários responderem. Deseja que eu crie a avaliação agora?`,
          actions: [
            { type: "create_assessment", label: "Criar Avaliação COPSOQ-II", params: { companyId: execResult.companyId } },
            { type: "view_checklist", label: "Ver Checklist NR-01", params: { companyId: execResult.companyId } },
          ],
        };
      } else {
        return { content: execResult.message, actions: [] };
      }
    }
  }

  // Affirmative but no lastAction — just show summary with action button
  if (isAffirmative && memory.cnpj && memory.headcount && !memory.lastAction) {
    const result = await processCNPJForAgent(memory.cnpj, memory.headcount);
    if (result.found && result.active) {
      const data = result.data!;
      const content = `Perfeito! Vou iniciar o processo NR-01 para **${data.nome_fantasia || data.razao_social}**.

**Resumo:**
- CNPJ: ${formatCNPJ(memory.cnpj)}
- Funcionários: ${memory.headcount}
- Setor: ${result.sectorName}
- Estratégia: ${memory.headcount < 20 ? "Simplificada (120 dias)" : memory.headcount <= 100 ? "COPSOQ-II Completo (180 dias)" : "COPSOQ-II por Setor (210 dias)"}

Clique em **"Iniciar Processo NR-01"** para cadastrar a empresa e configurar tudo automaticamente.`;

      actions.push({
        type: "create_company",
        label: "Iniciar Processo NR-01",
        params: {
          cnpj: data.cnpj, name: data.nome_fantasia || data.razao_social,
          sector: result.sector, headcount: memory.headcount,
          street: data.logradouro, number: data.numero,
          city: data.municipio, state: data.uf, zipCode: data.cep,
        },
      });
      return { content, actions };
    }
  }

  // ── 4. We have CNPJ in memory but no headcount yet ──
  if (memory.cnpj && !memory.headcount) {
    // Check if user just sent a number
    const numberMatch = userMessage.match(/^(\d+)$/);
    if (numberMatch) {
      const hc = parseInt(numberMatch[1]);
      if (hc > 0 && hc < 100000) {
        // Treat bare number as headcount
        const result = await processCNPJForAgent(memory.cnpj, hc);
        if (result.found && result.active) {
          const data = result.data!;
          const content = `Entendido: **${hc} funcionários**.

` + buildStrategyText(hc, result.sector!, result.sectorName!, result.highRisk!) + `

Empresa: **${data.nome_fantasia || data.razao_social}** (${formatCNPJ(memory.cnpj)})

Clique em **"Iniciar Processo NR-01"** para prosseguir.`;

          actions.push({
            type: "create_company",
            label: "Iniciar Processo NR-01",
            params: {
              cnpj: data.cnpj,
              name: data.nome_fantasia || data.razao_social,
              sector: result.sector,
              headcount: hc,
              street: data.logradouro, number: data.numero,
              city: data.municipio, state: data.uf, zipCode: data.cep,
            },
          });
          return { content, actions };
        }
      }
    }

    return {
      content: `Já tenho o CNPJ **${formatCNPJ(memory.cnpj)}**${memory.companyName ? ` (${memory.companyName})` : ""}. Para definir a estratégia NR-01, preciso saber: **quantos funcionários** a empresa possui?`,
      actions: [],
    };
  }

  // ── 5. We have all data from memory — execute directly ──
  if (memory.cnpj && memory.headcount) {
    // Auto-execute: create the company
    const result = await processCNPJForAgent(memory.cnpj, memory.headcount);
    if (result.found && result.active) {
      const data = result.data!;
      const execResult = await executeCreateCompany({
        cnpj: data.cnpj, name: data.nome_fantasia || data.razao_social,
        sector: result.sector, headcount: memory.headcount,
        street: data.logradouro, number: data.numero, complement: data.complemento,
        neighborhood: data.bairro, city: data.municipio, state: data.uf,
        zipCode: data.cep, contactPhone: data.telefone, contactEmail: data.email,
      }, tenantId, userId);

      if (execResult.success) {
        return {
          content: `**Processo NR-01 iniciado com sucesso!**

${execResult.message}

**Próxima etapa: Diagnóstico Inicial**
Deseja que eu crie a avaliação COPSOQ-II para os ${memory.headcount} funcionários?`,
          actions: [
            { type: "create_assessment", label: "Criar Avaliação COPSOQ-II", params: { companyId: execResult.companyId } },
          ],
        };
      } else {
        return { content: execResult.message, actions: [] };
      }
    }

    return {
      content: `Tenho os dados mas não consegui consultar o CNPJ. Diga **"iniciar"** para tentar novamente.`,
      actions: [],
    };
  }

  // ── 6. Status/progress queries ──
  if (msg.includes("status") || msg.includes("progresso") || msg.includes("andamento")) {
    if (status) {
      const completedPhases = status.phases.filter((p: any) => p.status === "completed").length;
      const content = `Progresso atual: **${status.overallProgress}%** (${completedPhases}/10 fases concluídas).

Fase atual: **${status.currentPhase}**

${status.nextActions.length > 0 ? "Próximas ações recomendadas:\n" + status.nextActions.map((a: any) => `- **${a.label}**: ${a.description}`).join("\n") : "Nenhuma ação pendente."}

${status.alerts.length > 0 ? "\nAlertas:\n" + status.alerts.map((a: string) => `⚠️ ${a}`).join("\n") : ""}`;
      return { content, actions: status.nextActions.map((a: any) => ({ type: a.actionType, label: a.label, params: a.params || {} })) };
    }
    return { content: "Nenhuma empresa selecionada. Me informe o CNPJ da empresa para verificar o status.", actions: [] };
  }

  // ── 7. Help/capabilities ──
  if (msg.includes("ajuda") || msg.includes("help") || msg.includes("pode fazer") || msg.includes("capaz")) {
    return {
      content: `Sou o **Assistente IA NR-01** da BlackBelt. Posso conduzir **todo o processo de conformidade** automaticamente:

1. **Consulta de CNPJ** — Busco automaticamente os dados na Receita Federal
2. **Cadastro e Diagnóstico** — Classifico o setor e defino a estratégia ideal
3. **Checklist + Cronograma** — 25 itens obrigatórios + milestones personalizados
4. **Avaliação COPSOQ-II** — Crio e envio para os funcionários responderem
5. **Análise com IA** — Relatório com dimensões críticas identificadas
6. **Inventário de Riscos** — Classificação completa dos perigos psicossociais
7. **Plano de Ação** — Medidas preventivas com cronograma e responsáveis
8. **Treinamentos** — Programas de capacitação obrigatórios
9. **Documentação PGR/PCMSO** — Geração automática em PDF
10. **Certificação** — Emissão quando compliance ≥ 80%
11. **Monitoramento** — Alertas automáticos de prazos, riscos e falhas

**Para começar, me envie o CNPJ da empresa e o número de funcionários.**`,
      actions: [],
    };
  }

  // ── 8. Default response ──
  return {
    content: `Para iniciar o processo de conformidade NR-01, me envie:

- **CNPJ** da empresa (vou consultar automaticamente na Receita Federal)
- **Número de funcionários** (para definir a estratégia de avaliação)

Exemplo: *"CNPJ 30.428.133/0001-24, 5 funcionários"*

Ou pergunte sobre o **status** de uma empresa já cadastrada, ou peça **ajuda** para ver todas as funcionalidades.`,
    actions: [],
  };
}

export const agentRouter = router({
  // Start or get conversation
  getOrCreateConversation: tenantProcedure
    .input(z.object({
      companyId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [
        eq(agentConversations.tenantId, ctx.tenantId!),
        eq(agentConversations.userId, ctx.user!.id),
      ];
      if (input.companyId) {
        conditions.push(eq(agentConversations.companyId, input.companyId));
      }

      const [existing] = await db.select().from(agentConversations)
        .where(and(...conditions))
        .orderBy(desc(agentConversations.updatedAt))
        .limit(1);

      if (existing) return existing;

      const id = nanoid();
      await db.insert(agentConversations).values({
        id,
        tenantId: ctx.tenantId!,
        userId: ctx.user!.id,
        companyId: input.companyId || null,
        title: "Assistente NR-01",
        phase: "ONBOARDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id, tenantId: ctx.tenantId!, userId: ctx.user!.id, companyId: input.companyId || null, title: "Assistente NR-01", phase: "ONBOARDING" };
    }),

  // Send message and get AI response
  sendMessage: tenantProcedure
    .input(z.object({
      conversationId: z.string(),
      content: z.string().min(1).max(5000),
      companyId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Save user message
      const userMsgId = nanoid();
      await db.insert(agentMessages).values({
        id: userMsgId,
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
        createdAt: new Date(),
      });

      // Build context
      const targetTenantId = input.companyId || ctx.tenantId!;
      let status = null;
      let company = null;
      let alerts: any[] = [];

      try {
        status = await getNR01Status(targetTenantId);
      } catch { /* no status yet */ }

      try {
        const dbInstance = await getDb();
        if (dbInstance) {
          const { tenants } = await import("../../drizzle/schema");
          const [tenant] = await dbInstance.select().from(tenants).where(eq(tenants.id, targetTenantId)).limit(1);
          if (tenant) {
            company = {
              tenantId: tenant.id,
              companyName: tenant.name,
              cnpj: (tenant as any).cnpj || "",
              sector: (tenant as any).sector || undefined,
              headcount: (tenant as any).headcount || undefined,
              tenantType: (tenant as any).tenantType || "company",
            };
          }
        }
      } catch { /* no company data */ }

      try {
        const dbAlerts = await db.select().from(agentAlerts)
          .where(and(eq(agentAlerts.tenantId, targetTenantId), eq(agentAlerts.dismissed, false)))
          .orderBy(desc(agentAlerts.createdAt))
          .limit(10);
        alerts = dbAlerts;
      } catch { /* no alerts */ }

      // Fetch recent conversation history (last 20 messages)
      const recentMessages = await db.select().from(agentMessages)
        .where(eq(agentMessages.conversationId, input.conversationId))
        .orderBy(desc(agentMessages.createdAt))
        .limit(20);

      const orderedHistory = [...recentMessages].reverse();

      // AUTO-LOOKUP: If user message contains a CNPJ, enrich LLM context
      const cnpj = extractCNPJ(input.content);
      let cnpjContext = "";
      if (cnpj) {
        const cnpjResult = await processCNPJForAgent(cnpj, extractHeadcount(input.content));
        if (cnpjResult.found && cnpjResult.active) {
          const d = cnpjResult.data!;
          cnpjContext = `\n\n[DADOS DO CNPJ CONSULTADOS NA RECEITA FEDERAL]
Razão Social: ${d.razao_social}
Nome Fantasia: ${d.nome_fantasia || "N/A"}
CNPJ: ${formatCNPJ(cnpj)}
CNAE: ${d.cnae_fiscal} - ${d.cnae_fiscal_descricao}
Setor NR-01: ${cnpjResult.sectorName} ${cnpjResult.highRisk ? "(ALTO RISCO PSICOSSOCIAL)" : ""}
Porte: ${d.porte}
Situação: ${d.situacao_cadastral}
Endereço: ${cnpjResult.address}
CEP: ${d.cep}
Telefone: ${d.telefone || "N/A"}
Email: ${d.email || "N/A"}
Início Atividade: ${d.data_inicio_atividade}
${extractHeadcount(input.content) ? `Funcionários informados: ${extractHeadcount(input.content)}` : "Número de funcionários: NÃO INFORMADO (perguntar ao usuário)"}`;
        } else if (cnpjResult.message) {
          cnpjContext = `\n\n[CNPJ LOOKUP]: ${cnpjResult.message}`;
        }
      }

      // Build LLM messages
      const systemPrompt = buildAgentSystemPrompt();
      const contextMessage = buildContextMessage(company, status, alerts.map(a => ({
        alertType: a.alertType,
        severity: a.severity,
        title: a.title,
        message: a.message,
      })));

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        { role: "system" as const, content: contextMessage + cnpjContext },
        ...orderedHistory.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      // Call LLM
      let assistantContent = "";
      let actions: Array<{ type: string; label: string; params: Record<string, any> }> = [];

      try {
        const result = await invokeLLM({ messages: llmMessages });
        const choice = result.choices[0];
        if (choice?.message?.content) {
          const rawContent = typeof choice.message.content === "string"
            ? choice.message.content
            : choice.message.content.map((c: any) => c.text || "").join("");

          actions = parseActions(rawContent);
          assistantContent = cleanContent(rawContent);
        } else {
          const fallback = await generateFallbackResponse(input.content, company, status, orderedHistory, ctx.tenantId!, ctx.user!.id);
          assistantContent = fallback.content;
          actions = fallback.actions;
        }
      } catch (error) {
        log.error("Agent LLM error, using fallback with memory", { error: String(error) });
        // Fallback WITH conversation memory
        const fallback = await generateFallbackResponse(input.content, company, status, orderedHistory, ctx.tenantId!, ctx.user!.id);
        assistantContent = fallback.content;
        actions = fallback.actions;
      }

      // Save assistant message
      const assistantMsgId = nanoid();
      await db.insert(agentMessages).values({
        id: assistantMsgId,
        conversationId: input.conversationId,
        role: "assistant",
        content: assistantContent,
        metadata: actions.length > 0 ? { actions } : null,
        actionType: actions.length > 0 ? actions[0].type : null,
        actionPayload: actions.length > 0 ? actions[0].params : null,
        createdAt: new Date(),
      });

      // Update conversation
      await db.update(agentConversations)
        .set({ updatedAt: new Date() })
        .where(eq(agentConversations.id, input.conversationId));

      // Scan for alerts in the background
      scanTenantAlerts(ctx.tenantId!, input.companyId).catch(() => {});

      return {
        userMessage: { id: userMsgId, role: "user", content: input.content },
        assistantMessage: {
          id: assistantMsgId,
          role: "assistant",
          content: assistantContent,
          actions,
        },
      };
    }),

  // Get conversation history
  getHistory: tenantProcedure
    .input(z.object({
      conversationId: z.string(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const messages = await db.select().from(agentMessages)
        .where(eq(agentMessages.conversationId, input.conversationId))
        .orderBy(agentMessages.createdAt)
        .limit(input.limit)
        .offset(input.offset);

      return messages.map(m => ({
        ...m,
        actions: m.metadata && typeof m.metadata === "object" && "actions" in (m.metadata as any)
          ? (m.metadata as any).actions
          : [],
      }));
    }),

  // Get NR-01 status for a company
  getStatus: tenantProcedure
    .input(z.object({ companyId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const targetTenantId = input.companyId || ctx.tenantId!;
      try {
        return await getNR01Status(targetTenantId);
      } catch {
        return null;
      }
    }),

  // Get strategy recommendation
  getStrategy: tenantProcedure
    .input(z.object({
      headcount: z.number(),
      sector: z.string().optional(),
    }))
    .query(({ input }) => {
      return getCompanyStrategy(input.headcount, input.sector);
    }),

  // Get active alerts
  getAlerts: tenantProcedure
    .input(z.object({
      companyId: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const targetTenantId = input.companyId || ctx.tenantId!;
      await scanTenantAlerts(ctx.tenantId!, input.companyId);

      const alerts = await db.select().from(agentAlerts)
        .where(and(
          eq(agentAlerts.tenantId, targetTenantId),
          eq(agentAlerts.dismissed, false)
        ))
        .orderBy(desc(agentAlerts.createdAt))
        .limit(input.limit);

      return alerts;
    }),

  // Dismiss an alert
  dismissAlert: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(agentAlerts)
        .set({ dismissed: true, dismissedAt: new Date() })
        .where(and(eq(agentAlerts.id, input.id), eq(agentAlerts.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // List conversations
  listConversations: tenantProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return db.select().from(agentConversations)
        .where(and(
          eq(agentConversations.tenantId, ctx.tenantId!),
          eq(agentConversations.userId, ctx.user!.id)
        ))
        .orderBy(desc(agentConversations.updatedAt))
        .limit(20);
    }),

  // Delete a conversation and all its messages
  deleteConversation: tenantProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify ownership
      const [conv] = await db.select().from(agentConversations)
        .where(and(
          eq(agentConversations.id, input.conversationId),
          eq(agentConversations.tenantId, ctx.tenantId!),
          eq(agentConversations.userId, ctx.user!.id)
        ))
        .limit(1);

      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversa não encontrada" });

      // Delete messages first, then conversation
      await db.delete(agentMessages).where(eq(agentMessages.conversationId, input.conversationId));
      await db.delete(agentConversations).where(eq(agentConversations.id, input.conversationId));

      return { success: true };
    }),

  // Start a new conversation (force create, ignoring existing)
  newConversation: tenantProcedure
    .input(z.object({ companyId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const id = nanoid();
      await db.insert(agentConversations).values({
        id,
        tenantId: ctx.tenantId!,
        userId: ctx.user!.id,
        companyId: input.companyId || null,
        title: "Assistente NR-01",
        phase: "ONBOARDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id, tenantId: ctx.tenantId!, userId: ctx.user!.id, companyId: input.companyId || null, title: "Assistente NR-01", phase: "ONBOARDING" };
    }),
});
