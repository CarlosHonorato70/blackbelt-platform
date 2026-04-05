import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, tenantProcedure, consultantProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  psychosocialSurveys,
  surveyResponses,
  surveyInvites,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";
import { sendBulkClimateSurveyInvites } from "../_core/email";

export const climateSurveysRouter = router({
  // Listar pesquisas de clima por tenant
  list: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const surveys = await db
        .select()
        .from(psychosocialSurveys)
        .where(eq(psychosocialSurveys.tenantId, ctx.tenantId!))
        .orderBy(desc(psychosocialSurveys.createdAt));

      return surveys;
    }),

  // Obter pesquisa por ID com contagem de respostas
  get: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        tenantId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [survey] = await db
        .select()
        .from(psychosocialSurveys)
        .where(
          and(
            eq(psychosocialSurveys.id, input.id),
            eq(psychosocialSurveys.tenantId, ctx.tenantId!)
          )
        );

      if (!survey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pesquisa não encontrada",
        });
      }

      const [responseCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, input.id));

      return {
        ...survey,
        responseCount: responseCount?.count || 0,
      };
    }),

  // Criar nova pesquisa de clima
  create: tenantProcedure
    .input(
      z.object({
        tenantId: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        surveyType: z.enum(["climate", "stress", "burnout", "engagement", "custom"]),
        questions: z.array(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const id = nanoid();

      await db.insert(psychosocialSurveys).values({
        id,
        tenantId: ctx.tenantId!,
        title: input.title,
        description: input.description || null,
        surveyType: input.surveyType,
        questions: input.questions,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id };
    }),

  // Atualizar pesquisa
  update: tenantProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        questions: z.array(z.any()).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { id, ...data } = input;
      const updateData: any = { updatedAt: new Date() };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.questions !== undefined) updateData.questions = data.questions;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      await db
        .update(psychosocialSurveys)
        .set(updateData)
        .where(and(eq(psychosocialSurveys.id, id), eq(psychosocialSurveys.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // Deletar pesquisa
  delete: tenantProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .delete(psychosocialSurveys)
        .where(and(eq(psychosocialSurveys.id, input.id), eq(psychosocialSurveys.tenantId, ctx.tenantId!)));

      return { success: true };
    }),

  // Enviar convites para pesquisa (somente consultor/admin)
  sendInvites: consultantProcedure
    .input(
      z.object({
        surveyId: z.string(),
        tenantId: z.string().optional(),
        invites: z.array(
          z.object({
            email: z.string().email(),
            name: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Buscar título da pesquisa para o email
      const [survey] = await db
        .select({ title: psychosocialSurveys.title })
        .from(psychosocialSurveys)
        .where(eq(psychosocialSurveys.id, input.surveyId))
        .limit(1);
      const surveyTitle = survey?.title || "Pesquisa de Clima Organizacional";

      const createdInvites = [];

      for (const invite of input.invites) {
        const id = nanoid();
        const token = nanoid(32);

        await db.insert(surveyInvites).values({
          id,
          surveyId: input.surveyId,
          tenantId: ctx.tenantId!,
          respondentEmail: invite.email,
          respondentName: invite.name,
          inviteToken: token,
          status: "sent",
          sentAt: new Date(),
          expiresAt,
          createdAt: new Date(),
        });

        createdInvites.push({ id, email: invite.email, name: invite.name, token });
      }

      // Enviar emails com link da pesquisa
      try {
        const emailResult = await sendBulkClimateSurveyInvites(
          createdInvites.map(inv => ({
            respondentEmail: inv.email,
            respondentName: inv.name,
            surveyTitle,
            inviteToken: inv.token,
            expiresIn: 30,
            tenantId: ctx.tenantId!,
          }))
        );
        console.log(`[ClimateSurvey] Emails enviados: ${emailResult.success} sucesso, ${emailResult.failed} falhas`);
      } catch (err) {
        console.error("[ClimateSurvey] Erro ao enviar emails:", err);
      }

      return {
        totalInvites: createdInvites.length,
        invites: createdInvites,
      };
    }),

  // Validar convite e retornar perguntas da pesquisa (público)
  validateInvite: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [invite] = await db
        .select()
        .from(surveyInvites)
        .where(eq(surveyInvites.inviteToken, input.token));

      if (!invite)
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado ou inválido" });

      if (invite.status === "completed")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite já foi respondido" });

      if (invite.expiresAt && new Date() > invite.expiresAt)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite expirou" });

      // Retornar dados da pesquisa para o respondente
      const [survey] = await db
        .select({
          id: psychosocialSurveys.id,
          title: psychosocialSurveys.title,
          description: psychosocialSurveys.description,
          questions: psychosocialSurveys.questions,
        })
        .from(psychosocialSurveys)
        .where(eq(psychosocialSurveys.id, invite.surveyId))
        .limit(1);

      if (!survey)
        throw new TRPCError({ code: "NOT_FOUND", message: "Pesquisa não encontrada" });

      return {
        surveyId: survey.id,
        title: survey.title,
        description: survey.description,
        questions: survey.questions,
        respondentName: invite.respondentName,
      };
    }),

  // Submeter resposta (público - sem autenticação)
  submitResponse: publicProcedure
    .input(
      z.object({
        token: z.string(),
        responses: z.any(),
        isAnonymous: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Validar token do convite
      const [invite] = await db
        .select()
        .from(surveyInvites)
        .where(eq(surveyInvites.inviteToken, input.token));

      if (!invite)
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado ou inválido" });

      if (invite.status === "completed")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite já foi respondido" });

      if (invite.expiresAt && new Date() > invite.expiresAt)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este convite expirou" });

      // Buscar perguntas para scoring por dimensão com metodologia correta
      const [survey] = await db
        .select({ questions: psychosocialSurveys.questions })
        .from(psychosocialSurveys)
        .where(eq(psychosocialSurveys.id, invite.surveyId))
        .limit(1);

      const questions = survey?.questions && Array.isArray(survey.questions)
        ? (survey.questions as Array<{ id?: string; dimension?: string; reverse?: boolean }>)
        : [];

      // Calcular score usando média na escala 1-5, normalizado para 0-100
      let score = 0;
      let riskLevel: "low" | "medium" | "high" | "critical" = "low";
      try {
        const resp = input.responses;
        const values: number[] = [];
        const respObj = (typeof resp === "object" && !Array.isArray(resp))
          ? resp as Record<string, any>
          : {};

        // Processar cada resposta, aplicando reverse scoring quando definido
        for (const [key, rawValue] of Object.entries(respObj)) {
          const value = Number(rawValue) || 0;
          if (value === 0) continue;

          const qIdx = parseInt(key.replace(/\D/g, ""), 10);
          const qDef = questions[qIdx] || (questions.find(q => q.id === key));
          const finalValue = qDef?.reverse ? (6 - value) : value;
          values.push(finalValue);
        }

        if (values.length > 0) {
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          // Normalizar de escala 1-5 para 0-100
          score = Math.round(((mean - 1) / 4) * 100);
        }

        // Classificação de risco baseada na metodologia EACT/ITRA/QVT
        // Faixas padronizadas: ≥70 Satisfatório, 50-69 Moderado, 30-49 Alto, <30 Crítico
        if (score < 30) riskLevel = "critical";
        else if (score < 50) riskLevel = "high";
        else if (score < 70) riskLevel = "medium";
        else riskLevel = "low";
      } catch { /* fallback to defaults */ }

      // Criar resposta
      const responseId = nanoid();

      await db.insert(surveyResponses).values({
        id: responseId,
        surveyId: invite.surveyId,
        personId: invite.id,
        tenantId: invite.tenantId,
        responses: input.responses,
        score,
        riskLevel,
        isAnonymous: input.isAnonymous ?? true,
        completedAt: new Date(),
        createdAt: new Date(),
      });

      // Marcar convite como concluído
      await db
        .update(surveyInvites)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(surveyInvites.id, invite.id));

      return { responseId, success: true };
    }),

  // Listar convites de uma pesquisa
  listInvites: tenantProcedure
    .input(
      z.object({
        surveyId: z.string(),
        tenantId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const invites = await db
        .select()
        .from(surveyInvites)
        .where(
          and(
            eq(surveyInvites.surveyId, input.surveyId),
            eq(surveyInvites.tenantId, ctx.tenantId!)
          )
        )
        .orderBy(desc(surveyInvites.createdAt));

      return invites;
    }),

  // Obter resultados agregados da pesquisa
  getResults: tenantProcedure
    .input(
      z.object({
        surveyId: z.string(),
        tenantId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Buscar todas as respostas da pesquisa
      const responses = await db
        .select()
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.surveyId, input.surveyId),
            eq(surveyResponses.tenantId, ctx.tenantId!)
          )
        );

      const totalResponses = responses.length;

      // Calculate completion rate from invites
      const allInvites = await db
        .select()
        .from(surveyInvites)
        .where(
          and(
            eq(surveyInvites.surveyId, input.surveyId),
            eq(surveyInvites.tenantId, ctx.tenantId!)
          )
        );
      const totalInvites = allInvites.length;
      const completedInvites = allInvites.filter((i) => i.status === "completed").length;
      const completionRate = totalInvites > 0 ? Math.round((completedInvites / totalInvites) * 100) : 0;

      // Calcular scores médios
      const scores = responses
        .map((r) => r.score)
        .filter((s): s is number => s !== null);
      const averageScore =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0;

      // Distribuição por nível de risco
      const riskDistribution = {
        low: responses.filter((r) => r.riskLevel === "low").length,
        medium: responses.filter((r) => r.riskLevel === "medium").length,
        high: responses.filter((r) => r.riskLevel === "high").length,
        critical: responses.filter((r) => r.riskLevel === "critical").length,
      };

      // Agregar respostas por questão
      const questionAggregation: Record<string, number[]> = {};
      for (const response of responses) {
        if (response.responses && typeof response.responses === "object") {
          const respObj = response.responses as Record<string, number>;
          for (const [key, value] of Object.entries(respObj)) {
            if (!questionAggregation[key]) questionAggregation[key] = [];
            questionAggregation[key].push(value);
          }
        }
      }

      const responseDistribution: Record<string, { average: number; count: number }> = {};
      for (const [key, values] of Object.entries(questionAggregation)) {
        responseDistribution[key] = {
          average: Math.round(
            (values.reduce((a, b) => a + b, 0) / values.length) * 100
          ) / 100,
          count: values.length,
        };
      }

      // Invite status breakdown
      const inviteStatus = {
        total: totalInvites,
        sent: allInvites.filter((i) => i.status === "sent" || i.status === "pending").length,
        completed: completedInvites,
        expired: allInvites.filter((i) => i.status === "expired" || (i.expiresAt && new Date() > i.expiresAt && i.status !== "completed")).length,
      };

      // ── Dimension-level scoring ────────────────────────────────────
      // Map each question to its dimension from the survey definition
      const [survey] = await db
        .select({ questions: psychosocialSurveys.questions })
        .from(psychosocialSurveys)
        .where(eq(psychosocialSurveys.id, input.surveyId))
        .limit(1);

      const dimensionScores: Record<string, { sum: number; count: number; avg: number; questions: number }> = {};

      if (survey?.questions && Array.isArray(survey.questions)) {
        const questions = survey.questions as Array<{
          id?: string;
          text?: string;
          dimension?: string;
          reverse?: boolean;
        }>;

        // Build question index → dimension map
        const qDimensionMap: Record<string, { dimension: string; reverse: boolean }> = {};
        questions.forEach((q, idx) => {
          const key = q.id || `q${idx}`;
          qDimensionMap[key] = {
            dimension: q.dimension || "Geral",
            reverse: q.reverse || false,
          };
        });

        // Aggregate all responses by dimension
        for (const response of responses) {
          if (!response.responses || typeof response.responses !== "object") continue;
          const respObj = response.responses as Record<string, any>;

          // Responses may be keyed by question index (q0, q1...) or by question ID
          for (const [key, rawValue] of Object.entries(respObj)) {
            const value = Number(rawValue) || 0;
            if (value === 0) continue;

            const qInfo = qDimensionMap[key] || qDimensionMap[`q${key}`];
            const dimension = qInfo?.dimension || "Geral";
            // Reverse scoring: invert on 1-5 scale (1→5, 2→4, 3→3, 4→2, 5→1)
            const finalValue = qInfo?.reverse ? (6 - value) : value;

            if (!dimensionScores[dimension]) {
              dimensionScores[dimension] = { sum: 0, count: 0, avg: 0, questions: 0 };
            }
            dimensionScores[dimension].sum += finalValue;
            dimensionScores[dimension].count += 1;
          }
        }

        // Count unique questions per dimension
        for (const q of questions) {
          const dim = q.dimension || "Geral";
          if (!dimensionScores[dim]) {
            dimensionScores[dim] = { sum: 0, count: 0, avg: 0, questions: 0 };
          }
          dimensionScores[dim].questions += 1;
        }

        // Compute averages (normalize to 0-100 scale from 1-5)
        for (const dim of Object.values(dimensionScores)) {
          dim.avg = dim.count > 0 ? Math.round(((dim.sum / dim.count - 1) / 4) * 100) : 0;
        }
      }

      return {
        totalResponses,
        averageScore,
        completionRate,
        riskDistribution,
        responseDistribution,
        inviteStatus,
        dimensionScores,
      };
    }),
});
