import {
  boolean,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * SCHEMA MULTI-TENANT - BLACK BELT PLATFORM
 *
 * Arquitetura: Row-Level Security (RLS) com coluna tenant_id
 * Todas as tabelas de dados de negócio incluem tenant_id para isolamento
 */

// ============================================================================
// CORE: Usuários e Autenticação
// ============================================================================

export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }), // Para autenticação local
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Exportar schemas NR-01
export * from "./schema_nr01";

// ============================================================================
// MULTI-TENANT: Empresas (Tenants)
// ============================================================================

export const tenants = mysqlTable(
  "tenants",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    cnpj: varchar("cnpj", { length: 18 }).notNull().unique(), // XX.XXX.XXX/XXXX-XX

    // Endereço
    street: varchar("street", { length: 255 }),
    number: varchar("number", { length: 20 }),
    complement: varchar("complement", { length: 100 }),
    neighborhood: varchar("neighborhood", { length: 100 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 2 }), // UF
    zipCode: varchar("zipCode", { length: 10 }), // CEP

    // Contato principal
    contactName: varchar("contactName", { length: 255 }),
    contactEmail: varchar("contactEmail", { length: 320 }),
    contactPhone: varchar("contactPhone", { length: 20 }),

    // Status e estratégia
    status: mysqlEnum("status", ["active", "inactive", "suspended"])
      .default("active")
      .notNull(),
    strategy: mysqlEnum("strategy", ["shared_rls", "dedicated_schema"])
      .default("shared_rls")
      .notNull(),
    schemaName: varchar("schemaName", { length: 100 }), // Apenas para dedicated_schema

    // Metadados
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    nameIdx: index("idx_tenant_name").on(table.name),
    statusIdx: index("idx_tenant_status").on(table.status),
  })
);

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ============================================================================
// CONFIGURAÇÕES POR TENANT
// ============================================================================

export const tenantSettings = mysqlTable(
  "tenant_settings",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),

    settingKey: varchar("settingKey", { length: 100 }).notNull(),
    settingValue: json("settingValue").notNull(), // { max_users: 100, features: [...], branding: {...} }

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    tenantKeyUnique: unique("uk_tenant_setting").on(
      table.tenantId,
      table.settingKey
    ),
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

    // Campos opcionais para expansão futura
    unit: varchar("unit", { length: 100 }), // Unidade/filial
    shift: varchar("shift", { length: 50 }), // Turno

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    tenantIdx: index("idx_sector_tenant").on(table.tenantId),
    tenantNameIdx: index("idx_sector_tenant_name").on(
      table.tenantId,
      table.name
    ),
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
    position: varchar("position", { length: 255 }), // Cargo/função
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 20 }),

    employmentType: mysqlEnum("employmentType", ["own", "outsourced"])
      .default("own")
      .notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    tenantIdx: index("idx_people_tenant").on(table.tenantId),
    tenantSectorIdx: index("idx_people_tenant_sector").on(
      table.tenantId,
      table.sectorId
    ),
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

    // Escopo: global (Black Belt) ou por tenant
    scope: mysqlEnum("scope", ["global", "tenant"]).default("tenant").notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    scopeIdx: index("idx_role_scope").on(table.scope),
  })
);

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

// ============================================================================
// PERMISSÕES (granulares)
// ============================================================================

export const permissions = mysqlTable(
  "permissions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    name: varchar("name", { length: 100 }).notNull().unique(), // ex: "colaboradores.create"
    resource: varchar("resource", { length: 50 }).notNull(), // ex: "colaboradores"
    action: varchar("action", { length: 50 }).notNull(), // ex: "create", "read", "update", "delete"
    description: text("description"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    resourceActionIdx: index("idx_perm_resource_action").on(
      table.resource,
      table.action
    ),
  })
);

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

// ============================================================================
// ROLE-PERMISSION (associação com condições ABAC)
// ============================================================================

