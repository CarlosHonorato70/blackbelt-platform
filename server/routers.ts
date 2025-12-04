import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { assessmentProposalsRouter, clientsRouter, pricingParametersRouter, pricingRouter, proposalsRouter, servicesRouter } from "./routers/pricing";
import { peopleRouter } from "./routers/people";
import { sectorsRouter } from "./routers/sectors";
import { tenantsRouter } from "./routers/tenants";
import { authStandaloneRouter } from "./routers/auth-standalone";
import { assessmentsRouter } from "./routers/assessments";

export const appRouter = router({
  system: systemRouter,

  auth: authStandaloneRouter,

  // Routers de negócio
  tenants: tenantsRouter,
  sectors: sectorsRouter,
  people: peopleRouter,

  // Routers de precificação
  clients: clientsRouter,
  services: servicesRouter,
  pricingParameters: pricingParametersRouter,
  proposals: proposalsRouter,
  pricing: pricingRouter,
  assessmentProposals: assessmentProposalsRouter,

  // Routers de avaliações
  assessments: assessmentsRouter,
});

export type AppRouter = typeof appRouter;

