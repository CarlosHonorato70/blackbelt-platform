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
import { stripeRouter } from "./routers/stripe";
import { mercadoPagoRouter } from "./routers/mercadopago";
import { pdfExportsRouter } from "./routers/pdfExports";
import { brandingRouter } from "./routers/branding";

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
  stripe: stripeRouter,
  mercadoPago: mercadoPagoRouter,
  pdfExports: pdfExportsRouter,

  // Phase 5: White-Label (Enterprise)
  branding: brandingRouter,
});

export type AppRouter = typeof appRouter;
