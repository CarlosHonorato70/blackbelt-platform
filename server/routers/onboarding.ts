import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { onboardingProgress, industryTemplates } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const ONBOARDING_STEPS = [
  { id: "company", label: "Complete company profile", description: "Add your company information." },
  { id: "sectors", label: "Create sectors", description: "Register your company's organizational sectors." },
  { id: "people", label: "Add people", description: "Add employees to the system." },
  { id: "branding", label: "Configure branding", description: "Customize logo and colors (Enterprise only)" },
  { id: "webhooks", label: "Set up webhooks", description: "Configure API integrations (optional)" },
  { id: "2fa", label: "Enable 2FA", description: "Secure your account with two-factor authentication" },
  { id: "security", label: "Review security settings", description: "Configure IP whitelist and session management" },
  { id: "proposal", label: "Create first proposal", description: "Generate your first proposal document" },
  { id: "analytics", label: "Explore analytics", description: "View your dashboard and metrics" },
  { id: "tour", label: "Complete product tour", description: "Learn key platform features" },
];

export const onboardingRouter = router({

  getProgress: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();

    let progress = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.tenantId, tenantId))
      .limit(1);

    if (progress.length === 0) {
      await db.insert(onboardingProgress).values({
        tenantId,
        currentStep: 1,
        completedSteps: JSON.stringify([]),
        checklistItems: JSON.stringify([]),
        skipped: false,
      });

      progress = await db
        .select()
        .from(onboardingProgress)
        .where(eq(onboardingProgress.tenantId, tenantId))
        .limit(1);
    }

    return {
      ...progress[0],
      completedSteps: JSON.parse(progress[0].completedSteps),
      checklistItems: JSON.parse(progress[0].checklistItems),
      steps: ONBOARDING_STEPS,
    };
  }),

  updateStep: protectedProcedure.mutation(async ({ ctx, input }) => {
    const { step } = input as { step: number };
    const tenantId = ctx.user.tenantId;
    const db = await getDb();

    await db
      .update(onboardingProgress)
      .set({
        currentStep: step,
        updatedAt: new Date(),
      })
      .where(eq(onboardingProgress.tenantId, tenantId));

    return { success: true };
  }),

  completeChecklistItem: protectedProcedure.mutation(async ({ ctx, input }) => {
    const { itemId } = input as { itemId: string };
    const tenantId = ctx.user.tenantId;
    const db = await getDb();

    const [progress] = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.tenantId, tenantId));

    if (!progress) return { success: false };

    const items = JSON.parse(progress.checklistItems);
    if (!items.includes(itemId)) items.push(itemId);

    await db
      .update(onboardingProgress)
      .set({
        checklistItems: JSON.stringify(items),
        updatedAt: new Date(),
      })
      .where(eq(onboardingProgress.tenantId, tenantId));

    return { success: true };
  }),

  skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();

    await db
      .update(onboardingProgress)
      .set({
        skipped: true,
        completedAt: new Date(),
      })
      .where(eq(onboardingProgress.tenantId, tenantId));

    return { success: true };
  }),

  resetOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;
    const db = await getDb();

    await db
      .update(onboardingProgress)
      .set({
        currentStep: 1,
        completedSteps: JSON.stringify([]),
        checklistItems: JSON.stringify([]),
        skipped: false,
        completedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(onboardingProgress.tenantId, tenantId));

    return { success: true };
  }),

  getIndustryTemplates: protectedProcedure.query(async () => {
    const db = await getDb();
    return await db.select().from(industryTemplates);
  }),

  applyTemplate: protectedProcedure.mutation(async ({ ctx, input }) => {
    const tenantId = ctx.user.tenantId;
    const { templateId } = input as { templateId: string };
    const db = await getDb();

    const [template] = await db
      .select()
      .from(industryTemplates)
      .where(eq(industryTemplates.id, templateId));

    if (!template) return { success: false };

    return { success: true };
  }),

});