import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { tenantProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { agentConversations, agentMessages, agentActions, agentAlerts } from "../../drizzle/schema_agent";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { getNR01Status, getCompanyStrategy } from "../_ai/agentOrchestrator";
import { scanTenantAlerts } from "../_ai/agentAlerts";
import { buildAgentSystemPrompt, buildContextMessage } from "../_ai/prompts/agent-system";
import { processCNPJForAgent, formatCNPJ, sectorLabel, isHighRiskSector } from "../_core/cnpjLookup";
import { tenants, proposals, proposalItems, proposalPayments, clients, people } from "../../drizzle/schema";
import { complianceChecklist, complianceMilestones } from "../../drizzle/schema_nr01";
import { executeCreateAssessment, executeGenerateInventoryAndPlan, executeCreateTraining, executeCompleteChecklist } from "../_ai/agentExecutor";
import { log } from "../_core/logger";
import * as dbOps from "../db";

// ============================================================================
// ACTION EXECUTOR: Actually creates company and sets up NR-01 process
// ============================================================================

async function executeCreateCompany(
  params: Record<string, any>,
  tenantId: string,
  userId: string
): Promise<{ success: boolean; companyId?: string; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "Database not available" };

  const cnpj = (params.cnpj || "").replace(/\D/g, "");
  if (cnpj.length !== 14) return { success: false, message: "CNPJ inválido" };

  const formattedCnpj = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

  // Check if already exists — if so, return success with existing ID
  const existing = await dbOps.getTenantByCNPJ(formattedCnpj);
  if (existing) {
    return {
      success: true, companyId: existing.id,
      message: `Empresa **${existing.name}** (${formattedCnpj}) já está cadastrada. Continuando com o processo NR-01.`,
    };
  }

  const companyId = nanoid();
  try {
    // Create company tenant
    await db.insert(tenants).values({
      id: companyId,
      name: params.name || "Empresa",
      cnpj: formattedCnpj,
      street: (params.street || "").substring(0, 255) || null,
      number: (params.number || "").substring(0, 20) || null,
      complement: (params.complement || "").substring(0, 100) || null,
      neighborhood: (params.neighborhood || "").substring(0, 100) || null,
      city: (params.city || "").substring(0, 100) || null,
      state: (params.state || "").substring(0, 2) || null,
      zipCode: (params.zipCode || "").replace(/\D/g, "").substring(0, 10) || null,
      contactEmail: (params.contactEmail || "").substring(0, 320) || null,
      contactPhone: (params.contactPhone || "").substring(0, 20) || null,
      status: "active",
      strategy: "shared_rls",
      tenantType: "company",
      parentTenantId: tenantId,
    });

    // Auto-seed NR-01 checklist (25 items)
    const nr01Requirements = [
      { code: "NR01-1.5.3.1", text: "Inventário de riscos com fatores psicossociais identificados", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.3.2", text: "Avaliação de riscos psicossociais com metodologia validada", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.3.3", text: "Classificação de riscos por severidade e probabilidade", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.4.1", text: "Plano de ação com medidas preventivas", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.4.2", text: "Hierarquia de controles aplicada", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.4.3", text: "Responsáveis e prazos definidos", category: "GRO - Gerenciamento de Riscos" },
      { code: "NR01-1.5.7.1", text: "PGR com seção de riscos psicossociais", category: "Documentação" },
      { code: "NR01-1.5.7.2", text: "Laudo técnico assinado", category: "Documentação" },
      { code: "NR01-1.5.7.3", text: "Registro de treinamentos", category: "Documentação" },
      { code: "NR07-7.5.1", text: "PCMSO integrado com riscos psicossociais", category: "PCMSO" },
      { code: "NR07-7.5.2", text: "Exames de saúde mental definidos", category: "PCMSO" },
      { code: "NR01-1.5.3.6", text: "COPSOQ-II aplicado", category: "Participação dos Trabalhadores" },
      { code: "NR01-1.5.3.7", text: "Feedback comunicado aos trabalhadores", category: "Participação dos Trabalhadores" },
      { code: "NR01-1.5.5.1", text: "Treinamento de lideranças", category: "Treinamento" },
      { code: "NR01-1.5.5.2", text: "Capacitação da CIPA", category: "Treinamento" },
      { code: "NR01-1.5.5.3", text: "Prevenção ao assédio", category: "Treinamento" },
      { code: "NR01-1.5.6.1", text: "Indicadores de saúde mental monitorados", category: "Monitoramento" },
      { code: "NR01-1.5.6.2", text: "Reavaliação periódica dos riscos", category: "Monitoramento" },
    ];

    for (const req of nr01Requirements) {
      await db.insert(complianceChecklist).values({
        id: nanoid(), tenantId: companyId, requirementCode: req.code,
        requirementText: req.text, category: req.category, status: "non_compliant",
        createdAt: new Date(), updatedAt: new Date(),
      });
    }

    // Auto-seed milestones
    const addDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d; };
    const milestones = [
      { title: "Capacitação da equipe SST", category: "training", targetDate: addDays(30), order: 1 },
      { title: "Definição de metodologia", category: "assessment", targetDate: addDays(45), order: 2 },
      { title: "Aplicação COPSOQ-II", category: "assessment", targetDate: addDays(75), order: 3 },
      { title: "Análise e relatório", category: "inventory", targetDate: addDays(90), order: 4 },
      { title: "Elaboração do PGR psicossocial", category: "documentation", targetDate: addDays(105), order: 5 },
      { title: "Plano de ação preventivo", category: "action_plan", targetDate: addDays(120), order: 6 },
      { title: "Implementação das ações", category: "action_plan", targetDate: addDays(180), order: 7 },
      { title: "Integração PGR+PCMSO", category: "documentation", targetDate: addDays(150), order: 8 },
      { title: "Treinamento de lideranças", category: "training", targetDate: addDays(135), order: 9 },
      { title: "Revisão e auditoria", category: "review", targetDate: addDays(210), order: 10 },
      { title: "Adequação completa NR-01", category: "review", targetDate: new Date("2026-05-26"), order: 11 },
    ];

    for (const m of milestones) {
      await db.insert(complianceMilestones).values({
        id: nanoid(), tenantId: companyId, title: m.title, category: m.category,
        targetDate: m.targetDate, status: "pending", order: m.order,
        createdAt: new Date(), updatedAt: new Date(),
      });
    }

    // Record action
    await db.insert(agentActions).values({
      id: nanoid(), tenantId, actionType: "create_company",
      status: "completed", input: params, output: { companyId, name: params.name },
      startedAt: new Date(), completedAt: new Date(),
    });

    return {
      success: true, companyId,
      message: `Empresa **${params.name}** cadastrada com sucesso! Checklist NR-01 (${nr01Requirements.length} itens) e cronograma (${milestones.length} milestones) configurados automaticamente.`,
    };
  } catch (error: any) {
    log.error("Agent create_company failed", { error: error.message, cnpj: formattedCnpj });
    // Never expose raw SQL errors to the user
    const userMessage = error.message?.includes("Duplicate entry")
      ? "Esta empresa já está cadastrada na plataforma."
      : "Erro ao cadastrar empresa. Tente novamente ou entre em contato com o suporte.";
    return { success: false, message: userMessage };
  }
}

// Parse action blocks from LLM response
function parseActions(content: string): Array<{ type: string; label: string; params: Record<string, any> }> {
  const actions: Array<{ type: string; label: string; params: Record<string, any> }> = [];
  const actionRegex = /```action\s*\n([\s\S]*?)\n```/g;
  let match;
  while ((match = actionRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      actions.push(parsed);
    } catch { /* skip invalid JSON */ }
  }
  return actions;
}

// Clean action blocks from display content
function cleanContent(content: string): string {
  return content.replace(/```action\s*\n[\s\S]*?\n```/g, "").trim();
}

// Build PDF download links for completed NR-01 process
function buildPdfDownloadLinks(companyId: string): string {
  const base = `/api/pdf`;
  return `\n\n---\n\n**Documentos Gerados \u2014 Download PDF:**\n` +
    `- [Proposta Comercial](${base}/proposta/${companyId})\n` +
    `- [Relatorio COPSOQ-II](${base}/copsoq/${companyId})\n` +
    `- [Inventario de Riscos Psicossociais](${base}/inventario/${companyId})\n` +
    `- [Plano de Acao](${base}/plano/${companyId})\n` +
    `- [Programa de Treinamento](${base}/treinamento/${companyId})\n` +
    `- [Checklist de Conformidade](${base}/checklist/${companyId})\n` +
    `- [Certificado de Conformidade NR-01](${base}/certificado/${companyId})\n`;
}

// Build response for completed NR-01 based on final proposal + payment status
async function buildCompletedResponse(company: any, consultantTenantId: string): Promise<{ content: string; actions: any[] }> {
  const db2 = await getDb();

  // Check if final proposal exists for this consultant
  const allFinalProps = await db2.select().from(proposals)
    .where(and(
      eq(proposals.tenantId, consultantTenantId),
      eq(proposals.proposalType, "final"),
    ))
    .orderBy(desc(proposals.createdAt))
    .limit(5);

  // Try to match by clientId → company CNPJ
  let fp = allFinalProps.find((p: any) => {
    if (!p.clientId) return false;
    return true; // For now, use first final proposal
  }) || allFinalProps[0] || null;

  if (!fp) {
    // No final proposal yet — offer to generate
    return {
      content: `✅ **Processo NR-01 da empresa ${company.name} está 100% concluído!**\n\n` +
        `**Próximo passo:** Gerar a **Proposta Comercial Final** com os valores dos serviços realizados e enviar para aprovação + pagamento.\n\n` +
        `Clique no botão abaixo para gerar.`,
      actions: [
        { type: "generate_final_proposal", label: "Gerar Proposta Final", params: { companyId: company.id } },
      ],
    };
  }

  if (["draft", "pending", "pending_approval", "sent"].includes(fp.status)) {
    const wasSent = !!fp.sentAt || fp.status === "sent";
    if (wasSent) {
      return {
        content: `✅ **NR-01 concluído.** Proposta final enviada para **${fp.contactEmail}**.\n\n⏳ **Aguardando aprovação da empresa.**\n\nQuando a empresa aprovar, as instruções de pagamento serão enviadas automaticamente.\n\nDiga **"continuar"** para verificar status.`,
        actions: [],
      };
    }
    return {
      content: `✅ **NR-01 concluído.** Proposta final gerada mas **ainda não enviada**.\n\nEnvie para a empresa para aprovação e pagamento.`,
      actions: [
        { type: "send_final_proposal_email", label: "Enviar Proposta Final por Email", params: { proposalId: fp.id, email: fp.contactEmail, companyId: company.id } },
        { type: "edit_proposal", label: "Editar Proposta Final", params: { proposalId: fp.id } },
      ],
    };
  }

  if (fp.status === "approved") {
    // Check payment
    const payments = await db2.select().from(proposalPayments)
      .where(eq(proposalPayments.proposalId, fp.id))
      .orderBy(proposalPayments.installment);

    const paidCount = payments.filter((p: any) => p.status === "paid").length;
    const totalInstallments = payments.length || 3;

    if (fp.paymentStatus === "paid" || paidCount === totalInstallments) {
      // Fully paid — show PDFs
      return {
        content: `✅ **Processo completo!** NR-01 finalizado, proposta aprovada e **pagamento confirmado**.\n\n` +
          `Todos os documentos estão liberados para download:` + buildPdfDownloadLinks(company.id) +
          `\n\nDeseja iniciar o processo para **outra empresa**? Envie o CNPJ.`,
        actions: [],
      };
    }

    // Partially paid or pending
    let paymentInfo = `\n\n💰 **Status do Pagamento:** ${paidCount} de ${totalInstallments} parcelas pagas\n`;
    for (const p of payments) {
      const statusIcon = (p as any).status === "paid" ? "✅" : "⏳";
      const pct = (p as any).percentage;
      const val = ((p as any).amount / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      paymentInfo += `${statusIcon} Parcela ${(p as any).installment} (${pct}%) — ${val}\n`;
    }

    return {
      content: `✅ **NR-01 concluído.** Proposta final **aprovada**.\n${paymentInfo}\n⚠️ **PDFs serão liberados após confirmação de todas as parcelas.**\n\nPara confirmar pagamentos, acesse **Propostas Comerciais** e clique em "Marcar Pagamento".`,
      actions: [],
    };
  }

  if (fp.status === "rejected") {
    return {
      content: `✅ **NR-01 concluído**, mas a proposta final foi **recusada** pela empresa.\n\nVocê pode gerar uma nova proposta com valores diferentes.`,
      actions: [
        { type: "generate_final_proposal", label: "Gerar Nova Proposta Final", params: { companyId: company.id } },
      ],
    };
  }

  // Fallback
  return {
    content: `✅ **Processo NR-01 da empresa ${company.name} está 100% concluído!**` + buildPdfDownloadLinks(company.id),
    actions: [],
  };
}

// Extract CNPJ from text
function extractCNPJ(text: string): string | null {
  const match = text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
  return match ? match[0] : null;
}

// Extract headcount from text
function extractHeadcount(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(?:funcionário|funcionario|empregado|colaborador|trabalhador)/i);
  return match ? parseInt(match[1]) : undefined;
}

// Build strategy text based on company profile
function buildStrategyText(headcount: number, sector: string, sectorName: string, highRisk: boolean): string {
  let riskFocus = "";
  if (highRisk) {
    riskFocus = "\n\n**Atenção:** O setor **" + sectorName + "** é classificado como **alto risco psicossocial**. " +
      "A avaliação terá foco especial nas dimensões de violência, assédio, burnout e demanda emocional.";
  }

  if (headcount < 20) {
    return `**Estratégia recomendada para ${headcount} funcionários (pequeno porte):**
- Avaliação **simplificada** focando nos riscos mais críticos do setor
- Prazo estimado: **120 dias**
- Metodologia: COPSOQ-II adaptado (dimensões prioritárias)${riskFocus}`;
  } else if (headcount <= 100) {
    return `**Estratégia recomendada para ${headcount} funcionários (médio porte):**
- **COPSOQ-II completo** — todas as 12 dimensões psicossociais
- Prazo estimado: **180 dias**
- Análise por grupos de trabalho${riskFocus}`;
  } else {
    return `**Estratégia recomendada para ${headcount} funcionários (grande porte):**
- **COPSOQ-II por setor/departamento** — plano detalhado por área
- Prazo estimado: **210 dias**
- Análise estratificada com relatórios departamentais${riskFocus}`;
  }
}

// ============================================================================
// PRICING POLICY: Reference values for psychosocial assessment proposals
// ============================================================================

interface CompanyPricingData {
  name: string;
  cnpj?: string;
  headcount: number;
  sector?: string;
  sectorName?: string;
  riskLevel?: "low" | "medium" | "high";
  urgency?: boolean;
  complexity?: "normal" | "high";
  travelRequired?: boolean;
  customization?: "none" | "basic" | "full";
}

interface PricingProposal {
  companyName: string;
  cnpj?: string;
  headcount: number;
  sizeCategory: string;
  recommendedPackage: string;
  packageDescription: string;
  pricePerEmployee: { min: number; max: number };
  totalEstimate: { min: number; max: number };
  volumeDiscount: { percentage: number; label: string };
  adjustmentFactors: Array<{ label: string; percentage: string }>;
  complementaryServices: Array<{ name: string; priceRange: string }>;
  paymentConditions: string;
  validity: string;
  formatted: string;
}

