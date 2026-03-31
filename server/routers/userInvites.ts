import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import * as dbOps from "../db";
import { userInvites, users } from "../../drizzle/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { getSubscriptionContext } from "../_core/subscriptionMiddleware";

/**
 * Verifica se o usuário pode gerenciar convites para o tenantId dado.
 * Admin: qualquer tenant. Consultor: próprio tenant ou empresas-filhas. Empresa: não pode.
 */
async function assertCanManageInvites(ctx: any, targetTenantId?: string | null) {
  if (ctx.user?.role === "admin") return;

  const userTenantId = ctx.user?.tenantId;
  if (!userTenantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
  }

  // Verificar se o usuário é consultor
  const ownTenant = await dbOps.getTenant(userTenantId);
  if (!ownTenant || ownTenant.tenantType !== "consultant") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores e consultores podem gerenciar convites" });
  }

  // Consultor pode convidar para seu próprio tenant
  if (!targetTenantId || targetTenantId === userTenantId) return;

  // Consultor pode convidar para empresas-filhas
  const targetTenant = await dbOps.getTenant(targetTenantId);
  if (!targetTenant || targetTenant.parentTenantId !== userTenantId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado a este tenant" });
  }
}

export const userInvitesRouter = router({
  // Listar convites (escopo por tenant do usuario)
  list: protectedProcedure
    .input(
      z.object({
        status: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const isAdmin = ctx.user?.role === "admin";
      const conditions = [];

      // Admin ve todos; outros veem apenas do proprio tenant (+ filhas se consultor)
      if (!isAdmin && ctx.user?.tenantId) {
        const ownTenant = await dbOps.getTenant(ctx.user.tenantId);
        if (ownTenant?.tenantType === "consultant") {
          const allTenants = await dbOps.listTenants({});
          const childIds = allTenants
            .filter((t: any) => t.parentTenantId === ctx.user!.tenantId)
            .map((t: any) => t.id);
          const allowedIds = [ctx.user.tenantId, ...childIds];
          conditions.push(
            sql`${userInvites.tenantId} IN (${sql.join(allowedIds.map(id => sql`${id}`), sql`, `)})`
          );
        } else {
          conditions.push(eq(userInvites.tenantId, ctx.user.tenantId));
        }
      }

      if (input.status) {
        conditions.push(eq(userInvites.status, input.status as any));
      }

      let query = db.select().from(userInvites);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const invites = await query
        .orderBy(desc(userInvites.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return invites;
    }),

  // Obter convite por ID (com verificacao de tenant)
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [invite] = await db
        .select()
        .from(userInvites)
        .where(eq(userInvites.id, input.id));

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

      // Verificar acesso ao convite
      await assertCanManageInvites(ctx, invite.tenantId);

      return invite;
    }),

  // Obter convite por token
  getByToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [invite] = await db
        .select()
        .from(userInvites)
        .where(eq(userInvites.token, input.token));

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

      // Verificar se expirou
      if (invite.expiresAt < new Date()) {
        // Atualizar status para expirado
        await db
          .update(userInvites)
          .set({ status: "expired" })
          .where(eq(userInvites.id, invite.id));

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has expired",
        });
      }

      return invite;
    }),

  // Criar novo convite (admin ou consultor para próprio tenant/empresas-filhas)
  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        email: z.string().email(),
        roleId: z.string(),
        invitedBy: z.string().optional(),
        expiresInDays: z.number().default(7),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await assertCanManageInvites(ctx, input.tenantId);

      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verificar limite de usuários do plano
      const targetTenantId = input.tenantId || ctx.user?.tenantId;
      if (targetTenantId) {
        // Buscar contexto de assinatura (do tenant ou do pai)
        let subCtx = await getSubscriptionContext(targetTenantId);
        if (!subCtx) {
          const tenant = await dbOps.getTenant(targetTenantId);
          if (tenant?.parentTenantId) {
            subCtx = await getSubscriptionContext(tenant.parentTenantId);
          }
        }
        if (subCtx && subCtx.isActive) {
          const maxUsers = subCtx.plan.maxUsersPerTenant;
          if (maxUsers > 0) {
            const [countResult] = await db
              .select({ count: sql<number>`count(*)` })
              .from(users)
              .where(eq(users.tenantId, targetTenantId));
            const currentUsers = countResult?.count ?? 0;
            if (currentUsers >= maxUsers) {
              throw new TRPCError({
                code: "FORBIDDEN",
                message: `Limite de ${maxUsers} usuário(s) atingido neste tenant. Faça upgrade do plano para adicionar mais usuários.`,
              });
            }
          }
        }
      }

      const id = nanoid();
      const token = nanoid(32);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      await db.insert(userInvites).values({
        id,
        tenantId: input.tenantId || null,
        email: input.email,
        roleId: input.roleId,
        token,
        status: "pending",
        invitedBy: input.invitedBy || ctx.user?.id || "system",
        expiresAt,
        createdAt: new Date(),
      });

      return {
        id,
        token,
        inviteUrl: `${process.env.VITE_APP_URL || "http://localhost:3000"}/accept-invite?token=${token}`,
      };
    }),

  // Aceitar convite
  accept: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [invite] = await db
        .select()
        .from(userInvites)
        .where(eq(userInvites.token, input.token));

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

      if (invite.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite is not pending",
        });
      }

      if (invite.expiresAt < new Date()) {
        await db
          .update(userInvites)
          .set({ status: "expired" })
          .where(eq(userInvites.id, invite.id));

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has expired",
        });
      }

      // Atualizar status do convite
      await db
        .update(userInvites)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
        })
        .where(eq(userInvites.id, invite.id));

      return {
        success: true,
        tenantId: invite.tenantId,
        roleId: invite.roleId,
      };
    }),

  // Cancelar convite (admin ou consultor dono)
  cancel: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [invite] = await db.select().from(userInvites).where(eq(userInvites.id, input.id));
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado" });

      await assertCanManageInvites(ctx, invite.tenantId);

      await db
        .update(userInvites)
        .set({ status: "cancelled" })
        .where(eq(userInvites.id, input.id));

      return { success: true };
    }),

  // Reenviar convite (admin ou consultor dono)
  resend: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        expiresInDays: z.number().default(7),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [invite] = await db
        .select()
        .from(userInvites)
        .where(eq(userInvites.id, input.id));

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

      await assertCanManageInvites(ctx, invite.tenantId);

      // Gerar novo token e nova data de expiração
      const newToken = nanoid(32);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      await db
        .update(userInvites)
        .set({
          token: newToken,
          status: "pending",
          expiresAt,
        })
        .where(eq(userInvites.id, input.id));

      return {
        success: true,
        token: newToken,
        inviteUrl: `${process.env.VITE_APP_URL || "http://localhost:3000"}/accept-invite?token=${newToken}`,
      };
    }),

  // Deletar convite (admin ou consultor dono)
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [invite] = await db.select().from(userInvites).where(eq(userInvites.id, input.id));
      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado" });

      await assertCanManageInvites(ctx, invite.tenantId);

      await db.delete(userInvites).where(eq(userInvites.id, input.id));

      return { success: true };
    }),
});
