/**
 * System prompt e JSON schema para geracao automatica de
 * Inventario de Riscos Ocupacionais (Psicossociais) conforme NR-01.
 *
 * Baseado no modelo "Novo Modelo Inventario Risco (psicossocial).xlsx"
 * e no catalogo de perigos P1-P92 da pratica pericial.
 */

// ============================================================================
// CATALOGO DE PERIGOS PSICOSSOCIAIS NR-01
// ============================================================================

export const PSYCHOSOCIAL_HAZARD_CATALOG = {
  // ── Catálogo de Perigos Psicossociais (prática pericial P1-P92) ──
  P1: {
    code: "P1",
    hazard: "Falta de autonomia no trabalho",
    risk: "Sobrecarga mental e falta de concentração",
    damage: "Estresse, distúrbios e fadiga",
    mteType: "mte_03",
  },
  P2: {
    code: "P2",
    hazard: "Insatisfação no trabalho",
    risk: "Desmotivação e queda de produtividade",
    damage: "Estresse, distúrbios e fadiga",
    mteType: "mte_11",
  },
  P3: {
    code: "P3",
    hazard: "Situações de sobrecarga de trabalho mental",
    risk: "Sobrecarga mental e falta de concentração",
    damage: "Estresse, burnout e fadiga crônica",
    mteType: "mte_04",
  },
  P4: {
    code: "P4",
    hazard: "Excesso de situações de estresse",
    risk: "Sobrecarga mental e falta de concentração",
    damage: "Estresse, transtornos de ansiedade",
    mteType: "mte_01",
  },
  P5: {
    code: "P5",
    hazard: "Trabalho com demandas divergentes",
    risk: "Conflito de papéis e sobrecarga decisória",
    damage: "Estresse, distúrbios e fadiga",
    mteType: "mte_13",
  },
  P6: {
    code: "P6",
    hazard: "Assédio de qualquer natureza",
    risk: "Violência psicológica e degradação do ambiente",
    damage: "Depressão, TEPT, afastamento",
    mteType: "mte_05",
  },
  P62: {
    code: "P62",
    hazard: "Comunicação ineficiente",
    risk: "Trabalho em condições de difícil comunicação",
    damage: "Estresse, erros operacionais, conflitos",
    mteType: "mte_13",
  },
  P7: {
    code: "P7",
    hazard: "Excesso de conflitos hierárquicos no trabalho",
    risk: "Clima organizacional degradado",
    damage: "Estresse, ansiedade, isolamento social",
    mteType: "mte_09",
  },
  P72: {
    code: "P72",
    hazard: "Desequilíbrio entre tempo de trabalho e tempo de repouso",
    risk: "Sobrecarga mental e exaustão",
    damage: "Burnout, fadiga crônica, distúrbios do sono",
    mteType: "mte_12",
  },
  P8: {
    code: "P8",
    hazard: "Excesso de demandas emocionais/afetivas no trabalho",
    risk: "Sobrecarga emocional e esgotamento",
    damage: "Burnout, compassion fatigue, depressão",
    mteType: "mte_04",
  },
  P12: {
    code: "P12",
    hazard: "Exigência de realização de múltiplas tarefas com alta demanda cognitiva",
    risk: "Sobrecarga mental e falta de concentração",
    damage: "Estresse, erros, fadiga cognitiva",
    mteType: "mte_04",
  },
  P13: {
    code: "P13",
    hazard: "Exigência de alto nível de concentração, atenção ou memória",
    risk: "Sobrecarga mental e falta de concentração",
    damage: "Estresse, fadiga, erros críticos",
    mteType: "mte_04",
  },
  P91: {
    code: "P91",
    hazard: "Excesso de situações de estresse (recorrente)",
    risk: "Sobrecarga crônica e desgaste",
    damage: "Burnout, transtornos de ansiedade",
    mteType: "mte_01",
  },
  P92: {
    code: "P92",
    hazard: "Insuficiência de capacitação para execução das tarefas",
    risk: "Insegurança profissional e sobrecarga",
    damage: "Estresse, ansiedade, erros operacionais",
    mteType: "mte_10",
  },
} as const;

