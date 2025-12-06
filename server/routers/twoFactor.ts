/**
 * Phase 7: Two-Factor Authentication (2FA/MFA) Router
 * 
 * Implements TOTP-based two-factor authentication with:
 * - QR code generation for authenticator apps
 * - Backup codes for recovery
 * - Enable/disable 2FA
 * - Verification during login
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { user2FA, users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";

// TOTP implementation (simplified - in production use otplib)
const TOTP_WINDOW = 30; // 30 second window
const TOTP_DIGITS = 6;

/**
 * Generate TOTP secret (base32 encoded)
 */
function generateSecret(): string {
  const buffer = crypto.randomBytes(20);
  return buffer.toString("base64").replace(/=/g, "");
}

/**
 * Generate TOTP code from secret
 */
function generateTOTP(secret: string, timeStep?: number): string {
  const time = timeStep || Math.floor(Date.now() / 1000 / TOTP_WINDOW);
  const hmac = crypto.createHmac("sha1", Buffer.from(secret, "base64"));
  
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(time, 4);
  hmac.update(timeBuffer);
  
  const hash = hmac.digest();
  const offset = hash[hash.length - 1] & 0xf;
  const code = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  );
  
  return (code % Math.pow(10, TOTP_DIGITS)).toString().padStart(TOTP_DIGITS, "0");
}

/**
 * Verify TOTP code
 */
function verifyTOTP(secret: string, code: string, window: number = 1): boolean {
  const currentTime = Math.floor(Date.now() / 1000 / TOTP_WINDOW);
  
  // Check current time and ±window
  for (let i = -window; i <= window; i++) {
    const expectedCode = generateTOTP(secret, currentTime + i);
    if (expectedCode === code) {
      return true;
    }
  }
  
  return false;
}

/**
 * Generate backup codes (8 codes, 10 characters each)
 */
