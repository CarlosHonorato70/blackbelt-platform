import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk-standalone";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { nanoid } from "nanoid";
import crypto from "crypto";

// Simple password hashing (use bcrypt in production!)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export const authStandaloneRouter = router({
  // Login com email e senha
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await db.getUserByEmail(input.email);

      if (!user) {
        throw new Error("User not found");
      }

      // Check password
      if (!verifyPassword(input.password, user.passwordHash || "")) {
        throw new Error("Invalid password");
      }

      // Create session token
      const token = await sdk.createSessionToken(
        user.id,
        user.email || "",
        user.name || ""
      );

      // Set cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  // Register novo usuário
  register: publicProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user already exists
      const existingUser = await db.getUserByEmail(input.email);
      if (existingUser) {
        throw new Error("User already exists");
      }

      // Create new user
      const userId = nanoid();
      const passwordHash = hashPassword(input.password);

      await db.upsertUser({
        id: userId,
        name: input.name,
        email: input.email,
        passwordHash,
        loginMethod: "email",
        role: "user",
      });

      // Create session token
      const token = await sdk.createSessionToken(
        userId,
        input.email,
        input.name
      );

      // Set cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      return {
        success: true,
        user: {
          id: userId,
          name: input.name,
          email: input.email,
          role: "user",
        },
      };
    }),

  // Get current user
  me: publicProcedure.query(opts => opts.ctx.user),

  // Logout
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),

  // Reset password
  resetPassword: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const user = await db.getUserByEmail(input.email);

      if (!user) {
        throw new Error("User not found");
      }

      // Hash new password
      const passwordHash = hashPassword(input.newPassword);

      // Update user password
      await db.upsertUser({
        id: user.id,
        passwordHash,
      });

      return {
        success: true,
        message: "Password updated successfully",
      };
    }),
});
