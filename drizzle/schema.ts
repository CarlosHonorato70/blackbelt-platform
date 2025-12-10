import {
  boolean,
  timestamp,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * SCHEMA MULTI-TENANT - BLACK BELT PLATFORM (POSTGRESQL VERSION)
 *
 * Arquitetura: Row-Level Security (RLS) com coluna tenant_id
 * Todas as tabelas de dados de negócio incluem tenant_id para isolamento
 */

// ============================================================================
// CORE: Usuários e Autenticação
// ============================================================================

export const users = pgTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }), // Para autenticação local
  role: text("role").default("user").notNull(), // 'user' | 'admin'
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Exportar schemas NR-01 (Você precisará converter este arquivo também se ele usar mysqlTable)
export * from "./schema_nr01";

// ============================================================================
// MULTI-TENANT: Empresas (Tenants)
// ============================================================================

export const tenants = pgTable(
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
    status: text("status").default("active").notNull(), // 'active', 'inactive', 'suspended'
    strategy: text("strategy").default("shared_rls").notNull(), // 'shared_rls', 'dedicated_schema'
    schemaName: varchar("schemaName", { length: 100 }), // Apenas para dedicated_schema

    // White-Label / Branding (Phase 5 - Enterprise)
    logoUrl: varchar("logoUrl", { length: 500 }),
    faviconUrl: varchar("faviconUrl", { length: 500 }),
    primaryColor: varchar("primaryColor", { length: 7 }).default("#3b82f6"), // Hex color #RRGGBB
    secondaryColor: varchar("secondaryColor", { length: 7 }).default("#10b981"), // Hex color #RRGGBB
    customDomain: varchar("customDomain", { length: 255 }),
    customDomainVerified: boolean("customDomainVerified").default(false),
    emailSenderName: varchar("emailSenderName", { length: 255 }),
    emailSenderEmail: varchar("emailSenderEmail", { length: 320 }),
    whiteLabelEnabled: boolean("whiteLabelEnabled").default(false),

    // Metadados
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
// CONFIGURAÇÕES POR TENANT
// ============================================================================

export const tenantSettings = pgTable(
  "tenant_settings",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),

    settingKey: varchar("settingKey", { length: 100 }).notNull(),
    settingValue: jsonb("settingValue").notNull(), // { max_users: 100, features: [...], branding: {...} }

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
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

export const sectors = pgTable(
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
  (table) => ({
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

export const people = pgTable(
  "people",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    sectorId: varchar("sectorId", { length: 64 }),

    name: varchar("name", { length: 255 }).notNull(),
    position: varchar("position", { length: 255 }), // Cargo/função
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 20 }),

    employmentType: text("employmentType").default("own").notNull(), // 'own', 'outsourced'

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
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

export const roles = pgTable(
  "roles",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    systemName: varchar("systemName", { length: 100 }).notNull().unique(),
    displayName: varchar("displayName", { length: 100 }).notNull(),
    description: text("description"),

    // Escopo: global (Black Belt) ou por tenant
    scope: text("scope").default("tenant").notNull(), // 'global', 'tenant'

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    scopeIdx: index("idx_role_scope").on(table.scope),
  })
);

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

// ============================================================================
// PERMISSÕES (granulares)
// ============================================================================

export const permissions = pgTable(
  "permissions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    name: varchar("name", { length: 100 }).notNull().unique(), // ex: "colaboradores.create"
    resource: varchar("resource", { length: 50 }).notNull(), // ex: "colaboradores"
    action: varchar("action", { length: 50 }).notNull(), // ex: "create", "read", "update", "delete"
    description: text("description"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
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

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    roleId: varchar("roleId", { length: 64 }).notNull(),
    permissionId: varchar("permissionId", { length: 64 }).notNull(),
    tenantId: varchar("tenantId", { length: 64 }), // NULL para permissões globais

    // Condições ABAC (JSON): { "sector_id": "uuid", "own_data_only": true }
    conditions: jsonb("conditions"),

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
// USER-ROLE (associação usuário-perfil-tenant)
// ============================================================================

export const userRoles = pgTable(
  "user_roles",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    userId: varchar("userId", { length: 64 }).notNull(),
    roleId: varchar("roleId", { length: 64 }).notNull(),
    tenantId: varchar("tenantId", { length: 64 }), // NULL para roles globais (Black Belt)

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
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

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    tenantId: varchar("tenantId", { length: 64 }), // NULL para ações globais
    userId: varchar("userId", { length: 64 }).notNull(),

    action: varchar("action", { length: 50 }).notNull(), // CREATE, READ, UPDATE, DELETE
    entityType: varchar("entityType", { length: 100 }).notNull(), // tenants, sectors, people, etc.
    entityId: varchar("entityId", { length: 64 }),

    oldValues: jsonb("oldValues"), // Valores antes da mudança
    newValues: jsonb("newValues"), // Valores depois da mudança

    ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 ou IPv6
    userAgent: text("userAgent"),

    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
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

export const dataConsents = pgTable(
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
  (table) => ({
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

export const userInvites = pgTable(
  "user_invites",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    tenantId: varchar("tenantId", { length: 64 }), // NULL para convites Black Belt
    email: varchar("email", { length: 320 }).notNull(),
    roleId: varchar("roleId", { length: 64 }).notNull(),

    token: varchar("token", { length: 255 }).notNull().unique(),
    status: text("status").default("pending").notNull(), // 'pending', 'accepted', 'expired', 'cancelled'

    invitedBy: varchar("invitedBy", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedAt: timestamp("acceptedAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
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

export const clients = pgTable(
  "clients",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),

    name: varchar("name", { length: 255 }).notNull(),
    cnpj: varchar("cnpj", { length: 18 }),
    industry: varchar("industry", { length: 100 }), // Setor da indústria
    companySize: text("companySize"), // 'micro', 'small', 'medium', 'large'

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

    status: text("status").default("active").notNull(), // 'active', 'inactive'

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
// PRECIFICAÇÃO: Serviços Oferecidos
// ============================================================================

export const services = pgTable(
  "services",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),

    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 100 }).notNull(), // Gestão de Riscos, Treinamento, etc.

    unit: text("unit").default("hour").notNull(), // 'hour', 'day', 'project', 'month'

    minPrice: integer("minPrice").notNull(), // Em centavos (ex: 5000 = R$ 50,00)
    maxPrice: integer("maxPrice").notNull(),

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
// PRECIFICAÇÃO: Parâmetros de Precificação (por tenant)
// ============================================================================

export const pricingParameters = pgTable(
  "pricing_parameters",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull().unique(),

    // Custos base
    monthlyFixedCost: integer("monthlyFixedCost").notNull(), // Em centavos
    laborCost: integer("laborCost").notNull(), // Custo de mão de obra por hora em centavos
    productiveHoursPerMonth: integer("productiveHoursPerMonth").notNull(), // Ex: 160 horas

    // Regime tributário padrão
    defaultTaxRegime: text("defaultTaxRegime").default("SN").notNull(), // 'MEI', 'SN', 'LP', 'autonomous'

    // Descontos por volume (JSON)
    volumeDiscounts: jsonb("volumeDiscounts"),

    // Ajustes percentuais
    riskAdjustment: integer("riskAdjustment").default(100).notNull(), // 100 = 1.0x (sem ajuste)
    seniorityAdjustment: integer("seniorityAdjustment").default(100).notNull(),

    // Alíquotas tributárias por regime (em centavos por real)
    taxRates: jsonb("taxRates"),

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
// PRECIFICAÇÃO: Propostas Comerciais
// ============================================================================

export const proposals = pgTable(
  "proposals",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    clientId: varchar("clientId", { length: 64 }).notNull(),

    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    status: text("status").default("draft").notNull(), // 'draft', 'sent', 'accepted', 'rejected', 'expired'

    // Cálculos
    subtotal: integer("subtotal").notNull(), // Em centavos
    discount: integer("discount").default(0).notNull(), // Em centavos
    discountPercent: integer("discountPercent").default(0).notNull(), // Em centavos de percentual
    taxes: integer("taxes").default(0).notNull(), // Em centavos
    totalValue: integer("totalValue").notNull(), // Em centavos

    // Regime tributário utilizado
    taxRegime: text("taxRegime").notNull(), // 'MEI', 'SN', 'LP', 'autonomous'

    // Datas
    validUntil: timestamp("validUntil"),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
    sentAt: timestamp("sentAt"),
    respondedAt: timestamp("respondedAt"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
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

export const proposalItems = pgTable(
  "proposal_items",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    proposalId: varchar("proposalId", { length: 64 }).notNull(),
    serviceId: varchar("serviceId", { length: 64 }).notNull(),

    serviceName: varchar("serviceName", { length: 255 }).notNull(), // Snapshot do nome do serviço

    quantity: integer("quantity").notNull(), // Em centavos de unidade
    unitPrice: integer("unitPrice").notNull(), // Preço por unidade em centavos

    // Cálculos
    subtotal: integer("subtotal").notNull(), // quantity * unitPrice
    technicalHours: integer("technicalHours"), // Horas técnicas (se aplicável)

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
// PRECIFICAÇÃO: Vinculação de Avaliações com Propostas
// ============================================================================

export const assessmentProposals = pgTable(
  "assessment_proposals",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),

    assessmentId: varchar("assessmentId", { length: 64 }).notNull(), // FK para riskAssessments
    proposalId: varchar("proposalId", { length: 64 }).notNull(),

    // Recomendações baseadas em risco
    recommendedServices: jsonb("recommendedServices"), // Array de serviços recomendados
    riskLevel: text("riskLevel").notNull(), // 'low', 'medium', 'high'

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
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

export const plans = pgTable(
  "plans",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    name: varchar("name", { length: 100 }).notNull(), // Starter, Pro, Enterprise
    displayName: varchar("displayName", { length: 100 }).notNull(),
    description: text("description"),

    // Preços em centavos (BRL)
    monthlyPrice: integer("monthlyPrice").notNull(),
    yearlyPrice: integer("yearlyPrice").notNull(),

    // Limites
    maxTenants: integer("maxTenants").notNull(), // -1 = ilimitado
    maxUsersPerTenant: integer("maxUsersPerTenant").notNull(), // -1 = ilimitado
    maxStorageGB: integer("maxStorageGB").notNull(), // -1 = ilimitado
    maxApiRequestsPerDay: integer("maxApiRequestsPerDay").notNull(), // -1 = ilimitado

    // Flags de funcionalidades
    hasAdvancedReports: boolean("hasAdvancedReports").default(false).notNull(),
    hasApiAccess: boolean("hasApiAccess").default(false).notNull(),
    hasWebhooks: boolean("hasWebhooks").default(false).notNull(),
    hasWhiteLabel: boolean("hasWhiteLabel").default(false).notNull(),
    hasPrioritySupport: boolean("hasPrioritySupport").default(false).notNull(),
    hasSLA: boolean("hasSLA").default(false).notNull(),

    // Nível de SLA (em porcentagem de uptime)
    slaUptime: integer("slaUptime"), // Ex: 999 = 99.9%

    // Período de trial (em dias)
    trialDays: integer("trialDays").default(14).notNull(),

    // Status
    isActive: boolean("isActive").default(true).notNull(),
    isPublic: boolean("isPublic").default(true).notNull(),

    // Ordenação para exibição
    sortOrder: integer("sortOrder").default(0).notNull(),

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
// MONETIZAÇÃO: Assinaturas dos Tenants
// ============================================================================

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull().unique(),
    planId: varchar("planId", { length: 64 }).notNull(),

    // Status da assinatura
    status: text("status").default("trialing").notNull(), // 'trialing', 'active', 'past_due', 'canceled', 'unpaid'

    // Período de cobrança
    billingCycle: text("billingCycle").default("monthly").notNull(), // 'monthly', 'yearly'

    // Datas
    startDate: timestamp("startDate").defaultNow().notNull(),
    currentPeriodStart: timestamp("currentPeriodStart").notNull(),
    currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
    trialEnd: timestamp("trialEnd"),
    canceledAt: timestamp("canceledAt"),
    endedAt: timestamp("endedAt"),

    // Integração com gateway de pagamento
    stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
    stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
    mercadoPagoSubscriptionId: varchar("mercadoPagoSubscriptionId", {
      length: 255,
    }),

    // Preço praticado
    currentPrice: integer("currentPrice").notNull(),

    // Flags
    autoRenew: boolean("autoRenew").default(true).notNull(),
    cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
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

export const invoices = pgTable(
  "invoices",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    subscriptionId: varchar("subscriptionId", { length: 64 }).notNull(),

    // Identificadores externos
    stripeInvoiceId: varchar("stripeInvoiceId", { length: 255 }),
    mercadoPagoInvoiceId: varchar("mercadoPagoInvoiceId", { length: 255 }),

    // Valores em centavos
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").default(0).notNull(),
    tax: integer("tax").default(0).notNull(),
    total: integer("total").notNull(),

    // Status
    status: text("status").default("draft").notNull(), // 'draft', 'open', 'paid', 'void', 'uncollectible'

    // Descrição
    description: text("description"),

    // Datas
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    dueDate: timestamp("dueDate"),
    paidAt: timestamp("paidAt"),

    // Método de pagamento
    paymentMethod: varchar("paymentMethod", { length: 50 }),

    // URL da fatura
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
// MONETIZAÇÃO: Uso e Métricas
// ============================================================================

export const usageMetrics = pgTable(
  "usage_metrics",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),

    // Período de medição
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),

    // Métricas
    activeUsers: integer("activeUsers").default(0).notNull(),
    storageUsedGB: integer("storageUsedGB").default(0).notNull(),
    apiRequests: integer("apiRequests").default(0).notNull(),
    assessmentsCreated: integer("assessmentsCreated").default(0).notNull(),
    proposalsGenerated: integer("proposalsGenerated").default(0).notNull(),

    // Metadata JSON
    additionalMetrics: jsonb("additionalMetrics"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantPeriodIdx: index("idx_usage_tenant_period").on(
      table.tenantId,
      table.periodStart
    ),
  })
);

export type UsageMetric = typeof usageMetrics.$inferSelect;
export type InsertUsageMetric = typeof usageMetrics.$inferInsert;

// ============================================================================
// MONETIZAÇÃO: Features Flags
// ============================================================================

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: varchar("id", { length: 64 }).primaryKey(),

    name: varchar("name", { length: 100 }).notNull().unique(),
    displayName: varchar("displayName", { length: 100 }).notNull(),
    description: text("description"),

    // Tipo de feature
    category: text("category").default("core").notNull(), // 'core', 'reports', etc.

    // Status
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
// MONETIZAÇÃO: Associação Plan-Features
// ============================================================================

export const planFeatures = pgTable(
  "plan_features",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    planId: varchar("planId", { length: 64 }).notNull(),
    featureId: varchar("featureId", { length: 64 }).notNull(),

    // Flags
    isEnabled: boolean("isEnabled").default(true).notNull(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
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

export const pdfExports = pgTable(
  "pdf_exports",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    userId: varchar("userId", { length: 64 }).notNull(),

    // Tipo de documento
    documentType: text("documentType").notNull(), // 'proposal', 'assessment', etc.

    // Referência ao documento original
    documentId: varchar("documentId", { length: 64 }).notNull(),

    // Informações do arquivo
    filename: varchar("filename", { length: 255 }).notNull(),
    fileSize: integer("fileSize").notNull(),
    mimeType: varchar("mimeType", { length: 100 }).default("application/pdf").notNull(),

    // URLs de armazenamento
    s3Key: varchar("s3Key", { length: 500 }),
    s3Bucket: varchar("s3Bucket", { length: 100 }),
    url: varchar("url", { length: 1000 }),

    // Status
    status: text("status").default("pending").notNull(), // 'pending', 'processing', etc.

    // Metadados
    metadata: jsonb("metadata"),
    errorMessage: text("errorMessage"),

    // Branding
    brandingApplied: boolean("brandingApplied").default(false).notNull(),
    customLogo: varchar("customLogo", { length: 500 }),
    customColors: jsonb("customColors"),

    // Envio por email
    emailSent: boolean("emailSent").default(false).notNull(),
    emailTo: varchar("emailTo", { length: 320 }),
    emailSentAt: timestamp("emailSentAt"),

    // Expiração
    expiresAt: timestamp("expiresAt"),

    // Download tracking
    downloadCount: integer("downloadCount").default(0).notNull(),
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
// PHASE 6: WEBHOOKS E API PÚBLICA
// ============================================================================

export const webhooks = pgTable(
  "webhooks",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    
    name: varchar("name", { length: 255 }).notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    secret: varchar("secret", { length: 128 }).notNull(),
    events: jsonb("events").notNull(),
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

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    webhookId: varchar("webhookId", { length: 64 }).notNull(),
    
    eventType: varchar("eventType", { length: 100 }).notNull(),
    payload: jsonb("payload").notNull(),
    
    responseStatus: integer("responseStatus"),
    responseBody: text("responseBody"),
    responseHeaders: jsonb("responseHeaders"),
    
    deliveredAt: timestamp("deliveredAt"),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("maxAttempts").default(5).notNull(),
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

export const apiKeys = pgTable(
  "api_keys",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    
    name: varchar("name", { length: 255 }).notNull(),
    keyHash: varchar("keyHash", { length: 64 }).notNull().unique(),
    keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(),
    scopes: jsonb("scopes").notNull(),
    
    lastUsedAt: timestamp("lastUsedAt"),
    expiresAt: timestamp("expiresAt"),
    active: boolean("active").default(true).notNull(),
    description: text("description"),
    rateLimit: integer("rateLimit"),
    
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

export const apiKeyUsage = pgTable(
  "api_key_usage",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    apiKeyId: varchar("apiKeyId", { length: 64 }).notNull(),
    
    endpoint: varchar("endpoint", { length: 255 }).notNull(),
    method: varchar("method", { length: 10 }).notNull(),
    statusCode: integer("statusCode").notNull(),
    requestDuration: integer("requestDuration"),
    
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

export const user2FA = pgTable(
  "user_2fa",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("userId", { length: 64 }).notNull().unique(),
    
    secret: varchar("secret", { length: 128 }).notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    backupCodes: jsonb("backupCodes"),
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

export const ipWhitelist = pgTable(
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

export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: varchar("userId", { length: 64 }).notNull(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    
    token: varchar("token", { length: 255 }).notNull().unique(),
    ipAddress: varchar("ipAddress", { length: 45 }),
    userAgent: varchar("userAgent", { length: 500 }),
    deviceInfo: jsonb("deviceInfo"),
    
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

export const securityAlerts = pgTable(
  "security_alerts",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    userId: varchar("userId", { length: 64 }),
    
    alertType: varchar("alertType", { length: 50 }).notNull(),
    severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
    message: text("message").notNull(),
    metadata: jsonb("metadata"),
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

export const loginAttempts = pgTable(
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

export const onboardingProgress = pgTable(
  "onboarding_progress",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    tenantId: varchar("tenantId", { length: 64 }).notNull(),
    
    currentStep: integer("currentStep").default(1).notNull(),
    completedSteps: jsonb("completedSteps").notNull(),
    checklistItems: jsonb("checklistItems").notNull(),
    
    skipped: boolean("skipped").default(false).notNull(),
    completedAt: timestamp("completedAt"),
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    tenantIdx: unique("idx_onboarding_tenant").on(table.tenantId),
    completedIdx: index("idx_onboarding_completed").on(table.completedAt),
    skippedIdx: index("idx_onboarding_skipped").on(table.skipped),
  })
);

export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type InsertOnboardingProgress = typeof onboardingProgress.$inferInsert;

export const industryTemplates = pgTable(
  "industry_templates",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),
    icon: varchar("icon", { length: 50 }),
    
    configuration: jsonb("configuration").notNull(),
    sampleData: jsonb("sampleData"),
    features: jsonb("features"),
    
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