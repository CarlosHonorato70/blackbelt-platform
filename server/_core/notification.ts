import { TRPCError } from "@trpc/server";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Local notification handler for standalone version
 * Logs notifications to console (can be extended to email, Slack, etc)
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  try {
    // Log to console
    console.log("[Notification] Owner notification:");
    console.log(`  Title: ${title}`);
    console.log(`  Content: ${content}`);
    console.log(`  Timestamp: ${new Date().toISOString()}`);

    // In production, you could:
    // - Send email via SendGrid
    // - Send to Slack webhook
    // - Store in database for dashboard
    // - Send SMS via Twilio

    return true;
  } catch (error) {
    console.warn("[Notification] Error processing notification:", error);
    return false;
  }
}
