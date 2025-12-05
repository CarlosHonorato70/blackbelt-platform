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
} from "./routers/pricing";
import { peopleRouter } from "./routers/people";
import { sectorsRouter } from "./routers/sectors";
import { tenantsRouter } from "./routers/tenants";
import { riskAssessmentsRouter } from "./routers/riskAssessments";
import { auditLogsRouter } from "./routers/auditLogs";
import { pricingRouter } from "./routers/pricing";
import { userInvitesRouter } from "./routers/userInvites";
import { rolesPermissionsRouter } from "./routers/rolesPermissions";
import { complianceReportsRouter } from "./routers/complianceReports";
import { authLocalRouter } from "./routers/auth-local";
import { assessmentsRouter } from "./routers/assessments";
import { webhookRouter } from "./routers/webhook";

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

  // Routers de gestão
  auditLogs: auditLogsRouter,
  userInvites: userInvitesRouter,
  rolesPermissions: rolesPermissionsRouter,
  // Routers de precificação
  clients: clientsRouter,
  services: servicesRouter,
  pricingParameters: pricingParametersRouter,
  proposals: proposalsRouter,
  pricing: pricingRouter,
  assessmentProposals: assessmentProposalsRouter,

  // Routers de avaliações
  assessments: assessmentsRouter,
  webhook: webhookRouter,
});

export type AppRouter = typeof appRouter;
