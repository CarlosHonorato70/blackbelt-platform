import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { subscribedProcedure, publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import {
  dsrRequests,
  copsoqResponses,
  copsoqInvites,
  surveyResponses,
  surveyInvites,
  anonymousReports,
  trainingProgress,
  individualSessions,
} from "../../drizzle/schema_nr01";
import { users, people } from "../../drizzle/schema";
import { log } from "../_core/logger";

export const dataExportRouter = router({
  // ============================================================
  // Endpoint PUBLICO para nao-usuarios enviarem solicitacoes LGPD
  // ============================================================
  publicDsr: publicProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        email: z.string().email("Email invalido"),
        requestType: z.enum(["export", "delete", "rectify"]),
        reason: z.string().min(10, "Descreva o motivo com pelo menos 10 caracteres"),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const id = `dsr_${Date.now()}_${nanoid(8)}`;

      await db.insert(dsrRequests).values({
        id,
        tenantId: "__public__",
        email: input.email,
        requestType: input.requestType,
        status: "pendente",
        reason: `[${input.name}] ${input.reason}`,
        requestDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      log.info("Public DSR request created", { id, email: input.email, type: input.requestType });

      return { success: true, protocol: id };
    }),

  // Lista todas as solicitações DSR do tenant
  list: subscribedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      return db
        .select()
        .from(dsrRequests)
        .where(eq(dsrRequests.tenantId, ctx.tenantId!))
        .orderBy(desc(dsrRequests.requestDate));
    }),

  // Cria nova solicitação DSR
  create: subscribedProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        requestType: z.enum(["export", "delete", "rectify"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const id = `dsr_${Date.now()}_${nanoid(8)}`;

      await db.insert(dsrRequests).values({
        id,
        tenantId: ctx.tenantId!,
        email: input.email,
        requestType: input.requestType,
        status: "pendente",
        reason: input.reason || null,
        requestDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id, success: true };
    }),

  // Busca solicitação DSR por ID
  getById: subscribedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(dsrRequests)
        .where(
          and(
            eq(dsrRequests.id, input.id),
            eq(dsrRequests.tenantId, ctx.tenantId!)
          )
        )
        .limit(1);

      return result[0] || null;
    }),

  // Cancela solicitação DSR (apenas se pendente)
  cancel: subscribedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const existing = await db
        .select()
        .from(dsrRequests)
        .where(
          and(
            eq(dsrRequests.id, input.id),
            eq(dsrRequests.tenantId, ctx.tenantId!)
          )
        )
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });
      }

      if (existing[0].status !== "pendente") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas solicitações pendentes podem ser canceladas" });
      }

      await db
        .delete(dsrRequests)
        .where(
          and(
            eq(dsrRequests.id, input.id),
            eq(dsrRequests.tenantId, ctx.tenantId!)
          )
        );

      return { success: true };
    }),

  // ============================================================
  // Admin endpoints for DSR processing
  // ============================================================

  adminList: adminProcedure
    .input(z.object({
      status: z.enum(["pendente", "processando", "completo", "erro"]).optional(),
      limit: z.number().min(1).max(200).default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      if (input?.status) {
        return db.select().from(dsrRequests)
          .where(eq(dsrRequests.status, input.status))
          .orderBy(desc(dsrRequests.requestDate))
          .limit(input.limit || 50);
      }

      return db.select().from(dsrRequests)
        .orderBy(desc(dsrRequests.requestDate))
        .limit(input?.limit || 50);
    }),

  // Exportação completa de dados do titular (LGPD Art. 18, III)
  processExport: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [dsr] = await db.select().from(dsrRequests).where(eq(dsrRequests.id, input.id)).limit(1);
      if (!dsr) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada" });

      await db.update(dsrRequests).set({ status: "processando", updatedAt: new Date() }).where(eq(dsrRequests.id, input.id));

      try {
        const email = dsr.email;
        const collectedData: Record<string, any> = {};

        // 1. Dados da conta (excluindo passwordHash)
        const userRecords = await db.select({
          id: users.id, name: users.name, email: users.email,
          role: users.role, tenantId: users.tenantId,
          emailVerified: users.emailVerified, createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        }).from(users).where(eq(users.email, email));
        if (userRecords.length > 0) collectedData.conta = userRecords;

        // 2. Convites COPSOQ
        const inviteData = await db.select().from(copsoqInvites).where(eq(copsoqInvites.respondentEmail, email));
        if (inviteData.length > 0) collectedData.convitesCopsoq = inviteData;

        // 3. Respostas COPSOQ (via personId linked to people by email)
        const personForCopsoq = await db.select({ id: people.id }).from(people).where(eq(people.email, email));
        for (const person of personForCopsoq) {
          const responseData = await db.select().from(copsoqResponses).where(eq(copsoqResponses.personId, person.id));
          if (responseData.length > 0) collectedData.respostasCopsoq = responseData;
        }

        // 4. Convites de pesquisa
        const surveyInviteData = await db.select().from(surveyInvites).where(eq(surveyInvites.respondentEmail, email));
        if (surveyInviteData.length > 0) collectedData.convitesPesquisa = surveyInviteData;

        // 5. Denúncias anônimas (por email do denunciante, se fornecido)
        const reportData = await db.select().from(anonymousReports).where(eq(anonymousReports.reporterEmail, email));
        if (reportData.length > 0) collectedData.denuncias = reportData;

        // 6. Progresso de treinamento (por userId)
        if (userRecords.length > 0) {
          for (const user of userRecords) {
            const progressData = await db.select().from(trainingProgress).where(eq(trainingProgress.participantId, user.id));
            if (progressData.length > 0) collectedData.treinamentos = progressData;
          }
        }

        // 7. Dados como colaborador (people table)
        const personRecords = await db.select().from(people).where(eq(people.email, email));
        if (personRecords.length > 0) {
          collectedData.dadosColaborador = personRecords;
          for (const person of personRecords) {
            const sessionData = await db.select().from(individualSessions).where(eq(individualSessions.personId, person.id));
            if (sessionData.length > 0) collectedData.sessoesIndividuais = sessionData;
          }
        }

        // 7. Histórico de solicitações DSR
        const dsrHistory = await db.select().from(dsrRequests).where(eq(dsrRequests.email, email));
        collectedData.solicitacoesLgpd = dsrHistory;

        const exportData = {
          metadados: {
            dataExportacao: new Date().toISOString(),
            titular: email,
            plataforma: "BlackBelt Platform",
            versao: "1.0",
            fundamentoLegal: "LGPD Art. 18, III — Confirmação de existência e acesso a dados",
          },
          dados: collectedData,
        };

        // Generate CSV summary alongside JSON
        const csvLines = ["Categoria,Campo,Valor"];
        for (const [category, records] of Object.entries(collectedData)) {
          const arr = Array.isArray(records) ? records : [records];
          for (const record of arr) {
            for (const [key, value] of Object.entries(record as Record<string, any>)) {
              const sanitized = String(value ?? "").replace(/"/g, '""');
              csvLines.push(`"${category}","${key}","${sanitized}"`);
            }
          }
        }
        const csvStr = csvLines.join("\n");

        const jsonStr = JSON.stringify(exportData, null, 2);
        const fileSize = `${(Buffer.byteLength(jsonStr) / 1024).toFixed(1)} KB`;

        await db.update(dsrRequests).set({
          status: "completo",
          format: "JSON+CSV",
          fileSize,
          completionDate: new Date(),
          updatedAt: new Date(),
        }).where(eq(dsrRequests.id, input.id));

        log.info("DSR export processed", { id: input.id, email, fileSize });

        return { success: true, data: exportData, csv: csvStr, fileSize };
      } catch (err) {
        await db.update(dsrRequests).set({
          status: "erro",
          errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
          updatedAt: new Date(),
        }).where(eq(dsrRequests.id, input.id));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar exportação" });
      }
    }),

  // Exclusão de dados do titular com cascata (LGPD Art. 18, VI)
  processDeletion: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [dsr] = await db.select().from(dsrRequests).where(eq(dsrRequests.id, input.id)).limit(1);
      if (!dsr) throw new TRPCError({ code: "NOT_FOUND" });
      if (dsr.requestType !== "delete") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta solicitação não é de exclusão" });

      await db.update(dsrRequests).set({ status: "processando", updatedAt: new Date() }).where(eq(dsrRequests.id, input.id));

      try {
        const email = dsr.email;
        const deletionLog: string[] = [];

        // 1. Deletar convites COPSOQ
        const inviteResult = await db.delete(copsoqInvites).where(eq(copsoqInvites.respondentEmail, email));
        deletionLog.push("convites COPSOQ removidos");

        // 2. Anonimizar respostas COPSOQ (via personId, manter para estatísticas)
        const personForDeletion = await db.select({ id: people.id }).from(people).where(eq(people.email, email));
        for (const person of personForDeletion) {
          await db.update(copsoqResponses).set({
            personId: `anon_${nanoid(8)}`,
          }).where(eq(copsoqResponses.personId, person.id));
          deletionLog.push(`respostas COPSOQ anonimizadas (person: ${person.id})`);
        }

        // 3. Deletar convites de pesquisa
        await db.delete(surveyInvites).where(eq(surveyInvites.respondentEmail, email));
        deletionLog.push("convites de pesquisa removidos");

        // 4. Anonimizar denúncias (manter para compliance, remover PII)
        await db.update(anonymousReports).set({
          reporterEmail: null,
        }).where(eq(anonymousReports.reporterEmail, email));
        deletionLog.push("denúncias anonimizadas");

        // 5. Deletar dados vinculados ao userId
        const userRecords = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
        for (const user of userRecords) {
          await db.delete(trainingProgress).where(eq(trainingProgress.participantId, user.id));
          deletionLog.push(`progresso de treinamento removido (user: ${user.id})`);
        }

        // 6. Deletar/anonimizar dados como colaborador (people + sessões)
        const personRecords = await db.select({ id: people.id }).from(people).where(eq(people.email, email));
        for (const person of personRecords) {
          await db.delete(individualSessions).where(eq(individualSessions.personId, person.id));
          deletionLog.push(`sessões individuais removidas (person: ${person.id})`);
        }
        if (personRecords.length > 0) {
          await db.update(people).set({
            name: "Colaborador Removido (LGPD)",
            email: null,
            phone: null,
          }).where(eq(people.email, email));
          deletionLog.push("dados de colaborador anonimizados");
        }

        // 6. Anonimizar conta de usuário (manter registro para auditoria)
        const anonymizedEmail = `deleted_${Date.now()}@anon.blackbelt`;
        await db.update(users).set({
          name: "Usuário Removido (LGPD)",
          email: anonymizedEmail,
          passwordHash: null,
          emailVerified: false,
        }).where(eq(users.email, email));
        deletionLog.push("conta de usuário anonimizada");

        await db.update(dsrRequests).set({
          status: "completo",
          completionDate: new Date(),
          updatedAt: new Date(),
        }).where(eq(dsrRequests.id, input.id));

        log.info("DSR deletion processed", { id: input.id, email, actions: deletionLog });

        return { success: true, deletionLog };
      } catch (err) {
        await db.update(dsrRequests).set({
          status: "erro",
          errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
          updatedAt: new Date(),
        }).where(eq(dsrRequests.id, input.id));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar exclusão" });
      }
    }),

  // Retificação de dados do titular (LGPD Art. 18, III)
  processRectification: adminProcedure
    .input(z.object({
      id: z.string(),
      corrections: z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [dsr] = await db.select().from(dsrRequests).where(eq(dsrRequests.id, input.id)).limit(1);
      if (!dsr) throw new TRPCError({ code: "NOT_FOUND" });
      if (dsr.requestType !== "rectify") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta solicitação não é de retificação" });

      await db.update(dsrRequests).set({ status: "processando", updatedAt: new Date() }).where(eq(dsrRequests.id, input.id));

      try {
        const email = dsr.email;
        const rectificationLog: string[] = [];

        // Atualizar dados do usuário
        const updateData: Record<string, any> = {};
        if (input.corrections.name) updateData.name = input.corrections.name;
        if (input.corrections.email) updateData.email = input.corrections.email;

        if (Object.keys(updateData).length > 0) {
          await db.update(users).set(updateData).where(eq(users.email, email));
          rectificationLog.push(`conta atualizada: ${Object.keys(updateData).join(", ")}`);
        }

        // Atualizar email em convites COPSOQ se email mudou
        if (input.corrections.email) {
          await db.update(copsoqInvites).set({
            respondentEmail: input.corrections.email,
          }).where(eq(copsoqInvites.respondentEmail, email));
          rectificationLog.push("email atualizado nos convites COPSOQ");

          await db.update(surveyInvites).set({
            respondentEmail: input.corrections.email,
          }).where(eq(surveyInvites.respondentEmail, email));
          rectificationLog.push("email atualizado nos convites de pesquisa");

          // Atualizar email na tabela people (colaboradores)
          await db.update(people).set({
            email: input.corrections.email,
          }).where(eq(people.email, email));
          rectificationLog.push("email atualizado nos dados de colaborador");
        }

        // Atualizar nome na tabela people
        if (input.corrections.name) {
          await db.update(people).set({
            name: input.corrections.name,
          }).where(eq(people.email, input.corrections.email || email));
          rectificationLog.push("nome atualizado nos dados de colaborador");
        }

        await db.update(dsrRequests).set({
          status: "completo",
          completionDate: new Date(),
          updatedAt: new Date(),
        }).where(eq(dsrRequests.id, input.id));

        log.info("DSR rectification processed", { id: input.id, email, actions: rectificationLog });

        return { success: true, rectificationLog };
      } catch (err) {
        await db.update(dsrRequests).set({
          status: "erro",
          errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
          updatedAt: new Date(),
        }).where(eq(dsrRequests.id, input.id));
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar retificação" });
      }
    }),
});
