import { z } from "zod";
import { protectedProcedure, router, tenantProcedure } from "../_core/trpc";
import {
  calculateProposal,
  calculateTechnicalHour,
  createAssessmentProposal,
  createClient,
  createPricingParameters,
  createProposal,
  createProposalItem,
  createService,
  deleteClient,
  deleteProposal,
  deleteProposalItem,
  deleteService,
  getAssessmentProposals,
  getClient,
  getPricingParameters,
  getProposal,
  getService,
  listClients,
  listProposals,
  listProposalItems,
  listServices,
  updateClient,
  updatePricingParameters,
  updateProposal,
  updateService,
} from "../db";

// ============================================================================
// CLIENTS ROUTER
// ============================================================================

export const clientsRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    return await listClients(ctx.tenantId!);
  }),

  create: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1),
        cnpj: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.enum(["micro", "small", "medium", "large"]).optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      return await createClient({
        tenantId: ctx.tenantId!,
        ...input,
      });
    }),

  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const client = await getClient(input.id);
      if (client?.tenantId !== ctx.tenantId!) throw new Error("Forbidden");
      return client;
    }),

  update: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        cnpj: z.string().optional(),
        industry: z.string().optional(),
        companySize: z.enum(["micro", "small", "medium", "large"]).optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        street: z.string().optional(),
        number: z.string().optional(),
        complement: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const client = await getClient(input.id);
      if (client?.tenantId !== ctx.tenantId!) throw new Error("Forbidden");
      const { id, ...data } = input;
      await updateClient(id, data);
      return await getClient(id);
    }),

  delete: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const client = await getClient(input.id);
      if (client?.tenantId !== ctx.tenantId!) throw new Error("Forbidden");
      await deleteClient(input.id);
      return { success: true };
    }),
});

// ============================================================================
// SERVICES ROUTER
// ============================================================================

export const servicesRouter = router({
  list: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error("Unauthorized");
    return await listServices(ctx.tenantId!);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().min(1),
        unit: z.enum(["hour", "day", "project", "month"]),
        minPrice: z.number().int().min(0),
        maxPrice: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      return await createService({
        tenantId: ctx.tenantId!,
        ...input,
      });
    }),

  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const service = await getService(input.id);
      if (service?.tenantId !== ctx.tenantId!) throw new Error("Forbidden");
      return service;
    }),

  update: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        unit: z.enum(["hour", "day", "project", "month"]).optional(),
        minPrice: z.number().int().optional(),
        maxPrice: z.number().int().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const service = await getService(input.id);
      if (service?.tenantId !== ctx.tenantId!) throw new Error("Forbidden");
      const { id, ...data } = input;
      await updateService(id, data);
      return await getService(id);
    }),

  delete: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const service = await getService(input.id);
      if (service?.tenantId !== ctx.tenantId!) throw new Error("Forbidden");
      await deleteService(input.id);
      return { success: true };
    }),
});

// ============================================================================
// PRICING PARAMETERS ROUTER
// ============================================================================

export const pricingParametersRouter = router({
  get: tenantProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new Error("Unauthorized");
    return await getPricingParameters(ctx.tenantId!);
  }),

  update: tenantProcedure
    .input(
      z.object({
        monthlyFixedCost: z.number().int().optional(),
        laborCost: z.number().int().optional(),
        productiveHoursPerMonth: z.number().int().optional(),
        defaultTaxRegime: z.enum(["MEI", "SN", "LP", "autonomous"]).optional(),
        volumeDiscounts: z.record(z.string(), z.number()).optional(),
        riskAdjustment: z.number().int().optional(),
        seniorityAdjustment: z.number().int().optional(),
        taxRates: z.record(z.string(), z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      await updatePricingParameters(ctx.tenantId!, input);
      return await getPricingParameters(ctx.tenantId!);
    }),
});

// ============================================================================
// PROPOSALS ROUTER
// ============================================================================