export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    roleId: varchar("roleId", { length: 64 }).notNull(),
    permissionId: varchar("permissionId", { length: 64 }).notNull(),
    tenantId: varchar("tenantId", { length: 64 }), // NULL para permissões globais

    // Condições ABAC (JSON): { "sector_id": "uuid", "own_data_only": true }
    conditions: json("conditions"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    rolePermIdx: index("idx_role_perm").on(table.roleId, table.permissionId),
    tenantIdx: index("idx_role_perm_tenant").on(table.tenantId),
  })
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

// ============================================================================
// USER-ROLE (associação usuário-perfil-tenant)
// ============================================================================

export const userRoles = mysqlTable(
  "user_roles",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    userId: varchar("userId", { length: 64 }).notNull(),
    roleId: varchar("roleId", { length: 64 }).notNull(),
    tenantId: varchar("tenantId", { length: 64 }), // NULL para roles globais (Black Belt)

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userTenantIdx: index("idx_user_role_tenant").on(
      table.userId,
      table.tenantId
    ),
    userRoleIdx: index("idx_user_role").on(table.userId, table.roleId),
  })
);

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

// ============================================================================
// AUDITORIA (trilha completa de ações)
// ============================================================================

export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    tenantId: varchar("tenantId", { length: 64 }), // NULL para ações globais
    userId: varchar("userId", { length: 64 }).notNull(),

    action: varchar("action", { length: 50 }).notNull(), // CREATE, READ, UPDATE, DELETE
    entityType: varchar("entityType", { length: 100 }).notNull(), // tenants, sectors, people, etc.
    entityId: varchar("entityId", { length: 64 }),

    oldValues: json("oldValues"), // Valores antes da mudança
    newValues: json("newValues"), // Valores depois da mudança

    ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 ou IPv6
    userAgent: text("userAgent"),

    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  table => ({
    tenantTimestampIdx: index("idx_audit_tenant_time").on(
      table.tenantId,
      table.timestamp
    ),
    userTimestampIdx: index("idx_audit_user_time").on(
      table.userId,
      table.timestamp
    ),
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

    consentType: varchar("consentType", { length: 50 }).notNull(), // data_processing, marketing, etc.
    granted: boolean("granted").notNull(),

    grantedAt: timestamp("grantedAt"),
    revokedAt: timestamp("revokedAt"),

    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: text("userAgent"),
    version: varchar("version", { length: 20 }), // Versão do termo aceito

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    personConsentIdx: index("idx_consent_person").on(
      table.personId,
      table.consentType
    ),
    tenantIdx: index("idx_consent_tenant").on(table.tenantId),
  })
);

export type DataConsent = typeof dataConsents.$inferSelect;
export type InsertDataConsent = typeof dataConsents.$inferInsert;

// ============================================================================
// CONVITES DE USUÁRIOS
// ============================================================================

export const userInvites = mysqlTable(
  "user_invites",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    tenantId: varchar("tenantId", { length: 64 }), // NULL para convites Black Belt
    email: varchar("email", { length: 320 }).notNull(),
    roleId: varchar("roleId", { length: 64 }).notNull(),

    token: varchar("token", { length: 255 }).notNull().unique(),
    status: mysqlEnum("status", ["pending", "accepted", "expired", "cancelled"])
      .default("pending")
      .notNull(),

    invitedBy: varchar("invitedBy", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedAt: timestamp("acceptedAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    emailStatusIdx: index("idx_invite_email_status").on(
      table.email,
      table.status
    ),
    tenantIdx: index("idx_invite_tenant").on(table.tenantId),
    tokenIdx: index("idx_invite_token").on(table.token),
  })
);

export type UserInvite = typeof userInvites.$inferSelect;
export type InsertUserInvite = typeof userInvites.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Clientes (para propostas comerciais)
// ============================================================================

