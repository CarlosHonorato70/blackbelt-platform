/**
 * Generate SamurAI Flowchart — PDF + PPTX
 * Run: node scripts/generate-samurai-flowchart.js
 */

const PptxGenJS = require("pptxgenjs");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = path.join(__dirname, "..", "docs");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Email interaction color ─────────────────────────────────────────────
const EMAIL_COLOR = "0277BD";     // blue accent for email boxes
const EMAIL_BG    = "E1F5FE";     // light blue background

// ── Phase Data ──────────────────────────────────────────────────────────
const phases = [
  {
    num: 1,
    name: "ONBOARDING",
    title: "Cadastro da Empresa",
    color: "4A90D9",
    steps: [
      "Consultor informa CNPJ no chat do SamurAI",
      "SamurAI consulta Receita Federal (API CNPJ)",
      "Extrai: Razao Social, setor, porte, endereco",
      "Consultor confirma dados e numero de colaboradores",
      "Sistema cria registro da empresa no tenant",
    ],
    emails: [],
    output: "Empresa cadastrada com perfil completo",
    trigger: "CNPJ validado + headcount informado",
  },
  {
    num: 2,
    name: "DIAGNOSTICO",
    title: "Diagnostico e Pre-Proposta",
    color: "7B68EE",
    steps: [
      "Analisa perfil da empresa (setor, porte, risco)",
      "Gera checklist de 25 itens NR-01 + 11 milestones",
      "Calcula precificacao por porte e complexidade",
      "Gera pre-proposta comercial automaticamente",
      "Envia pre-proposta para aprovacao da empresa",
    ],
    emails: [
      { from: "Consultoria", to: "Empresa", desc: "Pre-proposta comercial com servicos, valores e botoes Aprovar / Rejeitar" },
    ],
    output: "Pre-proposta enviada a empresa",
    trigger: "Empresa criada com setor e porte",
  },
  {
    num: 3,
    name: "CONTRATACAO",
    title: "Aprovacao e Acesso",
    color: "20B2AA",
    steps: [
      "Empresa clica 'Aprovar' no email da proposta",
      "Sistema gera login e senha temporarios",
      "Envia email de boas-vindas com credenciais",
      "Envia instrucoes de pagamento (3 parcelas)",
      "Empresa acessa plataforma e cadastra setores e colaboradores",
    ],
    emails: [
      { from: "Empresa", to: "Plataforma", desc: "Clique no botao 'Aprovar Proposta' (link no email)" },
      { from: "Plataforma", to: "Empresa", desc: "Email de boas-vindas com login, senha e passo-a-passo" },
      { from: "Plataforma", to: "Empresa", desc: "Instrucoes de pagamento: PIX/boleto, 3 parcelas (40%+30%+30%)" },
    ],
    output: "Empresa com acesso + pagamento iniciado",
    trigger: "Empresa aprova a pre-proposta",
  },
  {
    num: 4,
    name: "AVALIACAO",
    title: "Aplicacao COPSOQ-II",
    color: "FF8C00",
    steps: [
      "Empresa cadastra colaboradores (manual ou CSV)",
      "Cria avaliacao COPSOQ-II (76 questoes, 12 dimensoes)",
      "Envia convites por email a todos os colaboradores",
      "Lembretes automaticos: 2, 5 e 9 dias apos envio",
      "Meta: 70% de respostas para prosseguir",
    ],
    emails: [
      { from: "Plataforma", to: "Colaboradores", desc: "Convite COPSOQ-II: link anonimo, 15-20 min, confidencial" },
      { from: "Plataforma", to: "Colaboradores", desc: "Lembrete 1 (2 dias), Lembrete 2 (5 dias), Lembrete 3 (9 dias)" },
      { from: "Plataforma", to: "Colaboradores", desc: "Confirmacao de resposta recebida (apos completar)" },
      { from: "Plataforma", to: "Consultoria", desc: "Alerta: cota de convites atingindo 80% do plano" },
    ],
    output: "Respostas COPSOQ-II coletadas (>= 70%)",
    trigger: "Empresa cadastrou colaboradores",
  },
  {
    num: 5,
    name: "ANALISE",
    title: "Analise por IA",
    color: "DC143C",
    steps: [
      "IA (Gemini 2.5 Flash) processa todas as respostas",
      "Calcula scores das 12 dimensoes psicossociais",
      "Identifica dimensoes criticas (score < 30)",
      "Gera relatorio com recomendacoes priorizadas",
      "Fallback: analise baseada em regras se IA indisponivel",
    ],
    emails: [],
    output: "Relatorio COPSOQ-II com analise dimensional",
    trigger: ">= 70% de respostas recebidas",
  },
  {
    num: 6,
    name: "INVENTARIO",
    title: "Inventario de Riscos",
    color: "8B0000",
    steps: [
      "Gera inventario conforme NR-01 par.1.5.7",
      "Classifica perigos nos 13 tipos MTE",
      "Define severidade (1-5) e probabilidade (1-5)",
      "Calcula nivel de risco (matriz 5x5 GRO)",
      "Registra controles existentes e recomendados",
    ],
    emails: [],
    output: "Inventario de riscos com classificacao GRO",
    trigger: "Analise COPSOQ concluida",
  },
  {
    num: 7,
    name: "PLANO DE ACAO",
    title: "Medidas Preventivas",
    color: "228B22",
    steps: [
      "Cria acoes para cada risco identificado",
      "Aplica hierarquia de controles (5 niveis):",
      "  Eliminacao > Substituicao > Engenharia",
      "  > Administrativo > EPI",
      "Define responsavel, prazo, KPI e prioridade",
    ],
    emails: [],
    output: "Plano de acao + Documento GRO",
    trigger: "Inventario de riscos completo",
  },
  {
    num: 8,
    name: "TREINAMENTO",
    title: "Capacitacao",
    color: "9370DB",
    steps: [
      "Cria programas de treinamento por risco",
      "Modulos: Lideranca, CIPA, Assedio, Saude Mental",
      "Define carga horaria e publico-alvo",
      "Gera material didatico e cronograma",
      "Registra participacao e avaliacao",
    ],
    emails: [],
    output: "Programas de treinamento criados",
    trigger: "Plano de acao completo",
  },
  {
    num: 9,
    name: "DOCUMENTACAO",
    title: "Proposta Final e Documentos",
    color: "4169E1",
    steps: [
      "Gera PGR, PCMSO, Laudo Tecnico, eSocial",
      "Gera proposta final detalhada com todos os entregaveis",
      "Envia proposta final para aprovacao da empresa",
      "Empresa aprova e libera acesso aos PDFs",
      "Todos os PDFs assinados digitalmente (ICP-Brasil)",
    ],
    emails: [
      { from: "Consultoria", to: "Empresa", desc: "Proposta final com documentos NR-01 e botoes Aprovar / Rejeitar" },
      { from: "Empresa", to: "Plataforma", desc: "Clique no botao 'Aprovar' (libera download dos PDFs)" },
      { from: "Consultoria", to: "Colaboradores", desc: "Devolutiva: resumo dos resultados da avaliacao psicossocial" },
    ],
    output: "20+ documentos PDF assinados e entregues",
    trigger: "Treinamentos e milestones concluidos",
  },
  {
    num: 10,
    name: "CERTIFICACAO",
    title: "Certificado NR-01",
    color: "DAA520",
    steps: [
      "Verifica score de conformidade no checklist",
      "Exige minimo de 80% de conformidade",
      "Valida que todas as fases anteriores estao 100%",
      "Emite certificado digital de conformidade",
      "Certificado assinado com ICP-Brasil A1",
    ],
    emails: [
      { from: "Plataforma", to: "Empresa", desc: "Certificado de Conformidade NR-01 emitido (PDF assinado)" },
    ],
    output: "Certificado de Conformidade NR-01 emitido",
    trigger: "Score >= 80% + todas as fases completas",
  },
];

