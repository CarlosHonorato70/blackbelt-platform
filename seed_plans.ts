/**
 * SEED DATA - Planos e Features
 * 
 * Script para popular o banco de dados com planos iniciais e features.
 * Execute após as migrations: pnpm tsx seed_plans.ts
 */

import { nanoid } from "nanoid";

// ============================================================================
// PLANOS
// ============================================================================

export const seedPlans = [
  {
    id: nanoid(),
    name: "starter",
    displayName: "Starter",
    description:
      "Ideal para pequenas empresas e consultores independentes. Funcionalidades essenciais para começar.",
    monthlyPrice: 9900, // R$ 99,00
    yearlyPrice: 99000, // R$ 990,00 (17% desconto)
    maxTenants: 1,
    maxUsersPerTenant: 5,
    maxStorageGB: 1,
    maxApiRequestsPerDay: 1000,
    hasAdvancedReports: false,
    hasApiAccess: false,
    hasWebhooks: false,
    hasWhiteLabel: false,
    hasPrioritySupport: false,
    hasSLA: false,
    slaUptime: null,
    trialDays: 14,
    isActive: true,
    isPublic: true,
    sortOrder: 1,
  },
  {
    id: nanoid(),
    name: "pro",
    displayName: "Pro",
    description:
      "Para empresas médias e consultorias. Inclui relatórios avançados, API e suporte prioritário.",
    monthlyPrice: 39900, // R$ 399,00
    yearlyPrice: 399000, // R$ 3.990,00 (17% desconto)
    maxTenants: 10,
    maxUsersPerTenant: 50,
    maxStorageGB: 10,
    maxApiRequestsPerDay: 10000,
    hasAdvancedReports: true,
    hasApiAccess: true,
    hasWebhooks: false,
    hasWhiteLabel: false,
    hasPrioritySupport: true,
    hasSLA: true,
    slaUptime: 990, // 99.0%
    trialDays: 14,
    isActive: true,
    isPublic: true,
    sortOrder: 2,
  },
  {
    id: nanoid(),
    name: "enterprise",
    displayName: "Enterprise",
    description:
      "Para grandes corporações. Recursos ilimitados, white-label, webhooks e SLA garantido.",
    monthlyPrice: 0, // Customizado
    yearlyPrice: 0, // Customizado
    maxTenants: -1, // Ilimitado
    maxUsersPerTenant: -1, // Ilimitado
    maxStorageGB: -1, // Ilimitado
    maxApiRequestsPerDay: -1, // Ilimitado
    hasAdvancedReports: true,
    hasApiAccess: true,
    hasWebhooks: true,
    hasWhiteLabel: true,
    hasPrioritySupport: true,
    hasSLA: true,
    slaUptime: 999, // 99.9%
    trialDays: 30,
    isActive: true,
    isPublic: true,
    sortOrder: 3,
  },
];

// ============================================================================
// FEATURES
// ============================================================================