export const clients = mysqlTable(
  "clients",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),

    name: varchar("name", { length: 255 }).notNull(),
    cnpj: varchar("cnpj", { length: 18 }),
    industry: varchar("industry", { length: 100 }), // Setor da indústria
    companySize: mysqlEnum("companySize", [
      "micro",
      "small",
      "medium",
      "large",
    ]),

    // Contato
    contactName: varchar("contactName", { length: 255 }),
    contactEmail: varchar("contactEmail", { length: 320 }),
    contactPhone: varchar("contactPhone", { length: 20 }),

    // Endereço
    street: varchar("street", { length: 255 }),
    number: varchar("number", { length: 20 }),
    complement: varchar("complement", { length: 100 }),
    neighborhood: varchar("neighborhood", { length: 100 }),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 2 }),
    zipCode: varchar("zipCode", { length: 10 }),

    status: mysqlEnum("status", ["active", "inactive"])
      .default("active")
      .notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    tenantIdx: index("idx_client_tenant").on(table.tenantId),
    cnpjIdx: index("idx_client_cnpj").on(table.cnpj),
    emailIdx: index("idx_client_email").on(table.contactEmail),
  })
);

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Serviços Oferecidos
// ============================================================================

export const services = mysqlTable(
  "services",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),

    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }).notNull(), // Gestão de Riscos, Treinamento, etc.

    unit: mysqlEnum("unit", ["hour", "day", "project", "month"])
      .default("hour")
      .notNull(),

    minPrice: int("minPrice").notNull(), // Em centavos (ex: 5000 = R$ 50,00)
    maxPrice: int("maxPrice").notNull(),

    isActive: boolean("isActive").default(true).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    tenantIdx: index("idx_service_tenant").on(table.tenantId),
    categoryIdx: index("idx_service_category").on(table.category),
  })
);

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Parâmetros de Precificação (por tenant)
// ============================================================================

export const pricingParameters = mysqlTable(
  "pricing_parameters",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull().unique(),

    // Custos base
    monthlyFixedCost: int("monthlyFixedCost").notNull(), // Em centavos
    laborCost: int("laborCost").notNull(), // Custo de mão de obra por hora em centavos
    productiveHoursPerMonth: int("productiveHoursPerMonth").notNull(), // Ex: 160 horas

    // Regime tributário padrão
    defaultTaxRegime: mysqlEnum("defaultTaxRegime", [
      "MEI",
      "SN",
      "LP",
      "autonomous",
    ])
      .default("SN")
      .notNull(),

    // Descontos por volume (JSON)
    // Ex: { "6-15": 0.05, "16-30": 0.10, "30+": 0.15 }
    volumeDiscounts: json("volumeDiscounts"),

    // Ajustes percentuais
    riskAdjustment: int("riskAdjustment").default(100).notNull(), // 100 = 1.0x (sem ajuste)
    seniorityAdjustment: int("seniorityAdjustment").default(100).notNull(),

    // Alíquotas tributárias por regime (em centavos por real)
    // Ex: { "MEI": 0.05, "SN": 0.08, "LP": 0.15, "autonomous": 0.20 }
    taxRates: json("taxRates"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    tenantIdx: index("idx_pricing_param_tenant").on(table.tenantId),
  })
);

export type PricingParameter = typeof pricingParameters.$inferSelect;
export type InsertPricingParameter = typeof pricingParameters.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Propostas Comerciais
// ============================================================================

export const proposals = mysqlTable(
  "proposals",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    clientId: varchar("clientId", { length: 64 }).notNull(),

    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    status: mysqlEnum("status", [
      "draft",
      "sent",
      "accepted",
      "rejected",
      "expired",
    ])
      .default("draft")
      .notNull(),

    // Cálculos
    subtotal: int("subtotal").notNull(), // Em centavos
    discount: int("discount").default(0).notNull(), // Em centavos
    discountPercent: int("discountPercent").default(0).notNull(), // Em centavos de percentual (ex: 1000 = 10%)
    taxes: int("taxes").default(0).notNull(), // Em centavos
    totalValue: int("totalValue").notNull(), // Em centavos

    // Regime tributário utilizado
    taxRegime: mysqlEnum("taxRegime", [
      "MEI",
      "SN",
      "LP",
      "autonomous",
    ]).notNull(),

    // Datas
    validUntil: datetime("validUntil"),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
    sentAt: timestamp("sentAt"),
    respondedAt: timestamp("respondedAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    tenantClientIdx: index("idx_proposal_tenant_client").on(
      table.tenantId,
      table.clientId
    ),
    statusIdx: index("idx_proposal_status").on(table.status),
    dateIdx: index("idx_proposal_date").on(table.generatedAt),
  })
);

