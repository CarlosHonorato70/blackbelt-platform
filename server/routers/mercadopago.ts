/**
 * MERCADO PAGO ROUTER - tRPC
 *
 * Integração com Mercado Pago para pagamentos e assinaturas (Brasil e LATAM)
 * SDK v2 (mercadopago@2.x)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { MercadoPagoConfig, Preference, Payment, PreApproval } from "mercadopago";
import { log } from "../_core/logger";
import { publicProcedure, tenantProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { getPaymentGatewayConfig } from "../_core/paymentConfig";
import { subscriptions, plans, invoices } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Obter cliente Mercado Pago configurado (SDK v2)
 */
function getMercadoPagoClient(): MercadoPagoConfig | null {
  const config = getPaymentGatewayConfig();

  if (!config.mercadoPago.enabled || !config.mercadoPago.accessToken) {
    return null;
  }

  return new MercadoPagoConfig({
    accessToken: config.mercadoPago.accessToken,
  });
}

export const mercadoPagoRouter = router({
  /**
   * Verificar se Mercado Pago está habilitado
   */
  isEnabled: publicProcedure.query(() => {
    const config = getPaymentGatewayConfig();
    return {
      enabled: config.mercadoPago.enabled,
      publicKey: config.mercadoPago.publicKey,
    };
  }),

  /**
   * Criar preferência de pagamento para assinatura
   */
  createPreference: tenantProcedure
    .input(
      z.object({
        planId: z.string(),
        billingCycle: z.enum(["monthly", "yearly"]),
        successUrl: z.string().url(),
        failureUrl: z.string().url(),
        pendingUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const client = getMercadoPagoClient();
      if (!client) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Mercado Pago não está configurado" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Buscar plano
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plano não encontrado" });
      }

      // Calcular preço (Mercado Pago usa valores decimais, não centavos)
      const price =
        input.billingCycle === "monthly"
          ? plan.monthlyPrice / 100
          : plan.yearlyPrice / 100;

      // Criar preferência via SDK v2
      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: [
            {
              id: input.planId,
              title: `Black Belt Platform - ${plan.displayName}`,
              description: plan.description ?? undefined,
              quantity: 1,
              unit_price: price,
              currency_id: "BRL",
            },
          ],
          payer: {
            email: ctx.user?.email || undefined,
          },
          back_urls: {
            success: input.successUrl,
            failure: input.failureUrl,
            pending: input.pendingUrl,
          },
          auto_return: "approved",
          external_reference: ctx.tenantId,
          metadata: {
            tenant_id: ctx.tenantId,
            plan_id: input.planId,
            billing_cycle: input.billingCycle,
          },
          notification_url: process.env.MERCADO_PAGO_WEBHOOK_URL,
        },
      });

      return {
        preferenceId: result.id,
        initPoint: result.init_point,
        sandboxInitPoint: result.sandbox_init_point,
      };
    }),

  /**
   * Criar assinatura recorrente (preapproval)
   */
  createSubscriptionPlan: tenantProcedure
    .input(
      z.object({
        planId: z.string(),
        billingCycle: z.enum(["monthly", "yearly"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const client = getMercadoPagoClient();
      if (!client) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Mercado Pago não está configurado" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Buscar plano
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plano não encontrado" });
      }

      // Calcular preço
      const price =
        input.billingCycle === "monthly"
          ? plan.monthlyPrice / 100
          : plan.yearlyPrice / 100;

      // Criar assinatura recorrente via SDK v2 (PreApproval)
      // Calcular start_date com trial period
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + (plan.trialDays || 0));

      const preApproval = new PreApproval(client);
      const result = await preApproval.create({
        body: {
          auto_recurring: {
            frequency: input.billingCycle === "monthly" ? 1 : 12,
            frequency_type: "months",
            transaction_amount: price,
            currency_id: "BRL",
            start_date: plan.trialDays > 0 ? startDate.toISOString() : undefined,
          },
          back_url: `${process.env.VITE_FRONTEND_URL}/subscription/success`,
          external_reference: ctx.tenantId,
          payer_email: ctx.user?.email || undefined,
          reason: `Black Belt Platform - ${plan.displayName}`,
        },
      });

      return {
        planId: result.id,
        initPoint: result.init_point,
      };
    }),

  /**
   * Obter detalhes do pagamento
   */
  getPaymentDetails: protectedProcedure
    .input(
      z.object({
        paymentId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const client = getMercadoPagoClient();
      if (!client) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Mercado Pago não está configurado" });
      }

      try {
        const payment = new Payment(client);
        const result = await payment.get({ id: input.paymentId });

        return {
          id: result.id,
          status: result.status,
          statusDetail: result.status_detail,
          transactionAmount: result.transaction_amount,
          currencyId: result.currency_id,
          dateCreated: result.date_created,
          dateApproved: result.date_approved,
        };
      } catch (error) {
        log.error("Error fetching Mercado Pago payment", { error: error instanceof Error ? error.message : String(error) });
        return null;
      }
    }),

  /**
   * Cancelar assinatura
   */
  cancelSubscription: tenantProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const client = getMercadoPagoClient();
      if (!client) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Mercado Pago não está configurado" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Cancelar assinatura no Mercado Pago via SDK v2
      const preApproval = new PreApproval(client);
      await preApproval.update({
        id: input.subscriptionId,
        body: {
          status: "cancelled",
        },
      });

      // Atualizar localmente
      await db
        .update(subscriptions)
        .set({
          status: "canceled",
          canceledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          eq(subscriptions.mercadoPagoSubscriptionId, input.subscriptionId)
        );

      return { success: true };
    }),
});

