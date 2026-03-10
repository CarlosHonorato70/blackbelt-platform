import type { Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";
import {
  verifySessionToken,
  createSessionToken,
  getSessionCookieOptions,
  SESSION_REFRESH_THRESHOLD_MS,
} from "./cookies";
import { log } from "./logger";

export async function createContext({ req, res }: { req: Request; res: Response }) {
  const sessionToken = req.cookies[COOKIE_NAME];

  let user = null;
  if (sessionToken) {
    // Valida HMAC + expiracao
    const result = verifySessionToken(sessionToken);
    if (result) {
      user = await db.getUserById(result.userId);

      // Sliding window: renova token se esta proximo de expirar
      if (user) {
        const timeRemaining = result.expiresAt - Date.now();
        if (timeRemaining < SESSION_REFRESH_THRESHOLD_MS) {
          const newToken = createSessionToken(result.userId);
          const cookieOptions = getSessionCookieOptions(req);
          res.cookie(COOKIE_NAME, newToken, cookieOptions);
        }
      }
    }
    // Se result === null, token expirado ou invalido -> user permanece null
  }

  // Impersonacao: admin pode visualizar como outro tenant
  let isImpersonating = false;
  if (user && user.role === "admin") {
    const impersonateTenantId = req.headers["x-impersonate-tenant"] as string | undefined;
    if (impersonateTenantId) {
      // Validar que o tenant existe
      const tenant = await db.getTenant(impersonateTenantId);
      if (tenant) {
        user = { ...user, tenantId: impersonateTenantId };
        isImpersonating = true;

        // Audit log de impersonacao por request
        try {
          await db.createAuditLog({
            tenantId: impersonateTenantId,
            userId: user.id,
            action: "IMPERSONATE",
            entityType: "tenant",
            entityId: impersonateTenantId,
            oldValues: null,
            newValues: { path: req.path, method: req.method },
            ipAddress: req.ip,
            userAgent: req.headers["user-agent"],
          });
        } catch (e) {
          log.warn("Failed to log impersonation", { error: String(e) });
        }
      } else {
        log.warn("Impersonation attempt for non-existent tenant", {
          adminId: user.id,
          tenantId: impersonateTenantId,
        });
      }
    }
  }

  return {
    req,
    res,
    user,
    isImpersonating,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
