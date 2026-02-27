import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { requireActiveSubscription } from "./subscriptionMiddleware";

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware de autenticação REAL
const requireUser = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED", 
      message: "Você precisa estar autenticado para acessar este recurso" 
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

// Middleware de tenant (para multi-tenancy)
const requireTenant = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED", 
      message: "Você precisa estar autenticado" 
    });
  }

  if (!ctx.user.tenantId) {
    throw new TRPCError({ 
      code: "FORBIDDEN", 
      message: "Você precisa estar associado a uma organização" 
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.user.tenantId,
    },
  });
});

export const tenantProcedure = t.procedure.use(requireTenant);

// Procedimento que exige tenant + assinatura ativa (para operações de escrita)
const requireSubscription = t.middleware(async ({ ctx, next }) => {
  const tenantId = (ctx as any).tenantId as string;
  if (tenantId) {
    await requireActiveSubscription(tenantId);
  }
  return next({ ctx });
});

export const subscribedProcedure = tenantProcedure.use(requireSubscription);

const NOT_ADMIN_ERR_MSG = "Você precisa ser um administrador para acessar este recurso";

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);
