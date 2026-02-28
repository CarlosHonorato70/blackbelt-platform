/**
 * Phase 7: Two-Factor Authentication (2FA/MFA) Router
 *
 * Implements TOTP-based two-factor authentication with:
 * - QR code generation for authenticator apps (base32 compativel)
 * - Backup codes com bcrypt para recovery
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
import bcrypt from "bcryptjs";

// TOTP implementation (RFC 6238 compativel com Google Authenticator)
const TOTP_WINDOW = 30; // 30 second window
const TOTP_DIGITS = 6;

// ============================================================================
// BASE32 ENCODING/DECODING (RFC 4648 - compativel com Google Authenticator)
// ============================================================================

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Encode Buffer para base32 (RFC 4648)
 * Google Authenticator, Authy, etc. exigem base32.
 */
function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, "0");
  }

  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, "0");
    result += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return result;
}

/**
 * Decode base32 para Buffer
 */
function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, "").toUpperCase();
  let bits = "";

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new TRPCError({ code: "BAD_REQUEST", message: "Caractere base32 inválido" });
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

// ============================================================================
// TOTP FUNCTIONS
// ============================================================================

/**
 * Generate TOTP secret (base32 encoded, 20 bytes = 160 bits)
 * Compativel com Google Authenticator, Authy, etc.
 */
function generateSecret(): string {
  const buffer = crypto.randomBytes(20);
  return base32Encode(buffer);
}

/**
 * Generate TOTP code from secret (base32 encoded)
 */
