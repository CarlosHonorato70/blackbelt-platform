/**
 * Teste E2E Completo — BlackBelt Platform NR-01
 * Popula TODAS as tabelas NR-01 com dados realistas da Black Belt Consultoria
 * e gera 15 PDFs completos para cada empresa
 */
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BASE = process.env.BASE_URL || "http://localhost:5000/api/trpc";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ricardo@consultoriasst.com.br";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Senha@123";
let COOKIE = "";
let IMPERSONATE_TENANT = "";

// ── HTTP helpers ─────────────────────────────────────────────────────────
function trpcMutate(procedure, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(`${BASE}/${procedure}`);
    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(data),
    };
    if (COOKIE) headers["Cookie"] = COOKIE;
    if (IMPERSONATE_TENANT) headers["x-impersonate-tenant"] = IMPERSONATE_TENANT;
    const opts = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: "POST",
      headers,
      rejectUnauthorized: false,
    };
    const req = lib.request(opts, (res) => {
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

function trpcQuery(procedure, input) {
  return new Promise((resolve, reject) => {
    const inputStr = input ? `?input=${encodeURIComponent(JSON.stringify(input))}` : "";
    const url = new URL(`${BASE}/${procedure}${inputStr}`);
    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;
    const headers = {};
    if (COOKIE) headers["Cookie"] = COOKIE;
    if (IMPERSONATE_TENANT) headers["x-impersonate-tenant"] = IMPERSONATE_TENANT;
    const opts = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: "GET",
      headers,
      rejectUnauthorized: false,
    };
    const req = lib.request(opts, (res) => {
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

function nanoid(len = 21) {
  return crypto.randomBytes(len).toString("base64url").substring(0, len);
}

function savePdf(dir, filename, base64Data) {
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
  const size = fs.statSync(filePath).size;
  return size;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function gerarCnpjValido() {
  const n = Array.from({length:8}, () => Math.floor(Math.random()*10));
  n.push(0, 0, 0, 1); // filial 0001
  const calc = (arr, factors) => {
    let sum = 0;
    for (let i = 0; i < factors.length; i++) sum += arr[i] * factors[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  n.push(calc(n, [5,4,3,2,9,8,7,6,5,4,3,2]));
  n.push(calc(n, [6,5,4,3,2,9,8,7,6,5,4,3,2]));
  return n.join("");
}

// ── Dados realistas Black Belt Consultoria ──────────────────────────────
const EMPRESAS = [
  {
    name: "Metalúrgica Horizonte S.A.",
    cnpj: "12345678000190",
    city: "Guarulhos", state: "SP",
    contactName: "Roberto Almeida",
    contactEmail: "roberto@metalurgicahorizonte.com.br",
    folder: "Metalurgica-Horizonte-SA",
    headcount: 320,
    avgSalary: 4800,
    sector: "Metalurgia e Siderurgia",
  },
  {
    name: "TechNova Solutions Ltda",
    cnpj: "11222333000181",
    city: "São Paulo", state: "SP",
    contactName: "Carlos Silva",
    contactEmail: "carlos@technova.com.br",
    folder: "TechNova-Solutions-Ltda",
    headcount: 150,
    avgSalary: 9500,
    sector: "Tecnologia da Informação",
  },
  {
    name: "Construtora Alvorada Ltda",
    cnpj: "55666777000123",
    city: "Belo Horizonte", state: "MG",
    contactName: "Fernanda Costa",
    contactEmail: "fernanda@construtoraalvorada.com.br",
    folder: "Construtora-Alvorada-Ltda",
    headcount: 480,
    avgSalary: 3800,
    sector: "Construção Civil",
  },
  {
    name: "Logística Express S.A.",
    cnpj: "88999000000155",
    city: "Curitiba", state: "PR",
    contactName: "Marcos Oliveira",
    contactEmail: "marcos@logisticaexpress.com.br",
    folder: "Logistica-Express-SA",
    headcount: 210,
    avgSalary: 4200,
    sector: "Transporte e Logística",
  },
];

// Riscos psicossociais realistas por setor
const RISCOS = {
  "Metalurgia e Siderurgia": [
    { severity: "critical", probability: "likely", controls: "EPI obrigatório", obs: "Exposição a ruído e calor extremo" },
    { severity: "high", probability: "possible", controls: "Rodízio de turnos", obs: "Trabalho em turnos rotativos causa fadiga crônica" },
    { severity: "high", probability: "likely", controls: "Ginástica laboral", obs: "Sobrecarga física repetitiva em linha de produção" },
    { severity: "medium", probability: "possible", controls: "Comitê de segurança", obs: "Pressão por metas de produção" },
    { severity: "critical", probability: "possible", controls: "Nenhum implementado", obs: "Risco de acidente grave com maquinário pesado" },
    { severity: "medium", probability: "unlikely", controls: "Canal de denúncia", obs: "Relatos de assédio moral por supervisores" },
    { severity: "low", probability: "rare", controls: "Programa de saúde", obs: "Estresse por reorganização de equipes" },
  ],
  "Tecnologia da Informação": [
    { severity: "high", probability: "likely", controls: "Política de desconexão", obs: "Jornadas extensas e disponibilidade 24/7" },
    { severity: "critical", probability: "possible", controls: "Nenhum implementado", obs: "Burnout em equipes de desenvolvimento ágil" },
    { severity: "medium", probability: "likely", controls: "1:1 semanais", obs: "Isolamento em trabalho remoto" },
    { severity: "high", probability: "possible", controls: "Treinamento de líderes", obs: "Pressão constante por entregas (sprints)" },
    { severity: "medium", probability: "possible", controls: "Ergonomia", obs: "Problemas posturais por uso prolongado de computador" },
    { severity: "low", probability: "unlikely", controls: "Programa wellness", obs: "Sedentarismo associado ao trabalho" },
    { severity: "medium", probability: "likely", controls: "Feedback contínuo", obs: "Insegurança com IA e automação substituindo funções" },
  ],
  "Construção Civil": [
    { severity: "critical", probability: "certain", controls: "NR-35 implementada", obs: "Trabalho em altura com risco de queda fatal" },
    { severity: "critical", probability: "likely", controls: "Treinamento NR-18", obs: "Exposição a condições climáticas extremas" },
    { severity: "high", probability: "likely", controls: "Rotatividade", obs: "Sobrecarga física intensa diária" },
    { severity: "high", probability: "possible", controls: "SIPAT anual", obs: "Pressão por prazos de obra" },
    { severity: "medium", probability: "likely", controls: "Alojamento adequado", obs: "Afastamento prolongado da família" },
    { severity: "medium", probability: "possible", controls: "DDS diário", obs: "Convivência forçada em alojamentos" },
    { severity: "high", probability: "possible", controls: "Nenhum implementado", obs: "Informalidade nas relações trabalhistas" },
  ],
  "Transporte e Logística": [
    { severity: "critical", probability: "likely", controls: "Jornada controlada", obs: "Fadiga ao volante em viagens longas" },
    { severity: "high", probability: "likely", controls: "Pausas obrigatórias", obs: "Privação de sono em rotas noturnas" },
    { severity: "high", probability: "possible", controls: "Rastreamento GPS", obs: "Risco de assalto em rotas perigosas" },
    { severity: "medium", probability: "likely", controls: "Comunicação diária", obs: "Isolamento social em viagens longas" },
    { severity: "medium", probability: "possible", controls: "Ergonomia veicular", obs: "Problemas lombares por vibração" },
    { severity: "critical", probability: "possible", controls: "Teste toxicológico", obs: "Uso de substâncias para manter-se acordado" },
    { severity: "low", probability: "unlikely", controls: "Benefícios família", obs: "Pressão familiar pela ausência" },
  ],
};

// PCMSO recommendations por tipo de risco
const PCMSO_RECS = [
  { examType: "Avaliação Psicossocial (COPSOQ-II)", frequency: "Anual", target: "Todos os colaboradores", basis: "NR-01 item 1.5.3.1.1 - Fatores psicossociais", priority: "high" },
  { examType: "Audiometria Ocupacional", frequency: "Semestral", target: "Expostos a ruído > 80dB", basis: "NR-07 + NR-09", priority: "high" },
  { examType: "Exame Clínico Ocupacional (ASO)", frequency: "Anual", target: "Todos os colaboradores", basis: "NR-07 item 7.5.6", priority: "medium" },
  { examType: "Avaliação Ergonômica (AEP)", frequency: "A cada 2 anos", target: "Setores administrativos e operacionais", basis: "NR-17", priority: "medium" },
  { examType: "Avaliação de Estresse Ocupacional", frequency: "Semestral", target: "Lideranças e equipes críticas", basis: "NR-01 + OMS/OIT", priority: "urgent" },
  { examType: "Teste de Acuidade Visual", frequency: "Anual", target: "Usuários de VDT > 4h/dia", basis: "NR-17 item 17.3.2", priority: "low" },
];

// Treinamentos baseados nos serviços reais da Black Belt
const TREINAMENTOS = [
  {
    title: "Prevenção de Burnout e Estresse Ocupacional",
    desc: "Oficina prática para reduzir adoecimento mental e promover equilíbrio vida-trabalho",
    type: "workshop",
    modules: [
      { title: "Identificando Sinais de Burnout", duration: 60, content: "Reconhecimento precoce dos sintomas de esgotamento profissional" },
      { title: "Técnicas de Manejo do Estresse", duration: 90, content: "Ferramentas práticas de autorregulação emocional baseadas em evidências" },
      { title: "Plano Individual de Prevenção", duration: 60, content: "Elaboração de plano personalizado com metas de saúde mental" },
    ],
  },
  {
    title: "Combate ao Assédio Moral e Sexual",
    desc: "Treinamento de sensibilização e regras de conduta conforme legislação vigente",
    type: "training",
    modules: [
      { title: "Marco Legal — Lei 14.457/2022", duration: 45, content: "Obrigações legais das empresas na prevenção de assédio" },
      { title: "Identificação de Condutas Ofensivas", duration: 60, content: "Reconhecimento de assédio moral, sexual e discriminação" },
      { title: "Canal de Denúncia e Acolhimento", duration: 45, content: "Como utilizar o canal seguro e procedimentos de investigação" },
    ],
  },
  {
    title: "Capacitação NR-01 para Lideranças",
    desc: "Capacitação de gestores para identificar e manejar riscos psicossociais em equipes",
    type: "training",
    modules: [
      { title: "NR-01 e Riscos Psicossociais", duration: 60, content: "Nova NR-01 e obrigações do empregador quanto a fatores psicossociais" },
      { title: "Manejo de Crises e Sofrimento Psíquico", duration: 90, content: "Como abordar colaboradores em sofrimento — escuta ativa e encaminhamento" },
      { title: "Resiliência sob Pressão — Método Black Belt", duration: 60, content: "Tomada de decisão assertiva e autogestão emocional em cenários críticos" },
    ],
  },
];

// Dimensões COPSOQ-II (respostas simuladas 0-100)
function gerarRespostasCopsoq(perfil) {
  // Perfis: "estressado", "saudavel", "moderado", "critico"
  const perfis = {
    estressado: { demand: [65,80], control: [25,40], support: [30,50], leadership: [20,40], community: [35,55], meaning: [40,60], trust: [25,45], justice: [20,40], insecurity: [60,80], mentalHealth: [25,45], burnout: [60,85], violence: [10,30] },
    saudavel:   { demand: [20,40], control: [60,80], support: [65,85], leadership: [60,80], community: [65,85], meaning: [70,90], trust: [65,85], justice: [60,80], insecurity: [10,30], mentalHealth: [70,90], burnout: [10,30], violence: [0,10] },
    moderado:   { demand: [40,60], control: [40,60], support: [45,65], leadership: [40,60], community: [45,65], meaning: [50,70], trust: [40,60], justice: [40,60], insecurity: [30,50], mentalHealth: [45,65], burnout: [30,50], violence: [5,20] },
    critico:    { demand: [75,95], control: [10,30], support: [15,35], leadership: [10,25], community: [15,35], meaning: [20,40], trust: [10,30], justice: [10,25], insecurity: [70,95], mentalHealth: [10,30], burnout: [75,95], violence: [20,50] },
  };
  const p = perfis[perfil] || perfis.moderado;
  const rand = (range) => Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];

  // Gerar 76 respostas (1-76) com valores 1-5 (chaves numéricas como o frontend)
  const responses = {};
  for (let i = 1; i <= 76; i++) responses[i] = Math.floor(Math.random() * 5) + 1;

  return { responses, perfil };
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const outputDir = path.join(__dirname, "test-pdfs");
  fs.mkdirSync(outputDir, { recursive: true });

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  BlackBelt Platform — Teste E2E Completo NR-01 (v2)         ║");
  console.log("║  Dados baseados nos serviços reais da Black Belt Consultoria ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log(`  Base URL: ${BASE}`);
  console.log(`  Admin: ${ADMIN_EMAIL}\n`);

  // ── Step 1: Login ───────────────────────────────────────────────────
  console.log("🔐 Step 1: Login admin...");
  await trpcMutate("auth.login", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  console.log(`  OK — cookie: ${COOKIE.substring(0, 30)}...\n`);

  // ── Step 2: Criar consultor Black Belt + empresas clientes ──────────
  console.log("🏢 Step 2: Criando consultor Black Belt Consultoria...");
  const existingTenants = await trpcQuery("tenants.list", { search: "" });
  const tenantList = existingTenants?.tenants || existingTenants || [];

  // 2a. Criar tenant "Black Belt Consultoria SST" (consultor)
  let consultorTenant = tenantList.find(t => t.name?.includes("Black Belt"));
  if (!consultorTenant) {
    try {
      consultorTenant = await trpcMutate("tenants.create", {
        name: "Black Belt Consultoria SST",
        cnpj: gerarCnpjValido(),
        city: "São Paulo", state: "SP",
        contactName: "Carlos Honorato",
        contactEmail: "contato@blackbeltconsultoria.com.br",
      });
      console.log(`  + Consultor criado: Black Belt Consultoria SST (${consultorTenant.id})`);
    } catch (e) {
      console.log(`  ! Consultor: ${e.message.substring(0, 80)}`);
      consultorTenant = tenantList.find(t => t.name?.includes("Black Belt")) || tenantList[0];
    }
  } else {
    console.log(`  = Consultor existente: ${consultorTenant.name} (${consultorTenant.id})`);
  }

  // 2b. Ativar plano do consultor
  let planId = null;
  try {
    const plans = await trpcQuery("subscriptions.listPublicPlans", {});
    if (plans?.length > 0) {
      planId = plans[plans.length - 1].id; // Usar plano mais completo
      await trpcMutate("adminSubscriptions.adminActivatePlan", {
        tenantId: consultorTenant.id, planId, billingCycle: "monthly", reason: "Consultor Black Belt — E2E",
      });
      console.log(`  ✅ Plano ativado para consultor`);
    }
  } catch (e) { /* já ativado */ }

  // 2c. Criar empresas como clientes do consultor (via companies.create com impersonação)
  console.log("\n🏭 Criando empresas clientes...");
  IMPERSONATE_TENANT = consultorTenant.id;

  const companies = [];
  for (const emp of EMPRESAS) {
    let company = null;
    try {
      company = await trpcMutate("companies.create", {
        name: emp.name, cnpj: emp.cnpj, city: emp.city, state: emp.state,
        contactName: emp.contactName, contactEmail: emp.contactEmail,
      });
      console.log(`  + Empresa criada: ${emp.name} (${company.id})`);
    } catch (e) {
      // Buscar existente via companies.list OU tenants.list
      try {
        const list = await trpcQuery("companies.list", {});
        const items = Array.isArray(list) ? list : (list?.companies || list?.data || []);
        const existing = items.find(c => c.cnpj === emp.cnpj || c.name?.includes(emp.name.split(" ")[0]));
        if (existing) {
          company = existing;
          console.log(`  = Existente (company): ${emp.name} (${existing.id})`);
        }
      } catch (e2) { /* ignore */ }

      // Fallback: buscar como tenant (pode ter sido criado como tenant antes)
      if (!company) {
        try {
          const savedImp = IMPERSONATE_TENANT;
          IMPERSONATE_TENANT = "";
          const tenants = await trpcQuery("tenants.list", { search: emp.name.split(" ")[0] });
          IMPERSONATE_TENANT = savedImp;
          const items = tenants?.tenants || tenants || [];
          const existing = items.find(t => t.cnpj === emp.cnpj || t.name?.includes(emp.name.split(" ")[0]));
          if (existing) {
            company = existing;
            console.log(`  = Existente (tenant): ${emp.name} (${existing.id})`);
          }
        } catch (e3) { /* ignore */ }
      }

      if (!company) {
        // Último recurso: criar como tenant em vez de company
        try {
          const savedImp = IMPERSONATE_TENANT;
          IMPERSONATE_TENANT = "";
          company = await trpcMutate("tenants.create", {
            name: emp.name, cnpj: emp.cnpj, city: emp.city, state: emp.state,
            contactName: emp.contactName, contactEmail: emp.contactEmail,
          });
          IMPERSONATE_TENANT = savedImp;
          console.log(`  + Criada (tenant): ${emp.name} (${company.id})`);
        } catch (e4) {
          console.log(`  ! ${emp.name}: ${e4.message.substring(0, 80)}`);
          continue;
        }
      }
    }

    // Ativar plano da empresa (adminProcedure — sem impersonação)
    if (planId && company?.id) {
      const savedImp = IMPERSONATE_TENANT;
      IMPERSONATE_TENANT = "";
      try {
        await trpcMutate("adminSubscriptions.adminActivatePlan", {
          tenantId: company.id, planId, billingCycle: "monthly", reason: "Cliente Black Belt — E2E",
        });
        console.log(`  ✅ Plano ativado: ${emp.name}`);
      } catch (e) { console.log(`  ⚠️  Plano ${emp.name}: ${e.message.substring(0, 60)}`); }
      IMPERSONATE_TENANT = savedImp;
    }

    companies.push({ ...emp, id: company.id });
  }

  IMPERSONATE_TENANT = ""; // Resetar impersonação

  if (companies.length === 0) {
    console.error("❌ Nenhuma empresa disponível. Abortando.");
    process.exit(1);
  }
  console.log(`\n  Total: ${companies.length} empresas clientes da Black Belt\n`);

  // ── Step 3-7: Popular dados NR-01 para cada empresa ───────────────────
  for (const company of companies) {
    const tid = company.id;
    IMPERSONATE_TENANT = tid; // Ativar impersonação para procedures que exigem tenantId

    console.log(`\n${"═".repeat(60)}`);
    console.log(`📊 ${company.name} (${company.sector})`);
    console.log(`   ${company.headcount} colaboradores | Sal. médio R$ ${company.avgSalary}`);
    console.log(`${"═".repeat(60)}`);

    let savedAssessmentId = null;
    let savedPersonIds = [];

    // ── 3. Avaliação de Risco + Itens ────────────────────────────────
    try {
      const assessment = await trpcMutate("riskAssessments.create", {
        tenantId: tid,
        title: `Avaliação de Riscos Psicossociais — ${company.name} (2026)`,
        assessor: "Carlos Honorato — CRP 06/189456",
        methodology: "COPSOQ-II adaptado + Análise Ergonômica Preliminar (AEP)",
        assessmentDate: new Date().toISOString(),
      });
      savedAssessmentId = assessment?.id || assessment;
      console.log(`  ✅ Avaliação de risco: ${savedAssessmentId}`);

      const riscos = RISCOS[company.sector] || RISCOS["Tecnologia da Informação"];
      let itemCount = 0;
      for (const item of riscos) {
        try {
          await trpcMutate("riskAssessments.addItem", {
            assessmentId: savedAssessmentId,
            riskFactorId: `RF-${nanoid(8)}`,
            severity: item.severity,
            probability: item.probability,
            currentControls: item.controls,
            affectedPopulation: Math.floor(company.headcount * (Math.random() * 0.3 + 0.1)),
            observations: item.obs,
          });
          itemCount++;
        } catch (e) { /* ignore */ }
      }
      console.log(`  ✅ ${itemCount} itens de risco adicionados`);
    } catch (e) {
      console.log(`  ⚠️  Avaliação: ${e.message.substring(0, 100)}`);
    }

    // ── 4. Recomendações PCMSO ───────────────────────────────────────
    try {
      if (savedAssessmentId) {
        await trpcMutate("pcmsoIntegration.generate", { tenantId: tid, riskAssessmentId: savedAssessmentId });
        console.log("  ✅ Recomendações PCMSO geradas automaticamente");
      }
    } catch (e) {
      console.log(`  ⚠️  PCMSO auto: ${e.message.substring(0, 80)}`);
    }

    // ── 5. Avaliação COPSOQ-II + Respostas + Relatório ──────────────
    try {
      const copsoq = await trpcMutate("assessments.create", {
        title: `COPSOQ-II — ${company.name} — 1º Semestre 2026`,
        description: `Avaliação psicossocial via COPSOQ-II para ${company.headcount} colaboradores`,
      });
      const copsoqId = copsoq?.id || copsoq;
      console.log(`  ✅ Avaliação COPSOQ: ${copsoqId}`);

      // Submeter 15-25 respostas simuladas com perfis variados
      const numRespostas = Math.min(25, Math.floor(company.headcount * 0.08));
      const perfis = ["saudavel", "saudavel", "moderado", "moderado", "moderado", "estressado", "estressado", "critico"];
      let respostasOk = 0;

      for (let i = 0; i < numRespostas; i++) {
        const perfil = perfis[i % perfis.length];
        const personId = `person_${nanoid(8)}`;
        savedPersonIds.push(personId);
        const { responses } = gerarRespostasCopsoq(perfil);
        const generos = ["masculino", "feminino", "nao_informado"];
        const faixas = ["18-25", "26-35", "36-45", "46-55", "56+"];
        try {
          await trpcMutate("assessments.submitResponse", {
            assessmentId: copsoqId,
            personId,
            responses,
            ageGroup: faixas[Math.floor(Math.random() * faixas.length)],
            gender: generos[Math.floor(Math.random() * generos.length)],
            yearsInCompany: ["<1", "1-3", "3-5", "5-10", "10+"][Math.floor(Math.random() * 5)],
            mentalHealthSupport: "Sim, a empresa oferece programa de apoio psicológico",
            workplaceImprovement: "Melhorar comunicação entre gestão e equipe operacional",
          });
          respostasOk++;
        } catch (e) {
          if (i === 0) console.log(`  ⚠️  COPSOQ resp: ${e.message.substring(0, 80)}`);
        }
      }
      console.log(`  ✅ ${respostasOk}/${numRespostas} respostas COPSOQ submetidas`);

      // Gerar relatório agregado
      if (respostasOk > 0) {
        try {
          const report = await trpcMutate("assessments.generateReport", { assessmentId: copsoqId });
          console.log(`  ✅ Relatório COPSOQ gerado: ${report?.reportId || "ok"}`);
        } catch (e) {
          console.log(`  ⚠️  Relatório COPSOQ: ${e.message.substring(0, 80)}`);
        }
      }
    } catch (e) {
      console.log(`  ⚠️  COPSOQ: ${e.message.substring(0, 100)}`);
    }

    // ── 6. Planos de Ação ────────────────────────────────────────────
    try {
      const planos = [
        { title: "Implementação de Programa Anti-Burnout", priority: "urgent", actionType: "administrative", desc: "Programa estruturado de prevenção ao esgotamento profissional com acompanhamento psicológico" },
        { title: "Capacitação de Lideranças em Saúde Mental", priority: "high", actionType: "administrative", desc: "Treinamento de gestores para identificação e manejo de riscos psicossociais — Método Black Belt" },
        { title: "Implementação de Canal de Denúncia Anônima", priority: "high", actionType: "administrative", desc: "Canal seguro para relatos de assédio e violência conforme Lei 14.457/2022" },
        { title: "Adequação Ergonômica dos Postos de Trabalho", priority: "medium", actionType: "engineering", desc: "Ajustes ergonômicos conforme NR-17 — mobiliário, iluminação e organização" },
        { title: "Programa de Qualidade de Vida e Bem-Estar", priority: "medium", actionType: "administrative", desc: "Ações de promoção de saúde: ginástica laboral, pausas ativas, apoio nutricional" },
      ];
      for (const p of planos) {
        await trpcMutate("riskAssessments.createActionPlan", {
          tenantId: tid,
          title: p.title,
          priority: p.priority,
          actionType: p.actionType,
          description: p.desc,
          deadline: new Date("2026-12-31").toISOString(),
          budget: Math.floor(Math.random() * 50000 + 10000) * 100, // centavos
        });
      }
      console.log(`  ✅ ${planos.length} planos de ação`);
    } catch (e) {
      console.log(`  ⚠️  Planos: ${e.message.substring(0, 80)}`);
    }

    // ── 7. Seeds automáticos ─────────────────────────────────────────
    // Cronograma NR-01 (11 milestones)
    try {
      await trpcMutate("complianceTimeline.seedDefaults", { tenantId: tid });
      console.log("  ✅ Cronograma NR-01 (11 milestones)");
    } catch (e) {
      console.log(`  ⚠️  Timeline: ${e.message.substring(0, 60)}`);
    }

    // Checklist NR-01 (23 requisitos)
    try {
      await trpcMutate("complianceChecklist.seedNr01Requirements", { tenantId: tid });
      console.log("  ✅ Checklist NR-01 (23 requisitos)");
    } catch (e) {
      console.log(`  ⚠️  Checklist seed: ${e.message.substring(0, 60)}`);
    }

    // Marcar ~85% dos itens como conformes
    try {
      const checklist = await trpcQuery("complianceChecklist.list", { tenantId: tid });
      const items = Array.isArray(checklist) ? checklist : (checklist?.items || []);
      if (items.length > 0) {
        const toMark = Math.ceil(items.length * 0.85);
        let marked = 0;
        for (let i = 0; i < items.length; i++) {
          const status = i < toMark ? "compliant" : (i < toMark + 2 ? "partial" : "non_compliant");
          try {
            await trpcMutate("complianceChecklist.updateStatus", {
              id: items[i].id,
              status,
              notes: status === "compliant" ? "Evidência documental verificada" : (status === "partial" ? "Em implementação" : "Pendente de adequação"),
              verifiedBy: "Carlos Honorato — CRP 06/189456",
            });
            marked++;
          } catch (e) { /* ignore */ }
        }
        console.log(`  ✅ Checklist: ${marked}/${items.length} itens atualizados (${Math.round(toMark/items.length*100)}% conformes)`);
      }
    } catch (e) {
      console.log(`  ⚠️  Checklist update: ${e.message.substring(0, 60)}`);
    }

    // Benchmark nacional
    try {
      await trpcMutate("benchmark.seedBenchmarkData", {});
      console.log("  ✅ Benchmark nacional COPSOQ-II");
    } catch (e) {
      console.log(`  ⚠️  Benchmark: ${e.message.substring(0, 60)}`);
    }

    // Alertas de prazo
    try {
      await trpcMutate("deadlineAlerts.autoGenerate", { tenantId: tid });
      console.log("  ✅ Alertas de prazo gerados");
    } catch (e) {
      console.log(`  ⚠️  Alertas: ${e.message.substring(0, 60)}`);
    }

    // ── 8. Treinamentos com módulos ──────────────────────────────────
    for (const treinamento of TREINAMENTOS) {
      try {
        const prog = await trpcMutate("training.createProgram", {
          tenantId: tid,
          title: `${treinamento.title} — ${company.name}`,
          description: treinamento.desc,
          programType: treinamento.type,
          targetAudience: "Gestores e colaboradores-chave",
          duration: treinamento.modules.reduce((s, m) => s + m.duration, 0),
          facilitator: "Carlos Honorato — Black Belt Consultoria",
        });
        const progId = prog?.id || prog;
        if (progId) {
          for (let mi = 0; mi < treinamento.modules.length; mi++) {
            const mod = treinamento.modules[mi];
            try {
              await trpcMutate("training.addModule", {
                programId: progId,
                tenantId: tid,
                title: mod.title,
                content: mod.content,
                order: mi + 1,
                duration: mod.duration,
                passingScore: 70,
              });
            } catch (e) { /* ignore */ }
          }
        }
        console.log(`  ✅ Treinamento: ${treinamento.title} (${treinamento.modules.length} módulos)`);
      } catch (e) {
        console.log(`  ⚠️  Training: ${e.message.substring(0, 80)}`);
      }
    }

    // ── 9. Denúncias anônimas ────────────────────────────────────────
    try {
      const denuncias = [
        { category: "harassment", severity: "critical", description: "Gestor do setor operacional pratica assédio moral constante, com humilhações públicas e ameaças de demissão sem justa causa." },
        { category: "workload", severity: "high", description: "Equipe reduzida em 30% sem redução de demanda. Colaboradores fazendo horas extras não remuneradas." },
        { category: "discrimination", severity: "high", description: "Funcionária preterida em promoção por estar gestante. Relato de discriminação de gênero." },
        { category: "harassment", severity: "medium", description: "Piadas e comentários inadequados recorrentes no refeitório sobre orientação sexual de colegas." },
        { category: "workload", severity: "medium", description: "Metas inalcançáveis impostas sem diálogo. Pressão constante por resultados sem recursos adequados." },
        { category: "violence", severity: "critical", description: "Ameaça verbal de agressão física entre colaboradores durante discussão no estacionamento." },
      ];
      for (const d of denuncias) {
        await trpcMutate("anonymousReports.submit", {
          tenantId: tid,
          category: d.category,
          severity: d.severity,
          description: d.description,
          isAnonymous: true,
        });
      }
      console.log(`  ✅ ${denuncias.length} denúncias anônimas`);
    } catch (e) {
      console.log(`  ⚠️  Denúncias: ${e.message.substring(0, 80)}`);
    }

    // ── 10. Avaliação ergonômica ─────────────────────────────────────
    try {
      const ergo = await trpcMutate("ergonomicAssessments.create", {
        tenantId: tid,
        title: `AEP — Avaliação Ergonômica Preliminar — ${company.name}`,
        assessorName: "Carlos Honorato — Black Belt Consultoria",
        assessmentDate: new Date().toISOString(),
        methodology: "NR-17 — Avaliação Ergonômica Preliminar (AEP)",
      });
      const ergoId = ergo?.id || ergo;
      if (ergoId) {
        const items = [
          { category: "workstation", factor: "Altura e ajuste do mobiliário", riskLevel: "moderate", obs: "Cadeiras sem ajuste de altura em 40% dos postos" },
          { category: "posture", factor: "Postura sentada prolongada", riskLevel: "high", obs: "Colaboradores sentados > 6h/dia sem pausa ativa" },
          { category: "lighting", factor: "Iluminação do ambiente", riskLevel: "acceptable", obs: "Iluminação dentro dos parâmetros da NBR 5413" },
          { category: "noise", factor: "Nível de ruído ambiental", riskLevel: company.sector.includes("Metal") ? "critical" : "moderate", obs: "Medição com decibelímetro no posto de trabalho" },
          { category: "psychosocial", factor: "Demanda cognitiva e pressão temporal", riskLevel: "high", obs: "Sobrecarga cognitiva identificada em entrevistas" },
          { category: "repetition", factor: "Movimentos repetitivos", riskLevel: company.sector.includes("Metal") ? "high" : "moderate", obs: "Risco de LER/DORT em atividades repetitivas" },
          { category: "organization", factor: "Pausas e intervalos", riskLevel: "moderate", obs: "Pausas insuficientes conforme NR-17" },
        ];
        for (const item of items) {
          try {
            await trpcMutate("ergonomicAssessments.addItem", {
              assessmentId: ergoId,
              category: item.category,
              factor: item.factor,
              riskLevel: item.riskLevel,
              observation: item.obs,
              recommendation: `Implementar melhorias em ${item.factor.toLowerCase()}`,
            });
          } catch (e) { /* ignore */ }
        }
      }
      console.log("  ✅ Avaliação ergonômica + 7 itens");
    } catch (e) {
      console.log(`  ⚠️  Ergonomia: ${e.message.substring(0, 80)}`);
    }

    // ── 11. Laudo técnico ────────────────────────────────────────────
    try {
      await trpcMutate("complianceReports.create", {
        tenantId: tid,
        title: `Laudo Técnico de Riscos Psicossociais — ${company.name}`,
        documentType: "laudo_tecnico",
        description: `Laudo técnico elaborado conforme NR-01 (Portaria MTE 1.419/2024) para ${company.name}. Identificados e classificados riscos psicossociais em ${company.headcount} colaboradores utilizando metodologia COPSOQ-II adaptada. Responsável técnico: Carlos Honorato — CRP 06/189456.`,
        version: "1.0",
        validFrom: new Date().toISOString().split("T")[0],
        signedBy: "Carlos Honorato — CRP 06/189456 — Black Belt Consultoria",
      });
      console.log("  ✅ Laudo técnico");
    } catch (e) {
      console.log(`  ⚠️  Laudo: ${e.message.substring(0, 80)}`);
    }

    // ── 12. eSocial ──────────────────────────────────────────────────
    try {
      if (savedAssessmentId) {
        await trpcMutate("esocialExport.generateXml", {
          tenantId: tid,
          eventType: "S-2220",
          riskAssessmentId: savedAssessmentId,
        });
        console.log("  ✅ eSocial S-2220 gerado");
        await trpcMutate("esocialExport.generateXml", {
          tenantId: tid,
          eventType: "S-2240",
          riskAssessmentId: savedAssessmentId,
        });
        console.log("  ✅ eSocial S-2240 gerado");
      }
    } catch (e) {
      console.log(`  ⚠️  eSocial: ${e.message.substring(0, 80)}`);
    }

    // ── 13. Parâmetros financeiros ───────────────────────────────────
    try {
      await trpcMutate("financialCalculator.updateParameters", {
        tenantId: tid,
        averageSalary: company.avgSalary,
        headcount: company.headcount,
        avgReplacementCost: Math.round(company.avgSalary * 3),
        dailyAbsenteeismCost: Math.round(company.avgSalary / 22),
        finePerWorker: 6708, // R$ 6.708,08 multa NR-01
        litigationAvgCost: 50000,
      });
      console.log("  ✅ Parâmetros financeiros");
    } catch (e) {
      console.log(`  ⚠️  Financeiro: ${e.message.substring(0, 80)}`);
    }

    // ── 14. Certificado de conformidade ──────────────────────────────
    try {
      await trpcMutate("complianceCertificate.issue", {
        tenantId: tid,
        issuedBy: "Carlos Honorato — CRP 06/189456 — Black Belt Consultoria SST",
      });
      console.log("  ✅ Certificado de conformidade emitido");
    } catch (e) {
      console.log(`  ⚠️  Certificado: ${e.message.substring(0, 80)}`);
    }

    await sleep(500); // Pequena pausa entre empresas
  }

  // ── Step 8: Gerar TODOS os PDFs ─────────────────────────────────────
  console.log(`\n\n${"═".repeat(60)}`);
  console.log("📄 GERANDO 15 PDFs PARA CADA EMPRESA...");
  console.log(`${"═".repeat(60)}\n`);

  const pdfProcedures = [
    { name: "exportRiskMatrix", label: "01-Matriz-de-Risco" },
    { name: "exportPcmsoIntegration", label: "02-Integracao-PGR-PCMSO" },
    { name: "exportPsychosocialDashboard", label: "03-Dashboard-Psicossocial" },
    { name: "exportAssessmentTrends", label: "04-Tendencias-Avaliacao" },
    { name: "exportFinancialCalculator", label: "05-Calculadora-Financeira" },
    { name: "exportComplianceTimeline", label: "06-Cronograma-NR01" },
    { name: "exportComplianceChecklist", label: "07-Checklist-Conformidade" },
    { name: "exportComplianceCertificate", label: "08-Certificado-Conformidade" },
    { name: "exportLaudoTecnico", label: "09-Laudo-Tecnico" },
    { name: "exportBenchmark", label: "10-Benchmark-COPSOQ" },
    { name: "exportTrainingReport", label: "11-Relatorio-Treinamento" },
    { name: "exportAnonymousReports", label: "12-Relatorio-Denuncias" },
    { name: "exportDeadlineAlerts", label: "13-Alertas-Prazos" },
    { name: "exportEsocialReport", label: "14-Relatorio-eSocial" },
    { name: "exportExecutiveReport", label: "15-Relatorio-Executivo" },
  ];

  let totalPdfs = 0;
  let totalFails = 0;
  let totalSize = 0;

  for (const company of companies) {
    const companyDir = path.join(outputDir, company.folder);
    IMPERSONATE_TENANT = company.id;
    console.log(`📁 ${company.name} → ${company.folder}/`);

    for (const proc of pdfProcedures) {
      try {
        const result = await trpcMutate(`nr01Pdf.${proc.name}`, { tenantId: company.id });
        if (result?.data && typeof result.data === "string" && result.data.length > 100) {
          const size = savePdf(companyDir, `${proc.label}.pdf`, result.data);
          console.log(`  ✅ ${proc.label}.pdf (${(size / 1024).toFixed(1)} KB)`);
          totalPdfs++;
          totalSize += size;
        } else if (result?.message) {
          console.log(`  ⚠️  ${proc.label}: ${result.message}`);
          totalFails++;
        } else {
          console.log(`  ⚠️  ${proc.label}: sem dados`);
          totalFails++;
        }
      } catch (e) {
        console.log(`  ❌ ${proc.label}: ${e.message.substring(0, 80)}`);
        totalFails++;
      }
    }
    console.log();
  }

  // ── Resumo Final ──────────────────────────────────────────────────
  IMPERSONATE_TENANT = "";
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║                      RESULTADO FINAL                         ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Empresas:    ${companies.length}                                              ║`);
  console.log(`║  PDFs OK:     ${String(totalPdfs).padStart(3)} / ${pdfProcedures.length * companies.length}                                         ║`);
  console.log(`║  PDFs FAIL:   ${String(totalFails).padStart(3)}                                              ║`);
  console.log(`║  Tamanho:     ${(totalSize / 1024 / 1024).toFixed(2)} MB                                         ║`);
  console.log(`║  Pasta:       test-pdfs/                                       ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  // Listar arquivos gerados
  console.log("\n📂 Arquivos gerados:");
  for (const company of companies) {
    const companyDir = path.join(outputDir, company.folder);
    if (fs.existsSync(companyDir)) {
      const files = fs.readdirSync(companyDir).filter(f => f.endsWith(".pdf"));
      console.log(`\n  ${company.folder}/ (${files.length} PDFs):`);
      for (const f of files) {
        const size = fs.statSync(path.join(companyDir, f)).size;
        const indicator = size > 3000 ? "✅" : "⚠️ ";
        console.log(`    ${indicator} ${f} — ${(size / 1024).toFixed(1)} KB`);
      }
    }
  }
}

main().catch((err) => {
  console.error("\n❌ Erro fatal:", err.message);
  process.exit(1);
});
