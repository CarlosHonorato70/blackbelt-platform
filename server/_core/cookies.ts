import type { CookieOptions, Request } from "express";
import crypto from "crypto";
import { ENV } from "./env";

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
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  };
}

/**
 * Cria um token de sessao opaco e assinado com HMAC.
 * O cookie NAO deve conter o userId diretamente — isso permite
 * que atacantes forjem sessoes. Em vez disso, gera um token
 * aleatorio e mapeia para o userId via assinatura.
 *
 * Formato: <randomToken>.<hmacSignature>
 * O randomToken tem 32 bytes (64 hex chars)
 * O hmac valida que o token foi emitido pelo nosso servidor
 */
export function createSessionToken(userId: string): string {
  const randomPart = crypto.randomBytes(32).toString("hex");
  const payload = `${randomPart}.${userId}`;
  const signature = crypto
    .createHmac("sha256", ENV.cookieSecret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

/**
 * Valida e extrai o userId de um token de sessao.
 * Retorna null se o token for invalido ou adulterado.
 */
export function verifySessionToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [randomPart, userId, providedSignature] = parts;

  if (!randomPart || !userId || !providedSignature) return null;

  const payload = `${randomPart}.${userId}`;
  const expectedSignature = crypto
    .createHmac("sha256", ENV.cookieSecret)
    .update(payload)
    .digest("hex");

  // Comparacao timing-safe para evitar timing attacks
  const sigBuffer = Buffer.from(providedSignature, "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  if (sigBuffer.length !== expectedBuffer.length) return null;

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  return userId;
}
