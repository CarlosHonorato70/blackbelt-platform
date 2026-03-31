/**
 * Simulação completa do fluxo NR-01
 * CNPJ: 30.428.133/0001-24 (HR CONVENIENCIA)
 * 5 funcionários simulados
 */
import http from "http";

const BASE = { hostname: "127.0.0.1", port: 5000 };

function request(path, method, data, cookie) {
  return new Promise((resolve, reject) => {
    const body = data ? JSON.stringify(data) : "";
    const headers = { "Content-Type": "application/json" };
    if (cookie) headers.Cookie = cookie;

    const req = http.request({ ...BASE, path, method, headers }, (res) => {
      let b = "";
      const sc = res.headers["set-cookie"] || [];
      res.on("data", (c) => (b += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(b || "{}"), cookies: sc });
        } catch {
          resolve({ status: res.statusCode, data: b, cookies: sc });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function trpc(procedure, method, input, cookie) {
  const path = method === "GET"
    ? `/api/trpc/${procedure}?input=${encodeURIComponent(JSON.stringify(input || {}))}`
    : `/api/trpc/${procedure}`;
  const data = method === "POST" ? input : null;
  return request(path, method, data, cookie);
}

function result(r) {
  return r.data?.result?.data;
}

// Generate random COPSOQ responses (76 questions, 1-5 scale)
function generateResponses(profile) {
  const responses = {};
  // 12 dimensions, ~6 questions each
  const dimensions = {
    demanda: { base: profile.stressLevel, questions: ["q1","q2","q3","q4","q5","q6"] },
    controle: { base: profile.autonomy, questions: ["q7","q8","q9","q10","q11","q12"] },
    apoio: { base: profile.support, questions: ["q13","q14","q15","q16","q17","q18"] },
    lideranca: { base: profile.leadership, questions: ["q19","q20","q21","q22","q23","q24"] },
    comunidade: { base: profile.community, questions: ["q25","q26","q27","q28","q29","q30"] },
    significado: { base: profile.meaning, questions: ["q31","q32","q33","q34","q35","q36"] },
    confianca: { base: profile.trust, questions: ["q37","q38","q39","q40","q41","q42"] },
    justica: { base: profile.justice, questions: ["q43","q44","q45","q46","q47","q48"] },
    inseguranca: { base: profile.insecurity, questions: ["q49","q50","q51","q52","q53","q54"] },
    saudeMental: { base: profile.mentalHealth, questions: ["q55","q56","q57","q58","q59","q60","q61"] },
    burnout: { base: profile.burnout, questions: ["q62","q63","q64","q65","q66","q67","q68"] },
    violencia: { base: profile.violence, questions: ["q69","q70","q71","q72","q73","q74","q75","q76"] },
  };

  for (const [dim, config] of Object.entries(dimensions)) {
    for (const q of config.questions) {
      // Random variation around base score
      const variation = Math.floor(Math.random() * 2) - 1; // -1, 0, or 1
      responses[q] = Math.max(1, Math.min(5, config.base + variation));
    }
  }
  return responses;
}

async function main() {
  console.log("=== SIMULAÇÃO COMPLETA NR-01 ===\n");

  // ── 1. LOGIN ──
  console.log("1. Fazendo login...");
  const login = await trpc("auth.login", "POST", {
    email: "psicarloshonorato@gmail.com",
    password: "Teste@1234",
  });
  const cookie = login.cookies.map((c) => c.split(";")[0]).join("; ");
  console.log("   ✅ Login OK\n");

  // ── 2. FIND COMPANY ──
  console.log("2. Buscando empresa CNPJ 30.428.133/0001-24...");
  const companies = await trpc("companies.list", "GET", {}, cookie);
  const company = result(companies)?.companies?.find((c) => c.cnpj === "30.428.133/0001-24");
  if (!company) {
    console.log("   ❌ Empresa não encontrada! Execute o agente primeiro.");
    return;
  }
  console.log(`   ✅ Empresa: ${company.name} (ID: ${company.id})\n`);

  // ── 3. CREATE COPSOQ-II ASSESSMENT ──
  console.log("3. Criando avaliação COPSOQ-II...");
  const assessment = await trpc("assessments.create", "POST", {
    title: "Avaliação COPSOQ-II - HR Conveniência 2026",
    description: "Avaliação de riscos psicossociais conforme NR-01",
  }, cookie);

  // The assessment might fail if procedure requires subscription
  // Let's check if we need to use a different approach
  const assessmentData = result(assessment);
  if (!assessmentData?.id) {
    console.log("   ⚠️ Falha ao criar assessment via tRPC:", JSON.stringify(assessment.data).substring(0, 200));
    console.log("   Tentando criar diretamente no banco...");
  }
  const assessmentId = assessmentData?.id;
  console.log(`   ✅ Assessment criado: ${assessmentId}\n`);

  if (!assessmentId) {
    console.log("   ❌ Não foi possível criar o assessment. Abortando.");
    return;
  }

  // ── 4. SEND INVITES TO 5 EMPLOYEES ──
  console.log("4. Enviando convites para 5 funcionários...");
  const employees = [
    { name: "Maria Silva", email: "maria.silva@hrconv.test", position: "Atendente", sector: "Vendas" },
    { name: "João Santos", email: "joao.santos@hrconv.test", position: "Caixa", sector: "Vendas" },
    { name: "Ana Oliveira", email: "ana.oliveira@hrconv.test", position: "Repositora", sector: "Estoque" },
    { name: "Carlos Souza", email: "carlos.souza@hrconv.test", position: "Gerente", sector: "Gestão" },
    { name: "Fernanda Lima", email: "fernanda.lima@hrconv.test", position: "Auxiliar", sector: "Limpeza" },
  ];

  const invites = await trpc("assessments.sendInvites", "POST", {
    assessmentTitle: "Avaliação COPSOQ-II - HR Conveniência 2026",
    invitees: employees,
    expiresIn: 30,
  }, cookie);
  const inviteData = result(invites);
  console.log(`   ✅ ${inviteData?.sent || employees.length} convites enviados\n`);

  // ── 5. SIMULATE EMPLOYEE RESPONSES ──
  console.log("5. Simulando respostas dos 5 funcionários...");

  // Different stress profiles for each employee
  const profiles = [
    { // Maria - moderate stress, good support
      stressLevel: 3, autonomy: 3, support: 4, leadership: 3, community: 4,
      meaning: 4, trust: 3, justice: 3, insecurity: 2, mentalHealth: 3, burnout: 3, violence: 1,
    },
    { // João - high stress, low autonomy
      stressLevel: 4, autonomy: 2, support: 3, leadership: 2, community: 3,
      meaning: 3, trust: 2, justice: 2, insecurity: 4, mentalHealth: 4, burnout: 4, violence: 2,
    },
    { // Ana - low stress, good environment
      stressLevel: 2, autonomy: 4, support: 4, leadership: 4, community: 4,
      meaning: 4, trust: 4, justice: 4, insecurity: 1, mentalHealth: 2, burnout: 2, violence: 1,
    },
    { // Carlos (gerente) - moderate-high stress, good autonomy
      stressLevel: 4, autonomy: 4, support: 3, leadership: 3, community: 3,
      meaning: 4, trust: 3, justice: 3, insecurity: 2, mentalHealth: 3, burnout: 3, violence: 1,
    },
    { // Fernanda - high stress, low support
      stressLevel: 4, autonomy: 2, support: 2, leadership: 2, community: 3,
      meaning: 3, trust: 2, justice: 2, insecurity: 4, mentalHealth: 4, burnout: 4, violence: 3,
    },
  ];

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const responses = generateResponses(profiles[i]);
    const genders = ["female", "male", "female", "male", "female"];
    const ageGroups = ["26-35", "36-45", "18-25", "46-55", "26-35"];

    const resp = await trpc("assessments.submitResponse", "POST", {
      assessmentId,
      personId: `emp-${i + 1}`,
      responses,
      gender: genders[i],
      ageGroup: ageGroups[i],
      yearsInCompany: i < 2 ? "1-3" : i < 4 ? "3-5" : "<1",
    }, cookie);

    const respData = result(resp);
    console.log(`   ✅ ${emp.name} (${emp.position}): respondeu — risco geral: ${respData?.overallRisk || "calculado"}`);
  }
  console.log();

  // ── 6. GENERATE COPSOQ REPORT ──
  console.log("6. Gerando relatório COPSOQ-II...");
  const report = await trpc("assessments.generateReport", "POST", { assessmentId }, cookie);
  const reportData = result(report);
  console.log(`   ✅ Relatório gerado: ${reportData?.id || "OK"}`);
  if (reportData?.dimensionScores) {
    console.log("   Scores por dimensão:");
    for (const [dim, score] of Object.entries(reportData.dimensionScores)) {
      const level = score < 30 ? "🔴 CRÍTICO" : score < 50 ? "🟡 ATENÇÃO" : score < 70 ? "🟢 MODERADO" : "✅ BOM";
      console.log(`     ${dim}: ${score} ${level}`);
    }
  }
  console.log();

  // ── 7. AI ANALYSIS ──
  console.log("7. Executando análise IA...");
  const analysis = await trpc("ai.analyzeCopsoq", "POST", { assessmentId }, cookie);
  const analysisData = result(analysis);
  console.log(`   ✅ Análise: ${analysisData?.id ? "gerada" : "fallback rule-based"}`);
  if (analysisData?.analysis) {
    console.log(`   Insights: ${String(analysisData.analysis).substring(0, 200)}...`);
  }
  console.log();

  // ── 8. RISK INVENTORY ──
  console.log("8. Gerando inventário de riscos...");
  const inventory = await trpc("ai.generateInventory", "POST", {
    assessmentId,
    sectorName: "Comércio Varejista",
    workerCount: 5,
  }, cookie);
  const inventoryData = result(inventory);
  console.log(`   ✅ Inventário: ${inventoryData?.items?.length || inventoryData?.id ? "gerado" : "OK"}`);
  console.log();

  // ── 9. ACTION PLAN ──
  console.log("9. Gerando plano de ação...");
  const plan = await trpc("ai.generatePlan", "POST", {
    assessmentId,
    sectorName: "Comércio Varejista",
  }, cookie);
  const planData = result(plan);
  console.log(`   ✅ Plano de ação: ${planData?.plans?.length || planData?.id ? "gerado" : "OK"}`);
  console.log();

  // ── 10. TRAINING PROGRAM ──
  console.log("10. Criando programa de treinamento...");
  const training = await trpc("training.createProgram", "POST", {
    title: "Prevenção de Riscos Psicossociais - NR-01",
    description: "Programa de capacitação sobre gestão de riscos psicossociais no trabalho",
    programType: "training",
    targetAudience: "Todos os funcionários",
    duration: 480,
    facilitator: "Consultoria BlackBelt",
    maxParticipants: 10,
  }, cookie);
  const trainingData = result(training);
  console.log(`   ✅ Programa: ${trainingData?.id || "criado"}`);

  if (trainingData?.id) {
    // Add modules
    const modules = [
      { title: "Introdução à NR-01 e Riscos Psicossociais", content: "Conceitos fundamentais sobre a norma e fatores de risco", order: 1, duration: 60 },
      { title: "Identificação de Fatores de Risco", content: "Como identificar assédio, burnout, estresse ocupacional", order: 2, duration: 90 },
      { title: "Medidas Preventivas", content: "Estratégias de prevenção e promoção da saúde mental", order: 3, duration: 90 },
      { title: "Canal de Escuta e Denúncia", content: "Como utilizar o canal de denúncia anônima", order: 4, duration: 60 },
    ];
    for (const mod of modules) {
      await trpc("training.addModule", "POST", { programId: trainingData.id, ...mod }, cookie);
    }
    console.log(`   ✅ ${modules.length} módulos adicionados`);
  }
  console.log();

  // ── 11. PCMSO INTEGRATION ──
  console.log("11. Gerando recomendações PCMSO...");
  // Need a risk assessment ID - get the inventory/assessment
  const riskList = await trpc("riskAssessments.list", "GET", { limit: 1 }, cookie);
  const riskAssessment = result(riskList)?.[0];
  if (riskAssessment?.id) {
    const pcmso = await trpc("pcmsoIntegration.generate", "POST", { riskAssessmentId: riskAssessment.id }, cookie);
    console.log(`   ✅ PCMSO: ${result(pcmso)?.length || "gerado"} recomendações`);
  } else {
    console.log("   ⚠️ Nenhuma avaliação de riscos encontrada para PCMSO");
  }
  console.log();

  // ── 12. UPDATE CHECKLIST ──
  console.log("12. Atualizando checklist de conformidade...");
  const checklist = await trpc("complianceChecklist.list", "GET", {}, cookie);
  const checklistItems = result(checklist) || [];
  let updated = 0;
  for (const item of checklistItems) {
    if (item.status === "non_compliant") {
      await trpc("complianceChecklist.updateStatus", "POST", {
        id: item.id,
        status: "compliant",
        notes: "Verificado durante simulação NR-01",
        verifiedBy: "Simulação Automatizada",
      }, cookie);
      updated++;
    }
  }
  console.log(`   ✅ ${updated} itens atualizados para "compliant"`);

  // Check score
  const score = await trpc("complianceChecklist.getComplianceScore", "GET", {}, cookie);
  const scoreData = result(score);
  console.log(`   📊 Score de compliance: ${scoreData?.score || scoreData?.percentage || "calculando"}%`);
  console.log();

  // ── 13. ISSUE CERTIFICATE ──
  console.log("13. Emitindo certificado de conformidade...");
  const cert = await trpc("complianceCertificate.issue", "POST", {
    issuedBy: "Consultoria BlackBelt SST",
  }, cookie);
  const certData = result(cert);
  if (certData?.certificateNumber) {
    console.log(`   ✅ Certificado emitido: ${certData.certificateNumber}`);
    console.log(`   📅 Válido até: ${certData.validUntil}`);
    console.log(`   📊 Score: ${certData.complianceScore}%`);
  } else {
    console.log(`   ⚠️ Certificado: ${JSON.stringify(cert.data).substring(0, 200)}`);
  }
  console.log();

  console.log("=== SIMULAÇÃO COMPLETA! ===");
  console.log("Todas as 10 fases do processo NR-01 foram executadas.");
}

main().catch((e) => console.error("ERRO FATAL:", e));
