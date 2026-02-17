import {
  boolean,
  timestamp,
  index,
  int,
  json,
  mysqlTable,
  text,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * SCHEMA MULTI-TENANT - BLACK BELT PLATFORM (MYSQL/MARIADB - XAMPP)
 *
 * Arquitetura: Row-Level Security (RLS) com coluna tenant_id
 * Todas as tabelas de dados de negocio incluem tenant_id para isolamento
 */

// ============================================================================
// CORE: Usuarios e Autenticacao
// ============================================================================

export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: text("role").default("user").notNull(),
  tenantId: varchar("tenantId", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Exportar schemas NR-01 (ja em formato MySQL)
export * from "./schema_nr01";

// ============================================================================
// MULTI-TENANT: Empresas (Tenants)
// ============================================================================

export const tenants = mysqlTable(
  "tenants",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    cnpj: varchar("cnpj", { length: 18 }).notNull().unique(),

    street: varchar("street", { length: 255 }),
    number: varchar("number", { length: 20 }),
    complement: varchar("complement", { length: 100 }),
    neighborhood: varchar("neighborhood", { length: 100 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 2 }),
    zipCode: varchar("zipCode", { length: 10 }),

    contactName: varchar("contactName", { length: 255 }),
    contactEmail: varchar("contactEmail", { length: 320 }),
    contactPhone: varchar("contactPhone", { length: 20 }),

    status: text("status").default("active").notNull(),
    strategy: text("strategy").default("shared_rls").notNull(),
    schemaName: varchar("schemaName", { length: 100 }),

    logoUrl: varchar("logoUrl", { length: 500 }),
    faviconUrl: varchar("faviconUrl", { length: 500 }),
    primaryColor: varchar("primaryColor", { length: 7 }).default("#3b82f6"),
    secondaryColor: varchar("secondaryColor", { length: 7 }).default("#10b981"),
    customDomain: varchar("customDomain", { length: 255 }),
    customDomainVerified: boolean("customDomainVerified").default(false),
    emailSenderName: varchar("emailSenderName", { length: 255 }),
    emailSenderEmail: varchar("emailSenderEmail", { length: 320 }),
    whiteLabelEnabled: boolean("whiteLabelEnabled").default(false),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_tenant_name").on(table.name),
    statusIdx: index("idx_tenant_status").on(table.status),
    customDomainIdx: index("idx_tenant_custom_domain").on(table.customDomain),
  })
);

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ============================================================================
// CONFIGURACOES POR TENANT
// ============================================================================

export const tenantSettings = mysqlTable(
  "tenant_settings",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    settingKey: varchar("settingKey", { length: 100 }).notNull(),
    settingValue: json("settingValue").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantKeyUnique: unique("uk_tenant_setting").on(table.tenantId, table.settingKey),
    tenantIdx: index("idx_setting_tenant").on(table.tenantId),
  })
);

export type TenantSetting = typeof tenantSettings.$inferSelect;
export type InsertTenantSetting = typeof tenantSettings.$inferInsert;

// ============================================================================
// SETORES (por tenant)
// ============================================================================

export const sectors = mysqlTable(
  "sectors",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    responsibleName: varchar("responsibleName", { length: 255 }),
    unit: varchar("unit", { length: 100 }),
    shift: varchar("shift", { length: 50 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_sector_tenant").on(table.tenantId),
    tenantNameIdx: index("idx_sector_tenant_name").on(table.tenantId, table.name),
  })
);

export type Sector = typeof sectors.$inferSelect;
export type InsertSector = typeof sectors.$inferInsert;

// ============================================================================
// COLABORADORES (por tenant e setor)
// ============================================================================

export const people = mysqlTable(
  "people",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    sectorId: varchar("sectorId", { length: 64 }),
    name: varchar("name", { length: 255 }).notNull(),
    position: varchar("position", { length: 255 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 20 }),
    employmentType: text("employmentType").default("own").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_people_tenant").on(table.tenantId),
    tenantSectorIdx: index("idx_people_tenant_sector").on(table.tenantId, table.sectorId),
    emailIdx: index("idx_people_email").on(table.email),
  })
);

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