export const seedFeatures = [
  // Core Features
  {
    id: nanoid(),
    name: "risk_assessments",
    displayName: "Avaliações de Risco NR-01",
    description: "Gestão completa de avaliações de riscos psicossociais",
    category: "core" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "pricing_system",
    displayName: "Sistema de Precificação",
    description: "Cálculo automático de propostas comerciais",
    category: "core" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "multi_tenant",
    displayName: "Multi-tenant",
    description: "Gestão de múltiplas empresas com isolamento de dados",
    category: "core" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "user_management",
    displayName: "Gestão de Usuários",
    description: "Controle de acesso e permissões (RBAC/ABAC)",
    category: "core" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "audit_logs",
    displayName: "Auditoria Completa",
    description: "Rastreamento de todas as ações no sistema",
    category: "core" as const,
    isActive: true,
  },

  // Reports
  {
    id: nanoid(),
    name: "basic_reports",
    displayName: "Relatórios Básicos",
    description: "Relatórios padrão de compliance e gestão",
    category: "reports" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "advanced_reports",
    displayName: "Relatórios Avançados",
    description: "Relatórios customizados e analytics avançado",
    category: "reports" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "pdf_export",
    displayName: "Exportação PDF",
    description: "Exportação de propostas e relatórios em PDF",
    category: "reports" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "excel_export",
    displayName: "Exportação Excel",
    description: "Exportação de dados para planilhas Excel",
    category: "reports" as const,
    isActive: true,
  },

  // Integrations
  {
    id: nanoid(),
    name: "rest_api",
    displayName: "API REST",
    description: "API pública para integrações customizadas",
    category: "integrations" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "webhooks",
    displayName: "Webhooks",
    description: "Notificações em tempo real para eventos do sistema",
    category: "integrations" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "crm_integration",
    displayName: "Integração CRM",
    description: "Integração com Pipedrive, HubSpot e outros CRMs",
    category: "integrations" as const,
    isActive: false, // Em desenvolvimento
  },
  {
    id: nanoid(),
    name: "erp_integration",
    displayName: "Integração ERP",
    description: "Integração com sistemas ERP empresariais",
    category: "integrations" as const,
    isActive: false, // Em desenvolvimento
  },

  // Customization
  {
    id: nanoid(),
    name: "white_label",
    displayName: "White-label",
    description: "Personalização completa com sua marca",
    category: "customization" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "custom_domain",
    displayName: "Domínio Personalizado",
    description: "Use seu próprio domínio (ex: gestao.suaempresa.com)",
    category: "customization" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "custom_branding",
    displayName: "Branding Personalizado",
    description: "Logo, cores e tema customizados",
    category: "customization" as const,
    isActive: true,
  },

  // Support
  {
    id: nanoid(),
    name: "email_support",
    displayName: "Suporte por Email",
    description: "Suporte técnico via email",
    category: "support" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "chat_support",
    displayName: "Suporte por Chat",
    description: "Suporte em tempo real via chat",
    category: "support" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "priority_support",
    displayName: "Suporte Prioritário",
    description: "Atendimento prioritário com SLA reduzido",
    category: "support" as const,
    isActive: true,
  },
  {
    id: nanoid(),
    name: "dedicated_support",
    displayName: "Suporte Dedicado",
    description: "Gerente de conta dedicado 24/7",
    category: "support" as const,
    isActive: true,
  },
];

// ============================================================================
// ASSOCIAÇÃO PLAN-FEATURES
// ============================================================================

export const getPlanFeatureAssociations = (
  plans: typeof seedPlans,
  features: typeof seedFeatures
) => {
  const starterPlan = plans.find((p) => p.name === "starter");
  const proPlan = plans.find((p) => p.name === "pro");
  const enterprisePlan = plans.find((p) => p.name === "enterprise");

  if (!starterPlan || !proPlan || !enterprisePlan) {
    throw new Error("Plans not found");
  }

  // Features por nome para fácil referência
  const featureMap = Object.fromEntries(
    features.map((f) => [f.name, f.id])
  );

  return [
    // STARTER - Features básicas
    { planId: starterPlan.id, featureId: featureMap.risk_assessments },
    { planId: starterPlan.id, featureId: featureMap.pricing_system },
    { planId: starterPlan.id, featureId: featureMap.multi_tenant },
    { planId: starterPlan.id, featureId: featureMap.user_management },
    { planId: starterPlan.id, featureId: featureMap.audit_logs },
    { planId: starterPlan.id, featureId: featureMap.basic_reports },
    { planId: starterPlan.id, featureId: featureMap.pdf_export },
    { planId: starterPlan.id, featureId: featureMap.excel_export },
    { planId: starterPlan.id, featureId: featureMap.email_support },

    // PRO - Todas do Starter + Avançadas
    { planId: proPlan.id, featureId: featureMap.risk_assessments },
    { planId: proPlan.id, featureId: featureMap.pricing_system },
    { planId: proPlan.id, featureId: featureMap.multi_tenant },
    { planId: proPlan.id, featureId: featureMap.user_management },
    { planId: proPlan.id, featureId: featureMap.audit_logs },
    { planId: proPlan.id, featureId: featureMap.basic_reports },
    { planId: proPlan.id, featureId: featureMap.advanced_reports },
    { planId: proPlan.id, featureId: featureMap.pdf_export },
    { planId: proPlan.id, featureId: featureMap.excel_export },
    { planId: proPlan.id, featureId: featureMap.rest_api },
    { planId: proPlan.id, featureId: featureMap.email_support },
    { planId: proPlan.id, featureId: featureMap.chat_support },
    { planId: proPlan.id, featureId: featureMap.priority_support },

    // ENTERPRISE - Todas as features
    ...features.map((feature) => ({
      planId: enterprisePlan.id,
      featureId: feature.id,
    })),
  ].map((assoc) => ({
    id: nanoid(),
    ...assoc,
    isEnabled: true,
  }));
};