export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = typeof proposals.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Itens das Propostas
// ============================================================================

export const proposalItems = mysqlTable(
  "proposal_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    proposalId: varchar("proposalId", { length: 64 }).notNull(),
    serviceId: varchar("serviceId", { length: 64 }).notNull(),

    serviceName: varchar("serviceName", { length: 255 }).notNull(), // Snapshot do nome do serviço

    quantity: int("quantity").notNull(), // Em centavos de unidade (ex: 40.5 horas = 4050)
    unitPrice: int("unitPrice").notNull(), // Preço por unidade em centavos

    // Cálculos
    subtotal: int("subtotal").notNull(), // quantity * unitPrice
    technicalHours: int("technicalHours"), // Horas técnicas (se aplicável)

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    proposalIdx: index("idx_proposal_item_proposal").on(table.proposalId),
    serviceIdx: index("idx_proposal_item_service").on(table.serviceId),
  })
);

export type ProposalItem = typeof proposalItems.$inferSelect;
export type InsertProposalItem = typeof proposalItems.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Vinculação de Avaliações com Propostas
// ============================================================================

export const assessmentProposals = mysqlTable(
  "assessment_proposals",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),

    assessmentId: varchar("assessmentId", { length: 64 }).notNull(), // FK para riskAssessments
    proposalId: varchar("proposalId", { length: 64 }).notNull(),

    // Recomendações baseadas em risco
    recommendedServices: json("recommendedServices"), // Array de serviços recomendados
    riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    tenantIdx: index("idx_assess_proposal_tenant").on(table.tenantId),
    assessmentIdx: index("idx_assess_proposal_assessment").on(
      table.assessmentId
    ),
    proposalIdx: index("idx_assess_proposal_proposal").on(table.proposalId),
  })
);

export type AssessmentProposal = typeof assessmentProposals.$inferSelect;
export type InsertAssessmentProposal = typeof assessmentProposals.$inferInsert;

// ============================================================================
// MONETIZAÇÃO: Planos de Assinatura
// ============================================================================

export const plans = mysqlTable(
  "plans",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    name: varchar("name", { length: 100 }).notNull(), // Starter, Pro, Enterprise
    displayName: varchar("displayName", { length: 100 }).notNull(),
    description: text("description"),

    // Preços em centavos (BRL)
    monthlyPrice: int("monthlyPrice").notNull(), // Ex: 9900 = R$ 99,00
    yearlyPrice: int("yearlyPrice").notNull(), // Ex: 99000 = R$ 990,00 (17% desconto)

    // Limites
    maxTenants: int("maxTenants").notNull(), // -1 = ilimitado
    maxUsersPerTenant: int("maxUsersPerTenant").notNull(), // -1 = ilimitado
    maxStorageGB: int("maxStorageGB").notNull(), // -1 = ilimitado
    maxApiRequestsPerDay: int("maxApiRequestsPerDay").notNull(), // -1 = ilimitado

    // Flags de funcionalidades
    hasAdvancedReports: boolean("hasAdvancedReports").default(false).notNull(),
    hasApiAccess: boolean("hasApiAccess").default(false).notNull(),
    hasWebhooks: boolean("hasWebhooks").default(false).notNull(),
    hasWhiteLabel: boolean("hasWhiteLabel").default(false).notNull(),
    hasPrioritySupport: boolean("hasPrioritySupport").default(false).notNull(),
    hasSLA: boolean("hasSLA").default(false).notNull(),

    // Nível de SLA (em porcentagem de uptime)
    slaUptime: int("slaUptime"), // Ex: 999 = 99.9%

    // Período de trial (em dias)
    trialDays: int("trialDays").default(14).notNull(),

    // Status
    isActive: boolean("isActive").default(true).notNull(),
    isPublic: boolean("isPublic").default(true).notNull(), // Visível na página de preços

    // Ordenação para exibição
    sortOrder: int("sortOrder").default(0).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    nameIdx: index("idx_plan_name").on(table.name),
    activeIdx: index("idx_plan_active").on(table.isActive),
  })
);

