import { getDb } from "../db";
import { log } from "./logger";
import { nanoid } from "nanoid";
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
    log.warn("Reminder scheduler: database not available");
    return;
  }

  try {
    log.info("Reminder scheduler: starting reminder scheduling");

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

    log.info("Reminder scheduler: found pending invites", { count: pendingInvites.length });

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
        log.info("Reminder scheduler: invite already has max reminders", { inviteId: invite.id, reminderCount });
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
        log.info("Reminder scheduler: no more reminders configured", { inviteId: invite.id });
        continue;
      }

      const reminderDate = new Date(invite.sentAt!);
      reminderDate.setDate(reminderDate.getDate() + reminderDays);

      const now = new Date();

      // Se ainda não é hora de enviar, pular
      if (now < reminderDate) {
        log.info("Reminder scheduler: reminder scheduled", { reminderNumber: nextReminderNumber, inviteId: invite.id, scheduledFor: reminderDate.toISOString() });
        continue;
      }

      // 5. Enviar email de lembrete
      log.info("Reminder scheduler: sending reminder", { reminderNumber: nextReminderNumber, inviteId: invite.id, email: invite.respondentEmail });

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
          id: `reminder_${Date.now()}_${nanoid(8)}`,
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

        log.info("Reminder scheduler: reminder sent successfully", { reminderNumber: nextReminderNumber, inviteId: invite.id });
      } catch (error) {
        log.error("Reminder scheduler: failed to send reminder", { inviteId: invite.id, error: error instanceof Error ? error.message : String(error) });

        // Registrar falha
        await db.insert(copsoqReminders).values({
          id: `reminder_${Date.now()}_${nanoid(8)}`,
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

      log.info("Reminder scheduler: marked invite as expired", { inviteId: invite.id });
    }

    log.info("Reminder scheduler: scheduling completed successfully");
  } catch (error) {
    log.error("Reminder scheduler: error during scheduling", { error: error instanceof Error ? error.message : String(error) });
  }
}

/**
 * Inicia o agendador de lembretes
 * Executa a cada 1 hora
 */
export function startReminderScheduler() {
  log.info("Reminder scheduler: starting service");

  // Executar imediatamente
  scheduleReminders().catch((err) => log.error("Reminder scheduler error", { error: err instanceof Error ? err.message : String(err) }));

  // Executar a cada 1 hora
  const intervalId = setInterval(
    () => {
      scheduleReminders().catch((err) => log.error("Reminder scheduler error", { error: err instanceof Error ? err.message : String(err) }));
    },
    60 * 60 * 1000
  ); // 1 hora em milissegundos

  // Permitir parar o scheduler
  return () => clearInterval(intervalId);
}