// ============================================================================
// RBAC: Roles (Perfis de Acesso)
// ============================================================================

export const roles = mysqlTable(
  "roles",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    systemName: varchar("systemName", { length: 100 }).notNull().unique(),
    displayName: varchar("displayName", { length: 100 }).notNull(),
    description: text("description"),
    scope: text("scope").default("tenant").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    scopeIdx: index("idx_role_scope").on(table.scope),
  })
);

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

// ============================================================================
// PERMISSOES (granulares)
// ============================================================================

export const permissions = mysqlTable(
  "permissions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    resource: varchar("resource", { length: 50 }).notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    resourceActionIdx: index("idx_perm_resource_action").on(table.resource, table.action),
  })
);

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

// ============================================================================
// ROLE-PERMISSION (associacao com condicoes ABAC)
// ============================================================================

export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    roleId: varchar("roleId", { length: 64 }).notNull(),
    permissionId: varchar("permissionId", { length: 64 }).notNull(),
    tenantId: varchar("tenantId", { length: 64 }),
    conditions: json("conditions"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    rolePermIdx: index("idx_role_perm").on(table.roleId, table.permissionId),
    tenantIdx: index("idx_role_perm_tenant").on(table.tenantId),
  })
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

// ============================================================================
// USER-ROLE (associacao usuario-perfil-tenant)
// ============================================================================

export const userRoles = mysqlTable(
  "user_roles",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("userId", { length: 64 }).notNull(),
    roleId: varchar("roleId", { length: 64 }).notNull(),
    tenantId: varchar("tenantId", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userTenantIdx: index("idx_user_role_tenant").on(table.userId, table.tenantId),
    userRoleIdx: index("idx_user_role").on(table.userId, table.roleId),
  })
);

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

// ============================================================================
// AUDITORIA (trilha completa de acoes)
// ============================================================================

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }),
    userId: varchar("userId", { length: 64 }).notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: varchar("entityId", { length: 64 }),
    oldValues: json("oldValues"),
    newValues: json("newValues"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: text("userAgent"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    tenantTimestampIdx: index("idx_audit_tenant_time").on(table.tenantId, table.timestamp),
    userTimestampIdx: index("idx_audit_user_time").on(table.userId, table.timestamp),
    entityIdx: index("idx_audit_entity").on(table.entityType, table.entityId),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// LGPD: Consentimentos
// ============================================================================

export const dataConsents = mysqlTable(
  "data_consents",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    personId: varchar("personId", { length: 64 }).notNull(),
    consentType: varchar("consentType", { length: 50 }).notNull(),
    granted: boolean("granted").notNull(),
    grantedAt: timestamp("grantedAt"),
    revokedAt: timestamp("revokedAt"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: text("userAgent"),
    version: varchar("version", { length: 20 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    personConsentIdx: index("idx_consent_person").on(table.personId, table.consentType),
    tenantIdx: index("idx_consent_tenant").on(table.tenantId),
  })
);

export type DataConsent = typeof dataConsents.$inferSelect;
export type InsertDataConsent = typeof dataConsents.$inferInsert;

// ============================================================================
// CONVITES DE USUARIOS
// ============================================================================

export const userInvites = mysqlTable(
  "user_invites",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }),
    email: varchar("email", { length: 320 }).notNull(),
    roleId: varchar("roleId", { length: 64 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    status: text("status").default("pending").notNull(),
    invitedBy: varchar("invitedBy", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedAt: timestamp("acceptedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    emailStatusIdx: index("idx_invite_email_status").on(table.email, table.status),
    tenantIdx: index("idx_invite_tenant").on(table.tenantId),
    tokenIdx: index("idx_invite_token").on(table.token),
  })
);

export type UserInvite = typeof userInvites.$inferSelect;
export type InsertUserInvite = typeof userInvites.$inferInsert;

// ============================================================================
// PRECIFICACAO: Clientes
// ============================================================================

export const clients = mysqlTable(
  "clients",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    cnpj: varchar("cnpj", { length: 18 }),
    industry: varchar("industry", { length: 100 }),
    companySize: text("companySize"),
    contactName: varchar("contactName", { length: 255 }),
    contactEmail: varchar("contactEmail", { length: 320 }),
    contactPhone: varchar("contactPhone", { length: 20 }),
    street: varchar("street", { length: 255 }),
    number: varchar("number", { length: 20 }),
    complement: varchar("complement", { length: 100 }),
    neighborhood: varchar("neighborhood", { length: 100 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 2 }),
    zipCode: varchar("zipCode", { length: 10 }),
    status: text("status").default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_client_tenant").on(table.tenantId),
    cnpjIdx: index("idx_client_cnpj").on(table.cnpj),
    emailIdx: index("idx_client_email").on(table.contactEmail),
  })
);

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ============================================================================
// PRECIFICACAO: Servicos Oferecidos
// ============================================================================

export const services = mysqlTable(
  "services",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }).notNull(),
    unit: text("unit").default("hour").notNull(),
    minPrice: int("minPrice").notNull(),
    maxPrice: int("maxPrice").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_service_tenant").on(table.tenantId),
    categoryIdx: index("idx_service_category").on(table.category),
  })
);

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

