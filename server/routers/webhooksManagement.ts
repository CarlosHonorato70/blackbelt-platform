/**
 * Phase 6: Webhooks Management Router
 * 
 * Gerenciamento de webhooks para integração com sistemas externos
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { webhooks, webhookDeliveries } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { deliverWebhook } from "../_core/webhookSystem";

/**
 * Enum de eventos webhook disponíveis
 */
const webhookEventEnum = z.enum([
  "assessment.created",
  "assessment.completed",
  "assessment.updated",
  "proposal.created",
  "proposal.sent",
  "proposal.accepted",
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
]);

/**
 * Router de webhooks
 */
export const webhooksRouter = router({
  /**
   * Listar webhooks do tenant
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const tenantWebhooks = await db.query.webhooks.findMany({
      where: eq(webhooks.tenantId, ctx.tenantId),
      orderBy: [desc(webhooks.createdAt)],
    });

    // Parse events JSON
    return tenantWebhooks.map((webhook) => ({
      ...webhook,
      events: JSON.parse(webhook.events as string) as string[],
    }));
  }),

  /**
   * Obter detalhes de um webhook
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const webhook = await db.query.webhooks.findFirst({
        where: and(eq(webhooks.id, input.id), eq(webhooks.tenantId, ctx.tenantId)),
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
      }

      return {
        ...webhook,
        events: JSON.parse(webhook.events as string) as string[],
        // Não retornar o secret completo por segurança
        secret: undefined,
      };
    }),

  /**
   * Criar novo webhook
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        url: z.string().url(),
        events: z.array(webhookEventEnum).min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Gerar secret aleatório
      const secret = crypto.randomBytes(32).toString("hex");
      const webhookId = nanoid();

      await db.insert(webhooks).values({
        id: webhookId,
        tenantId: ctx.tenantId,
        name: input.name,
        url: input.url,
        secret,
        events: JSON.stringify(input.events),
        active: true,
        description: input.description || null,
      });

      return {
        id: webhookId,
        secret, // Retornar secret apenas uma vez na criação
        message: "Webhook created successfully. Save the secret, it will not be shown again.",
      };
    }),

  /**
   * Atualizar webhook
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        url: z.string().url().optional(),
        events: z.array(webhookEventEnum).min(1).optional(),
        active: z.boolean().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const { id, ...updates } = input;

      // Verificar se webhook existe e pertence ao tenant
      const existing = await db.query.webhooks.findFirst({
        where: and(eq(webhooks.id, id), eq(webhooks.tenantId, ctx.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
      }

      await db
        .update(webhooks)
        .set({
          ...updates,
          events: updates.events ? JSON.stringify(updates.events) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(webhooks.id, id), eq(webhooks.tenantId, ctx.tenantId)));

      return { success: true };
    }),

  /**
   * Deletar webhook
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Verificar se webhook existe e pertence ao tenant
      const existing = await db.query.webhooks.findFirst({
        where: and(eq(webhooks.id, input.id), eq(webhooks.tenantId, ctx.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
      }

      await db
        .delete(webhooks)
        .where(and(eq(webhooks.id, input.id), eq(webhooks.tenantId, ctx.tenantId)));

      return { success: true };
    }),

  /**
   * Listar deliveries de um webhook
   */
  listDeliveries: protectedProcedure
    .input(
      z.object({
        webhookId: z.string(),
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Verificar se webhook pertence ao tenant
      const webhook = await db.query.webhooks.findFirst({
        where: and(
          eq(webhooks.id, input.webhookId),
          eq(webhooks.tenantId, ctx.tenantId)
        ),
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
      }

      const deliveries = await db.query.webhookDeliveries.findMany({
        where: eq(webhookDeliveries.webhookId, input.webhookId),
        limit: input.perPage,
        offset: (input.page - 1) * input.perPage,
        orderBy: [desc(webhookDeliveries.createdAt)],
      });

      return deliveries.map((delivery) => ({
        ...delivery,
        payload: JSON.parse(delivery.payload as string),
        responseHeaders: delivery.responseHeaders
          ? JSON.parse(delivery.responseHeaders as string)
          : null,
      }));
    }),

  /**
   * Retentar delivery manualmente
   */
  retryDelivery: protectedProcedure
    .input(z.object({ deliveryId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Buscar delivery e verificar permissão
      const delivery = await db.query.webhookDeliveries.findFirst({
        where: eq(webhookDeliveries.id, input.deliveryId),
      });

      if (!delivery) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Delivery not found" });
      }

      // Buscar webhook e verificar se pertence ao tenant
      const webhook = await db.query.webhooks.findFirst({
        where: and(
          eq(webhooks.id, delivery.webhookId),
          eq(webhooks.tenantId, ctx.tenantId)
        ),
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
      }

      // Reenviar webhook
      const payload = JSON.parse(delivery.payload as string);
      await deliverWebhook(
        input.deliveryId,
        webhook,
        delivery.eventType as any,
        payload
      );

      return { success: true, message: "Delivery retry initiated" };
    }),

  /**
   * Testar webhook com payload de exemplo
   */
  test: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Buscar webhook
      const webhook = await db.query.webhooks.findFirst({
        where: and(eq(webhooks.id, input.id), eq(webhooks.tenantId, ctx.tenantId)),
      });

      if (!webhook) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
      }

      // Criar delivery de teste
      const deliveryId = nanoid();
      const testPayload = {
        tenantId: ctx.tenantId,
        test: true,
        message: "This is a test webhook",
        timestamp: new Date().toISOString(),
      };

      await db.insert(webhookDeliveries).values({
        id: deliveryId,
        webhookId: webhook.id,
        eventType: "test.webhook",
        payload: JSON.stringify(testPayload),
        attempts: 0,
        maxAttempts: 1,
        success: false,
      });

      // Enviar webhook de teste
      await deliverWebhook(deliveryId, webhook, "test.webhook" as any, testPayload);

      return {
        success: true,
        deliveryId,
        message: "Test webhook sent. Check delivery logs for results.",
      };
    }),

  /**
   * Obter estatísticas de webhooks
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const tenantWebhooks = await db.query.webhooks.findMany({
      where: eq(webhooks.tenantId, ctx.tenantId),
    });

    let totalDeliveries = 0;
    let successfulDeliveries = 0;
    let failedDeliveries = 0;
    let pendingRetries = 0;

    for (const webhook of tenantWebhooks) {
      const deliveries = await db.query.webhookDeliveries.findMany({
        where: eq(webhookDeliveries.webhookId, webhook.id),
      });

      totalDeliveries += deliveries.length;
      successfulDeliveries += deliveries.filter((d) => d.success).length;
      failedDeliveries += deliveries.filter(
        (d) => !d.success && d.attempts >= d.maxAttempts
      ).length;
      pendingRetries += deliveries.filter(
        (d) => !d.success && d.attempts < d.maxAttempts && d.nextRetryAt
      ).length;
    }

    return {
      totalWebhooks: tenantWebhooks.length,
      activeWebhooks: tenantWebhooks.filter((w) => w.active).length,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      pendingRetries,
      successRate:
        totalDeliveries > 0
          ? ((successfulDeliveries / totalDeliveries) * 100).toFixed(2)
          : "0.00",
    };
  }),
});
