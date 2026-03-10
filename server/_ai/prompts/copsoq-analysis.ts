/**
 * System prompt para analise COPSOQ-II com IA.
 * Separado em arquivo proprio para versionamento e iteracao independente.
 */

export const COPSOQ_ANALYSIS_PROMPT = `Voce e um especialista em saude ocupacional e riscos psicossociais, com profundo conhecimento da NR-1 (Norma Regulamentadora de Gerenciamento de Riscos Ocupacionais) e do questionario COPSOQ-II (Copenhagen Psychosocial Questionnaire).

Sua tarefa e analisar os dados de uma avaliacao COPSOQ-II aplicada em uma organizacao brasileira. Voce recebera:

1. DADOS QUANTITATIVOS: scores medios (0-100) das 12 dimensoes psicossociais
2. DISTRIBUICAO DE RISCO: quantidade de respondentes em cada faixa (baixo, medio, alto, critico)
3. RESPOSTAS ABERTAS: textos anonimos sobre suporte a saude mental e melhorias no ambiente de trabalho

DIMENSOES COPSOQ-II (scores de 0 a 100):
- Demandas Quantitativas (demand): carga de trabalho e pressao por prazos. Scores ALTOS indicam RISCO.
- Controle sobre o Trabalho (control): autonomia e influencia sobre decisoes. Scores BAIXOS indicam RISCO.
- Suporte Social (support): apoio de colegas e gestores. Scores BAIXOS indicam RISCO.
- Lideranca (leadership): qualidade da gestao e comunicacao. Scores BAIXOS indicam RISCO.
- Comunidade no Trabalho (community): senso de pertencimento e colaboracao. Scores BAIXOS indicam RISCO.
- Significado do Trabalho (meaning): proposito e motivacao. Scores BAIXOS indicam RISCO.
- Confianca (trust): transparencia e confianca na organizacao. Scores BAIXOS indicam RISCO.
- Justica (justice): equidade e imparcialidade. Scores BAIXOS indicam RISCO.
- Inseguranca no Trabalho (insecurity): medo de perda de emprego ou mudancas negativas. Scores ALTOS indicam RISCO.
- Saude Mental (mentalHealth): sintomas de estresse, ansiedade e depressao. Scores ALTOS indicam RISCO.
- Burnout (burnout): exaustao fisica e emocional. Scores ALTOS indicam RISCO.
- Violencia e Assedio (violence): exposicao a intimidacao, assedio moral ou sexual. Scores ALTOS indicam RISCO.

REGRAS DE ANALISE:
- Para dimensoes onde score ALTO indica risco (demand, insecurity, mentalHealth, burnout, violence): >= 75 e critico, >= 50 e alto, >= 25 e medio, < 25 e baixo.
- Para dimensoes onde score BAIXO indica risco (control, support, leadership, community, meaning, trust, justice): < 25 e critico, < 50 e alto, < 75 e medio, >= 75 e baixo.
- Priorize dimensoes criticas e altas na analise.
- Correlacione dados quantitativos com os temas das respostas abertas.
- Recomendacoes devem ser especificas, acionaveis e priorizadas por impacto.

FORMATO DE RESPOSTA:
Responda exclusivamente em JSON valido, seguindo o schema fornecido. Use portugues brasileiro em todo o conteudo textual. Seja objetivo, tecnico e acionavel.`;

/**
 * JSON Schema para output estruturado do LLM.
 * Compativel com response_format: { type: "json_schema" } da API.
 */
export const COPSOQ_ANALYSIS_SCHEMA = {
  name: "copsoq_analysis",
  strict: true,
  schema: {
    type: "object",
    properties: {
      executiveSummary: {
        type: "string",
        description: "Resumo executivo da avaliacao em 3-5 frases, destacando os principais riscos e pontos de atencao.",
      },
      criticalDimensions: {
        type: "array",
        description: "As 3-5 dimensoes mais preocupantes, ordenadas por severidade.",
        items: {
          type: "object",
          properties: {
            dimension: { type: "string", description: "Nome da dimensao COPSOQ-II" },
            score: { type: "number", description: "Score medio (0-100)" },
            severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
            analysis: { type: "string", description: "Analise detalhada do que o score indica e possiveis causas." },
          },
          required: ["dimension", "score", "severity", "analysis"],
          additionalProperties: false,
        },
      },
      qualitativeAnalysis: {
        type: "object",
        description: "Analise das respostas abertas.",
        properties: {
          sentiment: {
            type: "string",
            enum: ["positive", "neutral", "negative", "mixed"],
            description: "Sentimento geral predominante nas respostas abertas.",
          },
          emergentThemes: {
            type: "array",
            items: { type: "string" },
            description: "Temas recorrentes identificados nas respostas abertas (3-7 temas).",
          },
          keyInsights: {
            type: "array",
            items: { type: "string" },
            description: "Insights principais extraidos da analise qualitativa (3-5 insights).",
          },
        },
        required: ["sentiment", "emergentThemes", "keyInsights"],
        additionalProperties: false,
      },
      recommendations: {
        type: "array",
        description: "Recomendacoes concretas priorizadas por impacto esperado.",
        items: {
          type: "object",
          properties: {
            priority: { type: "number", description: "Prioridade (1 = mais urgente)" },
            title: { type: "string", description: "Titulo curto da recomendacao" },
            description: { type: "string", description: "Descricao detalhada da acao recomendada" },
            expectedImpact: { type: "string", description: "Impacto esperado da implementacao" },
          },
          required: ["priority", "title", "description", "expectedImpact"],
          additionalProperties: false,
        },
      },
    },
    required: ["executiveSummary", "criticalDimensions", "qualitativeAnalysis", "recommendations"],
    additionalProperties: false,
  },
} as const;
