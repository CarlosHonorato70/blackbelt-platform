import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenantId: string | null;
  userRoles: Awaited<ReturnType<typeof db.getUserRoles>>;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let userRoles: Awaited<ReturnType<typeof db.getUserRoles>> = [];

  try {
    const userId = opts.req.cookies?.[COOKIE_NAME];
    if (userId && typeof userId === "string") {
      const foundUser = await db.getUser(userId);
      user = foundUser || null;
    }
  } catch (error) {
    console.warn("[Context] Error loading user:", error);
  }

  // Get tenantId from header or query param
  const tenantId = 
    (opts.req.headers["x-tenant-id"] as string) || 
    (opts.req.query?.tenantId as string) ||
    null;

  // Load user roles for the tenant if user is authenticated
  if (user && tenantId) {
    try {
      userRoles = await db.getUserRoles(user.id, tenantId);
    } catch (error) {
      console.warn("[Context] Error loading user roles:", error);
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantId,
    userRoles,
  };
}