export const proposalsRouter = router({
  list: protectedProcedure
    .input(z.object({ clientId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      return await listProposals(ctx.tenantId!, input.clientId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        status: z
          .enum(["draft", "sent", "accepted", "rejected", "expired"])
          .optional(),
        subtotal: z.number().int().min(0),
        discount: z.number().int().default(0),
        discountPercent: z.number().int().default(0),
        taxes: z.number().int().default(0),
        totalValue: z.number().int().min(0),
        taxRegime: z.enum(["MEI", "SN", "LP", "autonomous"]),
        validUntil: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const client = await getClient(input.clientId);
      if (client?.tenantId !== ctx.tenantId!) throw new Error("Forbidden");
      return await createProposal({
        tenantId: ctx.tenantId!,
        ...input,
      });
    }),

  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const proposal = await getProposal(input.id);
      if (proposal?.tenantId !== ctx.tenantId!) throw new Error("Forbidden");
      const items = await listProposalItems(input.id);
      return { ...proposal, items };
    }),

  update: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z
          .enum(["draft", "sent", "accepted", "rejected", "expired"])
          .optional(),
        subtotal: z.number().int().optional(),
        discount: z.number().int().optional(),
        discountPercent: z.number().int().optional(),
        taxes: z.number().int().optional(),
        totalValue: z.number().int().optional(),
        validUntil: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const proposal = await getProposal(input.id);
      if (proposal?.tenantId !== ctx.tenantId!) throw new Error("Forbidden");
      const { id, ...data } = input;
      await updateProposal(id, data);
      return await getProposal(id);
    }),

  delete: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const proposal = await getProposal(input.id);
      if (proposal?.tenantId !== ctx.tenantId!) throw new Error("Forbidden");
      await deleteProposal(input.id);
      return { success: true };
    }),

  addItem: tenantProcedure
    .input(
      z.object({
        proposalId: z.string(),
        serviceId: z.string(),
        serviceName: z.string(),
        quantity: z.number().int().min(1),
        unitPrice: z.number().int().min(0),
        subtotal: z.number().int().min(0),
        technicalHours: z.number().int().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      const proposal = await getProposal(input.proposalId);
      if (proposal?.tenantId !== ctx.tenantId!) throw new Error("Forbidden");
      return await createProposalItem(input);
    }),

  removeItem: tenantProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      await deleteProposalItem(input.itemId);
      return { success: true };
    }),
});

// ============================================================================
// PRICING CALCULATIONS ROUTER
// ============================================================================

export const pricingRouter = router({
  calculateTechnicalHour: protectedProcedure
    .input(
      z.object({
        monthlyFixedCost: z.number().int(),
        laborCost: z.number().int(),
        productiveHoursPerMonth: z.number().int(),
        taxRegime: z.enum(["MEI", "SN", "LP", "autonomous"]),
        taxRates: z.record(z.string(), z.number()).optional(),
        riskAdjustment: z.number().int().optional(),
        seniorityAdjustment: z.number().int().optional(),
      })
    )
    .query(({ input }) => {
      return calculateTechnicalHour(input as any);
    }),

  calculateProposal: protectedProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            quantity: z.number().int(),
            unitPrice: z.number().int(),
          })
        ),
        discountPercent: z.number().int().optional(),
        taxRegime: z.enum(["MEI", "SN", "LP", "autonomous"]),
        taxRates: z.record(z.string(), z.number()).optional(),
      })
    )
    .query(({ input }) => {
      return calculateProposal(input as any);
    }),
});

// ============================================================================
// ASSESSMENT PROPOSALS ROUTER (Vinculação)
// ============================================================================

export const assessmentProposalsRouter = router({
  link: protectedProcedure
    .input(
      z.object({
        assessmentId: z.string(),
        proposalId: z.string(),
        recommendedServices: z.array(z.any()).optional(),
        riskLevel: z.enum(["low", "medium", "high"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      return await createAssessmentProposal({
        tenantId: ctx.tenantId!,
        ...input,
      });
    }),

  getByAssessment: protectedProcedure
    .input(z.object({ assessmentId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new Error("Unauthorized");
      return await getAssessmentProposals(input.assessmentId);
    }),
});
