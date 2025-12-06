/**
 * SUBSCRIPTION MIDDLEWARE
 * 
 * Middleware para verificar limites de uso baseados no plano de assinatura
 */

import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { subscriptions, plans, usageMetrics } from "../../drizzle/schema";
import { eq, and, gte, desc } from "drizzle-orm";

export interface SubscriptionLimits {
  maxTenants: number;
  maxUsersPerTenant: number;
  maxStorageGB: number;
  maxApiRequestsPerDay: number;
  hasAdvancedReports: boolean;
  hasApiAccess: boolean;
  hasWebhooks: boolean;
  hasWhiteLabel: boolean;
  hasPrioritySupport: boolean;
  hasSLA: boolean;
}

export interface SubscriptionContext {
  tenantId: string;
  subscription: {
    id: string;
    status: string;
    planId: string;
    trialEnd: Date | null;
  };
  plan: SubscriptionLimits & {
    name: string;
    displayName: string;
  };
  isTrialing: boolean;
  isActive: boolean;
}

/**
 * Buscar contexto de assinatura do tenant
 */
export async function getSubscriptionContext(
  tenantId: string
): Promise<SubscriptionContext | null> {
  const [result] = await db
    .select({
      subscription: subscriptions,
      plan: plans,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.tenantId, tenantId))
    .limit(1);

  if (!result) {
    return null;
  }

  const { subscription, plan } = result;

  return {
    tenantId,
    subscription: {
      id: subscription.id,
      status: subscription.status,
      planId: subscription.planId,
      trialEnd: subscription.trialEnd,
    },
    plan: {
      name: plan.name,
      displayName: plan.displayName,
      maxTenants: plan.maxTenants,
      maxUsersPerTenant: plan.maxUsersPerTenant,
      maxStorageGB: plan.maxStorageGB,
      maxApiRequestsPerDay: plan.maxApiRequestsPerDay,
      hasAdvancedReports: plan.hasAdvancedReports,
      hasApiAccess: plan.hasApiAccess,
      hasWebhooks: plan.hasWebhooks,
      hasWhiteLabel: plan.hasWhiteLabel,
      hasPrioritySupport: plan.hasPrioritySupport,
      hasSLA: plan.hasSLA,
    },
    isTrialing: subscription.status === "trialing",
    isActive:
      subscription.status === "active" || subscription.status === "trialing",
  };
}

/**
 * Verificar se o tenant está dentro dos limites do plano
 */
export async function checkSubscriptionLimits(
  tenantId: string,
  limitType: "users" | "storage" | "apiRequests"
): Promise<{
  withinLimit: boolean;
  current: number;
  max: number;
  message?: string;
}> {
  const context = await getSubscriptionContext(tenantId);

  if (!context) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Nenhuma assinatura ativa encontrada",
    });
  }

  if (!context.isActive) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Assinatura inativa. Por favor, renove sua assinatura.",
    });
  }

  // Buscar métricas de uso atuais
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(1); // Primeiro dia do mês
  periodStart.setHours(0, 0, 0, 0);

  const [usage] = await db
    .select()
    .from(usageMetrics)
    .where(
      and(
        eq(usageMetrics.tenantId, tenantId),
        gte(usageMetrics.periodStart, periodStart)
      )
    )
    .orderBy(desc(usageMetrics.createdAt))
    .limit(1);

  let current = 0;
  let max = 0;
  let withinLimit = true;

  switch (limitType) {
    case "users":
      current = usage?.activeUsers || 0;
      max = context.plan.maxUsersPerTenant;
      withinLimit = max === -1 || current < max; // Permitir adicionar até o limite
      break;

    case "storage":
      current = usage?.storageUsedGB || 0;
      max = context.plan.maxStorageGB * 100; // Converter para centavos
      withinLimit = max === -1 || current < max;
      break;

    case "apiRequests":
      current = usage?.apiRequests || 0;
      max = context.plan.maxApiRequestsPerDay;
      withinLimit = max === -1 || current < max;
      break;
  }

  return {
    withinLimit,
    current,
    max,
    message: withinLimit
      ? undefined
      : `Limite de ${limitType} excedido. Faça upgrade do seu plano para continuar.`,
  };
}

/**
 * Verificar se uma feature está disponível no plano
 */
export async function checkFeatureAccess(
  tenantId: string,
  feature:
    | "advancedReports"
    | "apiAccess"
    | "webhooks"
    | "whiteLabel"
    | "prioritySupport"
    | "sla"
): Promise<boolean> {
  const context = await getSubscriptionContext(tenantId);

  if (!context || !context.isActive) {
    return false;
  }

  const featureMap = {
    advancedReports: context.plan.hasAdvancedReports,
    apiAccess: context.plan.hasApiAccess,
    webhooks: context.plan.hasWebhooks,
    whiteLabel: context.plan.hasWhiteLabel,
    prioritySupport: context.plan.hasPrioritySupport,
    sla: context.plan.hasSLA,
  };

  return featureMap[feature] || false;
}

/**
 * Middleware tRPC para verificar limites antes de executar operações
 */
export function withSubscriptionCheck(
  limitType: "users" | "storage" | "apiRequests"
) {
  return async (tenantId: string) => {
    const result = await checkSubscriptionLimits(tenantId, limitType);

    if (!result.withinLimit) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          result.message ||
          "Limite excedido. Faça upgrade do seu plano para continuar.",
      });
    }

    return result;
  };
}

/**
 * Middleware tRPC para verificar acesso a features
 */
export function withFeatureCheck(
  feature:
    | "advancedReports"
    | "apiAccess"
    | "webhooks"
    | "whiteLabel"
    | "prioritySupport"
    | "sla"
) {
  return async (tenantId: string) => {
    const hasAccess = await checkFeatureAccess(tenantId, feature);

    if (!hasAccess) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Esta funcionalidade não está disponível no seu plano atual. Faça upgrade para ter acesso.`,
      });
    }

    return true;
  };
}

/**
 * Helper para verificar se a assinatura está ativa
 */
export async function requireActiveSubscription(
  tenantId: string
): Promise<SubscriptionContext> {
  const context = await getSubscriptionContext(tenantId);

  if (!context) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Nenhuma assinatura encontrada. Por favor, assine um plano para continuar.",
    });
  }

  if (!context.isActive) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Sua assinatura está inativa. Por favor, renove sua assinatura para continuar.",
    });
  }

  // Verificar se o trial expirou
  if (
    context.isTrialing &&
    context.subscription.trialEnd &&
    new Date() > context.subscription.trialEnd
  ) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Seu período de teste expirou. Por favor, adicione um método de pagamento para continuar.",
    });
  }

  return context;
}
