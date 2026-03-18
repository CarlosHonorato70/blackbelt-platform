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
        { role: "system" as const, content: contextMessage },
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
          assistantContent = "Desculpe, não consegui processar sua solicitação. Tente novamente.";
        }
      } catch (error) {
        log.error("Agent LLM error", { error: String(error) });
        assistantContent = "Ocorreu um erro ao processar sua mensagem. O serviço de IA pode estar temporariamente indisponível. Tente novamente em alguns instantes.";
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
