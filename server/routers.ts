import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { peopleRouter } from "./routers/people";
import { sectorsRouter } from "./routers/sectors";
import { tenantsRouter } from "./routers/tenants";
import { riskAssessmentsRouter } from "./routers/riskAssessments";
import { auditLogsRouter } from "./routers/auditLogs";
import { pricingRouter } from "./routers/pricing";
import { userInvitesRouter } from "./routers/userInvites";
import { rolesPermissionsRouter } from "./routers/rolesPermissions";
import { complianceReportsRouter } from "./routers/complianceReports";

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
  
  // Routers de conformidade NR-01
  riskAssessments: riskAssessmentsRouter,
  complianceReports: complianceReportsRouter,
  
  // Routers de precificação
  pricing: pricingRouter,
  
  // Routers de gestão
  auditLogs: auditLogsRouter,
  userInvites: userInvitesRouter,
  rolesPermissions: rolesPermissionsRouter,
});

export type AppRouter = typeof appRouter;

