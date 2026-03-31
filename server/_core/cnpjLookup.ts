/**
 * CNPJ Lookup via BrasilAPI (gratuita, sem autenticação)
 * Retorna dados da empresa: razão social, CNAE, endereço, etc.
 */

import { log } from "./logger";

export interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  natureza_juridica: string;
  porte: string; // "MICRO EMPRESA", "EMPRESA DE PEQUENO PORTE", etc.
  situacao_cadastral: string; // "ATIVA", "BAIXADA", etc.
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  data_inicio_atividade: string;
  // CNAE secondários
  cnaes_secundarios: Array<{ codigo: number; descricao: string }>;
}

/**
 * Mapeia o CNAE para um setor simplificado para estratégia NR-01
 */
function cnaeToSector(cnaeCode: number, description: string): string {
  const desc = description.toLowerCase();
  const code = String(cnaeCode);

  // Saúde (CNAE 86-88)
  if (code.startsWith("86") || code.startsWith("87") || code.startsWith("88") ||
      desc.includes("saúde") || desc.includes("saude") || desc.includes("hospital") ||
      desc.includes("clínica") || desc.includes("clinica") || desc.includes("médic") || desc.includes("medic") ||
      desc.includes("enferm") || desc.includes("odontol") || desc.includes("fisioter") ||
      desc.includes("farmac") || desc.includes("laborat")) {
    return "saude";
  }

  // Educação (CNAE 85)
  if (code.startsWith("85") || desc.includes("educa") || desc.includes("ensino") ||
      desc.includes("escola") || desc.includes("universid") || desc.includes("faculdade") ||
      desc.includes("creche") || desc.includes("treinamento")) {
    return "educacao";
  }

  // Segurança (CNAE 80)
  if (code.startsWith("80") || desc.includes("seguran") || desc.includes("vigilân") ||
      desc.includes("vigilanc")) {
    return "seguranca";
  }

  // Indústria / Fabricação (CNAE 10-33)
  if (/^(1[0-9]|2[0-9]|3[0-3])/.test(code) || desc.includes("fabricação") || desc.includes("fabricacao") ||
      desc.includes("indústria") || desc.includes("industria") || desc.includes("manufat") ||
      desc.includes("metalúrg") || desc.includes("metalurg") || desc.includes("siderúrg")) {
    return "industria";
  }

  // Construção (CNAE 41-43)
  if (code.startsWith("41") || code.startsWith("42") || code.startsWith("43") ||
      desc.includes("construção") || desc.includes("construcao") || desc.includes("obra") ||
      desc.includes("engenharia civil")) {
    return "construcao";
  }

  // Transporte / Logística (CNAE 49-53)
  if (/^(49|5[0-3])/.test(code) || desc.includes("transport") || desc.includes("logíst") ||
      desc.includes("logist") || desc.includes("correio") || desc.includes("entrega")) {
    return "transporte";
  }

  // Comércio (CNAE 45-47)
  if (code.startsWith("45") || code.startsWith("46") || code.startsWith("47") ||
      desc.includes("comércio") || desc.includes("comercio") || desc.includes("varejo") ||
      desc.includes("atacado") || desc.includes("loja")) {
    return "comercio";
  }

  // TI / Tecnologia (CNAE 62-63)
  if (code.startsWith("62") || code.startsWith("63") || desc.includes("software") ||
      desc.includes("tecnologia") || desc.includes("informática") || desc.includes("informatica") ||
      desc.includes("programa") || desc.includes("sistema") || desc.includes("dados")) {
    return "tecnologia";
  }

  // Financeiro (CNAE 64-66)
  if (code.startsWith("64") || code.startsWith("65") || code.startsWith("66") ||
      desc.includes("financ") || desc.includes("banco") || desc.includes("seguro") ||
      desc.includes("crédito") || desc.includes("credito")) {
    return "financeiro";
  }

  // Alimentação / Restaurante (CNAE 56)
  if (code.startsWith("56") || desc.includes("restaur") || desc.includes("aliment") ||
      desc.includes("refeiç") || desc.includes("refeic") || desc.includes("bar ") ||
      desc.includes("lanchonete") || desc.includes("cafeteria")) {
    return "alimentacao";
  }

  // Serviços sociais
  if (desc.includes("social") || desc.includes("assistência") || desc.includes("assistencia") ||
      desc.includes("ong") || desc.includes("associação") || desc.includes("fundação")) {
    return "servicos_sociais";
  }

  // Default: Serviços / Corporativo
  return "servicos";
}

