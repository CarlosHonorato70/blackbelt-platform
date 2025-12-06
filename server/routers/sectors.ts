import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router, tenantProcedure } from "../_core/trpc";
import * as db from "../db";

export const sectorsRouter = router({
  // Listar setores de um tenant
  list: tenantProcedure
    .input(
      z.object({
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // TODO: Verificar se usuário tem acesso a este tenant

      const sectors = await db.listSectors(ctx.tenantId!, input?.search);

      await db.createAuditLog({
        tenantId: ctx.tenantId!,
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
  get: tenantProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const sector = await db.getSector(input.id, ctx.tenantId!);

      if (!sector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Setor não encontrado",
        });
      }

      await db.createAuditLog({
        tenantId: ctx.tenantId!,
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
  create: tenantProcedure
    .input(
      z.object({
        
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
      const tenant = await db.getTenant(ctx.tenantId!);
      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empresa não encontrada",
        });
      }

      const sector = await db.createSector({
        ...input,
        tenantId: ctx.tenantId!,
      });

      await db.createAuditLog({
        tenantId: ctx.tenantId!,
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
  update: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        responsibleName: z.string().optional(),
        unit: z.string().optional(),
        shift: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const sector = await db.getSector(id, ctx.tenantId!);
      if (!sector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Setor não encontrado",
        });
      }

      // TODO: Verificar permissões

      await db.updateSector(id, ctx.tenantId!, data);

      await db.createAuditLog({
        tenantId: ctx.tenantId!,
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
  delete: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sector = await db.getSector(input.id, ctx.tenantId!);
      if (!sector) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Setor não encontrado",
        });
      }

      // TODO: Verificar permissões
      // TODO: Verificar se há colaboradores vinculados

      await db.deleteSector(input.id, ctx.tenantId!);

      await db.createAuditLog({
        tenantId: ctx.tenantId!,
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
