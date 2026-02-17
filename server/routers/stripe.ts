/**
 * STRIPE ROUTER - tRPC
 * 
 * Integração com Stripe para pagamentos e assinaturas
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { getPaymentGatewayConfig } from "../_core/paymentConfig";
import { subscriptions, plans, invoices } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import Stripe from "stripe";

/**
 * Inicializar cliente Stripe
 */
function getStripeClient(): Stripe | null {
  const config = getPaymentGatewayConfig();
  
  if (!config.stripe.enabled || !config.stripe.secretKey) {
    return null;
  }
  
  return new Stripe(config.stripe.secretKey, {
    apiVersion: "2024-11-20.acacia",
    typescript: true,
  });
}

export const stripeRouter = router({
  /**
   * Verificar se Stripe está habilitado
   */
  isEnabled: publicProcedure.query(() => {
    const config = getPaymentGatewayConfig();
    return {
      enabled: config.stripe.enabled,
      publicKey: config.stripe.publicKey,
    };
  }),

  /**
   * Criar sessão de checkout para nova assinatura
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planId: z.string(),
        billingCycle: z.enum(["monthly", "yearly"]),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new Error("Tenant não selecionado");
      }

      const stripe = getStripeClient();
      if (!stripe) {
        throw new Error("Stripe não está configurado");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar plano
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new Error("Plano não encontrado");
      }

      // Buscar tenant para pegar email
      const [tenant] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, ctx.tenantId))
        .limit(1);

      // Calcular preço
      const price =
        input.billingCycle === "monthly"
          ? plan.monthlyPrice
          : plan.yearlyPrice;

      // Criar ou buscar customer no Stripe
      let customerId: string | undefined;
      if (tenant?.stripeCustomerId) {
        customerId = tenant.stripeCustomerId;
      }

      // Criar sessão de checkout
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: !customerId ? ctx.user?.email : undefined,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: `Black Belt Platform - ${plan.displayName}`,
                description: plan.description || undefined,
              },
              unit_amount: price,
              recurring: {
                interval: input.billingCycle === "monthly" ? "month" : "year",
              },
            },
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: plan.trialDays,
          metadata: {
            tenantId: ctx.tenantId,
            planId: input.planId,
            billingCycle: input.billingCycle,
          },
        },
        metadata: {
          tenantId: ctx.tenantId,
          planId: input.planId,
          billingCycle: input.billingCycle,
        },
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),

  /**
   * Criar portal do cliente para gerenciar assinatura
   */
  createCustomerPortal: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new Error("Tenant não selecionado");
      }

      const stripe = getStripeClient();
      if (!stripe) {
        throw new Error("Stripe não está configurado");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar assinatura para pegar customer ID
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, ctx.tenantId))
        .limit(1);

      if (!subscription?.stripeCustomerId) {
        throw new Error("Cliente Stripe não encontrado");
      }

      // Criar portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: input.returnUrl,
      });

      return {
        url: session.url,
      };
    }),

  /**
   * Obter detalhes da assinatura no Stripe
   */
  getSubscriptionDetails: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) {
      throw new Error("Tenant não selecionado");
    }

    const stripe = getStripeClient();
    if (!stripe) {
      throw new Error("Stripe não está configurado");
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, ctx.tenantId))
      .limit(1);

    if (!subscription?.stripeSubscriptionId) {
      return null;
    }

    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      return {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        canceledAt: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : null,
      };
    } catch (error) {
      console.error("Error fetching Stripe subscription:", error);
      return null;
    }
  }),

  /**
   * Cancelar assinatura no Stripe
   */
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        immediately: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new Error("Tenant não selecionado");
      }

      const stripe = getStripeClient();
      if (!stripe) {
        throw new Error("Stripe não está configurado");
      }

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, ctx.tenantId))
        .limit(1);

      if (!subscription?.stripeSubscriptionId) {
        throw new Error("Assinatura Stripe não encontrada");
      }

      if (input.immediately) {
        // Cancelar imediatamente
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      } else {
        // Cancelar no final do período
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }

      return { success: true };
    }),

  /**
   * Reativar assinatura cancelada
   */
  reactivateSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.tenantId) {
      throw new Error("Tenant não selecionado");
    }

    const stripe = getStripeClient();
    if (!stripe) {
      throw new Error("Stripe não está configurado");
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, ctx.tenantId))
      .limit(1);

    if (!subscription?.stripeSubscriptionId) {
      throw new Error("Assinatura Stripe não encontrada");
    }

    // Reativar removendo cancel_at_period_end
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    return { success: true };
  }),

  /**
   * Listar métodos de pagamento do cliente
   */
  listPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.tenantId) {
      throw new Error("Tenant não selecionado");
    }

    const stripe = getStripeClient();
    if (!stripe) {
      throw new Error("Stripe não está configurado");
    }

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, ctx.tenantId))
      .limit(1);

    if (!subscription?.stripeCustomerId) {
      return [];
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscription.stripeCustomerId,
      type: "card",
    });

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }));
  }),
});