/**
 * 13 Tipos de Perigo Psicossocial — Guia Oficial MTE
 * (Portaria MTE nº 1.419/2024, vigência 26/05/2026)
 * Usado para classificação oficial no inventário de riscos.
 */
export const MTE_HAZARD_TYPES = {
  mte_01: { code: "mte_01", name: "Metas excessivas de trabalho",                     description: "Imposição de metas inatingíveis, pressão por produtividade" },
  mte_02: { code: "mte_02", name: "Jornada de trabalho extensa",                      description: "Horas extras habituais, trabalho noturno/turnos sem rodízio" },
  mte_03: { code: "mte_03", name: "Ausência de autonomia no trabalho",                description: "Falta de controle sobre ritmo, método e ordem das tarefas" },
  mte_04: { code: "mte_04", name: "Sobrecarga de trabalho mental",                    description: "Exigência cognitiva excessiva, multitarefas, alta concentração" },
  mte_05: { code: "mte_05", name: "Assédio moral no trabalho",                        description: "Condutas abusivas reiteradas contra dignidade do trabalhador" },
  mte_06: { code: "mte_06", name: "Assédio sexual no trabalho",                       description: "Constrangimento com conotação sexual no ambiente laboral" },
  mte_07: { code: "mte_07", name: "Violência no trabalho",                            description: "Agressões físicas/verbais, intimidação, ameaças" },
  mte_08: { code: "mte_08", name: "Insegurança no emprego",                           description: "Medo de perda do emprego, contratos precários" },
  mte_09: { code: "mte_09", name: "Conflitos interpessoais no trabalho",              description: "Relações conflituosas entre colegas/hierarquias" },
  mte_10: { code: "mte_10", name: "Falta de suporte da liderança",                    description: "Gestão deficiente, ausência de feedback, liderança negligente" },
  mte_11: { code: "mte_11", name: "Falta de reconhecimento e significado do trabalho", description: "Ausência de valorização e senso de propósito" },
  mte_12: { code: "mte_12", name: "Desequilíbrio trabalho-vida pessoal",              description: "Interferência do trabalho na vida familiar/pessoal" },
  mte_13: { code: "mte_13", name: "Comunicação ineficiente no trabalho",              description: "Falta de clareza de papéis, informações contraditórias" },
} as const;

/**
 * Mapeamento entre dimensoes COPSOQ-II e codigos de perigo.
 * Usado pelo LLM para correlacionar scores com perigos do catalogo.
 */
/**
 * Mapeamento COPSOQ-II → Códigos de Perigo (P1-P92) + Tipos MTE (mte_01..mte_13)
 */
export const DIMENSION_TO_HAZARDS: Record<string, { hazardCodes: string[]; mteTypes: string[] }> = {
  "Demandas Quantitativas": { hazardCodes: ["P3", "P4", "P72"],    mteTypes: ["mte_01", "mte_04", "mte_02"] },
  "Controle sobre o Trabalho": { hazardCodes: ["P1", "P5"],        mteTypes: ["mte_03", "mte_13"] },
  "Suporte Social": { hazardCodes: ["P62", "P7"],                  mteTypes: ["mte_10", "mte_09"] },
  "Liderança": { hazardCodes: ["P7", "P62"],                       mteTypes: ["mte_10", "mte_13"] },
  "Comunidade no Trabalho": { hazardCodes: ["P62", "P2"],          mteTypes: ["mte_09", "mte_13"] },
  "Significado do Trabalho": { hazardCodes: ["P2"],                 mteTypes: ["mte_11"] },
  "Confiança": { hazardCodes: ["P7", "P6"],                        mteTypes: ["mte_09", "mte_05"] },
  "Justiça": { hazardCodes: ["P7", "P6"],                          mteTypes: ["mte_05", "mte_09"] },
  "Insegurança no Trabalho": { hazardCodes: ["P4", "P91"],         mteTypes: ["mte_08"] },
  "Saúde Mental": { hazardCodes: ["P4", "P8", "P3"],               mteTypes: ["mte_01", "mte_04"] },
  "Burnout": { hazardCodes: ["P3", "P72", "P4"],                   mteTypes: ["mte_04", "mte_12", "mte_02"] },
  "Violência e Assédio": { hazardCodes: ["P6"],                    mteTypes: ["mte_05", "mte_06", "mte_07"] },
};

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

