import type { CookieOptions, Request } from "express";
import crypto from "crypto";
import { ENV } from "./env";

// ============================================================================
// Session timeout configuration
// ============================================================================

/** Sessao expira apos 30 minutos de inatividade */
export const SESSION_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutos

/** Renova automaticamente se faltam menos de 10 minutos (sliding window) */
export const SESSION_REFRESH_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutos

/** Cookie maxAge alinhado com a sessao */
const COOKIE_MAX_AGE_MS = SESSION_MAX_AGE_MS;

// ============================================================================
// Helpers
// ============================================================================

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Gera opcoes de cookie seguras.
 * Em producao: secure + sameSite=strict (mesma origem)
 * Em dev: sameSite=lax (sem HTTPS)
 */
export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure" | "maxAge"> {
  const isSecure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    sameSite: isSecure ? "strict" : "lax",
    secure: isSecure,
    maxAge: COOKIE_MAX_AGE_MS,
  };
}

/**
 * Cria um token de sessao opaco e assinado com HMAC, com expiracao embutida.
 *
 * Formato: <randomHex>.<userId>.<expiresAtMs>.<hmacSignature>
 *
 * - randomHex: 32 bytes aleatorios (64 hex chars) — unicidade
 * - userId: identificador do usuario
 * - expiresAtMs: timestamp de expiracao em milissegundos
 * - hmacSignature: HMAC-SHA256 dos 3 campos acima — integridade
 *
 * O HMAC impede adulteracao de qualquer campo (userId, expiresAt, etc).
 */
export function createSessionToken(userId: string): string {
  const randomPart = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_MAX_AGE_MS;
  const payload = `${randomPart}.${userId}.${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", ENV.cookieSecret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

/** Resultado da validacao de token */
export interface SessionTokenResult {
  userId: string;
  expiresAt: number;
}

/**
 * Valida e extrai o userId e expiresAt de um token de sessao.
 * Retorna null se o token for invalido, adulterado ou expirado.
 */
export function verifySessionToken(token: string): SessionTokenResult | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [randomPart, userId, expiresAtStr, providedSignature] = parts;

  if (!randomPart || !userId || !expiresAtStr || !providedSignature) return null;

  // Validar HMAC
  const payload = `${randomPart}.${userId}.${expiresAtStr}`;
  const expectedSignature = crypto
    .createHmac("sha256", ENV.cookieSecret)
    .update(payload)
    .digest("hex");

  // Comparacao timing-safe para evitar timing attacks
  const sigBuffer = Buffer.from(providedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return null;

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  // Verificar expiracao
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) return null;

  return { userId, expiresAt };
}
