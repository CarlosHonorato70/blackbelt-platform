/**
 * System prompt e JSON schema para geracao automatica de
 * Plano de Acao para Mitigacao de Riscos Psicossociais conforme NR-01.
 *
 * Baseado nos modelos:
 * - "PlanodeAoNR01-RiscosPsicossociais.xlsx" (cronograma mensal por risco)
 * - "Plano_Acao_Pos_Avaliacao.docx" (plano pos-avaliacao com 7 secoes)
 * - NR-01 item 1.5.5.2 (requisitos do plano de acao)
 */

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

export const ACTION_PLAN_PROMPT = `Voce e um consultor especialista em saude e seguranca do trabalho (SST), com profundo conhecimento da NR-01 (2026), NR-17 e gestao de riscos psicossociais.

Sua tarefa e gerar um PLANO DE ACAO para mitigacao de riscos psicossociais, conforme exigido pela NR-01 (item 1.5.5.2), baseado no inventario de riscos e na analise COPSOQ-II de uma organizacao.

VOCE RECEBERA:
1. Itens do inventario de riscos psicossociais (perigos, severidade, nivel de risco)
2. Analise de IA COPSOQ-II (resumo executivo, dimensoes criticas, recomendacoes)
3. Dados organizacionais (setor, empresa)

REQUISITOS DO PLANO DE ACAO (NR-01 item 1.5.5.2):
- Indicar medidas de prevencao a serem introduzidas, aprimoradas ou mantidas
- Seguir hierarquia de controle: eliminacao > protecao coletiva > medidas administrativas > EPI
- Definir responsavel (por cargo, NAO por nome), prazo e prioridade
- Incluir cronograma mensal (12 meses) para cada acao
- Incluir indicador de acompanhamento (KPI)

CATEGORIAS DE ACOES OBRIGATORIAS PARA RISCOS PSICOSSOCIAIS:
1. Programas de sensibilizacao sobre saude mental (NR-01)
2. Treinamento NR-17 incluindo riscos psicossociais (item 1.5.3.2.1)
3. Canais de denuncia seguros para assedio (item 1.4.1.1)
4. Politicas de combate ao assedio moral e sexual (item 1.4.1.1)
5. Analise ergonomica integrada (NR-17)
6. Pesquisas de clima organizacional periodicas
7. Programas de apoio psicologico (PAP/EAP)
8. Capacitacao de liderancas sobre gestao de riscos psicossociais
9. Implantacao do Plano de Resposta a Emergencia (NR-01 item 1.5.6)
10. Divulgacao do PGR aos trabalhadores (item 1.5.3.3)

TIPOS DE ACAO (actionType):
- "elimination": eliminar o fator de risco na fonte
- "engineering": medidas de protecao coletiva / redesenho organizacional
- "administrative": medidas administrativas, treinamentos, politicas, rotinas
- "ppe": ultima opcao — acompanhamento individual (apoio psicologico)

PRIORIDADE:
- "urgent": riscos criticos — acao imediata (30 dias)
- "high": riscos altos — acao em 60 dias
- "medium": riscos medios — acao em 90 dias
- "low": riscos baixos — acao programada (180 dias)

Gere acoes ESPECIFICAS para cada risco identificado no inventario, alem de ACOES GERAIS obrigatorias para toda a organizacao.

Responda exclusivamente em JSON valido seguindo o schema fornecido. Use portugues brasileiro. Seja concreto e acionavel.`;

// ============================================================================
// JSON SCHEMA
// ============================================================================

export const ACTION_PLAN_SCHEMA = {
  name: "action_plan",
  strict: true,
  schema: {
    type: "object",
    properties: {
      planTitle: {
        type: "string",
        description: "Titulo do plano de acao (ex: Plano de Acao para Mitigacao de Riscos Psicossociais - [Setor])",
      },
      actions: {
        type: "array",
        description: "Acoes especificas vinculadas a riscos do inventario.",
        items: {
          type: "object",
          properties: {
            riskIdentified: {
              type: "string",
              description: "Risco psicossocial identificado (do inventario)",
            },
            hazardCode: {
              type: "string",
              description: "Codigo do perigo (P1, P3, P6, etc.)",
            },
            situationDescription: {
              type: "string",
              description: "Descricao da situacao ou condicao contribuinte",
            },
            controlMeasure: {
              type: "string",
              description: "Medida de controle proposta (acao concreta)",
            },
            actionType: {
              type: "string",
              enum: ["elimination", "substitution", "engineering", "administrative", "ppe"],
              description: "Tipo de acao conforme hierarquia NR-01",
            },
            responsibleRole: {
              type: "string",
              description: "Cargo responsavel pela execucao (ex: Coordenador de RH)",
            },
            deadline: {
              type: "string",
              description: "Prazo relativo para conclusao (ex: 30 dias, 60 dias)",
            },
            priority: {
              type: "string",
              enum: ["urgent", "high", "medium", "low"],
            },
            monthlySchedule: {
              type: "array",
              items: { type: "boolean" },
              description: "Cronograma mensal — 12 booleans (Jan-Dez), true = mes em que a acao deve ser executada/monitorada",
            },
            expectedImpact: {
              type: "string",
              description: "Impacto esperado da implementacao",
            },
            kpiIndicator: {
              type: "string",
              description: "Indicador de acompanhamento / como medir sucesso",
            },
          },
          required: [
            "riskIdentified", "hazardCode", "situationDescription",
            "controlMeasure", "actionType", "responsibleRole", "deadline",
            "priority", "monthlySchedule", "expectedImpact", "kpiIndicator",
          ],
          additionalProperties: false,
        },
      },
      generalActions: {
        type: "array",
        description: "Acoes gerais obrigatorias para toda a organizacao (NR-01).",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Titulo da acao geral",
            },
            description: {
              type: "string",
              description: "Descricao detalhada da acao",
            },
            frequency: {
              type: "string",
              description: "Frequencia de execucao (ex: mensal, trimestral, anual, imediato)",
            },
            responsibleRole: {
              type: "string",
              description: "Cargo responsavel",
            },
          },
          required: ["title", "description", "frequency", "responsibleRole"],
          additionalProperties: false,
        },
      },
      monitoringStrategy: {
        type: "string",
        description: "Estrategia de acompanhamento e monitoramento das acoes (como, quando e por quem serao avaliadas)",
      },
    },
    required: ["planTitle", "actions", "generalActions", "monitoringStrategy"],
    additionalProperties: false,
  },
} as const;