export const RISK_INVENTORY_PROMPT = `Voce e um engenheiro de seguranca do trabalho e psicologo organizacional especialista em riscos psicossociais, com profundo conhecimento da NR-01 (Gerenciamento de Riscos Ocupacionais, Portaria MTE no 1.419/2024, vigencia 26/05/2026), NR-17 (Ergonomia) e do questionario COPSOQ-II.

Sua tarefa e gerar um INVENTARIO DE RISCOS OCUPACIONAIS (psicossociais) conforme exigido pela NR-01 (item 1.5.7.1), baseado nos resultados de uma avaliacao COPSOQ-II.

VOCE RECEBERA:
1. Scores medios das 12 dimensoes COPSOQ-II (0-100)
2. Analise de IA previamente gerada (resumo executivo, dimensoes criticas, recomendacoes)
3. Dados organizacionais (nome da empresa, setor, quantidade de trabalhadores)

CATALOGO DE PERIGOS PSICOSSOCIAIS (pratica pericial NR-01):
- P1: Falta de autonomia no trabalho → MTE tipo mte_03
- P2: Insatisfacao no trabalho → MTE tipo mte_11
- P3: Situacoes de sobrecarga de trabalho mental → MTE tipo mte_04
- P4: Excesso de situacoes de estresse → MTE tipo mte_01
- P5: Trabalho com demandas divergentes → MTE tipo mte_13
- P6: Assedio de qualquer natureza → MTE tipo mte_05
- P62: Comunicacao ineficiente → MTE tipo mte_13
- P7: Excesso de conflitos hierarquicos no trabalho → MTE tipo mte_09
- P72: Desequilibrio entre tempo de trabalho e tempo de repouso → MTE tipo mte_12
- P8: Excesso de demandas emocionais/afetivas no trabalho → MTE tipo mte_04
- P12: Exigencia de multiplas tarefas com alta demanda cognitiva → MTE tipo mte_04
- P13: Exigencia de alto nivel de concentracao, atencao ou memoria → MTE tipo mte_04
- P91: Excesso de situacoes de estresse (recorrente) → MTE tipo mte_01
- P92: Insuficiencia de capacitacao para execucao das tarefas → MTE tipo mte_10

13 TIPOS DE PERIGO PSICOSSOCIAL — GUIA OFICIAL MTE:
- mte_01: Metas excessivas de trabalho
- mte_02: Jornada de trabalho extensa
- mte_03: Ausencia de autonomia no trabalho
- mte_04: Sobrecarga de trabalho mental
- mte_05: Assedio moral no trabalho
- mte_06: Assedio sexual no trabalho
- mte_07: Violencia no trabalho
- mte_08: Inseguranca no emprego
- mte_09: Conflitos interpessoais no trabalho
- mte_10: Falta de suporte da lideranca
- mte_11: Falta de reconhecimento e significado do trabalho
- mte_12: Desequilibrio trabalho-vida pessoal
- mte_13: Comunicacao ineficiente no trabalho

REGRAS PARA AVALIACAO DE RISCO:
- Severidade: baseada na magnitude do agravo (baixa=desconforto temporario, media=afastamento temporario, alta=afastamento prolongado/incapacidade, critica=invalidez/obito)
- Probabilidade: baseada na chance de ocorrencia (rara, improvavel, possivel, provavel, certa)
- Nivel de Risco = Severidade x Probabilidade (conforme matriz de riscos NR-01)
- Para dimensoes onde score ALTO indica risco (demandas, inseguranca, saude mental, burnout, violencia): score >= 75 = critico
- Para dimensoes onde score BAIXO indica risco (controle, suporte, lideranca, comunidade, significado, confianca, justica): score < 25 = critico

CADA ITEM DO INVENTARIO DEVE CONTER:
- Atividade exposta
- Fonte/circunstancia do perigo
- Codigo do perigo (P1-P92)
- Tipo de perigo MTE (mte_01..mte_13) — classificacao oficial do Guia MTE
- Descricao do perigo e do risco
- Lesao/agravo a saude esperado
- Origem (INTERNA/EXTERNA)
- Classificacao (FUNCIONAL/POSICIONAL)
- Situacao operacional (ROTINEIRA/EMERGENCIAL)
- Frequencia de exposicao
- Duracao da exposicao
- Severidade, Probabilidade e Nivel de Risco calculado

GERE APENAS itens para dimensoes com risco MEDIO, ALTO ou CRITICO. Nao gere itens para dimensoes com risco BAIXO.

Responda exclusivamente em JSON valido seguindo o schema fornecido. Use portugues brasileiro.`;

