import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  clients,
  services,
  pricingParameters,
  proposals,
  proposalItems,
} from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const pricingRouter = router({
  // ============================================================================
  // CLIENTES
  // ============================================================================

  clients: router({
    list: publicProcedure
      .input(
        z.object({
          tenantId: z.string(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const clientsList = await db
          .select()
          .from(clients)
          .where(eq(clients.tenantId, input.tenantId))
          .orderBy(desc(clients.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return clientsList;
      }),

    get: publicProcedure
      .input(
        z.object({
          id: z.string(),
          tenantId: z.string(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [client] = await db
          .select()
          .from(clients)
          .where(
            and(eq(clients.id, input.id), eq(clients.tenantId, input.tenantId))
          );

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        return client;
      }),

    create: publicProcedure
      .input(
        z.object({
          tenantId: z.string(),
          name: z.string(),
          cnpj: z.string().optional(),
          industry: z.string().optional(),
          companySize: z.string().optional(),
          contactName: z.string().optional(),
          contactEmail: z.string().optional(),
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
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const id = nanoid();

        await db.insert(clients).values({
          id,
          tenantId: input.tenantId,
          name: input.name,
          cnpj: input.cnpj || null,
          industry: input.industry || null,
          companySize: input.companySize || null,
          contactName: input.contactName || null,
          contactEmail: input.contactEmail || null,
          contactPhone: input.contactPhone || null,
          street: input.street || null,
          number: input.number || null,
          complement: input.complement || null,
          neighborhood: input.neighborhood || null,
          city: input.city || null,
          state: input.state || null,
          zipCode: input.zipCode || null,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { id };
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.string(),
          tenantId: z.string(),
        }).passthrough()
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const { id, tenantId, ...updates } = input;

        await db
          .update(clients)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(and(eq(clients.id, id), eq(clients.tenantId, tenantId)));

        return { success: true };
      }),

    delete: publicProcedure
      .input(
        z.object({
          id: z.string(),
          tenantId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        await db
          .delete(clients)
          .where(
            and(eq(clients.id, input.id), eq(clients.tenantId, input.tenantId))
          );

        return { success: true };
      }),
  }),

  // ============================================================================
  // SERVIÇOS
  // ============================================================================

  services: router({
    list: publicProcedure
      .input(
        z.object({
          tenantId: z.string(),
          category: z.string().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions = [eq(services.tenantId, input.tenantId)];

        if (input.category) {
          conditions.push(eq(services.category, input.category));
        }

        const servicesList = await db
          .select()
          .from(services)
          .where(and(...conditions))
          .orderBy(desc(services.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return servicesList;
      }),

    get: publicProcedure
      .input(
        z.object({
          id: z.string(),
          tenantId: z.string(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [service] = await db
          .select()
          .from(services)
          .where(
            and(
              eq(services.id, input.id),
              eq(services.tenantId, input.tenantId)
            )
          );

        if (!service) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Service not found",
          });
        }

        return service;
      }),

    create: publicProcedure
      .input(
        z.object({
          tenantId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          category: z.string(),
          unit: z.string(),
          minPrice: z.number(),
          maxPrice: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const id = nanoid();

        await db.insert(services).values({
          id,
          tenantId: input.tenantId,
          name: input.name,
          description: input.description || null,
          category: input.category,
          unit: input.unit,
          minPrice: input.minPrice,
          maxPrice: input.maxPrice,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return { id };
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.string(),
          tenantId: z.string(),
        }).passthrough()
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const { id, tenantId, ...updates } = input;

        await db
          .update(services)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(and(eq(services.id, id), eq(services.tenantId, tenantId)));

        return { success: true };
      }),

    delete: publicProcedure
      .input(
        z.object({
          id: z.string(),
          tenantId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        await db
          .delete(services)
          .where(
            and(
              eq(services.id, input.id),
              eq(services.tenantId, input.tenantId)
            )
          );

        return { success: true };
      }),
  }),

  // ============================================================================
  // PARÂMETROS DE PRECIFICAÇÃO
  // ============================================================================

  parameters: router({
    get: publicProcedure
      .input(
        z.object({
          tenantId: z.string(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const [params] = await db
          .select()
          .from(pricingParameters)
          .where(eq(pricingParameters.tenantId, input.tenantId));

        return params || null;
      }),

    upsert: publicProcedure
      .input(
        z.object({
          tenantId: z.string(),
          monthlyFixedCost: z.number(),
          laborCost: z.number(),
          productiveHoursPerMonth: z.number(),
          defaultTaxRegime: z.string(),
          volumeDiscounts: z.any().optional(),
          riskAdjustment: z.number(),
          seniorityAdjustment: z.any(),
          taxRates: z.any().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const existing = await db
          .select()
          .from(pricingParameters)
          .where(eq(pricingParameters.tenantId, input.tenantId));

        if (existing.length > 0) {
          // Update
          await db
            .update(pricingParameters)
            .set({
              monthlyFixedCost: input.monthlyFixedCost,
              laborCost: input.laborCost,
              productiveHoursPerMonth: input.productiveHoursPerMonth,
              defaultTaxRegime: input.defaultTaxRegime,
              volumeDiscounts: input.volumeDiscounts || null,
              riskAdjustment: input.riskAdjustment,
              seniorityAdjustment: input.seniorityAdjustment,
              taxRates: input.taxRates || null,
              updatedAt: new Date(),
            })
            .where(eq(pricingParameters.tenantId, input.tenantId));
        } else {
          // Insert
          const id = nanoid();
          await db.insert(pricingParameters).values({
            id,
            tenantId: input.tenantId,
            monthlyFixedCost: input.monthlyFixedCost,
            laborCost: input.laborCost,
            productiveHoursPerMonth: input.productiveHoursPerMonth,
            defaultTaxRegime: input.defaultTaxRegime,
            volumeDiscounts: input.volumeDiscounts || null,
            riskAdjustment: input.riskAdjustment,
            seniorityAdjustment: input.seniorityAdjustment,
            taxRates: input.taxRates || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        return { success: true };
      }),
  }),

  // ============================================================================
  // PROPOSTAS
  // ============================================================================

  proposals: router({
    list: publicProcedure
      .input(
        z.object({
          tenantId: z.string(),
          clientId: z.string().optional(),
          status: z.string().optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        const conditions = [eq(proposals.tenantId, input.tenantId)];

        if (input.clientId) {
          conditions.push(eq(proposals.clientId, input.clientId));
        }

        if (input.status) {
          conditions.push(eq(proposals.status, input.status));
        }

        const proposalsList = await db
          .select()
          .from(proposals)
          .where(and(...conditions))
          .orderBy(desc(proposals.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        return proposalsList;
      }),

    get: publicProcedure
      .input(
        z.object({
          id: z.string(),
          tenantId: z.string(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [proposal] = await db
          .select()
          .from(proposals)
          .where(
            and(
              eq(proposals.id, input.id),
              eq(proposals.tenantId, input.tenantId)
            )
          );

        if (!proposal) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Proposal not found",
          });
        }

        // Buscar itens da proposta
        const items = await db
          .select()
          .from(proposalItems)
          .where(eq(proposalItems.proposalId, input.id));

        return {
          ...proposal,
          items,
        };
      }),

    create: publicProcedure
      .input(
        z.object({
          tenantId: z.string(),
          clientId: z.string(),
          title: z.string(),
          description: z.string().optional(),
          taxRegime: z.enum(["MEI", "SN", "LP", "autonomous"]),
          validUntil: z.date().optional(),
          items: z.array(
            z.object({
              serviceId: z.string(),
              serviceName: z.string(),
              quantity: z.number(),
              unitPrice: z.number(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const id = nanoid();

        // Calcular subtotal
        const subtotal = input.items.reduce((sum, item) => {
          return sum + item.quantity * item.unitPrice;
        }, 0);

        // Calcular impostos (simplificado - 8% para SN)
        const taxRates = {
          MEI: 0.05,
          SN: 0.08,
          LP: 0.15,
          autonomous: 0.2,
        };
        const taxRate = taxRates[input.taxRegime];
        const taxes = Math.round(subtotal * taxRate);

        const totalValue = subtotal + taxes;

        // Criar proposta
        await db.insert(proposals).values({
          id,
          tenantId: input.tenantId,
          clientId: input.clientId,
          title: input.title,
          description: input.description || null,
          status: "draft",
          subtotal,
          discount: 0,
          discountPercent: 0,
          taxes,
          totalValue,
          taxRegime: input.taxRegime,
          validUntil: input.validUntil || null,
          generatedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Criar itens da proposta
        for (const item of input.items) {
          const itemId = nanoid();
          const itemSubtotal = item.quantity * item.unitPrice;

          await db.insert(proposalItems).values({
            id: itemId,
            proposalId: id,
            serviceId: item.serviceId,
            serviceName: item.serviceName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: itemSubtotal,
            createdAt: new Date(),
          });
        }

        return { id };
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.string(),
          tenantId: z.string(),
        }).passthrough()
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const { id, tenantId, ...updates } = input;

        await db
          .update(proposals)
          .set({
            ...updates,
            updatedAt: new Date(),
          })
          .where(and(eq(proposals.id, id), eq(proposals.tenantId, tenantId)));

        return { success: true };
      }),

    delete: publicProcedure
      .input(
        z.object({
          id: z.string(),
          tenantId: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        // Deletar itens primeiro
        await db
          .delete(proposalItems)
          .where(eq(proposalItems.proposalId, input.id));

        // Deletar proposta
        await db
          .delete(proposals)
          .where(
            and(
              eq(proposals.id, input.id),
              eq(proposals.tenantId, input.tenantId)
            )
          );

        return { success: true };
      }),
  }),

  // ============================================================================
  // CÁLCULOS
  // ============================================================================

  calculate: router({
    servicePrice: publicProcedure
      .input(
        z.object({
          tenantId: z.string(),
        }).passthrough()
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database not available",
          });

        const [params] = await db
          .select()
          .from(pricingParameters)
          .where(eq(pricingParameters.tenantId, input.tenantId));

        if (!params) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Pricing parameters not configured",
          });
        }

        const { monthlyFixedCost, laborCost, productiveHoursPerMonth } = params;

        // Cálculo simplificado da hora técnica
        const baseCost =
          (monthlyFixedCost + laborCost) / productiveHoursPerMonth;

        // Aplicar margem de lucro e impostos
        const taxRates = {
          MEI: 1.3, // 30% margem
          SN: 1.4, // 40% margem
          LP: 1.5, // 50% margem
          autonomous: 1.35, // 35% margem
        };

        const multiplier = taxRates[input.taxRegime];
        const technicalHour = Math.round(baseCost * multiplier);

        return {
          technicalHour,
          baseCost: Math.round(baseCost),
          taxRegime: input.taxRegime,
        };
      }),
  }),
});
