/**
 * ASAAS PAYMENT GATEWAY ROUTER
 *
 * Integração com Asaas para cobranças recorrentes e avulsas.
 * Suporta PIX, Boleto e Cartão de Crédito.
 * API Docs: https://docs.asaas.com
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { subscriptions, invoices, tenants } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { log } from "../_core/logger";

// ============================================
// ASAAS API HELPERS
// ============================================

const ASAAS_BASE_URL = process.env.ASAAS_SANDBOX === "true"
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/v3";

function getAsaasApiKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  return key;
}

async function asaasRequest(path: string, options: RequestInit = {}) {
  const url = `${ASAAS_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "access_token": getAsaasApiKey(),
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    const errorMsg = data?.errors?.map((e: any) => e.description).join(", ") || res.statusText;
    log.error(`[Asaas API] ${options.method || "GET"} ${path} → ${res.status}: ${errorMsg}`);
    throw new Error(`Asaas: ${errorMsg}`);
  }

  return data;
}

// ============================================
// tRPC ROUTER
// ============================================

export const asaasRouter = router({
  /**
   * Verificar se Asaas está habilitado
   */
  isEnabled: publicProcedure.query(() => {
    return {
      enabled: !!process.env.ASAAS_API_KEY,
      sandbox: process.env.ASAAS_SANDBOX === "true",
    };
  }),

  /**
   * Criar cliente no Asaas (se não existir) e iniciar assinatura
   */
  createSubscription: protectedProcedure
    .input(z.object({
      planId: z.string(),
      billingCycle: z.enum(["monthly", "yearly"]),
      billingType: z.enum(["PIX", "BOLETO", "CREDIT_CARD"]).default("PIX"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const tenantId = ctx.user!.tenantId;

      // 1. Buscar tenant para pegar CPF/CNPJ
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      if (!tenant) throw new Error("Tenant não encontrado");

      // 2. Buscar plano
      const { plans } = await import("../../drizzle/schema");
      const [plan] = await db.select().from(plans).where(eq(plans.id, input.planId));
      if (!plan) throw new Error("Plano não encontrado");

      // 3. Verificar se já existe assinatura
      const [existingSub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId));

      // 4. Criar ou buscar cliente no Asaas
      let asaasCustomerId = existingSub?.asaasCustomerId;

      if (!asaasCustomerId) {
        const customerData: any = {
          name: tenant.name || ctx.user!.name || "Cliente BlackBelt",
          cpfCnpj: (tenant.cnpj || "").replace(/[^\d]/g, ""),
          email: ctx.user!.email,
          externalReference: tenantId,
        };

        // Se não tem CNPJ válido, usar CPF do contato ou genérico
        if (!customerData.cpfCnpj || customerData.cpfCnpj.length < 11) {
          throw new Error("CPF ou CNPJ é obrigatório para criar assinatura no Asaas");
        }

        const customer = await asaasRequest("/customers", {
          method: "POST",
          body: JSON.stringify(customerData),
        });

        asaasCustomerId = customer.id;
        log.info(`[Asaas] Cliente criado: ${asaasCustomerId} para tenant ${tenantId}`);
      }

      // 5. Calcular valor
      const price = input.billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
      const value = price / 100; // centavos para reais

      // 6. Criar assinatura no Asaas
      const cycle = input.billingCycle === "monthly" ? "MONTHLY" : "YEARLY";
      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + 1); // Vence amanhã
      const dueDateStr = nextDueDate.toISOString().split("T")[0];

      const asaasSub = await asaasRequest("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: input.billingType,
          value,
          nextDueDate: dueDateStr,
          cycle,
          description: `BlackBelt - Plano ${plan.displayName} (${input.billingCycle === "monthly" ? "Mensal" : "Anual"})`,
          externalReference: tenantId,
        }),
      });

      log.info(`[Asaas] Assinatura criada: ${asaasSub.id} (${cycle}) para tenant ${tenantId}`);

      // 7. Salvar/atualizar assinatura no banco
      const now = new Date();
      const periodEnd = new Date(now);
      if (input.billingCycle === "monthly") {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      }

      const subData = {
        planId: input.planId,
        status: "pending" as const,
        billingCycle: input.billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        asaasSubscriptionId: asaasSub.id,
        asaasCustomerId: asaasCustomerId!,
        currentPrice: price,
        autoRenew: true,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      };

      if (existingSub) {
        await db.update(subscriptions)
          .set(subData)
          .where(eq(subscriptions.id, existingSub.id));
      } else {
        await db.insert(subscriptions).values({
          id: nanoid(),
          tenantId,
          startDate: now,
          ...subData,
        });
      }

      // 8. Retornar link de pagamento (primeira cobrança)
      // Buscar a cobrança gerada pela assinatura
      const payments = await asaasRequest(`/payments?subscription=${asaasSub.id}`);
      const firstPayment = payments?.data?.[0];

      let paymentUrl = null;
      let pixQrCode = null;
      let pixCopiaECola = null;
      let bankSlipUrl = null;

      if (firstPayment) {
        paymentUrl = firstPayment.invoiceUrl;
        bankSlipUrl = firstPayment.bankSlipUrl;

        // Se PIX, buscar QR code
        if (input.billingType === "PIX") {
          try {
            const pixData = await asaasRequest(`/payments/${firstPayment.id}/pixQrCode`);
            pixQrCode = pixData.encodedImage;
            pixCopiaECola = pixData.payload;
          } catch (e) {
            log.warn("[Asaas] Não foi possível obter QR code PIX");
          }
        }
      }

      return {
        subscriptionId: asaasSub.id,
        paymentUrl,
        pixQrCode,
        pixCopiaECola,
        bankSlipUrl,
        billingType: input.billingType,
        value,
        status: "pending",
      };
    }),

  /**
   * Criar cobrança avulsa (para serviços extras)
   */
  createPayment: protectedProcedure
    .input(z.object({
      description: z.string(),
      value: z.number().min(5), // mínimo R$ 5
      billingType: z.enum(["PIX", "BOLETO", "CREDIT_CARD"]).default("PIX"),
      dueDate: z.string().optional(), // YYYY-MM-DD
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const tenantId = ctx.user!.tenantId;

      // Buscar asaasCustomerId da assinatura existente
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId));
      if (!sub?.asaasCustomerId) {
        throw new Error("Cliente não encontrado no Asaas. Crie uma assinatura primeiro.");
      }

      const dueDate = input.dueDate || (() => {
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().split("T")[0];
      })();

      const payment = await asaasRequest("/payments", {
        method: "POST",
        body: JSON.stringify({
          customer: sub.asaasCustomerId,
          billingType: input.billingType,
          value: input.value,
          dueDate,
          description: input.description,
          externalReference: tenantId,
        }),
      });

      log.info(`[Asaas] Cobrança avulsa criada: ${payment.id} (R$ ${input.value}) para tenant ${tenantId}`);

      let pixQrCode = null;
      let pixCopiaECola = null;

      if (input.billingType === "PIX" && payment.id) {
        try {
          const pixData = await asaasRequest(`/payments/${payment.id}/pixQrCode`);
          pixQrCode = pixData.encodedImage;
          pixCopiaECola = pixData.payload;
        } catch (e) {
          log.warn("[Asaas] Não foi possível obter QR code PIX para cobrança avulsa");
        }
      }

      return {
        paymentId: payment.id,
        paymentUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        pixQrCode,
        pixCopiaECola,
        billingType: input.billingType,
        value: input.value,
        status: payment.status,
      };
    }),

  /**
   * Consultar status da assinatura no Asaas
   */
  getSubscriptionDetails: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const tenantId = ctx.user!.tenantId;

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId));
    if (!sub?.asaasSubscriptionId) return null;

    try {
      const asaasSub = await asaasRequest(`/subscriptions/${sub.asaasSubscriptionId}`);
      return {
        id: asaasSub.id,
        status: asaasSub.status,
        billingType: asaasSub.billingType,
        value: asaasSub.value,
        cycle: asaasSub.cycle,
        nextDueDate: asaasSub.nextDueDate,
        description: asaasSub.description,
      };
    } catch (e) {
      log.warn(`[Asaas] Não foi possível consultar assinatura ${sub.asaasSubscriptionId}`);
      return null;
    }
  }),

  /**
   * Cancelar assinatura no Asaas
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    const tenantId = ctx.user!.tenantId;

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId));
    if (!sub?.asaasSubscriptionId) throw new Error("Nenhuma assinatura Asaas encontrada");

    await asaasRequest(`/subscriptions/${sub.asaasSubscriptionId}`, {
      method: "DELETE",
    });

    await db.update(subscriptions)
      .set({
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, sub.id));

    log.info(`[Asaas] Assinatura cancelada: ${sub.asaasSubscriptionId} para tenant ${tenantId}`);

    return { success: true };
  }),

  /**
   * Listar pagamentos da assinatura
   */
  listPayments: protectedProcedure
    .input(z.object({ limit: z.number().default(10), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const tenantId = ctx.user!.tenantId;

      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId));
      if (!sub?.asaasCustomerId) return [];

      try {
        const result = await asaasRequest(
          `/payments?customer=${sub.asaasCustomerId}&limit=${input.limit}&offset=${input.offset}`
        );
        return result.data || [];
      } catch (e) {
        return [];
      }
    }),
});

