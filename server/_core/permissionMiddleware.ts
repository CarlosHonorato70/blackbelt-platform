/**
 * Permission check middleware for RBAC enforcement.
 *
 * Queries userRoles + rolePermissions to verify the user
 * has the required permission for the requested resource + action.
 * Admin users (users.role === "admin") bypass all checks.
 */

import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  userRoles,
  rolePermissions,
  permissions,
} from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

export function withPermission(resource: string, action: string) {
  return async ({ ctx, next }: any) => {
    // Admin bypass — global admins always pass
    if (ctx.user?.role === "admin") {
      return next({ ctx });
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const tenantId = ctx.tenantId || ctx.user?.tenantId;
    if (!tenantId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Sem contexto de organização",
      });
    }

    // Get user's roles for this tenant
    const userRoleRecords = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, ctx.user.id),
          eq(userRoles.tenantId, tenantId)
        )
      );

    if (userRoleRecords.length === 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Nenhum perfil atribuído. Contate um administrador.",
      });
    }

    const roleIds = userRoleRecords.map(ur => ur.roleId);

    // Get permissions for those roles
    const perms = await db
      .select({ permission: permissions })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(inArray(rolePermissions.roleId, roleIds));

    const hasPermission = perms.some(
      p => p.permission.resource === resource && p.permission.action === action
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Sem permissão para ${action} em ${resource}`,
      });
    }

    return next({ ctx });
  };
}