function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${code.substring(0, 5)}-${code.substring(5, 10)}`);
  }
  return codes;
}

/**
 * Hash backup code for storage
 */
function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Generate QR code data URL for authenticator app
 */
function generateQRCodeDataURL(secret: string, email: string, issuer: string = "BlackBelt Platform"): string {
  // In production, use qrcode library to generate actual QR code image
  // For now, return the otpauth URL
  const otpauthUrl = `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`;
  
  // Simplified: return URL that can be used with QR code generator
  // In real implementation: use qrcode.toDataURL(otpauthUrl)
  return otpauthUrl;
}

/**
 * 2FA Router
 */
export const twoFactorRouter = router({
  /**
   * Get 2FA status for current user
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const twoFA = await db.query.user2FA.findFirst({
      where: eq(user2FA.userId, ctx.userId),
    });

    return {
      enabled: twoFA?.enabled || false,
      verifiedAt: twoFA?.verifiedAt || null,
    };
  }),

  /**
   * Enable 2FA - Step 1: Generate secret and QR code
   */
  enable: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    // Check if 2FA already enabled
    const existing = await db.query.user2FA.findFirst({
      where: eq(user2FA.userId, ctx.userId),
    });

    if (existing?.enabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "2FA is already enabled",
      });
    }

    // Get user email
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.userId),
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    // Generate secret
    const secret = generateSecret();
    const qrCodeURL = generateQRCodeDataURL(secret, user.email || "user@blackbelt.com");

    // Save secret (not enabled yet - needs verification)
    if (existing) {
      await db
        .update(user2FA)
        .set({ secret, enabled: false, updatedAt: new Date() })
        .where(eq(user2FA.userId, ctx.userId));
    } else {
      await db.insert(user2FA).values({
        id: nanoid(),
        userId: ctx.userId,
        secret,
        enabled: false,
      });
    }

    return {
      secret, // Show to user for manual entry
      qrCodeURL, // Use to generate QR code on frontend
      message: "Scan QR code with your authenticator app",
    };
  }),

  /**
   * Enable 2FA - Step 2: Verify code and enable
   */
  verify: protectedProcedure
    .input(
      z.object({
        code: z.string().length(6).regex(/^\d{6}$/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const twoFA = await db.query.user2FA.findFirst({
        where: eq(user2FA.userId, ctx.userId),
      });

      if (!twoFA) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "2FA not initialized. Call enable first.",
        });
      }

      if (twoFA.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA is already enabled",
        });
      }

      // Verify TOTP code
      const isValid = verifyTOTP(twoFA.secret, input.code);

      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code",
        });
      }

      // Generate backup codes
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = backupCodes.map(hashBackupCode);

      // Enable 2FA
      await db
        .update(user2FA)
        .set({
          enabled: true,
          backupCodes: JSON.stringify(hashedBackupCodes),
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(user2FA.userId, ctx.userId));

      return {
        success: true,
        backupCodes, // Show to user ONCE
        message: "2FA enabled successfully. Save your backup codes securely.",
      };
    }),

  /**
   * Verify 2FA code (during login or sensitive operations)
   */
  verifyCode: protectedProcedure
    .input(
      z.object({
        code: z.string().min(6).max(12), // TOTP or backup code
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const twoFA = await db.query.user2FA.findFirst({
        where: eq(user2FA.userId, ctx.userId),
      });

      if (!twoFA?.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA is not enabled",
        });
      }

      // Try TOTP code first
      if (input.code.length === 6) {
        const isValid = verifyTOTP(twoFA.secret, input.code);
        if (isValid) {
          return { success: true, method: "totp" };
        }
      }

      // Try backup code
      if (input.code.includes("-")) {
        const hashedCode = hashBackupCode(input.code);
        const backupCodes = JSON.parse(twoFA.backupCodes as string) as string[];
        
        const codeIndex = backupCodes.indexOf(hashedCode);
        if (codeIndex !== -1) {
          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          await db
            .update(user2FA)
            .set({
              backupCodes: JSON.stringify(backupCodes),
              updatedAt: new Date(),
            })
            .where(eq(user2FA.userId, ctx.userId));
          
          return {
            success: true,
            method: "backup",
            remainingBackupCodes: backupCodes.length,
          };
        }
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid verification code",
      });
    }),

  /**
   * Disable 2FA
   */
  disable: protectedProcedure
    .input(
      z.object({
        code: z.string().min(6), // Require 2FA code to disable
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const twoFA = await db.query.user2FA.findFirst({
        where: eq(user2FA.userId, ctx.userId),
      });

      if (!twoFA?.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA is not enabled",
        });
      }

      // Verify code before disabling
      const isValid = verifyTOTP(twoFA.secret, input.code);
      if (!isValid) {
        // Also check backup codes
        const hashedCode = hashBackupCode(input.code);
        const backupCodes = JSON.parse(twoFA.backupCodes as string) as string[];
        
        if (!backupCodes.includes(hashedCode)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid verification code",
          });
        }
      }

      // Disable 2FA
      await db
        .update(user2FA)
        .set({
          enabled: false,
          backupCodes: null,
          updatedAt: new Date(),
        })
        .where(eq(user2FA.userId, ctx.userId));

      return {
        success: true,
        message: "2FA disabled successfully",
      };
    }),

  /**
   * Regenerate backup codes
   */
  regenerateBackupCodes: protectedProcedure
    .input(
      z.object({
        code: z.string().length(6).regex(/^\d{6}$/),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const twoFA = await db.query.user2FA.findFirst({
        where: eq(user2FA.userId, ctx.userId),
      });

      if (!twoFA?.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA is not enabled",
        });
      }

      // Verify code
      const isValid = verifyTOTP(twoFA.secret, input.code);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid verification code",
        });
      }

      // Generate new backup codes
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = backupCodes.map(hashBackupCode);

      await db
        .update(user2FA)
        .set({
          backupCodes: JSON.stringify(hashedBackupCodes),
          updatedAt: new Date(),
        })
        .where(eq(user2FA.userId, ctx.userId));

      return {
        success: true,
        backupCodes,
        message: "Backup codes regenerated. Save them securely.",
      };
    }),
});
