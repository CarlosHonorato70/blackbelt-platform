import { router, protectedProcedure } from "../trpc";
import { z } from "zod";
import { db } from "../db";
import { onboardingProgress, industryTemplates, tenants } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Industry template configurations
const INDUSTRY_TEMPLATES = [
  {
    name: "Healthcare",
    slug: "healthcare",
    description: "HIPAA compliance and patient data protection",
    icon: "🏥",
    configuration: {
      complianceFrameworks: ["HIPAA", "HITECH"],
      assessmentTypes: ["Patient Data Security", "Medical Records Audit", "PHI Protection"],
      policies: ["Privacy Policy", "Data Breach Response", "Patient Rights"],
    },
    features: ["encryption", "access_logs", "audit_trail"],
  },
  {
    name: "Finance",
    slug: "finance",
    description: "Financial compliance and SOC 2 standards",
    icon: "💰",
    configuration: {
      complianceFrameworks: ["SOC 2", "PCI-DSS", "GLBA"],
      assessmentTypes: ["Financial Controls", "Transaction Security", "Data Protection"],
      policies: ["Financial Privacy", "Payment Security", "Fraud Prevention"],
    },
    features: ["encryption", "transaction_logs", "2fa_required"],
  },
  {
    name: "Technology",
    slug: "technology",
    description: "ISO 27001 and GDPR compliance",
    icon: "💻",
    configuration: {
      complianceFrameworks: ["ISO 27001", "GDPR", "SOC 2"],
      assessmentTypes: ["Security Assessment", "Data Privacy", "Access Control"],
      policies: ["Information Security", "Data Protection", "Incident Response"],
    },
    features: ["encryption", "audit_trail", "api_security"],
  },
  {
    name: "Manufacturing",
    slug: "manufacturing",
    description: "ISO 9001 and safety protocols",
    icon: "🏭",
    configuration: {
      complianceFrameworks: ["ISO 9001", "OSHA", "Environmental Standards"],
      assessmentTypes: ["Quality Control", "Safety Audit", "Environmental Impact"],
      policies: ["Safety Procedures", "Quality Management", "Environmental Policy"],
    },
    features: ["document_control", "change_management", "audit_trail"],
  },
  {
    name: "Retail",
    slug: "retail",
    description: "PCI-DSS and consumer protection",
    icon: "🛒",
    configuration: {
      complianceFrameworks: ["PCI-DSS", "Consumer Protection", "LGPD"],
      assessmentTypes: ["Payment Security", "Customer Data", "Store Operations"],
      policies: ["Payment Processing", "Customer Privacy", "Return Policy"],
    },
    features: ["payment_security", "customer_data_protection"],
  },
  {
    name: "Education",
    slug: "education",
    description: "FERPA and student data privacy",
    icon: "🎓",
    configuration: {
      complianceFrameworks: ["FERPA", "COPPA", "Data Privacy"],
      assessmentTypes: ["Student Data Protection", "Educational Records", "Campus Security"],
      policies: ["Student Privacy", "Data Access", "Educational Standards"],
    },
    features: ["student_data_protection", "access_control"],
  },
  {
    name: "Government",
    slug: "government",
    description: "NIST and government security frameworks",
    icon: "🏛️",
    configuration: {
      complianceFrameworks: ["NIST", "FedRAMP", "FISMA"],
      assessmentTypes: ["Security Controls", "Risk Assessment", "Compliance Audit"],
      policies: ["Information Security", "Access Control", "Incident Response"],
    },
    features: ["high_security", "audit_trail", "encryption"],
  },
  {
    name: "Legal",
    slug: "legal",
    description: "Client confidentiality and data protection",
    icon: "⚖️",
    configuration: {
      complianceFrameworks: ["Attorney-Client Privilege", "Data Protection", "Ethics Rules"],
      assessmentTypes: ["Client Data Security", "Document Management", "Conflict Check"],
      policies: ["Confidentiality", "Document Retention", "Ethics Compliance"],
    },
    features: ["document_encryption", "access_logs", "client_portal"],
  },
  {
    name: "Real Estate",
    slug: "real_estate",
    description: "Property compliance and contracts",
    icon: "🏠",
    configuration: {
      complianceFrameworks: ["Fair Housing", "Property Laws", "Contract Standards"],
      assessmentTypes: ["Property Inspection", "Document Compliance", "Transaction Review"],
      policies: ["Fair Housing", "Disclosure Requirements", "Contract Standards"],
    },
    features: ["document_management", "e-signature", "transaction_tracking"],
  },
  {
    name: "Consulting",
    slug: "consulting",
    description: "Professional services and SOPs",
    icon: "📊",
    configuration: {
      complianceFrameworks: ["Professional Standards", "Quality Management"],
      assessmentTypes: ["Client Engagement", "Project Compliance", "Quality Review"],
      policies: ["Professional Standards", "Client Confidentiality", "Service Delivery"],
    },
    features: ["project_management", "time_tracking", "client_portal"],
  },
  {
    name: "E-commerce",
    slug: "ecommerce",
    description: "Payment security and LGPD compliance",
    icon: "🛍️",
    configuration: {
      complianceFrameworks: ["PCI-DSS", "LGPD", "Consumer Protection"],
      assessmentTypes: ["Payment Security", "Customer Data", "Order Processing"],
      policies: ["Privacy Policy", "Terms of Service", "Return Policy"],
    },
    features: ["payment_security", "customer_data_protection", "order_management"],
  },
  {
    name: "Generic",
    slug: "generic",
    description: "Basic compliance starter template",
    icon: "📋",
    configuration: {
      complianceFrameworks: ["Basic Compliance", "Best Practices"],
      assessmentTypes: ["General Assessment", "Risk Review", "Policy Check"],
      policies: ["General Policy", "Data Protection", "Security"],
    },
    features: ["basic_features"],
  },
];

