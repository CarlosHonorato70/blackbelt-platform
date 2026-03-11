/**
 * Seed Script - Admin user + initial tenant + plans
 *
 * Run: pnpm tsx drizzle/seed.ts
 *
 * Requires: DATABASE_URL env var (e.g. from .env)
 * Requires: Tables already created (run pnpm db:push first)
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  users,
  tenants,
  subscriptions,
  plans,
  featureFlags,
  planFeatures,
  roles,
  userRoles,
  permissions,
  rolePermissions,
} from "./schema";
import { seedPlans, seedFeatures, getPlanFeatureAssociations } from "../seed_plans";
import crypto from "crypto";
import "dotenv/config";

async function seed() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set. Create a .env file.");
    process.exit(1);
  }

  const needsSsl = dbUrl.includes('tidbcloud.com') || process.env.DATABASE_SSL === 'true';
  const pool = mysql.createPool({
    uri: dbUrl,
    connectionLimit: 5,
    ...(needsSsl ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {}),
  });
  const db = drizzle(pool);

  console.log("Seeding database...\n");

  // 1. Seed Plans
  console.log("[1/6] Seeding plans...");
  for (const plan of seedPlans) {
    const existing = await db.select().from(plans).where(eq(plans.name, plan.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(plans).values(plan);
      console.log(`  + Plan: ${plan.displayName}`);
    } else {
      console.log(`  = Plan already exists: ${plan.displayName}`);
    }
  }

  // 2. Seed Feature Flags
  console.log("[2/6] Seeding feature flags...");
  for (const feature of seedFeatures) {
    const existing = await db.select().from(featureFlags).where(eq(featureFlags.name, feature.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(featureFlags).values(feature);
      console.log(`  + Feature: ${feature.displayName}`);
    } else {
      console.log(`  = Feature already exists: ${feature.displayName}`);
    }
  }

  // 3. Seed Plan-Feature Associations
  console.log("[3/6] Seeding plan-feature associations...");
  const dbPlans = await db.select().from(plans);
  const dbFeatures = await db.select().from(featureFlags);
  const existingPF = await db.select().from(planFeatures);
  if (existingPF.length === 0) {
    const associations = getPlanFeatureAssociations(
      dbPlans.map((p) => ({ ...p, slaUptime: p.slaUptime ?? null })) as any,
      dbFeatures as any
    );
    for (const assoc of associations) {
      await db.insert(planFeatures).values(assoc);
    }
    console.log(`  + ${associations.length} associations created`);
  } else {
    console.log(`  = ${existingPF.length} associations already exist`);
  }

  // 4. Seed Roles
  console.log("[4/8] Seeding roles...");
  const seedRoles = [
    { id: nanoid(), systemName: "admin", displayName: "Administrador", description: "Acesso total ao sistema", scope: "global" },
    { id: nanoid(), systemName: "manager", displayName: "Gerente", description: "Gestao do tenant", scope: "tenant" },
    { id: nanoid(), systemName: "analyst", displayName: "Analista", description: "Avaliacoes e relatorios", scope: "tenant" },
    { id: nanoid(), systemName: "viewer", displayName: "Visualizador", description: "Somente leitura", scope: "tenant" },
  ];
  for (const role of seedRoles) {
    const existing = await db.select().from(roles).where(eq(roles.systemName, role.systemName)).limit(1);
    if (existing.length === 0) {
      await db.insert(roles).values(role);
      console.log(`  + Role: ${role.displayName}`);
    } else {
      console.log(`  = Role already exists: ${role.displayName}`);
    }
  }

  // 5. Seed Permissions
  console.log("[5/8] Seeding permissions...");
  const seedPermissions = [
    { id: nanoid(), name: "sectors:create", resource: "sectors", action: "create", description: "Criar setores" },
    { id: nanoid(), name: "sectors:read", resource: "sectors", action: "read", description: "Visualizar setores" },
    { id: nanoid(), name: "sectors:update", resource: "sectors", action: "update", description: "Editar setores" },
    { id: nanoid(), name: "sectors:delete", resource: "sectors", action: "delete", description: "Remover setores" },
    { id: nanoid(), name: "people:create", resource: "people", action: "create", description: "Criar colaboradores" },
    { id: nanoid(), name: "people:read", resource: "people", action: "read", description: "Visualizar colaboradores" },
    { id: nanoid(), name: "people:update", resource: "people", action: "update", description: "Editar colaboradores" },
    { id: nanoid(), name: "people:delete", resource: "people", action: "delete", description: "Remover colaboradores" },
    { id: nanoid(), name: "assessments:create", resource: "assessments", action: "create", description: "Criar avaliacoes" },
    { id: nanoid(), name: "assessments:read", resource: "assessments", action: "read", description: "Visualizar avaliacoes" },
    { id: nanoid(), name: "assessments:update", resource: "assessments", action: "update", description: "Editar avaliacoes" },
    { id: nanoid(), name: "assessments:delete", resource: "assessments", action: "delete", description: "Remover avaliacoes" },
    { id: nanoid(), name: "reports:create", resource: "reports", action: "create", description: "Gerar relatorios" },
    { id: nanoid(), name: "reports:read", resource: "reports", action: "read", description: "Visualizar relatorios" },
    { id: nanoid(), name: "reports:export", resource: "reports", action: "export", description: "Exportar relatorios" },
    { id: nanoid(), name: "subscriptions:read", resource: "subscriptions", action: "read", description: "Visualizar assinaturas" },
    { id: nanoid(), name: "tickets:create", resource: "tickets", action: "create", description: "Criar tickets" },
    { id: nanoid(), name: "tickets:read", resource: "tickets", action: "read", description: "Visualizar tickets" },
    { id: nanoid(), name: "tickets:update", resource: "tickets", action: "update", description: "Editar tickets" },
    { id: nanoid(), name: "data_export:read", resource: "data_export", action: "read", description: "Exportar dados LGPD" },
  ];
  for (const perm of seedPermissions) {
    const existing = await db.select().from(permissions).where(eq(permissions.name, perm.name)).limit(1);
    if (existing.length === 0) {
      await db.insert(permissions).values(perm);
      console.log(`  + Permission: ${perm.name}`);
    } else {
      console.log(`  = Permission already exists: ${perm.name}`);
    }
  }

  // 6. Seed Role-Permission Associations
  console.log("[6/8] Seeding role-permission associations...");
  const dbRoles = await db.select().from(roles);
  const dbPerms = await db.select().from(permissions);
  const existingRP = await db.select().from(rolePermissions);

  if (existingRP.length === 0) {
    const managerRole = dbRoles.find((r: any) => r.systemName === "manager");
    const analystRole = dbRoles.find((r: any) => r.systemName === "analyst");
    const viewerRole = dbRoles.find((r: any) => r.systemName === "viewer");

    const rpEntries: Array<{id: string; roleId: string; permissionId: string}> = [];

    // Manager gets ALL permissions
    if (managerRole) {
      for (const perm of dbPerms) {
        rpEntries.push({ id: nanoid(), roleId: managerRole.id, permissionId: perm.id });
      }
    }

    // Analyst: assessments/reports/tickets full + people/sectors/subscriptions read
    if (analystRole) {
      const analystPerms = dbPerms.filter((p: any) =>
        p.resource === "assessments" ||
        p.resource === "reports" ||
        p.resource === "tickets" ||
        (p.resource === "people" && p.action === "read") ||
        (p.resource === "sectors" && p.action === "read") ||
        (p.resource === "subscriptions" && p.action === "read")
      );
      for (const perm of analystPerms) {
        rpEntries.push({ id: nanoid(), roleId: analystRole.id, permissionId: perm.id });
      }
    }

    // Viewer: read-only
    if (viewerRole) {
      const viewerPerms = dbPerms.filter((p: any) => p.action === "read");
      for (const perm of viewerPerms) {
        rpEntries.push({ id: nanoid(), roleId: viewerRole.id, permissionId: perm.id });
      }
    }

    for (const rp of rpEntries) {
      await db.insert(rolePermissions).values(rp);
    }
    console.log(`  + ${rpEntries.length} role-permission associations created`);
  } else {
    console.log(`  = ${existingRP.length} role-permission associations already exist`);
  }

  // 7. Seed Initial Tenant
  console.log("[7/8] Seeding initial tenant...");
  const TENANT_CNPJ = "00.000.000/0001-00";
  let tenantId: string;

  const existingTenant = await db.select().from(tenants).where(eq(tenants.cnpj, TENANT_CNPJ)).limit(1);
  if (existingTenant.length === 0) {
    tenantId = nanoid();
    await db.insert(tenants).values({
      id: tenantId,
      name: "BlackBelt Platform (Admin)",
      cnpj: TENANT_CNPJ,
      contactName: "Admin",
      contactEmail: "admin@blackbeltconsultoria.com",
      status: "active",
      strategy: "shared_rls",
    });
    console.log(`  + Tenant created: BlackBelt Platform (Admin)`);

    // Create subscription for tenant (starter plan)
    const starterPlan = dbPlans.find((p) => p.name === "starter");
    if (starterPlan) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1);
      await db.insert(subscriptions).values({
        id: nanoid(),
        tenantId,
        planId: starterPlan.id,
        status: "active",
        billingCycle: "yearly",
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        currentPrice: starterPlan.yearlyPrice,
      });
      console.log(`  + Subscription created: Starter (yearly)`);
    }
  } else {
    tenantId = existingTenant[0].id;
    console.log(`  = Tenant already exists: ${existingTenant[0].name}`);
  }

  // 6. Seed Admin User
  console.log("[8/8] Seeding admin user...");
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@blackbeltconsultoria.com";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || crypto.randomUUID().slice(0, 16) + "!Aa1";
  const isRandomPassword = !process.env.ADMIN_PASSWORD;

  const existingAdmin = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
  if (existingAdmin.length === 0) {
    const adminId = nanoid();
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await db.insert(users).values({
      id: adminId,
      name: "Administrador",
      email: ADMIN_EMAIL,
      loginMethod: "local",
      passwordHash,
      role: "admin",
      tenantId,
    });
    console.log(`  + Admin user created: ${ADMIN_EMAIL}`);

    // Assign admin role
    const adminRole = await db.select().from(roles).where(eq(roles.systemName, "admin")).limit(1);
    if (adminRole.length > 0) {
      await db.insert(userRoles).values({
        id: nanoid(),
        userId: adminId,
        roleId: adminRole[0].id,
        tenantId,
      });
      console.log(`  + Admin role assigned`);
    }
  } else {
    console.log(`  = Admin user already exists: ${ADMIN_EMAIL}`);
  }

  console.log("\nSeed completed!");
  if (isRandomPassword) {
    console.log("\n--- Login credentials (GENERATED) ---");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log("IMPORTANT: Save this password now! It will not be shown again.");
    console.log("Change it immediately after first login.\n");
  } else {
    console.log("\n--- Login credentials ---");
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log("Password: (set via ADMIN_PASSWORD env var)");
    console.log("Change it immediately after first login.\n");
  }

  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
