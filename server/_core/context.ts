import type { Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";
import { verifySessionToken } from "./cookies";

export async function createContext({ req, res }: { req: Request; res: Response }) {
  const sessionToken = req.cookies[COOKIE_NAME];

  let user = null;
  if (sessionToken) {
    // Valida o token HMAC e extrai o userId
    const userId = verifySessionToken(sessionToken);
    if (userId) {
      user = await db.getUserById(userId);
    }
  }

  return {
    req,
    res,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