// ============================================================================
// PRECIFICACAO: Parametros de Precificacao (por tenant)
// ============================================================================

export const pricingParameters = mysqlTable(
  "pricing_parameters",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull().unique(),
    monthlyFixedCost: int("monthlyFixedCost").notNull(),
    laborCost: int("laborCost").notNull(),
    productiveHoursPerMonth: int("productiveHoursPerMonth").notNull(),
    defaultTaxRegime: text("defaultTaxRegime").default("SN").notNull(),
    volumeDiscounts: json("volumeDiscounts"),
    riskAdjustment: int("riskAdjustment").default(100).notNull(),
    seniorityAdjustment: int("seniorityAdjustment").default(100).notNull(),
    taxRates: json("taxRates"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_pricing_param_tenant").on(table.tenantId),
  })
);

export type PricingParameter = typeof pricingParameters.$inferSelect;
export type InsertPricingParameter = typeof pricingParameters.$inferInsert;

// ============================================================================
// PRECIFICACAO: Propostas Comerciais
// ============================================================================

export const proposals = mysqlTable(
  "proposals",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    clientId: varchar("clientId", { length: 64 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: text("status").default("draft").notNull(),
    subtotal: int("subtotal").notNull(),
    discount: int("discount").default(0).notNull(),
    discountPercent: int("discountPercent").default(0).notNull(),
    taxes: int("taxes").default(0).notNull(),
    totalValue: int("totalValue").notNull(),
    taxRegime: text("taxRegime").notNull(),
    validUntil: timestamp("validUntil"),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
    sentAt: timestamp("sentAt"),
    respondedAt: timestamp("respondedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantClientIdx: index("idx_proposal_tenant_client").on(table.tenantId, table.clientId),
    statusIdx: index("idx_proposal_status").on(table.status),
    dateIdx: index("idx_proposal_date").on(table.generatedAt),
  })
);

export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = typeof proposals.$inferInsert;

// ============================================================================
// PRECIFICACAO: Itens das Propostas
// ============================================================================

export const proposalItems = mysqlTable(
  "proposal_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    proposalId: varchar("proposalId", { length: 64 }).notNull(),
    serviceId: varchar("serviceId", { length: 64 }).notNull(),
    serviceName: varchar("serviceName", { length: 255 }).notNull(),
    quantity: int("quantity").notNull(),
    unitPrice: int("unitPrice").notNull(),
    subtotal: int("subtotal").notNull(),
    technicalHours: int("technicalHours"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    proposalIdx: index("idx_proposal_item_proposal").on(table.proposalId),
    serviceIdx: index("idx_proposal_item_service").on(table.serviceId),
  })
);

export type ProposalItem = typeof proposalItems.$inferSelect;
export type InsertProposalItem = typeof proposalItems.$inferInsert;

