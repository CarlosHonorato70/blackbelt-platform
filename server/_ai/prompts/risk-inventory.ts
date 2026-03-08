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
  P1: {
    code: "P1",
    hazard: "Falta de autonomia no trabalho",
    risk: "Sobrecarga mental e falta de concentracao",
    damage: "Estresse, disturbios e fadiga",
  },
  P2: {
    code: "P2",
    hazard: "Insatisfacao no trabalho",
    risk: "Sobrecarga mental e falta de concentracao",
    damage: "Estresse, disturbios e fadiga",
  },
  P3: {
    code: "P3",
    hazard: "Situacoes de sobrecarga de trabalho mental",
    risk: "Sobrecarga mental e falta de concentracao",
    damage: "Estresse, disturbios e fadiga",
  },
  P4: {
    code: "P4",
    hazard: "Excesso de situacoes de estresse",
    risk: "Sobrecarga mental e falta de concentracao",
    damage: "Estresse, disturbios e fadiga",
  },
  P5: {
    code: "P5",
    hazard: "Trabalho com demandas divergentes",
    risk: "Sobrecarga mental e falta de concentracao",
    damage: "Estresse, disturbios e fadiga",
  },
  P6: {
    code: "P6",
    hazard: "Assedio de qualquer natureza",
    risk: "Sobrecarga mental e falta de concentracao",
    damage: "Estresse, disturbios e fadiga",
  },
  P62: {
    code: "P62",
    hazard: "Comunicacao ineficiente",
    risk: "Trabalho em condicoes de dificil comunicacao",
    damage: "Estresse, disturbios e fadiga",
  },
  P7: {
    code: "P7",
    hazard: "Excesso de conflitos hierarquicos no trabalho",
    risk: "Sobrecarga mental e falta de concentracao",
    damage: "Estresse, disturbios e fadiga",
  },
  P72: {
    code: "P72",
    hazard: "Desequilibrio entre tempo de trabalho e tempo de repouso",
    risk: "Sobrecarga mental e exaustao",
    damage: "Estresse, disturbios e fadiga",
  },
  P8: {
    code: "P8",
    hazard: "Excesso de demandas emocionais/afetivas no trabalho",
    risk: "Sobrecarga mental e falta de concentracao",
    damage: "Estresse, disturbios e fadiga",
  },
  P12: {
    code: "P12",
    hazard: "Exigencia de realizacao de multiplas tarefas com alta demanda cognitiva",
    risk: "Sobrecarga mental e falta de concentracao",
    damage: "Estresse, disturbios e fadiga",
  },
  P13: {
    code: "P13",
    hazard: "Exigencia de alto nivel de concentracao, atencao ou memoria",
    risk: "Sobrecarga mental e falta de concentracao",
    damage: "Estresse, disturbios e fadiga",
  },
  P91: {
    code: "P91",
    hazard: "Excesso de situacoes de estresse",
    risk: "Sobrecarga mental e falta de concentracao",
    damage: "Estresse, disturbios e fadiga",
  },
  P92: {
    code: "P92",
    hazard: "Insuficiencia de capacitacao para execucao das tarefas",
    risk: "Sobrecarga mental e inseguranca",
    damage: "Estresse e fadiga",
  },
} as const;

/**
 * Mapeamento entre dimensoes COPSOQ-II e codigos de perigo.
 * Usado pelo LLM para correlacionar scores com perigos do catalogo.
 */
export const DIMENSION_TO_HAZARDS: Record<string, string[]> = {
  "Demandas Quantitativas": ["P3", "P4", "P72"],
  "Controle sobre o Trabalho": ["P1", "P5"],
  "Suporte Social": ["P62", "P7"],
  "Lideranca": ["P7", "P62"],
  "Comunidade no Trabalho": ["P62", "P2"],
  "Significado do Trabalho": ["P2"],
  "Confianca": ["P7", "P6"],
  "Justica": ["P7", "P6"],
  "Inseguranca no Trabalho": ["P4", "P91"],
  "Saude Mental": ["P4", "P8", "P3"],
  "Burnout": ["P3", "P72", "P4"],
  "Violencia e Assedio": ["P6"],
};

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

export const RISK_INVENTORY_PROMPT = `Voce e um engenheiro de seguranca do trabalho e psicologo organizacional especialista em riscos psicossociais, com profundo conhecimento da NR-01 (Gerenciamento de Riscos Ocupacionais) atualizada para 2026, NR-17 (Ergonomia) e do questionario COPSOQ-II.

Sua tarefa e gerar um INVENTARIO DE RISCOS OCUPACIONAIS (psicossociais) conforme exigido pela NR-01 (item 1.5.7.1), baseado nos resultados de uma avaliacao COPSOQ-II.

VOCE RECEBERA:
1. Scores medios das 12 dimensoes COPSOQ-II (0-100)
2. Analise de IA previamente gerada (resumo executivo, dimensoes criticas, recomendacoes)
3. Dados organizacionais (nome da empresa, setor, quantidade de trabalhadores)

CATALOGO DE PERIGOS PSICOSSOCIAIS (NR-01):
- P1: Falta de autonomia no trabalho
- P2: Insatisfacao no trabalho
- P3: Situacoes de sobrecarga de trabalho mental
- P4: Excesso de situacoes de estresse
- P5: Trabalho com demandas divergentes
- P6: Assedio de qualquer natureza
- P62: Comunicacao ineficiente
- P7: Excesso de conflitos hierarquicos no trabalho
- P72: Desequilibrio entre tempo de trabalho e tempo de repouso
- P8: Excesso de demandas emocionais/afetivas no trabalho
- P12: Exigencia de multiplas tarefas com alta demanda cognitiva
- P13: Exigencia de alto nivel de concentracao, atencao ou memoria
- P91: Excesso de situacoes de estresse (recorrente)
- P92: Insuficiencia de capacitacao para execucao das tarefas

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
            "activity", "source", "hazardCode", "hazard", "risk",
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
