import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { tenantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  esocialExports,
  riskAssessments,
  riskAssessmentItems,
} from "../../drizzle/schema_nr01";
import { tenants } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const esocialExportRouter = router({
  // Listar exportações eSocial
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const exports = await db
        .select()
        .from(esocialExports)
        .where(eq(esocialExports.tenantId, ctx.tenantId!))
        .orderBy(desc(esocialExports.createdAt));

      return exports;
    }),

  // Gerar XML para eSocial
  generateXml: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        eventType: z.enum(["S-2220", "S-2240"]),
        riskAssessmentId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Buscar dados do tenant (empresa)
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId!));

      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant não encontrado",
        });
      }

      // Buscar avaliação de risco
      const [assessment] = await db
        .select()
        .from(riskAssessments)
        .where(
          and(
            eq(riskAssessments.id, input.riskAssessmentId),
            eq(riskAssessments.tenantId, ctx.tenantId!)
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

      const cnpjClean = tenant.cnpj.replace(/[^\d]/g, "");
      const today = new Date().toISOString().split("T")[0];
      const evtId = `ID${cnpjClean}${Date.now()}`;

      let xmlContent: string;

      if (input.eventType === "S-2240") {
        // Gerar XML S-2240 (Condições Ambientais do Trabalho - Exposição a Fatores de Risco)
        const fatoresRisco = items
          .map(
            (item) =>
              `          <fator>
            <codFat>09.01.001</codFat>
            <worEnv>1</worEnv>
            <worPrc>1</worPrc>
            <worTec>1</worTec>
            <dscFat>${escapeXml(item.riskFactorId)}</dscFat>
            <tpAval>2</tpAval>
          </fator>`
          )
          .join("\n");

        const agNocEntries = items
          .map(
            (item) =>
              `          <agNoc>
            <codAgNoc>09.01.001</codAgNoc>
            <dscAgNoc>${escapeXml(item.riskFactorId)}</dscAgNoc>
            <tpAval>2</tpAval>
          </agNoc>`
          )
          .join("\n");

        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtExpRisco/v_S_01_02_00">
  <evtExpRisco Id="${escapeXml(evtId)}">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${escapeXml(cnpjClean)}</nrInsc>
    </ideEmpregador>
    <ideVinculo>
      <cpfTrab>00000000000</cpfTrab>
      <matricula></matricula>
    </ideVinculo>
    <infoExpRisco>
      <dtIniCondicao>${today}</dtIniCondicao>
      <infoAmb>
        <codAmb>PSICOSSOCIAL</codAmb>
        <dscSetor>${escapeXml(tenant.name)}</dscSetor>
${fatoresRisco}
      </infoAmb>
${agNocEntries}
    </infoExpRisco>
  </evtExpRisco>
</eSocial>`;
      } else {
        // Gerar XML S-2220 (Monitoramento da Saúde do Trabalhador)
        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtMonit/v_S_01_02_00">
  <evtMonit Id="${escapeXml(evtId)}">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>2</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${escapeXml(cnpjClean)}</nrInsc>
    </ideEmpregador>
    <ideVinculo>
      <cpfTrab>00000000000</cpfTrab>
      <matricula></matricula>
    </ideVinculo>
    <exMedOcup>
      <tpExameOcup>0</tpExameOcup>
      <aso>
        <dtAso>${today}</dtAso>
        <resAso>1</resAso>
        <exame>
          <dtExm>${today}</dtExm>
          <procRealizado>0824</procRealizado>
          <obsProc>Avaliacao psicossocial COPSOQ-II - riscos psicossociais NR-01</obsProc>
        </exame>
        <medico>
          <nmMed>MEDICO RESPONSAVEL</nmMed>
          <nrCRM>000000</nrCRM>
          <ufCRM>SP</ufCRM>
        </medico>
      </aso>
    </exMedOcup>
  </evtMonit>
</eSocial>`;
      }

      // Salvar no banco
      const id = nanoid();

      await db.insert(esocialExports).values({
        id,
        tenantId: ctx.tenantId!,
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
  validate: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [exportRecord] = await db
        .select()
        .from(esocialExports)
        .where(and(eq(esocialExports.id, input.id), eq(esocialExports.tenantId, ctx.tenantId!)));

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
          .where(and(eq(esocialExports.id, input.id), eq(esocialExports.tenantId, ctx.tenantId!)));

        return { valid: false, message: "XML mal formado" };
      }

      await db
        .update(esocialExports)
        .set({
          status: "validated",
          updatedAt: new Date(),
        })
        .where(and(eq(esocialExports.id, input.id), eq(esocialExports.tenantId, ctx.tenantId!)));

      return { valid: true, message: "XML validado com sucesso" };
    }),

  // Download do XML
  download: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [exportRecord] = await db
        .select()
        .from(esocialExports)
        .where(and(eq(esocialExports.id, input.id), eq(esocialExports.tenantId, ctx.tenantId!)));

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
