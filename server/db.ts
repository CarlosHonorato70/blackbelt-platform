import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import {
  assessmentProposals,
  auditLogs,
  clients,
  dataConsents,
  InsertAuditLog,
  InsertDataConsent,
  InsertPerson,
  InsertRole,
  InsertRolePermission,
  InsertSector,
  InsertTenant,
  InsertTenantSetting,
  InsertUser,
  InsertUserInvite,
  InsertUserRole,
  people,
  pricingParameters,
  proposalItems,
  proposals,
  rolePermissions,
  roles,
  sectors,
  services,
  tenantSettings,
  tenants,
  userInvites,
  userRoles,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Garantir que a URL da conexão inclui charset=utf8mb4 para compatibilidade com Docker Desktop
      let connectionUrl = process.env.DATABASE_URL;
      if (!connectionUrl.includes('charset=')) {
        const separator = connectionUrl.includes('?') ? '&' : '?';
        connectionUrl = `${connectionUrl}${separator}charset=utf8mb4`;
      }
      _db = drizzle(connectionUrl);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USERS
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.id) {
    throw new Error("User ID is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { id: user.id };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = "admin";
        values.role = "admin";
        updateSet.role = "admin";
      }
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// TENANTS
// ============================================================================

export async function createTenant(
  data: Omit<InsertTenant, "id" | "createdAt" | "updatedAt">
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const tenant: InsertTenant = {
    id: nanoid(),
    ...data,
  };

  await db.insert(tenants).values(tenant);
  return tenant;
}

export async function getTenant(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTenantByCNPJ(cnpj: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.cnpj, cnpj))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listTenants(filters?: {
  status?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(tenants);

  const conditions = [];
  if (filters?.status) {
    conditions.push(eq(tenants.status, filters.status as any));
  }
  if (filters?.search) {
    conditions.push(
      or(
        like(tenants.name, `%${filters.search}%`),
        like(tenants.cnpj, `%${filters.search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query;
}

export async function updateTenant(id: string, data: Partial<InsertTenant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(tenants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tenants.id, id));
}

// ============================================================================
// TENANT SETTINGS
// ============================================================================

export async function getTenantSetting(tenantId: string, key: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(tenantSettings)
    .where(
      and(
        eq(tenantSettings.tenantId, tenantId),
        eq(tenantSettings.settingKey, key)
      )
    )
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function setTenantSetting(
  tenantId: string,
  key: string,
  value: any
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getTenantSetting(tenantId, key);

  if (existing) {
    await db
      .update(tenantSettings)
      .set({ settingValue: value, updatedAt: new Date() })
      .where(eq(tenantSettings.id, existing.id));
  } else {
    await db.insert(tenantSettings).values({
      id: nanoid(),
      tenantId,
      settingKey: key,
      settingValue: value,
    });
  }
}

// ============================================================================
// SECTORS
// ============================================================================

export async function createSector(
  data: Omit<InsertSector, "id" | "createdAt" | "updatedAt">
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sector: InsertSector = {
    id: nanoid(),
    ...data,
  };

  await db.insert(sectors).values(sector);
  return sector;
}

export async function getSector(id: string, tenantId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(sectors)
    .where(and(eq(sectors.id, id), eq(sectors.tenantId, tenantId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listSectors(tenantId: string, search?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(sectors.tenantId, tenantId)];

  if (search) {
    conditions.push(like(sectors.name, `%${search}%`));
  }

  return await db
    .select()
    .from(sectors)
    .where(and(...conditions));
}

export async function updateSector(
  id: string,
  tenantId: string,
  data: Partial<InsertSector>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(sectors)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(sectors.id, id), eq(sectors.tenantId, tenantId)));
}

export async function deleteSector(id: string, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(sectors)
    .where(and(eq(sectors.id, id), eq(sectors.tenantId, tenantId)));
}

// ============================================================================
// PEOPLE (Colaboradores)
// ============================================================================

export async function createPerson(
  data: Omit<InsertPerson, "id" | "createdAt" | "updatedAt">
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const person: InsertPerson = {
    id: nanoid(),
    ...data,
  };

  await db.insert(people).values(person);
  return person;
}

export async function getPerson(id: string, tenantId: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(people)
    .where(and(eq(people.id, id), eq(people.tenantId, tenantId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function listPeople(
  tenantId: string,
  filters?: { sectorId?: string; search?: string; employmentType?: string }
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(people.tenantId, tenantId)];

  if (filters?.sectorId) {
    conditions.push(eq(people.sectorId, filters.sectorId));
  }
  if (filters?.employmentType) {
    conditions.push(eq(people.employmentType, filters.employmentType as any));
  }
  if (filters?.search) {
    const searchCondition = or(
      like(people.name, `%${filters.search}%`),
      like(people.email, `%${filters.search}%`),
      like(people.position, `%${filters.search}%`)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const results = await db
    .select({
      id: people.id,
      tenantId: people.tenantId,
      sectorId: people.sectorId,
      name: people.name,
      position: people.position,
      email: people.email,
      phone: people.phone,
      employmentType: people.employmentType,
      createdAt: people.createdAt,
      updatedAt: people.updatedAt,
      sectorName: sectors.name,
    })
    .from(people)
    .leftJoin(sectors, eq(people.sectorId, sectors.id))
    .where(and(...conditions));

  return results;
}

export async function updatePerson(
  id: string,
  tenantId: string,
  data: Partial<InsertPerson>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(people)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(people.id, id), eq(people.tenantId, tenantId)));
}

export async function deletePerson(id: string, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(people)
    .where(and(eq(people.id, id), eq(people.tenantId, tenantId)));
}

// ============================================================================
// ROLES & PERMISSIONS
// ============================================================================

export async function createRole(data: Omit<InsertRole, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const role: InsertRole = {
    id: nanoid(),
    ...data,
  };

  await db.insert(roles).values(role);
  return role;
}

export async function getRole(id: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getRoleBySystemName(systemName: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(roles)
    .where(eq(roles.systemName, systemName))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listRoles(scope?: "global" | "tenant") {
  const db = await getDb();
  if (!db) return [];

  if (scope) {
    return await db.select().from(roles).where(eq(roles.scope, scope));
  }
  return await db.select().from(roles);
}

// ============================================================================
// USER ROLES
// ============================================================================

export async function assignUserRole(
  data: Omit<InsertUserRole, "id" | "createdAt">
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userRole: InsertUserRole = {
    id: nanoid(),
    ...data,
  };

  await db.insert(userRoles).values(userRole);
  return userRole;
}

export async function getUserRoles(userId: string, tenantId?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(userRoles.userId, userId)];
  if (tenantId !== undefined) {
    conditions.push(eq(userRoles.tenantId, tenantId));
  }

  return await db
    .select()
    .from(userRoles)
    .where(and(...conditions));
}

export async function removeUserRole(
  userId: string,
  roleId: string,
  tenantId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [
    eq(userRoles.userId, userId),
    eq(userRoles.roleId, roleId),
  ];
  if (tenantId !== undefined) {
    conditions.push(eq(userRoles.tenantId, tenantId));
  }

  await db.delete(userRoles).where(and(...conditions));
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export async function createAuditLog(
  data: Omit<InsertAuditLog, "id" | "timestamp">
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Audit] Database not available, skipping audit log");
    return;
  }

  const log: InsertAuditLog = {
    id: nanoid(),
    ...data,
  };

  try {
    await db.insert(auditLogs).values(log);
  } catch (error) {
    console.error("[Audit] Failed to create audit log:", error);
  }
}

export async function getAuditLogs(filters: {
  tenantId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters.tenantId !== undefined) {
    conditions.push(eq(auditLogs.tenantId, filters.tenantId));
  }
  if (filters.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }
  if (filters.entityId) {
    conditions.push(eq(auditLogs.entityId, filters.entityId));
  }

  let query = db.select().from(auditLogs);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  query = query.orderBy(desc(auditLogs.timestamp)) as any;

  if (filters.limit) {
    query = query.limit(filters.limit) as any;
  }

  return await query;
}

// ============================================================================
// DATA CONSENTS (LGPD)
// ============================================================================

export async function createDataConsent(
  data: Omit<InsertDataConsent, "id" | "createdAt">
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const consent: InsertDataConsent = {
    id: nanoid(),
    ...data,
  };

  await db.insert(dataConsents).values(consent);
  return consent;
}

export async function getPersonConsents(
  personId: string,
  consentType?: string
) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(dataConsents.personId, personId)];
  if (consentType) {
    conditions.push(eq(dataConsents.consentType, consentType));
  }

  return await db
    .select()
    .from(dataConsents)
    .where(and(...conditions));
}

export async function revokeConsent(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(dataConsents)
    .set({ granted: false, revokedAt: new Date() })
    .where(eq(dataConsents.id, id));
}

// ============================================================================
// USER INVITES
// ============================================================================

export async function createUserInvite(
  data: Omit<InsertUserInvite, "id" | "token" | "createdAt">
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const invite: InsertUserInvite = {
    id: nanoid(),
    token: nanoid(32),
    ...data,
  };

  await db.insert(userInvites).values(invite);
  return invite;
}

export async function getInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(userInvites)
    .where(eq(userInvites.token, token))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listInvites(tenantId?: string, status?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (tenantId !== undefined) {
    conditions.push(eq(userInvites.tenantId, tenantId));
  }
  if (status) {
    conditions.push(eq(userInvites.status, status as any));
  }

  let query = db.select().from(userInvites);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return await query;
}

export async function acceptInvite(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(userInvites)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(userInvites.token, token));
}

export async function cancelInvite(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(userInvites)
    .set({ status: "cancelled" })
    .where(eq(userInvites.id, id));
}

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

  return await db.select().from(clients).where(eq(clients.tenantId, tenantId));
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

export async function updateClient(
  id: string,
  data: Partial<typeof clients.$inferInsert>
) {
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

export async function updateService(
  id: string,
  data: Partial<typeof services.$inferInsert>
) {
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

export async function updatePricingParameters(
  tenantId: string,
  data: Partial<typeof pricingParameters.$inferInsert>
) {
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

export async function updateProposal(
  id: string,
  data: Partial<typeof proposals.$inferInsert>
) {
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

export function calculateTechnicalHour(
  params: TechnicalHourCalculation
): number {
  const {
    monthlyFixedCost,
    laborCost,
    productiveHoursPerMonth,
    taxRegime,
    taxRates = {},
    riskAdjustment = 100,
    seniorityAdjustment = 100,
  } = params;

  // Cálculo base: (Custo Fixo + Custo MO) / Horas Produtivas
  const baseTechnicalHour =
    (monthlyFixedCost + laborCost) / productiveHoursPerMonth;

  // Aplicar ajustes
  const adjustedHour =
    baseTechnicalHour * (riskAdjustment / 100) * (seniorityAdjustment / 100);

  // Aplicar impostos
  const taxRate = taxRates[taxRegime] || 0;
  const technicalHourWithTax = adjustedHour * (1 + taxRate);

  return Math.round(technicalHourWithTax * 100); // Retornar em centavos
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

  // Calcular subtotal
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  // Calcular desconto
  const discount = Math.round(subtotal * (discountPercent / 100));

  // Calcular impostos
  const taxRate = taxRates[taxRegime] || 0;
  const taxes = Math.round((subtotal - discount) * taxRate);

  // Calcular total
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
