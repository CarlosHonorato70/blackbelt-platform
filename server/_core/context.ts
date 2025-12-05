import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenantId: string;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const userId = opts.req.cookies?.[COOKIE_NAME];
    if (userId && typeof userId === "string") {
      const foundUser = await db.getUser(userId);
      user = foundUser || null;
    }
  } catch (error) {
    console.warn("[Context] Error loading user:", error);
  }

  const tenantId = (opts.req.headers["x-tenant-id"] as string) || "default";

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantId,
  };
}
