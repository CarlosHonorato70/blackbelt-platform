import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, adminProcedure, tenantProcedure } from "../_core/trpc";
import * as db from "../db";
import { log } from "../_core/logger";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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
  // Listar tenants — admin vê todos, consultor vê apenas seus filhos, empresa vê apenas a si mesma
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
      // Admin vê todos os tenants
      if (ctx.user.role === "admin") {
        const tenantsList = await db.listTenants(input);
        return tenantsList;
      }

      // Consultor vê apenas seus tenants filhos + o próprio
      if (ctx.user.tenantId) {
        const ownTenant = await db.getTenant(ctx.user.tenantId);

        if (ownTenant?.tenantType === "consultant") {
          // Buscar filhos (empresas deste consultor) + o próprio
          const allTenants = await db.listTenants(input);
          return allTenants.filter(
            (t: any) => t.id === ctx.user.tenantId || t.parentTenantId === ctx.user.tenantId
          );
        }

        // Empresa vê apenas a si mesma
        return ownTenant ? [ownTenant] : [];
      }

      return [];
    }),

  // Obter um tenant especifico (admin vê qualquer, consultor vê filhos, empresa vê a si)
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

      // Verificar autorização: admin OK, mesmo tenant OK, filho do consultor OK
      if (ctx.user.role !== "admin") {
        const isOwnTenant = tenant.id === ctx.user.tenantId;
        const isChild = tenant.parentTenantId === ctx.user.tenantId;
        if (!isOwnTenant && !isChild) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
        }
      }

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

      // Audit log com tenantId null porque o tenant já foi deletado
      try {
        await db.createAuditLog({
          tenantId: null,
          userId: ctx.user.id,
          action: "DELETE",
          entityType: "tenants",
          entityId: input.id,
          oldValues: tenant,
          newValues: null,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        });
      } catch (auditErr) {
        log.warn("Failed to create audit log after tenant delete", {
          tenantId: input.id,
          error: auditErr instanceof Error ? auditErr.message : String(auditErr),
        });
      }

      return { success: true };
    }),

  // Obter configuracoes do tenant
  getSettings: protectedProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Tenant validation: users can only access their own tenant's settings (admin bypasses)
      if (ctx.user.role !== "admin" && ctx.user.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }

      const settings: Record<string, unknown> = {};

      const maxUsers = await db.getTenantSetting(input.tenantId, "max_users");
      const features = await db.getTenantSetting(input.tenantId, "features");

      if (maxUsers) settings.max_users = maxUsers.settingValue;
      if (features) settings.features = features.settingValue;

      return settings;
    }),

  // Configurações de pagamento — consultoria gerencia as próprias
  getPaymentSettings: tenantProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId!;
    const [pix, bank, instructions] = await Promise.all([
      db.getTenantSetting(tenantId, "payment_pix"),
      db.getTenantSetting(tenantId, "payment_bank"),
      db.getTenantSetting(tenantId, "payment_instructions"),
    ]);
    return {
      pixKey: (pix?.settingValue as string) ?? "",
      bankDetails: (bank?.settingValue as string) ?? "",
      paymentInstructions: (instructions?.settingValue as string) ?? "",
    };
  }),

  updatePaymentSettings: tenantProcedure
    .input(z.object({
      pixKey: z.string().max(100),
      bankDetails: z.string().max(500),
      paymentInstructions: z.string().max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      await Promise.all([
        db.setTenantSetting(tenantId, "payment_pix", input.pixKey),
        db.setTenantSetting(tenantId, "payment_bank", input.bankDetails),
        db.setTenantSetting(tenantId, "payment_instructions", input.paymentInstructions),
      ]);
      return { success: true };
    }),

  // Atualizar configuracao do tenant (apenas admin)
  updateSetting: adminProcedure
    .input(
      z.object({
        tenantId: z.string(),
        key: z.string(),
        value: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {

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