export type Plan = typeof plans.$inferSelect;
export type InsertPlan = typeof plans.$inferInsert;

// ============================================================================
// MONETIZAÇÃO: Assinaturas dos Tenants
// ============================================================================

export const subscriptions = mysqlTable(
  "subscriptions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull().unique(), // Um tenant tem uma assinatura
    planId: varchar("planId", { length: 64 }).notNull(),

    // Status da assinatura
    status: mysqlEnum("status", [
      "trialing",
      "active",
      "past_due",
      "canceled",
      "unpaid",
    ])
      .default("trialing")
      .notNull(),

    // Período de cobrança
    billingCycle: mysqlEnum("billingCycle", ["monthly", "yearly"])
      .default("monthly")
      .notNull(),

    // Datas
    startDate: timestamp("startDate").defaultNow().notNull(),
    currentPeriodStart: timestamp("currentPeriodStart").notNull(),
    currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
    trialEnd: timestamp("trialEnd"), // NULL se não está em trial
    canceledAt: timestamp("canceledAt"),
    endedAt: timestamp("endedAt"),

    // Integração com gateway de pagamento
    stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
    stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
    mercadoPagoSubscriptionId: varchar("mercadoPagoSubscriptionId", {
      length: 255,
    }),

    // Preço praticado (snapshot do plano no momento da assinatura)
    currentPrice: int("currentPrice").notNull(), // Em centavos

    // Flags
    autoRenew: boolean("autoRenew").default(true).notNull(),
    cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    tenantIdx: index("idx_subscription_tenant").on(table.tenantId),
    planIdx: index("idx_subscription_plan").on(table.planId),
    statusIdx: index("idx_subscription_status").on(table.status),
    stripeSubIdx: index("idx_subscription_stripe").on(
      table.stripeSubscriptionId
    ),
  })
);

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// ============================================================================
// MONETIZAÇÃO: Histórico de Faturas
// ============================================================================

export const invoices = mysqlTable(
  "invoices",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    subscriptionId: varchar("subscriptionId", { length: 64 }).notNull(),

    // Identificadores externos
    stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }),
    mercadoPagoInvoiceId: varchar("mercadoPagoInvoiceId", { length: 255 }),

    // Valores em centavos
    subtotal: int("subtotal").notNull(),
    discount: int("discount").default(0).notNull(),
    tax: int("tax").default(0).notNull(),
    total: int("total").notNull(),

    // Status
    status: mysqlEnum("status", ["draft", "open", "paid", "void", "uncollectible"])
      .default("draft")
      .notNull(),

    // Descrição
    description: text("description"),

    // Datas
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    dueDate: timestamp("dueDate"),
    paidAt: timestamp("paidAt"),

    // Método de pagamento
    paymentMethod: varchar("paymentMethod", { length: 50 }), // card, boleto, pix

    // URL da fatura (para download)
    invoiceUrl: varchar("invoiceUrl", { length: 500 }),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    tenantIdx: index("idx_invoice_tenant").on(table.tenantId),
    subscriptionIdx: index("idx_invoice_subscription").on(table.subscriptionId),
    statusIdx: index("idx_invoice_status").on(table.status),
    dueDateIdx: index("idx_invoice_due_date").on(table.dueDate),
  })
);

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

// ============================================================================
// MONETIZAÇÃO: Uso e Métricas
// ============================================================================

export const usageMetrics = mysqlTable(
  "usage_metrics",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),

    // Período de medição
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),

    // Métricas
    activeUsers: int("activeUsers").default(0).notNull(),
    storageUsedGB: int("storageUsedGB").default(0).notNull(), // Em centavos de GB
    apiRequests: int("apiRequests").default(0).notNull(),
    assessmentsCreated: int("assessmentsCreated").default(0).notNull(),
    proposalsGenerated: int("proposalsGenerated").default(0).notNull(),

    // Metadata JSON para métricas adicionais
    additionalMetrics: json("additionalMetrics"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    tenantPeriodIdx: index("idx_usage_tenant_period").on(
      table.tenantId,
      table.periodStart
    ),
  })
);

