import { relations } from "drizzle-orm";
import {
  users,
  tenants,
  tenantSettings,
  sectors,
  people,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  auditLogs,
  dataConsents,
  userInvites,
  clients,
  services,
  pricingParameters,
  proposals,
  proposalItems,
  assessmentProposals,
  plans,
  subscriptions,
  invoices,
  usageMetrics,
  featureFlags,
  planFeatures,
  pdfExports,
  webhooks,
  webhookDeliveries,
  apiKeys,
  apiKeyUsage,
  user2FA,
  ipWhitelist,
  sessions,
  securityAlerts,
  loginAttempts,
  onboardingProgress,
} from "./schema";
import {
  riskCategories,
  riskFactors,
  riskAssessments,
  riskAssessmentItems,
  actionPlans,
  psychosocialSurveys,
  surveyResponses,
  interventionPrograms,
  programParticipants,
  individualSessions,
  mentalHealthIndicators,
  complianceDocuments,
  copsoqAssessments,
  copsoqResponses,
  copsoqReports,
  copsoqInvites,
  copsoqReminders,
} from "./schema_nr01";

// ============================================================================
// CORE RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  userRoles: many(userRoles),
  sessions: many(sessions),
  user2FA: one(user2FA, { fields: [users.id], references: [user2FA.userId] }),
  auditLogs: many(auditLogs),
  loginAttempts: many(loginAttempts),
  pdfExports: many(pdfExports),
}));

export const tenantsRelations = relations(tenants, ({ many, one }) => ({
  users: many(users),
  settings: many(tenantSettings),
  sectors: many(sectors),
  people: many(people),
  clients: many(clients),
  services: many(services),
  proposals: many(proposals),
  subscription: one(subscriptions, { fields: [tenants.id], references: [subscriptions.tenantId] }),
  invoices: many(invoices),
  webhooks: many(webhooks),
  apiKeys: many(apiKeys),
  ipWhitelist: many(ipWhitelist),
  securityAlerts: many(securityAlerts),
  onboardingProgress: one(onboardingProgress, { fields: [tenants.id], references: [onboardingProgress.tenantId] }),
  pricingParameters: one(pricingParameters, { fields: [tenants.id], references: [pricingParameters.tenantId] }),
  riskAssessments: many(riskAssessments),
  copsoqAssessments: many(copsoqAssessments),
  psychosocialSurveys: many(psychosocialSurveys),
  interventionPrograms: many(interventionPrograms),
  complianceDocuments: many(complianceDocuments),
  mentalHealthIndicators: many(mentalHealthIndicators),
}));

// ============================================================================
// SETTINGS & SECTORS
// ============================================================================

export const tenantSettingsRelations = relations(tenantSettings, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantSettings.tenantId], references: [tenants.id] }),
}));

export const sectorsRelations = relations(sectors, ({ one, many }) => ({
  tenant: one(tenants, { fields: [sectors.tenantId], references: [tenants.id] }),
  people: many(people),
}));

export const peopleRelations = relations(people, ({ one }) => ({
  tenant: one(tenants, { fields: [people.tenantId], references: [tenants.id] }),
  sector: one(sectors, { fields: [people.sectorId], references: [sectors.id] }),
}));

// ============================================================================
// RBAC
// ============================================================================

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

// ============================================================================
// AUDIT & LGPD
// ============================================================================

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const dataConsentsRelations = relations(dataConsents, ({ one }) => ({
  person: one(people, { fields: [dataConsents.personId], references: [people.id] }),
}));

export const userInvitesRelations = relations(userInvites, ({ one }) => ({
  role: one(roles, { fields: [userInvites.roleId], references: [roles.id] }),
}));

// ============================================================================
// PRICING
// ============================================================================

export const clientsRelations = relations(clients, ({ one, many }) => ({
  tenant: one(tenants, { fields: [clients.tenantId], references: [tenants.id] }),
  proposals: many(proposals),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  tenant: one(tenants, { fields: [services.tenantId], references: [tenants.id] }),
}));

