import type { Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";
import {
  verifySessionToken,
  createSessionToken,
  getSessionCookieOptions,
  SESSION_REFRESH_THRESHOLD_MS,
} from "./cookies";

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
    // Se result === null, token expirado ou invalido → user permanece null
  }

  return {
    req,
    res,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
