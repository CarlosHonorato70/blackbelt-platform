import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { copsoqReminders, copsoqInvites } from "../../drizzle/schema_nr01";
import { eq, and } from "drizzle-orm";
import { scheduleReminders } from "../_core/reminder-scheduler";

export const remindersRouter = router({
  /**
   * Listar lembretes enviados para uma avaliação
   */
  listByAssessment: protectedProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(copsoqReminders)
        .where(eq(copsoqReminders.assessmentId, input.assessmentId));
    }),

  /**
   * Listar lembretes enviados para um convite
   */
  listByInvite: protectedProcedure
    .input(z.object({ inviteId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(copsoqReminders)
        .where(eq(copsoqReminders.inviteId, input.inviteId));
    }),

  /**
   * Obter estatísticas de lembretes para uma avaliação
   */
  getStatistics: protectedProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const reminders = await db
        .select()
        .from(copsoqReminders)
        .where(eq(copsoqReminders.assessmentId, input.assessmentId));

      const invites = await db
        .select()
        .from(copsoqInvites)
        .where(eq(copsoqInvites.assessmentId, input.assessmentId));

      const sentReminders = reminders.filter(r => r.status === "sent").length;
      const failedReminders = reminders.filter(
        r => r.status === "failed"
      ).length;
      const bouncedReminders = reminders.filter(
        r => r.status === "bounced"
      ).length;

      const pendingInvites = invites.filter(
        i => i.status === "sent" && !i.completedAt
      ).length;
      const completedInvites = invites.filter(i => i.completedAt).length;

      return {
        totalInvites: invites.length,
        completedInvites,
        pendingInvites,
        responseRate:
          invites.length > 0
            ? Math.round((completedInvites / invites.length) * 100)
            : 0,
        totalReminders: reminders.length,
        sentReminders,
        failedReminders,
        bouncedReminders,
        averageRemindersPerInvite:
          invites.length > 0
            ? Math.round((reminders.length / invites.length) * 10) / 10
            : 0,
      };
    }),

  /**
   * Executar agendador de lembretes manualmente
   */
  triggerScheduler: protectedProcedure.mutation(async () => {
    try {
      await scheduleReminders();
      return {
        success: true,
        message: "Agendador de lembretes executado com sucesso",
      };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Erro ao executar agendador",
      };
    }
  }),

  /**
   * Enviar lembrete manual para um convite específico
   */
  sendManualReminder: protectedProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const invite = await db
        .select()
        .from(copsoqInvites)
        .where(eq(copsoqInvites.id, input.inviteId))
        .limit(1);

      if (!invite || invite.length === 0) {
        throw new Error("Convite não encontrado");
      }

      const inviteData = invite[0];

      // Contar lembretes já enviados
      const sentReminders = await db
        .select()
        .from(copsoqReminders)
        .where(
          and(
            eq(copsoqReminders.inviteId, input.inviteId),
            eq(copsoqReminders.status, "sent")
          )
        );

      if (sentReminders.length >= 3) {
        throw new Error("Limite máximo de lembretes atingido (3)");
      }

      // Registrar lembrete
      const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await db.insert(copsoqReminders).values({
        id: reminderId,
        inviteId: input.inviteId,
        assessmentId: inviteData.assessmentId,
        respondentEmail: inviteData.respondentEmail,
        respondentName: inviteData.respondentName,
        reminderNumber: sentReminders.length + 1,
        sentAt: new Date(),
        status: "sent",
      });

      return {
        success: true,
        message: `Lembrete ${sentReminders.length + 1} enviado com sucesso`,
        reminderId,
      };
    }),

  /**
   * Obter detalhes de um lembrete
   */
  getDetails: protectedProcedure
    .input(z.object({ reminderId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const reminder = await db
        .select()
        .from(copsoqReminders)
        .where(eq(copsoqReminders.id, input.reminderId))
        .limit(1);

      return reminder && reminder.length > 0 ? reminder[0] : null;
    }),
});
