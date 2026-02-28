/**
 * Phase 6: Webhook System Core
 * 
 * Sistema de webhooks com:
 * - Assinatura HMAC SHA-256
 * - Sistema de retry com backoff exponencial
 * - 9 tipos de eventos
 * - Timeout de 10 segundos
 */

import crypto from "crypto";
import { log } from "./logger";
import { getDb } from "../db";
import { webhooks, webhookDeliveries } from "../../drizzle/schema";
import { eq, and, lt } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Tipos de eventos webhook disponíveis
 */
export type WebhookEvent =
  | "assessment.created"
  | "assessment.completed"
  | "assessment.updated"
  | "proposal.created"
  | "proposal.sent"
  | "proposal.accepted"
  | "subscription.created"
  | "subscription.updated"
  | "subscription.canceled"
  | "invoice.paid";

/**
 * Interface do payload do webhook
 */
export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: number;
  tenantId: string;
  data: any;
}

/**
 * Trigger webhook para um evento específico
 * 
 * @param tenantId ID do tenant
 * @param event Tipo de evento
 * @param data Dados do evento
 */
export async function triggerWebhook(
  tenantId: string,
  event: WebhookEvent,
  data: any
): Promise<void> {
  const db = await getDb();
  if (!db) {
    log.error("Database unavailable for webhook trigger");
    return;
  }

  try {
    // Buscar webhooks ativos para este tenant
    const activeWebhooks = await db.query.webhooks.findMany({
      where: and(eq(webhooks.tenantId, tenantId), eq(webhooks.active, true)),
    });

    if (activeWebhooks.length === 0) {
      log.info("No active webhooks for tenant", { tenantId });
      return;
    }

    // Filtrar webhooks que estão inscritos neste evento
    const relevantWebhooks = activeWebhooks.filter((webhook) => {
      const events = JSON.parse(webhook.events as string) as string[];
      return events.includes(event);
    });

    if (relevantWebhooks.length === 0) {
      log.info("No webhooks subscribed to event for tenant", { event, tenantId });
      return;
    }

    // Criar deliveries para cada webhook
    for (const webhook of relevantWebhooks) {
      const deliveryId = nanoid();

      await db.insert(webhookDeliveries).values({
        id: deliveryId,
        webhookId: webhook.id,
        eventType: event,
        payload: JSON.stringify({ tenantId, ...data }),
        attempts: 0,
        maxAttempts: 5,
        success: false,
      });

      // Executar delivery de forma assíncrona (não bloquear)
      deliverWebhook(deliveryId, webhook, event, { tenantId, ...data }).catch(
        (error) => {
          log.error("Failed to deliver webhook", { deliveryId, error: error instanceof Error ? error.message : String(error) });
        }
      );
    }

    log.info("Triggered webhooks for event", { count: relevantWebhooks.length, event });
  } catch (error) {
    log.error("Error triggering webhooks", { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Entregar webhook via HTTP POST
 * 
 * @param deliveryId ID da delivery
 * @param webhook Configuração do webhook
 * @param event Tipo de evento
 * @param data Dados do evento
 */
export async function deliverWebhook(
  deliveryId: string,
  webhook: any,
  event: WebhookEvent,
  data: any
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const timestamp = Date.now();
  const payload: WebhookPayload = {
    event,
    timestamp,
    tenantId: data.tenantId,
    data,
  };

  // Gerar assinatura HMAC
  const signature = generateSignature(webhook.secret, timestamp, payload);

  try {
    // Fazer requisição HTTP
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Blackbelt-Event": event,
        "X-Blackbelt-Signature": signature,
        "X-Blackbelt-Delivery": deliveryId,
        "X-Blackbelt-Timestamp": timestamp.toString(),
        "User-Agent": "BlackBelt-Webhooks/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 segundos timeout
    });

    const responseBody = await response.text();

    // Atualizar delivery com sucesso
    await db
      .update(webhookDeliveries)
      .set({
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 5000), // Limitar tamanho
        responseHeaders: JSON.stringify(
          Object.fromEntries(response.headers.entries())
        ),
        deliveredAt: new Date(),
        attempts: 1,
        success: response.ok,
        lastError: response.ok ? null : `HTTP ${response.status}`,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    log.info("Webhook delivered successfully", { deliveryId, status: response.status });
  } catch (error: any) {
    log.error("Webhook delivery failed", { deliveryId, error: error.message });

    // Obter tentativa atual
    const delivery = await db.query.webhookDeliveries.findFirst({
      where: eq(webhookDeliveries.id, deliveryId),
    });

    if (!delivery) return;

    const attempts = delivery.attempts + 1;
    const shouldRetry = attempts < delivery.maxAttempts;

    // Calcular próximo retry com backoff exponencial
    // 1min, 5min, 15min, 1h, 4h
    const backoffMinutes = [1, 5, 15, 60, 240];
    const nextRetryMinutes = backoffMinutes[Math.min(attempts - 1, backoffMinutes.length - 1)];
    const nextRetryAt = shouldRetry
      ? new Date(Date.now() + nextRetryMinutes * 60 * 1000)
      : null;

    await db
      .update(webhookDeliveries)
      .set({
        responseStatus: 0,
        responseBody: null,
        attempts,
        lastError: error.message,
        nextRetryAt,
        success: false,
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    if (shouldRetry) {
      log.info("Webhook will retry", { deliveryId, retryInMinutes: nextRetryMinutes });
    } else {
      log.warn("Webhook max retries reached", { deliveryId });
    }
  }
}

/**
 * Gerar assinatura HMAC SHA-256
 * 
 * @param secret Segredo do webhook
 * @param timestamp Timestamp da requisição
 * @param payload Payload do webhook
 * @returns Assinatura hex
 */
export function generateSignature(
  secret: string,
  timestamp: number,
  payload: any
): string {
  const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
  return crypto
    .createHmac("sha256", secret)
    .update(signaturePayload)
    .digest("hex");
}

/**
 * Verificar assinatura de webhook (para receivers)
 * 
 * @param secret Segredo do webhook
 * @param timestamp Timestamp da requisição
 * @param payload Payload recebido
 * @param signature Assinatura recebida
 * @returns True se assinatura válida
 */
export function verifyWebhookSignature(
  secret: string,
  timestamp: number,
  payload: any,
  signature: string
): boolean {
  try {
    const expectedSignature = generateSignature(secret, timestamp, payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch (error) {
    log.error("Error verifying webhook signature", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Processar retries pendentes (executar via cron job)
 */
export async function processWebhookRetries(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    // Buscar deliveries que precisam de retry
    const pendingRetries = await db.query.webhookDeliveries.findMany({
      where: and(
        eq(webhookDeliveries.success, false),
        lt(webhookDeliveries.nextRetryAt, new Date())
      ),
      limit: 100,
      with: {
        webhook: true,
      },
    });

    log.info("Processing pending webhook retries", { count: pendingRetries.length });

    for (const delivery of pendingRetries) {
      if (!delivery.webhook) continue;

      const payload = JSON.parse(delivery.payload as string);
      await deliverWebhook(
        delivery.id,
        delivery.webhook,
        delivery.eventType as WebhookEvent,
        payload
      );
    }
  } catch (error) {
    log.error("Error processing webhook retries", { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Obter estatísticas de webhooks para um tenant
 */
export async function getWebhookStats(tenantId: string) {
  const db = await getDb();
  if (!db) return null;

  try {
    const tenantWebhooks = await db.query.webhooks.findMany({
      where: eq(webhooks.tenantId, tenantId),
      with: {
        deliveries: {
          limit: 100,
          orderBy: (deliveries, { desc }) => [desc(deliveries.createdAt)],
        },
      },
    });

    const stats = {
      totalWebhooks: tenantWebhooks.length,
      activeWebhooks: tenantWebhooks.filter((w) => w.active).length,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      pendingRetries: 0,
    };

    for (const webhook of tenantWebhooks) {
      const deliveries = webhook.deliveries || [];
      stats.totalDeliveries += deliveries.length;
      stats.successfulDeliveries += deliveries.filter((d) => d.success).length;
      stats.failedDeliveries += deliveries.filter(
        (d) => !d.success && d.attempts >= d.maxAttempts
      ).length;
      stats.pendingRetries += deliveries.filter(
        (d) => !d.success && d.attempts < d.maxAttempts
      ).length;
    }

    return stats;
  } catch (error) {
    log.error("Error getting webhook stats", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
