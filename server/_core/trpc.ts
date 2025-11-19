import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const mockUser = {
  id: "mock-user-id",
  email: "mock@blackbelt.com",
  name: "Mock User",
  role: "admin", // Definir como admin para ter acesso a tudo
  tenantId: "mock-tenant-id",
};

const mockRequireUser = t.middleware(async ({ ctx, next }) => {
  // Ignorar a verificação de autenticação e injetar um usuário mock
  return next({
    ctx: {
      ...ctx,
      user: mockUser,
    },
  });
});

export const protectedProcedure = t.procedure.use(mockRequireUser);

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