export type UsageMetric = typeof usageMetrics.$inferSelect;
export type InsertUsageMetric = typeof usageMetrics.$inferInsert;

// ============================================================================
// MONETIZAÇÃO: Features Flags (Controle de Funcionalidades)
// ============================================================================

export const featureFlags = mysqlTable(
  "feature_flags",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    name: varchar("name", { length: 100 }).notNull().unique(),
    displayName: varchar("displayName", { length: 100 }).notNull(),
    description: text("description"),

    // Tipo de feature
    category: mysqlEnum("category", [
      "core",
      "reports",
      "integrations",
      "customization",
      "support",
    ])
      .default("core")
      .notNull(),

    // Status
    isActive: boolean("isActive").default(true).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
    nameIdx: index("idx_feature_name").on(table.name),
    categoryIdx: index("idx_feature_category").on(table.category),
  })
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertFeatureFlag = typeof featureFlags.$inferInsert;

// ============================================================================
// MONETIZAÇÃO: Associação Plan-Features
// ============================================================================

export const planFeatures = mysqlTable(
  "plan_features",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    planId: varchar("planId", { length: 64 }).notNull(),
    featureId: varchar("featureId", { length: 64 }).notNull(),

    // Flags
    isEnabled: boolean("isEnabled").default(true).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    planFeatureUnique: unique("uk_plan_feature").on(
      table.planId,
      table.featureId
    ),
    planIdx: index("idx_plan_feature_plan").on(table.planId),
    featureIdx: index("idx_plan_feature_feature").on(table.featureId),
  })
);

export type PlanFeature = typeof planFeatures.$inferSelect;
export type InsertPlanFeature = typeof planFeatures.$inferInsert;

// ============================================================================
// MONETIZAÇÃO: Exportações PDF
// ============================================================================

export const pdfExports = mysqlTable(
  "pdf_exports",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    userId: varchar("userId", { length: 64 }).notNull(),

    // Tipo de documento
    documentType: mysqlEnum("documentType", [
      "proposal",
      "assessment",
      "report",
      "invoice",
      "contract",
    ]).notNull(),

    // Referência ao documento original
    documentId: varchar("documentId", { length: 64 }).notNull(),

    // Informações do arquivo
    filename: varchar("filename", { length: 255 }).notNull(),
    fileSize: int("fileSize").notNull(), // Em bytes
    mimeType: varchar("mimeType", { length: 100 }).default("application/pdf").notNull(),

    // URLs de armazenamento
    s3Key: varchar("s3Key", { length: 500 }), // Chave no S3
    s3Bucket: varchar("s3Bucket", { length: 100 }), // Bucket do S3
    url: varchar("url", { length: 1000 }), // URL pública ou assinada

    // Status
    status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "expired"])
      .default("pending")
      .notNull(),

    // Metadados
    metadata: json("metadata"), // Dados extras (título, destinatário, etc)
    errorMessage: text("errorMessage"), // Mensagem de erro se falhou

    // Branding aplicado (para Enterprise)
    brandingApplied: boolean("brandingApplied").default(false).notNull(),
    customLogo: varchar("customLogo", { length: 500 }), // URL do logo customizado
    customColors: json("customColors"), // { primary, secondary, etc }

    // Envio por email
    emailSent: boolean("emailSent").default(false).notNull(),
    emailTo: varchar("emailTo", { length: 320 }),
    emailSentAt: timestamp("emailSentAt"),

    // Expiração (para URLs assinadas temporárias)
    expiresAt: timestamp("expiresAt"),

    // Download tracking
    downloadCount: int("downloadCount").default(0).notNull(),
    lastDownloadedAt: timestamp("lastDownloadedAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  table => ({
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
