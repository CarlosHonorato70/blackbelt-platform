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

        createdInvites.push({ id, email: invite.email, token });
      }

      return {
        totalInvites: createdInvites.length,
        invites: createdInvites,
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
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Validar token do convite
      const [invite] = await db
        .select()
        .from(surveyInvites)
        .where(eq(surveyInvites.inviteToken, input.token));

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite não encontrado ou inválido",
        });
      }

      if (invite.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este convite já foi respondido",
        });
      }

      if (invite.expiresAt && new Date() > invite.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este convite expirou",
        });
      }

      // Calcular score e riskLevel a partir das respostas
      let score = 0;
      let riskLevel: "low" | "medium" | "high" | "critical" = "low";
      try {
        const resp = input.responses;
        const values = Array.isArray(resp)
          ? resp.map((r: any) => Number(r.value || r.score || r) || 0)
          : Object.values(resp as Record<string, any>).map((v: any) => Number(v) || 0);
        if (values.length > 0) {
          score = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
        }
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
        personId: invite.id, // Use invite ID as person reference
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

      // Calcular scores médios
      const scores = responses
        .map((r) => r.score)
        .filter((s): s is number => s !== null);
      const averageScore =
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
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

      return {
        totalResponses,
        averageScore,
        riskDistribution,
        responseDistribution,
      };
    }),
});
