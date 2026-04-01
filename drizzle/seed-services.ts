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
  // ── SERVIÇOS ORIGINAIS (NR-01 Core) ─────────────────────────────────
  { category: "copsoq",         name: "Avaliação COPSOQ-II (por colaborador)",    description: "Diagnóstico psicossocial completo com 76 questões, 12 dimensões. Inclui convite por email, acompanhamento de respostas e relatório individual/coletivo.",      unit: "person",  minPrice: 30000,  maxPrice: 50000  },
  { category: "inventario",     name: "Inventário de Riscos Psicossociais",        description: "Mapeamento e classificação de riscos conforme Guia MTE 2024. Matriz severidade x probabilidade, identificação de fatores críticos e priorização.",          unit: "project", minPrice: 200000,  maxPrice: 500000 },
  { category: "plano_acao",     name: "Plano de Ação (por ação)",                 description: "Elaboração de medida preventiva ou corretiva por fator de risco. Inclui responsável, prazo, indicador de eficácia e verificação.",         unit: "item",    minPrice: 25000,  maxPrice: 45000  },
  { category: "treinamento",    name: "Treinamento NR-01 (por colaborador, 8h)",  description: "Programa de capacitação em riscos psicossociais: identificação, prevenção, canal de denúncia e liderança saudável. Presencial ou EAD com certificado.",              unit: "person",  minPrice: 15000,  maxPrice: 30000  },
  { category: "pgr_pcmso",      name: "Integração PGR/PCMSO",                     description: "Elaboração do PGR psicossocial integrado ao PCMSO (NR-07). Inclui recomendações de exames, frequência e população-alvo baseados nos riscos identificados.",         unit: "project", minPrice: 300000, maxPrice: 800000 },
  { category: "acompanhamento", name: "Acompanhamento Trimestral",                description: "Monitoramento contínuo dos indicadores psicossociais: absenteísmo, turnover, afastamentos, respostas COPSOQ. Relatório comparativo com período anterior.",                 unit: "project", minPrice: 150000, maxPrice: 250000 },
  { category: "lideranca",      name: "Treinamento de Lideranças",                description: "Workshop exclusivo para gestores: papel da liderança na saúde mental, gestão de conflitos, comunicação não-violenta e prevenção de assédio.",         unit: "project", minPrice: 280000, maxPrice: 420000 },
  { category: "certificacao",   name: "Certificação de Conformidade NR-01",       description: "Emissão do certificado de conformidade com QR code verificável. Válido por 12 meses. Requer score mínimo de 80% no checklist NR-01.",           unit: "project", minPrice: 80000,  maxPrice: 160000 },

  // ── NOVOS SERVIÇOS (Diagnóstico e Avaliação) ───────────────────────
  { category: "diagnostico_org",   name: "Diagnóstico Organizacional Completo",    description: "Avaliação 360° do clima, cultura e riscos organizacionais. Inclui entrevistas com gestores, grupos focais, análise documental e relatório executivo com recomendações priorizadas.",   unit: "project", minPrice: 300000,  maxPrice: 800000  },
  { category: "avaliacao_nr17",    name: "Avaliação Ergonômica (NR-17)",           description: "Análise Ergonômica do Trabalho (AET) conforme NR-17. Avaliação de postos de trabalho, organização do trabalho, fatores psicossociais ergonômicos e recomendações de adequação.",    unit: "project", minPrice: 200000,  maxPrice: 500000  },
  { category: "laudo_tecnico",     name: "Laudo Técnico Psicossocial",             description: "Documento técnico com análise detalhada dos riscos psicossociais, metodologia aplicada, resultados quantitativos e qualitativos. Assinado por profissional habilitado (CRP/CREA).",  unit: "project", minPrice: 150000,  maxPrice: 400000  },
  { category: "clima_org",         name: "Pesquisa de Clima Organizacional",       description: "Questionário customizável de clima e engajamento. Análise por setor, cargo e tempo de empresa. Benchmark com dados nacionais e setoriais. Dashboard interativo.",       unit: "project", minPrice: 150000,  maxPrice: 350000  },

  // ── NOVOS SERVIÇOS (Saúde Mental e Bem-Estar) ──────────────────────
  { category: "eap",               name: "Programa de Apoio ao Empregado (EAP)",   description: "Canal de acolhimento psicológico 24/7 para colaboradores. Atendimento por psicólogos via chat, telefone ou vídeo. Relatórios mensais de utilização (sem identificação individual).",  unit: "month",   minPrice: 300000,  maxPrice: 800000  },
  { category: "retorno_trabalho",  name: "Programa de Retorno ao Trabalho",        description: "Protocolo de readaptação para colaboradores afastados por transtornos mentais. Avaliação, plano de retorno gradual, acompanhamento psicológico e orientação ao gestor.",     unit: "person",  minPrice: 50000,   maxPrice: 120000  },
  { category: "qvt",               name: "Programa de Qualidade de Vida (QVT)",    description: "Programa anual de bem-estar corporativo: ginástica laboral, mindfulness, grupos de apoio, campanhas de saúde mental (Janeiro Branco, Setembro Amarelo). Reduz absenteísmo em até 20%.", unit: "project", minPrice: 500000,  maxPrice: 1500000 },
  { category: "estresse",          name: "Workshop Gestão de Estresse",            description: "Oficina prática de 4h para equipes: técnicas de respiração, mindfulness, gestão do tempo e resiliência. Inclui material didático e avaliação pré/pós.",     unit: "event",   minPrice: 120000,  maxPrice: 300000  },

  // ── NOVOS SERVIÇOS (Compliance e Prevenção) ────────────────────────
  { category: "assedio",           name: "Consultoria em Assédio Moral e Sexual",  description: "Prevenção, investigação e tratamento de denúncias de assédio. Inclui política interna, treinamento obrigatório (Lei 14.457/2022), canal de denúncia e comitê de apuração.",  unit: "project", minPrice: 250000,  maxPrice: 600000  },
  { category: "auditoria",        name: "Auditoria de Conformidade NR-01",        description: "Verificação independente do GRO/PGR. Checklist de 25+ itens conforme Portaria MTE 1.419/2024. Relatório de gaps com plano de remediação e prazo. Preparação para fiscalização.",     unit: "project", minPrice: 300000,  maxPrice: 700000  },
  { category: "esocial",          name: "Gestão de Eventos eSocial (SST)",        description: "Geração, validação e acompanhamento dos eventos S-2220 (Monitoramento de Saúde) e S-2240 (Condições Ambientais) para envio ao eSocial. Inclui auditoria de dados.",      unit: "project", minPrice: 80000,   maxPrice: 200000  },
  { category: "lgpd_sst",         name: "Adequação LGPD para Dados de SST",       description: "Consultoria para tratamento de dados sensíveis de saúde conforme LGPD. Mapeamento de fluxos, consentimento, anonimização de pesquisas COPSOQ e política de privacidade para SST.",  unit: "project", minPrice: 200000,  maxPrice: 500000  },

  // ── NOVOS SERVIÇOS (Mediação e Cultura) ────────────────────────────
  { category: "mediacao",          name: "Mediação de Conflitos Organizacionais",  description: "Sessões de mediação profissional para resolução de conflitos interpessoais e intergrupais. Conduzida por mediador certificado (CNJ). Previne litígios trabalhistas.",   unit: "hour",    minPrice: 30000,   maxPrice: 60000   },
  { category: "palestra",         name: "Palestra de Sensibilização",             description: "Palestra de 1-2h sobre saúde mental no trabalho, riscos psicossociais e a NR-01. Para todos os níveis hierárquicos. Inclui material digital e certificado de participação.",   unit: "event",   minPrice: 80000,   maxPrice: 250000  },
  { category: "absenteismo",      name: "Análise de Absenteísmo e Turnover",      description: "Diagnóstico quantitativo: taxa de absenteísmo, turnover, afastamentos INSS, sinistralidade do plano de saúde. Correlação com fatores psicossociais e cálculo de impacto financeiro (R$/ano).",   unit: "project", minPrice: 150000,  maxPrice: 350000  },
];

async function seedServices() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1); }

  const pool = mysql.createPool({ uri: dbUrl, connectionLimit: 3 });
  const db = drizzle(pool);

  // Find admin tenant by tenantType (more robust than CNPJ)
  const [adminTenant] = await db.select({ id: tenants.id, name: tenants.name })
    .from(tenants)
    .where(eq((tenants as any).tenantType, "admin"))
    .limit(1);

  if (!adminTenant) {
    console.error("Admin tenant not found (tenantType='admin'). Check DB or run seed.ts first.");
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
