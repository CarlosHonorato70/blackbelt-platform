import type { Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import * as db from "../db";

export async function createContext({ req, res }: { req: Request; res: Response }) {
  const userId = req.cookies[COOKIE_NAME];
  
  let user = null;
  if (userId) {
    user = await db.getUserById(userId);
  }

  return {
    req,
    res,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
