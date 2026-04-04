import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { tenantProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { complianceChecklist } from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

// NR-01 requirements — auto-seeded on first access per tenant
const NR01_REQUIREMENTS = [
  // GRO - Gerenciamento de Riscos
  { code: "NR01-1.5.3.1", text: "Inventário de riscos com fatores psicossociais identificados", category: "GRO - Gerenciamento de Riscos" },
  { code: "NR01-1.5.3.2", text: "Avaliação de riscos psicossociais com metodologia validada", category: "GRO - Gerenciamento de Riscos" },
  { code: "NR01-1.5.3.3", text: "Classificação de riscos por severidade e probabilidade", category: "GRO - Gerenciamento de Riscos" },
  { code: "NR01-1.5.4.1", text: "Plano de ação com medidas preventivas para riscos psicossociais", category: "GRO - Gerenciamento de Riscos" },
  { code: "NR01-1.5.4.2", text: "Hierarquia de controles aplicada (eliminação a EPI)", category: "GRO - Gerenciamento de Riscos" },
  { code: "NR01-1.5.4.3", text: "Responsáveis e prazos definidos para cada ação", category: "GRO - Gerenciamento de Riscos" },
  // Documentação
  { code: "NR01-1.5.7.1", text: "PGR atualizado com seção de riscos psicossociais", category: "Documentação" },
  { code: "NR01-1.5.7.2", text: "Laudo técnico assinado por profissional habilitado", category: "Documentação" },
  { code: "NR01-1.5.7.3", text: "Registro de treinamentos realizados", category: "Documentação" },
  { code: "NR01-1.5.7.4", text: "Atas de reunião de análise de riscos", category: "Documentação" },
  // PCMSO
  { code: "NR07-7.5.1", text: "PCMSO integrado com riscos psicossociais do PGR", category: "PCMSO" },
  { code: "NR07-7.5.2", text: "Exames complementares para saúde mental definidos", category: "PCMSO" },
  { code: "NR07-7.5.3", text: "Monitoramento periódico de saúde mental", category: "PCMSO" },
  // Participação dos Trabalhadores
  { code: "NR01-1.5.3.4", text: "Canal de escuta/denúncia anônima implementado", category: "Participação dos Trabalhadores" },
  { code: "NR01-1.5.3.5", text: "Pesquisa de clima organizacional realizada", category: "Participação dos Trabalhadores" },
  { code: "NR01-1.5.3.6", text: "COPSOQ-II ou instrumento validado aplicado", category: "Participação dos Trabalhadores" },
  { code: "NR01-1.5.3.7", text: "Feedback dos resultados comunicado aos trabalhadores", category: "Participação dos Trabalhadores" },
  // Treinamento
  { code: "NR01-1.5.5.1", text: "Treinamento de lideranças sobre riscos psicossociais", category: "Treinamento" },
  { code: "NR01-1.5.5.2", text: "Capacitação da CIPA em saúde mental", category: "Treinamento" },
  { code: "NR01-1.5.5.3", text: "Programa de prevenção ao assédio moral e sexual", category: "Treinamento" },
  // Monitoramento
  { code: "NR01-1.5.6.1", text: "Indicadores de saúde mental monitorados mensalmente", category: "Monitoramento" },
  { code: "NR01-1.5.6.2", text: "Reavaliação periódica dos riscos psicossociais", category: "Monitoramento" },
  { code: "NR01-1.5.6.3", text: "Acompanhamento de eficácia das ações implementadas", category: "Monitoramento" },
  // NR-17 Ergonomia
  { code: "NR17-17.1.1", text: "AEP realizada com fatores organizacionais", category: "NR-17 Ergonomia" },
  { code: "NR17-17.1.2", text: "AET quando requerida pela AEP", category: "NR-17 Ergonomia" },
];

async function ensureChecklistSeeded(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, tenantId: string) {
  const existing = await db
    .select({ id: complianceChecklist.id })
    .from(complianceChecklist)
    .where(eq(complianceChecklist.tenantId, tenantId))
    .limit(1);

  if (existing.length > 0) return;

  for (const req of NR01_REQUIREMENTS) {
    await db.insert(complianceChecklist).values({
      id: nanoid(),
      tenantId,
      requirementCode: req.code,
      requirementText: req.text,
      category: req.category,
      status: "non_compliant",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export const complianceChecklistRouter = router({
  // Listar itens do checklist (auto-seeds NR-01 requirements on first access)
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Auto-seed on first access
      await ensureChecklistSeeded(db, ctx.tenantId!);

      const conditions = [eq(complianceChecklist.tenantId, ctx.tenantId!)];

      if (input.category) {
        conditions.push(eq(complianceChecklist.category, input.category));
      }

      const items = await db
        .select()
        .from(complianceChecklist)
        .where(and(...conditions))
        .orderBy(complianceChecklist.requirementCode);

      return items;
    }),

  // Atualizar status de item do checklist
  updateStatus: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["compliant", "partial", "non_compliant", "not_applicable"]),
        notes: z.string().optional(),
        evidenceDocId: z.string().optional(),
        verifiedBy: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const updateData: any = {
        status: input.status,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      };

      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.evidenceDocId !== undefined) updateData.evidenceDocId = input.evidenceDocId;
      if (input.verifiedBy !== undefined) updateData.verifiedBy = input.verifiedBy;

      await db
        .update(complianceChecklist)
        .set(updateData)
        .where(and(eq(complianceChecklist.id, input.id), eq(complianceChecklist.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // Obter score de conformidade
  getComplianceScore: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Auto-seed on first access
      await ensureChecklistSeeded(db, ctx.tenantId!);

      const items = await db
        .select()
        .from(complianceChecklist)
        .where(eq(complianceChecklist.tenantId, ctx.tenantId!));

      const total = items.length;
      const compliant = items.filter((i) => i.status === "compliant").length;
      const partial = items.filter((i) => i.status === "partial").length;
      const nonCompliant = items.filter((i) => i.status === "non_compliant").length;
      const notApplicable = items.filter((i) => i.status === "not_applicable").length;

      const applicable = total - notApplicable;
      const scorePercent =
        applicable > 0
          ? Math.round(((compliant + partial * 0.5) / applicable) * 100)
          : 0;

      return { total, compliant, partial, nonCompliant, notApplicable, scorePercent };
    }),

  // Criar requisitos NR-01 padrão (mantido para admin manual)
  seedNr01Requirements: adminProcedure
    .input(z.object({ tenantId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await ensureChecklistSeeded(db, input.tenantId);
      return { seeded: true, count: NR01_REQUIREMENTS.length };
    }),

  // Exportar dados do checklist para geração de PDF
  exportPdf: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Auto-seed on first access
      await ensureChecklistSeeded(db, ctx.tenantId!);

      const items = await db
        .select()
        .from(complianceChecklist)
        .where(eq(complianceChecklist.tenantId, ctx.tenantId!))
        .orderBy(complianceChecklist.requirementCode);

      // Agrupar por categoria
      const grouped: Record<string, typeof items> = {};
      for (const item of items) {
        const cat = item.category;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      }

      const total = items.length;
      const compliant = items.filter((i) => i.status === "compliant").length;
      const notApplicable = items.filter((i) => i.status === "not_applicable").length;
      const applicable = total - notApplicable;
      const partial = items.filter((i) => i.status === "partial").length;
      const scorePercent =
        applicable > 0
          ? Math.round(((compliant + partial * 0.5) / applicable) * 100)
          : 0;

      return {
        generatedAt: new Date(),
        tenantId: ctx.tenantId!,
        summary: { total, compliant, partial, nonCompliant: total - compliant - partial - notApplicable, notApplicable, scorePercent },
        categories: grouped,
      };
    }),
});
