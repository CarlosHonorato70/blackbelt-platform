/**
 * Seed Admin Services — popula os serviços padrão do admin master
 * para que consultorias recebam cópia automática ao entrar na plataforma.
 *
 * Run: pnpm tsx drizzle/seed-services.ts
 */

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { tenants, services, pricingParameters } from "./schema";
import "dotenv/config";

const ADMIN_SERVICES = [
  { category: "copsoq",         name: "Avaliação COPSOQ-II (por colaborador)",    description: "Diagnóstico psicossocial completo por colaborador",      unit: "person",  minPrice: 30000,  maxPrice: 50000  },
  { category: "inventario",     name: "Inventário de Riscos Psicossociais",        description: "Mapeamento e classificação de riscos (projeto)",          unit: "project", minPrice: 80000,  maxPrice: 150000 },
  { category: "plano_acao",     name: "Plano de Ação (por ação)",                 description: "Elaboração de plano de ação por fator de risco",         unit: "item",    minPrice: 25000,  maxPrice: 45000  },
  { category: "treinamento",    name: "Treinamento NR-01 (por colaborador, 8h)",  description: "Programa de treinamento presencial ou EAD",              unit: "person",  minPrice: 10000,  maxPrice: 15000  },
  { category: "pgr_pcmso",      name: "Integração PGR/PCMSO",                     description: "Integração do PPRA psicossocial ao PGR e PCMSO",         unit: "project", minPrice: 200000, maxPrice: 350000 },
  { category: "acompanhamento", name: "Acompanhamento Trimestral",                description: "Monitoramento contínuo (por trimestre)",                 unit: "project", minPrice: 150000, maxPrice: 250000 },
  { category: "lideranca",      name: "Treinamento de Lideranças",                description: "Workshop de gestão e saúde mental para líderes",         unit: "project", minPrice: 280000, maxPrice: 420000 },
  { category: "certificacao",   name: "Certificação de Conformidade NR-01",       description: "Emissão do certificado de conformidade NR-01",           unit: "project", minPrice: 80000,  maxPrice: 160000 },
];

async function seedServices() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1); }

  const pool = mysql.createPool({ uri: dbUrl, connectionLimit: 3 });
  const db = drizzle(pool);

  // Find admin tenant
  const [adminTenant] = await db.select({ id: tenants.id, name: tenants.name, tenantType: (tenants as any).tenantType })
    .from(tenants)
    .where(eq(tenants.cnpj, "00.000.000/0001-00"))
    .limit(1);

  if (!adminTenant) {
    console.error("Admin tenant not found. Run seed.ts first.");
    process.exit(1);
  }

  console.log(`Admin tenant: ${adminTenant.name} (${adminTenant.id})`);

  // Ensure tenantType = "admin"
  await db.update(tenants).set({ tenantType: "admin" } as any).where(eq(tenants.id, adminTenant.id));
  console.log("  ✓ tenantType set to 'admin'");

  // Seed services
  let added = 0, skipped = 0;
  for (const svc of ADMIN_SERVICES) {
    const [existing] = await db.select({ id: services.id })
      .from(services)
      .where(eq(services.tenantId, adminTenant.id))
      .limit(1);

    // Check by category
    const [existingByCategory] = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.tenantId, adminTenant.id))
      .limit(1);

    // Use category-based check
    const allSvcs = await db.select({ id: services.id, category: services.category })
      .from(services)
      .where(eq(services.tenantId, adminTenant.id));
    const exists = allSvcs.some((s: any) => s.category === svc.category);

    if (!exists) {
      await db.insert(services).values({
        id: nanoid(),
        tenantId: adminTenant.id,
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
      console.log(`  + ${svc.category}: ${svc.name} (R$${svc.minPrice/100}–R$${svc.maxPrice/100})`);
      added++;
    } else {
      console.log(`  = already exists: ${svc.category}`);
      skipped++;
    }
  }

  // Seed pricing parameters if not exists
  const [existingParams] = await db.select({ id: pricingParameters.id })
    .from(pricingParameters)
    .where(eq(pricingParameters.tenantId, adminTenant.id))
    .limit(1);

  if (!existingParams) {
    await db.insert(pricingParameters).values({
      id: nanoid(),
      tenantId: adminTenant.id,
      monthlyFixedCost: 500000,
      laborCost: 1200000,
      productiveHoursPerMonth: 160,
      defaultTaxRegime: "SN",
      riskAdjustment: 100,
      seniorityAdjustment: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("  + Pricing parameters seeded");
  } else {
    console.log("  = Pricing parameters already exist");
  }

  console.log(`\nDone: ${added} added, ${skipped} skipped`);
  await pool.end();
}

seedServices().catch((e) => { console.error(e); process.exit(1); });