// ============================================================================
// PRECIFICACAO: Vinculacao de Avaliacoes com Propostas
// ============================================================================

export const assessmentProposals = mysqlTable(
  "assessment_proposals",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    assessmentId: varchar("assessmentId", { length: 64 }).notNull(),
    proposalId: varchar("proposalId", { length: 64 }).notNull(),
    recommendedServices: json("recommendedServices"),
    riskLevel: text("riskLevel").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_assess_proposal_tenant").on(table.tenantId),
    assessmentIdx: index("idx_assess_proposal_assessment").on(table.assessmentId),
    proposalIdx: index("idx_assess_proposal_proposal").on(table.proposalId),
  })
);

export type AssessmentProposal = typeof assessmentProposals.$inferSelect;
export type InsertAssessmentProposal = typeof assessmentProposals.$inferInsert;

// ============================================================================
// MONETIZACAO: Planos de Assinatura
// ============================================================================

export const plans = mysqlTable(
  "plans",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    displayName: varchar("displayName", { length: 100 }).notNull(),
    description: text("description"),
    monthlyPrice: int("monthlyPrice").notNull(),
    yearlyPrice: int("yearlyPrice").notNull(),
    maxTenants: int("maxTenants").notNull(),
    maxUsersPerTenant: int("maxUsersPerTenant").notNull(),
    maxStorageGB: int("maxStorageGB").notNull(),
    maxApiRequestsPerDay: int("maxApiRequestsPerDay").notNull(),
    hasAdvancedReports: boolean("hasAdvancedReports").default(false).notNull(),
    hasApiAccess: boolean("hasApiAccess").default(false).notNull(),
    hasWebhooks: boolean("hasWebhooks").default(false).notNull(),
    hasWhiteLabel: boolean("hasWhiteLabel").default(false).notNull(),
    hasPrioritySupport: boolean("hasPrioritySupport").default(false).notNull(),
    hasSLA: boolean("hasSLA").default(false).notNull(),
    slaUptime: int("slaUptime"),
    trialDays: int("trialDays").default(14).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    isPublic: boolean("isPublic").default(true).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_plan_name").on(table.name),
    activeIdx: index("idx_plan_active").on(table.isActive),
  })
);

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

// ============================================================================
// MONETIZACAO: Assinaturas dos Tenants
// ============================================================================

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull().unique(),
    planId: varchar("planId", { length: 64 }).notNull(),
    status: text("status").default("trialing").notNull(),
    billingCycle: text("billingCycle").default("monthly").notNull(),
    startDate: timestamp("startDate").defaultNow().notNull(),
    currentPeriodStart: timestamp("currentPeriodStart").notNull(),
    currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
    trialEnd: timestamp("trialEnd"),
    canceledAt: timestamp("canceledAt"),
    endedAt: timestamp("endedAt"),
    stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
    stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
    mercadoPagoSubscriptionId: varchar("mercadoPagoSubscriptionId", { length: 255 }),
    currentPrice: int("currentPrice").notNull(),
    autoRenew: boolean("autoRenew").default(true).notNull(),
    cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_subscription_tenant").on(table.tenantId),
    planIdx: index("idx_subscription_plan").on(table.planId),
    statusIdx: index("idx_subscription_status").on(table.status),
    stripeSubIdx: index("idx_subscription_stripe").on(table.stripeSubscriptionId),
  })
);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ============================================================================
// MONETIZACAO: Historico de Faturas
// ============================================================================

export const invoices = mysqlTable(
  "invoices",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    subscriptionId: varchar("subscriptionId", { length: 64 }).notNull(),
    stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }),
    mercadoPagoInvoiceId: varchar("mercadoPagoInvoiceId", { length: 255 }),
    subtotal: int("subtotal").notNull(),
    discount: int("discount").default(0).notNull(),
    tax: int("tax").default(0).notNull(),
    total: int("total").notNull(),
    status: text("status").default("draft").notNull(),
    description: text("description"),
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    dueDate: timestamp("dueDate"),
    paidAt: timestamp("paidAt"),
    paymentMethod: varchar("paymentMethod", { length: 50 }),
    invoiceUrl: varchar("invoiceUrl", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_invoice_tenant").on(table.tenantId),
    subscriptionIdx: index("idx_invoice_subscription").on(table.subscriptionId),
    statusIdx: index("idx_invoice_status").on(table.status),
    dueDateIdx: index("idx_invoice_due_date").on(table.dueDate),
  })
);

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ============================================================================
// MONETIZACAO: Uso e Metricas
// ============================================================================

