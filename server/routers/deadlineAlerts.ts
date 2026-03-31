import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { tenantProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  deadlineAlerts,
  actionPlans,
  complianceMilestones,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

export const deadlineAlertsRouter = router({
  // Listar alertas por tenant
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        status: z.enum(["pending", "sent", "acknowledged", "expired"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(deadlineAlerts.tenantId, ctx.tenantId!)];

      if (input.status) {
        conditions.push(eq(deadlineAlerts.status, input.status));
      }

      const alerts = await db
        .select()
        .from(deadlineAlerts)
        .where(and(...conditions))
        .orderBy(deadlineAlerts.alertDate);

      return alerts;
    }),

  // Criar alerta
  create: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        userId: z.string().optional(),
        entityType: z.string(),
        entityId: z.string(),
        alertDate: z.coerce.date(),
        message: z.string(),
        channel: z.enum(["email", "in_app", "both"]).optional(),
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

      await db.insert(deadlineAlerts).values({
        id,
        tenantId: ctx.tenantId!,
        userId: input.userId || null,
        entityType: input.entityType,
        entityId: input.entityId,
        alertDate: input.alertDate,
        message: input.message,
        status: "pending",
        channel: input.channel ?? "in_app",
        createdAt: new Date(),
      });

      return { id };
    }),

  // Reconhecer alerta
  acknowledge: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(deadlineAlerts)
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
        })
        .where(and(eq(deadlineAlerts.id, input.id), eq(deadlineAlerts.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // Obter alertas próximos (dentro de N dias)
  getUpcoming: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        days: z.number().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + input.days);

      const alerts = await db
        .select()
        .from(deadlineAlerts)
        .where(
          and(
            eq(deadlineAlerts.tenantId, ctx.tenantId!),
            eq(deadlineAlerts.status, "pending"),
            sql`${deadlineAlerts.alertDate} >= ${now}`,
            sql`${deadlineAlerts.alertDate} <= ${futureDate}`
          )
        )
        .orderBy(deadlineAlerts.alertDate);

      return alerts;
    }),

  // Gerar alertas automaticamente a partir de planos de ação e marcos de conformidade
  autoGenerate: adminProcedure
    .input(
      z.object({
        tenantId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);

      let createdCount = 0;

      // 1. Verificar planos de ação com prazo dentro de 14 dias
      const upcomingPlans = await db
        .select()
        .from(actionPlans)
        .where(
          and(
            eq(actionPlans.tenantId, input.tenantId),
            sql`${actionPlans.deadline} IS NOT NULL`,
            sql`${actionPlans.deadline} <= ${futureDate}`,
            sql`${actionPlans.deadline} >= ${now}`,
            sql`${actionPlans.status} NOT IN ('completed', 'cancelled')`
          )
        );

      for (const plan of upcomingPlans) {
        // Verificar se já existe alerta para este plano
        const [existing] = await db
          .select()
          .from(deadlineAlerts)
          .where(
            and(
              eq(deadlineAlerts.tenantId, input.tenantId),
              eq(deadlineAlerts.entityType, "action_plan"),
              eq(deadlineAlerts.entityId, plan.id)
            )
          );

        if (!existing) {
          const id = nanoid();
          await db.insert(deadlineAlerts).values({
            id,
            tenantId: input.tenantId,
            entityType: "action_plan",
            entityId: plan.id,
            alertDate: plan.deadline!,
            message: `Plano de ação "${plan.title}" vence em breve`,
            status: "pending",
            channel: "in_app",
            createdAt: new Date(),
          });
          createdCount++;
        }
      }

      // 2. Verificar marcos de conformidade com data-alvo dentro de 14 dias
      const upcomingMilestones = await db
        .select()
        .from(complianceMilestones)
        .where(
          and(
            eq(complianceMilestones.tenantId, input.tenantId),
            sql`${complianceMilestones.targetDate} <= ${futureDate}`,
            sql`${complianceMilestones.targetDate} >= ${now}`,
            sql`${complianceMilestones.status} != 'completed'`
          )
        );

      for (const milestone of upcomingMilestones) {
        // Verificar se já existe alerta para este marco
        const [existing] = await db
          .select()
          .from(deadlineAlerts)
          .where(
            and(
              eq(deadlineAlerts.tenantId, input.tenantId),
              eq(deadlineAlerts.entityType, "compliance_milestone"),
              eq(deadlineAlerts.entityId, milestone.id)
            )
          );

        if (!existing) {
          const id = nanoid();
          await db.insert(deadlineAlerts).values({
            id,
            tenantId: input.tenantId,
            entityType: "compliance_milestone",
            entityId: milestone.id,
            alertDate: milestone.targetDate,
            message: `Marco de conformidade "${milestone.title}" vence em breve`,
            status: "pending",
            channel: "in_app",
            createdAt: new Date(),
          });
          createdCount++;
        }
      }

      return { createdCount };
    }),
});