export const pricingParametersRelations = relations(pricingParameters, ({ one }) => ({
  tenant: one(tenants, { fields: [pricingParameters.tenantId], references: [tenants.id] }),
}));

export const proposalsRelations = relations(proposals, ({ one, many }) => ({
  tenant: one(tenants, { fields: [proposals.tenantId], references: [tenants.id] }),
  client: one(clients, { fields: [proposals.clientId], references: [clients.id] }),
  items: many(proposalItems),
}));

export const proposalItemsRelations = relations(proposalItems, ({ one }) => ({
  proposal: one(proposals, { fields: [proposalItems.proposalId], references: [proposals.id] }),
  service: one(services, { fields: [proposalItems.serviceId], references: [services.id] }),
}));

export const assessmentProposalsRelations = relations(assessmentProposals, ({ one }) => ({
  assessment: one(riskAssessments, { fields: [assessmentProposals.assessmentId], references: [riskAssessments.id] }),
  proposal: one(proposals, { fields: [assessmentProposals.proposalId], references: [proposals.id] }),
}));

// ============================================================================
// MONETIZATION: Plans & Subscriptions
// ============================================================================

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(subscriptions),
  features: many(planFeatures),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, { fields: [subscriptions.tenantId], references: [tenants.id] }),
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  tenant: one(tenants, { fields: [invoices.tenantId], references: [tenants.id] }),
  subscription: one(subscriptions, { fields: [invoices.subscriptionId], references: [subscriptions.id] }),
}));

export const planFeaturesRelations = relations(planFeatures, ({ one }) => ({
  plan: one(plans, { fields: [planFeatures.planId], references: [plans.id] }),
  feature: one(featureFlags, { fields: [planFeatures.featureId], references: [featureFlags.id] }),
}));

// ============================================================================
// WEBHOOKS & API KEYS
// ============================================================================

export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  tenant: one(tenants, { fields: [webhooks.tenantId], references: [tenants.id] }),
  deliveries: many(webhookDeliveries),
}));

export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, { fields: [webhookDeliveries.webhookId], references: [webhooks.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one, many }) => ({
  tenant: one(tenants, { fields: [apiKeys.tenantId], references: [tenants.id] }),
  usage: many(apiKeyUsage),
}));

export const apiKeyUsageRelations = relations(apiKeyUsage, ({ one }) => ({
  apiKey: one(apiKeys, { fields: [apiKeyUsage.apiKeyId], references: [apiKeys.id] }),
}));

// ============================================================================
// SECURITY
// ============================================================================

