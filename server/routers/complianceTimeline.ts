import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { tenantProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { complianceMilestones } from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

export const complianceTimelineRouter = router({
  // Listar milestones do tenant
  list: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const milestones = await db
        .select()
        .from(complianceMilestones)
        .where(eq(complianceMilestones.tenantId, ctx.tenantId!))
        .orderBy(complianceMilestones.order);

      return milestones;
    }),

  // Criar milestone
  create: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        category: z.enum([
          "assessment",
          "inventory",
          "action_plan",
          "training",
          "documentation",
          "review",
        ]),
        targetDate: z.coerce.date(),
        dependsOnId: z.string().optional(),
        order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const id = nanoid();

      await db.insert(complianceMilestones).values({
        id,
        tenantId: ctx.tenantId!,
        title: input.title,
        description: input.description || null,
        category: input.category,
        targetDate: input.targetDate,
        dependsOnId: input.dependsOnId || null,
        order: input.order || 0,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id };
    }),

  // Atualizar milestone
  update: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        targetDate: z.coerce.date().optional(),
        status: z
          .enum(["pending", "in_progress", "completed", "overdue"])
          .optional(),
        completedDate: z.coerce.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { id, ...data } = input;
      const updateData: any = { updatedAt: new Date() };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.targetDate !== undefined) updateData.targetDate = data.targetDate;
      if (data.status !== undefined) {
        updateData.status = data.status;
        // Auto-set completedDate quando status é completed
        if (data.status === "completed" && !data.completedDate) {
          updateData.completedDate = new Date();
        }
      }
      if (data.completedDate !== undefined) updateData.completedDate = data.completedDate;

      await db
        .update(complianceMilestones)
        .set(updateData)
        .where(and(eq(complianceMilestones.id, id), eq(complianceMilestones.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // Deletar milestone
  delete: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .delete(complianceMilestones)
        .where(and(eq(complianceMilestones.id, input.id), eq(complianceMilestones.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // Obter progresso geral
  getProgress: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const milestones = await db
        .select()
        .from(complianceMilestones)
        .where(eq(complianceMilestones.tenantId, ctx.tenantId!));

      const total = milestones.length;
      const completed = milestones.filter((m) => m.status === "completed").length;
      const inProgress = milestones.filter((m) => m.status === "in_progress").length;
      const now = new Date();
      const overdue = milestones.filter(
        (m) =>
          m.status !== "completed" &&
          m.targetDate &&
          new Date(m.targetDate) < now
      ).length;
      const percentComplete = total > 0 ? Math.round((completed / total) * 100) : 0;

      return { total, completed, inProgress, overdue, percentComplete };
    }),

  // Criar milestones padrão NR-01
  seedDefaults: adminProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Verificar se já existem milestones
      const existing = await db
        .select()
        .from(complianceMilestones)
        .where(eq(complianceMilestones.tenantId, input.tenantId))
        .limit(1);

      if (existing.length > 0) {
        return { seeded: false, message: "Milestones já existem para este tenant" };
      }

      const now = new Date();
      const addDays = (days: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() + days);
        return d;
      };

      const defaults = [
        { title: "Capacitação da equipe SST", category: "training" as const, targetDate: addDays(30), order: 1 },
        { title: "Definição de metodologia", category: "assessment" as const, targetDate: addDays(45), order: 2 },
        { title: "Aplicação COPSOQ-II", category: "assessment" as const, targetDate: addDays(75), order: 3 },
        { title: "Análise e relatório", category: "inventory" as const, targetDate: addDays(90), order: 4 },
        { title: "Elaboração do PGR psicossocial", category: "documentation" as const, targetDate: addDays(105), order: 5 },
        { title: "Plano de ação preventivo", category: "action_plan" as const, targetDate: addDays(120), order: 6 },
        { title: "Implementação das ações", category: "action_plan" as const, targetDate: addDays(180), order: 7 },
        { title: "Integração PGR+PCMSO", category: "documentation" as const, targetDate: addDays(150), order: 8 },
        { title: "Treinamento de lideranças", category: "training" as const, targetDate: addDays(135), order: 9 },
        { title: "Revisão e auditoria", category: "review" as const, targetDate: addDays(210), order: 10 },
        { title: "Adequação completa NR-01", category: "review" as const, targetDate: new Date("2026-05-26"), order: 11 },
      ];

      const ids: string[] = [];

      for (const item of defaults) {
        const id = nanoid();
        ids.push(id);

        await db.insert(complianceMilestones).values({
          id,
          tenantId: input.tenantId,
          title: item.title,
          description: null,
          category: item.category,
          targetDate: item.targetDate,
          status: "pending",
          order: item.order,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return { seeded: true, count: ids.length };
    }),
});
