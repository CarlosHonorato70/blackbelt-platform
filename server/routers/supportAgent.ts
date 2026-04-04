/**
 * Support Agent Router
 * AI-powered support chatbot for consultants and companies.
 * Answers FAQ, opens tickets, and guides users through the platform.
 */

import { z } from "zod";
import { nanoid } from "nanoid";
import { tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { eq, and, desc } from "drizzle-orm";
import { agentConversations, agentMessages } from "../../drizzle/schema_agent";
import { supportTickets } from "../../drizzle/schema";
import { log } from "../_core/logger";
import { invokeLLM } from "../_core/llm";

// ============================================================================
// Knowledge Base — FAQ patterns with keyword matching
// ============================================================================

interface KBEntry {
  keywords: string[];
  answer: string;
  action?: { type: string; label: string; path?: string };
}

const SUPPORT_KB: KBEntry[] = [
  // --- Cadastro e Empresas ---
  {
    keywords: ["cadastrar", "empresa", "cnpj", "nova empresa", "criar empresa"],
    answer: "Para cadastrar uma nova empresa:\n\n1. Acesse o **SamurAI** no menu lateral\n2. Digite o **CNPJ** da empresa e o numero de funcionarios\n3. O SamurAI consultara a Receita Federal automaticamente\n4. A empresa sera cadastrada e o processo NR-01 iniciado\n\nVoce tambem pode cadastrar via **Minhas Empresas** no menu.",
    action: { type: "navigate", label: "Ir para SamurAI", path: "/agent" },
  },
  {
    keywords: ["importar", "planilha", "excel", "xlsx", "csv", "colaborador", "funcionario"],
    answer: "Para importar colaboradores via planilha:\n\n1. Va em **Colaboradores** no menu lateral\n2. Clique em **Baixar Modelo** para obter o template\n3. Preencha o arquivo com nome, email, cargo, setor e tipo de vinculo\n4. Clique em **Importar Planilha** e selecione o arquivo\n\nFormatos aceitos: XLSX, XLS, CSV, ODS, TSV.",
    action: { type: "navigate", label: "Ir para Colaboradores", path: "/people" },
  },
  {
    keywords: ["setor", "setores", "departamento"],
    answer: "Para gerenciar setores:\n\n1. Va em **Colaboradores** no menu lateral\n2. Clique na aba **Setores**\n3. Clique em **+ Novo Setor** para criar\n4. Ou importe setores via planilha (aba Setores do modelo)\n\nOs setores sao usados para organizar colaboradores e segmentar os resultados do COPSOQ.",
    action: { type: "navigate", label: "Ir para Setores", path: "/people" },
  },

  // --- COPSOQ ---
  {
    keywords: ["copsoq", "questionario", "avaliacao", "avaliação", "pesquisa", "convite copsoq"],
    answer: "O **COPSOQ-II** e o questionario de avaliacao de riscos psicossociais:\n\n1. Acesse o **SamurAI** e clique em **Criar Avaliacao COPSOQ-II**\n2. O sistema enviara convites por **email** para cada colaborador cadastrado\n3. Os colaboradores respondem pelo link recebido no email (15-20 min)\n4. Quando todos responderem, diga **\"gerar relatorio\"** no SamurAI\n\nOs emails dos colaboradores devem estar cadastrados na pagina Colaboradores.",
    action: { type: "navigate", label: "Ir para SamurAI", path: "/agent" },
  },
  {
    keywords: ["responder", "link", "questionario copsoq", "como responder"],
    answer: "Os colaboradores recebem um **email com link** para responder o COPSOQ-II:\n\n- O link e unico e expira em 7 dias\n- Nao precisa de login — basta clicar no link do email\n- Sao 76 perguntas, leva cerca de 15-20 minutos\n- As respostas sao **confidenciais** (LGPD)\n\nSe o colaborador nao recebeu o email, verifique a pasta de spam ou reenvie o convite.",
  },

  // --- PDFs e Documentos ---
  {
    keywords: ["pdf", "download", "documento", "relatorio", "inventario", "plano de acao", "proposta", "certificado"],
    answer: "Os documentos PDF sao gerados pelo **SamurAI** conforme o processo NR-01 avanca:\n\n- **Proposta Comercial** — apos cadastro da empresa\n- **Relatorio COPSOQ-II** — apos avaliacoes respondidas\n- **Inventario de Riscos** — apos analise\n- **Plano de Acao** — apos inventario\n- **Programa de Treinamento** — apos plano de acao\n- **Checklist de Conformidade** — ao finalizar\n- **Certificado NR-01** — conclusao\n\nOs links aparecem no chat do SamurAI ao final de cada fase.",
    action: { type: "navigate", label: "Ir para SamurAI", path: "/agent" },
  },

  // --- Conta e Acesso ---
  {
    keywords: ["senha", "redefinir", "esqueci", "login", "nao consigo entrar", "acesso"],
    answer: "Para redefinir sua senha:\n\n1. Na tela de login, clique em **Recuperar Senha**\n2. Digite seu email cadastrado\n3. Voce recebera um link por email para criar nova senha\n\nSe nao receber o email, verifique a pasta de spam. Se o problema persistir, abra um ticket de suporte.",
    action: { type: "navigate", label: "Recuperar Senha", path: "/forgot-password" },
  },
  {
    keywords: ["plano", "assinatura", "preco", "valor", "pagamento", "assinar"],
    answer: "Sobre planos e assinaturas:\n\n- **Starter** (CPF): R$ 297/mes — 20 convites COPSOQ inclusos + R$ 12/excedente\n- **Professional** (CNPJ): R$ 597/mes — 100 convites COPSOQ inclusos + R$ 10/excedente\n- **Enterprise** (CNPJ): R$ 997/mes — 500 convites COPSOQ inclusos + R$ 8/excedente\n\nConvites excedentes podem ser pagos via PIX, cartao ou creditos pre-pagos. Para assinar, acesse **Planos** no menu.",
    action: { type: "navigate", label: "Ver Planos", path: "/subscription/pricing" },
  },

  // --- SamurAI ---
  {
    keywords: ["samurai", "agente", "ia", "inteligencia artificial", "como funciona"],
    answer: "O **SamurAI** e nosso agente de IA que automatiza as 10 fases da conformidade NR-01:\n\n1. Cadastro da empresa (via CNPJ)\n2. Diagnostico inicial\n3. Avaliacao COPSOQ-II\n4. Inventario de riscos\n5. Plano de acao\n6. Programa de treinamento\n7. Certificacao\n\nBasta informar o CNPJ e seguir as instrucoes do agente. Ele gera todos os documentos automaticamente.",
    action: { type: "navigate", label: "Abrir SamurAI", path: "/agent" },
  },

  // --- Serviços e Precificação ---
  {
    keywords: ["servico", "catalogo", "precificacao", "preco hora", "hora tecnica"],
    answer: "Para gerenciar seu catalogo de servicos e precificacao:\n\n1. Acesse **Servicos e Precos** no menu lateral\n2. Na aba **Catalogo**, crie, edite ou exclua servicos\n3. Na aba **Parametros**, configure custos fixos, hora tecnica e regime tributario\n\nO catalogo e exclusivo da sua consultoria — pode personalizar livremente.",
    action: { type: "navigate", label: "Ir para Servicos", path: "/services" },
  },

  // --- Propostas ---
  {
    keywords: ["proposta", "comercial", "orcamento", "gerar proposta"],
    answer: "As propostas comerciais sao geradas de duas formas:\n\n1. **Automatica** — O SamurAI gera ao final do processo NR-01\n2. **Manual** — Acesse **Propostas Comerciais** no menu\n\nA proposta inclui: servicos, valores, cronograma, ROI estimado e condicoes de pagamento.",
    action: { type: "navigate", label: "Ver Propostas", path: "/proposals" },
  },

  // --- Suporte ---
  {
    keywords: ["ticket", "suporte", "problema", "erro", "bug", "ajuda humana"],
    answer: "Para abrir um ticket de suporte:\n\nDigite **\"abrir ticket\"** seguido de uma descricao do problema. Exemplo:\n\n*\"abrir ticket: meu relatorio PDF nao esta gerando\"*\n\nNossa equipe respondera o mais breve possivel.",
  },

  // --- NR-01 ---
  {
    keywords: ["nr-01", "nr01", "norma", "conformidade", "compliance", "lei"],
    answer: "A **NR-01** (Norma Regulamentadora 01) exige que empresas avaliem e gerenciem riscos psicossociais no ambiente de trabalho. A BlackBelt automatiza todo o processo:\n\n- Avaliacao via COPSOQ-II\n- Inventario de riscos psicossociais\n- Plano de acao com prazos\n- Programa de treinamento\n- Certificado de conformidade\n\nO prazo para conformidade e **26 de maio de 2025**.",
  },
];

// ============================================================================
// Helper: Build KB context string for LLM
// ============================================================================

function buildKBContext(): string {
  return SUPPORT_KB.map((entry, i) =>
    `[${i + 1}] Tópico: ${entry.keywords.join(", ")}\nResposta: ${entry.answer}${entry.action ? `\nAção: ${entry.action.type} → ${entry.action.label} (${entry.action.path || ""})` : ""}`
  ).join("\n\n");
}

const SUPPORT_SYSTEM_PROMPT = `Você é o assistente de suporte da BlackBelt Platform, uma plataforma SaaS de gestão de riscos psicossociais e conformidade NR-01.

Regras:
- Responda SEMPRE em português do Brasil
- Use markdown para formatação (negrito, listas)
- Seja conciso e direto, mas amigável
- Se a pergunta não estiver coberta pela base de conhecimento, oriente o usuário a abrir um ticket de suporte dizendo "abrir ticket"
- NUNCA invente informações que não estejam na base de conhecimento
- Se a resposta envolver navegação, inclua o caminho entre parênteses, ex: (**Colaboradores** no menu)
- Não repita a pergunta do usuário na resposta

Base de conhecimento:
${buildKBContext()}`;

// ============================================================================
// Check if user wants to open a ticket
// ============================================================================

function wantsTicket(msg: string): string | null {
  const lower = msg.toLowerCase();
  if (lower.startsWith("abrir ticket") || lower.startsWith("criar ticket")) {
    const description = msg.replace(/^(abrir|criar)\s*ticket:?\s*/i, "").trim();
    return description || "Solicitacao de suporte via agente IA";
  }
  if (lower === "sim" || lower === "sim, abrir ticket" || lower === "abrir" || lower === "sim, por favor") {
    return null; // Will use previous context
  }
  return null;
}

// ============================================================================
// Router
// ============================================================================

export const supportAgentRouter = router({
  getOrCreateConversation: tenantProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const tenantId = ctx.tenantId!;
      const userId = ctx.user!.id;

      // Find existing support conversation
      const [existing] = await db.select()
        .from(agentConversations)
        .where(and(
          eq(agentConversations.tenantId, tenantId),
          eq(agentConversations.userId, userId),
          eq(agentConversations.companyId, "support"),
        ))
        .orderBy(desc(agentConversations.createdAt))
        .limit(1);

      if (existing) return { id: existing.id };

      // Create new
      const id = nanoid();
      await db.insert(agentConversations).values({
        id,
        tenantId,
        userId,
        companyId: "support",
        title: "Suporte BlackBelt",
        phase: "support",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Add welcome message
      await db.insert(agentMessages).values({
        id: nanoid(),
        conversationId: id,
        role: "assistant",
        content: "Ola! Sou o assistente de suporte da **BlackBelt Platform**. 🛡️\n\nPosso ajuda-lo com:\n- Duvidas sobre como usar a plataforma\n- Orientacoes sobre o SamurAI e processo NR-01\n- Importacao de planilhas e colaboradores\n- Questionario COPSOQ-II\n- PDFs e documentos\n- Planos e assinaturas\n\nDigite sua duvida ou, se precisar de suporte humano, diga **\"abrir ticket\"**.",
        createdAt: new Date(),
      });

      return { id };
    }),

  sendMessage: tenantProcedure
    .input(z.object({
      conversationId: z.string(),
      content: z.string().min(1).max(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const tenantId = ctx.tenantId!;
      const userId = ctx.user!.id;

      // Save user message
      const userMsgId = nanoid();
      await db.insert(agentMessages).values({
        id: userMsgId,
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
        createdAt: new Date(),
      });

      // Generate response
      let responseContent = "";
      let actions: any[] = [];
      const userMsg = input.content.trim();

      // Check if user wants to open a ticket
      const ticketDesc = wantsTicket(userMsg);
      if (ticketDesc || userMsg.toLowerCase().includes("abrir ticket")) {
        const description = ticketDesc || userMsg;
        try {
          const ticketId = nanoid();
          await db.insert(supportTickets).values({
            id: ticketId,
            tenantId,
            userId,
            title: description.substring(0, 100),
            description,
            status: "open",
            priority: "medium",
            category: "technical",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          responseContent = `✅ **Ticket de suporte aberto com sucesso!**\n\n📋 **ID:** ${ticketId.substring(0, 8)}...\n📝 **Descricao:** ${description}\n⏰ **Status:** Aberto\n\nNossa equipe analisara sua solicitacao e respondera o mais breve possivel. Voce pode acompanhar o status em **Tickets de Suporte** no menu.`;
          actions = [{ type: "navigate", label: "Ver Meus Tickets", path: "/support-tickets" }];
          log.info(`[Support Agent] Ticket created: ${ticketId} by user ${userId}`);
        } catch (e: any) {
          responseContent = "Desculpe, houve um erro ao abrir o ticket. Tente novamente ou entre em contato por email: contato@blackbeltconsultoria.com";
          log.error(`[Support Agent] Ticket creation failed: ${e.message}`);
        }
      }
      // Check if user said "sim" (accepting to open ticket from previous suggestion)
      else if (["sim", "sim, por favor", "sim, abrir", "quero", "pode abrir"].includes(userMsg.toLowerCase())) {
        // Get last messages to find context
        const history = await db.select()
          .from(agentMessages)
          .where(eq(agentMessages.conversationId, input.conversationId))
          .orderBy(desc(agentMessages.createdAt))
          .limit(5);

        const lastUserMsg = history.find(m => m.role === "user" && m.id !== userMsgId);
        const description = lastUserMsg?.content || "Solicitacao de suporte";

        const ticketId = nanoid();
        await db.insert(supportTickets).values({
          id: ticketId,
          tenantId,
          userId,
          title: description.substring(0, 100),
          description: `Solicitacao via Suporte IA: ${description}`,
          status: "open",
          priority: "medium",
          category: "technical",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        responseContent = `✅ **Ticket aberto!**\n\n📋 **ID:** ${ticketId.substring(0, 8)}...\n📝 **Sobre:** ${description.substring(0, 100)}\n\nNossa equipe respondera em breve.`;
        actions = [{ type: "navigate", label: "Ver Meus Tickets", path: "/support-tickets" }];
      }
      // Use LLM for FAQ answering
      else {
        try {
          // Get recent conversation history for context
          const recentMessages = await db.select()
            .from(agentMessages)
            .where(eq(agentMessages.conversationId, input.conversationId))
            .orderBy(desc(agentMessages.createdAt))
            .limit(6);

          const chatHistory = recentMessages
            .reverse()
            .filter(m => m.id !== userMsgId)
            .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

          chatHistory.push({ role: "user", content: userMsg });

          const llmResult = await invokeLLM({
            messages: [
              { role: "system", content: SUPPORT_SYSTEM_PROMPT },
              ...chatHistory,
            ],
          });

          const rawContent = llmResult.choices?.[0]?.message?.content;
          const llmText = typeof rawContent === "string" ? rawContent : "";
          responseContent = llmText || "Desculpe, não consegui processar sua pergunta. Tente novamente ou diga **\"abrir ticket\"** para suporte humano.";

          // Try to detect navigation suggestions in the response
          for (const entry of SUPPORT_KB) {
            if (entry.action && entry.keywords.some(kw => userMsg.toLowerCase().includes(kw))) {
              actions = [entry.action];
              break;
            }
          }
        } catch (err) {
          log.error(`[Support Agent] LLM error: ${err instanceof Error ? err.message : String(err)}`);
          responseContent = "Desculpe, estou com dificuldade para processar sua pergunta no momento. Tente novamente ou diga **\"abrir ticket\"** para suporte humano.";
          actions = [{ type: "action", label: "Abrir Ticket" }];
        }
      }

      // Save assistant response
      const assistantMsgId = nanoid();
      await db.insert(agentMessages).values({
        id: assistantMsgId,
        conversationId: input.conversationId,
        role: "assistant",
        content: responseContent,
        metadata: actions.length > 0 ? { actions } : undefined,
        createdAt: new Date(),
      });

      return {
        userMessage: { id: userMsgId, role: "user", content: input.content, createdAt: new Date() },
        assistantMessage: {
          id: assistantMsgId,
          role: "assistant",
          content: responseContent,
          actions,
          createdAt: new Date(),
        },
      };
    }),

  getHistory: tenantProcedure
    .input(z.object({
      conversationId: z.string(),
      limit: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const messages = await db.select()
        .from(agentMessages)
        .where(eq(agentMessages.conversationId, input.conversationId))
        .orderBy(agentMessages.createdAt)
        .limit(input.limit);

      return messages.map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        actions: m.metadata?.actions || [],
        createdAt: m.createdAt,
      }));
    }),

  newConversation: tenantProcedure
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");

      const id = nanoid();
      await db.insert(agentConversations).values({
        id,
        tenantId: ctx.tenantId!,
        userId: ctx.user!.id,
        companyId: "support",
        title: "Suporte BlackBelt",
        phase: "support",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(agentMessages).values({
        id: nanoid(),
        conversationId: id,
        role: "assistant",
        content: "Nova conversa de suporte iniciada! Como posso ajudar?",
        createdAt: new Date(),
      });

      return { id };
    }),
});
