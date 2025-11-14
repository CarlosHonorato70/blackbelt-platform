import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { assessmentProposalsRouter, clientsRouter, pricingParametersRouter, pricingRouter, proposalsRouter, servicesRouter } from "./routers/pricing";
import { peopleRouter } from "./routers/people";
import { sectorsRouter } from "./routers/sectors";
import { tenantsRouter } from "./routers/tenants";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

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
});

export type AppRouter = typeof appRouter;

