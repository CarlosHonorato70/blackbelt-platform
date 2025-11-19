import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const peopleRouter = router({
  // Listar colaboradores de um tenant
  list: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        sectorId: z.string().optional(),
        search: z.string().optional(),
        employmentType: z.enum(["own", "outsourced"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Verificar se usuário tem acesso a este tenant

      const { tenantId, ...filters } = input;
      const people = await db.listPeople(tenantId, filters);

      await db.createAuditLog({
        tenantId,
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
  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const person = await db.getPerson(input.id, input.tenantId);

      if (!person) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador não encontrado" });
      }

      await db.createAuditLog({
        tenantId: input.tenantId,
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
  create: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        sectorId: z.string().optional(),
        name: z.string().min(1, "Nome é obrigatório"),
        position: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        employmentType: z.enum(["own", "outsourced"]).default("own"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Verificar se usuário tem permissão para criar colaboradores neste tenant

      // Verificar se tenant existe
      const tenant = await db.getTenant(input.tenantId);
      if (!tenant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
      }

      // Verificar se setor existe (se informado)
      if (input.sectorId) {
        const sector = await db.getSector(input.sectorId, input.tenantId);
        if (!sector) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Setor não encontrado" });
        }
      }

      const person = await db.createPerson(input);

      await db.createAuditLog({
        tenantId: input.tenantId,
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
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
        sectorId: z.string().optional(),
        name: z.string().min(1).optional(),
        position: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        employmentType: z.enum(["own", "outsourced"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, tenantId, ...data } = input;

      const person = await db.getPerson(id, tenantId);
      if (!person) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador não encontrado" });
      }

      // Verificar se setor existe (se informado)
      if (data.sectorId) {
        const sector = await db.getSector(data.sectorId, tenantId);
        if (!sector) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Setor não encontrado" });
        }
      }

      // TODO: Verificar permissões

      await db.updatePerson(id, tenantId, data);

      await db.createAuditLog({
        tenantId,
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
  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const person = await db.getPerson(input.id, input.tenantId);
      if (!person) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador não encontrado" });
      }

      // TODO: Verificar permissões
      // TODO: Verificar consentimentos LGPD antes de deletar

      await db.deletePerson(input.id, input.tenantId);

      await db.createAuditLog({
        tenantId: input.tenantId,
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
  exportPersonalData: publicProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const person = await db.getPerson(input.id, input.tenantId);
      if (!person) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Colaborador não encontrado" });
      }

      // Buscar consentimentos
      const consents = await db.getPersonConsents(input.id);

      // Buscar logs de auditoria relacionados
      const auditLogs = await db.getAuditLogs({
        tenantId: input.tenantId,
        entityType: "people",
        entityId: input.id,
        limit: 100,
      });

      await db.createAuditLog({
        tenantId: input.tenantId,
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