// Checklist items
const CHECKLIST_ITEMS = [
  { id: "profile", label: "Complete company profile", description: "Add company details and logo" },
  { id: "team", label: "Invite team members", description: "Add users to your organization" },
  { id: "assessment", label: "Create first assessment", description: "Start your first compliance assessment" },
  { id: "branding", label: "Configure branding", description: "Customize logo and colors (Enterprise only)" },
  { id: "webhooks", label: "Set up webhooks", description: "Configure API integrations (optional)" },
  { id: "2fa", label: "Enable 2FA", description: "Secure your account with two-factor authentication" },
  { id: "security", label: "Review security settings", description: "Configure IP whitelist and session management" },
  { id: "proposal", label: "Create first proposal", description: "Generate your first proposal document" },
  { id: "analytics", label: "Explore analytics", description: "View your dashboard and metrics" },
  { id: "tour", label: "Complete product tour", description: "Learn key platform features" },
];

export const onboardingRouter = router({
  // Get current onboarding progress
  getProgress: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;

    let progress = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.tenantId, tenantId))
      .limit(1);

    // Initialize if not exists
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

    const data = progress[0];
    
    return {
      id: data.id,
      currentStep: data.currentStep,
      completedSteps: JSON.parse(data.completedSteps as string),
      checklistItems: JSON.parse(data.checklistItems as string),
      skipped: data.skipped,
      completedAt: data.completedAt,
      isComplete: !!data.completedAt,
      totalSteps: 5,
    };
  }),

  // Update wizard step
  updateStep: protectedProcedure
    .input(
      z.object({
        step: z.number().min(1).max(5),
        data: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;

      const progress = await db
        .select()
        .from(onboardingProgress)
        .where(eq(onboardingProgress.tenantId, tenantId))
        .limit(1);

      if (progress.length === 0) {
        throw new Error("Onboarding not initialized");
      }

      const currentData = progress[0];
      const completedSteps = JSON.parse(currentData.completedSteps as string) as number[];

      // Add step to completed if not already there
      if (!completedSteps.includes(input.step)) {
        completedSteps.push(input.step);
      }

      // Update current step to next
      const nextStep = Math.min(input.step + 1, 5);

      await db
        .update(onboardingProgress)
        .set({
          currentStep: nextStep,
          completedSteps: JSON.stringify(completedSteps),
          updatedAt: new Date(),
        })
        .where(eq(onboardingProgress.id, currentData.id));

      // Apply step-specific actions
      if (input.step === 1 && input.data) {
        // Step 1: Update company profile
        await db
          .update(tenants)
          .set({
            name: input.data.companyName || currentData.name,
            industry: input.data.industry,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, tenantId));
      }

      return { success: true, nextStep };
    }),

  // Complete onboarding
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;

    await db
      .update(onboardingProgress)
      .set({
        currentStep: 5,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(onboardingProgress.tenantId, tenantId));

    return { success: true };
  }),

  // Get industry templates
  getIndustryTemplates: protectedProcedure.query(async () => {
    // In production, these would come from database
    // For now, return the static templates
    return INDUSTRY_TEMPLATES.map((template) => ({
      ...template,
      isActive: true,
    }));
  }),

  // Apply industry template
  applyTemplate: protectedProcedure
    .input(
      z.object({
        templateSlug: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;

      const template = INDUSTRY_TEMPLATES.find((t) => t.slug === input.templateSlug);

      if (!template) {
        throw new Error("Template not found");
      }

      // Update tenant with industry
      await db
        .update(tenants)
        .set({
          industry: template.name,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      // Mark step 2 as complete
      const progress = await db
        .select()
        .from(onboardingProgress)
        .where(eq(onboardingProgress.tenantId, tenantId))
        .limit(1);

      if (progress.length > 0) {
        const currentData = progress[0];
        const completedSteps = JSON.parse(currentData.completedSteps as string) as number[];

        if (!completedSteps.includes(2)) {
          completedSteps.push(2);
        }

        await db
          .update(onboardingProgress)
          .set({
            currentStep: 3,
            completedSteps: JSON.stringify(completedSteps),
            updatedAt: new Date(),
          })
          .where(eq(onboardingProgress.id, currentData.id));
      }

      return {
        success: true,
        appliedTemplate: template.name,
        configuration: template.configuration,
      };
    }),

  // Get checklist
  getChecklist: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;

    const progress = await db
      .select()
      .from(onboardingProgress)
      .where(eq(onboardingProgress.tenantId, tenantId))
      .limit(1);

    let completedItems: string[] = [];
    if (progress.length > 0) {
      completedItems = JSON.parse(progress[0].checklistItems as string);
    }

    const items = CHECKLIST_ITEMS.map((item) => ({
      ...item,
      completed: completedItems.includes(item.id),
    }));

    const completedCount = completedItems.length;
    const totalCount = CHECKLIST_ITEMS.length;
    const percentage = Math.round((completedCount / totalCount) * 100);

    return {
      items,
      completedCount,
      totalCount,
      percentage,
      allComplete: completedCount === totalCount,
    };
  }),

  // Complete checklist item
  completeChecklistItem: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;

      const progress = await db
        .select()
        .from(onboardingProgress)
        .where(eq(onboardingProgress.tenantId, tenantId))
        .limit(1);

      if (progress.length === 0) {
        throw new Error("Onboarding not initialized");
      }

      const currentData = progress[0];
      const completedItems = JSON.parse(currentData.checklistItems as string) as string[];

      if (!completedItems.includes(input.itemId)) {
        completedItems.push(input.itemId);
      }

      await db
        .update(onboardingProgress)
        .set({
          checklistItems: JSON.stringify(completedItems),
          updatedAt: new Date(),
        })
        .where(eq(onboardingProgress.id, currentData.id));

      return { success: true, completedItems };
    }),

  // Skip onboarding
  skipOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;

    await db
      .update(onboardingProgress)
      .set({
        skipped: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(onboardingProgress.tenantId, tenantId));

    return { success: true };
  }),

  // Reset onboarding
  resetOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.user.tenantId;

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
});
