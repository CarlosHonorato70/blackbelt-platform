import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const sectorsRouter = router({
  // Listar setores de um tenant
  list: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Verificar se usuário tem acesso a este tenant

      const sectors = await db.listSectors(input.tenantId, input.search);

      await db.createAuditLog({
        tenantId: input.tenantId,
        userId: ctx.user.id,
        action: "READ",
        entityType: "sectors",
        entityId: null,
        oldValues: null,
        newValues: null,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return sectors;
    }),

  // Obter um setor específico
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const sector = await db.getSector(input.id, input.tenantId);

      if (!sector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Setor não encontrado",
        });
      }

      await db.createAuditLog({
        tenantId: input.tenantId,
        userId: ctx.user.id,
        action: "READ",
        entityType: "sectors",
        entityId: input.id,
        oldValues: null,
        newValues: null,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return sector;
    }),

  // Criar novo setor
  create: protectedProcedure
    .input(
      z.object({
        tenantId: z.string(),
        name: z.string().min(1, "Nome é obrigatório"),
        description: z.string().optional(),
        responsibleName: z.string().optional(),
        unit: z.string().optional(),
        shift: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Verificar se usuário tem permissão para criar setores neste tenant

      // Verificar se tenant existe
      const tenant = await db.getTenant(input.tenantId);
      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empresa não encontrada",
        });
      }

      const sector = await db.createSector(input);

      await db.createAuditLog({
        tenantId: input.tenantId,
        userId: ctx.user.id,
        action: "CREATE",
        entityType: "sectors",
        entityId: sector.id,
        oldValues: null,
        newValues: sector,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return sector;
    }),

  // Atualizar setor
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        responsibleName: z.string().optional(),
        unit: z.string().optional(),
        shift: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, tenantId, ...data } = input;

      const sector = await db.getSector(id, tenantId);
      if (!sector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Setor não encontrado",
        });
      }

      // TODO: Verificar permissões

      await db.updateSector(id, tenantId, data);

      await db.createAuditLog({
        tenantId,
        userId: ctx.user.id,
        action: "UPDATE",
        entityType: "sectors",
        entityId: id,
        oldValues: sector,
        newValues: data,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  // Deletar setor
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sector = await db.getSector(input.id, input.tenantId);
      if (!sector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Setor não encontrado",
        });
      }

      // TODO: Verificar permissões
      // TODO: Verificar se há colaboradores vinculados

      await db.deleteSector(input.id, input.tenantId);

      await db.createAuditLog({
        tenantId: input.tenantId,
        userId: ctx.user.id,
        action: "DELETE",
        entityType: "sectors",
        entityId: input.id,
        oldValues: sector,
        newValues: null,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),
});
