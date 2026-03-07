import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
} from "../../drizzle/schema";
import { eq, and, desc, isNull } from "drizzle-orm";

export const rolesPermissionsRouter = router({
  // ============================================================================
  // ROLES
  // ============================================================================

  roles: router({
    list: protectedProcedure
      .input(
        z.object({
          scope: z.enum(["global", "tenant"]).optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        let query = db.select().from(roles);

        if (input.scope) {
          query = query.where(eq(roles.scope, input.scope)) as any;
        }

        const rolesList = await query.orderBy(roles.displayName);
        return rolesList;
      }),

    get: protectedProcedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [role] = await db
          .select()
          .from(roles)
          .where(eq(roles.id, input.id));

        if (!role) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Role not found" });
        }

        // Buscar permissões associadas
        const perms = await db
          .select()
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, input.id));

        return {
          ...role,
          permissions: perms,
        };
      }),

    create: adminProcedure
      .input(
        z.object({
          systemName: z.string(),
          displayName: z.string(),
          description: z.string().optional(),
          scope: z.enum(["global", "tenant"]),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const id = nanoid();

        await db.insert(roles).values({
          id,
          systemName: input.systemName,
          displayName: input.displayName,
          description: input.description || null,
          scope: input.scope,
          createdAt: new Date(),
        });

        return { id };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
        }).passthrough()
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const { id, ...updates } = input;

        await db.update(roles).set(updates).where(eq(roles.id, id));

        return { success: true };
      }),

    delete: adminProcedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Deletar associações primeiro
        await db
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, input.id));

        await db.delete(userRoles).where(eq(userRoles.roleId, input.id));

        // Deletar role
        await db.delete(roles).where(eq(roles.id, input.id));

        return { success: true };
      }),
  }),

  // ============================================================================
  // PERMISSIONS
  // ============================================================================

  permissions: router({
    list: protectedProcedure
      .input(
        z.object({
          resource: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        let query = db.select().from(permissions);

        if (input.resource) {
          query = query.where(eq(permissions.resource, input.resource)) as any;
        }

        const permsList = await query.orderBy(permissions.name);
        return permsList;
      }),

    get: protectedProcedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [permission] = await db
          .select()
          .from(permissions)
          .where(eq(permissions.id, input.id));

        if (!permission) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Permission not found",
          });
        }

        return permission;
      }),

    create: adminProcedure
      .input(
        z.object({
          name: z.string(),
          resource: z.string(),
          action: z.string(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const id = nanoid();

        await db.insert(permissions).values({
          id,
          name: input.name,
          resource: input.resource,
          action: input.action,
          description: input.description || null,
          createdAt: new Date(),
        });

        return { id };
      }),

    update: adminProcedure
      .input(
        z.object({
          id: z.string(),
        }).passthrough()
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const { id, ...updates } = input;

        await db.update(permissions).set(updates).where(eq(permissions.id, id));

        return { success: true };
      }),

    delete: adminProcedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Deletar associações primeiro
        await db
          .delete(rolePermissions)
          .where(eq(rolePermissions.permissionId, input.id));

        // Deletar permissão
        await db.delete(permissions).where(eq(permissions.id, input.id));

        return { success: true };
      }),
  }),

  // ============================================================================
  // ROLE-PERMISSIONS (Associações)
  // ============================================================================

  rolePermissions: router({
    list: protectedProcedure
      .input(
        z.object({
          roleId: z.string().optional(),
          tenantId: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions = [];

        if (input.roleId) {
          conditions.push(eq(rolePermissions.roleId, input.roleId));
        }

        if (input.tenantId !== undefined) {
          if (input.tenantId === "") {
            conditions.push(isNull(rolePermissions.tenantId));
          } else {
            conditions.push(eq(rolePermissions.tenantId, input.tenantId));
          }
        }

        let query = db.select().from(rolePermissions);

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }

        const assocs = await query;
        return assocs;
      }),

    assign: adminProcedure
      .input(
        z.object({
          roleId: z.string(),
          permissionId: z.string(),
          tenantId: z.string().optional(),
          conditions: z.any().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const id = nanoid();

        await db.insert(rolePermissions).values({
          id,
          roleId: input.roleId,
          permissionId: input.permissionId,
          tenantId: input.tenantId || null,
          conditions: input.conditions || null,
          createdAt: new Date(),
        });

        return { id };
      }),

    revoke: adminProcedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        await db
          .delete(rolePermissions)
          .where(eq(rolePermissions.id, input.id));

        return { success: true };
      }),
  }),

  // ============================================================================
  // USER-ROLES (Associações de usuários com roles)
  // ============================================================================

  userRoles: router({
    list: protectedProcedure
      .input(
        z.object({
          userId: z.string().optional(),
          tenantId: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions = [];

        if (input.userId) {
          conditions.push(eq(userRoles.userId, input.userId));
        }

        if (input.tenantId !== undefined) {
          if (input.tenantId === "") {
            conditions.push(isNull(userRoles.tenantId));
          } else {
            conditions.push(eq(userRoles.tenantId, input.tenantId));
          }
        }

        let query = db.select().from(userRoles);

        if (conditions.length > 0) {
          query = query.where(and(...conditions)) as any;
        }

        const assocs = await query;
        return assocs;
      }),

    assign: adminProcedure
      .input(
        z.object({
          userId: z.string(),
          roleId: z.string(),
          tenantId: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const id = nanoid();

        await db.insert(userRoles).values({
          id,
          userId: input.userId,
          roleId: input.roleId,
          tenantId: input.tenantId || null,
          createdAt: new Date(),
        });

        return { id };
      }),

    revoke: adminProcedure
      .input(
        z.object({
          id: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        await db.delete(userRoles).where(eq(userRoles.id, input.id));

        return { success: true };
      }),
  }),
});
