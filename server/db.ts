import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";
import { log } from "./_core/logger";
import * as schema from "../drizzle/schema";
import * as schemaNr01 from "../drizzle/schema_nr01";
import * as relations from "../drizzle/relations";
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
import {
  copsoqAssessments,
  copsoqResponses,
  copsoqReports,
} from "../drizzle/schema_nr01";
import { ENV } from "./_core/env";

// Schema completo para Drizzle relational API (db.query.*)
const fullSchema = { ...schema, ...schemaNr01, ...relations };

let _db: ReturnType<typeof drizzle<typeof fullSchema>> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = mysql.createPool({
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      _db = drizzle(pool, { schema: fullSchema, mode: "default" });
    } catch (error) {
      log.warn("[Database] Failed to connect", { error: String(error) });
      _db = null;
    }
  }
  return _db;
}

// Alias para compatibilidade com context.ts
export async function getUserById(id: string) {
  return getUser(id);
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
    log.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = { id: user.id };
    const updateSet: Record<string, unknown> = {};

    const textFields = [
      "name",
      "email",
      "loginMethod",
      "passwordHash",
      "tenantId",
    ] as const;
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

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // MySQL usa ON DUPLICATE KEY UPDATE
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    log.error("[Database] Failed to upsert user", { error: String(error) });
    throw error;
  }
}

export async function getUser(id: string) {
  const db = await getDb();
  if (!db) {
    log.warn("[Database] Cannot get user: database not available");
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
  if (!db) {
    return [];
  }

  try {
    let query = db.select().from(tenants);

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(tenants.status, filters.status));
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

    const result = await query;
    return result;
  } catch (error) {
    log.error("[DB] Error in listTenants", { error: String(error) });
    throw error;
  }
}

export async function updateTenant(id: string, data: Partial<InsertTenant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(tenants)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tenants.id, id));
}

export async function deleteTenant(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(tenants).where(eq(tenants.id, id));
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
// AUDIT LOGS
// ============================================================================

export async function createAuditLog(data: Omit<InsertAuditLog, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const auditLog: InsertAuditLog = {
    id: nanoid(),
    ...data,
    createdAt: new Date(),
  };

  await db.insert(auditLogs).values(auditLog);
  return auditLog;
}

export async function getAuditLogs(filters?: {
  tenantId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));

  const conditions = [];
  if (filters?.tenantId) {
    conditions.push(eq(auditLogs.tenantId, filters.tenantId));
  }
  if (filters?.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters?.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters?.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }

  return await query;
}

// ============================================================================
// SECTORS
// ============================================================================

export async function listSectors(tenantId: string, search?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(sectors.tenantId, tenantId)];
  if (search) conditions.push(like(sectors.name, `%${search}%`));
  return db.select().from(sectors).where(and(...conditions)).orderBy(desc(sectors.createdAt));
}

export async function getSector(id: string, tenantId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sectors).where(and(eq(sectors.id, id), eq(sectors.tenantId, tenantId))).limit(1);
  return result[0] || undefined;
}

export async function createSector(data: Omit<InsertSector, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const sector = { id: nanoid(), ...data, createdAt: new Date(), updatedAt: new Date() };
  await db.insert(sectors).values(sector);
  return sector;
}

export async function updateSector(id: string, tenantId: string, data: Partial<InsertSector>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sectors).set({ ...data, updatedAt: new Date() }).where(and(eq(sectors.id, id), eq(sectors.tenantId, tenantId)));
}

export async function deleteSector(id: string, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sectors).where(and(eq(sectors.id, id), eq(sectors.tenantId, tenantId)));
}

// ============================================================================
// PEOPLE
// ============================================================================

export async function listPeople(tenantId: string, filters: { sectorId?: string; search?: string; employmentType?: string } = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(people.tenantId, tenantId)];
  if (filters.sectorId) conditions.push(eq(people.sectorId, filters.sectorId));
  if (filters.employmentType) conditions.push(eq(people.employmentType, filters.employmentType as any));
  if (filters.search) conditions.push(or(like(people.name, `%${filters.search}%`), like(people.email, `%${filters.search}%`)) as any);
  return db.select().from(people).where(and(...conditions)).orderBy(desc(people.createdAt));
}

export async function getPerson(id: string, tenantId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(people).where(and(eq(people.id, id), eq(people.tenantId, tenantId))).limit(1);
  return result[0] || undefined;
}

export async function createPerson(data: Omit<InsertPerson, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const person = { id: nanoid(), ...data, createdAt: new Date(), updatedAt: new Date() };
  await db.insert(people).values(person);
  return person;
}

export async function updatePerson(id: string, tenantId: string, data: Partial<InsertPerson>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(people).set({ ...data, updatedAt: new Date() }).where(and(eq(people.id, id), eq(people.tenantId, tenantId)));
}

export async function deletePerson(id: string, tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(people).where(and(eq(people.id, id), eq(people.tenantId, tenantId)));
}

export async function getPersonConsents(personId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dataConsents).where(eq(dataConsents.personId, personId));
}

// ============================================================================
// CLIENTS
// ============================================================================

export async function listClients(tenantId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).where(eq(clients.tenantId, tenantId)).orderBy(desc(clients.createdAt));
}

export async function getClient(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result[0] || undefined;
}

export async function createClient(data: { tenantId: string; name: string; [key: string]: any }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = nanoid();
  await db.insert(clients).values({ id, ...data, status: "active", createdAt: new Date(), updatedAt: new Date() });
  return { id };
}

export async function updateClient(id: string, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, id));
}

