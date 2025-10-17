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

// Exportar schemas NR-01
export * from "./schema_nr01";

// ============================================================================
// MULTI-TENANT: Empresas (Tenants)
// ============================================================================

export const tenants = mysqlTable("tenants", {
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
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  strategy: mysqlEnum("strategy", ["shared_rls", "dedicated_schema"]).default("shared_rls").notNull(),
  schemaName: varchar("schemaName", { length: 100 }), // Apenas para dedicated_schema
  
  // Metadados
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  nameIdx: index("idx_tenant_name").on(table.name),
  statusIdx: index("idx_tenant_status").on(table.status),
}));

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ============================================================================
// CONFIGURAÇÕES POR TENANT
// ============================================================================

export const tenantSettings = mysqlTable("tenant_settings", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  
  settingKey: varchar("settingKey", { length: 100 }).notNull(),
  settingValue: json("settingValue").notNull(), // { max_users: 100, features: [...], branding: {...} }
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => ({
  tenantKeyUnique: unique("uk_tenant_setting").on(table.tenantId, table.settingKey),
  tenantIdx: index("idx_setting_tenant").on(table.tenantId),
}));

export type TenantSetting = typeof tenantSettings.$inferSelect;
export type InsertTenantSetting = typeof tenantSettings.$inferInsert;

// ============================================================================
// SETORES (por tenant)
// ============================================================================

export const sectors = mysqlTable("sectors", {
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
  position: varchar("position", { length: 255 }), // Cargo/função
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
  
  // Escopo: global (Black Belt) ou por tenant
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
  
  name: varchar("name", { length: 100 }).notNull().unique(), // ex: "colaboradores.create"
  resource: varchar("resource", { length: 50 }).notNull(), // ex: "colaboradores"
  action: varchar("action", { length: 50 }).notNull(), // ex: "create", "read", "update", "delete"
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
  tenantId: varchar("tenantId", { length: 64 }), // NULL para permissões globais
  
  // Condições ABAC (JSON): { "sector_id": "uuid", "own_data_only": true }
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
  tenantId: varchar("tenantId", { length: 64 }), // NULL para roles globais (Black Belt)
  
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
  
  consentType: varchar("consentType", { length: 50 }).notNull(), // data_processing, marketing, etc.
  granted: boolean("granted").notNull(),
  
  grantedAt: timestamp("grantedAt"),
  revokedAt: timestamp("revokedAt"),
  
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  version: varchar("version", { length: 20 }), // Versão do termo aceito
  
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
  
  tenantId: varchar("tenantId", { length: 64 }), // NULL para convites Black Belt
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

