/**
 * Teste E2E Completo — BlackBelt Platform
 * Fluxo: Login → Consultores → Empresas → Setores → Colaboradores
 *        → Serviços → Clientes → Propostas → Emails → NR-01 → PDFs
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:5000/api/trpc";
let COOKIE = "";

// Contadores
const stats = {
  tenants: 0, companies: 0, sectors: 0, people: 0,
  services: 0, clients: 0, proposals: 0, emails: 0,
  assessments: 0, pdfs: 0, errors: 0,
};

// ── HTTP helpers ──────────────────────────────────────────────────────

function trpcMutate(procedure, body, impersonateTenantId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(`${BASE}/${procedure}`);
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
      ...(COOKIE ? { Cookie: COOKIE } : {}),
    };
    if (impersonateTenantId) headers["x-impersonate-tenant"] = impersonateTenantId;
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname,
      method: "POST", headers,
    };
    const req = http.request(opts, (res) => {
      let body = "";
      if (res.headers["set-cookie"]) {
        for (const c of res.headers["set-cookie"]) {
          if (c.includes("app_session_id=")) COOKIE = c.split(";")[0];
        }
      }
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (json.error) reject(new Error(`${procedure}: ${JSON.stringify(json.error).substring(0, 300)}`));
          else resolve(json.result?.data || json.result || json);
        } catch (e) {
          reject(new Error(`${procedure}: parse error - ${body.substring(0, 300)}`));
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function trpcQuery(procedure, input, impersonateTenantId) {
  return new Promise((resolve, reject) => {
    const inputStr = input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : "";
    const url = new URL(`${BASE}/${procedure}${inputStr}`);
    const headers = { ...(COOKIE ? { Cookie: COOKIE } : {}) };
    if (impersonateTenantId) headers["x-impersonate-tenant"] = impersonateTenantId;
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method: "GET", headers,
    };
    const req = http.request(opts, (res) => {
      let body = "";
      if (res.headers["set-cookie"]) {
        for (const c of res.headers["set-cookie"]) {
          if (c.includes("app_session_id=")) COOKIE = c.split(";")[0];
        }
      }
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(body);
          if (json.error) reject(new Error(`${procedure}: ${JSON.stringify(json.error).substring(0, 300)}`));
          else resolve(json.result?.data || json.result || json);
        } catch (e) {
          reject(new Error(`${procedure}: parse error - ${body.substring(0, 300)}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function safeMutate(proc, body, tid) {
  try { return await trpcMutate(proc, body, tid); }
  catch (e) { console.error(`  ✗ ${proc}: ${e.message.substring(0, 150)}`); stats.errors++; return null; }
}
async function safeQuery(proc, input, tid) {
  try { return await trpcQuery(proc, input, tid); }
  catch (e) { console.error(`  ✗ ${proc}: ${e.message.substring(0, 150)}`); stats.errors++; return null; }
}

function savePdf(folder, filename, base64Data) {
  const dir = path.join(__dirname, "test-pdfs", folder);
  fs.mkdirSync(dir, { recursive: true });
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, Buffer.from(base64Data, "base64"));
  stats.pdfs++;
  return filepath;
}

// ── DATA ─────────────────────────────────────────────────────────────

const CONSULTANTS = [
  {
    name: "Consultoria SST Prime Ltda",
    cnpj: "11222333000181",
    city: "Sao Paulo", state: "SP",
    contactName: "Dr. Carlos Mendes",
    contactEmail: "carlos@sstprime.com.br",
    contactPhone: "(11) 98765-4321",
    companies: [
      {
        name: "Metalurgica Horizonte SA",
        cnpj: "61198164000160",
        city: "Guarulhos", state: "SP",
        contactName: "Joao Ferreira",
        contactEmail: "joao@horizonte.com.br",
      },
      {
        name: "TechNova Solutions Ltda",
        cnpj: "33000167000101",
        city: "Campinas", state: "SP",
        contactName: "Maria Oliveira",
        contactEmail: "maria@technova.com.br",
      },
    ],
  },
  {
    name: "Ergon Consultoria em Saude Ltda",
    cnpj: "04252011000110",
    city: "Rio de Janeiro", state: "RJ",
    contactName: "Dra. Ana Ribeiro",
    contactEmail: "ana@ergonconsultoria.com.br",
    contactPhone: "(21) 99876-5432",
    companies: [
      {
        name: "Construtora Alvorada Ltda",
        cnpj: "45543915000181",
        city: "Niteroi", state: "RJ",
        contactName: "Pedro Santos",
        contactEmail: "pedro@alvorada.com.br",
      },
      {
        name: "Logistica Express SA",
        cnpj: "53113791000122",
        city: "Duque de Caxias", state: "RJ",
        contactName: "Lucas Costa",
        contactEmail: "lucas@logexpress.com.br",
      },
    ],
  },
];

const SECTORS = [
  { name: "Producao", description: "Area de producao e operacoes" },
  { name: "Administrativo", description: "Equipe administrativa e RH" },
];

const PEOPLE_TEMPLATES = [
  { name: "Ana Silva", position: "Operadora de Producao", employmentType: "own" },
  { name: "Bruno Costa", position: "Tecnico de Seguranca", employmentType: "own" },
  { name: "Carla Mendes", position: "Coordenadora RH", employmentType: "own" },
];

const SERVICES_TEMPLATES = [
  { name: "Diagnostico Psicossocial COPSOQ-II", category: "diagnostico", unit: "project", minPrice: 500000, maxPrice: 1500000 },
  { name: "Treinamento NR-01 Riscos Psicossociais", category: "treinamento", unit: "day", minPrice: 200000, maxPrice: 500000 },
  { name: "Consultoria Continua SST", category: "consultoria", unit: "month", minPrice: 300000, maxPrice: 800000 },
];

const PDF_EXPORTS = [
  { proc: "nr01Pdf.exportRiskMatrix", file: "01-Matriz-de-Risco.pdf" },
  { proc: "nr01Pdf.exportPcmsoIntegration", file: "02-Integracao-PGR-PCMSO.pdf" },
  { proc: "nr01Pdf.exportPsychosocialDashboard", file: "03-Dashboard-Psicossocial.pdf" },
  { proc: "nr01Pdf.exportAssessmentTrends", file: "04-Tendencias-Avaliacao.pdf" },
  { proc: "nr01Pdf.exportFinancialCalculator", file: "05-Calculadora-Financeira.pdf" },
  { proc: "nr01Pdf.exportComplianceTimeline", file: "06-Cronograma-NR01.pdf" },
  { proc: "nr01Pdf.exportComplianceChecklist", file: "07-Checklist-Conformidade.pdf" },
  { proc: "nr01Pdf.exportComplianceCertificate", file: "08-Certificado-Conformidade.pdf" },
  { proc: "nr01Pdf.exportLaudoTecnico", file: "09-Laudo-Tecnico.pdf" },
  { proc: "nr01Pdf.exportBenchmark", file: "10-Benchmark-COPSOQ.pdf" },
  { proc: "nr01Pdf.exportTrainingReport", file: "11-Relatorio-Treinamento.pdf" },
  { proc: "nr01Pdf.exportAnonymousReports", file: "12-Relatorio-Denuncias.pdf" },
  { proc: "nr01Pdf.exportDeadlineAlerts", file: "13-Alertas-Prazos.pdf" },
  { proc: "nr01Pdf.exportEsocialReport", file: "14-Relatorio-eSocial.pdf" },
  { proc: "nr01Pdf.exportExecutiveReport", file: "15-Relatorio-Executivo.pdf" },
];

// ── MAIN ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(70));
  console.log("  TESTE E2E COMPLETO — BlackBelt Platform");
  console.log("  Fluxo: Consultores → Empresas → Colaboradores → NR-01 → PDFs");
  console.log("=".repeat(70));

  // ── 1. LOGIN ─────────────────────────────────────────────────────
  console.log("\n[1/12] Login como Admin Master...");
  const loginResult = await trpcMutate("auth.login", {
    email: "ricardo@consultoriasst.com.br",
    password: "Senha@123",
  });
  if (!COOKIE) {
    console.error("FALHA: Cookie nao capturado. Login failed.");
    process.exit(1);
  }
  console.log(`  ✓ Login OK (cookie capturado)`);

  // ── 2. OBTER PLANO PARA ATIVACAO ─────────────────────────────────
  console.log("\n[2/12] Buscando planos disponiveis...");
  let planId = null;
  const tenantsResult = await safeQuery("tenants.list", {});
  if (tenantsResult) {
    const anyTenant = (tenantsResult.tenants || tenantsResult)?.[0];
    if (anyTenant) {
      const subInfo = await safeQuery("adminSubscriptions.adminGetSubscriptionDetails", { tenantId: anyTenant.id });
      if (subInfo?.availablePlans) {
        planId = subInfo.availablePlans[0]?.id;
        console.log(`  ✓ Plano encontrado: ${subInfo.availablePlans[0]?.displayName || planId}`);
      }
    }
  }
  if (!planId) {
    // Fallback: query plans directly
    const plans = await safeQuery("subscriptions.getPlans", {});
    if (plans?.length > 0) {
      planId = plans[0].id;
      console.log(`  ✓ Plano (fallback): ${plans[0].displayName || planId}`);
    } else {
      console.log("  ⚠ Nenhum plano encontrado, continuando sem ativar assinatura");
    }
  }

  // ── 3. CRIAR CONSULTORES ──────────────────────────────────────────
  console.log("\n[3/12] Criando consultores...");
  const consultantIds = [];

  for (const c of CONSULTANTS) {
    let tenant = await safeMutate("tenants.create", {
      name: c.name, cnpj: c.cnpj, city: c.city, state: c.state,
      contactName: c.contactName, contactEmail: c.contactEmail,
      contactPhone: c.contactPhone,
    });

    if (!tenant?.id) {
      // Fallback: buscar existente
      const list = await safeQuery("tenants.list", { search: c.name.substring(0, 10) });
      const existing = (list?.tenants || list || []).find(t => t.name.includes(c.name.substring(0, 10)));
      if (existing) {
        tenant = existing;
        console.log(`  = Consultor ja existe: ${existing.name}`);
        // Garantir assinatura ativa
        if (planId) {
          await safeMutate("adminSubscriptions.adminActivatePlan", {
            tenantId: existing.id, planId, billingCycle: "monthly",
            reason: "Re-ativacao E2E test",
          });
        }
      } else {
        console.log(`  ✗ Falha ao criar consultor: ${c.name}`);
        continue;
      }
    } else {
      console.log(`  ✓ Consultor criado: ${c.name}`);
      stats.tenants++;
    }
    consultantIds.push({ ...tenant, companies: c.companies });

    // Ativar assinatura
    if (planId) {
      await safeMutate("adminSubscriptions.adminActivatePlan", {
        tenantId: tenant.id, planId, billingCycle: "monthly",
        reason: "Ativacao E2E test",
      });
      console.log(`  ✓ Assinatura ativada para ${c.name}`);
    }
  }

  // ── 4. CRIAR EMPRESAS POR CONSULTOR ──────────────────────────────
  console.log("\n[4/12] Criando empresas (clientes dos consultores)...");
  const allCompanies = []; // { companyTenant, consultantId, companyName }

  for (const consultant of consultantIds) {
    for (const comp of consultant.companies) {
      let company = await safeMutate("companies.create", {
        name: comp.name, cnpj: comp.cnpj, city: comp.city, state: comp.state,
        contactName: comp.contactName, contactEmail: comp.contactEmail,
      }, consultant.id);

      if (company?.id) {
        console.log(`  ✓ Empresa criada: ${comp.name} (consultor: ${consultant.name})`);
        stats.companies++;
        allCompanies.push({ id: company.id, name: comp.name, consultantId: consultant.id, contactEmail: comp.contactEmail });
        // Ativar assinatura para a empresa (necessário para subscribedProcedure)
        if (planId) {
          await safeMutate("adminSubscriptions.adminActivatePlan", {
            tenantId: company.id, planId, billingCycle: "monthly",
            reason: "Ativacao empresa E2E",
          });
          console.log(`  ✓ Assinatura ativada: ${comp.name}`);
        }
      } else {
        // Fallback: listar empresas existentes
        const list = await safeQuery("companies.list", {}, consultant.id);
        const existing = (list?.companies || []).find(t => t.name.includes(comp.name.substring(0, 10)));
        if (existing) {
          console.log(`  = Empresa ja existe: ${existing.name}`);
          allCompanies.push({ id: existing.id, name: existing.name, consultantId: consultant.id, contactEmail: comp.contactEmail });
          // Garantir assinatura ativa
          if (planId) {
            await safeMutate("adminSubscriptions.adminActivatePlan", {
              tenantId: existing.id, planId, billingCycle: "monthly",
              reason: "Re-ativacao empresa E2E",
            });
          }
        } else {
          console.log(`  ✗ Falha ao criar empresa: ${comp.name}`);
        }
      }
    }
  }

  // ── 5. CRIAR SETORES ──────────────────────────────────────────────
  console.log("\n[5/12] Criando setores...");
  const companySectors = {}; // companyId -> [sectorId]

  for (const comp of allCompanies) {
    companySectors[comp.id] = [];
    for (const s of SECTORS) {
      const sector = await safeMutate("sectors.create", {
        name: s.name, description: s.description,
      }, comp.id);
      if (sector?.id) {
        companySectors[comp.id].push(sector.id);
        stats.sectors++;
        console.log(`  ✓ Setor: ${s.name} → ${comp.name}`);
      }
    }
  }

  // ── 6. CRIAR COLABORADORES ────────────────────────────────────────
  console.log("\n[6/12] Criando colaboradores...");
  const companyPeople = {}; // companyId -> [{id, name, email}]

  for (const comp of allCompanies) {
    companyPeople[comp.id] = [];
    const sectors = companySectors[comp.id] || [];
    for (let i = 0; i < PEOPLE_TEMPLATES.length; i++) {
      const p = PEOPLE_TEMPLATES[i];
      const emailPrefix = p.name.toLowerCase().replace(/\s/g, ".").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const email = `${emailPrefix}@${comp.name.toLowerCase().replace(/\s/g, "").substring(0, 10)}.test`;
      const person = await safeMutate("people.create", {
        name: p.name, position: p.position, email,
        employmentType: p.employmentType,
        sectorId: sectors[i % sectors.length] || undefined,
      }, comp.id);
      if (person?.id) {
        companyPeople[comp.id].push({ id: person.id, name: p.name, email });
        stats.people++;
        console.log(`  ✓ Colaborador: ${p.name} → ${comp.name}`);
      }
    }
  }

  // ── 7. CRIAR SERVIÇOS ─────────────────────────────────────────────
  console.log("\n[7/12] Criando catalogo de servicos...");
  const consultantServices = {}; // consultantId -> [serviceId]

  for (const consultant of consultantIds) {
    consultantServices[consultant.id] = [];
    for (const s of SERVICES_TEMPLATES) {
      const service = await safeMutate("services.create", {
        name: s.name, description: `Servico de ${s.category}`,
        category: s.category, unit: s.unit,
        minPrice: s.minPrice, maxPrice: s.maxPrice,
      }, consultant.id);
      if (service?.id) {
        consultantServices[consultant.id].push({ id: service.id, name: s.name, price: s.minPrice });
        stats.services++;
        console.log(`  ✓ Servico: ${s.name}`);
      }
    }
  }

  // ── 8. CRIAR CLIENTES E PROPOSTAS ─────────────────────────────────
  console.log("\n[8/12] Criando clientes e propostas...");

  for (const consultant of consultantIds) {
    // Criar um cliente para cada empresa
    for (const comp of allCompanies.filter(c => c.consultantId === consultant.id)) {
      const client = await safeMutate("clients.create", {
        tenantId: consultant.id,
        name: comp.name,
        industry: "Industria",
        companySize: "medium",
        contactName: comp.contactEmail?.split("@")[0] || "Contato",
        contactEmail: comp.contactEmail,
        city: "Sao Paulo", state: "SP",
      }, consultant.id);

      if (client?.id) {
        stats.clients++;
        console.log(`  ✓ Cliente: ${comp.name}`);

        // Criar proposta
        const services = consultantServices[consultant.id] || [];
        const totalValue = services.reduce((sum, s) => sum + s.price, 0);
        const proposal = await safeMutate("proposals.create", {
          clientId: client.id,
          title: `Proposta NR-01 - ${comp.name}`,
          description: "Proposta completa de gestao de riscos psicossociais",
          subtotal: totalValue, discount: 0, discountPercent: 0,
          taxes: Math.round(totalValue * 0.06),
          totalValue: totalValue + Math.round(totalValue * 0.06),
          taxRegime: "SN",
        }, consultant.id);

        const proposalId = typeof proposal === "string" ? proposal : proposal?.id;
        if (proposalId) {
          stats.proposals++;
          console.log(`  ✓ Proposta: ${comp.name} (R$ ${(totalValue / 100).toFixed(2)})`);

          // Adicionar itens
          for (const svc of services) {
            await safeMutate("proposals.addItem", {
              proposalId: proposalId,
              serviceId: svc.id,
              serviceName: svc.name,
              quantity: 1,
              unitPrice: svc.price,
              subtotal: svc.price,
            }, consultant.id);
          }
        }
      }
    }
  }

  // ── 9. ENVIAR EMAILS (COPSOQ + Clima) ─────────────────────────────
  console.log("\n[9/12] Enviando convites e emails...");

  for (const comp of allCompanies) {
    const people = companyPeople[comp.id] || [];
    if (people.length === 0) continue;

    // COPSOQ invites
    const invitees = people.map(p => ({
      email: p.email, name: p.name,
      position: "Colaborador", sector: "Geral",
    }));
    const copsoqResult = await safeMutate("assessments.sendInvites", {
      assessmentTitle: `COPSOQ-II ${comp.name} 2026`,
      invitees, expiresIn: 7,
    }, comp.id);
    if (copsoqResult) {
      stats.emails += invitees.length;
      console.log(`  ✓ COPSOQ convites enviados: ${comp.name} (${invitees.length} emails)`);
    }

    // Climate survey
    const survey = await safeMutate("climateSurveys.create", {
      tenantId: comp.id,
      title: `Pesquisa de Clima ${comp.name}`,
      description: "Pesquisa de clima organizacional",
      surveyType: "climate",
      questions: [
        { text: "Como voce avalia o ambiente de trabalho?", type: "rating" },
        { text: "Voce se sente valorizado?", type: "rating" },
      ],
    }, comp.id);
    if (survey?.id) {
      console.log(`  ✓ Pesquisa de clima criada: ${comp.name}`);
      // Send climate survey invites
      const climateInvites = await safeMutate("climateSurveys.sendInvites", {
        surveyId: survey.id,
        tenantId: comp.id,
        invites: people.map(p => ({ email: p.email, name: p.name })),
      }, comp.id);
      if (climateInvites) {
        stats.emails += people.length;
        console.log(`  ✓ Convites pesquisa clima: ${comp.name} (${people.length} emails)`);
      }
    }
  }

  // ── 10. FLUXO NR-01 COMPLETO ──────────────────────────────────────
  console.log("\n[10/12] Criando dados NR-01 (avaliacoes, planos, treinamentos)...");

  for (const comp of allCompanies) {
    const sectors = companySectors[comp.id] || [];

    // Risk assessment
    const assessment = await safeMutate("riskAssessments.create", {
      tenantId: comp.id,
      title: `Avaliacao de Riscos ${comp.name}`,
      description: "Avaliacao completa de riscos psicossociais",
      assessmentDate: new Date().toISOString(),
      assessor: "Dr. Especialista",
      methodology: "COPSOQ-II + Observacao",
      sectorId: sectors[0],
    }, comp.id);
    if (assessment?.id) {
      stats.assessments++;
      console.log(`  ✓ Avaliacao de risco: ${comp.name}`);

      // Add risk items
      const riskItems = [
        { riskFactorId: "rf-workload-" + comp.id.substring(0,5), severity: "high", probability: "likely" },
        { riskFactorId: "rf-relationships-" + comp.id.substring(0,5), severity: "medium", probability: "possible" },
        { riskFactorId: "rf-autonomy-" + comp.id.substring(0,5), severity: "low", probability: "likely" },
      ];
      for (const item of riskItems) {
        await safeMutate("riskAssessments.addItem", {
          assessmentId: assessment.id, ...item,
        }, comp.id);
      }
    }

    // Training program
    await safeMutate("training.createProgram", {
      tenantId: comp.id,
      title: `Treinamento NR-01 ${comp.name}`,
      description: "Capacitacao em gestao de riscos psicossociais",
      programType: "training",
      targetAudience: "Todos os colaboradores",
      duration: 8,
      facilitator: "Dr. Especialista SST",
    }, comp.id);
    console.log(`  ✓ Treinamento: ${comp.name}`);

    // Anonymous reports
    const categories = ["harassment", "workload", "discrimination"];
    for (const cat of categories) {
      await safeMutate("anonymousReports.submit", {
        tenantId: comp.id,
        category: cat,
        description: `Relato de ${cat} para fins de teste E2E`,
        severity: cat === "harassment" ? "critical" : "medium",
      }, comp.id);
    }
    console.log(`  ✓ Denuncias anonimas: ${comp.name} (${categories.length})`);

    // Ergonomic assessment
    await safeMutate("ergonomicAssessments.create", {
      tenantId: comp.id,
      title: `Avaliacao Ergonomica ${comp.name}`,
      sectorId: sectors[0],
      assessor: "Ergonomista",
      assessmentDate: new Date().toISOString(),
    }, comp.id);
    console.log(`  ✓ Avaliacao ergonomica: ${comp.name}`);

    // Compliance certificate
    await safeMutate("complianceCertificate.issue", {
      tenantId: comp.id,
      issuedBy: "Dr. Especialista SST",
    }, comp.id);
    console.log(`  ✓ Certificado conformidade: ${comp.name}`);
  }

  // ── 11. GERAR PDFs ────────────────────────────────────────────────
  console.log("\n[11/12] Gerando PDFs para todas as empresas...");

  for (const comp of allCompanies) {
    const folderName = comp.name.replace(/[^a-zA-Z0-9]/g, "-").substring(0, 30);
    console.log(`  Gerando PDFs: ${comp.name}...`);

    for (const pdf of PDF_EXPORTS) {
      const result = await safeMutate(pdf.proc, { tenantId: comp.id }, comp.id);
      const base64 = typeof result === "object" && result !== null ? result.data : null;
      if (base64) {
        const filepath = savePdf(folderName, pdf.file, base64);
        const size = fs.statSync(filepath).size;
        console.log(`    ✓ ${pdf.file} (${(size / 1024).toFixed(1)} KB)`);
      } else if (result === null) {
        console.log(`    ✗ ${pdf.file} - erro (ver acima)`);
      } else {
        console.log(`    ✗ ${pdf.file} - sem dados (tipo: ${typeof result}, keys: ${result && typeof result === 'object' ? Object.keys(result).join(',') : 'N/A'})`);
      }
    }
  }

  // ── 12. RELATORIO FINAL ───────────────────────────────────────────
  console.log("\n" + "=".repeat(70));
  console.log("  RELATORIO FINAL");
  console.log("=".repeat(70));
  console.log(`  Consultores criados:    ${stats.tenants}`);
  console.log(`  Empresas criadas:       ${stats.companies}`);
  console.log(`  Setores criados:        ${stats.sectors}`);
  console.log(`  Colaboradores criados:  ${stats.people}`);
  console.log(`  Servicos criados:       ${stats.services}`);
  console.log(`  Clientes criados:       ${stats.clients}`);
  console.log(`  Propostas criadas:      ${stats.proposals}`);
  console.log(`  Emails enviados:        ${stats.emails}`);
  console.log(`  Avaliacoes criadas:     ${stats.assessments}`);
  console.log(`  PDFs gerados:           ${stats.pdfs}`);
  console.log(`  Erros:                  ${stats.errors}`);
  console.log("=".repeat(70));

  // List generated PDFs
  const pdfDir = path.join(__dirname, "test-pdfs");
  if (fs.existsSync(pdfDir)) {
    console.log("\n  PDFs gerados em test-pdfs/:");
    const folders = fs.readdirSync(pdfDir);
    for (const folder of folders) {
      const folderPath = path.join(pdfDir, folder);
      if (fs.statSync(folderPath).isDirectory()) {
        const files = fs.readdirSync(folderPath);
        console.log(`    ${folder}/ (${files.length} arquivos)`);
      }
    }
  }

  console.log("\n  Teste completo!");
  process.exit(stats.errors > 10 ? 1 : 0);
}

main().catch((err) => {
  console.error("Erro fatal:", err.message);
  process.exit(1);
});
