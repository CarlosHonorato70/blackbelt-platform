/**
 * PAYMENT GATEWAY CONFIGURATION
 *
 * Configuração para integração com gateway de pagamento Asaas
 */

export interface PaymentGatewayConfig {
  asaas: {
    enabled: boolean;
    apiKey: string;
    webhookToken: string;
    sandbox: boolean;
  };
}

/**
 * Carregar configuração do gateway de pagamento
 */
export function getPaymentGatewayConfig(): PaymentGatewayConfig {
  return {
    asaas: {
      enabled: !!process.env.ASAAS_API_KEY,
      apiKey: process.env.ASAAS_API_KEY || "",
      webhookToken: process.env.ASAAS_WEBHOOK_TOKEN || "",
      sandbox: process.env.ASAAS_SANDBOX === "true",
    },
  };
}

/**
 * Tipo de evento de webhook
 */
export type WebhookEvent =
  | "PAYMENT_CREATED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_OVERDUE"
  | "PAYMENT_DELETED"
  | "PAYMENT_REFUNDED"
  | "PAYMENT_UPDATED";

/**
 * Interface para eventos de webhook
 */
export interface WebhookPayload {
  event: WebhookEvent;
  provider: "asaas";
  data: any;
  timestamp: Date;
}

/**
 * Validar se o gateway está configurado
 */
export function validatePaymentConfig(): {
  isValid: boolean;
  errors: string[];
} {
  const config = getPaymentGatewayConfig();
  const errors: string[] = [];

  if (!config.asaas.enabled) {
    errors.push("Asaas: ASAAS_API_KEY não configurada");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
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
