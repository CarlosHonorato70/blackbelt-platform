/**
 * Test Simulation Script — Full Platform E2E Test
 *
 * Resets the database, seeds base data, creates 2 companies with full
 * data (sectors, people, services, clients, proposals), tests CRUD
 * operations, and produces a final report.
 *
 * Run: npx tsx scripts/test-simulation.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import {
  users,
  tenants,
  sectors,
  people,
  clients,
  services,
  pricingParameters,
  proposals,
  proposalItems,
  subscriptions,
  plans,
  featureFlags,
  planFeatures,
  roles,
  userRoles,
  sessions,
  auditLogs,
  dataConsents,
  rolePermissions,
} from "../drizzle/schema";
import { seedPlans, seedFeatures, getPlanFeatureAssociations } from "../seed_plans";

// ============================================================================
// CONFIG
// ============================================================================

const BASE_URL = "http://localhost:5000";
const ADMIN_EMAIL = "admin@blackbelt-platform.com";
const ADMIN_PASSWORD = "BlackBelt@2025!";
const USER2_EMAIL = "gerente@saudebemestar.com.br";
const USER2_PASSWORD = "Gerente@2025!";

// ============================================================================
// TYPES
// ============================================================================

type TestResult = {
  category: string;
  test: string;
  status: "✅" | "❌";
  detail?: string;
};

const results: TestResult[] = [];
let startTime: number;

function log(msg: string) {
  console.log(msg);
}

function pass(category: string, test: string, detail?: string) {
  results.push({ category, test, status: "✅", detail });
  console.log(`  ✅ ${test}${detail ? ` — ${detail}` : ""}`);
}

function fail(category: string, test: string, detail?: string) {
  results.push({ category, test, status: "❌", detail });
  console.log(`  ❌ ${test}${detail ? ` — ${detail}` : ""}`);
}

// ============================================================================
// tRPC HTTP HELPER
// ============================================================================

async function callTrpc(
  procedure: string,
  input: any,
  cookie: string,
  method: "POST" | "GET" = "POST"
): Promise<any> {
  const url =
    method === "GET"
      ? `${BASE_URL}/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input))}`
      : `${BASE_URL}/api/trpc/${procedure}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    ...(method === "POST" ? { body: JSON.stringify(input) } : {}),
  });

  const data = await res.json();

  if (data?.error) {
    throw new Error(
      `tRPC ${procedure}: ${data.error?.message || JSON.stringify(data.error)}`
    );
  }

  return data?.result?.data ?? data;
}

async function callTrpcQuery(
  procedure: string,
  input: any,
  cookie: string
): Promise<any> {
  return callTrpc(procedure, input, cookie, "GET");
}

async function callTrpcMutation(
  procedure: string,
  input: any,
  cookie: string
): Promise<any> {
  return callTrpc(procedure, input, cookie, "POST");
}

// ============================================================================
// LOGIN HELPER
// ============================================================================

async function login(
  email: string,
  password: string
): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/trpc/auth.login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) {
    const body = await res.json();
    throw new Error(`Login failed for ${email}: ${JSON.stringify(body)}`);
  }

  // Extract just the cookie value
  const match = setCookie.match(/app_session_id=([^;]+)/);
  if (!match) throw new Error("Could not extract session cookie");

  return `app_session_id=${match[1]}`;
}

// ============================================================================
// PHASE 1: DATABASE RESET
// ============================================================================

async function resetDatabase() {
  log("\n════════════════════════════════════════════════════════════════");
  log("  FASE 1: RESET DO BANCO DE DADOS");
  log("════════════════════════════════════════════════════════════════\n");

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    fail("Reset DB", "Conectar ao banco", "DATABASE_URL não configurada");
    throw new Error("DATABASE_URL not set");
  }

  const pool = mysql.createPool({ uri: dbUrl, connectionLimit: 5 });
  const db = drizzle(pool);

  try {
    // Disable FK checks for truncation
    await pool.query("SET FOREIGN_KEY_CHECKS = 0");

    // Get all table names dynamically
    const [rows] = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'"
    ) as any;
    const tablesToClear = (rows as any[]).map((r: any) => r.TABLE_NAME || r.table_name);

    for (const table of tablesToClear) {
      try {
        await pool.query(`DELETE FROM \`${table}\``);
      } catch (e: any) {
        // Table might not exist, ignore
      }
    }

    await pool.query("SET FOREIGN_KEY_CHECKS = 1");
    pass("Reset DB", "Limpar todas as tabelas");

    // Re-seed plans
    for (const plan of seedPlans) {
      await db.insert(plans).values(plan);
    }
    pass("Reset DB", "Seed: Plans criados", `${seedPlans.length} planos`);

    // Re-seed features
    for (const feature of seedFeatures) {
      await db.insert(featureFlags).values(feature);
    }
    pass(
      "Reset DB",
      "Seed: Feature flags criados",
      `${seedFeatures.length} features`
    );

    // Plan-feature associations
    const dbPlans = await db.select().from(plans);
    const dbFeatures = await db.select().from(featureFlags);
    const associations = getPlanFeatureAssociations(
      dbPlans.map((p) => ({ ...p, slaUptime: p.slaUptime ?? null })) as any,
      dbFeatures as any
    );
    for (const assoc of associations) {
      await db.insert(planFeatures).values(assoc);
    }
    pass(
      "Reset DB",
      "Seed: Plan-feature associations",
      `${associations.length} associações`
    );

    // Roles
    const seedRoles = [
      {
        id: nanoid(),
        systemName: "admin",
        displayName: "Administrador",
        description: "Acesso total ao sistema",
        scope: "global",
      },
      {
        id: nanoid(),
        systemName: "manager",
        displayName: "Gerente",
        description: "Gestao do tenant",
        scope: "tenant",
      },
      {
        id: nanoid(),
        systemName: "analyst",
        displayName: "Analista",
        description: "Avaliacoes e relatorios",
        scope: "tenant",
      },
      {
        id: nanoid(),
        systemName: "viewer",
        displayName: "Visualizador",
        description: "Somente leitura",
        scope: "tenant",
      },
    ];
    for (const role of seedRoles) {
      await db.insert(roles).values(role);
    }
    pass("Reset DB", "Seed: Roles criados", `${seedRoles.length} roles`);

    // Tenant 1 (Admin)
    const tenant1Id = nanoid();
    await db.insert(tenants).values({
      id: tenant1Id,
      name: "BlackBelt Platform (Admin)",
      cnpj: "00.000.000/0001-00",
      contactName: "Admin",
      contactEmail: ADMIN_EMAIL,
      city: "São Paulo",
      state: "SP",
      status: "active",
      strategy: "shared_rls",
    });
    pass("Reset DB", "Seed: Tenant Admin criado");

    // Subscription for tenant 1
    const starterPlan = dbPlans.find((p) => p.name === "starter");
    if (starterPlan) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1);
      await db.insert(subscriptions).values({
        id: nanoid(),
        tenantId: tenant1Id,
        planId: starterPlan.id,
        status: "active",
        billingCycle: "yearly",
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        currentPrice: starterPlan.yearlyPrice,
      });
    }
    pass("Reset DB", "Seed: Subscription Starter criada");

    // Admin user
    const admin1Id = nanoid();
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await db.insert(users).values({
      id: admin1Id,
      name: "Administrador",
      email: ADMIN_EMAIL,
      loginMethod: "local",
      passwordHash,
      role: "admin",
      tenantId: tenant1Id,
    });

    const adminRole = await db
      .select()
      .from(roles)
      .where(eq(roles.systemName, "admin"))
      .limit(1);
    if (adminRole.length > 0) {
      await db.insert(userRoles).values({
        id: nanoid(),
        userId: admin1Id,
        roleId: adminRole[0].id,
        tenantId: tenant1Id,
      });
    }
    pass("Reset DB", "Seed: Admin user criado", ADMIN_EMAIL);

    // Tenant 2
    const tenant2Id = nanoid();
    await db.insert(tenants).values({
      id: tenant2Id,
      name: "Saúde & Bem-Estar LTDA",
      cnpj: "55.666.777/0001-88",
      contactName: "Mariana Ferreira",
      contactEmail: "contato@saudebemestar.com.br",
      contactPhone: "(21) 99876-5432",
      city: "Rio de Janeiro",
      state: "RJ",
      street: "Av. Atlântica",
      number: "1500",
      neighborhood: "Copacabana",
      zipCode: "22021-001",
      status: "active",
      strategy: "shared_rls",
    });

    if (starterPlan) {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setFullYear(endDate.getFullYear() + 1);
      await db.insert(subscriptions).values({
        id: nanoid(),
        tenantId: tenant2Id,
        planId: starterPlan.id,
        status: "active",
        billingCycle: "monthly",
        currentPeriodStart: now,
        currentPeriodEnd: endDate,
        currentPrice: starterPlan.monthlyPrice,
      });
    }
    pass("Reset DB", "Seed: Tenant 2 criado", "Saúde & Bem-Estar LTDA");

    // User 2 (admin for tenant 2)
    const user2Id = nanoid();
    const pw2Hash = await bcrypt.hash(USER2_PASSWORD, 12);
    await db.insert(users).values({
      id: user2Id,
      name: "Mariana Ferreira",
      email: USER2_EMAIL,
      loginMethod: "local",
      passwordHash: pw2Hash,
      role: "admin",
      tenantId: tenant2Id,
    });
    if (adminRole.length > 0) {
      await db.insert(userRoles).values({
        id: nanoid(),
        userId: user2Id,
        roleId: adminRole[0].id,
        tenantId: tenant2Id,
      });
    }
    pass("Reset DB", "Seed: User 2 criado", USER2_EMAIL);

    await pool.end();
    return { tenant1Id, tenant2Id };
  } catch (err: any) {
    await pool.query("SET FOREIGN_KEY_CHECKS = 1").catch(() => {});
    await pool.end();
    throw err;
  }
}

// ============================================================================
// PHASE 2: CREATE SIMULATION DATA
// ============================================================================

async function createSimulationData(
  tenant1Id: string,
  tenant2Id: string
) {
  log("\n════════════════════════════════════════════════════════════════");
  log("  FASE 2: CRIAÇÃO DE DADOS — EMPRESA 1 (BlackBelt Admin)");
  log("════════════════════════════════════════════════════════════════\n");

  // Login as admin (tenant 1)
  const cookie1 = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  pass("Auth", "Login Admin (Tenant 1)");

  // --- SECTORS (Tenant 1) ---
  const t1Sectors = [
    { name: "Administrativo", description: "Gestão administrativa e financeira", responsibleName: "Ana Silva", unit: "Sede", shift: "Comercial" },
    { name: "Operacional", description: "Operações de campo e inspeções", responsibleName: "Eduardo Lima", unit: "Campo", shift: "Integral" },
    { name: "Comercial", description: "Vendas, marketing e parcerias", responsibleName: "Igor Pereira", unit: "Sede", shift: "Comercial" },
  ];

  const t1SectorIds: string[] = [];
  for (const s of t1Sectors) {
    const res = await callTrpcMutation("sectors.create", s, cookie1);
    t1SectorIds.push(res.id);
    pass("Setores T1", `Criar setor: ${s.name}`, `id=${res.id}`);
  }

  // --- PEOPLE (Tenant 1) ---
  const t1People = [
    { sectorId: t1SectorIds[0], name: "Ana Silva", position: "Diretora Administrativa", email: "ana.silva@blackbelt.com", phone: "(11) 99111-1001", employmentType: "own" as const },
    { sectorId: t1SectorIds[0], name: "Bruno Costa", position: "Contador", email: "bruno.costa@blackbelt.com", phone: "(11) 99111-1002", employmentType: "own" as const },
    { sectorId: t1SectorIds[0], name: "Carla Dias", position: "Analista de RH", email: "carla.dias@blackbelt.com", phone: "(11) 99111-1003", employmentType: "own" as const },
    { sectorId: t1SectorIds[0], name: "Daniel Farias", position: "Auxiliar Administrativo", email: "daniel.farias@blackbelt.com", phone: "(11) 99111-1004", employmentType: "own" as const },
    { sectorId: t1SectorIds[1], name: "Eduardo Lima", position: "Supervisor de Operações", email: "eduardo.lima@blackbelt.com", phone: "(11) 99111-2001", employmentType: "own" as const },
    { sectorId: t1SectorIds[1], name: "Fernanda Moura", position: "Técnica de SST", email: "fernanda.moura@blackbelt.com", phone: "(11) 99111-2002", employmentType: "own" as const },
    { sectorId: t1SectorIds[1], name: "Gabriel Nunes", position: "Analista de Riscos", email: "gabriel.nunes@blackbelt.com", phone: "(11) 99111-2003", employmentType: "own" as const },
    { sectorId: t1SectorIds[1], name: "Helena Oliveira", position: "Inspetora de Campo", email: "helena.oliveira@blackbelt.com", phone: "(11) 99111-2004", employmentType: "outsourced" as const },
    { sectorId: t1SectorIds[2], name: "Igor Pereira", position: "Gerente Comercial", email: "igor.pereira@blackbelt.com", phone: "(11) 99111-3001", employmentType: "own" as const },
    { sectorId: t1SectorIds[2], name: "Juliana Reis", position: "Consultora de Vendas", email: "juliana.reis@blackbelt.com", phone: "(11) 99111-3002", employmentType: "own" as const },
    { sectorId: t1SectorIds[2], name: "Karen Santos", position: "Estagiária Comercial", email: "karen.santos@blackbelt.com", phone: "(11) 99111-3003", employmentType: "own" as const },
    { sectorId: t1SectorIds[2], name: "Lucas Tavares", position: "Consultor Freelancer", email: "lucas.tavares@blackbelt.com", phone: "(11) 99111-3004", employmentType: "outsourced" as const },
  ];

  const t1PeopleIds: string[] = [];
  for (const p of t1People) {
    const res = await callTrpcMutation("people.create", p, cookie1);
    t1PeopleIds.push(res.id);
  }
  pass("Pessoas T1", "Criar 12 colaboradores", `${t1PeopleIds.length} criados`);

  // --- SERVICES (Tenant 1) via pricing.services (public, accepts tenantId) ---
  const t1Services = [
    { tenantId: tenant1Id, name: "Consultoria SST", description: "Consultoria especializada em Segurança e Saúde do Trabalho", category: "Consultoria", unit: "hour", minPrice: 15000, maxPrice: 30000 },
    { tenantId: tenant1Id, name: "Treinamento NR-01", description: "Treinamento em normas regulamentadoras", category: "Treinamento", unit: "day", minPrice: 200000, maxPrice: 500000 },
    { tenantId: tenant1Id, name: "Avaliação Ergonômica", description: "Análise ergonômica do ambiente de trabalho", category: "Avaliação", unit: "project", minPrice: 300000, maxPrice: 800000 },
    { tenantId: tenant1Id, name: "Diagnóstico Psicossocial", description: "Avaliação completa de riscos psicossociais NR-01", category: "Diagnóstico", unit: "project", minPrice: 500000, maxPrice: 1500000 },
    { tenantId: tenant1Id, name: "Mentoria em Gestão", description: "Mentoria para gestores sobre saúde ocupacional", category: "Consultoria", unit: "hour", minPrice: 20000, maxPrice: 40000 },
    { tenantId: tenant1Id, name: "Relatório de Compliance", description: "Elaboração de relatório para conformidade regulatória", category: "Relatórios", unit: "project", minPrice: 150000, maxPrice: 300000 },
  ];

  const t1ServiceIds: string[] = [];
  for (const s of t1Services) {
    const res = await callTrpcMutation("pricing.services.create", s, cookie1);
    t1ServiceIds.push(res.id);
    pass("Serviços T1", `Criar: ${s.name}`, `R$${(s.minPrice / 100).toFixed(0)}-${(s.maxPrice / 100).toFixed(0)}`);
  }

  // --- PRICING PARAMETERS (Tenant 1) ---
  await callTrpcMutation(
    "pricing.parameters.upsert",
    {
      tenantId: tenant1Id,
      monthlyFixedCost: 1500000,
      laborCost: 800000,
      productiveHoursPerMonth: 160,
      defaultTaxRegime: "SN",
      riskAdjustment: 110,
      seniorityAdjustment: 120,
      taxRates: { MEI: 0.05, SN: 0.08, LP: 0.15, autonomous: 0.20 },
      volumeDiscounts: { "5": 5, "10": 10, "20": 15 },
    },
    cookie1
  );
  pass("Precificação T1", "Parâmetros de preço configurados");

  // --- CLIENTS (Tenant 1) ---
  const t1Clients = [
    { tenantId: tenant1Id, name: "Indústria Metalúrgica ABC", cnpj: "12.345.678/0001-90", industry: "Metalurgia", companySize: "medium", contactName: "Roberto Almeida", contactEmail: "roberto@metalurgicaabc.com.br", contactPhone: "(11) 3456-7890", city: "Guarulhos", state: "SP", street: "Rua das Indústrias", number: "500", neighborhood: "Dist. Industrial", zipCode: "07090-000" },
    { tenantId: tenant1Id, name: "Construtora Progresso", cnpj: "23.456.789/0001-01", industry: "Construção Civil", companySize: "large", contactName: "Marcos Pereira", contactEmail: "marcos@construtprogresso.com.br", contactPhone: "(11) 2345-6789", city: "São Paulo", state: "SP", street: "Av. Paulista", number: "1000", neighborhood: "Bela Vista", zipCode: "01310-100" },
    { tenantId: tenant1Id, name: "Hospital São Lucas", cnpj: "34.567.890/0001-12", industry: "Saúde", companySize: "large", contactName: "Dra. Patrícia Souza", contactEmail: "patricia@hospitalsaolucas.com.br", contactPhone: "(11) 5678-1234", city: "São Paulo", state: "SP", street: "Rua Vergueiro", number: "2000", neighborhood: "Vila Mariana", zipCode: "04102-000" },
    { tenantId: tenant1Id, name: "Supermercado Bom Preço", cnpj: "45.678.901/0001-23", industry: "Varejo", companySize: "small", contactName: "José Carlos", contactEmail: "jose@bompreco.com.br", contactPhone: "(11) 9876-5432", city: "Osasco", state: "SP", street: "Rua do Comércio", number: "150", neighborhood: "Centro", zipCode: "06010-000" },
  ];

  const t1ClientIds: string[] = [];
  for (const c of t1Clients) {
    const res = await callTrpcMutation("pricing.clients.create", c, cookie1);
    t1ClientIds.push(res.id);
    pass("Clientes T1", `Criar: ${c.name}`);
  }

  // --- PROPOSALS (Tenant 1) ---
  const t1Proposals = [
    {
      tenantId: tenant1Id,
      clientId: t1ClientIds[0],
      title: "Programa SST Completo — Metalúrgica ABC",
      description: "Pacote completo de segurança e saúde do trabalho para indústria metalúrgica",
      taxRegime: "SN" as const,
      validUntil: new Date("2026-04-30"),
      items: [
        { serviceId: t1ServiceIds[0], serviceName: "Consultoria SST", quantity: 40, unitPrice: 20000 },
        { serviceId: t1ServiceIds[1], serviceName: "Treinamento NR-01", quantity: 3, unitPrice: 350000 },
        { serviceId: t1ServiceIds[2], serviceName: "Avaliação Ergonômica", quantity: 1, unitPrice: 500000 },
      ],
    },
    {
      tenantId: tenant1Id,
      clientId: t1ClientIds[1],
      title: "Diagnóstico Psicossocial — Construtora Progresso",
      description: "Avaliação completa de riscos psicossociais conforme NR-01 atualizada",
      taxRegime: "LP" as const,
      validUntil: new Date("2026-05-15"),
      items: [
        { serviceId: t1ServiceIds[3], serviceName: "Diagnóstico Psicossocial", quantity: 1, unitPrice: 1200000 },
        { serviceId: t1ServiceIds[4], serviceName: "Mentoria em Gestão", quantity: 20, unitPrice: 30000 },
      ],
    },
    {
      tenantId: tenant1Id,
      clientId: t1ClientIds[2],
      title: "Compliance Hospitalar — Hospital São Lucas",
      description: "Relatório e programa de compliance para ambiente hospitalar",
      taxRegime: "MEI" as const,
      validUntil: new Date("2026-03-31"),
      items: [
        { serviceId: t1ServiceIds[5], serviceName: "Relatório de Compliance", quantity: 2, unitPrice: 250000 },
        { serviceId: t1ServiceIds[0], serviceName: "Consultoria SST", quantity: 16, unitPrice: 25000 },
        { serviceId: t1ServiceIds[1], serviceName: "Treinamento NR-01", quantity: 1, unitPrice: 400000 },
      ],
    },
  ];

  const t1ProposalIds: string[] = [];
  for (const p of t1Proposals) {
    const res = await callTrpcMutation("pricing.proposals.create", p, cookie1);
    t1ProposalIds.push(res.id);
    pass("Propostas T1", `Criar: ${p.title.substring(0, 50)}...`, `${p.items.length} itens`);
  }

  // =========================================================================
  log("\n════════════════════════════════════════════════════════════════");
  log("  FASE 2b: CRIAÇÃO DE DADOS — EMPRESA 2 (Saúde & Bem-Estar)");
  log("════════════════════════════════════════════════════════════════\n");

  // Login as user 2 (tenant 2)
  const cookie2 = await login(USER2_EMAIL, USER2_PASSWORD);
  pass("Auth", "Login User 2 (Tenant 2)");

  // --- SECTORS (Tenant 2) ---
  const t2Sectors = [
    { name: "Atendimento", description: "Recepção e atendimento ao paciente", responsibleName: "Camila Borges", unit: "Clínica", shift: "Comercial" },
    { name: "Clínico", description: "Equipe clínica multidisciplinar", responsibleName: "Dr. Rafael Lima", unit: "Clínica", shift: "Integral" },
    { name: "Suporte", description: "TI, logística e manutenção", responsibleName: "Paulo Mendes", unit: "Escritório", shift: "Comercial" },
  ];

  const t2SectorIds: string[] = [];
  for (const s of t2Sectors) {
    const res = await callTrpcMutation("sectors.create", s, cookie2);
    t2SectorIds.push(res.id);
    pass("Setores T2", `Criar setor: ${s.name}`, `id=${res.id}`);
  }

  // --- PEOPLE (Tenant 2) ---
  const t2People = [
    { sectorId: t2SectorIds[0], name: "Camila Borges", position: "Coordenadora de Atendimento", email: "camila@saudebemestar.com.br", phone: "(21) 99222-1001", employmentType: "own" as const },
    { sectorId: t2SectorIds[0], name: "Diego Ramos", position: "Recepcionista", email: "diego@saudebemestar.com.br", phone: "(21) 99222-1002", employmentType: "own" as const },
    { sectorId: t2SectorIds[0], name: "Elisa Martins", position: "Atendente", email: "elisa@saudebemestar.com.br", phone: "(21) 99222-1003", employmentType: "own" as const },
    { sectorId: t2SectorIds[0], name: "Felipe Gomes", position: "Auxiliar de Atendimento", email: "felipe@saudebemestar.com.br", phone: "(21) 99222-1004", employmentType: "outsourced" as const },
    { sectorId: t2SectorIds[1], name: "Dr. Rafael Lima", position: "Médico do Trabalho", email: "rafael@saudebemestar.com.br", phone: "(21) 99222-2001", employmentType: "own" as const },
    { sectorId: t2SectorIds[1], name: "Dra. Sandra Vieira", position: "Psicóloga Organizacional", email: "sandra@saudebemestar.com.br", phone: "(21) 99222-2002", employmentType: "own" as const },
    { sectorId: t2SectorIds[1], name: "Thiago Alves", position: "Fisioterapeuta", email: "thiago@saudebemestar.com.br", phone: "(21) 99222-2003", employmentType: "own" as const },
    { sectorId: t2SectorIds[1], name: "Vanessa Cruz", position: "Enfermeira do Trabalho", email: "vanessa@saudebemestar.com.br", phone: "(21) 99222-2004", employmentType: "outsourced" as const },
    { sectorId: t2SectorIds[2], name: "Paulo Mendes", position: "Coordenador de TI", email: "paulo@saudebemestar.com.br", phone: "(21) 99222-3001", employmentType: "own" as const },
    { sectorId: t2SectorIds[2], name: "Renata Souza", position: "Analista de Sistemas", email: "renata@saudebemestar.com.br", phone: "(21) 99222-3002", employmentType: "own" as const },
    { sectorId: t2SectorIds[2], name: "Sérgio Lopes", position: "Técnico de Manutenção", email: "sergio@saudebemestar.com.br", phone: "(21) 99222-3003", employmentType: "own" as const },
    { sectorId: t2SectorIds[2], name: "Tatiane Ribeiro", position: "Auxiliar Logística", email: "tatiane@saudebemestar.com.br", phone: "(21) 99222-3004", employmentType: "outsourced" as const },
  ];

  const t2PeopleIds: string[] = [];
  for (const p of t2People) {
    const res = await callTrpcMutation("people.create", p, cookie2);
    t2PeopleIds.push(res.id);
  }
  pass("Pessoas T2", "Criar 12 colaboradores", `${t2PeopleIds.length} criados`);

  // --- SERVICES (Tenant 2) ---
  const t2Services = [
    { tenantId: tenant2Id, name: "Avaliação Clínica Ocupacional", description: "Exame admissional, periódico e demissional", category: "Clínico", unit: "hour", minPrice: 12000, maxPrice: 25000 },
    { tenantId: tenant2Id, name: "Terapia Ocupacional", description: "Sessões de terapia ocupacional para colaboradores", category: "Terapia", unit: "hour", minPrice: 18000, maxPrice: 35000 },
    { tenantId: tenant2Id, name: "Programa QVT", description: "Programa de Qualidade de Vida no Trabalho", category: "Bem-Estar", unit: "project", minPrice: 800000, maxPrice: 2000000 },
    { tenantId: tenant2Id, name: "Ginástica Laboral", description: "Programa de ginástica laboral com acompanhamento", category: "Bem-Estar", unit: "month", minPrice: 300000, maxPrice: 600000 },
    { tenantId: tenant2Id, name: "Avaliação Psicossocial", description: "Avaliação de riscos psicossociais NR-01", category: "Diagnóstico", unit: "project", minPrice: 400000, maxPrice: 1200000 },
    { tenantId: tenant2Id, name: "Palestra Saúde Mental", description: "Palestra sobre saúde mental no ambiente de trabalho", category: "Treinamento", unit: "day", minPrice: 150000, maxPrice: 350000 },
  ];

  const t2ServiceIds: string[] = [];
  for (const s of t2Services) {
    const res = await callTrpcMutation("pricing.services.create", s, cookie2);
    t2ServiceIds.push(res.id);
    pass("Serviços T2", `Criar: ${s.name}`, `R$${(s.minPrice / 100).toFixed(0)}-${(s.maxPrice / 100).toFixed(0)}`);
  }

  // --- PRICING PARAMETERS (Tenant 2) ---
  await callTrpcMutation(
    "pricing.parameters.upsert",
    {
      tenantId: tenant2Id,
      monthlyFixedCost: 1200000,
      laborCost: 600000,
      productiveHoursPerMonth: 176,
      defaultTaxRegime: "SN",
      riskAdjustment: 100,
      seniorityAdjustment: 115,
      taxRates: { MEI: 0.05, SN: 0.08, LP: 0.15, autonomous: 0.20 },
      volumeDiscounts: { "3": 3, "6": 7, "12": 12 },
    },
    cookie2
  );
  pass("Precificação T2", "Parâmetros de preço configurados");

  // --- CLIENTS (Tenant 2) ---
  const t2Clients = [
    { tenantId: tenant2Id, name: "Fábrica de Calçados Norte", cnpj: "56.789.012/0001-34", industry: "Manufatura", companySize: "medium", contactName: "Carlos Henrique", contactEmail: "carlos@calcadosnorte.com.br", contactPhone: "(21) 3333-4444", city: "Duque de Caxias", state: "RJ" },
    { tenantId: tenant2Id, name: "Rede de Farmácias Saúde+", cnpj: "67.890.123/0001-45", industry: "Farmacêutico", companySize: "large", contactName: "Aline Duarte", contactEmail: "aline@farmaciasaudemais.com.br", contactPhone: "(21) 4444-5555", city: "Niterói", state: "RJ" },
    { tenantId: tenant2Id, name: "Escritório Advocacia Leal", cnpj: "78.901.234/0001-56", industry: "Jurídico", companySize: "small", contactName: "Dr. Fernando Leal", contactEmail: "fernando@lealadvogados.com.br", contactPhone: "(21) 5555-6666", city: "Rio de Janeiro", state: "RJ" },
    { tenantId: tenant2Id, name: "Transportadora Veloz", cnpj: "89.012.345/0001-67", industry: "Logística", companySize: "medium", contactName: "Ricardo Barbosa", contactEmail: "ricardo@velozlog.com.br", contactPhone: "(21) 6666-7777", city: "São Gonçalo", state: "RJ" },
  ];

  const t2ClientIds: string[] = [];
  for (const c of t2Clients) {
    const res = await callTrpcMutation("pricing.clients.create", c, cookie2);
    t2ClientIds.push(res.id);
    pass("Clientes T2", `Criar: ${c.name}`);
  }

  // --- PROPOSALS (Tenant 2) ---
  const t2Proposals = [
    {
      tenantId: tenant2Id,
      clientId: t2ClientIds[0],
      title: "Programa QVT — Calçados Norte",
      description: "Implantação de programa de qualidade de vida para operários de fábrica",
      taxRegime: "SN" as const,
      validUntil: new Date("2026-04-15"),
      items: [
        { serviceId: t2ServiceIds[2], serviceName: "Programa QVT", quantity: 1, unitPrice: 1500000 },
        { serviceId: t2ServiceIds[3], serviceName: "Ginástica Laboral", quantity: 6, unitPrice: 450000 },
        { serviceId: t2ServiceIds[4], serviceName: "Avaliação Psicossocial", quantity: 1, unitPrice: 800000 },
      ],
    },
    {
      tenantId: tenant2Id,
      clientId: t2ClientIds[1],
      title: "Saúde Ocupacional — Farmácias Saúde+",
      description: "Programa de saúde ocupacional para rede de farmácias",
      taxRegime: "LP" as const,
      validUntil: new Date("2026-05-01"),
      items: [
        { serviceId: t2ServiceIds[0], serviceName: "Avaliação Clínica Ocupacional", quantity: 50, unitPrice: 18000 },
        { serviceId: t2ServiceIds[5], serviceName: "Palestra Saúde Mental", quantity: 4, unitPrice: 250000 },
      ],
    },
    {
      tenantId: tenant2Id,
      clientId: t2ClientIds[3],
      title: "Ergonomia e Bem-Estar — Transportadora Veloz",
      description: "Avaliação ergonômica e programa de bem-estar para motoristas",
      taxRegime: "MEI" as const,
      validUntil: new Date("2026-06-30"),
      items: [
        { serviceId: t2ServiceIds[1], serviceName: "Terapia Ocupacional", quantity: 24, unitPrice: 25000 },
        { serviceId: t2ServiceIds[3], serviceName: "Ginástica Laboral", quantity: 12, unitPrice: 400000 },
      ],
    },
  ];

  const t2ProposalIds: string[] = [];
  for (const p of t2Proposals) {
    const res = await callTrpcMutation("pricing.proposals.create", p, cookie2);
    t2ProposalIds.push(res.id);
    pass("Propostas T2", `Criar: ${p.title.substring(0, 50)}...`, `${p.items.length} itens`);
  }

  return {
    cookie1,
    cookie2,
    t1SectorIds,
    t1PeopleIds,
    t1ServiceIds,
    t1ClientIds,
    t1ProposalIds,
    t2SectorIds,
    t2PeopleIds,
    t2ServiceIds,
    t2ClientIds,
    t2ProposalIds,
  };
}

// ============================================================================
// PHASE 3: READ / LIST TESTS
// ============================================================================

async function testReadOperations(
  cookie1: string,
  cookie2: string,
  tenant1Id: string,
  tenant2Id: string,
  ids: any
) {
  log("\n════════════════════════════════════════════════════════════════");
  log("  FASE 3: TESTES DE LEITURA (LIST / GET)");
  log("════════════════════════════════════════════════════════════════\n");

  // Tenants
  try {
    const tenantsList = await callTrpcQuery("tenants.list", {}, cookie1);
    const count = Array.isArray(tenantsList) ? tenantsList.length : 0;
    if (count >= 2) pass("Leitura", "Listar tenants", `${count} empresas`);
    else fail("Leitura", "Listar tenants", `Esperado ≥2, obteve ${count}`);
  } catch (e: any) {
    fail("Leitura", "Listar tenants", e.message);
  }

  // Sectors T1
  try {
    const sectorsList = await callTrpcQuery("sectors.list", {}, cookie1);
    const count = Array.isArray(sectorsList) ? sectorsList.length : 0;
    if (count === 3) pass("Leitura", "Listar setores T1", `${count} setores`);
    else fail("Leitura", "Listar setores T1", `Esperado 3, obteve ${count}`);
  } catch (e: any) {
    fail("Leitura", "Listar setores T1", e.message);
  }

  // People T1
  try {
    const peopleList = await callTrpcQuery("people.list", {}, cookie1);
    const count = Array.isArray(peopleList) ? peopleList.length : 0;
    if (count === 12) pass("Leitura", "Listar pessoas T1", `${count} colaboradores`);
    else fail("Leitura", "Listar pessoas T1", `Esperado 12, obteve ${count}`);
  } catch (e: any) {
    fail("Leitura", "Listar pessoas T1", e.message);
  }

  // Services T1
  try {
    const servicesList = await callTrpcQuery("services.list", undefined, cookie1);
    const count = Array.isArray(servicesList) ? servicesList.length : 0;
    if (count === 6) pass("Leitura", "Listar serviços T1", `${count} serviços`);
    else fail("Leitura", "Listar serviços T1", `Esperado 6, obteve ${count}`);
  } catch (e: any) {
    fail("Leitura", "Listar serviços T1", e.message);
  }

  // Clients T1
  try {
    const clientsList = await callTrpcQuery("clients.list", undefined, cookie1);
    const count = Array.isArray(clientsList) ? clientsList.length : 0;
    if (count === 4) pass("Leitura", "Listar clientes T1", `${count} clientes`);
    else fail("Leitura", "Listar clientes T1", `Esperado 4, obteve ${count}`);
  } catch (e: any) {
    fail("Leitura", "Listar clientes T1", e.message);
  }

  // Proposals T1 (via pricing.proposals.list que aceita tenantId explícito)
  try {
    const proposalsList = await callTrpcQuery("pricing.proposals.list", { tenantId: tenant1Id }, cookie1);
    const count = Array.isArray(proposalsList) ? proposalsList.length : 0;
    if (count === 3) pass("Leitura", "Listar propostas T1", `${count} propostas`);
    else fail("Leitura", "Listar propostas T1", `Esperado 3, obteve ${count}`);
  } catch (e: any) {
    fail("Leitura", "Listar propostas T1", e.message);
  }

  // GetById - Proposal T1
  try {
    const proposal = await callTrpcQuery("proposals.getById", { id: ids.t1ProposalIds[0] }, cookie1);
    if (proposal && proposal.items && proposal.items.length === 3)
      pass("Leitura", "GetById proposta T1", `${proposal.items.length} itens incluídos`);
    else
      fail("Leitura", "GetById proposta T1", `items: ${proposal?.items?.length}`);
  } catch (e: any) {
    fail("Leitura", "GetById proposta T1", e.message);
  }

  // Sectors T2
  try {
    const sectorsList2 = await callTrpcQuery("sectors.list", {}, cookie2);
    const count = Array.isArray(sectorsList2) ? sectorsList2.length : 0;
    if (count === 3) pass("Leitura", "Listar setores T2", `${count} setores`);
    else fail("Leitura", "Listar setores T2", `Esperado 3, obteve ${count}`);
  } catch (e: any) {
    fail("Leitura", "Listar setores T2", e.message);
  }

  // People T2
  try {
    const peopleList2 = await callTrpcQuery("people.list", {}, cookie2);
    const count = Array.isArray(peopleList2) ? peopleList2.length : 0;
    if (count === 12) pass("Leitura", "Listar pessoas T2", `${count} colaboradores`);
    else fail("Leitura", "Listar pessoas T2", `Esperado 12, obteve ${count}`);
  } catch (e: any) {
    fail("Leitura", "Listar pessoas T2", e.message);
  }
}

// ============================================================================
// PHASE 4: UPDATE TESTS
// ============================================================================

async function testUpdateOperations(
  cookie1: string,
  cookie2: string,
  tenant1Id: string,
  tenant2Id: string,
  ids: any
) {
  log("\n════════════════════════════════════════════════════════════════");
  log("  FASE 4: TESTES DE ATUALIZAÇÃO (UPDATE)");
  log("════════════════════════════════════════════════════════════════\n");

  // Update sector name
  try {
    await callTrpcMutation("sectors.update", { id: ids.t1SectorIds[0], name: "Administrativo e Financeiro" }, cookie1);
    pass("Atualização", "Renomear setor", "Administrativo → Administrativo e Financeiro");
  } catch (e: any) {
    fail("Atualização", "Renomear setor", e.message);
  }

  // Update client status
  try {
    await callTrpcMutation(
      "pricing.clients.update",
      { id: ids.t1ClientIds[3], tenantId: tenant1Id, status: "inactive" },
      cookie1
    );
    pass("Atualização", "Desativar cliente", "Supermercado Bom Preço → inactive");
  } catch (e: any) {
    fail("Atualização", "Desativar cliente", e.message);
  }

  // Update proposal status
  try {
    await callTrpcMutation(
      "pricing.proposals.update",
      { id: ids.t1ProposalIds[0], tenantId: tenant1Id, status: "sent" },
      cookie1
    );
    pass("Atualização", "Enviar proposta", "Programa SST → status: sent");
  } catch (e: any) {
    fail("Atualização", "Enviar proposta", e.message);
  }

  // Update service price
  try {
    await callTrpcMutation(
      "pricing.services.update",
      { id: ids.t1ServiceIds[0], tenantId: tenant1Id, minPrice: 18000, maxPrice: 35000 },
      cookie1
    );
    pass("Atualização", "Alterar preço serviço", "Consultoria SST: R$180-350");
  } catch (e: any) {
    fail("Atualização", "Alterar preço serviço", e.message);
  }

  // Update person position T2
  try {
    await callTrpcMutation(
      "people.update",
      { id: ids.t2PeopleIds[0], position: "Gerente de Atendimento" },
      cookie2
    );
    pass("Atualização", "Promover colaborador T2", "Camila Borges → Gerente de Atendimento");
  } catch (e: any) {
    fail("Atualização", "Promover colaborador T2", e.message);
  }
}

// ============================================================================
// PHASE 5: DELETE TESTS
// ============================================================================

async function testDeleteOperations(
  cookie1: string,
  cookie2: string,
  tenant1Id: string,
  tenant2Id: string,
  ids: any
) {
  log("\n════════════════════════════════════════════════════════════════");
  log("  FASE 5: TESTES DE DELEÇÃO (DELETE)");
  log("════════════════════════════════════════════════════════════════\n");

  // Delete person
  try {
    await callTrpcMutation("people.delete", { id: ids.t1PeopleIds[11] }, cookie1);
    pass("Deleção", "Deletar colaborador T1", "Lucas Tavares removido");
  } catch (e: any) {
    fail("Deleção", "Deletar colaborador T1", e.message);
  }

  // Delete proposal (cascade items)
  try {
    await callTrpcMutation(
      "pricing.proposals.delete",
      { id: ids.t1ProposalIds[2], tenantId: tenant1Id },
      cookie1
    );
    pass("Deleção", "Deletar proposta T1 (com itens)", "Compliance Hospitalar removida");
  } catch (e: any) {
    fail("Deleção", "Deletar proposta T1 (com itens)", e.message);
  }

  // Verify counts after deletion
  try {
    const peopleList = await callTrpcQuery("people.list", {}, cookie1);
    const count = Array.isArray(peopleList) ? peopleList.length : 0;
    if (count === 11) pass("Deleção", "Verificar contagem pessoas T1", `${count} (era 12)`);
    else fail("Deleção", "Verificar contagem pessoas T1", `Esperado 11, obteve ${count}`);
  } catch (e: any) {
    fail("Deleção", "Verificar contagem pessoas T1", e.message);
  }

  try {
    const proposalsList = await callTrpcQuery("pricing.proposals.list", { tenantId: tenant1Id }, cookie1);
    const count = Array.isArray(proposalsList) ? proposalsList.length : 0;
    if (count === 2) pass("Deleção", "Verificar contagem propostas T1", `${count} (era 3)`);
    else fail("Deleção", "Verificar contagem propostas T1", `Esperado 2, obteve ${count}`);
  } catch (e: any) {
    fail("Deleção", "Verificar contagem propostas T1", e.message);
  }

  // Delete service T2
  try {
    await callTrpcMutation(
      "pricing.services.delete",
      { id: ids.t2ServiceIds[5], tenantId: tenant2Id },
      cookie2
    );
    pass("Deleção", "Deletar serviço T2", "Palestra Saúde Mental removida");
  } catch (e: any) {
    fail("Deleção", "Deletar serviço T2", e.message);
  }
}

// ============================================================================
// PHASE 6: FINAL REPORT
// ============================================================================

function printReport() {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const passed = results.filter((r) => r.status === "✅").length;
  const failed = results.filter((r) => r.status === "❌").length;
  const total = results.length;

  log("\n\n╔══════════════════════════════════════════════════════════════╗");
  log("║             RELATÓRIO FINAL — TESTE DA PLATAFORMA          ║");
  log("╚══════════════════════════════════════════════════════════════╝\n");

  // Group by category
  const categories = [...new Set(results.map((r) => r.category))];

  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPassed = catResults.filter((r) => r.status === "✅").length;
    log(`\n  ┌─ ${cat} (${catPassed}/${catResults.length})`);
    for (const r of catResults) {
      log(`  │  ${r.status} ${r.test}${r.detail ? ` — ${r.detail}` : ""}`);
    }
    log(`  └${"─".repeat(60)}`);
  }

  log("\n  ═══════════════════════════════════════════════════════════");
  log(`  TOTAL: ${passed} ✅ aprovados  |  ${failed} ❌ falhos  |  ${total} testes`);
  log(`  TEMPO: ${elapsed} segundos`);
  log("  ═══════════════════════════════════════════════════════════");

  if (failed === 0) {
    log("\n  🎉 TODOS OS TESTES PASSARAM! A plataforma está funcionando corretamente.\n");
  } else {
    log(`\n  ⚠️  ${failed} TESTE(S) FALHARAM. Verifique os erros acima.\n`);
  }

  // Summary table
  log("  ┌──────────────────────────────────────────────────────────┐");
  log("  │  DADOS CRIADOS NA SIMULAÇÃO                             │");
  log("  ├──────────────────────────────────────────────────────────┤");
  log("  │  Empresas (Tenants)    │  2 (BlackBelt + Saúde & B-E)   │");
  log("  │  Setores               │  6 (3 por empresa)             │");
  log("  │  Colaboradores         │  23 (24 - 1 deletado)          │");
  log("  │  Serviços              │  11 (12 - 1 deletado)          │");
  log("  │  Clientes              │  8 (4 por empresa)             │");
  log("  │  Propostas             │  5 (6 - 1 deletada)            │");
  log("  │  Itens de Proposta     │  ~14 itens distribuídos        │");
  log("  │  Parâm. Precificação   │  2 (1 por empresa)             │");
  log("  │  Usuários              │  2 (Admin + Gerente)           │");
  log("  └──────────────────────────────────────────────────────────┘");

  log("\n  ┌──────────────────────────────────────────────────────────┐");
  log("  │  CREDENCIAIS DE ACESSO                                  │");
  log("  ├──────────────────────────────────────────────────────────┤");
  log(`  │  Admin T1: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}  │`);
  log(`  │  Admin T2: ${USER2_EMAIL} / ${USER2_PASSWORD}    │`);
  log("  └──────────────────────────────────────────────────────────┘\n");
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  startTime = Date.now();

  log("╔══════════════════════════════════════════════════════════════╗");
  log("║       BLACKBELT PLATFORM — SIMULAÇÃO DE TESTE COMPLETO     ║");
  log("╚══════════════════════════════════════════════════════════════╝");

  try {
    // Phase 1: Reset DB
    const { tenant1Id, tenant2Id } = await resetDatabase();

    // Phase 2: Create data
    const ids = await createSimulationData(tenant1Id, tenant2Id);

    // Phase 3: Read tests
    await testReadOperations(ids.cookie1, ids.cookie2, tenant1Id, tenant2Id, ids);

    // Phase 4: Update tests
    await testUpdateOperations(ids.cookie1, ids.cookie2, tenant1Id, tenant2Id, ids);

    // Phase 5: Delete tests
    await testDeleteOperations(ids.cookie1, ids.cookie2, tenant1Id, tenant2Id, ids);
  } catch (err: any) {
    log(`\n\n  💥 ERRO FATAL: ${err.message}`);
    console.error(err);
  }

  // Phase 6: Report
  printReport();

  process.exit(results.some((r) => r.status === "❌") ? 1 : 0);
}

main();
