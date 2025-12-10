import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
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
} from "../drizzle/schema"; // Ajuste o caminho se necessário
import {
  copsoqAssessments,
  copsoqResponses,
  copsoqReports,
} from "../drizzle/schema_nr01";
import { ENV } from "./_core/env";

const { Pool } = pg;

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
      });
      _db = drizzle(pool);
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

    const textFields = [
      "name",
      "email",
      "loginMethod",
      "passwordHash",
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

    if (user.role === undefined) {
      if (user.id === ENV.ownerId) {
        user.role = "admin";
        values.role = "admin";
        updateSet.role = "admin";
      }
    }
    
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // Postgres usa ON CONFLICT em vez de ON DUPLICATE KEY UPDATE
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.id,
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

// ... (O RESTANTE DO ARQUIVO É IDÊNTICO AO ORIGINAL, POIS O DRIZZLE ABSTRAI O RESTO)
// ... Copie o restante das funções (createSector, listPeople, etc.) do seu arquivo original
// ... A única mudança crítica foi no upsertUser (ON CONFLICT) e na conexão (Pool)