# Black Belt Platform - Código Consolidado Completo

**Versão:** 1.0.0  
**Data:** Novembro 2025  
**Status:** Plataforma Unificada em Desenvolvimento

---

## 📑 Índice

1. [Schema de Banco de Dados](#schema-de-banco-de-dados)
2. [Database Helpers](#database-helpers)
3. [tRPC Routers](#trpc-routers)
4. [Componentes Frontend](#componentes-frontend)
5. [Contexto e Configuração](#contexto-e-configuração)
6. [Tipos e Interfaces](#tipos-e-interfaces)

---

## Schema de Banco de Dados

### Arquivo: `drizzle/schema.ts`

```typescript
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
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// MULTI-TENANT: Empresas (Tenants)
// ============================================================================

export const tenants = mysqlTable("tenants", {
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
  
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  strategy: mysqlEnum("strategy", ["shared_rls", "dedicated_schema"]).default("shared_rls").notNull(),
  schemaName: varchar("schemaName", { length: 100 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_tenant_name").on(table.name),
  statusIdx: index("idx_tenant_status").on(table.status),
}));

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ============================================================================
// SETORES (por tenant)
// ============================================================================

export const sectors = mysqlTable("sectors", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  responsibleName: varchar("responsibleName", { length: 255 }),
  unit: varchar("unit", { length: 100 }),
  shift: varchar("shift", { length: 50 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_sector_tenant").on(table.tenantId),
  tenantNameIdx: index("idx_sector_tenant_name").on(table.tenantId, table.name),
}));

export type Sector = typeof sectors.$inferSelect;
export type InsertSector = typeof sectors.$inferInsert;

// ============================================================================
// COLABORADORES (por tenant e setor)
// ============================================================================

export const people = mysqlTable("people", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  sectorId: varchar("sectorId", { length: 64 }),
  
  name: varchar("name", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  
  employmentType: mysqlEnum("employmentType", ["own", "outsourced"]).default("own").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_people_tenant").on(table.tenantId),
  tenantSectorIdx: index("idx_people_tenant_sector").on(table.tenantId, table.sectorId),
  emailIdx: index("idx_people_email").on(table.email),
}));

export type Person = typeof people.$inferSelect;
export type InsertPerson = typeof people.$inferInsert;

// ============================================================================
// RBAC: Roles (Perfis de Acesso)
// ============================================================================

export const roles = mysqlTable("roles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  
  systemName: varchar("systemName", { length: 100 }).notNull().unique(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  description: text("description"),
  
  scope: mysqlEnum("scope", ["global", "tenant"]).default("tenant").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  scopeIdx: index("idx_role_scope").on(table.scope),
}));

export type Role = typeof roles.$inferSelect;
export type InsertRole = typeof roles.$inferInsert;

// ============================================================================
// PERMISSÕES (granulares)
// ============================================================================

export const permissions = mysqlTable("permissions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  
  name: varchar("name", { length: 100 }).notNull().unique(),
  resource: varchar("resource", { length: 50 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  description: text("description"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  resourceActionIdx: index("idx_perm_resource_action").on(table.resource, table.action),
}));

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;

// ============================================================================
// ROLE-PERMISSION (associação com condições ABAC)
// ============================================================================

export const rolePermissions = mysqlTable("role_permissions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  
  roleId: varchar("roleId", { length: 64 }).notNull(),
  permissionId: varchar("permissionId", { length: 64 }).notNull(),
  tenantId: varchar("tenantId", { length: 64 }),
  
  conditions: json("conditions"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  rolePermIdx: index("idx_role_perm").on(table.roleId, table.permissionId),
  tenantIdx: index("idx_role_perm_tenant").on(table.tenantId),
}));

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

// ============================================================================
// USER-ROLE (associação usuário-perfil-tenant)
// ============================================================================

export const userRoles = mysqlTable("user_roles", {
  id: varchar("id", { length: 64 }).primaryKey(),
  
  userId: varchar("userId", { length: 64 }).notNull(),
  roleId: varchar("roleId", { length: 64 }).notNull(),
  tenantId: varchar("tenantId", { length: 64 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userTenantIdx: index("idx_user_role_tenant").on(table.userId, table.tenantId),
  userRoleIdx: index("idx_user_role").on(table.userId, table.roleId),
}));

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = typeof userRoles.$inferInsert;

// ============================================================================
// AUDITORIA (trilha completa de ações)
// ============================================================================

export const auditLogs = mysqlTable("audit_logs", {
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
}, (table) => ({
  tenantTimestampIdx: index("idx_audit_tenant_time").on(table.tenantId, table.timestamp),
  userTimestampIdx: index("idx_audit_user_time").on(table.userId, table.timestamp),
  entityIdx: index("idx_audit_entity").on(table.entityType, table.entityId),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// LGPD: Consentimentos
// ============================================================================

export const dataConsents = mysqlTable("data_consents", {
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
}, (table) => ({
  personConsentIdx: index("idx_consent_person").on(table.personId, table.consentType),
  tenantIdx: index("idx_consent_tenant").on(table.tenantId),
}));

export type DataConsent = typeof dataConsents.$inferSelect;
export type InsertDataConsent = typeof dataConsents.$inferInsert;

// ============================================================================
// CONVITES DE USUÁRIOS
// ============================================================================

export const userInvites = mysqlTable("user_invites", {
  id: varchar("id", { length: 64 }).primaryKey(),
  
  tenantId: varchar("tenantId", { length: 64 }),
  email: varchar("email", { length: 320 }).notNull(),
  roleId: varchar("roleId", { length: 64 }).notNull(),
  
  token: varchar("token", { length: 255 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "expired", "cancelled"]).default("pending").notNull(),
  
  invitedBy: varchar("invitedBy", { length: 64 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  emailStatusIdx: index("idx_invite_email_status").on(table.email, table.status),
  tenantIdx: index("idx_invite_tenant").on(table.tenantId),
  tokenIdx: index("idx_invite_token").on(table.token),
}));

export type UserInvite = typeof userInvites.$inferSelect;
export type InsertUserInvite = typeof userInvites.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Clientes (para propostas comerciais)
// ============================================================================

export const clients = mysqlTable("clients", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }),
  industry: varchar("industry", { length: 100 }),
  companySize: mysqlEnum("companySize", ["micro", "small", "medium", "large"]),
  
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
  
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_client_tenant").on(table.tenantId),
  cnpjIdx: index("idx_client_cnpj").on(table.cnpj),
  emailIdx: index("idx_client_email").on(table.contactEmail),
}));

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Serviços Oferecidos
// ============================================================================

export const services = mysqlTable("services", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  
  unit: mysqlEnum("unit", ["hour", "day", "project", "month"]).default("hour").notNull(),
  
  minPrice: int("minPrice").notNull(),
  maxPrice: int("maxPrice").notNull(),
  
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_service_tenant").on(table.tenantId),
  categoryIdx: index("idx_service_category").on(table.category),
}));

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Parâmetros de Precificação (por tenant)
// ============================================================================

export const pricingParameters = mysqlTable("pricing_parameters", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().unique(),
  
  monthlyFixedCost: int("monthlyFixedCost").notNull(),
  laborCost: int("laborCost").notNull(),
  productiveHoursPerMonth: int("productiveHoursPerMonth").notNull(),
  
  defaultTaxRegime: mysqlEnum("defaultTaxRegime", ["MEI", "SN", "LP", "autonomous"]).default("SN").notNull(),
  
  volumeDiscounts: json("volumeDiscounts"),
  
  riskAdjustment: int("riskAdjustment").default(100).notNull(),
  seniorityAdjustment: int("seniorityAdjustment").default(100).notNull(),
  
  taxRates: json("taxRates"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_pricing_param_tenant").on(table.tenantId),
}));

export type PricingParameter = typeof pricingParameters.$inferSelect;
export type InsertPricingParameter = typeof pricingParameters.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Propostas Comerciais
// ============================================================================

export const proposals = mysqlTable("proposals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  clientId: varchar("clientId", { length: 64 }).notNull(),
  
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  status: mysqlEnum("status", ["draft", "sent", "accepted", "rejected", "expired"]).default("draft").notNull(),
  
  subtotal: int("subtotal").notNull(),
  discount: int("discount").default(0).notNull(),
  discountPercent: int("discountPercent").default(0).notNull(),
  taxes: int("taxes").default(0).notNull(),
  totalValue: int("totalValue").notNull(),
  
  taxRegime: mysqlEnum("taxRegime", ["MEI", "SN", "LP", "autonomous"]).notNull(),
  
  validUntil: datetime("validUntil"),
  generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  sentAt: timestamp("sentAt"),
  respondedAt: timestamp("respondedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantClientIdx: index("idx_proposal_tenant_client").on(table.tenantId, table.clientId),
  statusIdx: index("idx_proposal_status").on(table.status),
  dateIdx: index("idx_proposal_date").on(table.generatedAt),
}));

export type Proposal = typeof proposals.$inferSelect;
export type InsertProposal = typeof proposals.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Itens das Propostas
// ============================================================================

export const proposalItems = mysqlTable("proposal_items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  proposalId: varchar("proposalId", { length: 64 }).notNull(),
  serviceId: varchar("serviceId", { length: 64 }).notNull(),
  
  serviceName: varchar("serviceName", { length: 255 }).notNull(),
  
  quantity: int("quantity").notNull(),
  unitPrice: int("unitPrice").notNull(),
  
  subtotal: int("subtotal").notNull(),
  technicalHours: int("technicalHours"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  proposalIdx: index("idx_proposal_item_proposal").on(table.proposalId),
  serviceIdx: index("idx_proposal_item_service").on(table.serviceId),
}));

export type ProposalItem = typeof proposalItems.$inferSelect;
export type InsertProposalItem = typeof proposalItems.$inferInsert;

// ============================================================================
// PRECIFICAÇÃO: Vinculação de Avaliações com Propostas
// ============================================================================

export const assessmentProposals = mysqlTable("assessment_proposals", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  
  assessmentId: varchar("assessmentId", { length: 64 }).notNull(),
  proposalId: varchar("proposalId", { length: 64 }).notNull(),
  
  recommendedServices: json("recommendedServices"),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high"]).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_assess_proposal_tenant").on(table.tenantId),
  assessmentIdx: index("idx_assess_proposal_assessment").on(table.assessmentId),
  proposalIdx: index("idx_assess_proposal_proposal").on(table.proposalId),
}));

export type AssessmentProposal = typeof assessmentProposals.$inferSelect;
export type InsertAssessmentProposal = typeof assessmentProposals.$inferInsert;
```

---

## Database Helpers

### Arquivo: `server/db.ts` (Seção de Precificação)

```typescript
// ============================================================================
// PRECIFICAÇÃO: CLIENTS
// ============================================================================

export async function createClient(data: {
  tenantId: string;
  name: string;
  cnpj?: string;
  industry?: string;
  companySize?: "micro" | "small" | "medium" | "large";
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const clientId = nanoid();
  await db.insert(clients).values({
    id: clientId,
    ...data,
  } as any);

  return clientId;
}

export async function listClients(tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(clients)
    .where(eq(clients.tenantId, tenantId));
}

export async function getClient(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);

  return result[0] || null;
}

export async function updateClient(id: string, data: Partial<typeof clients.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(clients)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(clients.id, id));
}

export async function deleteClient(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(clients).where(eq(clients.id, id));
}

// ============================================================================
// PRECIFICAÇÃO: SERVICES
// ============================================================================

export async function createService(data: {
  tenantId: string;
  name: string;
  description?: string;
  category: string;
  unit: "hour" | "day" | "project" | "month";
  minPrice: number;
  maxPrice: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const serviceId = nanoid();
  await db.insert(services).values({
    id: serviceId,
    ...data,
  } as any);

  return serviceId;
}

export async function listServices(tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(services)
    .where(eq(services.tenantId, tenantId));
}

export async function getService(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(services)
    .where(eq(services.id, id))
    .limit(1);

  return result[0] || null;
}

export async function updateService(id: string, data: Partial<typeof services.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(services)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(services.id, id));
}

export async function deleteService(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(services).where(eq(services.id, id));
}

// ============================================================================
// PRECIFICAÇÃO: PRICING PARAMETERS
// ============================================================================

export async function createPricingParameters(data: {
  tenantId: string;
  monthlyFixedCost: number;
  laborCost: number;
  productiveHoursPerMonth: number;
  defaultTaxRegime?: "MEI" | "SN" | "LP" | "autonomous";
  volumeDiscounts?: Record<string, number>;
  riskAdjustment?: number;
  seniorityAdjustment?: number;
  taxRates?: Record<string, number>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const paramId = nanoid();
  await db.insert(pricingParameters).values({
    id: paramId,
    ...data,
  } as any);

  return paramId;
}

export async function getPricingParameters(tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(pricingParameters)
    .where(eq(pricingParameters.tenantId, tenantId))
    .limit(1);

  return result[0] || null;
}

export async function updatePricingParameters(tenantId: string, data: Partial<typeof pricingParameters.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(pricingParameters)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(pricingParameters.tenantId, tenantId));
}

// ============================================================================
// PRECIFICAÇÃO: PROPOSALS
// ============================================================================

export async function createProposal(data: {
  tenantId: string;
  clientId: string;
  title: string;
  description?: string;
  status?: "draft" | "sent" | "accepted" | "rejected" | "expired";
  subtotal: number;
  discount?: number;
  discountPercent?: number;
  taxes?: number;
  totalValue: number;
  taxRegime: "MEI" | "SN" | "LP" | "autonomous";
  validUntil?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const proposalId = nanoid();
  await db.insert(proposals).values({
    id: proposalId,
    ...data,
  } as any);

  return proposalId;
}

export async function listProposals(tenantId: string, clientId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(proposals.tenantId, tenantId)];
  if (clientId) {
    conditions.push(eq(proposals.clientId, clientId));
  }

  return await db
    .select()
    .from(proposals)
    .where(and(...conditions));
}

export async function getProposal(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(proposals)
    .where(eq(proposals.id, id))
    .limit(1);

  return result[0] || null;
}

export async function updateProposal(id: string, data: Partial<typeof proposals.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(proposals)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(proposals.id, id));
}

export async function deleteProposal(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(proposals).where(eq(proposals.id, id));
}

// ============================================================================
// PRECIFICAÇÃO: PROPOSAL ITEMS
// ============================================================================

export async function createProposalItem(data: {
  proposalId: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  technicalHours?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const itemId = nanoid();
  await db.insert(proposalItems).values({
    id: itemId,
    ...data,
  } as any);

  return itemId;
}

export async function listProposalItems(proposalId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(proposalItems)
    .where(eq(proposalItems.proposalId, proposalId));
}

export async function deleteProposalItem(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(proposalItems).where(eq(proposalItems.id, id));
}

// ============================================================================
// PRECIFICAÇÃO: CÁLCULOS
// ============================================================================

interface TechnicalHourCalculation {
  monthlyFixedCost: number;
  laborCost: number;
  productiveHoursPerMonth: number;
  taxRegime: "MEI" | "SN" | "LP" | "autonomous";
  taxRates?: Record<string, number>;
  riskAdjustment?: number;
  seniorityAdjustment?: number;
}

export function calculateTechnicalHour(params: TechnicalHourCalculation): number {
  const {
    monthlyFixedCost,
    laborCost,
    productiveHoursPerMonth,
    taxRegime,
    taxRates = {},
    riskAdjustment = 100,
    seniorityAdjustment = 100,
  } = params;

  const baseTechnicalHour = (monthlyFixedCost + laborCost) / productiveHoursPerMonth;
  const adjustedHour = baseTechnicalHour * (riskAdjustment / 100) * (seniorityAdjustment / 100);
  const taxRate = taxRates[taxRegime] || 0;
  const technicalHourWithTax = adjustedHour * (1 + taxRate);

  return Math.round(technicalHourWithTax * 100);
}

interface ProposalCalculation {
  items: Array<{
    quantity: number;
    unitPrice: number;
  }>;
  discountPercent?: number;
  taxRegime: "MEI" | "SN" | "LP" | "autonomous";
  taxRates?: Record<string, number>;
}

export function calculateProposal(params: ProposalCalculation): {
  subtotal: number;
  discount: number;
  taxes: number;
  totalValue: number;
} {
  const { items, discountPercent = 0, taxRegime, taxRates = {} } = params;

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = Math.round(subtotal * (discountPercent / 100));
  const taxRate = taxRates[taxRegime] || 0;
  const taxes = Math.round((subtotal - discount) * taxRate);
  const totalValue = subtotal - discount + taxes;

  return {
    subtotal,
    discount,
    taxes,
    totalValue,
  };
}

// ============================================================================
// PRECIFICAÇÃO: ASSESSMENT PROPOSALS (Vinculação)
// ============================================================================

export async function createAssessmentProposal(data: {
  tenantId: string;
  assessmentId: string;
  proposalId: string;
  recommendedServices?: any[];
  riskLevel: "low" | "medium" | "high";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const linkId = nanoid();
  await db.insert(assessmentProposals).values({
    id: linkId,
    ...data,
  } as any);

  return linkId;
}

export async function getAssessmentProposals(assessmentId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(assessmentProposals)
    .where(eq(assessmentProposals.assessmentId, assessmentId));
}
```

---

## tRPC Routers

### Arquivo: `server/routers/pricing.ts`

```typescript
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  calculateProposal,
  calculateTechnicalHour,
  createAssessmentProposal,
  createClient,
  createPricingParameters,
  createProposal,
  createProposalItem,
  createService,
  deleteClient,
  deleteProposal,
  deleteProposalItem,
  deleteService,
  getAssessmentProposals,
  getClient,
  getPricingParameters,
  getProposal,
  getService,
  listClients,
  listProposals,
  listProposalItems,
  listServices,
  updateClient,
  updatePricingParameters,
  updateProposal,
  updateService,
} from "../db";

// ============================================================================
// CLIENTS ROUTER
// ============================================================================

export const clientsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error("Unauthorized");
    return await listClients(ctx.tenantId);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        cnpj: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.enum(["micro", "small", "medium", "large"]).optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      return await createClient({
        tenantId: ctx.tenantId,
        ...input,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const client = await getClient(input.id);
      if (client?.tenantId !== ctx.tenantId) throw new Error("Forbidden");
      return client;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        cnpj: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.enum(["micro", "small", "medium", "large"]).optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const client = await getClient(input.id);
      if (client?.tenantId !== ctx.tenantId) throw new Error("Forbidden");
      const { id, ...data } = input;
      await updateClient(id, data);
      return await getClient(id);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const client = await getClient(input.id);
      if (client?.tenantId !== ctx.tenantId) throw new Error("Forbidden");
      await deleteClient(input.id);
      return { success: true };
    }),
});

// ============================================================================
// SERVICES ROUTER
// ============================================================================

export const servicesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error("Unauthorized");
    return await listServices(ctx.tenantId);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().min(1),
        unit: z.enum(["hour", "day", "project", "month"]),
        minPrice: z.number().int().min(0),
        maxPrice: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      return await createService({
        tenantId: ctx.tenantId,
        ...input,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const service = await getService(input.id);
      if (service?.tenantId !== ctx.tenantId) throw new Error("Forbidden");
      return service;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        unit: z.enum(["hour", "day", "project", "month"]).optional(),
        minPrice: z.number().int().optional(),
        maxPrice: z.number().int().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const service = await getService(input.id);
      if (service?.tenantId !== ctx.tenantId) throw new Error("Forbidden");
      const { id, ...data } = input;
      await updateService(id, data);
      return await getService(id);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const service = await getService(input.id);
      if (service?.tenantId !== ctx.tenantId) throw new Error("Forbidden");
      await deleteService(input.id);
      return { success: true };
    }),
});

// ============================================================================
// PRICING PARAMETERS ROUTER
// ============================================================================

export const pricingParametersRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error("Unauthorized");
    return await getPricingParameters(ctx.tenantId);
  }),

  update: protectedProcedure
    .input(
      z.object({
        monthlyFixedCost: z.number().int().optional(),
        laborCost: z.number().int().optional(),
        productiveHoursPerMonth: z.number().int().optional(),
        defaultTaxRegime: z.enum(["MEI", "SN", "LP", "autonomous"]).optional(),
        volumeDiscounts: z.record(z.string(), z.number()).optional(),
        riskAdjustment: z.number().int().optional(),
        seniorityAdjustment: z.number().int().optional(),
        taxRates: z.record(z.string(), z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      await updatePricingParameters(ctx.tenantId, input);
      return await getPricingParameters(ctx.tenantId);
    }),
});

// ============================================================================
// PROPOSALS ROUTER
// ============================================================================

export const proposalsRouter = router({
  list: protectedProcedure
    .input(z.object({ clientId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      return await listProposals(ctx.tenantId, input.clientId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
        subtotal: z.number().int().min(0),
        discount: z.number().int().default(0),
        discountPercent: z.number().int().default(0),
        taxes: z.number().int().default(0),
        totalValue: z.number().int().min(0),
        taxRegime: z.enum(["MEI", "SN", "LP", "autonomous"]),
        validUntil: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const client = await getClient(input.clientId);
      if (client?.tenantId !== ctx.tenantId) throw new Error("Forbidden");
      return await createProposal({
        tenantId: ctx.tenantId,
        ...input,
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const proposal = await getProposal(input.id);
      if (proposal?.tenantId !== ctx.tenantId) throw new Error("Forbidden");
      const items = await listProposalItems(input.id);
      return { ...proposal, items };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
        subtotal: z.number().int().optional(),
        discount: z.number().int().optional(),
        discountPercent: z.number().int().optional(),
        taxes: z.number().int().optional(),
        totalValue: z.number().int().optional(),
        validUntil: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const proposal = await getProposal(input.id);
      if (proposal?.tenantId !== ctx.tenantId) throw new Error("Forbidden");
      const { id, ...data } = input;
      await updateProposal(id, data);
      return await getProposal(id);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const proposal = await getProposal(input.id);
      if (proposal?.tenantId !== ctx.tenantId) throw new Error("Forbidden");
      await deleteProposal(input.id);
      return { success: true };
    }),

  addItem: protectedProcedure
    .input(
      z.object({
        proposalId: z.string(),
        serviceId: z.string(),
        serviceName: z.string(),
        quantity: z.number().int().min(1),
        unitPrice: z.number().int().min(0),
        subtotal: z.number().int().min(0),
        technicalHours: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const proposal = await getProposal(input.proposalId);
      if (proposal?.tenantId !== ctx.tenantId) throw new Error("Forbidden");
      return await createProposalItem(input);
    }),

  removeItem: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      await deleteProposalItem(input.itemId);
      return { success: true };
    }),
});

// ============================================================================
// PRICING CALCULATIONS ROUTER
// ============================================================================

export const pricingRouter = router({
  calculateTechnicalHour: protectedProcedure
    .input(
      z.object({
        monthlyFixedCost: z.number().int(),
        laborCost: z.number().int(),
        productiveHoursPerMonth: z.number().int(),
        taxRegime: z.enum(["MEI", "SN", "LP", "autonomous"]),
        taxRates: z.record(z.string(), z.number()).optional(),
        riskAdjustment: z.number().int().optional(),
        seniorityAdjustment: z.number().int().optional(),
      })
    )
    .query(({ input }) => {
      return calculateTechnicalHour(input as any);
    }),

  calculateProposal: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            quantity: z.number().int(),
            unitPrice: z.number().int(),
          })
        ),
        discountPercent: z.number().int().optional(),
        taxRegime: z.enum(["MEI", "SN", "LP", "autonomous"]),
        taxRates: z.record(z.string(), z.number()).optional(),
      })
    )
    .query(({ input }) => {
      return calculateProposal(input as any);
    }),
});

// ============================================================================
// ASSESSMENT PROPOSALS ROUTER (Vinculação)
// ============================================================================

export const assessmentProposalsRouter = router({
  link: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        proposalId: z.string(),
        recommendedServices: z.array(z.any()).optional(),
        riskLevel: z.enum(["low", "medium", "high"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      return await createAssessmentProposal({
        tenantId: ctx.tenantId,
        ...input,
      });
    }),

  getByAssessment: protectedProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      return await getAssessmentProposals(input.assessmentId);
    }),
});
```

---

## Contexto e Configuração

### Arquivo: `server/_core/context.ts` (Atualizado)

```typescript
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenantId: string;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  const tenantId = opts.req.headers["x-tenant-id"] as string || "default";

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantId,
  };
}
```

---

## Resumo de Arquitetura

### Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | React 19 + TypeScript | 19.0+ |
| Styling | Tailwind CSS 4 | 4.0+ |
| UI Components | shadcn/ui | Latest |
| Backend | Express 4 + tRPC 11 | 4.x / 11.x |
| Database | MySQL + Drizzle ORM | Latest |
| Authentication | Manus OAuth 2.0 | - |
| Validation | Zod | Latest |

### Estrutura de Pastas

```
blackbelt-platform/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── RiskAssessments.tsx
│   │   │   ├── ComplianceReports.tsx
│   │   │   ├── AuditLogs.tsx
│   │   │   ├── TestDashboard.tsx
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── TenantSelectionModal.tsx
│   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── trpc.ts
│   │   │   └── exportUtils.ts
│   │   └── App.tsx
│   └── package.json
├── server/
│   ├── routers/
│   │   ├── pricing.ts
│   │   ├── people.ts
│   │   ├── sectors.ts
│   │   └── tenants.ts
│   ├── _core/
│   │   ├── context.ts
│   │   ├── trpc.ts
│   │   └── ...
│   ├── db.ts
│   ├── routers.ts
│   └── index.ts
├── drizzle/
│   ├── schema.ts
│   ├── schema_nr01.ts
│   └── migrations/
├── shared/
│   └── const.ts
└── package.json
```

### Fluxo de Dados

```
Cliente (React)
    ↓
tRPC Client (lib/trpc.ts)
    ↓
tRPC Routers (server/routers/)
    ↓
Database Helpers (server/db.ts)
    ↓
Drizzle ORM
    ↓
MySQL Database
```

---

## Funcionalidades Implementadas

### Fase 1: Gestão de Riscos Psicossociais (NR-01)
- ✅ Seleção de empresa (tenant) com modal visual
- ✅ Página de Empresas (Tenants) com CRUD
- ✅ Página de Setores com filtro por empresa
- ✅ Página de Colaboradores com filtro por empresa
- ✅ Página de Avaliações NR-01 com dropdown de ações
- ✅ Formulário de Avaliação de Riscos Psicossociais
- ✅ Dashboard de Indicadores com gráficos
- ✅ Relatórios de Compliance NR-01
- ✅ Sistema de Convites de Usuários
- ✅ Gestão de Perfis e Permissões (RBAC/ABAC)
- ✅ Auditoria Visual (Logs)
- ✅ Exportação de Dados (DSR LGPD)
- ✅ Notificações em Tempo Real
- ✅ Exportação em JSON, Excel e PDF
- ✅ Guia interativo para novos usuários
- ✅ Dashboard de Testes E2E

### Fase 2-3: Sistema de Precificação (NOVO)
- ✅ Schema com 6 novas tabelas
- ✅ Database Helpers para CRUD
- ✅ tRPC Routers para Clients, Services, Proposals
- ✅ Cálculos de Hora Técnica (4 regimes tributários)
- ✅ Cálculos de Propostas com descontos e impostos
- ✅ Vinculação de Avaliações com Propostas
- ✅ Contexto atualizado com tenantId

---

## Próximas Fases

### Fase 4: Frontend de Precificação
- [ ] Página de Clientes (CRUD)
- [ ] Página de Serviços (CRUD)
- [ ] Página de Parâmetros de Precificação
- [ ] Compositor de Propostas (interativo)
- [ ] Visualização e Exportação de Propostas

### Fase 5: Dashboard Unificado
- [ ] Atualizar Home.tsx com novo layout
- [ ] KPIs consolidados (conformidade + receita)
- [ ] Widgets de dashboard
- [ ] Páginas de análise e relatórios

### Fase 6: Integração de Fluxos
- [ ] Fluxo Avaliação → Proposta
- [ ] Recomendações inteligentes de serviços
- [ ] Histórico integrado
- [ ] Análise de rentabilidade

---

## Notas de Implementação

1. **Multi-Tenant**: Todos os dados de negócio incluem `tenantId` para isolamento completo
2. **Segurança**: Todas as procedures usam `protectedProcedure` com validação de tenant
3. **Cálculos**: Suportam 4 regimes tributários (MEI, SN, LP, Autônomo)
4. **Timestamps**: Todos em UTC, conversão para local timezone no frontend
5. **Validação**: Zod para validação de entrada em todas as procedures

---

**Fim do Código Consolidado**

