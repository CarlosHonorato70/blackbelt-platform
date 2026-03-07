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

  const pool = mysql.createPool({ uri: dbUrl, connectionLimit: 5 });
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
  console.log("[4/6] Seeding roles...");
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

  // 5. Seed Initial Tenant
  console.log("[5/6] Seeding initial tenant...");
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
      contactEmail: "admin@blackbelt-platform.com",
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
  console.log("[6/6] Seeding admin user...");
  const ADMIN_EMAIL = "admin@blackbelt-platform.com";
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