function getSizeCategory(headcount: number): { category: string; label: string; priceRange: { min: number; max: number } } {
  if (headcount <= 19) return { category: "micro", label: "Microempresa (ate 19 funcionarios)", priceRange: { min: 250, max: 350 } };
  if (headcount <= 99) return { category: "small", label: "Pequena empresa (20-99 funcionarios)", priceRange: { min: 350, max: 450 } };
  if (headcount <= 499) return { category: "medium", label: "Media empresa (100-499 funcionarios)", priceRange: { min: 450, max: 650 } };
  return { category: "large", label: "Grande empresa (500+ funcionarios)", priceRange: { min: 600, max: 900 } };
}

function getVolumeDiscount(headcount: number): { percentage: number; label: string; pricePerEmployee: number } {
  if (headcount <= 5) return { percentage: 0, label: "Sem desconto (1-5 funcionarios)", pricePerEmployee: 400 };
  if (headcount <= 15) return { percentage: 12.5, label: "12,5% de desconto (6-15 funcionarios)", pricePerEmployee: 350 };
  if (headcount <= 30) return { percentage: 25, label: "25% de desconto (16-30 funcionarios)", pricePerEmployee: 300 };
  return { percentage: 37.5, label: "37,5% de desconto (30+ funcionarios)", pricePerEmployee: 250 };
}

function getRecommendedPackage(headcount: number, riskLevel?: string): {
  name: string;
  description: string;
  priceRange: { min: number; max: number };
  items: string[];
} {
  if (headcount <= 19 && riskLevel !== "high") {
    return {
      name: "Pacote Essencial",
      description: "Essencial para Pequenos Negocios",
      priceRange: { min: 300, max: 400 },
      items: [
        "Entrevista individual com colaboradores",
        "Teste psicossocial basico (COPSOQ-II adaptado)",
        "Relatorio simplificado com principais riscos",
        "Devolutiva para gestores",
      ],
    };
  }
  if (headcount <= 99 || (headcount <= 19 && riskLevel === "high")) {
    return {
      name: "Pacote Intermediario",
      description: "Programa Integrado de Saude Mental",
      priceRange: { min: 450, max: 600 },
      items: [
        "Entrevista aprofundada com colaboradores",
        "Bateria completa de testes psicossociais",
        "Relatorio detalhado por dimensao",
        "Relatorio setorial comparativo",
        "Devolutiva para gestores e RH",
      ],
    };
  }
  return {
    name: "Pacote Premium",
    description: "Programa Corporativo Abrangente",
    priceRange: { min: 600, max: 900 },
    items: [
      "Tudo do Pacote Intermediario",
      "Analise de clima organizacional",
      "Mapeamento completo de riscos psicossociais",
      "Plano de acao personalizado",
      "Palestra de sensibilizacao",
      "Devolutiva individual para cada colaborador",
    ],
  };
}

function getCompanySizePackage(headcount: number): { name: string; priceRange: { min: number; max: number } } {
  if (headcount <= 19) return { name: "Essencial para Pequenos Negocios", priceRange: { min: 1800, max: 2800 } };
  if (headcount <= 99) return { name: "Programa Integrado de Saude Mental", priceRange: { min: 5500, max: 8500 } };
  return { name: "Programa Corporativo Abrangente", priceRange: { min: 15000, max: 50000 } };
}

function generatePricingProposal(companyData: CompanyPricingData): PricingProposal {
  const { name, cnpj, headcount, sectorName, riskLevel, urgency, complexity, travelRequired, customization } = companyData;

  const sizeInfo = getSizeCategory(headcount);
  const volumeDiscount = getVolumeDiscount(headcount);
  const recommendedPkg = getRecommendedPackage(headcount, riskLevel);
  const companySizePkg = getCompanySizePackage(headcount);

  // Calculate adjustment factors
  const adjustments: Array<{ label: string; percentage: string; multiplier: number }> = [];
  if (urgency) adjustments.push({ label: "Urgencia", percentage: "+15-50%", multiplier: 1.30 });
  if (complexity === "high") adjustments.push({ label: "Complexidade (conflitos/M&A)", percentage: "+20-40%", multiplier: 1.30 });
  if (travelRequired) adjustments.push({ label: "Deslocamento/logistica", percentage: "+10-25%", multiplier: 1.15 });
  if (headcount >= 500) adjustments.push({ label: "Grande corporacao", percentage: "+15-30%", multiplier: 1.20 });
  if (riskLevel === "high") adjustments.push({ label: "Setor de alto risco", percentage: "+15-25%", multiplier: 1.20 });
  if (customization === "basic") adjustments.push({ label: "Personalizacao basica", percentage: "+10-25%", multiplier: 1.15 });
  if (customization === "full") adjustments.push({ label: "Personalizacao completa", percentage: "+30-60%", multiplier: 1.40 });

  const totalMultiplier = adjustments.reduce((acc, a) => acc * a.multiplier, 1);

  // Base per-employee price from the recommended package
  const baseMin = recommendedPkg.priceRange.min;
  const baseMax = recommendedPkg.priceRange.max;
  const adjustedMin = Math.round(baseMin * totalMultiplier);
  const adjustedMax = Math.round(baseMax * totalMultiplier);

  // Total estimate
  const totalMin = adjustedMin * headcount;
  const totalMax = adjustedMax * headcount;

  // Use company-size package if total is lower than minimum
  const finalTotalMin = Math.max(totalMin, companySizePkg.priceRange.min);
  const finalTotalMax = Math.max(totalMax, companySizePkg.priceRange.max);

  // Complementary services
  const complementary = [
    { name: "Palestra Presencial", priceRange: "R$ 800 - R$ 1.500" },
    { name: "Palestra Online", priceRange: "R$ 500 - R$ 900" },
    { name: "Workshop Pratico (4h)", priceRange: "R$ 1.200 - R$ 2.800" },
    { name: "Plano de Acao Corporativo", priceRange: "R$ 1.000 - R$ 2.500" },
    { name: "Consultoria Mensal", priceRange: "R$ 1.500 - R$ 4.000/mes" },
  ];

  // Format the proposal
  const today = new Date();
  const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const formatDate = (d: Date) => d.toLocaleDateString("pt-BR");
  const formatCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;

  let formatted = `---\n\n## PROPOSTA INICIAL — Estimativa de Investimento (NR-01)\n\n`;
  formatted += `**Data:** ${formatDate(today)}\n`;
  formatted += `**Validade:** ${formatDate(validUntil)} (30 dias)\n\n`;
  formatted += `---\n\n### 1. DADOS DA EMPRESA\n\n`;
  formatted += `| Campo | Valor |\n|-------|-------|\n`;
  formatted += `| **Empresa** | ${name} |\n`;
  if (cnpj) formatted += `| **CNPJ** | ${cnpj} |\n`;
  formatted += `| **Porte** | ${sizeInfo.label} |\n`;
  formatted += `| **Colaboradores** | ${headcount} |\n`;
  if (sectorName) formatted += `| **Setor** | ${sectorName}${riskLevel === "high" ? " (ALTO RISCO)" : ""} |\n`;
  formatted += `\n`;

  formatted += `### 2. PACOTE RECOMENDADO: **${recommendedPkg.name}**\n\n`;
  formatted += `*${recommendedPkg.description}*\n\n`;
  formatted += `**Servicos inclusos:**\n`;
  for (const item of recommendedPkg.items) {
    formatted += `- ${item}\n`;
  }
  formatted += `\n`;

  formatted += `### 3. INVESTIMENTO\n\n`;
  formatted += `| Item | Valor |\n|------|-------|\n`;
  formatted += `| **Valor por colaborador** | ${formatCurrency(adjustedMin)} - ${formatCurrency(adjustedMax)} |\n`;
  formatted += `| **Quantidade de colaboradores** | ${headcount} |\n`;
  if (volumeDiscount.percentage > 0) {
    formatted += `| **Desconto por volume** | ${volumeDiscount.label} |\n`;
  }
  if (adjustments.length > 0) {
    for (const adj of adjustments) {
      formatted += `| **Ajuste: ${adj.label}** | ${adj.percentage} |\n`;
    }
  }
  formatted += `| **TOTAL ESTIMADO** | **${formatCurrency(finalTotalMin)} - ${formatCurrency(finalTotalMax)}** |\n`;
  formatted += `\n`;

  formatted += `### 4. SERVICOS COMPLEMENTARES (opcionais)\n\n`;
  formatted += `| Servico | Investimento |\n|---------|-------------|\n`;
  for (const svc of complementary) {
    formatted += `| ${svc.name} | ${svc.priceRange} |\n`;
  }
  if (headcount <= 10) {
    formatted += `| **Pacote Avaliacao + Palestra (${headcount} colabs)** | **R$ 2.500 - R$ 3.500** |\n`;
  }
  formatted += `\n`;

  formatted += `### 5. CONDICOES DE PAGAMENTO\n\n`;
  if (headcount <= 19) {
    formatted += `- **50%** no agendamento\n- **50%** na entrega dos relatorios\n`;
  } else {
    formatted += `- **40%** na assinatura do contrato\n- **30%** no inicio dos trabalhos\n- **30%** na conclusao e entrega\n`;
  }
  formatted += `\n`;

  formatted += `### 6. PROXIMOS PASSOS\n\n`;
  formatted += `1. Aprovacao desta proposta\n`;
  formatted += `2. Assinatura do contrato de prestacao de servicos\n`;
  formatted += `3. Agendamento do kickoff e cronograma\n`;
  formatted += `4. Inicio da avaliacao COPSOQ-II\n\n`;
  formatted += `---\n\n*Esta e uma estimativa inicial baseada no porte e setor da empresa. A proposta final detalhada sera gerada apos a conclusao da avaliacao COPSOQ-II e elaboracao do plano de acao.*\n\n*Proposta gerada automaticamente pela plataforma BlackBelt.*\n*Para duvidas: contato@blackbeltconsultoria.com*`;

  return {
    companyName: name,
    cnpj,
    headcount,
    sizeCategory: sizeInfo.category,
    recommendedPackage: recommendedPkg.name,
    packageDescription: recommendedPkg.description,
    pricePerEmployee: { min: adjustedMin, max: adjustedMax },
    totalEstimate: { min: finalTotalMin, max: finalTotalMax },
    volumeDiscount: { percentage: volumeDiscount.percentage, label: volumeDiscount.label },
    adjustmentFactors: adjustments.map(a => ({ label: a.label, percentage: a.percentage })),
    complementaryServices: complementary,
    paymentConditions: headcount <= 19
      ? "50% agendamento, 50% entrega"
      : "40% contrato, 30% inicio, 30% conclusao",
    validity: formatDate(validUntil),
    formatted,
  };
}

// ============================================================================
// FINAL PROPOSAL: Detailed commercial proposal after COPSOQ + Action Plan
// ============================================================================

interface FinalProposalData {
  companyName: string;
  cnpj?: string;
  headcount: number;
  sectorName?: string;
  riskLevel?: string;
  // COPSOQ results
  copsoqScores: Record<string, number>;
  overallRisk: string;
  criticalDimensions: string[];
  totalRespondents: number;
  // Risk inventory
  riskItemsCount: number;
  riskBreakdown: { critical: number; high: number; medium: number };
  // Action plans
  actionPlansCount: number;
  actionPlanPriorities: { urgent: number; high: number; medium: number };
  // Milestones
  milestones: Array<{ title: string; targetDate: Date; status: string }>;
}

