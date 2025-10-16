import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import {
  auditLogs,
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
  rolePermissions,
  roles,
  sectors,
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
      _db = drizzle(process.env.DATABASE_URL);
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

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// TENANTS
// ============================================================================

export async function createTenant(data: Omit<InsertTenant, "id" | "createdAt" | "updatedAt">) {
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

  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTenantByCNPJ(cnpj: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(tenants).where(eq(tenants.cnpj, cnpj)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listTenants(filters?: { status?: string; search?: string }) {
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
    .where(and(eq(tenantSettings.tenantId, tenantId), eq(tenantSettings.settingKey, key)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function setTenantSetting(tenantId: string, key: string, value: any) {
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

export async function createSector(data: Omit<InsertSector, "id" | "createdAt" | "updatedAt">) {
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

  return await db.select().from(sectors).where(and(...conditions));
}

export async function updateSector(id: string, tenantId: string, data: Partial<InsertSector>) {
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

  await db.delete(sectors).where(and(eq(sectors.id, id), eq(sectors.tenantId, tenantId)));
}

// ============================================================================
// PEOPLE (Colaboradores)
// ============================================================================

export async function createPerson(data: Omit<InsertPerson, "id" | "createdAt" | "updatedAt">) {
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

  return await db.select().from(people).where(and(...conditions));
}

export async function updatePerson(id: string, tenantId: string, data: Partial<InsertPerson>) {
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

  await db.delete(people).where(and(eq(people.id, id), eq(people.tenantId, tenantId)));
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

  const result = await db.select().from(roles).where(eq(roles.systemName, systemName)).limit(1);
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

export async function assignUserRole(data: Omit<InsertUserRole, "id" | "createdAt">) {
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

  return await db.select().from(userRoles).where(and(...conditions));
}

export async function removeUserRole(userId: string, roleId: string, tenantId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)];
  if (tenantId !== undefined) {
    conditions.push(eq(userRoles.tenantId, tenantId));
  }

  await db.delete(userRoles).where(and(...conditions));
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export async function createAuditLog(data: Omit<InsertAuditLog, "id" | "timestamp">) {
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

export async function getAuditLogs(
  filters: {
    tenantId?: string;
    userId?: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
  }
) {
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

export async function createDataConsent(data: Omit<InsertDataConsent, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const consent: InsertDataConsent = {
    id: nanoid(),
    ...data,
  };

  await db.insert(dataConsents).values(consent);
  return consent;
}

export async function getPersonConsents(personId: string, consentType?: string) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(dataConsents.personId, personId)];
  if (consentType) {
    conditions.push(eq(dataConsents.consentType, consentType));
  }

  return await db.select().from(dataConsents).where(and(...conditions));
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

  const result = await db.select().from(userInvites).where(eq(userInvites.token, token)).limit(1);
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

  await db.update(userInvites).set({ status: "cancelled" }).where(eq(userInvites.id, id));
}

