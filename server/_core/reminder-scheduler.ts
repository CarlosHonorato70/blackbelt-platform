import { getDb } from "../db";
import { copsoqInvites, copsoqReminders } from "../../drizzle/schema_nr01";
import { eq, and, lt, isNull, lte } from "drizzle-orm";
import { sendReminderEmail } from "./email";

/**
 * Configurações de lembretes
 * Intervalo entre lembretes em horas
 */
const REMINDER_CONFIG = {
  firstReminder: 2, // 2 dias após envio
  secondReminder: 5, // 5 dias após envio
  thirdReminder: 9, // 9 dias após envio
  maxReminders: 3,
  expiryDays: 14, // Convite expira em 14 dias
};

/**
 * Serviço de agendador de lembretes automáticos
 * Deve ser executado periodicamente (ex: a cada 1 hora via cron job)
 */
export async function scheduleReminders() {
  const db = await getDb();
  if (!db) {
    console.warn("[Reminder Scheduler] Database not available");
    return;
  }

  try {
    console.log("[Reminder Scheduler] Starting reminder scheduling...");

    // 1. Buscar convites pendentes que precisam de lembrete
    const pendingInvites = await db
      .select()
      .from(copsoqInvites)
      .where(
        and(
          eq(copsoqInvites.status, "sent"),
          isNull(copsoqInvites.completedAt),
          lt(
            copsoqInvites.expiresAt,
            new Date(Date.now() + 24 * 60 * 60 * 1000)
          )
        )
      );

    console.log(
      `[Reminder Scheduler] Found ${pendingInvites.length} pending invites`
    );

    for (const invite of pendingInvites) {
      // 2. Verificar quantos lembretes já foram enviados
      const sentReminders = await db
        .select()
        .from(copsoqReminders)
        .where(
          and(
            eq(copsoqReminders.inviteId, invite.id),
            eq(copsoqReminders.status, "sent")
          )
        );

      const reminderCount = sentReminders.length;

      // 3. Se já atingiu o máximo de lembretes, pular
      if (reminderCount >= REMINDER_CONFIG.maxReminders) {
        console.log(
          `[Reminder Scheduler] Invite ${invite.id} already has max reminders (${reminderCount})`
        );
        continue;
      }

      // 4. Verificar se é hora de enviar o próximo lembrete
      const nextReminderNumber = reminderCount + 1;
      const reminderDaysConfig = [
        REMINDER_CONFIG.firstReminder,
        REMINDER_CONFIG.secondReminder,
        REMINDER_CONFIG.thirdReminder,
      ];
      const reminderDays = reminderDaysConfig[reminderCount];

      if (!reminderDays) {
        console.log(
          `[Reminder Scheduler] No more reminders configured for invite ${invite.id}`
        );
        continue;
      }

      const reminderDate = new Date(invite.sentAt!);
      reminderDate.setDate(reminderDate.getDate() + reminderDays);

      const now = new Date();

      // Se ainda não é hora de enviar, pular
      if (now < reminderDate) {
        console.log(
          `[Reminder Scheduler] Reminder ${nextReminderNumber} for invite ${invite.id} scheduled for ${reminderDate.toISOString()}`
        );
        continue;
      }

      // 5. Enviar email de lembrete
      console.log(
        `[Reminder Scheduler] Sending reminder ${nextReminderNumber} for invite ${invite.id} to ${invite.respondentEmail}`
      );

      try {
        await sendReminderEmail({
          respondentName: invite.respondentName,
          respondentEmail: invite.respondentEmail,
          inviteToken: invite.inviteToken,
          reminderNumber: nextReminderNumber,
          assessmentTitle: "Avaliação COPSOQ-II",
        });

        // 6. Registrar lembrete enviado
        const nextReminderDate = new Date(reminderDate);
        if (nextReminderNumber < REMINDER_CONFIG.maxReminders) {
          const nextDays = reminderDaysConfig[nextReminderNumber];
          nextReminderDate.setDate(nextReminderDate.getDate() + nextDays);
        }

        await db.insert(copsoqReminders).values({
          id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          inviteId: invite.id,
          assessmentId: invite.assessmentId,
          respondentEmail: invite.respondentEmail,
          respondentName: invite.respondentName,
          reminderNumber: nextReminderNumber,
          sentAt: new Date(),
          nextReminderAt:
            nextReminderNumber < REMINDER_CONFIG.maxReminders
              ? nextReminderDate
              : null,
          status: "sent",
        });

        console.log(
          `[Reminder Scheduler] Reminder ${nextReminderNumber} sent successfully for invite ${invite.id}`
        );
      } catch (error) {
        console.error(
          `[Reminder Scheduler] Failed to send reminder for invite ${invite.id}:`,
          error
        );

        // Registrar falha
        await db.insert(copsoqReminders).values({
          id: `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          inviteId: invite.id,
          assessmentId: invite.assessmentId,
          respondentEmail: invite.respondentEmail,
          respondentName: invite.respondentName,
          reminderNumber: nextReminderNumber,
          sentAt: new Date(),
          status: "failed",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // 7. Marcar convites como expirados se passaram da data de expiração
    const expiredInvites = await db
      .select()
      .from(copsoqInvites)
      .where(
        and(
          eq(copsoqInvites.status, "sent"),
          isNull(copsoqInvites.completedAt),
          lte(copsoqInvites.expiresAt, new Date())
        )
      );

    for (const invite of expiredInvites) {
      await db
        .update(copsoqInvites)
        .set({ status: "expired" })
        .where(eq(copsoqInvites.id, invite.id));

      console.log(`[Reminder Scheduler] Marked invite ${invite.id} as expired`);
    }

    console.log(
      "[Reminder Scheduler] Reminder scheduling completed successfully"
    );
  } catch (error) {
    console.error(
      "[Reminder Scheduler] Error during reminder scheduling:",
      error
    );
  }
}

/**
 * Inicia o agendador de lembretes
 * Executa a cada 1 hora
 */
export function startReminderScheduler() {
  console.log("[Reminder Scheduler] Starting reminder scheduler service...");

  // Executar imediatamente
  scheduleReminders().catch(console.error);

  // Executar a cada 1 hora
  const intervalId = setInterval(
    () => {
      scheduleReminders().catch(console.error);
    },
    60 * 60 * 1000
  ); // 1 hora em milissegundos

  // Permitir parar o scheduler
  return () => clearInterval(intervalId);
}