function generateFinalProposal(data: FinalProposalData, initialProposal: PricingProposal): string {
  const today = new Date();
  const validUntil = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const formatDate = (d: Date) => d.toLocaleDateString("pt-BR");
  const formatCurrency = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;

  const dimLabels: Record<string, string> = {
    demanda: "Exigencias Quantitativas", controle: "Influencia no Trabalho", apoio: "Apoio Social",
    lideranca: "Qualidade da Lideranca", comunidade: "Comunidade Social", significado: "Significado do Trabalho",
    confianca: "Confianca Horizontal", justica: "Justica e Respeito", inseguranca: "Inseguranca no Trabalho",
    saudeMental: "Saude Mental Geral", burnout: "Burnout", violencia: "Violencia/Assedio",
  };

  const riskLabel: Record<string, string> = { low: "BAIXO", medium: "MODERADO", high: "ALTO", critical: "CRITICO" };
  const riskEmoji: Record<string, string> = { low: "🟢", medium: "🟡", high: "🟠", critical: "🔴" };

  let f = `---\n\n## PROPOSTA COMERCIAL FINAL — Gestao de Riscos Psicossociais (NR-01)\n\n`;
  f += `**Data:** ${formatDate(today)}\n`;
  f += `**Validade:** ${formatDate(validUntil)} (30 dias)\n\n`;

  // Section 1: Company data
  f += `---\n\n### 1. DADOS DA EMPRESA\n\n`;
  f += `| Campo | Valor |\n|-------|-------|\n`;
  f += `| **Empresa** | ${data.companyName} |\n`;
  if (data.cnpj) f += `| **CNPJ** | ${data.cnpj} |\n`;
  f += `| **Colaboradores** | ${data.headcount} |\n`;
  if (data.sectorName) f += `| **Setor** | ${data.sectorName} |\n`;
  f += `\n`;

  // Section 2: COPSOQ Results Summary
  f += `### 2. RESULTADOS DA AVALIACAO COPSOQ-II\n\n`;
  f += `- **Respondentes:** ${data.totalRespondents} funcionarios\n`;
  f += `- **Risco Geral:** ${riskEmoji[data.overallRisk] || "🟡"} **${riskLabel[data.overallRisk] || data.overallRisk}**\n`;
  if (data.criticalDimensions.length > 0) {
    f += `- **Dimensoes Criticas:** ${data.criticalDimensions.map(d => dimLabels[d] || d).join(", ")}\n`;
  }
  f += `\n`;
  f += `| Dimensao | Score | Nivel |\n|----------|-------|-------|\n`;
  for (const [dim, score] of Object.entries(data.copsoqScores)) {
    const level = score < 30 ? "🔴 Critico" : score < 50 ? "🟠 Alto" : score < 70 ? "🟡 Moderado" : "🟢 Baixo";
    f += `| ${dimLabels[dim] || dim} | ${score}/100 | ${level} |\n`;
  }
  f += `\n`;

  // Section 3: Risks Identified
  f += `### 3. RISCOS IDENTIFICADOS\n\n`;
  f += `- **Total de fatores de risco:** ${data.riskItemsCount}\n`;
  if (data.riskBreakdown.critical > 0) f += `  - 🔴 Criticos: ${data.riskBreakdown.critical}\n`;
  if (data.riskBreakdown.high > 0) f += `  - 🟠 Altos: ${data.riskBreakdown.high}\n`;
  if (data.riskBreakdown.medium > 0) f += `  - 🟡 Moderados: ${data.riskBreakdown.medium}\n`;
  f += `\n`;

  // Section 4: Action Plans
  f += `### 4. PLANOS DE ACAO DEFINIDOS\n\n`;
  f += `- **Total de acoes:** ${data.actionPlansCount}\n`;
  if (data.actionPlanPriorities.urgent > 0) f += `  - Urgentes: ${data.actionPlanPriorities.urgent}\n`;
  if (data.actionPlanPriorities.high > 0) f += `  - Alta prioridade: ${data.actionPlanPriorities.high}\n`;
  if (data.actionPlanPriorities.medium > 0) f += `  - Media prioridade: ${data.actionPlanPriorities.medium}\n`;
  f += `\n`;

  // Section 5: Recommended Services (based on actual findings)
  f += `### 5. SERVICOS RECOMENDADOS\n\n`;

  const isHighCritical = data.overallRisk === "high" || data.overallRisk === "critical";
  const hasLeadershipIssue = data.copsoqScores.lideranca !== undefined && data.copsoqScores.lideranca < 50;
  const manyActionPlans = data.actionPlansCount >= 6;

  // Determine recommended package
  let recommendedPkg = initialProposal.recommendedPackage;
  if (isHighCritical) recommendedPkg = "Pacote Premium";

  f += `| Servico | Descricao | Investimento |\n|---------|-----------|-------------|\n`;

  // Core package
  const pkgMin = isHighCritical ? Math.max(initialProposal.totalEstimate.min, 5500) : initialProposal.totalEstimate.min;
  const pkgMax = isHighCritical ? Math.max(initialProposal.totalEstimate.max, 8500) : initialProposal.totalEstimate.max;
  f += `| **${recommendedPkg}** | Avaliacao completa + inventario + plano de acao | ${formatCurrency(pkgMin)} - ${formatCurrency(pkgMax)} |\n`;
  f += `| **Palestra de Sensibilizacao** | Palestra presencial sobre riscos psicossociais (2h) | R$ 800 - R$ 1.500 |\n`;
  f += `| **Workshop Pratico** | Oficina pratica para equipes (4h) | R$ 1.200 - R$ 2.800 |\n`;

  if (hasLeadershipIssue) {
    f += `| **Treinamento de Liderancas** | Capacitacao em gestao humanizada e CNV (16h) | R$ 2.500 - R$ 4.500 |\n`;
  }
  if (manyActionPlans) {
    f += `| **Consultoria Mensal** | Acompanhamento e implementacao das acoes | R$ 1.500 - R$ 4.000/mes |\n`;
  }

  // Calculate total investment
  let totalMin = pkgMin + 800 + 1200; // package + palestra + workshop
  let totalMax = pkgMax + 1500 + 2800;
  if (hasLeadershipIssue) { totalMin += 2500; totalMax += 4500; }
  if (manyActionPlans) { totalMin += 1500; totalMax += 4000; }

  f += `| | | |\n`;
  f += `| **INVESTIMENTO TOTAL** | | **${formatCurrency(totalMin)} - ${formatCurrency(totalMax)}** |\n`;
  f += `\n`;

  // Section 6: ROI Estimate
  f += `### 6. ESTIMATIVA DE RETORNO (ROI)\n\n`;
  const absenteeismCostPerDay = 400;
  const estimatedDaysSaved = isHighCritical ? Math.round(data.headcount * 3.5) : Math.round(data.headcount * 2);
  const absenteeismSaving = absenteeismCostPerDay * estimatedDaysSaved;
  const turnoverCostPerEmployee = 3000;
  const turnoverReduction = isHighCritical ? Math.round(data.headcount * 0.08) : Math.round(data.headcount * 0.04);
  const turnoverSaving = turnoverCostPerEmployee * turnoverReduction;
  const totalROI = absenteeismSaving + turnoverSaving;

  f += `| Indicador | Estimativa |\n|-----------|------------|\n`;
  f += `| **Custo medio absenteismo** | R$ ${absenteeismCostPerDay}/dia por funcionario |\n`;
  f += `| **Dias de absenteismo evitados (ano)** | ~${estimatedDaysSaved} dias |\n`;
  f += `| **Economia com absenteismo** | ${formatCurrency(absenteeismSaving)}/ano |\n`;
  f += `| **Reducao estimada de turnover** | ~${turnoverReduction} desligamentos evitados |\n`;
  f += `| **Economia com turnover** | ${formatCurrency(turnoverSaving)}/ano |\n`;
  f += `| **ROI estimado total** | **${formatCurrency(totalROI)}/ano** |\n`;
  f += `\n`;

  // Section 7: Timeline
  f += `### 7. CRONOGRAMA\n\n`;
  if (data.milestones.length > 0) {
    f += `| Etapa | Prazo | Status |\n|-------|-------|--------|\n`;
    for (const m of data.milestones) {
      const statusIcon = m.status === "completed" ? "✅" : m.status === "in_progress" ? "🔄" : "⏳";
      f += `| ${m.title} | ${formatDate(m.targetDate)} | ${statusIcon} |\n`;
    }
  } else {
    f += `*Cronograma sera definido apos aprovacao.*\n`;
  }
  f += `\n`;

  // Section 8: Payment conditions
  f += `### 8. CONDICOES DE PAGAMENTO\n\n`;
  f += `- **40%** na assinatura do contrato\n`;
  f += `- **30%** no inicio dos trabalhos\n`;
  f += `- **30%** na entrega final\n\n`;

  // Section 9: Next steps
  f += `### 9. PROXIMOS PASSOS\n\n`;
  f += `1. Aprovacao desta proposta\n`;
  f += `2. Assinatura do contrato de prestacao de servicos\n`;
  f += `3. Inicio imediato da implementacao conforme cronograma\n\n`;

  f += `---\n\n*Proposta gerada com base nos resultados reais da avaliacao COPSOQ-II e plano de acao elaborado.*\n*BlackBelt Consultoria SST — contato@blackbeltconsultoria.com*`;

  return f;
}

// Helper: fetch data needed for final proposal from DB
async function buildFinalProposalData(
  companyId: string,
  companyName: string,
  cnpj: string | undefined,
  headcount: number,
  sectorName?: string,
): Promise<FinalProposalData | null> {
  const db2 = await getDb();
  if (!db2) return null;

  const {
    copsoqReports: cReports, copsoqAssessments: cAssessments,
    riskAssessmentItems: raItems, riskAssessments: riskAss,
    actionPlans: aPlans, complianceMilestones: cMilestones,
  } = await import("../../drizzle/schema_nr01");

  // Get COPSOQ report
  const [report] = await db2.select().from(cReports).where(eq(cReports.tenantId, companyId)).limit(1);
  if (!report) return null;

  const copsoqScores: Record<string, number> = {
    demanda: report.averageDemandScore || 50,
    controle: report.averageControlScore || 50,
    apoio: report.averageSupportScore || 50,
    lideranca: report.averageLeadershipScore || 50,
    comunidade: report.averageCommunityScore || 50,
    significado: report.averageMeaningScore || 50,
    confianca: report.averageTrustScore || 50,
    justica: report.averageJusticeScore || 50,
    inseguranca: report.averageInsecurityScore || 50,
    saudeMental: report.averageMentalHealthScore || 50,
    burnout: report.averageBurnoutScore || 50,
    violencia: report.averageViolenceScore || 50,
  };
  const avgOverall = Object.values(copsoqScores).reduce((a, b) => a + b, 0) / Object.keys(copsoqScores).length;
  const overallRisk = avgOverall < 30 ? "critical" : avgOverall < 50 ? "high" : avgOverall < 70 ? "medium" : "low";
  const criticalDimensions = Object.entries(copsoqScores).filter(([, s]) => s < 40).map(([d]) => d);

  // Get risk items
  const [ra] = await db2.select().from(riskAss).where(eq(riskAss.tenantId, companyId)).limit(1);
  let riskItemsCount = 0;
  const riskBreakdown = { critical: 0, high: 0, medium: 0 };
  if (ra) {
    const items = await db2.select().from(raItems).where(eq(raItems.assessmentId, ra.id));
    riskItemsCount = items.length;
    for (const it of items) {
      if (it.severity === "critical") riskBreakdown.critical++;
      else if (it.severity === "high") riskBreakdown.high++;
      else riskBreakdown.medium++;
    }
  }

  // Get action plans
  const plans = await db2.select().from(aPlans).where(eq(aPlans.tenantId, companyId));
  const actionPlansCount = plans.length;
  const actionPlanPriorities = { urgent: 0, high: 0, medium: 0 };
  for (const p of plans) {
    if (p.priority === "urgent") actionPlanPriorities.urgent++;
    else if (p.priority === "high") actionPlanPriorities.high++;
    else actionPlanPriorities.medium++;
  }

  // Get milestones
  const milestones = await db2.select().from(cMilestones)
    .where(eq(cMilestones.tenantId, companyId));

  return {
    companyName,
    cnpj,
    headcount,
    sectorName,
    riskLevel: overallRisk,
    copsoqScores,
    overallRisk,
    criticalDimensions,
    totalRespondents: report.totalRespondents || headcount,
    riskItemsCount,
    riskBreakdown,
    actionPlansCount,
    actionPlanPriorities,
    milestones: milestones.map(m => ({ title: m.title, targetDate: m.targetDate, status: m.status })),
  };
}

// ============================================================================
// PROPOSAL PERSISTENCE HELPERS: Save proposals + items to DB
// ============================================================================