// ============================================
// WEBHOOK HANDLER
// ============================================

export async function handleAsaasWebhook(body: any): Promise<{ received: boolean; error?: string }> {
  try {
    const event = body?.event;
    const payment = body?.payment;

    if (!event || !payment) {
      return { received: false, error: "Invalid webhook payload" };
    }

    log.info(`[Asaas Webhook] Evento: ${event}, Payment: ${payment.id}, Status: ${payment.status}`);

    const db = await getDb();

    // Encontrar assinatura pelo asaasSubscriptionId ou externalReference
    let sub = null;
    if (payment.subscription) {
      [sub] = await db.select().from(subscriptions)
        .where(eq(subscriptions.asaasSubscriptionId, payment.subscription));
    }

    if (!sub && payment.externalReference) {
      [sub] = await db.select().from(subscriptions)
        .where(eq(subscriptions.tenantId, payment.externalReference));
    }

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        if (sub) {
          // Ativar assinatura
          const now = new Date();
          const periodEnd = new Date(now);
          if (sub.billingCycle === "monthly") {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          } else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          }

          await db.update(subscriptions)
            .set({
              status: "active",
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
              updatedAt: now,
            })
            .where(eq(subscriptions.id, sub.id));

          // Criar registro de invoice
          await db.insert(invoices).values({
            id: nanoid(),
            tenantId: sub.tenantId,
            subscriptionId: sub.id,
            asaasPaymentId: payment.id,
            subtotal: Math.round((payment.value || 0) * 100),
            discount: 0,
            tax: 0,
            total: Math.round((payment.value || 0) * 100),
            status: "paid",
            description: payment.description || "Assinatura BlackBelt",
            periodStart: now,
            periodEnd: periodEnd,
            paidAt: now,
            paymentMethod: payment.billingType || "PIX",
            invoiceUrl: payment.invoiceUrl,
            createdAt: now,
            updatedAt: now,
          });

          log.info(`[Asaas Webhook] Assinatura ativada: ${sub.id} (tenant: ${sub.tenantId})`);
        }
        break;
      }

      case "PAYMENT_OVERDUE": {
        if (sub) {
          await db.update(subscriptions)
            .set({ status: "past_due", updatedAt: new Date() })
            .where(eq(subscriptions.id, sub.id));

          log.warn(`[Asaas Webhook] Pagamento em atraso: ${sub.id} (tenant: ${sub.tenantId})`);
        }
        break;
      }

      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED": {
        if (sub && payment.subscription) {
          // Criar invoice de reembolso
          await db.insert(invoices).values({
            id: nanoid(),
            tenantId: sub.tenantId,
            subscriptionId: sub.id,
            asaasPaymentId: payment.id,
            subtotal: Math.round((payment.value || 0) * 100),
            discount: 0,
            tax: 0,
            total: Math.round((payment.value || 0) * 100),
            status: event === "PAYMENT_REFUNDED" ? "void" : "uncollectible",
            description: `${event === "PAYMENT_REFUNDED" ? "Reembolso" : "Cancelamento"}: ${payment.description || ""}`,
            periodStart: new Date(),
            periodEnd: new Date(),
            paymentMethod: payment.billingType,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          log.info(`[Asaas Webhook] Pagamento ${event}: ${payment.id}`);
        }
        break;
      }

      case "PAYMENT_CREATED": {
        log.info(`[Asaas Webhook] Nova cobrança criada: ${payment.id} (subscription: ${payment.subscription || "avulsa"})`);
        break;
      }

      default:
        log.info(`[Asaas Webhook] Evento não tratado: ${event}`);
    }

    return { received: true };
  } catch (error) {
    log.error("[Asaas Webhook] Erro ao processar:", error);
    return { received: false, error: "Processing failed" };
  }
}
