import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";

// Validacao de CNPJ
function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/[^\d]/g, "");

  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let sum = 0;
  let weight = 5;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  let digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned[12])) return false;

  sum = 0;
  weight = 6;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  digit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (digit !== parseInt(cleaned[13])) return false;

  return true;
}

export const tenantsRouter = router({
  // Listar tenants (apenas admin ou consultor BB)
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["active", "inactive", "suspended"]).optional(),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const tenantsList = await db.listTenants(input);

      try {
        await db.createAuditLog({
          tenantId: null,
          userId: ctx.user.id,
          action: "READ",
          entityType: "tenants",
          entityId: null,
          oldValues: null,
          newValues: null,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        });
      } catch (auditError) {
        console.error("[AUDIT] Failed to create audit log:", auditError);
      }

      return tenantsList;
    }),

  // Obter um tenant especifico
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await db.getTenant(input.id);

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empresa nao encontrada",
        });
      }

      await db.createAuditLog({
        tenantId: tenant.id,
        userId: ctx.user.id,
        action: "READ",
        entityType: "tenants",
        entityId: tenant.id,
        oldValues: null,
        newValues: null,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return tenant;
    }),

  // Criar novo tenant (apenas admin)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome e obrigatorio"),
        cnpj: z.string().min(14, "CNPJ invalido"),
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().length(2).optional(),
        zipCode: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        strategy: z
          .enum(["shared_rls", "dedicated_schema"])
          .default("shared_rls"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }

      if (!validateCNPJ(input.cnpj)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "CNPJ invalido" });
      }

      const existing = await db.getTenantByCNPJ(input.cnpj);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "CNPJ ja cadastrado",
        });
      }

      const tenant = await db.createTenant(input);

      await db.setTenantSetting(tenant.id, "max_users", 100);
      await db.setTenantSetting(tenant.id, "features", [
        "nr01",
        "psicossocial",
      ]);

      await db.createAuditLog({
        tenantId: tenant.id,
        userId: ctx.user.id,
        action: "CREATE",
        entityType: "tenants",
        entityId: tenant.id,
        oldValues: null,
        newValues: tenant,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return tenant;
    }),

  // Atualizar tenant (apenas admin)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().length(2).optional(),
        zipCode: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        status: z.enum(["active", "inactive", "suspended"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Apenas admin pode atualizar tenants
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }

      const { id, ...data } = input;

      const tenant = await db.getTenant(id);
      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empresa nao encontrada",
        });
      }

      await db.updateTenant(id, data);

      await db.createAuditLog({
        tenantId: id,
        userId: ctx.user.id,
        action: "UPDATE",
        entityType: "tenants",
        entityId: id,
        oldValues: tenant,
        newValues: data,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  // Deletar tenant (apenas admin)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }

      const tenant = await db.getTenant(input.id);
      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empresa nao encontrada",
        });
      }

      await db.deleteTenant(input.id);

      await db.createAuditLog({
        tenantId: input.id,
        userId: ctx.user.id,
        action: "DELETE",
        entityType: "tenants",
        entityId: input.id,
        oldValues: tenant,
        newValues: null,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  // Obter configuracoes do tenant
  getSettings: protectedProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(async ({ input }) => {
      const settings: Record<string, unknown> = {};

      const maxUsers = await db.getTenantSetting(input.tenantId, "max_users");
      const features = await db.getTenantSetting(input.tenantId, "features");

      if (maxUsers) settings.max_users = maxUsers.settingValue;
      if (features) settings.features = features.settingValue;

      return settings;
    }),

  // Atualizar configuracao do tenant (apenas admin)
  updateSetting: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        key: z.string(),
        value: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }

      await db.setTenantSetting(input.tenantId, input.key, input.value);

      await db.createAuditLog({
        tenantId: input.tenantId,
        userId: ctx.user.id,
        action: "UPDATE",
        entityType: "tenant_settings",
        entityId: input.tenantId,
        oldValues: null,
        newValues: { key: input.key, value: input.value },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),
});
