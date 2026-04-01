import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, tenantProcedure, permittedProcedure } from "../_core/trpc";
import * as db from "../db";
import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";

export const peopleRouter = router({
  // Listar colaboradores de um tenant (ou empresa cliente do consultor)
  list: tenantProcedure
    .input(
      z.object({
        sectorId: z.string().optional(),
        search: z.string().optional(),
        employmentType: z.enum(["own", "outsourced"]).optional(),
        companyTenantId: z.string().optional(), // consultor pode ver empresa cliente
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      let targetTenantId = ctx.tenantId!;

      // Se companyTenantId fornecido, validar que o consultor tem acesso
      if (input?.companyTenantId) {
        const drizzle = await getDb();
        if (drizzle) {
          const [company] = await drizzle.select({ parentTenantId: tenants.parentTenantId })
            .from(tenants)
            .where(eq(tenants.id, input.companyTenantId))
            .limit(1);
          if (company?.parentTenantId === ctx.tenantId!) {
            targetTenantId = input.companyTenantId;
          }
        }
      }

      const people = await db.listPeople(targetTenantId, input || {});

      await db.createAuditLog({
        tenantId: ctx.tenantId!,
        userId: ctx.user.id,
        action: "READ",
        entityType: "people",
        entityId: null,
        oldValues: null,
        newValues: null,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return people;
    }),

  // Obter um colaborador específico
  get: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        
      })
    )
    .query(async ({ ctx, input }) => {
      const person = await db.getPerson(input.id, ctx.tenantId!);

      if (!person) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Colaborador não encontrado",
        });
      }

      await db.createAuditLog({
        tenantId: ctx.tenantId!,
        userId: ctx.user.id,
        action: "READ",
        entityType: "people",
        entityId: input.id,
        oldValues: null,
        newValues: null,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return person;
    }),

  // Criar novo colaborador
  create: permittedProcedure("people", "create")
    .input(
      z.object({
        
        sectorId: z.string().optional(),
        name: z.string().min(1, "Nome é obrigatório"),
        position: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        employmentType: z.enum(["own", "outsourced"]).default("own"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar se tenant existe
      const tenant = await db.getTenant(ctx.tenantId!);
      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empresa não encontrada",
        });
      }

      // Verificar se setor existe (se informado)
      if (input.sectorId) {
        const sector = await db.getSector(input.sectorId, ctx.tenantId!);
        if (!sector) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Setor não encontrado",
          });
        }
      }

      const person = await db.createPerson({
        ...input,
        tenantId: ctx.tenantId!,
      });

      await db.createAuditLog({
        tenantId: ctx.tenantId!,
        userId: ctx.user.id,
        action: "CREATE",
        entityType: "people",
        entityId: person.id,
        oldValues: null,
        newValues: person,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return person;
    }),

  // Atualizar colaborador
  update: permittedProcedure("people", "update")
    .input(
      z.object({
        id: z.string(),
        
        sectorId: z.string().optional(),
        name: z.string().min(1).optional(),
        position: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        employmentType: z.enum(["own", "outsourced"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const person = await db.getPerson(id, ctx.tenantId!);
      if (!person) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Colaborador não encontrado",
        });
      }

      // Verificar se setor existe (se informado)
      if (data.sectorId) {
        const sector = await db.getSector(data.sectorId, ctx.tenantId!);
        if (!sector) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Setor não encontrado",
          });
        }
      }

      await db.updatePerson(id, ctx.tenantId!, data);

      await db.createAuditLog({
        tenantId: ctx.tenantId!,
        userId: ctx.user.id,
        action: "UPDATE",
        entityType: "people",
        entityId: id,
        oldValues: person,
        newValues: data,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  // Deletar colaborador
  delete: permittedProcedure("people", "delete")
    .input(
      z.object({
        id: z.string(),
        
      })
    )
    .mutation(async ({ ctx, input }) => {
      const person = await db.getPerson(input.id, ctx.tenantId!);
      if (!person) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Colaborador não encontrado",
        });
      }

      await db.deletePerson(input.id, ctx.tenantId!);

      await db.createAuditLog({
        tenantId: ctx.tenantId!,
        userId: ctx.user.id,
        action: "DELETE",
        entityType: "people",
        entityId: input.id,
        oldValues: person,
        newValues: null,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  // Exportar dados pessoais (LGPD - Direito de Acesso)
  exportPersonalData: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        
      })
    )
    .query(async ({ ctx, input }) => {
      const person = await db.getPerson(input.id, ctx.tenantId!);
      if (!person) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Colaborador não encontrado",
        });
      }

      // Buscar consentimentos
      const consents = await db.getPersonConsents(input.id);

      // Buscar logs de auditoria relacionados
      const auditLogs = await db.getAuditLogs({
        tenantId: ctx.tenantId!,
        entityType: "people",
        limit: 100,
      });

      await db.createAuditLog({
        tenantId: ctx.tenantId!,
        userId: ctx.user.id,
        action: "READ",
        entityType: "people",
        entityId: input.id,
        oldValues: null,
        newValues: { action: "EXPORT_PERSONAL_DATA" },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        person,
        consents,
        auditLogs,
        exportedAt: new Date().toISOString(),
      };
    }),
});
