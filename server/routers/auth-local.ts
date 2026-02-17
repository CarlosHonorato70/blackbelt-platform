import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions, createSessionToken } from "../_core/cookies";

export const authLocalRouter = router({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
        email: z.string().email("Email invalido"),
        password: z.string().min(8, "Senha deve ter no minimo 8 caracteres"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getUserByEmail(input.email);
      if (existing) {
        throw new Error("Email ja cadastrado");
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const userId = nanoid();

      await db.upsertUser({
        id: userId,
        name: input.name,
        email: input.email,
        passwordHash,
        loginMethod: "local",
      });

      // Cria token de sessao OPACO e ASSINADO (nao userId bruto)
      const sessionToken = createSessionToken(userId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

      return { success: true };
    }),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        throw new Error("Email ou senha incorretos");
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new Error("Email ou senha incorretos");
      }

      // Cria token de sessao OPACO e ASSINADO
      const sessionToken = createSessionToken(user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

      return { success: true };
    }),

  me: publicProcedure.query(({ ctx }) => ctx.user || null),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),
});
