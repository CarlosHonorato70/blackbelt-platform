/**
 * PAYMENT GATEWAY CONFIGURATION
 * 
 * Configuração para integração com gateways de pagamento
 * Suporta: Stripe (internacional) e Mercado Pago (Brasil)
 */

export interface PaymentGatewayConfig {
  stripe: {
    enabled: boolean;
    publicKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  mercadoPago: {
    enabled: boolean;
    publicKey: string;
    accessToken: string;
    webhookSecret: string;
  };
}

/**
 * Carregar configuração dos gateways de pagamento
 */
export function getPaymentGatewayConfig(): PaymentGatewayConfig {
  return {
    stripe: {
      enabled: process.env.STRIPE_ENABLED === "true",
      publicKey: process.env.STRIPE_PUBLIC_KEY || "",
      secretKey: process.env.STRIPE_SECRET_KEY || "",
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
    },
    mercadoPago: {
      enabled: process.env.MERCADO_PAGO_ENABLED === "true",
      publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || "",
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
      webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || "",
    },
  };
}

/**
 * Tipo de evento de webhook
 */
export type WebhookEvent =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.deleted"
  | "invoice.created"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "customer.created"
  | "customer.updated"
  | "payment_method.attached"
  | "payment_method.detached";

/**
 * Interface para eventos de webhook
 */
export interface WebhookPayload {
  event: WebhookEvent;
  provider: "stripe" | "mercado_pago";
  data: any;
  timestamp: Date;
}

/**
 * Validar se os gateways estão configurados
 */
export function validatePaymentConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const config = getPaymentGatewayConfig();
  const errors: string[] = [];

  if (!config.stripe.enabled && !config.mercadoPago.enabled) {
    errors.push("Nenhum gateway de pagamento está habilitado");
  }

  if (config.stripe.enabled) {
    if (!config.stripe.secretKey) {
      errors.push("Stripe: STRIPE_SECRET_KEY não configurada");
    }
    if (!config.stripe.publicKey) {
      errors.push("Stripe: STRIPE_PUBLIC_KEY não configurada");
    }
  }

  if (config.mercadoPago.enabled) {
    if (!config.mercadoPago.accessToken) {
      errors.push("Mercado Pago: MERCADO_PAGO_ACCESS_TOKEN não configurado");
    }
    if (!config.mercadoPago.publicKey) {
      errors.push("Mercado Pago: MERCADO_PAGO_PUBLIC_KEY não configurada");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Obter gateway preferencial baseado no país/região
 */
export function getPreferredGateway(
  country?: string
): "stripe" | "mercado_pago" | null {
  const config = getPaymentGatewayConfig();

  // Se apenas um gateway estiver habilitado, retornar ele
  if (config.stripe.enabled && !config.mercadoPago.enabled) {
    return "stripe";
  }
  if (config.mercadoPago.enabled && !config.stripe.enabled) {
    return "mercado_pago";
  }

  // Se ambos estiverem habilitados, escolher baseado no país
  if (config.stripe.enabled && config.mercadoPago.enabled) {
    // Mercado Pago para países da América Latina
    const mercadoPagoCountries = [
      "BR",
      "AR",
      "CL",
      "CO",
      "MX",
      "PE",
      "UY",
      "VE",
    ];
    if (country && mercadoPagoCountries.includes(country.toUpperCase())) {
      return "mercado_pago";
    }

    // Stripe para demais países
    return "stripe";
  }

  return null;
}

/**
 * Formatar preço para exibição (centavos para reais)
 */
export function formatPrice(
  priceInCents: number,
  currency: string = "BRL"
): string {
  const value = priceInCents / 100;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(value);
}

/**
 * Calcular desconto anual (17%)
 */
export function calculateYearlyDiscount(monthlyPrice: number): number {
  const yearlyBeforeDiscount = monthlyPrice * 12;
  const discount = 0.17; // 17%
  return Math.round(yearlyBeforeDiscount * (1 - discount));
}

/**
 * Gerar description de plano para o gateway de pagamento
 */
export function generatePlanDescription(
  planName: string,
  billingCycle: "monthly" | "yearly"
): string {
  const cycle = billingCycle === "monthly" ? "Mensal" : "Anual";
  return `Black Belt Platform - Plano ${planName} (${cycle})`;
}
