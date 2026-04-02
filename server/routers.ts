import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { remindersRouter } from "./routers/reminders";
import { publicProcedure, router } from "./_core/trpc";
import {
  assessmentProposalsRouter,
  clientsRouter,
  pricingParametersRouter,
  pricingRouter,
  proposalsRouter,
  servicesRouter,
  pricingCalculationsRouter,
} from "./routers/pricing";
import { peopleRouter } from "./routers/people";
import { sectorsRouter } from "./routers/sectors";
import { tenantsRouter } from "./routers/tenants";
import { riskAssessmentsRouter } from "./routers/riskAssessments";
import { auditLogsRouter } from "./routers/auditLogs";
import { userInvitesRouter } from "./routers/userInvites";
import { rolesPermissionsRouter } from "./routers/rolesPermissions";
import { complianceReportsRouter } from "./routers/complianceReports";
import { authLocalRouter } from "./routers/auth-local";
import { assessmentsRouter } from "./routers/assessments";
import { webhookRouter } from "./routers/webhook";
import { subscriptionsRouter } from "./routers/subscriptions";
import { asaasRouter } from "./routers/asaas";
import { pdfExportsRouter } from "./routers/pdfExports";
import { brandingRouter } from "./routers/branding";
import { webhooksRouter } from "./routers/webhooksManagement";
import { apiKeysRouter } from "./routers/apiKeys";
import { twoFactorRouter } from "./routers/twoFactor";
import { securityRouter } from "./routers/security";
import { analyticsRouter } from "./routers/analytics";
import { onboardingRouter } from "./routers/onboarding";
import { dataExportRouter } from "./routers/dataExport";
import { aiRouter } from "./routers/ai";
import { adminSubscriptionsRouter } from "./routers/adminSubscriptions";
import { supportTicketsRouter } from "./routers/supportTickets";
import { adminMetricsRouter } from "./routers/adminMetrics";
import { pcmsoIntegrationRouter } from "./routers/pcmsoIntegration";
import { psychosocialDashboardRouter } from "./routers/psychosocialDashboard";
import { financialCalculatorRouter } from "./routers/financialCalculator";
import { complianceTimelineRouter } from "./routers/complianceTimeline";
import { complianceChecklistRouter } from "./routers/complianceChecklist";
import { complianceCertificateRouter } from "./routers/complianceCertificate";
import { benchmarkRouter } from "./routers/benchmark";
import { climateSurveysRouter } from "./routers/climateSurveys";
import { trainingRouter } from "./routers/training";
import { anonymousReportsRouter } from "./routers/anonymousReports";
import { deadlineAlertsRouter } from "./routers/deadlineAlerts";
import { ergonomicAssessmentsRouter } from "./routers/ergonomicAssessments";
import { esocialExportRouter } from "./routers/esocialExport";
import { nr01PdfExportRouter } from "./routers/nr01PdfExport";
import { companiesRouter } from "./routers/companies";
import { agentRouter } from "./routers/agent";
import { supportAgentRouter } from "./routers/supportAgent";
import { adminMonitoringRouter } from "./routers/adminMonitoring";
import { consultantCertificationsRouter } from "./routers/consultantCertifications";


export const appRouter = router({
  system: systemRouter,
  reminders: remindersRouter,

  auth: authLocalRouter,

  // Routers de negócio
  tenants: tenantsRouter,
  sectors: sectorsRouter,
  people: peopleRouter,

  // Routers de conformidade NR-01
  riskAssessments: riskAssessmentsRouter,
  complianceReports: complianceReportsRouter,

  // Routers de precificação
  pricing: pricingRouter,
  clients: clientsRouter,
  services: servicesRouter,
  pricingParameters: pricingParametersRouter,
  proposals: proposalsRouter,
  pricingCalculations: pricingCalculationsRouter,
  assessmentProposals: assessmentProposalsRouter,

  // Routers de gestão
  auditLogs: auditLogsRouter,
  userInvites: userInvitesRouter,
  rolesPermissions: rolesPermissionsRouter,

  // Routers de avaliações
  assessments: assessmentsRouter,
  webhook: webhookRouter,

  // Routers de monetização
  subscriptions: subscriptionsRouter,
  asaas: asaasRouter,
  pdfExports: pdfExportsRouter,

  // Phase 5: White-Label (Enterprise)
  branding: brandingRouter,

  // Phase 6: Webhooks and Public API (Enterprise)
  webhooks: webhooksRouter,
  apiKeys: apiKeysRouter,

  // Phase 7: Security Improvements
  twoFactor: twoFactorRouter,
  security: securityRouter,

  // Phase 8: Advanced Analytics
  analytics: analyticsRouter,

  // Phase 10: Automated Onboarding
  onboarding: onboardingRouter,

  // LGPD: Data Subject Rights (DSR)
  dataExport: dataExportRouter,

  // Phase IA: AI-powered analysis
  ai: aiRouter,

  // Admin Operations
  adminSubscriptions: adminSubscriptionsRouter,
  supportTickets: supportTicketsRouter,
  adminMetrics: adminMetricsRouter,

  // Entregáveis NR-01 Completos
  pcmsoIntegration: pcmsoIntegrationRouter,
  psychosocialDashboard: psychosocialDashboardRouter,
  financialCalculator: financialCalculatorRouter,
  complianceTimeline: complianceTimelineRouter,
  complianceChecklist: complianceChecklistRouter,
  complianceCertificate: complianceCertificateRouter,
  benchmark: benchmarkRouter,
  climateSurveys: climateSurveysRouter,
  training: trainingRouter,
  anonymousReports: anonymousReportsRouter,
  deadlineAlerts: deadlineAlertsRouter,
  ergonomicAssessments: ergonomicAssessmentsRouter,
  esocialExport: esocialExportRouter,

  // PDF Export centralizado para todos os entregáveis NR-01
  nr01Pdf: nr01PdfExportRouter,

  // Gerenciamento de empresas (consultores)
  companies: companiesRouter,

  // Agente IA NR-01
  agent: agentRouter,

  // Agente de Suporte IA
  supportAgent: supportAgentRouter,

  // Monitoramento (Admin Master)
  adminMonitoring: adminMonitoringRouter,

  // Certificações profissionais (consultorias)
  consultantCertifications: consultantCertificationsRouter,
});

export type AppRouter = typeof appRouter;