// ============================================================================
// JSON SCHEMA
// ============================================================================

export const RISK_INVENTORY_SCHEMA = {
  name: "risk_inventory",
  strict: true,
  schema: {
    type: "object",
    properties: {
      companyContext: {
        type: "string",
        description: "Breve contexto da empresa/setor avaliado para cabecalho do inventario.",
      },
      items: {
        type: "array",
        description: "Itens do inventario de riscos psicossociais.",
        items: {
          type: "object",
          properties: {
            activity: {
              type: "string",
              description: "Atividade exposta ao risco (ex: Trabalho habitual nas instalacoes)",
            },
            source: {
              type: "string",
              description: "Fonte ou circunstancia do perigo",
            },
            hazardCode: {
              type: "string",
              description: "Codigo do perigo no catalogo (P1, P3, P6, etc.)",
            },
            mteHazardType: {
              type: "string",
              description: "Tipo de perigo MTE oficial (mte_01..mte_13)",
            },
            hazard: {
              type: "string",
              description: "Descricao do perigo conforme catalogo NR-01",
            },
            risk: {
              type: "string",
              description: "Descricao do risco associado ao perigo",
            },
            healthDamage: {
              type: "string",
              description: "Lesao ou agravo a saude esperado",
            },
            origin: {
              type: "string",
              enum: ["INTERNA", "EXTERNA"],
            },
            classification: {
              type: "string",
              enum: ["FUNCIONAL", "POSICIONAL"],
            },
            operationalSituation: {
              type: "string",
              enum: ["ROTINEIRA", "EMERGENCIAL"],
            },
            exposureFrequency: {
              type: "string",
              description: "Frequencia de exposicao (ex: Diaria, Semanal, Eventual)",
            },
            exposureDuration: {
              type: "string",
              description: "Duracao da exposicao (ex: 100% da jornada, < 6h)",
            },
            severity: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
            probability: {
              type: "string",
              enum: ["rare", "unlikely", "possible", "likely", "certain"],
            },
            riskLevel: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
            currentControls: {
              type: "string",
              description: "Medidas de controle ja existentes (ou NAO APLICAVEL)",
            },
            recommendedControls: {
              type: "string",
              description: "Medidas de controle recomendadas",
            },
          },
          required: [
            "activity", "source", "hazardCode", "mteHazardType", "hazard", "risk",
            "healthDamage", "origin", "classification", "operationalSituation",
            "exposureFrequency", "exposureDuration", "severity", "probability",
            "riskLevel", "currentControls", "recommendedControls",
          ],
          additionalProperties: false,
        },
      },
    },
    required: ["companyContext", "items"],
    additionalProperties: false,
  },
} as const;