export const usageMetrics = mysqlTable(
  "usage_metrics",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    activeUsers: int("activeUsers").default(0).notNull(),
    storageUsedGB: int("storageUsedGB").default(0).notNull(),
    apiRequests: int("apiRequests").default(0).notNull(),
    assessmentsCreated: int("assessmentsCreated").default(0).notNull(),
    proposalsGenerated: int("proposalsGenerated").default(0).notNull(),
    additionalMetrics: json("additionalMetrics"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantPeriodIdx: index("idx_usage_tenant_period").on(table.tenantId, table.periodStart),
  })
);

export type UsageMetric = typeof usageMetrics.$inferSelect;
export type InsertUsageMetric = typeof usageMetrics.$inferInsert;

// ============================================================================
// MONETIZACAO: Feature Flags
// ============================================================================

export const featureFlags = mysqlTable(
  "feature_flags",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    displayName: varchar("displayName", { length: 100 }).notNull(),
    description: text("description"),
    category: text("category").default("core").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    nameIdx: index("idx_feature_name").on(table.name),
    categoryIdx: index("idx_feature_category").on(table.category),
  })
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = typeof featureFlags.$inferInsert;

// ============================================================================
// MONETIZACAO: Associacao Plan-Features
// ============================================================================

export const planFeatures = mysqlTable(
  "plan_features",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    planId: varchar("planId", { length: 64 }).notNull(),
    featureId: varchar("featureId", { length: 64 }).notNull(),
    isEnabled: boolean("isEnabled").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    planFeatureUnique: unique("uk_plan_feature").on(table.planId, table.featureId),
    planIdx: index("idx_plan_feature_plan").on(table.planId),
    featureIdx: index("idx_plan_feature_feature").on(table.featureId),
  })
);

export type PlanFeature = typeof planFeatures.$inferSelect;
export type InsertPlanFeature = typeof planFeatures.$inferInsert;

// ============================================================================
// MONETIZACAO: Exportacoes PDF
// ============================================================================

export const pdfExports = mysqlTable(
  "pdf_exports",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    userId: varchar("userId", { length: 64 }).notNull(),
    documentType: text("documentType").notNull(),
    documentId: varchar("documentId", { length: 64 }).notNull(),
    filename: varchar("filename", { length: 255 }).notNull(),
    fileSize: int("fileSize").notNull(),
    mimeType: varchar("mimeType", { length: 100 }).default("application/pdf").notNull(),
    s3Key: varchar("s3Key", { length: 500 }),
    s3Bucket: varchar("s3Bucket", { length: 100 }),
    url: varchar("url", { length: 1000 }),
    status: text("status").default("pending").notNull(),
    metadata: json("metadata"),
    errorMessage: text("errorMessage"),
    brandingApplied: boolean("brandingApplied").default(false).notNull(),
    customLogo: varchar("customLogo", { length: 500 }),
    customColors: json("customColors"),
    emailSent: boolean("emailSent").default(false).notNull(),
    emailTo: varchar("emailTo", { length: 320 }),
    emailSentAt: timestamp("emailSentAt"),
    expiresAt: timestamp("expiresAt"),
    downloadCount: int("downloadCount").default(0).notNull(),
    lastDownloadedAt: timestamp("lastDownloadedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_pdf_export_tenant").on(table.tenantId),
    userIdx: index("idx_pdf_export_user").on(table.userId),
    docTypeIdx: index("idx_pdf_export_doc_type").on(table.documentType),
    docIdIdx: index("idx_pdf_export_doc_id").on(table.documentId),
    statusIdx: index("idx_pdf_export_status").on(table.status),
    createdIdx: index("idx_pdf_export_created").on(table.createdAt),
  })
);