async function saveInitialProposal(
  db2: any,
  tenantId: string,
  clientId: string,
  companyName: string,
  proposal: PricingProposal,
  headcount: number,
): Promise<string | null> {
  try {
    const proposalId = nanoid();
    const perEmployeeRate = Math.round((proposal.pricePerEmployee.min + proposal.pricePerEmployee.max) / 2);
    const diagnosticCost = perEmployeeRate * headcount;
    const relatorioCost = Math.round(diagnosticCost * 0.15);
    const planoCost = Math.round(diagnosticCost * 0.10);
    const subtotalCalc = diagnosticCost + relatorioCost + planoCost;

    await db2.insert(proposals).values({
      id: proposalId,
      tenantId,
      clientId,
      title: `Proposta Inicial NR-01 — ${companyName}`,
      description: proposal.formatted,
      status: 'draft',
      subtotal: subtotalCalc * 100,
      discount: Math.round(subtotalCalc * (proposal.volumeDiscount.percentage / 100) * 100),
      discountPercent: Math.round(proposal.volumeDiscount.percentage),
      taxes: 0,
      totalValue: proposal.totalEstimate.max * 100,
      taxRegime: 'simples_nacional',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // Insert initial proposal items
    const initialItems = [
      {
        id: nanoid(), proposalId, serviceId: 'SVC-COPSOQ-DIAG',
        serviceName: 'Diagnóstico Psicossocial COPSOQ-II',
        quantity: headcount, unitPrice: perEmployeeRate * 100,
        subtotal: diagnosticCost * 100, technicalHours: Math.max(8, Math.round(headcount * 0.5)),
      },
      {
        id: nanoid(), proposalId, serviceId: 'SVC-RELATORIO',
        serviceName: 'Relatório de Análise e Recomendações',
        quantity: 1, unitPrice: relatorioCost * 100,
        subtotal: relatorioCost * 100, technicalHours: 16,
      },
      {
        id: nanoid(), proposalId, serviceId: 'SVC-PLANO-PRELIM',
        serviceName: 'Plano de Ação Preliminar',
        quantity: 1, unitPrice: planoCost * 100,
        subtotal: planoCost * 100, technicalHours: 8,
      },
    ];

    for (const item of initialItems) {
      await db2.insert(proposalItems).values(item);
    }

    log.info(`[Agent] Initial proposal saved: ${proposalId}, tenantId=${tenantId}, clientId=${clientId}, total=${subtotalCalc}`);
    return proposalId;
  } catch (err: any) {
    log.error("Failed to save initial proposal to DB", { error: err.message, stack: err.stack });
    return null;
  }
}

async function saveFinalProposal(
  db2: any,
  tenantId: string,
  clientId: string,
  companyName: string,
  fpMarkdown: string,
  initialProposal: PricingProposal,
  fpData: FinalProposalData,
  headcount: number,
  contactEmail?: string | null,
): Promise<string | null> {
  try {
    const finalProposalId = nanoid();
    const isHighCritical = fpData.overallRisk === "high" || fpData.overallRisk === "critical";
    const hasLeadershipIssue = fpData.copsoqScores.lideranca !== undefined && fpData.copsoqScores.lideranca < 50;

    // Calculate per-employee rate
    const perEmployeeRate = Math.round((initialProposal.pricePerEmployee.min + initialProposal.pricePerEmployee.max) / 2);
    const copsoqCost = perEmployeeRate * headcount;
    const inventarioCost = Math.round(copsoqCost * 0.20);
    const planoCost = Math.round(fpData.actionPlansCount * 350);
    const treinamentoCost = Math.round(headcount * 120); // 8h training for all
    const pgrPcmsoCost = 2500;
    let totalCalc = copsoqCost + inventarioCost + planoCost + treinamentoCost + pgrPcmsoCost;

    // Build items list
    const items: Array<{
      id: string; proposalId: string; serviceId: string; serviceName: string;
      quantity: number; unitPrice: number; subtotal: number; technicalHours: number | null;
    }> = [
      {
        id: nanoid(), proposalId: finalProposalId, serviceId: 'SVC-COPSOQ-FULL',
        serviceName: 'Avaliação COPSOQ-II Completa',
        quantity: headcount, unitPrice: perEmployeeRate * 100,
        subtotal: copsoqCost * 100, technicalHours: Math.max(16, Math.round(headcount * 0.8)),
      },
      {
        id: nanoid(), proposalId: finalProposalId, serviceId: 'SVC-INVENTARIO',
        serviceName: 'Inventário de Riscos Psicossociais',
        quantity: 1, unitPrice: inventarioCost * 100,
        subtotal: inventarioCost * 100, technicalHours: 24,
      },
      {
        id: nanoid(), proposalId: finalProposalId, serviceId: 'SVC-PLANO-DET',
        serviceName: 'Plano de Ação Detalhado',
        quantity: fpData.actionPlansCount, unitPrice: 350 * 100,
        subtotal: planoCost * 100, technicalHours: Math.round(fpData.actionPlansCount * 4),
      },
      {
        id: nanoid(), proposalId: finalProposalId, serviceId: 'SVC-TREINAMENTO',
        serviceName: 'Programa de Treinamento (8h)',
        quantity: headcount, unitPrice: 120 * 100,
        subtotal: treinamentoCost * 100, technicalHours: 8,
      },
      {
        id: nanoid(), proposalId: finalProposalId, serviceId: 'SVC-PGR-PCMSO',
        serviceName: 'Integração PGR/PCMSO',
        quantity: 1, unitPrice: pgrPcmsoCost * 100,
        subtotal: pgrPcmsoCost * 100, technicalHours: 16,
      },
    ];

    // Conditional items based on risk
    if (isHighCritical) {
      const acompCost = 1800;
      totalCalc += acompCost * 4; // 4 quarters
      items.push({
        id: nanoid(), proposalId: finalProposalId, serviceId: 'SVC-ACOMPANHAMENTO',
        serviceName: 'Acompanhamento Trimestral',
        quantity: 4, unitPrice: acompCost * 100,
        subtotal: (acompCost * 4) * 100, technicalHours: 32,
      });
    }

    if (hasLeadershipIssue) {
      const liderancaCost = 3500;
      totalCalc += liderancaCost;
      items.push({
        id: nanoid(), proposalId: finalProposalId, serviceId: 'SVC-LIDERANCA',
        serviceName: 'Treinamento de Lideranças',
        quantity: 1, unitPrice: liderancaCost * 100,
        subtotal: liderancaCost * 100, technicalHours: 16,
      });
    }

    // Certification always included in final
    const certCost = 1200;
    totalCalc += certCost;
    items.push({
      id: nanoid(), proposalId: finalProposalId, serviceId: 'SVC-CERTIFICACAO',
      serviceName: 'Certificação NR-01',
      quantity: 1, unitPrice: certCost * 100,
      subtotal: certCost * 100, technicalHours: 8,
    });

    const finalTotalValue = Math.max(totalCalc, initialProposal.totalEstimate.max * 1.3);

    // Get contactEmail from pre-proposal if not provided
    let finalContactEmail = contactEmail;
    if (!finalContactEmail) {
      const [preProposal] = await db2.select().from(proposals)
        .where(and(eq(proposals.tenantId, tenantId), eq(proposals.clientId, clientId)))
        .orderBy(desc(proposals.createdAt))
        .limit(1);
      finalContactEmail = preProposal?.contactEmail || null;
    }

    // Generate approval token
    const approvalToken = crypto.randomBytes(32).toString("hex");

    await db2.insert(proposals).values({
      id: finalProposalId,
      tenantId,
      clientId,
      title: `Proposta Final NR-01 — ${companyName}`,
      description: fpMarkdown,
      status: 'sent',
      proposalType: 'final',
      contactEmail: finalContactEmail,
      approvalToken,
      subtotal: Math.round(totalCalc * 100),
      discount: Math.round(totalCalc * (initialProposal.volumeDiscount.percentage / 100) * 100),
      discountPercent: Math.round(initialProposal.volumeDiscount.percentage),
      taxes: 0,
      totalValue: Math.round(finalTotalValue * 100),
      taxRegime: 'simples_nacional',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      sentAt: new Date(),
    });

    for (const item of items) {
      await db2.insert(proposalItems).values(item);
    }

    log.info(`[Agent] Final proposal saved: ${finalProposalId}, tenantId=${tenantId}, clientId=${clientId}, items=${items.length}, total=${Math.round(finalTotalValue)}`);
    return finalProposalId;
  } catch (err: any) {
    log.error("Failed to save final proposal to DB", { error: err.message, stack: err.stack });
    return null;
  }
}

// ============================================================================
// CONVERSATION MEMORY: Extract context from previous messages
// ============================================================================

interface ConversationContext {
  cnpj?: string;
  companyName?: string;
  sector?: string;
  sectorName?: string;
  headcount?: number;
  highRisk?: boolean;
  address?: string;
  cnpjData?: any;
  lastAction?: string;
  phase?: string;
}

// ============================================================================
// PRE-PROPOSAL: Generate, save to DB, and optionally send by email
// ============================================================================

async function generateAndSavePreProposal(params: {
  companyId: string;
  companyName: string;
  cnpj: string;
  headcount: number;
  riskLevel: "low" | "high";
  pricingSummary: any;
  contactEmail: string;
  tenantId: string;
}): Promise<{ success: boolean; proposalId?: string; message?: string }> {
  try {
    const db = await getDb();
    const crypto = await import("crypto");
    const proposalId = nanoid();
    const approvalToken = crypto.randomBytes(32).toString("hex");

    // Find or create client
    const { clients } = await import("../../drizzle/schema");
    let [client] = await db.select().from(clients).where(eq(clients.cnpj, params.cnpj.replace(/\D/g, ""))).limit(1);
    if (!client) {
      const clientId = nanoid();
      await db.insert(clients).values({
        id: clientId,
        tenantId: params.tenantId,
        name: params.companyName,
        cnpj: params.cnpj.replace(/\D/g, ""),
        contactEmail: params.contactEmail,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      client = { id: clientId } as any;
    }

    const totalValue = Math.round(((params.pricingSummary.totalEstimate.min + params.pricingSummary.totalEstimate.max) / 2) * 100);

    await db.insert(proposals).values({
      id: proposalId,
      tenantId: params.tenantId,
      clientId: client.id,
      title: `Pré-Proposta NR-01 — ${params.companyName}`,
      description: `Pre-proposta para ${params.headcount} colaboradores. Pacote ${params.pricingSummary.recommendedPackage}.`,
      status: "pending",
      subtotal: totalValue,
      discount: 0,
      discountPercent: 0,
      taxes: 0,
      totalValue,
      taxRegime: "simples_nacional",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      approvalToken,
      contactEmail: params.contactEmail,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    log.info(`[Agent] Pre-proposal saved: ${proposalId} for ${params.companyName} (${params.contactEmail})`);
    return { success: true, proposalId };
  } catch (error) {
    log.error("[Agent] Failed to generate pre-proposal:", error);
    return { success: false, message: "Erro ao gerar pre-proposta" };
  }
}

async function sendPreProposalByEmail(proposalId: string): Promise<{ success: boolean; message: string }> {
  try {
    const db = await getDb();
    const [proposal] = await db.select().from(proposals).where(eq(proposals.id, proposalId));
    if (!proposal) return { success: false, message: "Proposta nao encontrada" };
    if (!proposal.contactEmail) return { success: false, message: "Email de contato nao informado" };

    const { clients } = await import("../../drizzle/schema");
    const [client] = await db.select().from(clients).where(eq(clients.id, proposal.clientId));

    const { sendProposalEmail } = await import("../_core/email");

    const totalFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(proposal.totalValue / 100);

    const sent = await sendProposalEmail({
      clientEmail: proposal.contactEmail,
      clientName: client?.name || "Prezado(a)",
      proposalId: proposal.id,
      proposalTitle: proposal.title,
      totalValue: proposal.totalValue,
      riskLevel: "medium",
      services: [
        { name: "Conformidade NR-01 Completa", quantity: 1, unitPrice: proposal.totalValue },
      ],
      validUntil: proposal.validUntil || undefined,
      approvalToken: proposal.approvalToken || undefined,
    });

    if (sent) {
      await db.update(proposals)
        .set({ sentAt: new Date(), updatedAt: new Date() })
        .where(eq(proposals.id, proposalId));
      log.info(`[Agent] Proposal email sent: ${proposalId} to ${proposal.contactEmail}`);
      return { success: true, message: `Proposta enviada para ${proposal.contactEmail}` };
    }
    return { success: false, message: "Falha ao enviar email" };
  } catch (error) {
    log.error("[Agent] Failed to send proposal email:", error);
    return { success: false, message: "Erro ao enviar email da proposta" };
  }
}

function extractContextFromHistory(messages: Array<{ role: string; content: string; metadata?: any; actionPayload?: any }>): ConversationContext {
  const ctx: ConversationContext = {};

  for (const msg of messages) {
    // Extract CNPJ from any message
    const cnpj = extractCNPJ(msg.content);
    if (cnpj) ctx.cnpj = cnpj.replace(/\D/g, "");

    // Extract headcount from any message
    const hc = extractHeadcount(msg.content);
    if (hc) ctx.headcount = hc;

    // Extract email from user messages
    if (msg.role === "user") {
      const emailMatch = msg.content.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      if (emailMatch) (ctx as any).contactEmail = emailMatch[0];
    }

    // Extract company data from assistant responses
    if (msg.role === "assistant") {
      // Look for company name in table format
      const nameMatch = msg.content.match(/\*\*Razão Social\*\*\s*\|\s*(.+)/);
      if (nameMatch) ctx.companyName = nameMatch[1].trim();

      const fantasyMatch = msg.content.match(/\*\*Nome Fantasia\*\*\s*\|\s*(.+)/);
      if (fantasyMatch && fantasyMatch[1].trim() !== "—") ctx.companyName = fantasyMatch[1].trim();

      const sectorMatch = msg.content.match(/\*\*Setor:\*\*\s*(.+?)(?:\s*⚠️|$)/);
      if (sectorMatch) ctx.sectorName = sectorMatch[1].trim();

      if (msg.content.includes("ALTO RISCO PSICOSSOCIAL")) ctx.highRisk = true;

      // Extract from action payloads (most reliable)
      if (msg.metadata?.actions) {
        for (const action of msg.metadata.actions) {
          if (action.params?.cnpj) ctx.cnpj = action.params.cnpj.replace(/\D/g, "");
          if (action.params?.name) ctx.companyName = action.params.name;
          if (action.params?.sector) ctx.sector = action.params.sector;
          if (action.params?.headcount) ctx.headcount = action.params.headcount;
          ctx.lastAction = action.type;
        }
      }
      if (msg.actionPayload) {
        if (msg.actionPayload.cnpj) ctx.cnpj = msg.actionPayload.cnpj.replace(/\D/g, "");
        if (msg.actionPayload.name) ctx.companyName = msg.actionPayload.name;
        if (msg.actionPayload.sector) ctx.sector = msg.actionPayload.sector;
        if (msg.actionPayload.headcount) ctx.headcount = msg.actionPayload.headcount;
      }
    }
  }

  if (ctx.sector && !ctx.sectorName) ctx.sectorName = sectorLabel(ctx.sector);
  if (ctx.sector) ctx.highRisk = isHighRiskSector(ctx.sector);

  return ctx;
}

// ============================================================================
// FALLBACK WITH MEMORY: Uses conversation history for context
// ============================================================================

async function generateFallbackResponse(
  userMessage: string,
  company: any,
  status: any,
  conversationHistory: Array<{ role: string; content: string; metadata?: any; actionPayload?: any }>,
  tenantId: string,
  userId: string
): Promise<{ content: string; actions: Array<{ type: string; label: string; params: Record<string, any> }> }> {
  const msg = userMessage.toLowerCase().trim();
  const actions: Array<{ type: string; label: string; params: Record<string, any> }> = [];

  // Build memory from conversation history
  const memory = extractContextFromHistory(conversationHistory);

  // Helper: find company by CNPJ in memory
  async function findCompanyByCNPJ(): Promise<any | null> {
    if (!memory.cnpj) return null;
    const formatted = memory.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    return dbOps.getTenantByCNPJ(formatted);
  }

  // Helper: determine next phase based on DB state
  async function getNextPhase(companyId: string): Promise<string> {
    const db2 = await getDb();
    if (!db2) return "unknown";
    const { copsoqAssessments, copsoqReports, copsoqResponses, copsoqInvites, riskAssessments: riskAss, interventionPrograms: intProg, complianceCertificates: certs } = await import("../../drizzle/schema_nr01");

    // Step 6: COPSOQ assessment exists?
    const [assessment] = await db2.select().from(copsoqAssessments).where(eq(copsoqAssessments.tenantId, companyId)).limit(1);
    if (!assessment) return "create_assessment";

    // Step 7: Check COPSOQ responses
    if (assessment.status === "in_progress") {
      const invites = await db2.select({ id: copsoqInvites.id }).from(copsoqInvites)
        .where(sql`assessmentId = ${assessment.id}`);
      const responses = await db2.select({ id: copsoqResponses.id }).from(copsoqResponses)
        .where(sql`assessmentId = ${assessment.id}`);
      // If all respondents have answered, move directly to generate_inventory phase
      if (responses.length > 0 && responses.length >= invites.length) {
        return "generate_inventory";
      }
      return "awaiting_responses:" + responses.length + ":" + invites.length;
    }

    // Step 8: Report and inventory
    const [report] = await db2.select().from(copsoqReports).where(eq(copsoqReports.tenantId, companyId)).limit(1);
    const [risk] = await db2.select().from(riskAss).where(eq(riskAss.tenantId, companyId)).limit(1);
    if (!report || !risk) return "generate_inventory";

    // Step 9: Training
    const [training] = await db2.select().from(intProg).where(eq(intProg.tenantId, companyId)).limit(1);
    if (!training) return "create_training";

    // Step 10: Certification
    const [cert] = await db2.select().from(certs).where(eq(certs.tenantId, companyId)).limit(1);
    if (!cert) return "complete_checklist";

    // Step 11: Final proposal
    const { proposals: proposalsTable } = await import("../../drizzle/schema");
    const [finalProposal] = await db2.select().from(proposalsTable)
      .where(and(eq(proposalsTable.clientId, companyId), eq(proposalsTable.proposalType, "final")))
      .limit(1);
    if (!finalProposal) return "generate_final_proposal";

    // Step 12: Payment
    if (finalProposal.status === "sent" || finalProposal.status === "pending_approval") return "awaiting_final_approval";
    if (finalProposal.status === "approved" && finalProposal.paymentStatus !== "paid") return "awaiting_payment";

    return "completed";
  }

  // Detect execute commands and affirmatives (case-insensitive)
  const isExecuteCommand = msg.startsWith("executar:");
  const isAffirmative = /^(sim|ok|pode|prossegu|inici|vamos|confirm|faz|comec|start|go|yes|claro|certo|beleza|bora|continuar|próximo|proximo|avançar|avancar|enviar)/i.test(msg);
  const isContinue = isExecuteCommand || isAffirmative;

  // ── 0. Handle edit_proposal action ──
  if (msg.startsWith("executar:edit_proposal") || msg.includes("editar proposta")) {
    const db2 = await getDb();
    const [latestProposal] = await db2.select().from(proposals)
      .where(eq(proposals.tenantId, tenantId))
      .orderBy(desc(proposals.createdAt))
      .limit(1);

    if (latestProposal) {
      const totalFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(latestProposal.totalValue / 100);
      const statusMap: Record<string, string> = { pending: "Pendente", pending_approval: "Aguardando Aprovação", approved: "Aprovada", rejected: "Recusada", sent: "Enviada", draft: "Rascunho" };
      const statusLabel = statusMap[latestProposal.status] || latestProposal.status;
      return {
        content: `**Proposta disponivel para edicao:**\n\n| Campo | Valor |\n|-------|-------|\n| **Titulo** | ${latestProposal.title} |\n| **Valor Total** | ${totalFormatted} |\n| **Email** | ${latestProposal.contactEmail || "—"} |\n| **Validade** | ${latestProposal.validUntil ? new Date(latestProposal.validUntil).toLocaleDateString("pt-BR") : "30 dias"} |\n| **Status** | ${statusLabel} |\n\n**Para editar, digite o que deseja alterar.** Exemplos:\n- "alterar valor para 3500"\n- "alterar email para empresa@email.com"\n- "alterar titulo para Proposta Premium NR-01"\n\nQuando estiver satisfeito, clique em **"Enviar Proposta por Email"**.`,
        actions: [
          { type: "send_proposal_email", label: "Enviar Proposta por Email", params: { proposalId: latestProposal.id, email: latestProposal.contactEmail } },
        ],
      };
    }
    return { content: "Nenhuma proposta encontrada para esta empresa. Informe o CNPJ da empresa para gerar uma nova.", actions: [] };
  }

  // ── 0x. Handle inline proposal edits (alterar valor/email/titulo) ──
  const editMatch = msg.match(/alterar\s+(valor|email|titulo|título)\s+(?:para\s+)?(.+)/i);
  if (editMatch) {
    const field = editMatch[1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const newValue = editMatch[2].trim();
    const db2 = await getDb();
    const [latestProposal] = await db2.select().from(proposals)
      .where(eq(proposals.tenantId, tenantId))
      .orderBy(desc(proposals.createdAt))
      .limit(1);

    if (!latestProposal) {
      return { content: "Nenhuma proposta encontrada para editar.", actions: [] };
    }

    const updates: any = { updatedAt: new Date() };
    let fieldLabel = "";

    if (field === "valor") {
      const numericValue = parseFloat(newValue.replace(/[^\d.,]/g, "").replace(",", "."));
      if (isNaN(numericValue) || numericValue <= 0) {
        return { content: "Valor inválido. Informe um número positivo, ex: 'alterar valor para 3500'", actions: [] };
      }
      updates.totalValue = Math.round(numericValue * 100);
      updates.subtotal = updates.totalValue;
      fieldLabel = `Valor Total → **R$ ${numericValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}**`;
    } else if (field === "email") {
      if (!newValue.includes("@")) {
        return { content: "Email inválido. Informe um email válido, ex: 'alterar email para empresa@email.com'", actions: [] };
      }
      updates.contactEmail = newValue.toLowerCase();
      fieldLabel = `Email → **${newValue.toLowerCase()}**`;
    } else if (field === "titulo") {
      updates.title = newValue;
      fieldLabel = `Título → **${newValue}**`;
    }

    await db2.update(proposals).set(updates).where(eq(proposals.id, latestProposal.id));

    const updatedTotal = updates.totalValue ? updates.totalValue : latestProposal.totalValue;
    const updatedEmail = updates.contactEmail || latestProposal.contactEmail;
    const totalFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(updatedTotal / 100);

    return {
      content: `✅ **Proposta atualizada!** ${fieldLabel}\n\n| Campo | Valor |\n|-------|-------|\n| **Titulo** | ${updates.title || latestProposal.title} |\n| **Valor Total** | ${totalFormatted} |\n| **Email** | ${updatedEmail || "—"} |\n\nDeseja fazer mais alguma alteração ou enviar a proposta?`,
      actions: [
        { type: "send_proposal_email", label: "Enviar Proposta por Email", params: { proposalId: latestProposal.id, email: updatedEmail } },
        { type: "edit_proposal", label: "Editar Proposta", params: { proposalId: latestProposal.id } },
      ],
    };
  }

  // ── 0a. Handle send_proposal_email action ──
  if (msg.startsWith("executar:send_proposal_email") || msg.includes("enviar proposta")) {
    // Find the latest proposal for this tenant (any status)
    const db2 = await getDb();
    const [latestProposal] = await db2.select().from(proposals)
      .where(eq(proposals.tenantId, tenantId))
      .orderBy(desc(proposals.createdAt))
      .limit(1);

    if (latestProposal?.id) {
      const emailResult = await sendPreProposalByEmail(latestProposal.id);
      if (emailResult.success) {
        // Update proposal status to pending_approval
        await db2.update(proposals)
          .set({ status: "pending_approval", sentAt: new Date(), updatedAt: new Date() })
          .where(eq(proposals.id, latestProposal.id));

        return {
          content: `✅ **Proposta enviada com sucesso!**\n\n${emailResult.message}\n\nA empresa receberá um email com a proposta e botões para **aprovar** ou **recusar**.\n\n**Próximos passos (automáticos após aprovação):**\n1. Empresa aprova a proposta pelo email\n2. Sistema cria conta de acesso e envia credenciais\n3. Empresa cadastra setores e colaboradores\n4. Consultoria envia questionário COPSOQ-II para os colaboradores\n5. Após respostas, o processo NR-01 continua automaticamente\n\n⏳ **Aguardando aprovação da empresa...**\n\nQuando a empresa aprovar, diga **"continuar"** para verificar o status e prosseguir.`,
          actions: [],
        };
      }
      return { content: `Erro ao enviar proposta: ${emailResult.message}`, actions: [] };
    }
    return { content: "Nenhuma proposta pendente encontrada. Informe o CNPJ da empresa para gerar uma nova proposta.", actions: [] };
  }

  // ── 0a1b. Handle generate_final_proposal action ──
  if (msg.startsWith("executar:generate_final_proposal") || msg.includes("gerar proposta final")) {
    const existingCompany = await findCompanyByCNPJ();
    if (existingCompany) {
      const hc = memory.headcount || 10;
      const riskLevel = memory.highRisk ? "high" as const : "low" as const;
      const fpData = await buildFinalProposalData(
        existingCompany.id, existingCompany.name,
        formatCNPJ(memory.cnpj || existingCompany.cnpj?.replace(/\D/g, '') || ""), hc, memory.sectorName,
      );
      if (fpData) {
        const initialProposal = generatePricingProposal({
          name: existingCompany.name, cnpj: formatCNPJ(memory.cnpj || ""),
          headcount: hc, sector: memory.sector, sectorName: memory.sectorName, riskLevel,
        });
        const content = generateFinalProposal(fpData, initialProposal);

        try {
          const db2 = await getDb();
          if (db2) {
            await saveFinalProposal(db2, tenantId, existingCompany.id, existingCompany.name, content, initialProposal, fpData, hc);
          }
        } catch (err: any) {
          log.error("Failed to save final proposal", { error: err.message });
        }

        // Find the saved final proposal for action buttons
        const db3 = await getDb();
        const [savedFP] = await db3.select().from(proposals)
          .where(and(eq(proposals.tenantId, tenantId), sql`proposalType = 'final'`))
          .orderBy(desc(proposals.createdAt))
          .limit(1);

        const contactEmail = (memory as any).contactEmail || existingCompany.cnpj;

        return {
          content: content + `\n\n✅ **Proposta final gerada!** Revise e envie para a empresa.`,
          actions: [
            { type: "send_final_proposal_email", label: "Enviar Proposta Final por Email", params: { proposalId: savedFP?.id, email: contactEmail, companyId: existingCompany.id } },
            { type: "edit_proposal", label: "Editar Proposta Final", params: { proposalId: savedFP?.id } },
          ],
        };
      }
      return { content: "Dados insuficientes para gerar proposta final. Complete o COPSOQ-II primeiro.", actions: [] };
    }
    return { content: "Empresa não encontrada. Informe o CNPJ.", actions: [] };
  }

  // ── 0a1c. Handle send_final_proposal_email action ──
  if (msg.startsWith("executar:send_final_proposal_email") || msg.includes("enviar proposta final")) {
    const db2 = await getDb();
    const [finalProp] = await db2.select().from(proposals)
      .where(and(eq(proposals.tenantId, tenantId), sql`proposalType = 'final'`))
      .orderBy(desc(proposals.createdAt))
      .limit(1);

    if (finalProp?.id) {
      const emailResult = await sendPreProposalByEmail(finalProp.id);
      if (emailResult.success) {
        await db2.update(proposals)
          .set({ status: "pending_approval", sentAt: new Date(), updatedAt: new Date() })
          .where(eq(proposals.id, finalProp.id));

        return {
          content: `✅ **Proposta final enviada com sucesso!**\n\n${emailResult.message}\n\n` +
            `A empresa receberá um email com a proposta e botões para **aprovar** ou **recusar**.\n\n` +
            `**Após aprovação:**\n` +
            `1. Instruções de pagamento serão enviadas automaticamente\n` +
            `2. Empresa efetua pagamento (parcelado em 3x)\n` +
            `3. Consultoria confirma recebimento\n` +
            `4. PDFs são liberados para a empresa\n\n` +
            `⏳ **Aguardando aprovação...**\n\nDiga **"continuar"** para verificar status.`,
          actions: [],
        };
      }
      return { content: `Erro ao enviar proposta final: ${emailResult.message}`, actions: [] };
    }
    return { content: "Nenhuma proposta final encontrada. Gere primeiro com 'Gerar Proposta Final'.", actions: [] };
  }

  // ── 0a2. Handle send_copsoq_invites action ──
  if (msg.startsWith("executar:send_copsoq_invites") || msg.includes("enviar copsoq")) {
    const companyIdMatch = msg.match(/companyId[=:]([^\s,}]+)/);
    let companyId = companyIdMatch?.[1];
    if (!companyId) {
      // Find company from memory or latest approved proposal
      const existingCompany = await findCompanyByCNPJ();
      if (existingCompany) companyId = existingCompany.id;
      if (!companyId) {
        const db2 = await getDb();
        const [childTenant] = await db2.select().from(tenants)
          .where(and(eq(tenants.parentTenantId, tenantId), eq(tenants.tenantType, "company")))
          .orderBy(desc(tenants.createdAt)).limit(1);
        if (childTenant) companyId = childTenant.id;
      }
    }
    if (companyId) {
      const { executeSendCopsoqInvites } = await import("../_ai/agentExecutor");
      const result = await executeSendCopsoqInvites(companyId, tenantId);
      return { content: result.message, actions: result.success ? [] : [] };
    }
    return { content: "Empresa não encontrada. Informe o CNPJ para continuar.", actions: [] };
  }

  // ── 0a3. Handle generate_inventory action (button click from awaiting_responses) ──
  if (msg.startsWith("executar:generate_inventory") || msg.startsWith("executar: gerar relat")) {
    let company = memory.cnpj ? await findCompanyByCNPJ() : null;
    if (!company) {
      const db2 = await getDb();
      const [childTenant] = await db2.select().from(tenants)
        .where(and(eq(tenants.parentTenantId, tenantId), eq(tenants.tenantType, "company")))
        .orderBy(desc(tenants.createdAt)).limit(1);
      if (childTenant) company = childTenant;
    }
    if (company) {
      const db2 = await getDb();
      const { copsoqAssessments: cAssessments } = await import("../../drizzle/schema_nr01");
      const [latestAssessment] = await db2.select().from(cAssessments)
        .where(eq(cAssessments.tenantId, company.id))
        .orderBy(desc(cAssessments.createdAt)).limit(1);
      if (latestAssessment) {
        const result = await executeGenerateInventoryAndPlan(company.id, latestAssessment.id, company.name, memory.headcount || 4);
        if (result.success) {
          return {
            content: result.message + `\n\n**Proxima etapa:** Criar programa de treinamento sobre riscos psicossociais.\nClique no botao abaixo ou diga **"sim"** para continuar.`,
            actions: [{ type: "create_training", label: "Criar Programa de Treinamento", params: { companyId: company.id } }],
          };
        }
        return { content: result.message, actions: [] };
      }
      return { content: "Nenhuma avaliação COPSOQ-II encontrada. Envie o questionário primeiro.", actions: [] };
    }
    return { content: "Empresa não encontrada. Informe o CNPJ para continuar.", actions: [] };
  }

  // ── 0b-pre. Handle "gerar relatorio" explicitly — triggers next phase (inventory/report) ──
  const wantsReport = msg.includes("gerar relatorio") || msg.includes("gerar relatório") || msg.includes("generate report");
  if (wantsReport) {
    // Find company and execute next phase
    let company = memory.cnpj ? await findCompanyByCNPJ() : null;
    if (!company) {
      const db2 = await getDb();
      const [childTenant] = await db2.select().from(tenants)
        .where(and(eq(tenants.parentTenantId, tenantId), eq(tenants.tenantType, "company")))
        .orderBy(desc(tenants.createdAt)).limit(1);
      if (childTenant) company = childTenant;
    }
    if (company) {
      const nextPhase = await getNextPhase(company.id);
      log.info(`[Agent] gerar relatorio: nextPhase=${nextPhase}, company=${company.id}`);

      if (nextPhase === "generate_inventory") {
        const db2 = await getDb();
        const { copsoqAssessments: cAssessments } = await import("../../drizzle/schema_nr01");
        const [latestAssessment] = await db2.select().from(cAssessments)
          .where(eq(cAssessments.tenantId, company.id))
          .orderBy(desc(cAssessments.createdAt)).limit(1);
        if (latestAssessment) {
          const result = await executeGenerateInventoryAndPlan(company.id, latestAssessment.id, company.name, memory.headcount || 4);
          if (result.success) {
            return {
              content: result.message + `\n\n**Proxima etapa:** Criar programa de treinamento sobre riscos psicossociais.\nClique no botao abaixo ou diga **"sim"** para continuar.`,
              actions: [{ type: "create_training", label: "Criar Programa de Treinamento", params: { companyId: company.id } }],
            };
          }
          return { content: result.message, actions: [] };
        }
      }
      // For other phases, show status
      const phaseLabels: Record<string, string> = {
        create_assessment: "Enviar COPSOQ-II",
        generate_inventory: "Gerar Inventario e Plano de Acao",
        create_training: "Criar Programa de Treinamento",
        complete_checklist: "Finalizar e Emitir Certificado",
      };
      return {
        content: `Empresa **${company.name}**. Proxima etapa: **${phaseLabels[nextPhase] || nextPhase}**.\n\nClique no botao abaixo ou diga **"sim"** para continuar.`,
        actions: [{ type: nextPhase, label: phaseLabels[nextPhase] || "Continuar", params: { companyId: company.id } }],
      };
    }
  }

  // ── 0b. Check proposal status and guide next steps ──
  // Works even without memory.cnpj — falls back to searching proposals by tenant
  if (isContinue) {
    const db2 = await getDb();

    // Check if there's a pending_approval proposal
    const [pendingProposal] = await db2.select().from(proposals)
      .where(and(eq(proposals.tenantId, tenantId), inArray(proposals.status, ["pending", "pending_approval"])))
      .orderBy(desc(proposals.createdAt))
      .limit(1);

    if (pendingProposal && pendingProposal.sentAt) {
      return {
        content: `⏳ **Aguardando aprovação da empresa.**\n\nA proposta foi enviada para **${pendingProposal.contactEmail}** em ${new Date(pendingProposal.sentAt).toLocaleDateString("pt-BR")}.\n\nAssim que a empresa aprovar:\n1. Uma conta será criada automaticamente\n2. A empresa receberá um email com credenciais de acesso\n3. A empresa cadastrará setores e colaboradores\n4. Você poderá enviar o COPSOQ-II\n\nDiga **"continuar"** novamente após a aprovação.`,
        actions: [],
      };
    }

    // Check if proposal was approved
    const [approvedProposal] = await db2.select().from(proposals)
      .where(and(eq(proposals.tenantId, tenantId), eq(proposals.status, "approved")))
      .orderBy(desc(proposals.createdAt))
      .limit(1);

    if (approvedProposal) {
      log.info(`[Agent] Proposal approved, checking employees`);

      // Find company tenant: try CNPJ first, then clientId fallback
      let existingCompany = memory.cnpj ? await findCompanyByCNPJ() : null;
      if (!existingCompany && approvedProposal.clientId) {
        // Fallback: find company via client record
        const [client] = await db2.select().from(clients)
          .where(eq(clients.id, approvedProposal.clientId));
        if (client?.cnpj) {
          const formatted = client.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
          existingCompany = await dbOps.getTenantByCNPJ(formatted) || await dbOps.getTenantByCNPJ(client.cnpj);
        }
      }
      // Last resort: find child tenants of this consultant
      if (!existingCompany) {
        const [childTenant] = await db2.select().from(tenants)
          .where(and(eq(tenants.parentTenantId, tenantId), eq(tenants.tenantType, "company")))
          .orderBy(desc(tenants.createdAt))
          .limit(1);
        if (childTenant) existingCompany = childTenant;
      }

      if (existingCompany) {
        const [peopleCount] = await db2.select({ count: sql<number>`COUNT(*)` })
          .from(people)
          .where(eq(people.tenantId, existingCompany.id));
        const employeeCount = peopleCount?.count || 0;

        if (employeeCount === 0) {
          return {
            content: `✅ **Proposta aprovada pela empresa ${existingCompany.name}!** Credenciais de acesso já foram enviadas.\n\n⚠️ **Aguardando cadastro de colaboradores.** A empresa precisa cadastrar os setores e colaboradores na plataforma antes de prosseguir.\n\n**Orientações para a empresa:**\n1. Acessar a plataforma com as credenciais recebidas por email\n2. No menu lateral, ir em **Colaboradores e Setores**\n3. Cadastrar setores e colaboradores (manualmente ou via planilha)\n\nQuando os colaboradores estiverem cadastrados, diga **"continuar"** para enviar o questionário COPSOQ-II.`,
            actions: [],
          };
        }

        // Check if COPSOQ already exists — if so, skip to next phase (don't offer COPSOQ again)
        const { copsoqAssessments: cAssess } = await import("../../drizzle/schema_nr01");
        const [existingAssessment] = await db2.select().from(cAssess)
          .where(eq(cAssess.tenantId, existingCompany.id))
          .limit(1);

        if (existingAssessment) {
          // COPSOQ already sent — let section 3 handle next phase (report, inventory, etc.)
          log.info(`[Agent] COPSOQ already exists for ${existingCompany.name}, skipping to next phase`);
        } else {
          // No COPSOQ yet — offer to send
          return {
            content: `✅ **Proposta aprovada!** A empresa **${existingCompany.name}** cadastrou **${employeeCount} colaborador(es)**.\n\n**Próximo passo:** Enviar o questionário COPSOQ-II para todos os colaboradores por email.\n\nClique em **"Enviar COPSOQ-II"** para disparar os convites.`,
            actions: [
              { type: "send_copsoq_invites", label: "Enviar COPSOQ-II", params: { companyId: existingCompany.id, headcount: employeeCount } },
            ],
          };
        }
      }
    }
  }

  // ── 1. Current message has CNPJ: do fresh lookup ──
  const cnpj = extractCNPJ(userMessage);
  if (cnpj) {
    // ── 1a. EARLY CHECK: If company already exists, skip headcount/email questions ──
    const formattedCnpjCheck = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    const existingCompany = await dbOps.getTenantByCNPJ(formattedCnpjCheck);
    if (existingCompany) {
      const nextPhase = await getNextPhase(existingCompany.id);

      if (nextPhase === "completed") {
        // NR-01 fully completed — check final proposal + payment status
        return await buildCompletedResponse(existingCompany, tenantId);
      }

      if (nextPhase !== "unknown") {
        // NR-01 in progress or at beginning — show current phase, don't re-ask for details
        const phaseLabels: Record<string, string> = {
          create_assessment: "Enviar COPSOQ-II",
          generate_inventory: "Gerar Inventário e Plano de Ação",
          create_training: "Criar Programa de Treinamento",
          complete_checklist: "Finalizar e Emitir Certificado",
        };
        const label = phaseLabels[nextPhase] || nextPhase;

        // For create_assessment, check employee count
        if (nextPhase === "create_assessment") {
          const db2 = await getDb();
          const [pCount] = await db2.select({ count: sql<number>`COUNT(*)` })
            .from(people)
            .where(eq(people.tenantId, existingCompany.id));
          const empCount = pCount?.count || 0;

          if (empCount === 0) {
            return {
              content: `A empresa **${existingCompany.name}** (${formattedCnpjCheck}) ja esta cadastrada.\n\n` +
                `⚠️ **Aguardando cadastro de colaboradores.** A empresa precisa cadastrar setores e colaboradores antes de prosseguir com o COPSOQ-II.`,
              actions: [],
            };
          }

          return {
            content: `A empresa **${existingCompany.name}** (${formattedCnpjCheck}) ja esta cadastrada.\n\n` +
              `📋 **Processo NR-01 em andamento.** Próxima etapa: **${label}**\n` +
              `Colaboradores cadastrados: **${empCount}**\n\nClique no botão abaixo para continuar.`,
            actions: [{ type: "create_assessment", label, params: { companyId: existingCompany.id, headcount: empCount } }],
          };
        }

        return {
          content: `A empresa **${existingCompany.name}** (${formattedCnpjCheck}) ja esta cadastrada.\n\n` +
            `📋 **Processo NR-01 em andamento.** Próxima etapa: **${label}**\n\nClique no botão abaixo para continuar.`,
          actions: [{ type: nextPhase, label, params: { companyId: existingCompany.id } }],
        };
      }
    }
    // ── 1b. Company is NEW or not found — proceed with full flow ──
    const headcount = extractHeadcount(userMessage) || memory.headcount;
    const result = await processCNPJForAgent(cnpj, headcount);

    if (!result.found) return { content: result.message!, actions: [] };
    if (!result.active) return { content: result.message!, actions: [] };

    const data = result.data!;
    const formattedCNPJ = formatCNPJ(cnpj);

    let content = `Consultei a Receita Federal e encontrei os dados da empresa:

**Dados da Empresa:**
| Campo | Valor |
|-------|-------|
| **Razao Social** | ${data.razao_social} |
| **Nome Fantasia** | ${data.nome_fantasia || "—"} |
| **CNPJ** | ${formattedCNPJ} |
| **Situacao** | ${data.situacao_cadastral} |
| **CNAE Principal** | ${data.cnae_fiscal} — ${data.cnae_fiscal_descricao} |
| **Porte** | ${data.porte} |
| **Endereco** | ${result.address} |
| **CEP** | ${data.cep} |
| **Telefone** | ${data.telefone || "—"} |
| **Email** | ${data.email || "—"} |
| **Inicio Atividade** | ${data.data_inicio_atividade} |

**Classificacao NR-01:**
- **Setor:** ${result.sectorName}${result.highRisk ? " - **ALTO RISCO PSICOSSOCIAL**" : ""}
`;

    if (headcount) {
      content += "\n" + buildStrategyText(headcount, result.sector!, result.sectorName!, result.highRisk!);

      // AUTO-EXECUTE: Create company immediately when we have CNPJ + headcount
      const execResult = await executeCreateCompany({
        cnpj: data.cnpj,
        name: data.nome_fantasia || data.razao_social,
        sector: result.sector,
        headcount,
        street: data.logradouro, number: data.numero, complement: data.complemento,
        neighborhood: data.bairro, city: data.municipio, state: data.uf,
        zipCode: data.cep, contactPhone: data.telefone, contactEmail: data.email,
      }, tenantId, userId);

      if (execResult.success) {
        content += `\n\n**Empresa cadastrada com sucesso!**\n${execResult.message}`;

        // Check if NR-01 process already exists for this company
        if (execResult.companyId) {
          const nextPhase = await getNextPhase(execResult.companyId);
          if (nextPhase === "completed") {
            // Check final proposal + payment status
            const completedResp = await buildCompletedResponse({ id: execResult.companyId, name: data.nome_fantasia || data.razao_social, cnpj: formattedCNPJ }, tenantId);
            content += `\n\n` + completedResp.content;
            return { content, actions: completedResp.actions };
          }
          if (nextPhase !== "create_assessment") {
            // NR-01 in progress — show current phase
            const phaseLabels: Record<string, string> = {
              generate_inventory: "Gerar Inventário e Plano de Ação",
              create_training: "Criar Programa de Treinamento",
              complete_checklist: "Finalizar e Emitir Certificado",
            };
            const label = phaseLabels[nextPhase] || nextPhase;
            content += `\n\n📋 **Processo NR-01 em andamento.** Próxima etapa: **${label}**`;
            content += `\n\nClique no botão abaixo para continuar.`;
            return {
              content,
              actions: [{ type: nextPhase, label, params: { companyId: execResult.companyId } }],
            };
          }
        }

        // Generate pricing summary
        const riskLevel = result.highRisk ? "high" as const : "low" as const;
        const pricingSummary = generatePricingProposal({
          name: data.nome_fantasia || data.razao_social,
          cnpj: formattedCNPJ,
          headcount,
          sector: result.sector,
          sectorName: result.sectorName,
          riskLevel,
        });
        content += `\n\n**Investimento estimado:** ${pricingSummary.recommendedPackage} — **R$ ${pricingSummary.totalEstimate.min.toLocaleString("pt-BR")} a R$ ${pricingSummary.totalEstimate.max.toLocaleString("pt-BR")}**`;
        if (pricingSummary.volumeDiscount.percentage > 0) {
          content += `\n(desconto de ${pricingSummary.volumeDiscount.percentage}% aplicado)`;
        }

        // Check if we have an email to send the proposal
        const contactEmail = (memory as any).contactEmail || data.email;

        if (contactEmail) {
          // Generate and save pre-proposal in DB
          const proposalResult = await generateAndSavePreProposal({
            companyId: execResult.companyId!,
            companyName: data.nome_fantasia || data.razao_social,
            cnpj: formattedCNPJ,
            headcount,
            riskLevel,
            pricingSummary,
            contactEmail,
            tenantId,
          });

          if (proposalResult.success) {
            content += `\n\n**Pre-proposta gerada!** Revise e edite antes de enviar.`;
            content += `\n\n**Proximas opcoes:**`;
            content += `\n- Clique em **"Enviar Proposta por Email"** para enviar a pre-proposta para **${contactEmail}**`;
            content += `\n- Clique em **"Editar Proposta"** para ajustar valores antes do envio`;
            content += `\n- Ou diga **"sim"** para enviar e prosseguir`;
            return {
              content,
              actions: [
                { type: "send_proposal_email", label: "Enviar Proposta por Email", params: { proposalId: proposalResult.proposalId, email: contactEmail, companyId: execResult.companyId } },
                { type: "edit_proposal", label: "Editar Proposta", params: { proposalId: proposalResult.proposalId } },
              ],
            };
          }
        }

        // No email — ask for it
        content += `\n\n**Para prosseguir, preciso do email da empresa** para envio da pre-proposta comercial.`;
        content += `\nInforme o email e a proposta sera gerada para sua revisao antes do envio.`;
        return { content, actions: [] };
      } else {
        content += `\n\n${execResult.message}`;
        // Company already exists — check proposal status first
        const existing = await findCompanyByCNPJ();
        if (existing) {
          // Check if there's a proposal pending approval
          const db3 = await getDb();
          const [existingProposal] = await db3.select().from(proposals)
            .where(eq(proposals.tenantId, tenantId))
            .orderBy(desc(proposals.createdAt))
            .limit(1);

          if (existingProposal && ["pending", "pending_approval"].includes(existingProposal.status)) {
            if (existingProposal.sentAt) {
              content += `\n\n⏳ **Proposta já enviada para ${existingProposal.contactEmail}.** Aguardando aprovação da empresa.`;
              return { content, actions: [] };
            }
            content += `\n\n**Proposta gerada mas ainda não enviada.** Envie para o email da empresa.`;
            return {
              content,
              actions: [
                { type: "send_proposal_email", label: "Enviar Proposta por Email", params: { proposalId: existingProposal.id, email: existingProposal.contactEmail } },
                { type: "edit_proposal", label: "Editar Proposta", params: { proposalId: existingProposal.id } },
              ],
            };
          }

          if (!existingProposal || existingProposal.status === "rejected") {
            // No proposal or rejected — generate new one
            const contactEmail2 = (memory as any).contactEmail || "";
            if (contactEmail2) {
              content += `\n\nGerando nova proposta...`;
              // Will be handled by the main flow
            } else {
              content += `\n\n**Informe o email da empresa** para gerar e enviar a proposta comercial.`;
              return { content, actions: [] };
            }
          }

          const nextPhase = await getNextPhase(existing.id);
          if (nextPhase === "create_assessment") {
            // Check if company has employees
            const [pCount] = await db3.select({ count: sql<number>`COUNT(*)` })
              .from(people)
              .where(eq(people.tenantId, existing.id));
            const empCount = pCount?.count || 0;

            if (empCount === 0) {
              content += `\n\n⚠️ **Aguardando cadastro de colaboradores.** A empresa precisa cadastrar setores e colaboradores antes de prosseguir com o COPSOQ-II.`;
              return { content, actions: [] };
            }

            content += `\n\n**Proxima etapa:** Enviar questionário COPSOQ-II para **${empCount} colaborador(es)**.`;
            return {
              content,
              actions: [{ type: "create_assessment", label: "Enviar COPSOQ-II", params: { companyId: existing.id, headcount: empCount } }],
            };
          } else if (nextPhase === "generate_inventory") {
            content += `\n\n**Proxima etapa:** Gerar inventario de riscos e plano de acao.`;
            return {
              content,
              actions: [{ type: "generate_inventory", label: "Gerar Inventario e Plano de Acao", params: { companyId: existing.id } }],
            };
          } else if (nextPhase === "create_training") {
            content += `\n\n**Proxima etapa:** Criar programa de treinamento.`;
            return {
              content,
              actions: [{ type: "create_training", label: "Criar Programa de Treinamento", params: { companyId: existing.id } }],
            };
          } else if (nextPhase === "complete_checklist") {
            content += `\n\n**Proxima etapa:** Finalizar checklist e emitir certificado.`;
            return {
              content,
              actions: [{ type: "complete_checklist", label: "Finalizar e Emitir Certificado", params: { companyId: existing.id } }],
            };
          } else {
            content += `\n\nProcesso NR-01 ja esta **100% concluido**!`;
            return { content, actions: [] };
          }
        }
      }
    } else {
      content += "\nPara definir a estrategia, preciso saber o **numero de funcionarios** e o **email** da empresa.";
    }

    return { content, actions };
  }

  // ── 2. User mentions headcount and we already have CNPJ from history ──
  const currentHeadcount = extractHeadcount(userMessage);
  if (currentHeadcount && memory.cnpj) {
    // Re-run with CNPJ + headcount — this will auto-create company
    const result = await processCNPJForAgent(memory.cnpj, currentHeadcount);
    if (result.found && result.active) {
      const data = result.data!;
      const execResult = await executeCreateCompany({
        cnpj: data.cnpj, name: data.nome_fantasia || data.razao_social,
        sector: result.sector, headcount: currentHeadcount,
        street: data.logradouro, number: data.numero, complement: data.complemento,
        neighborhood: data.bairro, city: data.municipio, state: data.uf,
        zipCode: data.cep, contactPhone: data.telefone, contactEmail: data.email,
      }, tenantId, userId);

      const content = buildStrategyText(currentHeadcount, result.sector!, result.sectorName!, result.highRisk!) +
        `\n\nEmpresa: **${data.nome_fantasia || data.razao_social}** (${formatCNPJ(memory.cnpj)})` +
        `\n\n${execResult.message}` +
        `\n\n**Proxima etapa:** Criar avaliacao COPSOQ-II para os ${currentHeadcount} funcionarios.`;

      return {
        content,
        actions: [
          { type: "create_assessment", label: "Criar Avaliacao COPSOQ-II", params: { companyId: execResult.companyId || (await findCompanyByCNPJ())?.id, headcount: currentHeadcount } },
        ],
      };
    }
  }

  // ── 3. Execute/Continue: auto-detect next phase and execute ──
  if (isContinue && memory.cnpj) {
    const existingCompany = await findCompanyByCNPJ();
    if (existingCompany) {
      const nextPhase = await getNextPhase(existingCompany.id);
      log.info(`[Agent] Auto-continue: nextPhase=${nextPhase}, company=${existingCompany.id}`);

      if (nextPhase === "create_assessment") {
        // Check if company has employees before creating assessment
        const db3 = await getDb();
        const [pc] = await db3.select({ count: sql<number>`COUNT(*)` })
          .from(people).where(eq(people.tenantId, existingCompany.id));
        const empCount = pc?.count || 0;

        if (empCount === 0) {
          return {
            content: `⚠️ **Nenhum colaborador cadastrado** na empresa **${existingCompany.name}**.\n\nA empresa precisa cadastrar os colaboradores antes de enviar o COPSOQ-II.\n\n**Orientações para a empresa:**\n1. Acessar a plataforma com as credenciais recebidas\n2. No menu lateral, ir em **Colaboradores e Setores**\n3. Cadastrar setores e colaboradores (manualmente ou via planilha)\n\nQuando os colaboradores estiverem cadastrados, diga **"continuar"**.`,
            actions: [],
          };
        }

        // Has employees — offer to send COPSOQ invites by email
        return {
          content: `A empresa **${existingCompany.name}** tem **${empCount} colaborador(es)** cadastrados.\n\n**Próximo passo:** Enviar o questionário COPSOQ-II para todos os colaboradores por email.\n\nClique em **"Enviar COPSOQ-II"** para disparar os convites.`,
          actions: [
            { type: "send_copsoq_invites", label: "Enviar COPSOQ-II", params: { companyId: existingCompany.id, headcount: empCount } },
          ],
        };
      }

      if (nextPhase === "generate_inventory") {
        const db2 = await getDb();
        if (db2) {
          const { copsoqAssessments: cAssessments } = await import("../../drizzle/schema_nr01");
          const [latestAssessment] = await db2.select().from(cAssessments)
            .where(eq(cAssessments.tenantId, existingCompany.id))
            .orderBy(desc(cAssessments.createdAt)).limit(1);
          if (latestAssessment) {
            const result = await executeGenerateInventoryAndPlan(existingCompany.id, latestAssessment.id, existingCompany.name, memory.headcount || 4);
            if (result.success) {
              return {
                content: result.message + `\n\n**Proxima etapa:** Criar programa de treinamento sobre riscos psicossociais.\nClique no botao abaixo ou diga **"sim"** para continuar.`,
                actions: [{ type: "create_training", label: "Criar Programa de Treinamento", params: { companyId: existingCompany.id } }],
              };
            }
            return { content: result.message, actions: [] };
          }
        }
      }

      if (nextPhase === "create_training") {
        const result = await executeCreateTraining(existingCompany.id, existingCompany.name);
        if (result.success) {
          // Generate final proposal after training (all data is available now)
          let finalProposalContent = "";
          try {
            const hc = memory.headcount || 3;
            const db2 = await getDb();
            const fpData = await buildFinalProposalData(
              existingCompany.id, existingCompany.name,
              memory.cnpj ? formatCNPJ(memory.cnpj) : existingCompany.cnpj,
              hc, memory.sectorName,
            );
            if (fpData) {
              const riskLevel = memory.highRisk ? "high" as const : "low" as const;
              const initialProposal = generatePricingProposal({
                name: existingCompany.name, cnpj: memory.cnpj ? formatCNPJ(memory.cnpj) : existingCompany.cnpj,
                headcount: hc, sector: memory.sector, sectorName: memory.sectorName, riskLevel,
              });
              const finalProposalMarkdown = generateFinalProposal(fpData, initialProposal);
              finalProposalContent = "\n\n" + finalProposalMarkdown;
              const savedId = await saveFinalProposal(db2, tenantId, existingCompany.id, existingCompany.name, finalProposalMarkdown, initialProposal, fpData, hc);
              if (savedId) {
                finalProposalContent += `\n\n✅ **Proposta Final salva!** Acesse em **Propostas Comerciais** para visualizar e exportar em PDF.`;
              }
            }
          } catch { /* final proposal generation failed, continue without it */ }

          return {
            content: result.message + finalProposalContent + `\n\n**Proxima etapa:** Finalizar checklist e emitir certificado de conformidade.\nClique no botao abaixo ou diga **"sim"** para continuar.`,
            actions: [{ type: "complete_checklist", label: "Finalizar e Emitir Certificado", params: { companyId: existingCompany.id } }],
          };
        }
        return { content: result.message, actions: [] };
      }

      // Step 7: Awaiting COPSOQ responses
      if (nextPhase.startsWith("awaiting_responses:")) {
        const parts = nextPhase.split(":");
        const responded = parseInt(parts[1] || "0");
        const total = parseInt(parts[2] || "0");
        if (responded === 0) {
          return {
            content: `⏳ **Aguardando respostas do COPSOQ-II**\n\n📊 Progresso: **${responded} de ${total}** colaboradores responderam.\n\nOs colaboradores receberam o questionário por email e têm 7 dias para responder.\n\nQuando houver respostas, diga **"continuar"** para verificar o progresso.`,
            actions: [],
          };
        }
        return {
          content: `📊 **Progresso do COPSOQ-II:** ${responded} de ${total} colaboradores responderam.\n\n${responded === total ? "✅ Todos responderam!" : "⚠️ Respostas parciais — os colaboradores não são obrigados a responder."}\n\nDeseja **gerar o relatório** com as ${responded} resposta(s) recebidas?`,
          actions: [
            { type: "generate_inventory", label: "Gerar Relatório e Inventário", params: { companyId: existingCompany.id } },
          ],
        };
      }

      if (nextPhase === "complete_checklist") {
        const result = await executeCompleteChecklist(existingCompany.id);
        // After completing checklist, AUTO-GENERATE final proposal (Step 11)
        let finalContent = result.message;
        try {
          const hc = memory.headcount || 3;
          const db2 = await getDb();
          const fpData = await buildFinalProposalData(existingCompany.id, existingCompany.name, memory.cnpj ? formatCNPJ(memory.cnpj) : existingCompany.cnpj, hc, memory.sectorName);
          if (fpData) {
            const riskLevel = memory.highRisk ? "high" as const : "low" as const;
            const initialProposal = generatePricingProposal({ name: existingCompany.name, cnpj: memory.cnpj ? formatCNPJ(memory.cnpj) : existingCompany.cnpj, headcount: hc, sector: memory.sector, sectorName: memory.sectorName, riskLevel });
            const finalProposalMarkdown = generateFinalProposal(fpData, initialProposal);
            const savedId = await saveFinalProposal(db2, tenantId, existingCompany.id, existingCompany.name, finalProposalMarkdown, initialProposal, fpData, hc);
            if (savedId) {
              finalContent += `\n\n✅ **Proposta Final gerada automaticamente!**\n\nRevise e envie para a empresa para aprovação.`;
            }
          }
        } catch { /* continue without auto-generated proposal */ }

        return {
          content: finalContent,
          actions: [
            { type: "send_final_proposal_email", label: "Enviar Proposta Final por Email", params: { companyId: existingCompany.id } },
            { type: "edit_final_proposal", label: "Editar Proposta Final", params: { companyId: existingCompany.id } },
          ],
        };
      }

      // Step 11: Generate final proposal (if not auto-generated)
      if (nextPhase === "generate_final_proposal") {
        try {
          const hc = memory.headcount || 3;
          const db2 = await getDb();
          const fpData = await buildFinalProposalData(existingCompany.id, existingCompany.name, memory.cnpj ? formatCNPJ(memory.cnpj) : existingCompany.cnpj, hc, memory.sectorName);
          if (fpData) {
            const riskLevel = memory.highRisk ? "high" as const : "low" as const;
            const initialProposal = generatePricingProposal({ name: existingCompany.name, cnpj: memory.cnpj ? formatCNPJ(memory.cnpj) : existingCompany.cnpj, headcount: hc, sector: memory.sector, sectorName: memory.sectorName, riskLevel });
            const finalProposalMarkdown = generateFinalProposal(fpData, initialProposal);
            await saveFinalProposal(db2, tenantId, existingCompany.id, existingCompany.name, finalProposalMarkdown, initialProposal, fpData, hc);
            return {
              content: `✅ **Proposta Final gerada!** Revise e envie para a empresa.`,
              actions: [
                { type: "send_final_proposal_email", label: "Enviar Proposta Final por Email", params: { companyId: existingCompany.id } },
                { type: "edit_final_proposal", label: "Editar Proposta Final", params: { companyId: existingCompany.id } },
              ],
            };
          }
        } catch (err: any) {
          return { content: `Erro ao gerar proposta final: ${err.message}`, actions: [] };
        }
      }

      // Step 12: Awaiting final proposal approval
      if (nextPhase === "awaiting_final_approval") {
        return {
          content: `⏳ **Aguardando aprovação da empresa.**\n\nA proposta final foi enviada por email. Quando a empresa aprovar, as instruções de pagamento serão enviadas automaticamente.\n\nDiga **"continuar"** para verificar o status.`,
          actions: [],
        };
      }

      // Step 12: Awaiting payment
      if (nextPhase === "awaiting_payment") {
        return await buildCompletedResponse(existingCompany, tenantId);
      }

      // Step 13: Completed
      if (nextPhase === "completed") {
        return await buildCompletedResponse(existingCompany, tenantId);
      }
    }

    // Company not found but we have CNPJ — try to create it
    if (memory.headcount) {
      const result = await processCNPJForAgent(memory.cnpj, memory.headcount);
      if (result.found && result.active) {
        const data = result.data!;
        const execResult = await executeCreateCompany({
          cnpj: data.cnpj, name: data.nome_fantasia || data.razao_social,
          sector: result.sector, headcount: memory.headcount,
          street: data.logradouro, number: data.numero, complement: data.complemento,
          neighborhood: data.bairro, city: data.municipio, state: data.uf,
          zipCode: data.cep, contactPhone: data.telefone, contactEmail: data.email,
        }, tenantId, userId);
        if (execResult.success) {
          return {
            content: `**Processo NR-01 iniciado!**\n${execResult.message}\n\n**Proxima etapa:** Criar avaliacao COPSOQ-II.`,
            actions: [{ type: "create_assessment", label: "Criar Avaliacao COPSOQ-II", params: { companyId: execResult.companyId } }],
          };
        }
      }
    }
  }

  // ── 3b-1. Final proposal request ──
  const wantsFinalProposal = msg.includes("proposta final") || msg.includes("proposta detalhada") || msg.includes("proposta completa");

  if (wantsFinalProposal && memory.cnpj) {
    const existingCompany = await findCompanyByCNPJ();
    if (existingCompany) {
      const hc = memory.headcount || 10;
      const riskLevel = memory.highRisk ? "high" as const : "low" as const;
      const fpData = await buildFinalProposalData(
        existingCompany.id, existingCompany.name,
        formatCNPJ(memory.cnpj), hc, memory.sectorName,
      );
      if (fpData) {
        const initialProposal = generatePricingProposal({
          name: existingCompany.name, cnpj: formatCNPJ(memory.cnpj),
          headcount: hc, sector: memory.sector, sectorName: memory.sectorName, riskLevel,
        });
        const content = generateFinalProposal(fpData, initialProposal);

        // Save final proposal to DB with itemized services
        try {
          const db2 = await getDb();
          if (db2) {
            await saveFinalProposal(db2, tenantId, existingCompany.id, existingCompany.name, content, initialProposal, fpData, hc);
          }
        } catch (err: any) {
          log.error("Failed to save final proposal to DB", { error: err.message });
        }

        return {
          content: content + `\n\n✅ Proposta salva! Acesse em **Precificação > Propostas** para visualizar e exportar em PDF.`,
          actions: [{ type: "create_training", label: "Criar Programa de Treinamento", params: { companyId: existingCompany.id } }],
        };
      }
      // No COPSOQ data yet — tell user to complete assessment first
      return {
        content: `A **Proposta Comercial Final** so pode ser gerada apos a conclusao da avaliacao COPSOQ-II e elaboracao do plano de acao.\n\nDiga **"sim"** para iniciar o processo, ou **"proposta"** para ver a estimativa inicial.`,
        actions: [],
      };
    }
  }

  // ── 3b-2. Initial pricing proposal request ──
  const wantsPricing = msg.includes("proposta") || msg.includes("preco") || msg.includes("preço") || msg.includes("orcamento") || msg.includes("orçamento") || msg.includes("valor") || msg.includes("quanto custa") || msg.includes("pricing") || msg.includes("custo") || msg.includes("investimento") || msg.includes("pacote");

  if (wantsPricing && !wantsFinalProposal && memory.cnpj) {
    const existingCompany = await findCompanyByCNPJ();
    if (existingCompany) {
      const hc = memory.headcount || 10;
      const riskLevel = memory.highRisk ? "high" as const : "low" as const;
      const proposal = generatePricingProposal({
        name: existingCompany.name,
        cnpj: formatCNPJ(memory.cnpj),
        headcount: hc,
        sector: memory.sector,
        sectorName: memory.sectorName,
        riskLevel,
      });

      // Save initial proposal to DB with itemized services
      try {
        const db2 = await getDb();
        if (db2) {
          await saveInitialProposal(db2, tenantId, existingCompany.id, existingCompany.name, proposal, hc);
        }
      } catch (err: any) {
        log.error("Failed to save initial proposal to DB", { error: err.message });
      }

      return {
        content: proposal.formatted + `\n\n✅ Proposta salva! Acesse em **Precificação > Propostas** para visualizar e exportar em PDF.`,
        actions: [
          { type: "create_assessment", label: "Aprovar e Iniciar Avaliacao", params: { companyId: existingCompany.id, headcount: hc } },
        ],
      };
    }
    // No company yet but we have CNPJ — try to generate with available data
    if (memory.headcount) {
      const riskLevel = memory.highRisk ? "high" as const : "low" as const;
      const proposal = generatePricingProposal({
        name: memory.companyName || "Empresa",
        cnpj: formatCNPJ(memory.cnpj),
        headcount: memory.headcount,
        sector: memory.sector,
        sectorName: memory.sectorName,
        riskLevel,
      });
      return { content: proposal.formatted, actions: [] };
    }
  }

  // ── 4. Explicit keyword-based actions (copsoq, inventário, treinamento, etc.) ──
  const wantsCopsoq = msg.includes("copsoq") || msg.includes("avaliação") || msg.includes("avaliacao");
  const wantsInventory = msg.includes("inventário") || msg.includes("inventario") || msg.includes("plano de ação") || msg.includes("plano de acao");
  const wantsTraining = msg.includes("treinamento") || msg.includes("capacitação") || msg.includes("capacitacao");
  const wantsCertificate = msg.includes("certificado") || msg.includes("certificação") || msg.includes("certificacao") || msg.includes("checklist") || msg.includes("finalizar");

  if ((wantsCopsoq || wantsInventory || wantsTraining || wantsCertificate) && memory.cnpj) {
    const existingCompany = await findCompanyByCNPJ();
    if (existingCompany) {
      if (wantsCopsoq) {
        const result = await executeCreateAssessment(existingCompany.id, existingCompany.name, memory.headcount || 5);
        return {
          content: result.message + (result.success ? `\n\n**Proxima etapa:** Gerar inventario de riscos.` : ""),
          actions: result.success ? [{ type: "generate_inventory", label: "Gerar Inventario e Plano de Acao", params: { companyId: existingCompany.id } }] : [],
        };
      }
      if (wantsInventory) {
        const db2 = await getDb();
        if (db2) {
          const { copsoqAssessments: cAssessments } = await import("../../drizzle/schema_nr01");
          const [la] = await db2.select().from(cAssessments).where(eq(cAssessments.tenantId, existingCompany.id)).orderBy(desc(cAssessments.createdAt)).limit(1);
          if (la) {
            const result = await executeGenerateInventoryAndPlan(existingCompany.id, la.id, existingCompany.name, memory.headcount || 5);
            if (result.success) {
              // Auto-generate final proposal
              let fpContent = "";
              try {
                const hc = memory.headcount || 5;
                const fpData = await buildFinalProposalData(
                  existingCompany.id, existingCompany.name,
                  memory.cnpj ? formatCNPJ(memory.cnpj) : undefined, hc, memory.sectorName,
                );
                if (fpData) {
                  const riskLevel = memory.highRisk ? "high" as const : "low" as const;
                  const ip = generatePricingProposal({
                    name: existingCompany.name, cnpj: memory.cnpj ? formatCNPJ(memory.cnpj) : undefined,
                    headcount: hc, sector: memory.sector, sectorName: memory.sectorName, riskLevel,
                  });
                  const fpMarkdown = generateFinalProposal(fpData, ip);
                  fpContent = "\n\n" + fpMarkdown;

                  // Save final proposal to DB with itemized services
                  const savedFpId = await saveFinalProposal(db2, tenantId, existingCompany.id, existingCompany.name, fpMarkdown, ip, fpData, hc);
                  if (savedFpId) {
                    fpContent += `\n\n✅ Proposta salva! Acesse em **Precificação > Propostas** para visualizar e exportar em PDF.`;
                  }
                }
              } catch { /* continue without final proposal */ }
              return {
                content: result.message + fpContent + `\n\n**Proxima etapa:** Criar programa de treinamento.`,
                actions: [{ type: "create_training", label: "Criar Programa de Treinamento", params: { companyId: existingCompany.id } }],
              };
            }
            return { content: result.message, actions: [] };
          }
        }
      }
      if (wantsTraining) {
        const result = await executeCreateTraining(existingCompany.id, existingCompany.name);
        return {
          content: result.message + (result.success ? `\n\n**Proxima etapa:** Finalizar e emitir certificado.` : ""),
          actions: result.success ? [{ type: "complete_checklist", label: "Finalizar e Emitir Certificado", params: { companyId: existingCompany.id } }] : [],
        };
      }
      if (wantsCertificate) {
        const result = await executeCompleteChecklist(existingCompany.id);
        return {
          content: result.message + `\n\n✅ **Processo NR-01 concluido com sucesso!**\n\n**Próximo passo:** Gerar a **Proposta Comercial Final** e enviar para aprovação e pagamento.`,
          actions: [{ type: "generate_final_proposal", label: "Gerar Proposta Final", params: { companyId: existingCompany.id } }],
        };
      }
    }
  }

  // ── 5. We have CNPJ in memory but no headcount yet ──
  if (memory.cnpj && !memory.headcount) {
    const numberMatch = userMessage.match(/^(\d+)$/);
    if (numberMatch) {
      const hc = parseInt(numberMatch[1]);
      if (hc > 0 && hc < 100000) {
        const result = await processCNPJForAgent(memory.cnpj, hc);
        if (result.found && result.active) {
          const data = result.data!;
          // Auto-create company with the headcount
          const execResult = await executeCreateCompany({
            cnpj: data.cnpj, name: data.nome_fantasia || data.razao_social,
            sector: result.sector, headcount: hc,
            street: data.logradouro, number: data.numero,
            city: data.municipio, state: data.uf, zipCode: data.cep,
          }, tenantId, userId);
          const content = `Entendido: **${hc} funcionarios**.\n\n` +
            buildStrategyText(hc, result.sector!, result.sectorName!, result.highRisk!) +
            `\n\nEmpresa: **${data.nome_fantasia || data.razao_social}** (${formatCNPJ(memory.cnpj)})` +
            `\n\n${execResult.message}` +
            `\n\n**Proxima etapa:** Criar avaliacao COPSOQ-II.`;
          return {
            content,
            actions: [{ type: "create_assessment", label: "Criar Avaliacao COPSOQ-II", params: { companyId: execResult.companyId || (await findCompanyByCNPJ())?.id, headcount: hc } }],
          };
        }
      }
    }

    return {
      content: `Ja tenho o CNPJ **${formatCNPJ(memory.cnpj)}**${memory.companyName ? ` (${memory.companyName})` : ""}. Para definir a estrategia NR-01, preciso saber: **quantos funcionarios** a empresa possui?`,
      actions: [],
    };
  }

  // ── 6. Status/progress queries ──
  if (msg.includes("status") || msg.includes("progresso") || msg.includes("andamento")) {
    if (status) {
      const completedPhases = status.phases.filter((p: any) => p.status === "completed").length;
      const content = `Progresso atual: **${status.overallProgress}%** (${completedPhases}/10 fases concluidas).\n\nFase atual: **${status.currentPhase}**\n\n${status.nextActions.length > 0 ? "Proximas acoes recomendadas:\n" + status.nextActions.map((a: any) => `- **${a.label}**: ${a.description}`).join("\n") : "Nenhuma acao pendente."}`;
      return { content, actions: status.nextActions.map((a: any) => ({ type: a.actionType, label: a.label, params: a.params || {} })) };
    }
    return { content: "Nenhuma empresa selecionada. Me informe o CNPJ da empresa para verificar o status.", actions: [] };
  }

  // ── 7. Help/capabilities ──
  if (msg.includes("ajuda") || msg.includes("help") || msg.includes("pode fazer") || msg.includes("capaz")) {
    return {
      content: `Sou o **Assistente IA NR-01** da BlackBelt. Posso conduzir **todo o processo de conformidade** automaticamente:\n\n1. **Consulta de CNPJ** — Busco automaticamente os dados na Receita Federal\n2. **Cadastro e Diagnostico** — Classifico o setor e defino a estrategia ideal\n3. **Proposta Comercial** — Gero proposta com precos por porte, pacotes e descontos\n4. **Checklist + Cronograma** — 25 itens obrigatorios + milestones personalizados\n5. **Avaliacao COPSOQ-II** — Crio e envio para os funcionarios responderem\n6. **Analise com IA** — Relatorio com dimensoes criticas identificadas\n7. **Inventario de Riscos** — Classificacao completa dos perigos psicossociais\n8. **Plano de Acao** — Medidas preventivas com cronograma e responsaveis\n9. **Treinamentos** — Programas de capacitacao obrigatorios\n10. **Documentacao PGR/PCMSO** — Geracao automatica\n11. **Certificacao** — Emissao quando compliance >= 80%\n12. **Monitoramento** — Alertas automaticos de prazos, riscos e falhas\n\n**Para comecar, me envie o CNPJ da empresa e o numero de funcionarios.**\nApos cadastrar, diga **"proposta"** para receber a proposta comercial detalhada.`,
      actions: [],
    };
  }

  // ── 8. If we have company in memory, show status with next action ──
  if (memory.cnpj) {
    const existingCompany = await findCompanyByCNPJ();
    if (existingCompany) {
      const nextPhase = await getNextPhase(existingCompany.id);
      if (nextPhase !== "completed" && nextPhase !== "unknown") {
        const phaseLabels: Record<string, string> = {
          create_assessment: "Criar Avaliacao COPSOQ-II",
          generate_inventory: "Gerar Inventario e Plano de Acao",
          create_training: "Criar Programa de Treinamento",
          complete_checklist: "Finalizar e Emitir Certificado",
        };
        return {
          content: `Empresa **${existingCompany.name}** encontrada. A proxima etapa e: **${phaseLabels[nextPhase] || nextPhase}**.\n\nClique no botao abaixo ou diga **"sim"** para continuar o processo.`,
          actions: [{ type: nextPhase, label: phaseLabels[nextPhase] || "Continuar", params: { companyId: existingCompany.id } }],
        };
      }
      if (nextPhase === "completed") {
        return await buildCompletedResponse(existingCompany, tenantId);
      }
    }
  }

  // ── 9. Default response ──
  return {
    content: `Para iniciar o processo de conformidade NR-01, me envie:\n\n- **CNPJ** da empresa (vou consultar automaticamente na Receita Federal)\n- **Numero de funcionarios** (para definir a estrategia de avaliacao)\n- **Email da empresa** (para envio da pre-proposta comercial)\n\nExemplo: *"CNPJ 30.428.133/0001-24, 50 funcionarios, email rh@empresa.com"*\n\nOu pergunte sobre o **status** de uma empresa ja cadastrada, ou peca **ajuda** para ver todas as funcionalidades.`,
    actions: [],
  };
}

export const agentRouter = router({
  // Start or get conversation
  getOrCreateConversation: tenantProcedure
    .input(z.object({
      companyId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [
        eq(agentConversations.tenantId, ctx.tenantId!),
        eq(agentConversations.userId, ctx.user!.id),
        sql`(${agentConversations.companyId} IS NULL OR ${agentConversations.companyId} NOT IN ('support', 'monitoring-agent'))`,
      ];
      if (input.companyId) {
        conditions.push(eq(agentConversations.companyId, input.companyId));
      }

      const [existing] = await db.select().from(agentConversations)
        .where(and(...conditions))
        .orderBy(desc(agentConversations.updatedAt))
        .limit(1);

      if (existing) return existing;

      const id = nanoid();
      await db.insert(agentConversations).values({
        id,
        tenantId: ctx.tenantId!,
        userId: ctx.user!.id,
        companyId: input.companyId || null,
        title: "SamurAI",
        phase: "ONBOARDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id, tenantId: ctx.tenantId!, userId: ctx.user!.id, companyId: input.companyId || null, title: "Assistente NR-01", phase: "ONBOARDING" };
    }),

  // Send message and get AI response
  sendMessage: tenantProcedure
    .input(z.object({
      conversationId: z.string(),
      content: z.string().min(1).max(5000),
      companyId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Save user message
      const userMsgId = nanoid();
      await db.insert(agentMessages).values({
        id: userMsgId,
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
        createdAt: new Date(),
      });

      // Build context
      const targetTenantId = input.companyId || ctx.tenantId!;
      let status = null;
      let company = null;
      let alerts: any[] = [];

      try {
        status = await getNR01Status(targetTenantId);
      } catch { /* no status yet */ }

      try {
        const dbInstance = await getDb();
        if (dbInstance) {
          const { tenants } = await import("../../drizzle/schema");
          const [tenant] = await dbInstance.select().from(tenants).where(eq(tenants.id, targetTenantId)).limit(1);
          if (tenant) {
            company = {
              tenantId: tenant.id,
              companyName: tenant.name,
              cnpj: (tenant as any).cnpj || "",
              sector: (tenant as any).sector || undefined,
              headcount: (tenant as any).headcount || undefined,
              tenantType: (tenant as any).tenantType || "company",
            };
          }
        }
      } catch { /* no company data */ }

      try {
        const dbAlerts = await db.select().from(agentAlerts)
          .where(and(eq(agentAlerts.tenantId, targetTenantId), eq(agentAlerts.dismissed, false)))
          .orderBy(desc(agentAlerts.createdAt))
          .limit(10);
        alerts = dbAlerts;
      } catch { /* no alerts */ }

      // Fetch recent conversation history (last 20 messages)
      const recentMessages = await db.select().from(agentMessages)
        .where(eq(agentMessages.conversationId, input.conversationId))
        .orderBy(desc(agentMessages.createdAt))
        .limit(20);

      const orderedHistory = [...recentMessages].reverse();

      // AUTO-LOOKUP: If user message contains a CNPJ, enrich LLM context
      const cnpj = extractCNPJ(input.content);
      let cnpjContext = "";
      if (cnpj) {
        const cnpjResult = await processCNPJForAgent(cnpj, extractHeadcount(input.content));
        if (cnpjResult.found && cnpjResult.active) {
          const d = cnpjResult.data!;
          cnpjContext = `\n\n[DADOS DO CNPJ CONSULTADOS NA RECEITA FEDERAL]
Razão Social: ${d.razao_social}
Nome Fantasia: ${d.nome_fantasia || "N/A"}
CNPJ: ${formatCNPJ(cnpj)}
CNAE: ${d.cnae_fiscal} - ${d.cnae_fiscal_descricao}
Setor NR-01: ${cnpjResult.sectorName} ${cnpjResult.highRisk ? "(ALTO RISCO PSICOSSOCIAL)" : ""}
Porte: ${d.porte}
Situação: ${d.situacao_cadastral}
Endereço: ${cnpjResult.address}
CEP: ${d.cep}
Telefone: ${d.telefone || "N/A"}
Email: ${d.email || "N/A"}
Início Atividade: ${d.data_inicio_atividade}
${extractHeadcount(input.content) ? `Funcionários informados: ${extractHeadcount(input.content)}` : "Número de funcionários: NÃO INFORMADO (perguntar ao usuário)"}`;
        } else if (cnpjResult.message) {
          cnpjContext = `\n\n[CNPJ LOOKUP]: ${cnpjResult.message}`;
        }
      }

      // Build LLM messages
      const systemPrompt = buildAgentSystemPrompt();
      const contextMessage = buildContextMessage(company, status, alerts.map(a => ({
        alertType: a.alertType,
        severity: a.severity,
        title: a.title,
        message: a.message,
      })));

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        { role: "system" as const, content: contextMessage + cnpjContext },
        ...orderedHistory.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      // ALWAYS use programmatic flow (fallback) — it follows the exact 13-step flowchart
      // LLM is NOT used for the NR-01 agent (it generates descriptive text instead of executing actions)
      let assistantContent = "";
      let actions: Array<{ type: string; label: string; params: Record<string, any> }> = [];

      const fallback = await generateFallbackResponse(input.content, company, status, orderedHistory, ctx.tenantId!, ctx.user!.id);
      assistantContent = fallback.content;
      actions = fallback.actions;

      // Save assistant message
      const assistantMsgId = nanoid();
      await db.insert(agentMessages).values({
        id: assistantMsgId,
        conversationId: input.conversationId,
        role: "assistant",
        content: assistantContent,
        metadata: actions.length > 0 ? { actions } : null,
        actionType: actions.length > 0 ? actions[0].type : null,
        actionPayload: actions.length > 0 ? actions[0].params : null,
        createdAt: new Date(),
      });

      // Update conversation
      await db.update(agentConversations)
        .set({ updatedAt: new Date() })
        .where(eq(agentConversations.id, input.conversationId));

      // Scan for alerts in the background
      scanTenantAlerts(ctx.tenantId!, input.companyId).catch(() => {});

      return {
        userMessage: { id: userMsgId, role: "user", content: input.content },
        assistantMessage: {
          id: assistantMsgId,
          role: "assistant",
          content: assistantContent,
          actions,
        },
      };
    }),

  // Get conversation history
  getHistory: tenantProcedure
    .input(z.object({
      conversationId: z.string(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const messages = await db.select().from(agentMessages)
        .where(eq(agentMessages.conversationId, input.conversationId))
        .orderBy(agentMessages.createdAt)
        .limit(input.limit)
        .offset(input.offset);

      return messages.map(m => ({
        ...m,
        actions: m.metadata && typeof m.metadata === "object" && "actions" in (m.metadata as any)
          ? (m.metadata as any).actions
          : [],
      }));
    }),

  // Get NR-01 status for a company
  getStatus: tenantProcedure
    .input(z.object({ companyId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const targetTenantId = input.companyId || ctx.tenantId!;
      try {
        return await getNR01Status(targetTenantId);
      } catch {
        return null;
      }
    }),

  // Get strategy recommendation
  getStrategy: tenantProcedure
    .input(z.object({
      headcount: z.number(),
      sector: z.string().optional(),
    }))
    .query(({ input }) => {
      return getCompanyStrategy(input.headcount, input.sector);
    }),

  // Get active alerts
  getAlerts: tenantProcedure
    .input(z.object({
      companyId: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const targetTenantId = input.companyId || ctx.tenantId!;
      await scanTenantAlerts(ctx.tenantId!, input.companyId);

      const alerts = await db.select().from(agentAlerts)
        .where(and(
          eq(agentAlerts.tenantId, targetTenantId),
          eq(agentAlerts.dismissed, false)
        ))
        .orderBy(desc(agentAlerts.createdAt))
        .limit(input.limit);

      return alerts;
    }),

  // Dismiss an alert
  dismissAlert: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.update(agentAlerts)
        .set({ dismissed: true, dismissedAt: new Date() })
        .where(and(eq(agentAlerts.id, input.id), eq(agentAlerts.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // List conversations
  listConversations: tenantProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return db.select().from(agentConversations)
        .where(and(
          eq(agentConversations.tenantId, ctx.tenantId!),
          eq(agentConversations.userId, ctx.user!.id)
        ))
        .orderBy(desc(agentConversations.updatedAt))
        .limit(20);
    }),

  // Delete a conversation and all its messages
  deleteConversation: tenantProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify ownership
      const [conv] = await db.select().from(agentConversations)
        .where(and(
          eq(agentConversations.id, input.conversationId),
          eq(agentConversations.tenantId, ctx.tenantId!),
          eq(agentConversations.userId, ctx.user!.id)
        ))
        .limit(1);

      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversa não encontrada" });

      // Delete messages first, then conversation
      await db.delete(agentMessages).where(eq(agentMessages.conversationId, input.conversationId));
      await db.delete(agentConversations).where(eq(agentConversations.id, input.conversationId));

      return { success: true };
    }),

  // Start a new conversation (force create, ignoring existing)
  newConversation: tenantProcedure
    .input(z.object({ companyId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const id = nanoid();
      await db.insert(agentConversations).values({
        id,
        tenantId: ctx.tenantId!,
        userId: ctx.user!.id,
        companyId: input.companyId || null,
        title: "SamurAI",
        phase: "ONBOARDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id, tenantId: ctx.tenantId!, userId: ctx.user!.id, companyId: input.companyId || null, title: "Assistente NR-01", phase: "ONBOARDING" };
    }),
});
