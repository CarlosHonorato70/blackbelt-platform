/**
 * Shared COPSOQ-II scoring logic.
 * Used by both assessments router (tRPC) and webhook router (public link responses).
 *
 * COPSOQ-II reverse-coded questions (official Danish methodology):
 * Positively worded questions where high score = good outcome must be
 * inverted (score = 6 - rawScore) so all dimensions consistently use
 * "high score = high risk".
 */

export const COPSOQ_DIMENSIONS: Record<string, number[]> = {
  demanda: [1, 2, 3, 4, 5],
  controle: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  apoio: [16, 17, 18, 19, 20],
  lideranca: [21, 22, 23, 24, 25, 26, 30, 31, 32, 36, 37, 38, 39],
  comunidade: [27, 28, 29, 33, 34, 35],
  significado: [49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59],
  confianca: [40, 41, 42, 43, 44, 45],
  justica: [46, 47, 48],
  inseguranca: [60],
  saudeMental: [61, 65, 66, 67, 68, 69, 70, 71, 72],
  burnout: [62, 63, 64],
  violencia: [73, 74, 75, 76],
};

export const REVERSE_CODED_QUESTIONS = new Set([
  // Controle (autonomia, desenvolvimento, influência) — alto = positivo
  9, 10, 11, 12, 13, 14, 15,
  // Liderança (qualidade, previsibilidade, reconhecimento) — alto = positivo
  23, 24, 25, 26,
  // Liderança adicional (confiança, justiça) — alto = positivo
  30, 31, 32,
  // Comunidade (apoio colegas, pertencimento) — alto = positivo
  27, 28, 29, 33, 34, 35,
  // Significado (propósito, engajamento, compromisso) — alto = positivo
  49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
  // Confiança (confiança horizontal/vertical) — alto = positivo
  40, 41, 42, 43, 44, 45,
  // Justiça (procedimentos, distribuição) — alto = positivo
  46, 47, 48,
]);

export function calculateDimensionScores(
  responses: Record<string | number, number>
): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const [dimension, questions] of Object.entries(COPSOQ_DIMENSIONS)) {
    const values = questions.map(q => {
      const raw = responses[q] || responses[`q${q}`] || 0;
      if (raw <= 0) return 0;
      return REVERSE_CODED_QUESTIONS.has(q) ? (6 - raw) : raw;
    }).filter(v => v > 0);

    if (values.length === 0) {
      scores[dimension] = 0;
    } else {
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      scores[dimension] = Math.round(average * 20); // Escala 0-100
    }
  }

  return scores;
}

export function classifyOverallRisk(
  scores: Record<string, number>
): "low" | "medium" | "high" | "critical" {
  const criticalFactors = [
    scores.demanda > 75,
    scores.controle < 25,
    scores.apoio < 25,
    scores.saudeMental > 75,
    scores.burnout > 75,
    scores.violencia > 50,
  ].filter(Boolean).length;

  if (criticalFactors >= 3) return "critical";
  if (criticalFactors >= 2) return "high";
  if (criticalFactors >= 1) return "medium";
  return "low";
}
