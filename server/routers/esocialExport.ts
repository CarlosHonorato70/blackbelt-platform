import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "../_core/trpc";
import { requireActiveSubscription } from "../_core/subscriptionMiddleware";
import { getDb } from "../db";
import {
  esocialExports,
  riskAssessments,
  riskAssessmentItems,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

export const esocialExportRouter = router({
  // Listar exportações eSocial
  list: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const exports = await db
        .select()
        .from(esocialExports)
        .where(eq(esocialExports.tenantId, input.tenantId))
        .orderBy(desc(esocialExports.createdAt));

      return exports;
    }),

  // Gerar XML para eSocial
  generateXml: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        eventType: z.enum(["S-2220", "S-2240"]),
        riskAssessmentId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await requireActiveSubscription(input.tenantId);
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Buscar avaliação de risco
      const [assessment] = await db
        .select()
        .from(riskAssessments)
        .where(
          and(
            eq(riskAssessments.id, input.riskAssessmentId),
            eq(riskAssessments.tenantId, input.tenantId)
          )
        );

      if (!assessment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Avaliação de risco não encontrada",
        });
      }

      // Buscar itens da avaliação
      const items = await db
        .select()
        .from(riskAssessmentItems)
        .where(eq(riskAssessmentItems.assessmentId, input.riskAssessmentId));

      let xmlContent: string;

      if (input.eventType === "S-2240") {
        // Gerar XML S-2240 (Exposição a Riscos)
        const agNocEntries = items
          .map(
            (item) =>
              `        <agNoc><codAgNoc>PSICOSSOCIAL</codAgNoc><dscAgNoc>${escapeXml(item.riskFactorId)}</dscAgNoc><tpAval>2</tpAval></agNoc>`
          )
          .join("\n");

        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_02_00">
  <evtExpRisco>
    <ideEvento><tpAmb>2</tpAmb></ideEvento>
    <ideEmpregador><nrInsc>${input.tenantId}</nrInsc></ideEmpregador>
    <infoExpRisco>
${agNocEntries}
    </infoExpRisco>
  </evtExpRisco>
</eSocial>`;
      } else {
        // Gerar XML S-2220 (Monitoramento da Saúde)
        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_02_00">
  <evtMonit>
    <ideEvento><tpAmb>2</tpAmb></ideEvento>
    <ideEmpregador><nrInsc>${input.tenantId}</nrInsc></ideEmpregador>
    <exMedOcup>
      <tpExameOcup>0</tpExameOcup>
      <aso>
        <dtAso>${new Date().toISOString().split("T")[0]}</dtAso>
        <resAso>1</resAso>
      </aso>
    </exMedOcup>
  </evtMonit>
</eSocial>`;
      }

      // Salvar no banco
      const id = nanoid();

      await db.insert(esocialExports).values({
        id,
        tenantId: input.tenantId,
        eventType: input.eventType,
        referenceId: input.riskAssessmentId,
        xmlContent,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        id,
        xmlPreview: xmlContent.substring(0, 500),
      };
    }),

  // Validar XML
  validate: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [exportRecord] = await db
        .select()
        .from(esocialExports)
        .where(eq(esocialExports.id, input.id));

      if (!exportRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Exportação não encontrada",
        });
      }

      if (!exportRecord.xmlContent) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "XML vazio",
        });
      }

      // Validação básica: verificar se o XML é bem formado
      const xml = exportRecord.xmlContent;
      const isWellFormed =
        xml.startsWith("<?xml") &&
        xml.includes("<eSocial") &&
        xml.includes("</eSocial>");

      if (!isWellFormed) {
        await db
          .update(esocialExports)
          .set({
            status: "rejected",
            responseMessage: "XML mal formado",
            updatedAt: new Date(),
          })
          .where(eq(esocialExports.id, input.id));

        return { valid: false, message: "XML mal formado" };
      }

      await db
        .update(esocialExports)
        .set({
          status: "validated",
          updatedAt: new Date(),
        })
        .where(eq(esocialExports.id, input.id));

      return { valid: true, message: "XML validado com sucesso" };
    }),

  // Download do XML
  download: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [exportRecord] = await db
        .select()
        .from(esocialExports)
        .where(eq(esocialExports.id, input.id));

      if (!exportRecord) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Exportação não encontrada",
        });
      }

      return {
        xmlContent: exportRecord.xmlContent,
        eventType: exportRecord.eventType,
        status: exportRecord.status,
      };
    }),
});

// Função auxiliar para escapar caracteres especiais em XML
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
