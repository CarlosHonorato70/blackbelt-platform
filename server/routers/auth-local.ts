import { z } from "zod";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { log } from "../_core/logger";
import * as db from "../db";
import { getDb } from "../db";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions, createSessionToken } from "../_core/cookies";
import { ENV } from "../_core/env";
import { sendEmail } from "../_core/email";
import { eq } from "drizzle-orm";
import { roles, userRoles, users } from "../../drizzle/schema";
import { getSubscriptionContext } from "../_core/subscriptionMiddleware";
import { ensureTenantForUser } from "../_core/tenantHelpers";

// Password reset token helpers (HMAC-signed, no DB needed)
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const VERIFY_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

function createResetToken(userId: string): string {
  return createHmacToken(userId, "-reset", RESET_TOKEN_EXPIRY_MS);
}

function verifyResetToken(token: string): { userId: string; tokenCreatedAt: number } | null {
  return verifyHmacToken(token, "-reset");
}

// Generic HMAC token helpers (reused for reset and email verification)
function createHmacToken(userId: string, suffix: string, expiryMs: number): string {
  const expiry = Date.now() + expiryMs;
  const payload = `${userId}.${expiry}`;
  const signature = crypto
    .createHmac("sha256", ENV.cookieSecret + suffix)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

function verifyHmacToken(token: string, suffix: string): { userId: string; tokenCreatedAt: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(".");
    if (parts.length !== 3) return null;

    const [userId, expiryStr, providedSig] = parts;
    if (!userId || !expiryStr || !providedSig) return null;

    const payload = `${userId}.${expiryStr}`;
    const expectedSig = crypto
      .createHmac("sha256", ENV.cookieSecret + suffix)
      .update(payload)
      .digest("hex");

    const sigBuf = Buffer.from(providedSig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

    if (Date.now() > parseInt(expiryStr, 10)) return null;

    const tokenCreatedAt = Number(expiryStr) - RESET_TOKEN_EXPIRY_MS;
    return { userId, tokenCreatedAt };
  } catch {
    return null;
  }
}

function createVerifyToken(userId: string): string {
  return createHmacToken(userId, "-verify", VERIFY_TOKEN_EXPIRY_MS);
}

function verifyVerifyToken(token: string): { userId: string } | null {
  return verifyHmacToken(token, "-verify");
}

async function sendVerificationEmail(email: string, name: string | null, token: string) {
  const frontendUrl = process.env.VITE_FRONTEND_URL || "http://localhost:5000";
  const verifyUrl = `${frontendUrl}/verify-email/${token}`;

  await sendEmail({
    to: email,
    subject: "Verifique seu Email - Black Belt Platform",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4C1D95;">Verificação de Email</h2>
        <p>Olá${name ? `, ${name}` : ""},</p>
        <p>Obrigado por se cadastrar na Black Belt Platform! Para garantir a segurança da sua conta, por favor verifique seu email clicando no botão abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}"
             style="background-color: #7C3AED; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Verificar Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Este link expira em 24 horas.</p>
        <p style="color: #666; font-size: 14px;">Se você não criou esta conta, ignore este email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #999; font-size: 12px;">Black Belt Platform - Gestão de Riscos Psicossociais</p>
      </div>
    `,
    text: `Verificação de Email\n\nAcesse o link para verificar seu email: ${verifyUrl}\n\nEste link expira em 24 horas.`,
  });
}

// Track used password reset tokens to prevent reuse
const usedResetTokens = new Set<string>();

export const authLocalRouter = router({
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
        email: z.string().email("Email invalido"),
        password: z.string().min(8, "Senha deve ter no minimo 8 caracteres"),
        tenantId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await db.getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Email ja cadastrado",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const userId = nanoid();

      // Auto-create tenant for new user if none provided
      const tenantId = await ensureTenantForUser(userId, input.name, input.email, input.tenantId);

      await db.upsertUser({
        id: userId,
        name: input.name,
        email: input.email,
        passwordHash,
        loginMethod: "local",
        tenantId,
      });

      // Cria token de sessao OPACO e ASSINADO (nao userId bruto)
      const sessionToken = createSessionToken(userId);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

      // Envia email de verificação (fire-and-forget — sem await para não bloquear resposta)
      const verifyToken = createVerifyToken(userId);
      sendVerificationEmail(input.email, input.name, verifyToken).catch((err) => {
        log.error("Failed to send verification email", { error: err instanceof Error ? err.message : String(err) });
      });

      return { success: true };
    }),

  login: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ipAddress = ctx.req.ip || ctx.req.socket.remoteAddress || null;
      const userAgent = ctx.req.headers["user-agent"] || null;

      const user = await db.getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        // Registra tentativa falha (usuario nao encontrado)
        await db.recordLoginAttempt({
          email: input.email,
          userId: null,
          success: false,
          ipAddress,
          userAgent,
          failureReason: "user_not_found",
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou senha incorretos",
        });
      }

      // Verificar se a conta esta bloqueada
      const lockedMinutes = db.getLockedMinutesRemaining(
        (user as any).lockedUntil
      );
      if (lockedMinutes > 0) {
        await db.recordLoginAttempt({
          email: input.email,
          userId: user.id,
          success: false,
          ipAddress,
          userAgent,
          failureReason: "account_locked",
        });
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `Conta bloqueada por excesso de tentativas. Tente novamente em ${lockedMinutes} minuto(s).`,
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        // Registra falha e possivelmente bloqueia
        const currentFailed = (user as any).failedLoginAttempts || 0;
        const wasLocked = await db.handleFailedLogin(user.id, currentFailed);

        await db.recordLoginAttempt({
          email: input.email,
          userId: user.id,
          success: false,
          ipAddress,
          userAgent,
          failureReason: "invalid_password",
        });

        if (wasLocked) {
          log.warn("Account locked due to failed login attempts", {
            email: input.email,
            ip: ipAddress,
          });
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Conta bloqueada por excesso de tentativas. Tente novamente em 30 minutos.",
          });
        }

        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou senha incorretos",
        });
      }

      // Login com sucesso — resetar contadores de lockout
      await db.resetLoginAttempts(user.id);

      // Registra tentativa de sucesso
      await db.recordLoginAttempt({
        email: input.email,
        userId: user.id,
        success: true,
        ipAddress,
        userAgent,
        failureReason: null,
      });

      // Atualiza lastSignedIn
      await db.upsertUser({
        id: user.id,
        lastSignedIn: new Date(),
      });

      // Cria token de sessao OPACO e ASSINADO com expiracao
      const sessionToken = createSessionToken(user.id);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

      return { success: true };
    }),

  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;

    // Verificar assinatura do tenant
    let subscriptionStatus: string | null = null;
    if (ctx.user.tenantId) {
      const subCtx = await getSubscriptionContext(ctx.user.tenantId);
      subscriptionStatus = subCtx?.subscription?.status ?? null;
    }

    return {
      id: ctx.user.id,
      name: ctx.user.name,
      email: ctx.user.email,
      role: ctx.user.role,
      tenantId: ctx.user.tenantId,
      emailVerified: (ctx.user as any).emailVerified ?? false,
      subscriptionStatus,
    };
  }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),

  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      // Always return success to prevent email enumeration
      const user = await db.getUserByEmail(input.email);
      if (!user || !user.passwordHash) {
        return { success: true };
      }

      const resetToken = createResetToken(user.id);
      const frontendUrl =
        process.env.VITE_FRONTEND_URL || "http://localhost:5000";
      const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

      await sendEmail({
        to: input.email,
        subject: "Recuperação de Senha - Black Belt Platform",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4C1D95;">Recuperação de Senha</h2>
            <p>Olá${user.name ? `, ${user.name}` : ""},</p>
            <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #7C3AED; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                Redefinir Senha
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Este link expira em 1 hora.</p>
            <p style="color: #666; font-size: 14px;">Se você não solicitou esta alteração, ignore este email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px;">Black Belt Platform - Gestão de Riscos Psicossociais</p>
          </div>
        `,
        text: `Recuperação de Senha\n\nAcesse o link para redefinir sua senha: ${resetUrl}\n\nEste link expira em 1 hora.`,
      });

      return { success: true };
    }),

  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
      })
    )
    .mutation(async ({ input }) => {
      // Check if token was already used (in-memory + DB check)
      if (usedResetTokens.has(input.token)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este link já foi utilizado. Solicite um novo.",
        });
      }

      const result = verifyResetToken(input.token);
      if (!result) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Link de recuperação inválido ou expirado. Solicite um novo.",
        });
      }

      // Check if password was already changed after this token was created (persistent check)
      const drizzle = await getDb();
      const [user] = await drizzle.select({ passwordChangedAt: users.passwordChangedAt })
        .from(users).where(eq(users.id, result.userId)).limit(1);
      if (user?.passwordChangedAt && user.passwordChangedAt.getTime() > result.tokenCreatedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este link já foi utilizado. Solicite um novo.",
        });
      }

      // Mark token as used in memory
      usedResetTokens.add(input.token);
      if (usedResetTokens.size > 10000) {
        usedResetTokens.clear();
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      await db.upsertUser({
        id: result.userId,
        passwordHash,
      });

      // Update passwordChangedAt timestamp (persistent token invalidation)
      await drizzle.update(users)
        .set({ passwordChangedAt: new Date() })
        .where(eq(users.id, result.userId));

      return { success: true };
    }),

  verifyEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const result = verifyVerifyToken(input.token);
      if (!result) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Link de verificação inválido ou expirado. Solicite um novo.",
        });
      }

      await db.upsertUser({
        id: result.userId,
        emailVerified: true,
      } as any);

      return { success: true };
    }),

  resendVerificationEmail: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Faça login primeiro",
      });
    }

    if ((ctx.user as any).emailVerified) {
      return { success: true, message: "Email já verificado" };
    }

    try {
      const verifyToken = createVerifyToken(ctx.user.id);
      await sendVerificationEmail(
        ctx.user.email!,
        ctx.user.name || null,
        verifyToken
      );
    } catch (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Erro ao enviar email de verificação",
      });
    }

    return { success: true };
  }),
});
