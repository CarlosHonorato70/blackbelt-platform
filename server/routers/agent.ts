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
import { log } from "../_core/logger";

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
  const strategy = getCompanyStrategy(headcount, sector);

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

// Rule-based fallback when LLM is unavailable — now with CNPJ auto-lookup
async function generateFallbackResponse(
  userMessage: string,
  company: any,
  status: any
): Promise<{ content: string; actions: Array<{ type: string; label: string; params: Record<string, any> }> }> {
  const msg = userMessage.toLowerCase();
  const actions: Array<{ type: string; label: string; params: Record<string, any> }> = [];

  // Detect CNPJ pattern
  const cnpj = extractCNPJ(userMessage);
  if (cnpj) {
    const headcount = extractHeadcount(userMessage);

    // AUTO-LOOKUP: consulta BrasilAPI
    const result = await processCNPJForAgent(cnpj, headcount);

    if (!result.found) {
      return { content: result.message!, actions: [] };
    }

    if (!result.active) {
      return { content: result.message!, actions: [] };
    }

    // Empresa encontrada e ativa
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

**Deseja que eu inicie o processo completo agora?**`;

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
      content += "\nPara definir a estratégia de implementação da NR-01, preciso saber o **número de funcionários** da empresa.";
    }

    return { content, actions };
  }

  // If we already have a CNPJ context and user provides headcount
  if (company && extractHeadcount(userMessage)) {
    const headcount = extractHeadcount(userMessage)!;
    const sector = company.sector || "servicos";
    const sectorName = sectorLabel(sector);
    const highRisk = isHighRiskSector(sector);

    const content = buildStrategyText(headcount, sector, sectorName, highRisk) + `

**Próximos passos automáticos após cadastro:**
1. ✅ Cadastrar empresa na plataforma
2. ✅ Popular checklist NR-01 (25 itens obrigatórios)
3. ✅ Criar cronograma com milestones personalizados
4. ✅ Criar avaliação COPSOQ-II
5. 📧 Enviar convites para funcionários responderem

**Deseja que eu inicie o processo completo agora?**`;

    actions.push({
      type: "create_company",
      label: "Iniciar Processo NR-01",
      params: { cnpj: company.cnpj, headcount, name: company.companyName, sector },
    });

    return { content, actions };
  }

  // Check for status/progress queries
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

  // Check for help/capabilities
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

  // Default response
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

      // Look for existing conversation
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

      // Create new conversation
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

      // AUTO-LOOKUP: If user message contains a CNPJ, enrich context automatically
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
          cnpjContext = `\n\n[CNPJ LOOKUP RESULT]: ${cnpjResult.message}`;
        }
      }

      // Fetch recent conversation history (last 20 messages)
      const recentMessages = await db.select().from(agentMessages)
        .where(eq(agentMessages.conversationId, input.conversationId))
        .orderBy(desc(agentMessages.createdAt))
        .limit(20);

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
        ...recentMessages.reverse().map(m => ({
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
          // LLM returned empty — use fallback
          const fallback = await generateFallbackResponse(input.content, company, status);
          assistantContent = fallback.content;
          actions = fallback.actions;
        }
      } catch (error) {
        log.error("Agent LLM error, using fallback", { error: String(error) });
        // Rule-based fallback with CNPJ auto-lookup
        const fallback = await generateFallbackResponse(input.content, company, status);
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
    .input(z.object({
      companyId: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const targetTenantId = input.companyId || ctx.tenantId!;
      try {
        return await getNR01Status(targetTenantId);
      } catch {
        return null;
      }
    }),

  // Get strategy recommendation for a company profile
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

      // Scan for new alerts first
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

  // List all conversations for the user
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
});