function generateTOTP(secret: string, timeStep?: number): string {
  const time = timeStep || Math.floor(Date.now() / 1000 / TOTP_WINDOW);
  const secretBuffer = base32Decode(secret);
  const hmac = crypto.createHmac("sha1", secretBuffer);

  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeUInt32BE(0, 0); // high 32 bits
  timeBuffer.writeUInt32BE(time, 4); // low 32 bits
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
 * Verify TOTP code com janela de tolerancia
 */
function verifyTOTP(secret: string, code: string, window: number = 1): boolean {
  const currentTime = Math.floor(Date.now() / 1000 / TOTP_WINDOW);

  for (let i = -window; i <= window; i++) {
    const expectedCode = generateTOTP(secret, currentTime + i);
    // Comparacao timing-safe para evitar timing attacks
    if (
      expectedCode.length === code.length &&
      crypto.timingSafeEqual(Buffer.from(expectedCode), Buffer.from(code))
    ) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// BACKUP CODES (com bcrypt)
// ============================================================================

/**
 * Generate backup codes (8 codes, formato XXXXX-XXXXX)
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
 * Hash backup code com bcrypt (em vez de SHA-256)
 * Bcrypt adiciona salt automatico e e resistente a rainbow tables.
 */
async function hashBackupCode(code: string): Promise<string> {
  return bcrypt.hash(code.toUpperCase().trim(), 10);
}

/**
 * Verifica um backup code contra uma lista de hashes bcrypt.
 * Retorna o indice do match ou -1 se nao encontrado.
 */
async function verifyBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<number> {
  const normalizedCode = code.toUpperCase().trim();
  for (let i = 0; i < hashedCodes.length; i++) {
    const match = await bcrypt.compare(normalizedCode, hashedCodes[i]);
    if (match) return i;
  }
  return -1;
}

// ============================================================================
// QR CODE URL
// ============================================================================

/**
 * Generate otpauth URL para QR code (compativel com Google Authenticator)
 */
function generateOtpauthURL(
  secret: string,
  email: string,
  issuer: string = "BlackBelt Platform"
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_WINDOW}`;
}

// ============================================================================
// 2FA ROUTER
// ============================================================================

export const twoFactorRouter = router({
  /**
   * Get 2FA status for current user
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const [twoFA] = await db
      .select()
      .from(user2FA)
      .where(eq(user2FA.userId, ctx.user.id))
      .limit(1);

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

    const [existing] = await db
      .select()
      .from(user2FA)
      .where(eq(user2FA.userId, ctx.user.id))
      .limit(1);

    if (existing?.enabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "2FA ja esta ativado",
      });
    }

    // Get user email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Usuario nao encontrado" });
    }

    // Generate base32 secret (compativel com Google Authenticator)
    const secret = generateSecret();
    const qrCodeURL = generateOtpauthURL(secret, user.email || "user@blackbelt.com");

    // Save secret (not enabled yet - needs verification)
    if (existing) {
      await db
        .update(user2FA)
        .set({ secret, enabled: false, updatedAt: new Date() })
        .where(eq(user2FA.userId, ctx.user.id));
    } else {
      await db.insert(user2FA).values({
        id: nanoid(),
        userId: ctx.user.id,
        secret,
        enabled: false,
      });
    }

    return {
      secret, // Para entrada manual no app
      qrCodeURL, // Para gerar QR code no frontend
      message: "Escaneie o QR code com seu app autenticador",
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

      const [twoFA] = await db
        .select()
        .from(user2FA)
        .where(eq(user2FA.userId, ctx.user.id))
        .limit(1);

      if (!twoFA) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "2FA nao inicializado. Chame enable primeiro.",
        });
      }

      if (twoFA.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA ja esta ativado",
        });
      }

      // Verify TOTP code
      const isValid = verifyTOTP(twoFA.secret, input.code);

      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Codigo de verificacao invalido",
        });
      }

      // Generate backup codes e hash com bcrypt
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = await Promise.all(
        backupCodes.map((code) => hashBackupCode(code))
      );

      // Enable 2FA
      await db
        .update(user2FA)
        .set({
          enabled: true,
          backupCodes: JSON.stringify(hashedBackupCodes),
          verifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(user2FA.userId, ctx.user.id));

      return {
        success: true,
        backupCodes, // Mostrar ao usuario UMA VEZ
        message: "2FA ativado com sucesso. Salve seus codigos de backup em local seguro.",
      };
    }),

  /**
   * Verify 2FA code (during login or sensitive operations)
   */
  verifyCode: protectedProcedure
    .input(
      z.object({
        code: z.string().min(6).max(12), // TOTP ou backup code
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const [twoFA] = await db
        .select()
        .from(user2FA)
        .where(eq(user2FA.userId, ctx.user.id))
        .limit(1);

      if (!twoFA?.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA nao esta ativado",
        });
      }

      // Try TOTP code first
      if (input.code.length === 6 && /^\d{6}$/.test(input.code)) {
        const isValid = verifyTOTP(twoFA.secret, input.code);
        if (isValid) {
          return { success: true, method: "totp" as const };
        }
      }

      // Try backup code
      if (input.code.includes("-")) {
        const backupCodes = JSON.parse(twoFA.backupCodes as string) as string[];
        const codeIndex = await verifyBackupCode(input.code, backupCodes);

        if (codeIndex !== -1) {
          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          await db
            .update(user2FA)
            .set({
              backupCodes: JSON.stringify(backupCodes),
              updatedAt: new Date(),
            })
            .where(eq(user2FA.userId, ctx.user.id));

          return {
            success: true,
            method: "backup" as const,
            remainingBackupCodes: backupCodes.length,
          };
        }
      }

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Codigo de verificacao invalido",
      });
    }),

  /**
   * Disable 2FA
   */
  disable: protectedProcedure
    .input(
      z.object({
        code: z.string().min(6), // Requer codigo 2FA para desativar
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const [twoFA] = await db
        .select()
        .from(user2FA)
        .where(eq(user2FA.userId, ctx.user.id))
        .limit(1);

      if (!twoFA?.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA nao esta ativado",
        });
      }

      // Verify code before disabling
      let isValid = false;

      // Try TOTP
      if (input.code.length === 6 && /^\d{6}$/.test(input.code)) {
        isValid = verifyTOTP(twoFA.secret, input.code);
      }

      // Try backup code if TOTP didn't match
      if (!isValid && input.code.includes("-")) {
        const backupCodes = JSON.parse(twoFA.backupCodes as string) as string[];
        const codeIndex = await verifyBackupCode(input.code, backupCodes);
        isValid = codeIndex !== -1;
      }

      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Codigo de verificacao invalido",
        });
      }

      // Disable 2FA
      await db
        .update(user2FA)
        .set({
          enabled: false,
          backupCodes: null,
          updatedAt: new Date(),
        })
        .where(eq(user2FA.userId, ctx.user.id));

      return {
        success: true,
        message: "2FA desativado com sucesso",
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

      const [twoFA] = await db
        .select()
        .from(user2FA)
        .where(eq(user2FA.userId, ctx.user.id))
        .limit(1);

      if (!twoFA?.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "2FA nao esta ativado",
        });
      }

      // Verify code
      const isValid = verifyTOTP(twoFA.secret, input.code);
      if (!isValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Codigo de verificacao invalido",
        });
      }

      // Generate new backup codes com bcrypt
      const backupCodes = generateBackupCodes();
      const hashedBackupCodes = await Promise.all(
        backupCodes.map((code) => hashBackupCode(code))
      );

      await db
        .update(user2FA)
        .set({
          backupCodes: JSON.stringify(hashedBackupCodes),
          updatedAt: new Date(),
        })
        .where(eq(user2FA.userId, ctx.user.id));

      return {
        success: true,
        backupCodes,
        message: "Codigos de backup regenerados. Salve-os em local seguro.",
      };
    }),
});