// ══════════════════════════════════════════════════════════════════════════
// PPTX GENERATION
// ══════════════════════════════════════════════════════════════════════════

function generatePPTX() {
  const pptx = new PptxGenJS();
  pptx.author = "Black Belt Platform";
  pptx.title = "SamurAI — Fluxograma NR-01";
  pptx.subject = "Fluxo completo das 10 fases do agente SamurAI";
  pptx.layout = "LAYOUT_16x9";

  // ── Slide 1: Title ──
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "1A1A2E" };

  titleSlide.addText("SamurAI", {
    x: 0.5, y: 1.0, w: 9, h: 1.2,
    fontSize: 48, fontFace: "Arial", color: "C8A55A", bold: true, align: "center",
  });
  titleSlide.addText("Fluxograma Completo — 10 Fases NR-01", {
    x: 0.5, y: 2.2, w: 9, h: 0.6,
    fontSize: 22, fontFace: "Arial", color: "CCCCCC", align: "center",
  });
  titleSlide.addText("Portaria MTE n. 1.419/2024 — Riscos Psicossociais Ocupacionais", {
    x: 0.5, y: 3.0, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Arial", color: "888888", align: "center",
  });
  titleSlide.addText("Black Belt Platform v2.0", {
    x: 0.5, y: 4.5, w: 9, h: 0.4,
    fontSize: 12, fontFace: "Arial", color: "666666", align: "center",
  });

  // ── Slide 2: Overview ──
  const overviewSlide = pptx.addSlide();
  overviewSlide.background = { color: "FAFAFA" };
  overviewSlide.addText("Visao Geral das 10 Fases", {
    x: 0.3, y: 0.2, w: 9.4, h: 0.6,
    fontSize: 24, fontFace: "Arial", color: "1A1A2E", bold: true,
  });

  // Draw phase boxes in 2 rows of 5
  phases.forEach((phase, i) => {
    const row = Math.floor(i / 5);
    const col = i % 5;
    const x = 0.2 + col * 1.92;
    const y = 1.2 + row * 2.3;

    // Phase number circle
    overviewSlide.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.65, y: y - 0.15, w: 0.5, h: 0.5,
      fill: { color: phase.color },
    });
    overviewSlide.addText(String(phase.num), {
      x: x + 0.65, y: y - 0.15, w: 0.5, h: 0.5,
      fontSize: 16, fontFace: "Arial", color: "FFFFFF", bold: true, align: "center", valign: "middle",
    });

    // Phase box
    overviewSlide.addShape(pptx.ShapeType.roundRect, {
      x, y: y + 0.4, w: 1.8, h: 1.5,
      fill: { color: "FFFFFF" },
      line: { color: phase.color, width: 2 },
      rectRadius: 0.1,
      shadow: { type: "outer", blur: 3, offset: 2, color: "CCCCCC" },
    });

    overviewSlide.addText(phase.name, {
      x, y: y + 0.45, w: 1.8, h: 0.35,
      fontSize: 9, fontFace: "Arial", color: phase.color, bold: true, align: "center",
    });
    overviewSlide.addText(phase.title, {
      x, y: y + 0.75, w: 1.8, h: 0.3,
      fontSize: 8, fontFace: "Arial", color: "333333", align: "center",
    });
    overviewSlide.addText(phase.output, {
      x: x + 0.05, y: y + 1.05, w: 1.7, h: phase.emails.length > 0 ? 0.45 : 0.7,
      fontSize: 7, fontFace: "Arial", color: "666666", align: "center", valign: "top",
    });

    // Email indicator badge
    if (phase.emails.length > 0) {
      overviewSlide.addShape(pptx.ShapeType.roundRect, {
        x: x + 0.2, y: y + 1.52, w: 1.4, h: 0.25,
        fill: { color: EMAIL_BG },
        line: { color: EMAIL_COLOR, width: 1 },
        rectRadius: 0.05,
      });
      overviewSlide.addText(`\u2709 ${phase.emails.length} email(s)`, {
        x: x + 0.2, y: y + 1.52, w: 1.4, h: 0.25,
        fontSize: 7, fontFace: "Arial", color: EMAIL_COLOR, bold: true, align: "center", valign: "middle",
      });
    }

    // Arrow to next (except last in row and last phase)
    if (col < 4 && i < 9) {
      overviewSlide.addText("\u2192", {
        x: x + 1.75, y: y + 0.85, w: 0.25, h: 0.3,
        fontSize: 18, fontFace: "Arial", color: phase.color, align: "center",
      });
    }
  });

  // Arrow between rows
  overviewSlide.addText("\u2193", {
    x: 4.6, y: 3.35, w: 0.5, h: 0.3,
    fontSize: 20, fontFace: "Arial", color: "999999", align: "center",
  });

  // ── Slides 3-12: Individual Phase Details ──
  phases.forEach((phase) => {
    const slide = pptx.addSlide();
    slide.background = { color: "FAFAFA" };
    const hasEmails = phase.emails && phase.emails.length > 0;

    // Header bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 0.9,
      fill: { color: phase.color },
    });
    slide.addText(`Fase ${phase.num} — ${phase.name}`, {
      x: 0.3, y: 0.05, w: 6, h: 0.45,
      fontSize: 22, fontFace: "Arial", color: "FFFFFF", bold: true,
    });
    slide.addText(phase.title, {
      x: 0.3, y: 0.45, w: 6, h: 0.35,
      fontSize: 14, fontFace: "Arial", color: "DDDDDD",
    });

    // Phase number (large, right side)
    slide.addText(String(phase.num), {
      x: 8.5, y: 0.05, w: 1.2, h: 0.8,
      fontSize: 48, fontFace: "Arial", color: "FFFFFF", bold: true, align: "center",
      transparency: 70,
    });

    // Steps (flowchart boxes) — adjust spacing if emails exist
    const stepSpacing = hasEmails ? 0.62 : 0.72;
    const startY = 1.2;
    phase.steps.forEach((step, si) => {
      const y = startY + si * stepSpacing;
      const isSubStep = step.startsWith("  ");
      const xOff = isSubStep ? 0.8 : 0.4;
      const boxW = isSubStep ? 5.0 : 5.4;

      // Connector line
      if (si > 0 && !isSubStep) {
        slide.addShape(pptx.ShapeType.line, {
          x: 3.1, y: y - 0.08, w: 0, h: 0.08,
          line: { color: phase.color, width: 2 },
        });
      }

      // Step box
      slide.addShape(pptx.ShapeType.roundRect, {
        x: xOff, y, w: boxW, h: 0.45,
        fill: { color: isSubStep ? "F5F5F5" : "FFFFFF" },
        line: { color: isSubStep ? "CCCCCC" : phase.color, width: isSubStep ? 1 : 1.5 },
        rectRadius: 0.05,
      });

      // Step number
      if (!isSubStep) {
        slide.addShape(pptx.ShapeType.ellipse, {
          x: xOff + 0.06, y: y + 0.06, w: 0.33, h: 0.33,
          fill: { color: phase.color },
        });
        slide.addText(String(si + 1), {
          x: xOff + 0.06, y: y + 0.06, w: 0.33, h: 0.33,
          fontSize: 10, fontFace: "Arial", color: "FFFFFF", bold: true, align: "center", valign: "middle",
        });
      }

      slide.addText(step.trim(), {
        x: isSubStep ? xOff + 0.15 : xOff + 0.5, y, w: isSubStep ? boxW - 0.3 : boxW - 0.65, h: 0.45,
        fontSize: isSubStep ? 9 : 10, fontFace: "Arial", color: "333333", valign: "middle",
      });
    });

    // Right side: Output box
    const rightX = 6.2;
    const rightW = 3.5;

    slide.addShape(pptx.ShapeType.roundRect, {
      x: rightX, y: 1.2, w: rightW, h: 1.1,
      fill: { color: "E8F5E9" },
      line: { color: "4CAF50", width: 1.5 },
      rectRadius: 0.1,
    });
    slide.addText("SAIDA", {
      x: rightX + 0.15, y: 1.22, w: 3.2, h: 0.25,
      fontSize: 9, fontFace: "Arial", color: "2E7D32", bold: true,
    });
    slide.addText(phase.output, {
      x: rightX + 0.15, y: 1.48, w: 3.2, h: 0.7,
      fontSize: 11, fontFace: "Arial", color: "333333", valign: "top",
    });

    // Right side: Trigger box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: rightX, y: 2.5, w: rightW, h: 0.95,
      fill: { color: "FFF3E0" },
      line: { color: "FF9800", width: 1.5 },
      rectRadius: 0.1,
    });
    slide.addText("GATILHO DE TRANSICAO", {
      x: rightX + 0.15, y: 2.52, w: 3.2, h: 0.25,
      fontSize: 9, fontFace: "Arial", color: "E65100", bold: true,
    });
    slide.addText(phase.trigger, {
      x: rightX + 0.15, y: 2.78, w: 3.2, h: 0.55,
      fontSize: 10, fontFace: "Arial", color: "333333", valign: "top",
    });

    // ── EMAIL INTERACTIONS (right side, below trigger) ──
    if (hasEmails) {
      const emailStartY = 3.65;
      // Email section header
      slide.addShape(pptx.ShapeType.roundRect, {
        x: rightX, y: emailStartY, w: rightW, h: 0.3 + phase.emails.length * 0.38,
        fill: { color: EMAIL_BG },
        line: { color: EMAIL_COLOR, width: 1.5 },
        rectRadius: 0.1,
      });
      slide.addText("\u2709  COMUNICACOES POR EMAIL", {
        x: rightX + 0.1, y: emailStartY + 0.02, w: 3.3, h: 0.25,
        fontSize: 9, fontFace: "Arial", color: EMAIL_COLOR, bold: true,
      });

      phase.emails.forEach((email, ei) => {
        const ey = emailStartY + 0.3 + ei * 0.38;
        // From → To badge
        slide.addShape(pptx.ShapeType.roundRect, {
          x: rightX + 0.1, y: ey, w: 1.6, h: 0.18,
          fill: { color: EMAIL_COLOR },
          rectRadius: 0.04,
        });
        slide.addText(`${email.from}  \u2192  ${email.to}`, {
          x: rightX + 0.1, y: ey, w: 1.6, h: 0.18,
          fontSize: 7, fontFace: "Arial", color: "FFFFFF", bold: true, align: "center", valign: "middle",
        });
        // Description
        slide.addText(email.desc, {
          x: rightX + 0.1, y: ey + 0.18, w: 3.3, h: 0.18,
          fontSize: 8, fontFace: "Arial", color: "333333", valign: "middle",
        });
      });
    }

    // Navigation hint
    const navY = hasEmails ? 5.1 : 4.5;
    if (phase.num < 10) {
      slide.addText(`\u27A1 Proxima fase: ${phases[phase.num].name}`, {
        x: rightX, y: navY, w: rightW, h: 0.3,
        fontSize: 10, fontFace: "Arial", color: "999999", align: "center",
      });
    } else {
      slide.addText("\u2705 Processo NR-01 concluido!", {
        x: rightX, y: navY, w: rightW, h: 0.3,
        fontSize: 12, fontFace: "Arial", color: "2E7D32", bold: true, align: "center",
      });
    }
  });

  // ── Slide 13: Summary ──
  const summarySlide = pptx.addSlide();
  summarySlide.background = { color: "1A1A2E" };
  summarySlide.addText("Resumo do Fluxo SamurAI", {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 26, fontFace: "Arial", color: "C8A55A", bold: true, align: "center",
  });

  const summaryData = [
    ["Fases", "10 fases sequenciais com auto-transicao"],
    ["Instrumento", "COPSOQ-II (76 questoes, 12 dimensoes)"],
    ["Classificacao", "13 tipos de perigo MTE + Matriz GRO 5x5"],
    ["Controles", "Hierarquia de 5 niveis (Eliminacao a EPI)"],
    ["Documentos", "20+ PDFs com assinatura digital ICP-Brasil"],
    ["IA", "Gemini 2.5 Flash + fallback deterministico"],
    ["Integracao", "eSocial (S-2210/S-2220/S-2240), PGR, PCMSO"],
    ["Certificacao", "Certificado NR-01 com score >= 80%"],
    ["Prazo legal", "26/05/2026 (Portaria MTE n. 1.419/2024)"],
  ];

  summaryData.forEach((row, i) => {
    const y = 1.2 + i * 0.45;
    summarySlide.addText(row[0], {
      x: 1.0, y, w: 2.5, h: 0.4,
      fontSize: 13, fontFace: "Arial", color: "C8A55A", bold: true, align: "right", valign: "middle",
    });
    summarySlide.addText(row[1], {
      x: 3.8, y, w: 5.5, h: 0.4,
      fontSize: 13, fontFace: "Arial", color: "DDDDDD", valign: "middle",
    });
  });

  summarySlide.addText("Black Belt Platform v2.0 — blackbeltconsultoria.com", {
    x: 0.5, y: 5.0, w: 9, h: 0.3,
    fontSize: 10, fontFace: "Arial", color: "666666", align: "center",
  });

  const pptxPath = path.join(OUTPUT_DIR, "SamurAI_Fluxograma_NR01.pptx");
  return pptx.writeFile({ fileName: pptxPath }).then(() => {
    console.log("PPTX saved:", pptxPath);
    return pptxPath;
  });
}

