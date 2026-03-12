/**
 * Router: Gerenciamento de Empresas (por Consultor)
 *
 * Consultores criam e gerenciam empresas clientes.
 * Empresas são tenants com parentTenantId = tenantId do consultor.
 */

import { z } from "zod";
import { eq, and, like, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { router } from "../_core/trpc";
import { consultantProcedure } from "../_core/trpc";
import { tenantProcedure } from "../_core/trpc";
import { tenants } from "../../drizzle/schema";
import * as db from "../db";

// Validação de CNPJ
function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  const calc = (digits: string, factors: number[]) => {
    let sum = 0;
    for (let i = 0; i < factors.length; i++) {
      sum += parseInt(digits[i]) * factors[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const f1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const f2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(cleaned, f1);
  const d2 = calc(cleaned, f2);

  return parseInt(cleaned[12]) === d1 && parseInt(cleaned[13]) === d2;
}

const companyInput = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  zipCode: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export const companiesRouter = router({
  // Listar empresas do consultor
  list: consultantProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["active", "inactive", "suspended"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const consultantTenantId = ctx.tenantId;
      const filters: any[] = [
        eq(tenants.parentTenantId, consultantTenantId),
        eq(tenants.tenantType, "company"),
      ];

      if (input?.status) {
        filters.push(eq(tenants.status, input.status));
      }
      if (input?.search) {
        filters.push(
          like(tenants.name, `%${input.search}%`)
        );
      }

      const [companies, countResult] = await Promise.all([
        database
          .select()
          .from(tenants)
          .where(and(...filters))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        database
          .select({ count: sql<number>`count(*)` })
          .from(tenants)
          .where(and(...filters)),
      ]);

      return {
        companies,
        total: countResult[0]?.count ?? 0,
      };
    }),

  // Obter detalhes de uma empresa
  get: consultantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [company] = await database
        .select()
        .from(tenants)
        .where(
          and(
            eq(tenants.id, input.id),
            eq(tenants.parentTenantId, ctx.tenantId),
            eq(tenants.tenantType, "company")
          )
        )
        .limit(1);

      if (!company) {
        throw new Error("Empresa não encontrada");
      }

      return company;
    }),

  // Criar empresa vinculada ao consultor
  create: consultantProcedure
    .input(companyInput)
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Validar CNPJ
      const cleanCnpj = input.cnpj.replace(/\D/g, "");
      // Formatar CNPJ
      const formattedCnpj = cleanCnpj.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
      );

      // Verificar se CNPJ já existe
      const existing = await db.getTenantByCNPJ(formattedCnpj);
      if (existing) {
        throw new Error("Já existe uma empresa com este CNPJ");
      }

      const companyId = nanoid();
      await database.insert(tenants).values({
        id: companyId,
        name: input.name,
        cnpj: formattedCnpj,
        street: input.street,
        number: input.number,
        complement: input.complement,
        neighborhood: input.neighborhood,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        status: "active",
        strategy: "shared_rls",
        tenantType: "company",
        parentTenantId: ctx.tenantId,
      });

      // Audit log
      try {
        await db.createAuditLog({
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          action: "CREATE",
          entityType: "company",
          entityId: companyId,
          oldValues: null,
          newValues: { name: input.name, cnpj: formattedCnpj },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        });
      } catch (_) {}

      return { id: companyId, name: input.name };
    }),

  // Atualizar empresa
  update: consultantProcedure
    .input(
      z.object({
        id: z.string(),
      }).merge(companyInput.partial())
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Verificar que a empresa pertence ao consultor
      const [company] = await database
        .select()
        .from(tenants)
        .where(
          and(
            eq(tenants.id, input.id),
            eq(tenants.parentTenantId, ctx.tenantId),
            eq(tenants.tenantType, "company")
          )
        )
        .limit(1);

      if (!company) {
        throw new Error("Empresa não encontrada");
      }

      const { id, ...updateData } = input;
      const updateValues: Record<string, any> = { updatedAt: new Date() };

      if (updateData.name) updateValues.name = updateData.name;
      if (updateData.cnpj) {
        const cleanCnpj = updateData.cnpj.replace(/\D/g, "");
        updateValues.cnpj = cleanCnpj.replace(
          /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
          "$1.$2.$3/$4-$5"
        );
      }
      if (updateData.street !== undefined) updateValues.street = updateData.street;
      if (updateData.number !== undefined) updateValues.number = updateData.number;
      if (updateData.complement !== undefined) updateValues.complement = updateData.complement;
      if (updateData.neighborhood !== undefined) updateValues.neighborhood = updateData.neighborhood;
      if (updateData.city !== undefined) updateValues.city = updateData.city;
      if (updateData.state !== undefined) updateValues.state = updateData.state;
      if (updateData.zipCode !== undefined) updateValues.zipCode = updateData.zipCode;
      if (updateData.contactName !== undefined) updateValues.contactName = updateData.contactName;
      if (updateData.contactEmail !== undefined) updateValues.contactEmail = updateData.contactEmail;
      if (updateData.contactPhone !== undefined) updateValues.contactPhone = updateData.contactPhone;

      await database
        .update(tenants)
        .set(updateValues)
        .where(eq(tenants.id, id));

      // Audit log
      try {
        await db.createAuditLog({
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          action: "UPDATE",
          entityType: "company",
          entityId: id,
          oldValues: { name: company.name },
          newValues: updateValues,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        });
      } catch (_) {}

      return { success: true };
    }),

  // Excluir empresa
  delete: consultantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Verificar que a empresa pertence ao consultor
      const [company] = await database
        .select()
        .from(tenants)
        .where(
          and(
            eq(tenants.id, input.id),
            eq(tenants.parentTenantId, ctx.tenantId),
            eq(tenants.tenantType, "company")
          )
        )
        .limit(1);

      if (!company) {
        throw new Error("Empresa não encontrada");
      }

      // Usar o cascade delete existente
      await db.deleteTenant(input.id);

      // Audit log
      try {
        await db.createAuditLog({
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          action: "DELETE",
          entityType: "company",
          entityId: input.id,
          oldValues: { name: company.name, cnpj: company.cnpj },
          newValues: null,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        });
      } catch (_) {}

      return { success: true };
    }),

  // Consultor obtém informações do próprio tenant (para saber tipo)
  getMyTenantInfo: tenantProcedure.query(async ({ ctx }) => {
    const tenant = await db.getTenant(ctx.tenantId);
    if (!tenant) throw new Error("Tenant não encontrado");
    return {
      id: tenant.id,
      name: tenant.name,
      tenantType: tenant.tenantType,
      parentTenantId: tenant.parentTenantId,
    };
  }),
});
