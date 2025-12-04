import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk-standalone";

export const authSimpleRouter = router({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const existing = await db.getUserByEmail(input.email);
        if (existing) {
          throw new Error("Este email já está cadastrado");
        }

        const passwordHash = await bcrypt.hash(input.password, 10);
        const userId = nanoid();

        await db.upsertUser({
          id: userId,
          name: input.name,
          email: input.email,
          passwordHash,
          loginMethod: "local",
          role: "user",
        });

        // Create JWT session
        const sessionToken = await sdk.signSession({
          userId,
          email: input.email,
          name: input.name,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return { success: true, userId };
      } catch (error: any) {
        console.error("[Auth] Register error:", error);
        throw new Error(error.message || "Erro ao registrar");
      }
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(1, "Senha é obrigatória"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new Error("Email ou senha incorretos");
        }

        const validPassword = await bcrypt.compare(input.password, user.passwordHash);
        if (!validPassword) {
          throw new Error("Email ou senha incorretos");
        }

        await db.upsertUser({
          id: user.id,
          lastSignedIn: new Date(),
        });

        // Create JWT session
        const sessionToken = await sdk.signSession({
          userId: user.id,
          email: user.email || "",
          name: user.name || "",
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return { success: true, userId: user.id };
      } catch (error: any) {
        console.error("[Auth] Login error:", error);
        throw new Error(error.message || "Erro ao fazer login");
      }
    }),

  me: publicProcedure.query((opts) => opts.ctx.user || null),

  logout: publicProcedure.mutation(({ ctx }) => {
    try {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    } catch (error: any) {
      console.error("[Auth] Logout error:", error);
      throw new Error(error.message || "Erro ao fazer logout");
    }
  }),
});