export type PdfExport = typeof pdfExports.$inferSelect;
export type InsertPdfExport = typeof pdfExports.$inferInsert;

// ============================================================================
// PHASE 6: WEBHOOKS E API PUBLICA
// ============================================================================

export const webhooks = mysqlTable(
  "webhooks",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    secret: varchar("secret", { length: 128 }).notNull(),
    events: json("events").notNull(),
    active: boolean("active").default(true).notNull(),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_webhook_tenant").on(table.tenantId),
    activeIdx: index("idx_webhook_active").on(table.active),
  })
);

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

export const webhookDeliveries = mysqlTable(
  "webhook_deliveries",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    webhookId: varchar("webhookId", { length: 64 }).notNull(),
    eventType: varchar("eventType", { length: 100 }).notNull(),
    payload: json("payload").notNull(),
    responseStatus: int("responseStatus"),
    responseBody: text("responseBody"),
    responseHeaders: json("responseHeaders"),
    deliveredAt: timestamp("deliveredAt"),
    attempts: int("attempts").default(0).notNull(),
    maxAttempts: int("maxAttempts").default(5).notNull(),
    nextRetryAt: timestamp("nextRetryAt"),
    lastError: text("lastError"),
    success: boolean("success").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    webhookIdx: index("idx_delivery_webhook").on(table.webhookId),
    eventIdx: index("idx_delivery_event").on(table.eventType),
    nextRetryIdx: index("idx_delivery_next_retry").on(table.nextRetryAt),
    createdIdx: index("idx_delivery_created").on(table.createdAt),
  })
);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhookDelivery = typeof webhookDeliveries.$inferInsert;

export const apiKeys = mysqlTable(
  "api_keys",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    keyHash: varchar("keyHash", { length: 64 }).notNull().unique(),
    keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(),
    scopes: json("scopes").notNull(),
    lastUsedAt: timestamp("lastUsedAt"),
    expiresAt: timestamp("expiresAt"),
    active: boolean("active").default(true).notNull(),
    description: text("description"),
    rateLimit: int("rateLimit"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_api_key_tenant").on(table.tenantId),
    keyHashIdx: index("idx_api_key_hash").on(table.keyHash),
    activeIdx: index("idx_api_key_active").on(table.active),
    expiresIdx: index("idx_api_key_expires").on(table.expiresAt),
  })
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

export const apiKeyUsage = mysqlTable(
  "api_key_usage",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    apiKeyId: varchar("apiKeyId", { length: 64 }).notNull(),
    endpoint: varchar("endpoint", { length: 255 }).notNull(),
    method: varchar("method", { length: 10 }).notNull(),
    statusCode: int("statusCode").notNull(),
    requestDuration: int("requestDuration"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: varchar("userAgent", { length: 500 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    apiKeyIdx: index("idx_api_usage_key").on(table.apiKeyId),
    createdIdx: index("idx_api_usage_created").on(table.createdAt),
    endpointIdx: index("idx_api_usage_endpoint").on(table.endpoint),
  })
);

export type ApiKeyUsage = typeof apiKeyUsage.$inferSelect;
export type InsertApiKeyUsage = typeof apiKeyUsage.$inferInsert;

// ============================================================================
// PHASE 7: SECURITY IMPROVEMENTS
// ============================================================================

export const user2FA = mysqlTable(
  "user_2fa",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("userId", { length: 64 }).notNull().unique(),
    secret: varchar("secret", { length: 128 }).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    backupCodes: json("backupCodes"),
    verifiedAt: timestamp("verifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_2fa_user").on(table.userId),
    enabledIdx: index("idx_2fa_enabled").on(table.enabled),
  })
);

export type User2FA = typeof user2FA.$inferSelect;
export type InsertUser2FA = typeof user2FA.$inferInsert;

