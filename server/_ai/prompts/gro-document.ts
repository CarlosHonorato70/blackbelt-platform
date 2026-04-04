/**
 * Template de estrutura do GRO — Gerenciamento de Riscos Ocupacionais
 * Conforme NR-01 seção 1.5 (Portaria MTE nº 1.419/2024)
 *
 * Este template define as seções obrigatórias e a estrutura
 * do documento GRO consolidado para riscos psicossociais.
 */

export const GRO_SECTIONS = [
  {
    id: "identificacao",
    title: "1. Identificação de Perigos e Fatores de Risco",
    nr01Ref: "1.5.3.1 a 1.5.3.3",
    description:
      "Levantamento preliminar de perigos e identificação de fatores de risco psicossociais conforme Guia MTE (13 tipos de perigo).",
    requiredData: ["riskAssessments", "riskAssessmentItems"],
  },
  {
    id: "avaliacao",
    title: "2. Avaliação dos Riscos Ocupacionais",
    nr01Ref: "1.5.3.4 a 1.5.3.6",
    description:
      "Avaliação dos riscos quanto à severidade, probabilidade e nível de risco. Metodologia COPSOQ-II (76 questões, 12 dimensões).",
    requiredData: ["copsoqReports", "riskAssessmentItems"],
  },
  {
    id: "controle",
    title: "3. Medidas de Prevenção e Controle",
    nr01Ref: "1.5.4.1 a 1.5.4.3",
    description:
      "Plano de ação com hierarquia de controles (eliminação > substituição > engenharia > administrativo > EPI). Responsáveis e prazos definidos.",
    requiredData: ["actionPlans"],
  },
  {
    id: "comunicacao",
    title: "4. Comunicação e Participação dos Trabalhadores",
    nr01Ref: "1.5.3.7",
    description:
      "Devolutiva dos resultados aos trabalhadores, registros de disseminação e evidências de participação.",
    requiredData: ["resultDisseminations"],
  },
  {
    id: "monitoramento",
    title: "5. Monitoramento e Acompanhamento",
    nr01Ref: "1.5.5",
    description:
      "Indicadores de saúde mental, cronograma de reavaliação, efetividade das medidas implementadas.",
    requiredData: ["mentalHealthIndicators", "complianceMilestones"],
  },
  {
    id: "pcmso",
    title: "6. Integração com PCMSO (NR-07)",
    nr01Ref: "NR-07 / 7.5",
    description:
      "Recomendações de exames e avaliações de saúde integradas aos riscos psicossociais identificados.",
    requiredData: ["pcmsoRecommendations"],
  },
  {
    id: "treinamento",
    title: "7. Programa de Capacitação",
    nr01Ref: "1.5.6",
    description:
      "Programas de treinamento, carga horária, público-alvo e registros de participação.",
    requiredData: ["interventionPrograms", "trainingModules"],
  },
  {
    id: "conformidade",
    title: "8. Checklist de Conformidade NR-01",
    nr01Ref: "1.5.7",
    description:
      "Verificação item a item dos requisitos normativos com status de conformidade.",
    requiredData: ["complianceChecklist"],
  },
] as const;

export type GroSectionId = (typeof GRO_SECTIONS)[number]["id"];

/**
 * Calcula o percentual de completude do GRO com base nos dados disponíveis.
 */
export function calculateGroCompleteness(availableData: Record<string, boolean>): {
  overall: number;
  sections: Array<{ id: string; title: string; complete: boolean; missing: string[] }>;
} {
  const sections = GRO_SECTIONS.map((section) => {
    const missing = section.requiredData.filter((d) => !availableData[d]);
    return {
      id: section.id,
      title: section.title,
      complete: missing.length === 0,
      missing,
    };
  });

  const completedCount = sections.filter((s) => s.complete).length;
  const overall = Math.round((completedCount / sections.length) * 100);

  return { overall, sections };
}
