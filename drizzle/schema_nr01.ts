import {
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  int,
  boolean,
  json,
  index,
} from "drizzle-orm/mysql-core";
import { tenants } from "./schema";

/**
 * Schema adicional para gestão de riscos psicossociais (NR-01)
 */

// Categorias de fatores de risco psicossociais
export const riskCategories = mysqlTable("risk_categories", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Fatores de risco específicos
export const riskFactors = mysqlTable("risk_factors", {
  id: varchar("id", { length: 64 }).primaryKey(),
  categoryId: varchar("categoryId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  referenceNorm: varchar("referenceNorm", { length: 100 }), // Ex: "NR-01", "ISO 45003"
  order: int("order").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Avaliações de riscos psicossociais por tenant
export const riskAssessments = mysqlTable("risk_assessments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  sectorId: varchar("sectorId", { length: 64 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assessmentDate: timestamp("assessmentDate").notNull(),
  assessor: varchar("assessor", { length: 255 }), // Nome do avaliador
  status: mysqlEnum("status", ["draft", "in_progress", "completed", "reviewed"])
    .default("draft")
    .notNull(),
  methodology: text("methodology"), // Metodologia utilizada

  // PGR/GRO fields (Entregável 1)
  pgrSection: varchar("pgrSection", { length: 50 }), // Seção no PGR (ex: "5.1")
  groReference: varchar("groReference", { length: 100 }), // Referência GRO/NR-01
  reviewDate: timestamp("reviewDate"), // Data de revisão
  approvedBy: varchar("approvedBy", { length: 255 }), // Aprovado por

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Itens individuais de avaliação de risco
export const riskAssessmentItems = mysqlTable("risk_assessment_items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  assessmentId: varchar("assessmentId", { length: 64 }).notNull(),
  riskFactorId: varchar("riskFactorId", { length: 64 }).notNull(),
  severity: mysqlEnum("severity", [
    "low",
    "medium",
    "high",
    "critical",
  ]).notNull(), // Gravidade
  probability: mysqlEnum("probability", [
    "rare",
    "unlikely",
    "possible",
    "likely",
    "certain",
  ]).notNull(), // Probabilidade
  riskLevel: mysqlEnum("riskLevel", [
    "low",
    "medium",
    "high",
    "critical",
  ]).notNull(), // Nível de risco calculado
  affectedPopulation: int("affectedPopulation"), // Número de pessoas afetadas
  currentControls: text("currentControls"), // Controles existentes
  observations: text("observations"),

  // Fase 2 IA: campos adicionais
  aiGenerated: boolean("ai_generated").default(false),   // Item gerado por IA
  hazardCode: varchar("hazard_code", { length: 10 }),    // Codigo do catalogo (P1, P3, etc.)
  mteHazardType: varchar("mte_hazard_type", { length: 10 }), // Código MTE (mte_01..mte_13)

  createdAt: timestamp("createdAt").defaultNow(),
});

// Planos de ação para mitigação de riscos
export const actionPlans = mysqlTable("action_plans", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  assessmentItemId: varchar("assessmentItemId", { length: 64 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  actionType: mysqlEnum("actionType", [
    "elimination",
    "substitution",
    "engineering",
    "administrative",
    "ppe",
  ]).notNull(),
  responsibleId: varchar("responsibleId", { length: 64 }), // ID do responsável
  deadline: timestamp("deadline"),
  status: mysqlEnum("status", [
    "pending",
    "in_progress",
    "completed",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"])
    .default("medium")
    .notNull(),
  budget: int("budget"), // Orçamento estimado em centavos
  completedAt: timestamp("completedAt"),

  // Fase 2 IA: campos adicionais
  aiGenerated: boolean("ai_generated").default(false),       // Acao gerada por IA
  monthlySchedule: json("monthly_schedule"),                 // boolean[12] cronograma Jan-Dez
  kpiIndicator: varchar("kpi_indicator", { length: 255 }),   // Indicador de acompanhamento
  expectedImpact: text("expected_impact"),                   // Impacto esperado

  // Entregável 2: Plano de Ação NR-01
  templateType: varchar("templateType", { length: 30 }), // nr01_preventive, nr01_corrective, custom
  regulatoryBasis: text("regulatoryBasis"), // Base regulatória (NR-01, NR-17, etc.)
  verificationMethod: text("verificationMethod"), // Método de verificação de eficácia
  effectivenessIndicator: text("effectivenessIndicator"), // Indicador de efetividade

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Questionários de avaliação psicossocial
export const psychosocialSurveys = mysqlTable("psychosocial_surveys", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  surveyType: mysqlEnum("surveyType", [
    "climate",
    "stress",
    "burnout",
    "engagement",
    "custom",
  ]).notNull(),
  questions: json("questions"), // Array de perguntas
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Respostas aos questionários
export const surveyResponses = mysqlTable("survey_responses", {
  id: varchar("id", { length: 64 }).primaryKey(),
  surveyId: varchar("surveyId", { length: 64 }).notNull(),
  personId: varchar("personId", { length: 64 }).notNull(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  responses: json("responses"), // Objeto com respostas
  score: int("score"), // Pontuação calculada
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]),
  isAnonymous: boolean("isAnonymous").default(false),
  completedAt: timestamp("completedAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Programas de intervenção (treinamentos, mentorias, etc)
export const interventionPrograms = mysqlTable("intervention_programs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  programType: mysqlEnum("programType", [
    "training",
    "mentoring",
    "workshop",
    "therapy",
    "resilience",
    "leadership",
  ]).notNull(),
  targetAudience: text("targetAudience"),
  duration: int("duration"), // Duração em horas
  facilitator: varchar("facilitator", { length: 255 }), // Nome do facilitador
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  status: mysqlEnum("status", ["planned", "active", "completed", "cancelled"])
    .default("planned")
    .notNull(),
  maxParticipants: int("maxParticipants"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Participantes dos programas
export const programParticipants = mysqlTable("program_participants", {
  id: varchar("id", { length: 64 }).primaryKey(),
  programId: varchar("programId", { length: 64 }).notNull(),
  personId: varchar("personId", { length: 64 }).notNull(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  enrolledAt: timestamp("enrolledAt").defaultNow(),
  completedAt: timestamp("completedAt"),
  attendance: int("attendance"), // Percentual de presença
  feedback: text("feedback"),
  rating: int("rating"), // Avaliação de 1 a 5
});

// Atendimentos individuais (psicológicos, mentorias)
export const individualSessions = mysqlTable("individual_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  personId: varchar("personId", { length: 64 }).notNull(),
  sessionType: mysqlEnum("sessionType", [
    "psychological",
    "mentoring",
    "coaching",
    "medical",
  ]).notNull(),
  professional: varchar("professional", { length: 255 }), // Nome do profissional
  scheduledAt: timestamp("scheduledAt").notNull(),
  duration: int("duration"), // Duração em minutos
  status: mysqlEnum("status", [
    "scheduled",
    "completed",
    "cancelled",
    "no_show",
  ])
    .default("scheduled")
    .notNull(),
  notes: text("notes"), // Notas confidenciais
  followUp: text("followUp"), // Encaminhamentos
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Indicadores de saúde mental organizacional
export const mentalHealthIndicators = mysqlTable("mental_health_indicators", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  sectorId: varchar("sectorId", { length: 64 }),
  period: varchar("period", { length: 20 }).notNull(), // Ex: "2025-01"
  absenteeismRate: int("absenteeismRate"), // Taxa em centésimos de %
  turnoverRate: int("turnoverRate"),
  burnoutCases: int("burnoutCases"),
  stressLevel: int("stressLevel"), // Nível médio de estresse (0-100)
  engagementScore: int("engagementScore"), // Score de engajamento (0-100)
  satisfactionScore: int("satisfactionScore"), // Score de satisfação (0-100)
  incidentsReported: int("incidentsReported"), // Incidentes psicossociais reportados
  createdAt: timestamp("createdAt").defaultNow(),
});

// Documentos de compliance NR-01
export const complianceDocuments = mysqlTable("compliance_documents", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  documentType: mysqlEnum("documentType", [
    "gro",
    "inventory",
    "action_plan",
    "training_record",
    "audit_report",
    "laudo_tecnico",
    "pgr_pcmso_integration",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: varchar("fileUrl", { length: 500 }), // URL do arquivo no S3
  version: varchar("version", { length: 20 }).default("1.0"),
  validFrom: timestamp("validFrom").notNull(),
  validUntil: timestamp("validUntil"),
  status: mysqlEnum("status", ["draft", "active", "expired", "archived"])
    .default("draft")
    .notNull(),
  signedBy: varchar("signedBy", { length: 255 }), // Nome do responsável
  signedAt: timestamp("signedAt"),

  // Entregável 4: Laudo Técnico
  professionalName: varchar("professionalName", { length: 255 }), // Nome do profissional
  professionalRegistry: varchar("professionalRegistry", { length: 50 }), // CRP/CRM
  contentStructure: json("contentStructure"), // Seções do laudo (JSON)

  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// ============================================================================
// COPSOQ-II: Avaliação de Riscos Psicossociais
// ============================================================================

export const copsoqAssessments = mysqlTable("copsoq_assessments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  sectorId: varchar("sectorId", { length: 64 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assessmentDate: timestamp("assessmentDate").notNull(),
  status: mysqlEnum("status", ["draft", "in_progress", "completed", "reviewed"])
    .default("draft")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_copsoq_assess_tenant").on(table.tenantId),
  statusIdx: index("idx_copsoq_assess_status").on(table.status),
}));

export const copsoqResponses = mysqlTable("copsoq_responses", {
  id: varchar("id", { length: 64 }).primaryKey(),
  assessmentId: varchar("assessmentId", { length: 64 }).notNull(),
  personId: varchar("personId", { length: 64 }).notNull(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),

  // Dados básicos do respondente
  ageGroup: varchar("ageGroup", { length: 20 }), // <18, 18-27, 28-43, 44-59, 60+
  hasDisability: boolean("hasDisability"),
  disabilityType: varchar("disabilityType", { length: 255 }),
  gender: varchar("gender", { length: 20 }), // Feminino, Masculino, Intersex, Não binário, Outro
  maritalStatus: varchar("maritalStatus", { length: 20 }),
  childrenCount: varchar("childrenCount", { length: 20 }),
  education: varchar("education", { length: 50 }),
  yearsInCompany: varchar("yearsInCompany", { length: 20 }),
  alcoholFrequency: varchar("alcoholFrequency", { length: 20 }),
  smokeFrequency: varchar("smokeFrequency", { length: 20 }),
  recommendationScore: int("recommendationScore"), // 0-10

  // Respostas às 76 questões (escala 1-5)
  responses: json("responses"), // { q1: 5, q2: 3, ... q76: 4 }

  // Scores por dimensão
  demandScore: int("demandScore"), // Demanda de trabalho
  controlScore: int("controlScore"), // Controle
  supportScore: int("supportScore"), // Apoio social
  leadershipScore: int("leadershipScore"), // Liderança
  communityScore: int("communityScore"), // Comunidade
  meaningScore: int("meaningScore"), // Significado do trabalho
  trustScore: int("trustScore"), // Confiança
  justiceScore: int("justiceScore"), // Justiça
  insecurityScore: int("insecurityScore"), // Insegurança no trabalho
  mentalHealthScore: int("mentalHealthScore"), // Saúde mental
  burnoutScore: int("burnoutScore"), // Burnout
  violenceScore: int("violenceScore"), // Violência e assédio

  // Classificação geral de risco
  overallRiskLevel: mysqlEnum("overallRiskLevel", [
    "low",
    "medium",
    "high",
    "critical",
  ]),

  // Comentários abertos
  mentalHealthSupport: text("mentalHealthSupport"),
  workplaceImprovement: text("workplaceImprovement"),

  isAnonymous: boolean("isAnonymous").default(false),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  assessmentIdx: index("idx_copsoq_resp_assessment").on(table.assessmentId),
  tenantIdx: index("idx_copsoq_resp_tenant").on(table.tenantId),
  personIdx: index("idx_copsoq_resp_person").on(table.personId),
}));

export const copsoqReports = mysqlTable("copsoq_reports", {
  id: varchar("id", { length: 64 }).primaryKey(),
  assessmentId: varchar("assessmentId", { length: 64 }).notNull(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),

  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),

  // Estatísticas agregadas
  totalRespondents: int("totalRespondents"),
  responseRate: int("responseRate"), // Percentual
  averageDemandScore: int("averageDemandScore"),
  averageControlScore: int("averageControlScore"),
  averageSupportScore: int("averageSupportScore"),
  averageLeadershipScore: int("averageLeadershipScore"),
  averageCommunityScore: int("averageCommunityScore"),
  averageMeaningScore: int("averageMeaningScore"),
  averageTrustScore: int("averageTrustScore"),
  averageJusticeScore: int("averageJusticeScore"),
  averageInsecurityScore: int("averageInsecurityScore"),
  averageMentalHealthScore: int("averageMentalHealthScore"),
  averageBurnoutScore: int("averageBurnoutScore"),
  averageViolenceScore: int("averageViolenceScore"),

  // Distribuição de risco
  lowRiskCount: int("lowRiskCount"),
  mediumRiskCount: int("mediumRiskCount"),
  highRiskCount: int("highRiskCount"),
  criticalRiskCount: int("criticalRiskCount"),

  // Arquivo do relatório
  reportUrl: varchar("reportUrl", { length: 500 }), // URL do PDF no S3

  // Analise de IA (Fase 1)
  aiAnalysis: json("ai_analysis"),              // CopsoqAnalysisResult completo
  aiGeneratedAt: timestamp("ai_generated_at"),  // Quando a analise foi gerada
  aiModel: varchar("ai_model", { length: 100 }),// Modelo utilizado (ex: gemini-2.5-flash)

  // Entregável 3: Relatório COPSOQ Completo
  demographicBreakdown: json("demographic_breakdown"), // Breakdown por gênero, idade, setor

  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  assessmentIdx: index("idx_copsoq_report_assessment").on(table.assessmentId),
  tenantIdx: index("idx_copsoq_report_tenant").on(table.tenantId),
}));

export type CopsoqAssessment = typeof copsoqAssessments.$inferSelect;
export type InsertCopsoqAssessment = typeof copsoqAssessments.$inferInsert;
export type CopsoqResponse = typeof copsoqResponses.$inferSelect;
export type InsertCopsoqResponse = typeof copsoqResponses.$inferInsert;
export type CopsoqReport = typeof copsoqReports.$inferSelect;
export type InsertCopsoqReport = typeof copsoqReports.$inferInsert;

// Registro de devolutivas de resultados aos trabalhadores (NR-01 item 1.5.3.7)
export const resultDisseminations = mysqlTable("result_disseminations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  assessmentId: varchar("assessmentId", { length: 64 }),
  method: mysqlEnum("method", ["email", "pdf", "meeting", "intranet", "other"]).notNull(),
  recipientCount: int("recipientCount").notNull(),
  sentAt: timestamp("sentAt").defaultNow(),
  sentBy: varchar("sentBy", { length: 255 }),
  evidenceUrl: varchar("evidenceUrl", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_dissemination_tenant").on(table.tenantId),
}));

// Tabela para gerenciar convites de avaliação COPSOQ-II
export const copsoqInvites = mysqlTable("copsoq_invites", {
  id: varchar("id", { length: 64 }).primaryKey(),
  assessmentId: varchar("assessmentId", { length: 64 }).notNull(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  respondentEmail: varchar("respondentEmail", { length: 320 }).notNull(),
  respondentName: varchar("respondentName", { length: 255 }).notNull(),
  respondentPosition: varchar("respondentPosition", { length: 255 }),
  sectorId: varchar("sectorId", { length: 64 }),
  inviteToken: varchar("inviteToken", { length: 255 }).notNull().unique(),
  status: mysqlEnum("status", [
    "pending",
    "sent",
    "viewed",
    "completed",
    "expired",
  ])
    .default("pending")
    .notNull(),
  sentAt: timestamp("sentAt"),
  viewedAt: timestamp("viewedAt"),
  completedAt: timestamp("completedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  assessmentIdx: index("idx_copsoq_invite_assessment").on(table.assessmentId),
  tenantIdx: index("idx_copsoq_invite_tenant").on(table.tenantId),
  statusIdx: index("idx_copsoq_invite_status").on(table.status),
}));

export type CopsoqInvite = typeof copsoqInvites.$inferSelect;
export type InsertCopsoqInvite = typeof copsoqInvites.$inferInsert;

// Tabela de Lembretes de Avaliação COPSOQ-II
export const copsoqReminders = mysqlTable("copsoq_reminders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  inviteId: varchar("invite_id", { length: 64 }).notNull(),
  assessmentId: varchar("assessment_id", { length: 64 }).notNull(),
  respondentEmail: varchar("respondent_email", { length: 320 }).notNull(),
  respondentName: varchar("respondent_name", { length: 255 }).notNull(),
  reminderNumber: int("reminder_number").default(1).notNull(), // 1º, 2º ou 3º lembrete
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  nextReminderAt: timestamp("next_reminder_at"), // Quando enviar próximo lembrete
  status: mysqlEnum("status", ["sent", "failed", "bounced"])
    .default("sent")
    .notNull(),
  errorMessage: text("error_message"), // Se falhar, qual foi o erro
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CopsoqReminder = typeof copsoqReminders.$inferSelect;
export type InsertCopsoqReminder = typeof copsoqReminders.$inferInsert;

// ============================================================================
// LGPD: Solicitações de Direitos do Titular (DSR)
// ============================================================================

export const dsrRequests = mysqlTable("dsr_requests", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  requestType: mysqlEnum("requestType", ["export", "delete", "rectify"]).notNull(),
  status: mysqlEnum("dsrStatus", ["pendente", "processando", "completo", "erro"])
    .default("pendente")
    .notNull(),
  reason: text("reason"),
  format: varchar("format", { length: 20 }), // PDF, JSON, Excel
  fileSize: varchar("fileSize", { length: 50 }), // "2.5 MB"
  downloadLink: varchar("downloadLink", { length: 500 }),
  errorMessage: text("errorMessage"),
  requestDate: timestamp("requestDate").defaultNow(),
  completionDate: timestamp("completionDate"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export type DsrRequest = typeof dsrRequests.$inferSelect;
export type InsertDsrRequest = typeof dsrRequests.$inferInsert;

// ============================================================================
// Entregável 6: Integração PGR + PCMSO
// ============================================================================

export const pcmsoRecommendations = mysqlTable("pcmso_recommendations", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  riskAssessmentId: varchar("riskAssessmentId", { length: 64 }),
  riskFactorId: varchar("riskFactorId", { length: 64 }),
  examType: varchar("examType", { length: 100 }).notNull(), // ASO, audiometria, etc.
  frequency: varchar("frequency", { length: 100 }), // Semestral, anual, etc.
  targetPopulation: text("targetPopulation"),
  medicalBasis: text("medicalBasis"), // Base legal/médica
  priority: mysqlEnum("pcmsoPriority", ["low", "medium", "high", "urgent"]).default("medium"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_pcmso_rec_tenant").on(table.tenantId),
}));

// ============================================================================
// Entregável 8: Relatório Comparativo (Benchmark)
// ============================================================================

export const benchmarkData = mysqlTable("benchmark_data", {
  id: varchar("id", { length: 64 }).primaryKey(),
  dataSource: varchar("dataSource", { length: 50 }).notNull(), // national, sector, region
  sectorCode: varchar("sectorCode", { length: 20 }), // CNAE
  sectorName: varchar("sectorName", { length: 255 }),
  region: varchar("region", { length: 100 }),
  period: varchar("period", { length: 20 }), // Ex: "2024"
  sampleSize: int("sampleSize"),
  avgDemandScore: int("avgDemandScore"),
  avgControlScore: int("avgControlScore"),
  avgSupportScore: int("avgSupportScore"),
  avgLeadershipScore: int("avgLeadershipScore"),
  avgCommunityScore: int("avgCommunityScore"),
  avgMeaningScore: int("avgMeaningScore"),
  avgTrustScore: int("avgTrustScore"),
  avgJusticeScore: int("avgJusticeScore"),
  avgInsecurityScore: int("avgInsecurityScore"),
  avgMentalHealthScore: int("avgMentalHealthScore"),
  avgBurnoutScore: int("avgBurnoutScore"),
  avgViolenceScore: int("avgViolenceScore"),
  // Taxas setoriais (dados Gupy/MTE) — valores em % x100 (ex: 580 = 5.8%)
  burnoutRate: int("burnoutRate"),          // Taxa de burnout no setor
  harassmentRate: int("harassmentRate"),    // Taxa de assédio no setor
  mentalLeaveRate: int("mentalLeaveRate"),  // Taxa de afastamento por saúde mental
  createdAt: timestamp("createdAt").defaultNow(),
});

// ============================================================================
// Entregável 10: Cronograma de Adequação NR-01
// ============================================================================

export const complianceMilestones = mysqlTable("compliance_milestones", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("milestoneCategory", [
    "assessment", "inventory", "action_plan", "training", "documentation", "review",
  ]).notNull(),
  targetDate: timestamp("targetDate").notNull(),
  completedDate: timestamp("completedDate"),
  status: mysqlEnum("milestoneStatus", [
    "pending", "in_progress", "completed", "overdue",
  ]).default("pending").notNull(),
  dependsOnId: varchar("dependsOnId", { length: 64 }),
  order: int("milestoneOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_milestone_tenant").on(table.tenantId),
}));

// ============================================================================
// Entregável 11: Treinamento Digital
// ============================================================================

export const trainingModules = mysqlTable("training_modules", {
  id: varchar("id", { length: 64 }).primaryKey(),
  programId: varchar("programId", { length: 64 }).notNull(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"), // Markdown
  order: int("moduleOrder").default(0),
  duration: int("duration"), // Minutos
  videoUrl: varchar("videoUrl", { length: 500 }),
  quizQuestions: json("quizQuestions"), // Array de perguntas
  passingScore: int("passingScore").default(70),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  programIdx: index("idx_training_mod_program").on(table.programId),
  tenantIdx: index("idx_training_mod_tenant").on(table.tenantId),
}));

export const trainingProgress = mysqlTable("training_progress", {
  id: varchar("id", { length: 64 }).primaryKey(),
  participantId: varchar("participantId", { length: 64 }).notNull(),
  moduleId: varchar("moduleId", { length: 64 }).notNull(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  status: mysqlEnum("trainingStatus", [
    "not_started", "in_progress", "completed",
  ]).default("not_started").notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  quizScore: int("quizScore"),
  attempts: int("attempts").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  participantIdx: index("idx_training_prog_participant").on(table.participantId),
  tenantIdx: index("idx_training_prog_tenant").on(table.tenantId),
}));

// ============================================================================
// Entregável 12: Canal de Denúncia Anônima
// ============================================================================

export const anonymousReports = mysqlTable("anonymous_reports", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  reportCode: varchar("reportCode", { length: 20 }).notNull().unique(), // BB-2026-XXXX
  category: mysqlEnum("reportCategory", [
    "harassment", "discrimination", "violence", "workload", "leadership", "other",
    "assedio_moral", "assedio_sexual", "condicoes_trabalho", "violencia_psicologica",
  ]).notNull(),
  description: text("description").notNull(),
  severity: mysqlEnum("reportSeverity", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  status: mysqlEnum("reportStatus", [
    "received", "investigating", "resolved", "dismissed",
  ]).default("received").notNull(),
  isAnonymous: boolean("isAnonymous").default(true),
  reporterEmail: varchar("reporterEmail", { length: 320 }),
  resolution: text("resolution"),
  adminNotes: text("adminNotes"),
  assignedTo: varchar("assignedTo", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
  resolvedAt: timestamp("resolvedAt"),
}, (table) => ({
  tenantIdx: index("idx_anon_report_tenant").on(table.tenantId),
  codeIdx: index("idx_anon_report_code").on(table.reportCode),
}));

// ============================================================================
// Entregável 13: Pesquisa de Clima - Convites
// ============================================================================

export const surveyInvites = mysqlTable("survey_invites", {
  id: varchar("id", { length: 64 }).primaryKey(),
  surveyId: varchar("surveyId", { length: 64 }).notNull(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  respondentEmail: varchar("respondentEmail", { length: 320 }).notNull(),
  respondentName: varchar("respondentName", { length: 255 }).notNull(),
  inviteToken: varchar("inviteToken", { length: 255 }).notNull().unique(),
  status: mysqlEnum("surveyInviteStatus", [
    "pending", "sent", "completed", "expired",
  ]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  completedAt: timestamp("completedAt"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  surveyIdx: index("idx_survey_invite_survey").on(table.surveyId),
  tenantIdx: index("idx_survey_invite_tenant").on(table.tenantId),
}));

// ============================================================================
// Entregável 14: Relatório de Conformidade Legal
// ============================================================================

export const complianceChecklist = mysqlTable("compliance_checklist", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  requirementCode: varchar("requirementCode", { length: 30 }).notNull(), // NR01-1.5.3.1
  requirementText: text("requirementText").notNull(),
  category: varchar("checklistCategory", { length: 100 }).notNull(),
  status: mysqlEnum("checklistStatus", [
    "compliant", "partial", "non_compliant", "not_applicable",
  ]).default("non_compliant").notNull(),
  evidenceDocId: varchar("evidenceDocId", { length: 64 }),
  notes: text("notes"),
  verifiedAt: timestamp("verifiedAt"),
  verifiedBy: varchar("verifiedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_checklist_tenant").on(table.tenantId),
}));

// ============================================================================
// Entregável 15: Certificado de Conformidade
// ============================================================================

export const complianceCertificates = mysqlTable("compliance_certificates", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  certificateNumber: varchar("certificateNumber", { length: 50 }).notNull().unique(),
  issuedAt: timestamp("issuedAt").notNull(),
  validUntil: timestamp("validUntil").notNull(),
  status: mysqlEnum("certStatus", ["active", "expired", "revoked"]).default("active").notNull(),
  complianceScore: int("complianceScore").notNull(),
  issuedBy: varchar("issuedBy", { length: 255 }),
  pdfUrl: varchar("pdfUrl", { length: 500 }),
  qrCodeData: varchar("qrCodeData", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_cert_tenant").on(table.tenantId),
}));

// ============================================================================
// Entregável 17: Alertas de Vencimento e Prazos
// ============================================================================

export const deadlineAlerts = mysqlTable("deadline_alerts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }),
  entityType: varchar("entityType", { length: 50 }).notNull(), // action_plan, compliance_doc, etc.
  entityId: varchar("entityId", { length: 64 }).notNull(),
  alertDate: timestamp("alertDate").notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("alertStatus", [
    "pending", "sent", "acknowledged", "expired",
  ]).default("pending").notNull(),
  channel: mysqlEnum("alertChannel", ["email", "in_app", "both"]).default("in_app").notNull(),
  sentAt: timestamp("sentAt"),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_alert_tenant").on(table.tenantId),
  dateIdx: index("idx_alert_date").on(table.alertDate),
}));

// ============================================================================
// Entregável 9: Avaliação Ergonômica Preliminar (AEP) - NR-17
// ============================================================================

export const ergonomicAssessments = mysqlTable("ergonomic_assessments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  sectorId: varchar("sectorId", { length: 64 }),
  title: varchar("title", { length: 255 }).notNull(),
  assessorName: varchar("assessorName", { length: 255 }),
  assessmentDate: timestamp("assessmentDate").notNull(),
  status: mysqlEnum("ergStatus", ["draft", "in_progress", "completed", "reviewed"]).default("draft").notNull(),
  methodology: text("methodology"),
  overallRiskLevel: mysqlEnum("ergOverallRisk", ["acceptable", "moderate", "high", "critical"]),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_ergo_assess_tenant").on(table.tenantId),
}));

export const ergonomicItems = mysqlTable("ergonomic_items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  assessmentId: varchar("assessmentId", { length: 64 }).notNull(),
  category: mysqlEnum("ergCategory", [
    "workstation", "posture", "repetition", "lighting", "noise", "organization", "psychosocial",
  ]).notNull(),
  factor: varchar("factor", { length: 255 }).notNull(),
  riskLevel: mysqlEnum("ergItemRisk", ["acceptable", "moderate", "high", "critical"]).notNull(),
  observation: text("observation"),
  recommendation: text("recommendation"),
  photoUrl: varchar("photoUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  assessmentIdx: index("idx_ergo_item_assessment").on(table.assessmentId),
}));

// ============================================================================
// Entregável 18: Exportação para eSocial
// ============================================================================

export const esocialExports = mysqlTable("esocial_exports", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  eventType: mysqlEnum("esocialEventType", ["S-2210", "S-2220", "S-2240"]).notNull(),
  referenceId: varchar("referenceId", { length: 64 }),
  xmlContent: text("xmlContent"),
  status: mysqlEnum("esocialStatus", [
    "draft", "validated", "submitted", "accepted", "rejected",
  ]).default("draft").notNull(),
  submittedAt: timestamp("submittedAt"),
  responseCode: varchar("responseCode", { length: 50 }),
  responseMessage: text("responseMessage"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_esocial_tenant").on(table.tenantId),
}));

// ============================================================================
// Entregável 20: Calculadora de Risco Financeiro
// ============================================================================

export const financialParameters = mysqlTable("financial_parameters", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull().unique(),
  averageSalary: int("averageSalary"), // Centavos
  headcount: int("headcount"),
  avgReplacementCost: int("avgReplacementCost"), // Centavos
  dailyAbsenteeismCost: int("dailyAbsenteeismCost"), // Centavos
  finePerWorker: int("finePerWorker").default(670808), // R$ 6.708,08 em centavos
  litigationAvgCost: int("litigationAvgCost"), // Centavos
  updatedAt: timestamp("updatedAt").defaultNow(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// ============================================================================
// PCMSO Exam Results — Resultados de exames médicos ocupacionais (NR-07)
// ============================================================================

export const pcmsoExamResults = mysqlTable("pcmso_exam_results", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  employeeName: varchar("employeeName", { length: 255 }).notNull(),
  examType: varchar("examType", { length: 100 }).notNull(), // admissional, periodico, retorno, mudanca_funcao, demissional
  examDate: timestamp("examDate").notNull(),
  result: varchar("result", { length: 50 }).notNull(), // apto, inapto, apto_restricao
  restrictions: text("restrictions"),
  observations: text("observations"),
  doctorName: varchar("doctorName", { length: 255 }),
  doctorCrm: varchar("doctorCrm", { length: 30 }),
  nextExamDate: timestamp("nextExamDate"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
}, (table) => [
  index("pcmso_exam_tenant_idx").on(table.tenantId),
]);

// ============================================================================
// Type exports
// ============================================================================

export type RiskCategory = typeof riskCategories.$inferSelect;
export type RiskFactor = typeof riskFactors.$inferSelect;
export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type RiskAssessmentItem = typeof riskAssessmentItems.$inferSelect;
export type ActionPlan = typeof actionPlans.$inferSelect;
export type PsychosocialSurvey = typeof psychosocialSurveys.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InterventionProgram = typeof interventionPrograms.$inferSelect;
export type ProgramParticipant = typeof programParticipants.$inferSelect;
export type IndividualSession = typeof individualSessions.$inferSelect;
export type MentalHealthIndicator = typeof mentalHealthIndicators.$inferSelect;
export type ComplianceDocument = typeof complianceDocuments.$inferSelect;
export type PcmsoRecommendation = typeof pcmsoRecommendations.$inferSelect;
export type BenchmarkDataRow = typeof benchmarkData.$inferSelect;
export type ComplianceMilestone = typeof complianceMilestones.$inferSelect;
export type TrainingModule = typeof trainingModules.$inferSelect;
export type TrainingProgressRecord = typeof trainingProgress.$inferSelect;
export type AnonymousReport = typeof anonymousReports.$inferSelect;
export type SurveyInvite = typeof surveyInvites.$inferSelect;
export type ComplianceChecklistItem = typeof complianceChecklist.$inferSelect;
export type ComplianceCertificate = typeof complianceCertificates.$inferSelect;
export type DeadlineAlert = typeof deadlineAlerts.$inferSelect;
export type ErgonomicAssessment = typeof ergonomicAssessments.$inferSelect;
export type ErgonomicItem = typeof ergonomicItems.$inferSelect;
export type EsocialExport = typeof esocialExports.$inferSelect;
export type FinancialParameter = typeof financialParameters.$inferSelect;
export type PcmsoExamResult = typeof pcmsoExamResults.$inferSelect;