export const ipWhitelist = mysqlTable(
  "ip_whitelist",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    ipAddress: varchar("ipAddress", { length: 45 }).notNull(),
    description: varchar("description", { length: 255 }),
    active: boolean("active").default(true).notNull(),
    createdBy: varchar("createdBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_ip_whitelist_tenant").on(table.tenantId),
    ipIdx: index("idx_ip_whitelist_ip").on(table.ipAddress),
    activeIdx: index("idx_ip_whitelist_active").on(table.active),
  })
);

export type IpWhitelist = typeof ipWhitelist.$inferSelect;
export type InsertIpWhitelist = typeof ipWhitelist.$inferInsert;

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("userId", { length: 64 }).notNull(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: varchar("userAgent", { length: 500 }),
    deviceInfo: json("deviceInfo"),
    lastActivity: timestamp("lastActivity").defaultNow().notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_session_user").on(table.userId),
    tenantIdx: index("idx_session_tenant").on(table.tenantId),
    tokenIdx: index("idx_session_token").on(table.token),
    expiresIdx: index("idx_session_expires").on(table.expiresAt),
    activeIdx: index("idx_session_active").on(table.active),
  })
);

export type Session = typeof sessions.$inferSelect;
export type InsertSession = typeof sessions.$inferInsert;

export const securityAlerts = mysqlTable(
  "security_alerts",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    userId: varchar("userId", { length: 64 }),
    alertType: varchar("alertType", { length: 50 }).notNull(),
    severity: text("severity").notNull(),
    message: text("message").notNull(),
    metadata: json("metadata"),
    ipAddress: varchar("ipAddress", { length: 45 }),
    resolved: boolean("resolved").default(false).notNull(),
    resolvedAt: timestamp("resolvedAt"),
    resolvedBy: varchar("resolvedBy", { length: 64 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: index("idx_security_alert_tenant").on(table.tenantId),
    userIdx: index("idx_security_alert_user").on(table.userId),
    typeIdx: index("idx_security_alert_type").on(table.alertType),
    severityIdx: index("idx_security_alert_severity").on(table.severity),
    resolvedIdx: index("idx_security_alert_resolved").on(table.resolved),
    createdIdx: index("idx_security_alert_created").on(table.createdAt),
  })
);

export type SecurityAlert = typeof securityAlerts.$inferSelect;
export type InsertSecurityAlert = typeof securityAlerts.$inferInsert;

export const loginAttempts = mysqlTable(
  "login_attempts",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    userId: varchar("userId", { length: 64 }),
    success: boolean("success").notNull(),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: varchar("userAgent", { length: 500 }),
    failureReason: varchar("failureReason", { length: 100 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("idx_login_attempt_email").on(table.email),
    userIdx: index("idx_login_attempt_user").on(table.userId),
    ipIdx: index("idx_login_attempt_ip").on(table.ipAddress),
    createdIdx: index("idx_login_attempt_created").on(table.createdAt),
    successIdx: index("idx_login_attempt_success").on(table.success),
  })
);

export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = typeof loginAttempts.$inferInsert;

// ============================================================================
// PHASE 10: Onboarding
// ============================================================================

export const onboardingProgress = mysqlTable(
  "onboarding_progress",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull().unique(),
    currentStep: int("currentStep").default(1).notNull(),
    completedSteps: json("completedSteps").notNull(),
    checklistItems: json("checklistItems").notNull(),
    skipped: boolean("skipped").default(false).notNull(),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    completedIdx: index("idx_onboarding_completed").on(table.completedAt),
    skippedIdx: index("idx_onboarding_skipped").on(table.skipped),
  })
);

export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = typeof onboardingProgress.$inferInsert;

export const industryTemplates = mysqlTable(
  "industry_templates",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    icon: varchar("icon", { length: 50 }),
    configuration: json("configuration").notNull(),
    sampleData: json("sampleData"),
    features: json("features"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: index("idx_template_slug").on(table.slug),
    activeIdx: index("idx_template_active").on(table.isActive),
  })
);

export type IndustryTemplate = typeof industryTemplates.$inferSelect;
export type InsertIndustryTemplate = typeof industryTemplates.$inferInsert;