// ══════════════════════════════════════════════════════════════════════════
// PDF GENERATION
// ══════════════════════════════════════════════════════════════════════════

function generatePDF() {
  return new Promise((resolve, reject) => {
    const pdfPath = path.join(OUTPUT_DIR, "SamurAI_Fluxograma_NR01.pdf");
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 40, bottom: 40, left: 40, right: 40 },
      bufferPages: true,
      info: {
        Title: "SamurAI — Fluxograma NR-01",
        Author: "Black Belt Platform",
        Subject: "Fluxo completo das 10 fases do agente SamurAI",
        Creator: "Black Belt Platform PDF Generator",
      },
    });

    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    const pageW = 842 - 80; // A4 landscape minus margins
    const pageH = 595 - 80;
    const gold = "#C8A55A";
    const dark = "#1A1A2E";

    // ── Page 1: Title ──
    doc.rect(0, 0, 842, 595).fill(dark);
    doc.fontSize(48).fillColor(gold).text("SamurAI", 40, 150, { width: pageW, align: "center" });
    doc.fontSize(22).fillColor("#CCCCCC").text("Fluxograma Completo — 10 Fases NR-01", 40, 210, { width: pageW, align: "center" });
    doc.fontSize(14).fillColor("#888888").text("Portaria MTE n\u00BA 1.419/2024 — Riscos Psicossociais Ocupacionais", 40, 250, { width: pageW, align: "center" });
    doc.fontSize(12).fillColor("#666666").text("Black Belt Platform v2.0 — blackbeltconsultoria.com", 40, 420, { width: pageW, align: "center" });

    // ── Page 2: Overview ──
    doc.addPage();
    doc.fontSize(22).fillColor(dark).text("Vis\u00E3o Geral das 10 Fases", 40, 40, { width: pageW });
    doc.moveDown(0.5);

    // Draw 2 rows of 5 phase boxes
    phases.forEach((phase, i) => {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const bx = 40 + col * 152;
      const by = 90 + row * 210;
      const bw = 140;
      const bh = 180;

      // Phase number circle
      doc.circle(bx + bw / 2, by + 15, 14).fill(`#${phase.color}`);
      doc.fontSize(14).fillColor("#FFFFFF").text(String(phase.num), bx + bw / 2 - 14, by + 7, { width: 28, align: "center" });

      // Box
      doc.roundedRect(bx, by + 35, bw, bh - 35, 6).lineWidth(2).stroke(`#${phase.color}`);

      // Name
      doc.fontSize(8).fillColor(`#${phase.color}`).text(phase.name, bx + 5, by + 42, { width: bw - 10, align: "center" });

      // Title
      doc.fontSize(8).fillColor("#333333").text(phase.title, bx + 5, by + 56, { width: bw - 10, align: "center" });

      // Output
      doc.fontSize(7).fillColor("#666666").text(phase.output, bx + 5, by + 75, { width: bw - 10, align: "center" });

      // Email indicator badge
      if (phase.emails && phase.emails.length > 0) {
        doc.roundedRect(bx + 20, by + 120, bw - 40, 18, 3).lineWidth(1).stroke(`#${EMAIL_COLOR}`);
        doc.rect(bx + 21, by + 121, bw - 42, 16).fill(`#${EMAIL_BG}`);
        doc.fontSize(7).fillColor(`#${EMAIL_COLOR}`).text(`\u2709 ${phase.emails.length} email(s)`, bx + 5, by + 124, { width: bw - 10, align: "center" });
      }

      // Arrow
      if (col < 4 && i < 9) {
        doc.fontSize(16).fillColor(`#${phase.color}`).text("\u2192", bx + bw - 2, by + 85, { width: 20 });
      }
    });

    // Down arrow between rows
    doc.fontSize(18).fillColor("#999999").text("\u2193", 40 + 2.5 * 152 - 10, 265, { width: 30, align: "center" });

    // ── Pages 3-12: Individual phases ──
    phases.forEach((phase) => {
      doc.addPage();
      const hasEmails = phase.emails && phase.emails.length > 0;

      // Header bar
      doc.rect(0, 0, 842, 60).fill(`#${phase.color}`);
      doc.fontSize(22).fillColor("#FFFFFF").text(`Fase ${phase.num} — ${phase.name}`, 50, 10, { width: 500 });
      doc.fontSize(13).fillColor("#DDDDDD").text(phase.title, 50, 36, { width: 500 });
      doc.save();
      doc.opacity(0.3);
      doc.fontSize(40).fillColor("#FFFFFF").text(String(phase.num), 720, 5, { width: 80, align: "center" });
      doc.restore();

      // Steps
      const stepH = hasEmails ? 30 : 35;
      const stepGap = hasEmails ? 36 : 42;
      let sy = 80;
      phase.steps.forEach((step, si) => {
        const isSubStep = step.startsWith("  ");
        const sx = isSubStep ? 80 : 50;
        const sw = isSubStep ? 380 : 420;

        if (!isSubStep && si > 0) {
          doc.moveTo(260, sy - 4).lineTo(260, sy + 2).lineWidth(2).stroke(`#${phase.color}`);
          sy += 4;
        }

        doc.roundedRect(sx, sy, sw, stepH, 4)
          .lineWidth(isSubStep ? 0.5 : 1.5)
          .stroke(isSubStep ? "#CCCCCC" : `#${phase.color}`);

        if (!isSubStep) {
          doc.circle(sx + 16, sy + stepH / 2, 10).fill(`#${phase.color}`);
          doc.fontSize(9).fillColor("#FFFFFF").text(String(si + 1), sx + 6, sy + stepH / 2 - 5, { width: 20, align: "center" });
        }

        doc.fontSize(9).fillColor("#333333").text(step.trim(), isSubStep ? sx + 10 : sx + 34, sy + (stepH / 2 - 5), { width: isSubStep ? sw - 20 : sw - 44 });
        sy += stepGap;
      });

      // Right side
      const rx = 510;
      const rw = 280;

      // Output box
      doc.roundedRect(rx, 80, rw, 80, 6).lineWidth(1.5).stroke("#4CAF50");
      doc.rect(rx + 1, 81, rw - 2, 20).fill("#E8F5E9");
      doc.fontSize(8).fillColor("#2E7D32").text("SA\u00CDDA", rx + 10, 84, { width: 260 });
      doc.fontSize(10).fillColor("#333333").text(phase.output, rx + 10, 108, { width: 260 });

      // Trigger box
      doc.roundedRect(rx, 175, rw, 75, 6).lineWidth(1.5).stroke("#FF9800");
      doc.rect(rx + 1, 176, rw - 2, 20).fill("#FFF3E0");
      doc.fontSize(8).fillColor("#E65100").text("GATILHO DE TRANSI\u00C7\u00C3O", rx + 10, 179, { width: 260 });
      doc.fontSize(10).fillColor("#333333").text(phase.trigger, rx + 10, 203, { width: 260 });

      // ── EMAIL INTERACTIONS ──
      if (hasEmails) {
        const emailY = 270;
        const emailH = 22 + phase.emails.length * 32;

        // Email container
        doc.roundedRect(rx, emailY, rw, emailH, 6).lineWidth(1.5).stroke(`#${EMAIL_COLOR}`);
        doc.rect(rx + 1, emailY + 1, rw - 2, 18).fill(`#${EMAIL_BG}`);
        doc.fontSize(8).fillColor(`#${EMAIL_COLOR}`).text("\u2709  COMUNICA\u00C7\u00D5ES POR EMAIL", rx + 10, emailY + 4, { width: 260 });

        phase.emails.forEach((email, ei) => {
          const ey = emailY + 22 + ei * 32;

          // From → To pill
          doc.roundedRect(rx + 8, ey, 110, 13, 3).fill(`#${EMAIL_COLOR}`);
          doc.fontSize(7).fillColor("#FFFFFF").text(`${email.from}  \u2192  ${email.to}`, rx + 10, ey + 2, { width: 106, align: "center" });

          // Description
          doc.fontSize(8).fillColor("#333333").text(email.desc, rx + 10, ey + 16, { width: 260 });
        });
      }

      // Next phase
      const navY = hasEmails ? 270 + 22 + phase.emails.length * 32 + 15 : 275;
      if (phase.num < 10) {
        doc.fontSize(9).fillColor("#999999").text(`\u27A1 Pr\u00F3xima fase: ${phases[phase.num].name}`, rx, navY, { width: rw, align: "center" });
      } else {
        doc.fontSize(11).fillColor("#2E7D32").text("\u2705 Processo NR-01 conclu\u00EDdo!", rx, navY, { width: rw, align: "center" });
      }
    });

    // ── Last page: Summary ──
    doc.addPage();
    doc.rect(0, 0, 842, 595).fill(dark);
    doc.fontSize(26).fillColor(gold).text("Resumo do Fluxo SamurAI", 40, 40, { width: pageW, align: "center" });

    const summaryData = [
      ["Fases", "10 fases sequenciais com auto-transi\u00E7\u00E3o"],
      ["Instrumento", "COPSOQ-II (76 quest\u00F5es, 12 dimens\u00F5es)"],
      ["Classifica\u00E7\u00E3o", "13 tipos de perigo MTE + Matriz GRO 5x5"],
      ["Controles", "Hierarquia de 5 n\u00EDveis (Elimina\u00E7\u00E3o a EPI)"],
      ["Documentos", "20+ PDFs com assinatura digital ICP-Brasil"],
      ["IA", "Gemini 2.5 Flash + fallback determin\u00EDstico"],
      ["Integra\u00E7\u00E3o", "eSocial (S-2210/S-2220/S-2240), PGR, PCMSO"],
      ["Certifica\u00E7\u00E3o", "Certificado NR-01 com score \u2265 80%"],
      ["Prazo legal", "26/05/2026 (Portaria MTE n\u00BA 1.419/2024)"],
    ];

    summaryData.forEach((row, i) => {
      const y = 100 + i * 38;
      doc.fontSize(13).fillColor(gold).text(row[0], 100, y, { width: 180, align: "right" });
      doc.fontSize(13).fillColor("#DDDDDD").text(row[1], 300, y, { width: 450 });
    });

    doc.fontSize(10).fillColor("#666666").text("Black Belt Platform v2.0 — blackbeltconsultoria.com", 40, 480, { width: pageW, align: "center" });

    // Page numbers
    const totalPages = doc.bufferedPageRange().count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor(i === 0 || i === totalPages - 1 ? "#555555" : "#999999")
        .text(`${i + 1} / ${totalPages}`, 750, 560, { width: 50, align: "right" });
    }

    doc.end();
    stream.on("finish", () => {
      console.log("PDF saved:", pdfPath);
      resolve(pdfPath);
    });
    stream.on("error", reject);
  });
}

// ── Run ──
async function main() {
  console.log("Generating SamurAI flowchart...");
  const [pdfPath, pptxPath] = await Promise.all([generatePDF(), generatePPTX()]);
  console.log("\nDone!");
  console.log("PDF:", pdfPath);
  console.log("PPTX:", pptxPath);
}

main().catch(console.error);