/**
 * Determina se o setor é de alto risco psicossocial
 */
export function isHighRiskSector(sector: string): boolean {
  return ["saude", "educacao", "seguranca", "servicos_sociais", "transporte"].includes(sector);
}

/**
 * Retorna label amigável do setor
 */
export function sectorLabel(sector: string): string {
  const labels: Record<string, string> = {
    saude: "Saúde",
    educacao: "Educação",
    seguranca: "Segurança",
    industria: "Indústria",
    construcao: "Construção Civil",
    transporte: "Transporte/Logística",
    comercio: "Comércio",
    tecnologia: "Tecnologia da Informação",
    financeiro: "Financeiro/Seguros",
    alimentacao: "Alimentação/Restaurantes",
    servicos_sociais: "Serviços Sociais",
    servicos: "Serviços/Corporativo",
  };
  return labels[sector] || sector;
}

/**
 * Consulta dados de CNPJ via ReceitaWS (primário) com fallback para BrasilAPI
 */
export async function lookupCNPJ(cnpj: string): Promise<CNPJData | null> {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return null;

  // Try multiple APIs with fallback chain
  const result = await lookupReceitaWS(cleaned) || await lookupBrasilAPI(cleaned) || await lookupPublicaCNPJ(cleaned);
  return result;
}

async function lookupReceitaWS(cleaned: string): Promise<CNPJData | null> {
  try {
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cleaned}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      log.warn(`[CNPJ ReceitaWS] API returned ${response.status} for ${cleaned}`);
      return null;
    }

    const data = await response.json() as any;

    if (data.status === "ERROR") {
      log.warn(`[CNPJ ReceitaWS] Error: ${data.message}`);
      return null;
    }

    // ReceitaWS has different field structure
    const atividadePrincipal = data.atividade_principal?.[0] || {};
    const cnaeCode = parseInt(String(atividadePrincipal.code || "0").replace(/\D/g, "")) || 0;

    return {
      cnpj: cleaned,
      razao_social: data.nome || "",
      nome_fantasia: data.fantasia || "",
      cnae_fiscal: cnaeCode,
      cnae_fiscal_descricao: atividadePrincipal.text || "",
      natureza_juridica: data.natureza_juridica || "",
      porte: data.porte || "",
      situacao_cadastral: data.situacao || "",
      logradouro: data.logradouro || "",
      numero: data.numero || "",
      complemento: data.complemento || "",
      bairro: data.bairro || "",
      municipio: data.municipio || "",
      uf: data.uf || "",
      cep: (data.cep || "").replace(/\D/g, ""),
      telefone: data.telefone || "",
      email: data.email || "",
      data_inicio_atividade: data.abertura || "",
      cnaes_secundarios: (data.atividades_secundarias || []).map((c: any) => ({
        codigo: parseInt(String(c.code || "0").replace(/\D/g, "")) || 0,
        descricao: c.text || "",
      })),
    };
  } catch (error) {
    log.error(`[CNPJ ReceitaWS] Error fetching ${cleaned}`, { error: String(error) });
    return null;
  }
}

