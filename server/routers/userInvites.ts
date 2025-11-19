import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { userInvites } from "../../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

export const userInvitesRouter = router({
  // Listar convites
  list: publicProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      status: z.enum(["pending", "accepted", "expired", "cancelled"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [];

      if (input.tenantId !== undefined) {
        if (input.tenantId === "") {
          conditions.push(isNull(userInvites.tenantId));
        } else {
          conditions.push(eq(userInvites.tenantId, input.tenantId));
        }
      }

      if (input.status) {
        conditions.push(eq(userInvites.status, input.status));
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

  // Obter convite por ID
  getById: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [invite] = await db
        .select()
        .from(userInvites)
        .where(eq(userInvites.id, input.id));

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

      return invite;
    }),

  // Obter convite por token
  getByToken: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

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

        throw new TRPCError({ code: "BAD_REQUEST", message: "Invite has expired" });
      }

      return invite;
    }),

  // Criar novo convite
  create: publicProcedure
    .input(z.object({
      tenantId: z.string().optional(),
      email: z.string().email(),
      roleId: z.string(),
      invitedBy: z.string(),
      expiresInDays: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

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
        invitedBy: input.invitedBy || ctx.user.id,
        expiresAt,
        createdAt: new Date(),
      });

      return { 
        id, 
        token,
        inviteUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/accept-invite?token=${token}`
      };
    }),

  // Aceitar convite
  accept: publicProcedure
    .input(z.object({
      token: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [invite] = await db
        .select()
        .from(userInvites)
        .where(eq(userInvites.token, input.token));

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

      if (invite.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invite is not pending" });
      }

      if (invite.expiresAt < new Date()) {
        await db
          .update(userInvites)
          .set({ status: "expired" })
          .where(eq(userInvites.id, invite.id));

        throw new TRPCError({ code: "BAD_REQUEST", message: "Invite has expired" });
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

  // Cancelar convite
  cancel: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(userInvites)
        .set({ status: "cancelled" })
        .where(eq(userInvites.id, input.id));

      return { success: true };
    }),

  // Reenviar convite
  resend: publicProcedure
    .input(z.object({
      id: z.string(),
      expiresInDays: z.number().min(1).max(30).default(7),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [invite] = await db
        .select()
        .from(userInvites)
        .where(eq(userInvites.id, input.id));

      if (!invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" });
      }

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
        inviteUrl: `${process.env.VITE_APP_URL || 'http://localhost:3000'}/accept-invite?token=${newToken}`
      };
    }),

  // Deletar convite
  delete: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .delete(userInvites)
        .where(eq(userInvites.id, input.id));

      return { success: true };
    }),
});
