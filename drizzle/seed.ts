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
  services,
  pricingParameters,
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
    { id: nanoid(), systemName: "admin", displayName: "Administrador Master", description: "Dono da plataforma - acesso total ao sistema", scope: "global" },
    { id: nanoid(), systemName: "consultant", displayName: "Consultor", description: "Consultoria/consultor que paga assinatura e gerencia empresas clientes", scope: "tenant" },
    { id: nanoid(), systemName: "manager", displayName: "Gerente", description: "Gestao do tenant", scope: "tenant" },
    { id: nanoid(), systemName: "company_admin", displayName: "Admin Empresa", description: "Admin da empresa cliente - visualiza relatorios e responde pesquisas", scope: "tenant" },
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
    { id: nanoid(), name: "companies:create", resource: "companies", action: "create", description: "Criar empresas clientes" },
    { id: nanoid(), name: "companies:read", resource: "companies", action: "read", description: "Visualizar empresas clientes" },
    { id: nanoid(), name: "companies:update", resource: "companies", action: "update", description: "Editar empresas clientes" },
    { id: nanoid(), name: "companies:delete", resource: "companies", action: "delete", description: "Remover empresas clientes" },
    { id: nanoid(), name: "proposals:create", resource: "proposals", action: "create", description: "Criar propostas" },
    { id: nanoid(), name: "proposals:read", resource: "proposals", action: "read", description: "Visualizar propostas" },
    { id: nanoid(), name: "services:create", resource: "services", action: "create", description: "Criar servicos" },
    { id: nanoid(), name: "services:read", resource: "services", action: "read", description: "Visualizar servicos" },
    { id: nanoid(), name: "surveys:create", resource: "surveys", action: "create", description: "Criar pesquisas" },
    { id: nanoid(), name: "surveys:respond", resource: "surveys", action: "respond", description: "Responder pesquisas" },
    { id: nanoid(), name: "training:create", resource: "training", action: "create", description: "Criar treinamentos" },
    { id: nanoid(), name: "training:read", resource: "training", action: "read", description: "Visualizar treinamentos" },
    { id: nanoid(), name: "reports:create_anonymous", resource: "reports", action: "create_anonymous", description: "Criar denuncia anonima" },
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
    const consultantRole = dbRoles.find((r: any) => r.systemName === "consultant");
    const managerRole = dbRoles.find((r: any) => r.systemName === "manager");
    const companyAdminRole = dbRoles.find((r: any) => r.systemName === "company_admin");
    const analystRole = dbRoles.find((r: any) => r.systemName === "analyst");
    const viewerRole = dbRoles.find((r: any) => r.systemName === "viewer");

    const rpEntries: Array<{id: string; roleId: string; permissionId: string}> = [];

    // Consultant gets ALL permissions (manages companies, assessments, proposals, etc.)
    if (consultantRole) {
      for (const perm of dbPerms) {
        rpEntries.push({ id: nanoid(), roleId: consultantRole.id, permissionId: perm.id });
      }
    }

    // Manager gets ALL permissions (backward compat)
    if (managerRole) {
      for (const perm of dbPerms) {
        rpEntries.push({ id: nanoid(), roleId: managerRole.id, permissionId: perm.id });
      }
    }

    // Company Admin: read reports/dashboards, respond surveys, create anonymous reports, view training, manage own sectors/people
    if (companyAdminRole) {
      const companyPerms = dbPerms.filter((p: any) =>
        // Read-only: assessments, reports, subscriptions, services, proposals
        (["assessments", "reports", "subscriptions", "services", "proposals", "training", "companies"].includes(p.resource) && p.action === "read") ||
        // Full CRUD: sectors, people (own company)
        ["sectors", "people"].includes(p.resource) ||
        // Tickets: create + read
        (p.resource === "tickets" && (p.action === "create" || p.action === "read")) ||
        // Respond surveys
        (p.resource === "surveys" && p.action === "respond") ||
        // Create anonymous reports
        (p.resource === "reports" && p.action === "create_anonymous") ||
        // Export reports/PDFs
        (p.resource === "reports" && p.action === "export") ||
        // Data export
        (p.resource === "data_export" && p.action === "read")
      );
      for (const perm of companyPerms) {
        rpEntries.push({ id: nanoid(), roleId: companyAdminRole.id, permissionId: perm.id });
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
      tenantType: "admin",
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
    // Ensure tenantType is set to "admin" for existing tenant
    if ((existingTenant[0] as any).tenantType !== "admin") {
      await db.update(tenants).set({ tenantType: "admin" } as any).where(eq(tenants.id, tenantId));
      console.log(`  ~ Updated tenantType to "admin" for existing tenant`);
    }
    console.log(`  = Tenant already exists: ${existingTenant[0].name}`);
  }

  // 7b. Seed Admin Services (tabela de referência para auto-seed nas consultorias)
  console.log("[7b] Seeding admin services...");
  const adminServicesDefault = [
    { category: "copsoq",        name: "Avaliação COPSOQ-II (por colaborador)",      description: "Diagnóstico psicossocial completo por colaborador", unit: "person",  minPrice: 30000,  maxPrice: 50000  },
    { category: "inventario",    name: "Inventário de Riscos Psicossociais",          description: "Mapeamento e classificação de riscos (projeto)",       unit: "project", minPrice: 80000,  maxPrice: 150000 },
    { category: "plano_acao",    name: "Plano de Ação (por ação)",                   description: "Elaboração de plano de ação por fator de risco",       unit: "item",    minPrice: 25000,  maxPrice: 45000  },
    { category: "treinamento",   name: "Treinamento NR-01 (por colaborador, 8h)",    description: "Programa de treinamento presencial ou EAD",            unit: "person",  minPrice: 10000,  maxPrice: 15000  },
    { category: "pgr_pcmso",     name: "Integração PGR/PCMSO",                       description: "Integração do PPRA psicossocial ao PGR e PCMSO",       unit: "project", minPrice: 200000, maxPrice: 350000 },
    { category: "acompanhamento",name: "Acompanhamento Trimestral",                  description: "Monitoramento contínuo (por trimestre)",               unit: "project", minPrice: 150000, maxPrice: 250000 },
    { category: "lideranca",     name: "Treinamento de Lideranças",                  description: "Workshop de gestão e saúde mental para líderes",       unit: "project", minPrice: 280000, maxPrice: 420000 },
    { category: "certificacao",  name: "Certificação de Conformidade NR-01",         description: "Emissão do certificado de conformidade NR-01",         unit: "project", minPrice: 80000,  maxPrice: 160000 },
  ];
  const existingAdminSvcs = await db.select({ id: services.id }).from(services)
    .where(eq(services.tenantId, tenantId)).limit(1);
  if (existingAdminSvcs.length === 0) {
    for (const svc of adminServicesDefault) {
      await db.insert(services).values({
        id: nanoid(),
        tenantId,
        name: svc.name,
        description: svc.description,
        category: svc.category,
        unit: svc.unit,
        minPrice: svc.minPrice,
        maxPrice: svc.maxPrice,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    console.log(`  + ${adminServicesDefault.length} admin services seeded`);

    // Seed pricing parameters for admin
    await db.insert(pricingParameters).values({
      id: nanoid(),
      tenantId,
      monthlyFixedCost: 500000,   // R$5.000/mês custos fixos (centavos)
      laborCost: 1200000,          // R$12.000/mês mão de obra
      productiveHoursPerMonth: 160,
      defaultTaxRegime: "SN",
      riskAdjustment: 100,
      seniorityAdjustment: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  + Admin pricing parameters seeded`);
  } else {
    console.log(`  = Admin services already exist`);
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
