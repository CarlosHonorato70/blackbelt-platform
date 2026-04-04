/**
 * Router: Gerenciamento de Empresas (por Consultor)
 *
 * Consultores criam e gerenciam empresas clientes.
 * Empresas são tenants com parentTenantId = tenantId do consultor.
 */

import { z } from "zod";
import { eq, and, like, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { router } from "../_core/trpc";
import { consultantProcedure } from "../_core/trpc";
import { tenantProcedure } from "../_core/trpc";
import { tenants } from "../../drizzle/schema";
import { complianceChecklist, complianceMilestones } from "../../drizzle/schema_nr01";
import * as db from "../db";
import { getSubscriptionContext } from "../_core/subscriptionMiddleware";

// Validação de CNPJ
function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  const calc = (digits: string, factors: number[]) => {
    let sum = 0;
    for (let i = 0; i < factors.length; i++) {
      sum += parseInt(digits[i]) * factors[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const f1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const f2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const d1 = calc(cleaned, f1);
  const d2 = calc(cleaned, f2);

  return parseInt(cleaned[12]) === d1 && parseInt(cleaned[13]) === d2;
}

const companyInput = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  zipCode: z.string().optional(),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export const companiesRouter = router({
  // Listar empresas do consultor
  // Usa tenantProcedure (não consultantProcedure) para funcionar durante impersonação
  list: tenantProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["active", "inactive", "suspended"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Usar tenant original (antes de impersonação) para buscar empresas filhas
      const consultantTenantId = (ctx as any).originalTenantId || ctx.tenantId;

      // Verificar que o tenant original é do tipo consultant (admin bypassa)
      if (ctx.user.role !== "admin") {
        const consultantTenant = await db.getTenant(consultantTenantId);
        if (!consultantTenant || consultantTenant.tenantType !== "consultant") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Esta ação é permitida apenas para consultores/consultorias",
          });
        }
      }

      const filters: any[] = [
        eq(tenants.parentTenantId, consultantTenantId),
        eq(tenants.tenantType, "company"),
      ];

      if (input?.status) {
        filters.push(eq(tenants.status, input.status));
      }
      if (input?.search) {
        filters.push(
          like(tenants.name, `%${input.search}%`)
        );
      }

      const [companies, countResult] = await Promise.all([
        database
          .select()
          .from(tenants)
          .where(and(...filters))
          .limit(input?.limit ?? 50)
          .offset(input?.offset ?? 0),
        database
          .select({ count: sql<number>`count(*)` })
          .from(tenants)
          .where(and(...filters)),
      ]);

      return {
        companies,
        total: countResult[0]?.count ?? 0,
      };
    }),

  // Obter detalhes de uma empresa
  get: consultantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      const [company] = await database
        .select()
        .from(tenants)
        .where(
          and(
            eq(tenants.id, input.id),
            eq(tenants.parentTenantId, ctx.tenantId),
            eq(tenants.tenantType, "company")
          )
        )
        .limit(1);

      if (!company) {
        throw new Error("Empresa não encontrada");
      }

      return company;
    }),

  // Criar empresa vinculada ao consultor
  create: consultantProcedure
    .input(companyInput)
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Verificar limite de empresas do plano
      const subCtx = await getSubscriptionContext(ctx.tenantId);
      if (subCtx && subCtx.isActive) {
        const maxTenants = subCtx.plan.maxTenants;
        if (maxTenants > 0) {
          const [countResult] = await database
            .select({ count: sql<number>`count(*)` })
            .from(tenants)
            .where(
              and(
                eq(tenants.parentTenantId, ctx.tenantId),
                eq(tenants.tenantType, "company")
              )
            );
          const currentCount = countResult?.count ?? 0;
          if (currentCount >= maxTenants) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `Limite de ${maxTenants} empresa(s) atingido no seu plano. Faça upgrade para adicionar mais empresas.`,
            });
          }
        }
      }

      // Validar CNPJ
      const cleanCnpj = input.cnpj.replace(/\D/g, "");
      // Formatar CNPJ
      const formattedCnpj = cleanCnpj.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
      );

      // Verificar se CNPJ já existe
      const existing = await db.getTenantByCNPJ(formattedCnpj);
      if (existing) {
        throw new Error("Já existe uma empresa com este CNPJ");
      }

      const companyId = nanoid();
      await database.insert(tenants).values({
        id: companyId,
        name: input.name,
        cnpj: formattedCnpj,
        street: input.street,
        number: input.number,
        complement: input.complement,
        neighborhood: input.neighborhood,
        city: input.city,
        state: input.state,
        zipCode: input.zipCode,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        status: "active",
        strategy: "shared_rls",
        tenantType: "company",
        parentTenantId: ctx.tenantId,
      });

      // Audit log
      try {
        await db.createAuditLog({
          tenantId: ctx.tenantId,
          userId: ctx.user!.id,
          action: "CREATE",
          entityType: "company",
          entityId: companyId,
          oldValues: null,
          newValues: { name: input.name, cnpj: formattedCnpj },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        });
      } catch (_) {}

      // Auto-seed: Checklist NR-01 (23 requisitos) + Cronograma (11 milestones)
      try {
        const nr01Requirements = [
          { code: "NR01-1.5.3.1", text: "Inventário de riscos com fatores psicossociais identificados", category: "GRO - Gerenciamento de Riscos" },
          { code: "NR01-1.5.3.2", text: "Avaliação de riscos psicossociais com metodologia validada", category: "GRO - Gerenciamento de Riscos" },
          { code: "NR01-1.5.3.3", text: "Classificação de riscos por severidade e probabilidade", category: "GRO - Gerenciamento de Riscos" },
          { code: "NR01-1.5.4.1", text: "Plano de ação com medidas preventivas para riscos psicossociais", category: "GRO - Gerenciamento de Riscos" },
          { code: "NR01-1.5.4.2", text: "Hierarquia de controles aplicada (eliminação a EPI)", category: "GRO - Gerenciamento de Riscos" },
          { code: "NR01-1.5.4.3", text: "Responsáveis e prazos definidos para cada ação", category: "GRO - Gerenciamento de Riscos" },
          { code: "NR01-1.5.7.1", text: "PGR atualizado com seção de riscos psicossociais", category: "Documentação" },
          { code: "NR01-1.5.7.2", text: "Laudo técnico assinado por profissional habilitado", category: "Documentação" },
          { code: "NR01-1.5.7.3", text: "Registro de treinamentos realizados", category: "Documentação" },
          { code: "NR01-1.5.7.4", text: "Atas de reunião de análise de riscos", category: "Documentação" },
          { code: "NR07-7.5.1", text: "PCMSO integrado com riscos psicossociais do PGR", category: "PCMSO" },
          { code: "NR07-7.5.2", text: "Exames complementares para saúde mental definidos", category: "PCMSO" },
          { code: "NR07-7.5.3", text: "Monitoramento periódico de saúde mental", category: "PCMSO" },
          { code: "NR01-1.5.3.4", text: "Canal de escuta/denúncia anônima implementado", category: "Participação dos Trabalhadores" },
          { code: "NR01-1.5.3.5", text: "Pesquisa de clima organizacional realizada", category: "Participação dos Trabalhadores" },
          { code: "NR01-1.5.3.6", text: "COPSOQ-II ou instrumento validado aplicado", category: "Participação dos Trabalhadores" },
          { code: "NR01-1.5.3.7", text: "Feedback dos resultados comunicado aos trabalhadores", category: "Participação dos Trabalhadores" },
          { code: "NR01-1.5.5.1", text: "Treinamento de lideranças sobre riscos psicossociais", category: "Treinamento" },
          { code: "NR01-1.5.5.2", text: "Capacitação da CIPA em saúde mental", category: "Treinamento" },
          { code: "NR01-1.5.5.3", text: "Programa de prevenção ao assédio moral e sexual", category: "Treinamento" },
          { code: "NR01-1.5.6.1", text: "Indicadores de saúde mental monitorados mensalmente", category: "Monitoramento" },
          { code: "NR01-1.5.6.2", text: "Reavaliação periódica dos riscos psicossociais", category: "Monitoramento" },
          { code: "NR01-1.5.6.3", text: "Acompanhamento de eficácia das ações implementadas", category: "Monitoramento" },
          { code: "NR17-17.1.1", text: "AEP realizada com fatores organizacionais", category: "NR-17 Ergonomia" },
          { code: "NR17-17.1.2", text: "AET quando requerida pela AEP", category: "NR-17 Ergonomia" },
        ];

        for (const req of nr01Requirements) {
          await database.insert(complianceChecklist).values({
            id: nanoid(),
            tenantId: companyId,
            requirementCode: req.code,
            requirementText: req.text,
            category: req.category,
            status: "non_compliant",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }

        const addDays = (days: number) => {
          const d = new Date();
          d.setDate(d.getDate() + days);
          return d;
        };
        const milestones = [
          { title: "Capacitação da equipe SST", category: "training", targetDate: addDays(30), order: 1 },
          { title: "Definição de metodologia", category: "assessment", targetDate: addDays(45), order: 2 },
          { title: "Aplicação COPSOQ-II", category: "assessment", targetDate: addDays(75), order: 3 },
          { title: "Análise e relatório", category: "inventory", targetDate: addDays(90), order: 4 },
          { title: "Elaboração do PGR psicossocial", category: "documentation", targetDate: addDays(105), order: 5 },
          { title: "Plano de ação preventivo", category: "action_plan", targetDate: addDays(120), order: 6 },
          { title: "Implementação das ações", category: "action_plan", targetDate: addDays(180), order: 7 },
          { title: "Integração PGR+PCMSO", category: "documentation", targetDate: addDays(150), order: 8 },
          { title: "Treinamento de lideranças", category: "training", targetDate: addDays(135), order: 9 },
          { title: "Revisão e auditoria", category: "review", targetDate: addDays(210), order: 10 },
          { title: "Adequação completa NR-01", category: "review", targetDate: new Date("2026-05-26"), order: 11 },
        ];

        for (const m of milestones) {
          await database.insert(complianceMilestones).values({
            id: nanoid(),
            tenantId: companyId,
            title: m.title,
            category: m.category as "assessment" | "inventory" | "action_plan" | "training" | "documentation" | "review",
            targetDate: m.targetDate,
            status: "pending",
            order: m.order,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (e) {
        console.error("Audit log failed:", e);
      }

      return { id: companyId, name: input.name };
    }),

  // Atualizar empresa
  update: consultantProcedure
    .input(
      z.object({
        id: z.string(),
      }).merge(companyInput.partial())
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Verificar que a empresa pertence ao consultor
      const [company] = await database
        .select()
        .from(tenants)
        .where(
          and(
            eq(tenants.id, input.id),
            eq(tenants.parentTenantId, ctx.tenantId),
            eq(tenants.tenantType, "company")
          )
        )
        .limit(1);

      if (!company) {
        throw new Error("Empresa não encontrada");
      }

      const { id, ...updateData } = input;
      const updateValues: Record<string, any> = { updatedAt: new Date() };

      if (updateData.name) updateValues.name = updateData.name;
      if (updateData.cnpj) {
        const cleanCnpj = updateData.cnpj.replace(/\D/g, "");
        updateValues.cnpj = cleanCnpj.replace(
          /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
          "$1.$2.$3/$4-$5"
        );
      }
      if (updateData.street !== undefined) updateValues.street = updateData.street;
      if (updateData.number !== undefined) updateValues.number = updateData.number;
      if (updateData.complement !== undefined) updateValues.complement = updateData.complement;
      if (updateData.neighborhood !== undefined) updateValues.neighborhood = updateData.neighborhood;
      if (updateData.city !== undefined) updateValues.city = updateData.city;
      if (updateData.state !== undefined) updateValues.state = updateData.state;
      if (updateData.zipCode !== undefined) updateValues.zipCode = updateData.zipCode;
      if (updateData.contactName !== undefined) updateValues.contactName = updateData.contactName;
      if (updateData.contactEmail !== undefined) updateValues.contactEmail = updateData.contactEmail;
      if (updateData.contactPhone !== undefined) updateValues.contactPhone = updateData.contactPhone;

      await database
        .update(tenants)
        .set(updateValues)
        .where(eq(tenants.id, id));

      // Audit log
      try {
        await db.createAuditLog({
          tenantId: ctx.tenantId,
          userId: ctx.user!.id,
          action: "UPDATE",
          entityType: "company",
          entityId: id,
          oldValues: { name: company.name },
          newValues: updateValues,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        });
      } catch (e) { console.error("Audit log failed:", e) }

      return { success: true };
    }),

  // Excluir empresa
  delete: consultantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) throw new Error("Database not available");

      // Verificar que a empresa pertence ao consultor
      const [company] = await database
        .select()
        .from(tenants)
        .where(
          and(
            eq(tenants.id, input.id),
            eq(tenants.parentTenantId, ctx.tenantId),
            eq(tenants.tenantType, "company")
          )
        )
        .limit(1);

      if (!company) {
        throw new Error("Empresa não encontrada");
      }

      // Usar o cascade delete existente
      await db.deleteTenant(input.id);

      // Audit log
      try {
        await db.createAuditLog({
          tenantId: ctx.tenantId,
          userId: ctx.user!.id,
          action: "DELETE",
          entityType: "company",
          entityId: input.id,
          oldValues: { name: company.name, cnpj: company.cnpj },
          newValues: null,
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers["user-agent"],
        });
      } catch (e) { console.error("Audit log failed:", e) }

      return { success: true };
    }),

  // Consultor obtém informações do próprio tenant (para saber tipo)
  // Usa originalTenantId para não retornar dados do tenant impersonado
  getMyTenantInfo: tenantProcedure.query(async ({ ctx }) => {
    const realTenantId = (ctx as any).originalTenantId || ctx.tenantId;
    const tenant = await db.getTenant(realTenantId);
    if (!tenant) throw new Error("Tenant não encontrado");
    return {
      id: tenant.id,
      name: tenant.name,
      tenantType: tenant.tenantType,
      parentTenantId: tenant.parentTenantId,
    };
  }),
});
