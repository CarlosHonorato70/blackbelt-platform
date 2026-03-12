import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context";
import { requireActiveSubscription } from "./subscriptionMiddleware";
import { withPermission } from "./permissionMiddleware";

const t = initTRPC.context<Context>().create();

export { t };
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

// Procedimento apenas para consultores (tenantType = "consultant")
// Usado em: criar avaliações, enviar convites, criar propostas, gerenciar empresas
const requireConsultant = t.middleware(async ({ ctx, next }) => {
  const tenantId = (ctx as any).tenantId as string;
  if (!tenantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Organização não encontrada" });
  }

  // Admin bypassa (pode operar como qualquer tipo)
  if (ctx.user && ctx.user.role === "admin") {
    return next({ ctx });
  }

  // Verificar se o tenant é do tipo consultant
  const { getTenant } = await import("../db");
  const tenant = await getTenant(tenantId);

  if (!tenant || tenant.tenantType !== "consultant") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Esta ação é permitida apenas para consultores/consultorias",
    });
  }

  return next({ ctx });
});

export const consultantProcedure = tenantProcedure.use(requireConsultant);

// Procedimento tenant + verificação de permissão RBAC
// Uso: permittedProcedure("people", "create") — admin faz bypass automático
export function permittedProcedure(resource: string, action: string) {
  return tenantProcedure.use(t.middleware(withPermission(resource, action)));
}
