/**
 * Permission check middleware for RBAC enforcement.
 *
 * Queries userRoles + rolePermissions to verify the user
 * has the required permission for the requested resource + action.
 * Admin users (users.role === "admin") bypass all checks.
 * Consultant tenants bypass all checks (full access to own + child companies).
 * Company tenants get default company_admin permissions when no roles assigned.
 */

import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  userRoles,
  rolePermissions,
  permissions,
} from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

// Default permissions for company users (company_admin level)
const COMPANY_DEFAULT_PERMISSIONS: Record<string, Set<string>> = {
  sectors: new Set(["create", "read", "update", "delete"]),
  people: new Set(["create", "read", "update", "delete"]),
  assessments: new Set(["read"]),
  reports: new Set(["read", "export", "create_anonymous"]),
  subscriptions: new Set(["read"]),
  services: new Set(["read"]),
  proposals: new Set(["read"]),
  training: new Set(["read"]),
  companies: new Set(["read"]),
  tickets: new Set(["create", "read"]),
  surveys: new Set(["respond"]),
  data_export: new Set(["read"]),
};

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

    // Consultant bypass — consultants have full access to own tenant and child companies
    const originalTenantId = ctx.originalTenantId || ctx.user?.tenantId;
    if (originalTenantId) {
      const { getTenant } = await import("../db");
      const originalTenant = await getTenant(originalTenantId);
      if (originalTenant?.tenantType === "consultant") {
        return next({ ctx });
      }
    }

    // Get user's roles for this tenant
    let userRoleRecords = await db
      .select()
      .from(userRoles)
      .where(
        and(
          eq(userRoles.userId, ctx.user.id),
          eq(userRoles.tenantId, tenantId)
        )
      );

    // If impersonating and no roles found in target tenant,
    // check roles in the original (parent) tenant.
    if (userRoleRecords.length === 0 && ctx.isImpersonating && ctx.originalTenantId) {
      userRoleRecords = await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, ctx.user.id),
            eq(userRoles.tenantId, ctx.originalTenantId)
          )
        );
    }

    // If still no roles, check tenant type for default permissions
    if (userRoleRecords.length === 0) {
      const { getTenant } = await import("../db");
      const userTenant = await getTenant(tenantId);

      if (userTenant?.tenantType === "company") {
        // Company users get default company_admin permissions
        const allowed = COMPANY_DEFAULT_PERMISSIONS[resource]?.has(action);
        if (allowed) {
          return next({ ctx });
        }
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Sem permissão para ${action} em ${resource}`,
        });
      }

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