async function lookupBrasilAPI(cleaned: string): Promise<CNPJData | null> {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      log.warn(`[CNPJ BrasilAPI] API returned ${response.status} for ${cleaned}`);
      return null;
    }

    const data = await response.json() as any;

    return {
      cnpj: cleaned,
      razao_social: data.razao_social || "",
      nome_fantasia: data.nome_fantasia || "",
      cnae_fiscal: data.cnae_fiscal || 0,
      cnae_fiscal_descricao: data.cnae_fiscal_descricao || "",
      natureza_juridica: data.natureza_juridica || "",
      porte: data.porte || "",
      situacao_cadastral: data.descricao_situacao_cadastral || "",
      logradouro: data.logradouro || "",
      numero: data.numero || "",
      complemento: data.complemento || "",
      bairro: data.bairro || "",
      municipio: data.municipio || "",
      uf: data.uf || "",
      cep: data.cep || "",
      telefone: data.ddd_telefone_1 || "",
      email: data.email || "",
      data_inicio_atividade: data.data_inicio_atividade || "",
      cnaes_secundarios: (data.cnaes_secundarios || []).map((c: any) => ({
        codigo: c.codigo,
        descricao: c.descricao,
      })),
    };
  } catch (error) {
    log.error(`[CNPJ BrasilAPI] Error fetching ${cleaned}`, { error: String(error) });
    return null;
  }
}

async function lookupPublicaCNPJ(cleaned: string): Promise<CNPJData | null> {
  try {
    const response = await fetch(`https://publica.cnpj.ws/cnpj/${cleaned}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      log.warn(`[CNPJ publica.cnpj.ws] API returned ${response.status} for ${cleaned}`);
      return null;
    }

    const data = await response.json() as any;
    const estab = data.estabelecimento || {};
    const atPrincipal = estab.atividade_principal || {};

    return {
      cnpj: cleaned,
      razao_social: data.razao_social || "",
      nome_fantasia: estab.nome_fantasia || "",
      cnae_fiscal: parseInt(String(atPrincipal.id || "0")) || 0,
      cnae_fiscal_descricao: atPrincipal.descricao || "",
      natureza_juridica: data.natureza_juridica?.descricao || "",
      porte: data.porte?.descricao || "",
      situacao_cadastral: estab.situacao_cadastral || "",
      logradouro: estab.logradouro || "",
      numero: estab.numero || "",
      complemento: estab.complemento || "",
      bairro: estab.bairro || "",
      municipio: estab.cidade?.nome || "",
      uf: estab.estado?.sigla || "",
      cep: estab.cep || "",
      telefone: estab.ddd1 ? `(${estab.ddd1}) ${estab.telefone1}` : "",
      email: estab.email || "",
      data_inicio_atividade: estab.data_inicio_atividade || "",
      cnaes_secundarios: (estab.atividades_secundarias || []).map((c: any) => ({
        codigo: parseInt(String(c.id || "0")) || 0,
        descricao: c.descricao || "",
      })),
    };
  } catch (error) {
    log.error(`[CNPJ publica.cnpj.ws] Error fetching ${cleaned}`, { error: String(error) });
    return null;
  }
}

/**
 * Formata CNPJ para exibição: 00.000.000/0000-00
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return cnpj;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
}

/**
 * Processa dados do CNPJ e retorna informações estruturadas para o agente
 */
export async function processCNPJForAgent(cnpj: string, headcount?: number) {
  const data = await lookupCNPJ(cnpj);

  if (!data) {
    return {
      found: false,
      cnpj: cnpj.replace(/\D/g, ""),
      message: `Não consegui consultar os dados do CNPJ ${formatCNPJ(cnpj)} na Receita Federal. Verifique se o CNPJ está correto.`,
    };
  }

  if (data.situacao_cadastral !== "ATIVA") {
    return {
      found: true,
      data,
      active: false,
      message: `O CNPJ ${formatCNPJ(cnpj)} está com situação **${data.situacao_cadastral}** na Receita Federal. Apenas empresas com situação ATIVA podem iniciar o processo NR-01.`,
    };
  }

  const sector = cnaeToSector(data.cnae_fiscal, data.cnae_fiscal_descricao);
  const highRisk = isHighRiskSector(sector);
  const sectorName = sectorLabel(sector);

  const address = [data.logradouro, data.numero, data.complemento, data.bairro, data.municipio, data.uf]
    .filter(Boolean)
    .join(", ");

  return {
    found: true,
    data,
    active: true,
    sector,
    sectorName,
    highRisk,
    address,
    headcount,
    companyName: data.nome_fantasia || data.razao_social,
    message: null,
  };
}