/**
 * Handler para webhooks do Mercado Pago
 * Deve ser registrado como endpoint Express separado
 */
export async function handleMercadoPagoWebhook(
  body: any
): Promise<{ received: boolean; error?: string }> {
  const client = getMercadoPagoClient();
  if (!client) {
    return { received: false, error: "Mercado Pago not configured" };
  }

  try {
    const db = await getDb();
    if (!db) {
      return { received: false, error: "Database not available" };
    }

    // Mercado Pago envia notificações de diferentes tipos
    const { type, data } = body;

    if (type === "payment") {
      // Processar pagamento via SDK v2
      const paymentClient = new Payment(client);
      const paymentData = await paymentClient.get({ id: data.id });

      const tenantId = paymentData.external_reference;
      if (!tenantId) {
        return { received: true }; // Ignorar se não tiver tenant
      }

      // Buscar subscription local
      const [localSub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId))
        .limit(1);

      if (!localSub) {
        return { received: true };
      }

      if (paymentData.status === "approved") {
        // Pagamento aprovado - criar fatura
        await db.insert(invoices).values({
          id: nanoid(),
          tenantId: localSub.tenantId,
          subscriptionId: localSub.id,
          mercadoPagoInvoiceId: String(paymentData.id),
          subtotal: Math.round((paymentData.transaction_amount || 0) * 100),
          discount: 0,
          tax: 0,
          total: Math.round((paymentData.transaction_amount || 0) * 100),
          status: "paid",
          description: paymentData.description ?? undefined,
          periodStart: new Date(),
          periodEnd: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ), // +30 dias
          paidAt: paymentData.date_approved ? new Date(paymentData.date_approved) : new Date(),
          paymentMethod: paymentData.payment_type_id || "unknown",
        });

        // Atualizar status da assinatura
        await db
          .update(subscriptions)
          .set({
            status: "active",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, localSub.id));
      } else if (
        paymentData.status === "rejected" ||
        paymentData.status === "cancelled"
      ) {
        // Pagamento falhou
        await db
          .update(subscriptions)
          .set({
            status: "unpaid",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, localSub.id));
      }
    } else if (type === "subscription_preapproval") {
      // Processar mudanças na assinatura via SDK v2
      const preApprovalClient = new PreApproval(client);
      const subData = await preApprovalClient.get({ id: data.id });

      const tenantId = subData.external_reference;
      if (!tenantId) {
        return { received: true };
      }

      // Mapear status
      let status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" =
        "active";
      if (subData.status === "cancelled") status = "canceled";
      else if (subData.status === "paused") status = "past_due";

      await db
        .update(subscriptions)
        .set({
          mercadoPagoSubscriptionId: subData.id,
          status,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.tenantId, tenantId));
    }

    return { received: true };
  } catch (error) {
    log.error("Mercado Pago webhook error", { error: error instanceof Error ? error.message : String(error) });
    return {
      received: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