export async function deleteClient(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(clients).where(eq(clients.id, id));
}

// ============================================================================
// SERVICES
// ============================================================================

export async function listServices(tenantId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(services).where(eq(services.tenantId, tenantId)).orderBy(desc(services.createdAt));
}

export async function getService(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return result[0] || undefined;
}

export async function createService(data: { tenantId: string; name: string; category: string; unit: string; minPrice: number; maxPrice: number; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = nanoid();
  await db.insert(services).values({ id, ...data, unit: data.unit as any, isActive: true, createdAt: new Date(), updatedAt: new Date() });
  return { id };
}

export async function updateService(id: string, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(services).set({ ...data, updatedAt: new Date() }).where(eq(services.id, id));
}

export async function deleteService(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(services).where(eq(services.id, id));
}

// ============================================================================
// PRICING PARAMETERS
// ============================================================================

export async function getPricingParameters(tenantId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pricingParameters).where(eq(pricingParameters.tenantId, tenantId)).limit(1);
  return result[0] || undefined;
}

export async function updatePricingParameters(tenantId: string, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pricingParameters).set({ ...data, updatedAt: new Date() }).where(eq(pricingParameters.tenantId, tenantId));
}

// ============================================================================
// PROPOSALS
// ============================================================================

export async function listProposals(tenantId: string, clientId?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(proposals.tenantId, tenantId)];
  if (clientId) conditions.push(eq(proposals.clientId, clientId));
  return db.select().from(proposals).where(and(...conditions)).orderBy(desc(proposals.createdAt));
}

export async function getProposal(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(proposals).where(eq(proposals.id, id)).limit(1);
  return result[0] || undefined;
}

export async function createProposal(data: { tenantId: string; clientId: string; title: string; [key: string]: any }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = nanoid();
  await db.insert(proposals).values({ id, ...data, status: data.status || "draft", generatedAt: new Date(), createdAt: new Date(), updatedAt: new Date() });
  return id;
}

export async function updateProposal(id: string, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(proposals).set({ ...data, updatedAt: new Date() }).where(eq(proposals.id, id));
}

export async function deleteProposal(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(proposalItems).where(eq(proposalItems.proposalId, id));
  await db.delete(proposals).where(eq(proposals.id, id));
}

export async function listProposalItems(proposalId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(proposalItems).where(eq(proposalItems.proposalId, proposalId));
}

export async function createProposalItem(data: { proposalId: string; serviceId: string; serviceName: string; quantity: number; unitPrice: number; subtotal: number; technicalHours?: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = nanoid();
  await db.insert(proposalItems).values({ id, ...data, createdAt: new Date() });
  return { id };
}

export async function deleteProposalItem(itemId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(proposalItems).where(eq(proposalItems.id, itemId));
}

// ============================================================================
// ASSESSMENT PROPOSALS
// ============================================================================

export async function createAssessmentProposal(data: { tenantId: string; assessmentId: string; proposalId: string; recommendedServices?: any; riskLevel: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const id = nanoid();
  await db.insert(assessmentProposals).values({ id, ...data, riskLevel: data.riskLevel as any, createdAt: new Date() });
  return { id };
}

export async function getAssessmentProposals(assessmentId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assessmentProposals).where(eq(assessmentProposals.assessmentId, assessmentId));
}

// ============================================================================
// ASSESSMENTS (NR01 Schema)
// ============================================================================

export async function getAssessment(id: string, tenantId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { riskAssessments, riskAssessmentItems } = await import("../drizzle/schema_nr01");
  const result = await db.select().from(riskAssessments).where(and(eq(riskAssessments.id, id), eq(riskAssessments.tenantId, tenantId))).limit(1);
  if (!result[0]) return undefined;
  const items = await db.select().from(riskAssessmentItems).where(eq(riskAssessmentItems.assessmentId, id));
  return { ...result[0], items };
}

// ============================================================================
// PRICING CALCULATIONS
// ============================================================================

export function calculateTechnicalHour(params: { monthlyFixedCost: number; laborCost: number; productiveHoursPerMonth: number; taxRegime: string; taxRates?: Record<string, number>; riskAdjustment?: number; seniorityAdjustment?: number }) {
  const baseCost = (params.monthlyFixedCost + params.laborCost) / params.productiveHoursPerMonth;
  const defaultRates: Record<string, number> = { MEI: 1.3, SN: 1.4, LP: 1.5, autonomous: 1.35 };
  const multiplier = defaultRates[params.taxRegime] || 1.4;
  const riskAdj = (params.riskAdjustment || 100) / 100;
  const senAdj = (params.seniorityAdjustment || 100) / 100;
  const technicalHour = Math.round(baseCost * multiplier * riskAdj * senAdj);
  return { technicalHour, baseCost: Math.round(baseCost), taxRegime: params.taxRegime };
}

export function calculateProposal(params: { items: { quantity: number; unitPrice: number }[]; discountPercent?: number; taxRegime: string; taxRates?: Record<string, number> }) {
  const subtotal = params.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountPercent = params.discountPercent || 0;
  const discount = Math.round(subtotal * discountPercent / 100);
  const afterDiscount = subtotal - discount;
  const defaultTaxRates: Record<string, number> = { MEI: 0.05, SN: 0.08, LP: 0.15, autonomous: 0.20 };
  const taxRate = params.taxRates?.[params.taxRegime] ?? defaultTaxRates[params.taxRegime] ?? 0.08;
  const taxes = Math.round(afterDiscount * taxRate);
  const totalValue = afterDiscount + taxes;
  return { subtotal, discount, discountPercent, taxes, totalValue };
}