/**
 * Handler para webhooks do Stripe
 * Deve ser registrado como endpoint Express separado
 */
export async function handleStripeWebhook(
  body: string | Buffer,
  signature: string
): Promise<{ received: boolean; error?: string }> {
  const stripe = getStripeClient();
  if (!stripe) {
    return { received: false, error: "Stripe not configured" };
  }

  const config = getPaymentGatewayConfig();
  if (!config.stripe.webhookSecret) {
    return { received: false, error: "Webhook secret not configured" };
  }

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripe.webhookSecret
    );

    const db = await getDb();
    if (!db) {
      return { received: false, error: "Database not available" };
    }

    // Processar eventos
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const planId = session.metadata?.planId;

        if (!tenantId || !planId) break;

        // Atualizar assinatura com IDs do Stripe
        await db
          .update(subscriptions)
          .set({
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            status: "trialing",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.tenantId, tenantId));

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenantId;

        if (!tenantId) break;

        // Mapear status do Stripe para nosso status
        let status: "trialing" | "active" | "past_due" | "canceled" | "unpaid" =
          "active";
        if (subscription.status === "trialing") status = "trialing";
        else if (subscription.status === "past_due") status = "past_due";
        else if (subscription.status === "canceled") status = "canceled";
        else if (subscription.status === "unpaid") status = "unpaid";

        await db
          .update(subscriptions)
          .set({
            status,
            currentPeriodStart: new Date(
              subscription.current_period_start * 1000
            ),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at
              ? new Date(subscription.canceled_at * 1000)
              : null,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.tenantId, tenantId));

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId = subscription.metadata?.tenantId;

        if (!tenantId) break;

        await db
          .update(subscriptions)
          .set({
            status: "canceled",
            endedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.tenantId, tenantId));

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        // Buscar subscription local
        const [localSub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (!localSub) break;

        // Criar registro de fatura
        await db.insert(invoices).values({
          id: nanoid(),
          tenantId: localSub.tenantId,
          subscriptionId: localSub.id,
          stripeInvoiceId: invoice.id,
          subtotal: invoice.subtotal || 0,
          discount: invoice.discount?.coupon?.amount_off || 0,
          tax: invoice.tax || 0,
          total: invoice.total || 0,
          status: "paid",
          description: invoice.description || undefined,
          periodStart: new Date((invoice.lines.data[0]?.period.start || 0) * 1000),
          periodEnd: new Date((invoice.lines.data[0]?.period.end || 0) * 1000),
          paidAt: new Date(),
          paymentMethod: "card",
          invoiceUrl: invoice.hosted_invoice_url || undefined,
        });

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const [localSub] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, subscriptionId))
          .limit(1);

        if (!localSub) break;

        await db
          .update(subscriptions)
          .set({
            status: "past_due",
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, localSub.id));

        break;
      }
    }

    return { received: true };
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return {
      received: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