export const ipWhitelistRelations = relations(ipWhitelist, ({ one }) => ({
  tenant: one(tenants, { fields: [ipWhitelist.tenantId], references: [tenants.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const securityAlertsRelations = relations(securityAlerts, ({ one }) => ({
  tenant: one(tenants, { fields: [securityAlerts.tenantId], references: [tenants.id] }),
}));

export const loginAttemptsRelations = relations(loginAttempts, ({ one }) => ({
  user: one(users, { fields: [loginAttempts.userId], references: [users.id] }),
}));

// ============================================================================
// NR-01: Risk Management
// ============================================================================

export const riskCategoriesRelations = relations(riskCategories, ({ many }) => ({
  factors: many(riskFactors),
}));

export const riskFactorsRelations = relations(riskFactors, ({ one }) => ({
  category: one(riskCategories, { fields: [riskFactors.categoryId], references: [riskCategories.id] }),
}));

export const riskAssessmentsRelations = relations(riskAssessments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [riskAssessments.tenantId], references: [tenants.id] }),
  sector: one(sectors, { fields: [riskAssessments.sectorId], references: [sectors.id] }),
  items: many(riskAssessmentItems),
  actionPlans: many(actionPlans),
}));

export const riskAssessmentItemsRelations = relations(riskAssessmentItems, ({ one }) => ({
  assessment: one(riskAssessments, { fields: [riskAssessmentItems.assessmentId], references: [riskAssessments.id] }),
  riskFactor: one(riskFactors, { fields: [riskAssessmentItems.riskFactorId], references: [riskFactors.id] }),
}));

export const actionPlansRelations = relations(actionPlans, ({ one }) => ({
  tenant: one(tenants, { fields: [actionPlans.tenantId], references: [tenants.id] }),
  assessmentItem: one(riskAssessmentItems, { fields: [actionPlans.assessmentItemId], references: [riskAssessmentItems.id] }),
}));

export const psychosocialSurveysRelations = relations(psychosocialSurveys, ({ one, many }) => ({
  tenant: one(tenants, { fields: [psychosocialSurveys.tenantId], references: [tenants.id] }),
  responses: many(surveyResponses),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  survey: one(psychosocialSurveys, { fields: [surveyResponses.surveyId], references: [psychosocialSurveys.id] }),
  person: one(people, { fields: [surveyResponses.personId], references: [people.id] }),
}));

export const interventionProgramsRelations = relations(interventionPrograms, ({ one, many }) => ({
  tenant: one(tenants, { fields: [interventionPrograms.tenantId], references: [tenants.id] }),
  participants: many(programParticipants),
}));

export const programParticipantsRelations = relations(programParticipants, ({ one }) => ({
  program: one(interventionPrograms, { fields: [programParticipants.programId], references: [interventionPrograms.id] }),
  person: one(people, { fields: [programParticipants.personId], references: [people.id] }),
}));

export const individualSessionsRelations = relations(individualSessions, ({ one }) => ({
  tenant: one(tenants, { fields: [individualSessions.tenantId], references: [tenants.id] }),
  person: one(people, { fields: [individualSessions.personId], references: [people.id] }),
}));

export const mentalHealthIndicatorsRelations = relations(mentalHealthIndicators, ({ one }) => ({
  tenant: one(tenants, { fields: [mentalHealthIndicators.tenantId], references: [tenants.id] }),
  sector: one(sectors, { fields: [mentalHealthIndicators.sectorId], references: [sectors.id] }),
}));

export const complianceDocumentsRelations = relations(complianceDocuments, ({ one }) => ({
  tenant: one(tenants, { fields: [complianceDocuments.tenantId], references: [tenants.id] }),
}));

// ============================================================================
// NR-01: COPSOQ-II
// ============================================================================

export const copsoqAssessmentsRelations = relations(copsoqAssessments, ({ one, many }) => ({
  tenant: one(tenants, { fields: [copsoqAssessments.tenantId], references: [tenants.id] }),
  sector: one(sectors, { fields: [copsoqAssessments.sectorId], references: [sectors.id] }),
  responses: many(copsoqResponses),
  reports: many(copsoqReports),
  invites: many(copsoqInvites),
}));

export const copsoqResponsesRelations = relations(copsoqResponses, ({ one }) => ({
  assessment: one(copsoqAssessments, { fields: [copsoqResponses.assessmentId], references: [copsoqAssessments.id] }),
  person: one(people, { fields: [copsoqResponses.personId], references: [people.id] }),
}));

export const copsoqReportsRelations = relations(copsoqReports, ({ one }) => ({
  assessment: one(copsoqAssessments, { fields: [copsoqReports.assessmentId], references: [copsoqAssessments.id] }),
}));

export const copsoqInvitesRelations = relations(copsoqInvites, ({ one, many }) => ({
  assessment: one(copsoqAssessments, { fields: [copsoqInvites.assessmentId], references: [copsoqAssessments.id] }),
  reminders: many(copsoqReminders),
}));

export const copsoqRemindersRelations = relations(copsoqReminders, ({ one }) => ({
  invite: one(copsoqInvites, { fields: [copsoqReminders.inviteId], references: [copsoqInvites.id] }),
}));
