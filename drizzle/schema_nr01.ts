import {
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  int,
  boolean,
  json,
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
});

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
});

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

  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

export type CopsoqAssessment = typeof copsoqAssessments.$inferSelect;
export type InsertCopsoqAssessment = typeof copsoqAssessments.$inferInsert;
export type CopsoqResponse = typeof copsoqResponses.$inferSelect;
export type InsertCopsoqResponse = typeof copsoqResponses.$inferInsert;
export type CopsoqReport = typeof copsoqReports.$inferSelect;
export type InsertCopsoqReport = typeof copsoqReports.$inferInsert;

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
});

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
