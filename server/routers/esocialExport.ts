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
import { tenants, consultantCertifications } from "../../drizzle/schema";
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

  // Gerar XML para eSocial (S-2210, S-2220, S-2240)
  generateXml: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        eventType: z.enum(["S-2210", "S-2220", "S-2240"]),
        riskAssessmentId: z.string(),
        // S-2210 specific fields
        accidentData: z.object({
          dtAcid: z.string().optional(),        // Data do acidente
          hrAcid: z.string().optional(),        // Hora do acidente
          tpAcid: z.string().optional(),        // Tipo de acidente
          localAcid: z.string().optional(),     // Local
          dscAcid: z.string().optional(),       // Descrição
          tpCat: z.string().optional(),         // Tipo CAT (1=inicial, 2=reabertura, 3=óbito)
          cpfTrab: z.string().optional(),       // CPF do trabalhador
          matricula: z.string().optional(),     // Matrícula
          codCID: z.string().optional(),        // CID-10
          lateralidade: z.string().optional(),  // Lateralidade
          codParteAting: z.string().optional(), // Parte do corpo atingida
          dtObito: z.string().optional(),       // Data do óbito (se aplicável)
        }).optional(),
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

      const cnpjClean = (tenant as any).cnpj?.replace(/[^\d]/g, "") || "00000000000000";
      const today = new Date().toISOString().split("T")[0];
      const evtId = `ID${cnpjClean}${Date.now()}`;

      let xmlContent: string;

      if (input.eventType === "S-2210") {
        // Gerar XML S-2210 (Comunicação de Acidente de Trabalho - CAT)
        const acc = input.accidentData || {};
        const dtAcid = acc.dtAcid || today;
        const hrAcid = acc.hrAcid || "08:00";
        const tpCat = acc.tpCat || "1"; // 1=Inicial
        const cpfTrab = acc.cpfTrab || "00000000000";
        const matricula = acc.matricula || "";

        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<eSocial xmlns="http://www.esocial.gov.br/schema/evt/evtCAT/v_S_01_02_00">
  <evtCAT Id="${escapeXml(evtId)}">
    <ideEvento>
      <indRetif>1</indRetif>
      <tpAmb>${process.env.ESOCIAL_ENV === "production" ? "1" : "2"}</tpAmb>
      <procEmi>1</procEmi>
      <verProc>1.0.0</verProc>
    </ideEvento>
    <ideEmpregador>
      <tpInsc>1</tpInsc>
      <nrInsc>${escapeXml(cnpjClean)}</nrInsc>
    </ideEmpregador>
    <ideVinculo>
      <cpfTrab>${escapeXml(cpfTrab)}</cpfTrab>
      <matricula>${escapeXml(matricula)}</matricula>
    </ideVinculo>
    <cat>
      <dtAcid>${escapeXml(dtAcid)}</dtAcid>
      <tpAcid>${escapeXml(acc.tpAcid || "1")}</tpAcid>
      <hrAcid>${escapeXml(hrAcid)}</hrAcid>
      <hrsTrabAntesAcid>0800</hrsTrabAntesAcid>
      <tpCat>${escapeXml(tpCat)}</tpCat>
      <indCatObito>${acc.dtObito ? "S" : "N"}</indCatObito>
${acc.dtObito ? `      <dtObito>${escapeXml(acc.dtObito)}</dtObito>` : ""}
      <indComunPolicia>N</indComunPolicia>
      <codSitGeradora>200000000</codSitGeradora>
      <iniciatCAT>1</iniciatCAT>
      <localAcidente>
        <tpLocal>${escapeXml(acc.localAcid || "1")}</tpLocal>
        <dscLocal>${escapeXml(acc.dscAcid || "Local de trabalho")}</dscLocal>
      </localAcidente>
      <parteAtingida>
        <codParteAting>${escapeXml(acc.codParteAting || "999990000")}</codParteAting>
        <lateralidade>${escapeXml(acc.lateralidade || "0")}</lateralidade>
      </parteAtingida>
      <agenteCausador>
        <codAgente>302010300</codAgente>
      </agenteCausador>
      <atestado>
        <codCID>${escapeXml(acc.codCID || "F43")}</codCID>
        <qtDiasAfast>0</qtDiasAfast>
      </atestado>
    </cat>
  </evtCAT>
</eSocial>`;
      } else if (input.eventType === "S-2240") {
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
      <tpAmb>${process.env.ESOCIAL_ENV === "production" ? "1" : "2"}</tpAmb>
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
      <tpAmb>${process.env.ESOCIAL_ENV === "production" ? "1" : "2"}</tpAmb>
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

      // Validação: verificar se o XML é bem formado e contém tags obrigatórias
      const xml = exportRecord.xmlContent;
      const isWellFormed =
        xml.startsWith("<?xml") &&
        xml.includes("<eSocial") &&
        xml.includes("</eSocial>");

      // Validar tags obrigatórias por tipo de evento
      let hasRequiredTags = false;
      if (exportRecord.eventType === "S-2210") {
        hasRequiredTags = xml.includes("<evtCAT") && xml.includes("<cat>") && xml.includes("<dtAcid>");
      } else if (exportRecord.eventType === "S-2220") {
        hasRequiredTags = xml.includes("<evtMonit") && xml.includes("<exMedOcup>") && xml.includes("<aso>");
      } else if (exportRecord.eventType === "S-2240") {
        hasRequiredTags = xml.includes("<evtExpRisco") && xml.includes("<infoExpRisco>");
      }

      if (!isWellFormed || !hasRequiredTags) {
        await db
          .update(esocialExports)
          .set({
            status: "rejected",
            responseMessage: !isWellFormed ? "XML mal formado" : "Tags obrigatórias ausentes para " + exportRecord.eventType,
            updatedAt: new Date(),
          })
          .where(and(eq(esocialExports.id, input.id), eq(esocialExports.tenantId, ctx.tenantId!)));

        return { valid: false, message: !isWellFormed ? "XML mal formado" : "Tags obrigatórias ausentes" };
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

  // Submeter evento ao eSocial via webservice
  submit: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Buscar exportação
      const [exportRecord] = await db
        .select()
        .from(esocialExports)
        .where(and(eq(esocialExports.id, input.id), eq(esocialExports.tenantId, ctx.tenantId!)));

      if (!exportRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Exportação não encontrada" });
      }

      if (exportRecord.status !== "validated") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `XML deve estar validado para envio. Status atual: ${exportRecord.status}`,
        });
      }

      // Buscar certificado A1 do tenant
      const [signingCert] = await db
        .select()
        .from(consultantCertifications)
        .where(
          and(
            eq(consultantCertifications.tenantId, ctx.tenantId!),
            eq(consultantCertifications.isSigningCert, true),
            eq(consultantCertifications.status, "active")
          )
        )
        .limit(1);

      if (!signingCert || !signingCert.certPassword) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Certificado A1 não configurado. Faça upload do certificado digital nas Configurações antes de enviar ao eSocial.",
        });
      }

      // Check certificate expiration
      if (signingCert.certValidTo && new Date() > signingCert.certValidTo) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Certificado A1 expirado. Faça upload de um certificado válido.",
        });
      }

      // Determine eSocial endpoint
      const isProduction = process.env.ESOCIAL_ENV === "production";
      const baseUrl = isProduction
        ? "https://webservices.producaorestrita.esocial.gov.br"
        : "https://webservices.producaorestrita.esocial.gov.br"; // Restrita (sandbox) for testing

      // Map event type to webservice operation
      const operationMap: Record<string, string> = {
        "S-2210": "EnviarLoteEventos",
        "S-2220": "EnviarLoteEventos",
        "S-2240": "EnviarLoteEventos",
      };

      const operation = operationMap[exportRecord.eventType] || "EnviarLoteEventos";

      // Build SOAP envelope with the signed XML
      const loteId = `LOTE_${Date.now()}`;
      const soapEnvelope = buildSoapEnvelope(
        exportRecord.xmlContent!,
        exportRecord.eventType,
        loteId,
        ctx.tenantId!
      );

      try {
        // Load certificate for TLS mutual auth
        const { decryptPassword } = await import("../certificationUploadRoutes");
        const { storageGet } = await import("../storage");
        const password = decryptPassword(signingCert.certPassword);

        let certBuffer: Buffer;
        const { url } = await storageGet(signingCert.fileKey);
        if (url.startsWith("/uploads/")) {
          const { readFileSync } = await import("fs");
          const { join } = await import("path");
          certBuffer = readFileSync(join(process.cwd(), url));
        } else {
          const response = await fetch(url);
          certBuffer = Buffer.from(await response.arrayBuffer());
        }

        // Use https agent with client certificate for mTLS
        const https = await import("https");
        const agent = new https.Agent({
          pfx: certBuffer,
          passphrase: password,
          rejectUnauthorized: !isProduction, // Accept self-signed in sandbox
        });

        // Submit via SOAP
        const submitUrl = `${baseUrl}/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc`;

        const submitResponse = await fetch(submitUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": `http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_0/${operation}`,
          },
          body: soapEnvelope,
          // @ts-expect-error - Node.js fetch supports agent option - Node.js fetch supports agent
          agent,
        });

        const responseText = await submitResponse.text();

        // Parse response
        const responseCode = extractXmlTag(responseText, "cdResposta") || submitResponse.status.toString();
        const responseMessage = extractXmlTag(responseText, "descResposta") || responseText.substring(0, 500);
        const protocolNumber = extractXmlTag(responseText, "nrRecibo") || extractXmlTag(responseText, "protocoloEnvio");

        const isAccepted = responseCode === "201" || responseCode === "202" || submitResponse.ok;

        await db
          .update(esocialExports)
          .set({
            status: isAccepted ? "submitted" : "rejected",
            submittedAt: new Date(),
            responseCode: protocolNumber || responseCode,
            responseMessage: responseMessage,
            updatedAt: new Date(),
          })
          .where(eq(esocialExports.id, input.id));

        return {
          success: isAccepted,
          responseCode,
          responseMessage,
          protocolNumber: protocolNumber || null,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);

        await db
          .update(esocialExports)
          .set({
            status: "rejected",
            submittedAt: new Date(),
            responseCode: "ERROR",
            responseMessage: `Falha na conexão com o webservice eSocial: ${errorMessage}`,
            updatedAt: new Date(),
          })
          .where(eq(esocialExports.id, input.id));

        return {
          success: false,
          responseCode: "ERROR",
          responseMessage: `Erro de conexão: ${errorMessage}. Verifique o certificado A1 e a conectividade com o servidor eSocial.`,
          protocolNumber: null,
        };
      }
    }),

  // Consultar resultado do processamento
  checkStatus: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [exportRecord] = await db
        .select()
        .from(esocialExports)
        .where(and(eq(esocialExports.id, input.id), eq(esocialExports.tenantId, ctx.tenantId!)));

      if (!exportRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Exportação não encontrada" });
      }

      if (exportRecord.status !== "submitted" || !exportRecord.responseCode) {
        return {
          status: exportRecord.status,
          message: "Evento não foi submetido ou não possui protocolo.",
        };
      }

      // Buscar certificado A1
      const [signingCert] = await db
        .select()
        .from(consultantCertifications)
        .where(
          and(
            eq(consultantCertifications.tenantId, ctx.tenantId!),
            eq(consultantCertifications.isSigningCert, true),
            eq(consultantCertifications.status, "active")
          )
        )
        .limit(1);

      if (!signingCert || !signingCert.certPassword) {
        return { status: exportRecord.status, message: "Certificado A1 não disponível para consulta." };
      }

      try {
        const { decryptPassword } = await import("../certificationUploadRoutes");
        const { storageGet } = await import("../storage");
        const password = decryptPassword(signingCert.certPassword);

        let certBuffer: Buffer;
        const { url } = await storageGet(signingCert.fileKey);
        if (url.startsWith("/uploads/")) {
          const { readFileSync } = await import("fs");
          const { join } = await import("path");
          certBuffer = readFileSync(join(process.cwd(), url));
        } else {
          const resp = await fetch(url);
          certBuffer = Buffer.from(await resp.arrayBuffer());
        }

        const https = await import("https");
        const agent = new https.Agent({ pfx: certBuffer, passphrase: password });

        const isProduction = process.env.ESOCIAL_ENV === "production";
        const consultUrl = isProduction
          ? "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/retornoeventos/WsConsultarLoteEventos.svc"
          : "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/retornoeventos/WsConsultarLoteEventos.svc";

        const consultSoap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:v1="http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/retornoProcessamento/v1_1_0">
  <soap:Body>
    <v1:ConsultarLoteEventos>
      <v1:consulta>
        <protocoloEnvio>${escapeXml(exportRecord.responseCode)}</protocoloEnvio>
      </v1:consulta>
    </v1:ConsultarLoteEventos>
  </soap:Body>
</soap:Envelope>`;

        const response = await fetch(consultUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/xml; charset=utf-8",
            "SOAPAction": "http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/consulta/retornoProcessamento/v1_1_0/ConsultarLoteEventos",
          },
          body: consultSoap,
          // @ts-expect-error - Node.js fetch supports agent option
          agent,
        });

        const responseText = await response.text();
        const cdResposta = extractXmlTag(responseText, "cdResposta");
        const descResposta = extractXmlTag(responseText, "descResposta") || responseText.substring(0, 500);

        const finalStatus = cdResposta === "201" ? "accepted" : cdResposta === "202" ? "submitted" : cdResposta ? "rejected" : exportRecord.status;

        await db
          .update(esocialExports)
          .set({
            status: finalStatus as any,
            responseMessage: descResposta,
            updatedAt: new Date(),
          })
          .where(eq(esocialExports.id, input.id));

        return {
          status: finalStatus,
          message: descResposta,
          responseCode: cdResposta,
        };
      } catch (err) {
        return {
          status: exportRecord.status,
          message: `Erro na consulta: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }),

  // Auto-detect when S-2240 should be generated
  // Checks if there are risk assessments with items that haven't been reported to eSocial yet
  checkPendingS2240: tenantProcedure
    .input(z.object({ tenantId: z.string().optional() }))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { pending: false, assessments: [] };

      // Find completed risk assessments
      const assessments = await db.select({
        id: riskAssessments.id,
        title: riskAssessments.title,
        status: riskAssessments.status,
        updatedAt: riskAssessments.updatedAt,
      })
        .from(riskAssessments)
        .where(and(
          eq(riskAssessments.tenantId, ctx.tenantId!),
          eq(riskAssessments.status, "completed"),
        ))
        .orderBy(desc(riskAssessments.updatedAt));

      if (assessments.length === 0) return { pending: false, assessments: [] };

      // Find existing S-2240 exports for this tenant
      const existingExports = await db.select({
        referenceId: esocialExports.referenceId,
        status: esocialExports.status,
      })
        .from(esocialExports)
        .where(and(
          eq(esocialExports.tenantId, ctx.tenantId!),
          eq(esocialExports.eventType, "S-2240"),
        ));

      const exportedIds = new Set(existingExports
        .filter(e => e.status !== "rejected")
        .map(e => e.referenceId));

      // Find assessments that have items but no S-2240 export
      const pendingAssessments = [];
      for (const assessment of assessments) {
        if (exportedIds.has(assessment.id)) continue;

        const [itemCount] = await db.select({ count: sql<number>`count(*)` })
          .from(riskAssessmentItems)
          .where(eq(riskAssessmentItems.assessmentId, assessment.id));

        if ((itemCount?.count ?? 0) > 0) {
          pendingAssessments.push({
            id: assessment.id,
            title: assessment.title,
            updatedAt: assessment.updatedAt,
          });
        }
      }

      return {
        pending: pendingAssessments.length > 0,
        assessments: pendingAssessments,
      };
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

// ── Helper functions ──────────────────────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractXmlTag(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function buildSoapEnvelope(
  xmlContent: string,
  eventType: string,
  loteId: string,
  tenantId: string
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:v1="http://www.esocial.gov.br/servicos/empregador/lote/eventos/envio/v1_1_0">
  <soap:Body>
    <v1:EnviarLoteEventos>
      <v1:loteEventos>
        <envioLoteEventos grupo="2">
          <ideEmpregador>
            <tpInsc>1</tpInsc>
            <nrInsc>${escapeXml(tenantId)}</nrInsc>
          </ideEmpregador>
          <ideTransmissor>
            <tpInsc>1</tpInsc>
            <nrInsc>${escapeXml(tenantId)}</nrInsc>
          </ideTransmissor>
          <eventos>
            <evento Id="${escapeXml(loteId)}">
              ${xmlContent}
            </evento>
          </eventos>
        </envioLoteEventos>
      </v1:loteEventos>
    </v1:EnviarLoteEventos>
  </soap:Body>
</soap:Envelope>`;
}
