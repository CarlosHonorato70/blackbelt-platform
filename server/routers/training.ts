import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "../_core/trpc";
import { requireActiveSubscription } from "../_core/subscriptionMiddleware";
import { getDb } from "../db";
import {
  interventionPrograms,
  programParticipants,
  trainingModules,
  trainingProgress,
} from "../../drizzle/schema_nr01";
import { eq, and, desc, sql } from "drizzle-orm";

export const trainingRouter = router({
  // Listar programas de treinamento
  listPrograms: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const programs = await db
        .select()
        .from(interventionPrograms)
        .where(
          and(
            eq(interventionPrograms.tenantId, input.tenantId),
            sql`${interventionPrograms.programType} IN ('training', 'workshop', 'leadership')`
          )
        )
        .orderBy(desc(interventionPrograms.createdAt));

      // Buscar contagem de módulos para cada programa
      const result = [];
      for (const program of programs) {
        const [moduleCount] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(trainingModules)
          .where(eq(trainingModules.programId, program.id));

        result.push({
          ...program,
          moduleCount: moduleCount?.count || 0,
        });
      }

      return result;
    }),

  // Obter programa com módulos e participantes
  getProgram: publicProcedure
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

      const [program] = await db
        .select()
        .from(interventionPrograms)
        .where(
          and(
            eq(interventionPrograms.id, input.id),
            eq(interventionPrograms.tenantId, input.tenantId)
          )
        );

      if (!program) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Programa não encontrado",
        });
      }

      const modules = await db
        .select()
        .from(trainingModules)
        .where(eq(trainingModules.programId, input.id))
        .orderBy(trainingModules.order);

      const [participantCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(programParticipants)
        .where(eq(programParticipants.programId, input.id));

      return {
        ...program,
        modules,
        participantCount: participantCount?.count || 0,
      };
    }),

  // Criar programa de treinamento
  createProgram: publicProcedure
    .input(
      z.object({
        tenantId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        programType: z.enum(["training", "mentoring", "workshop", "therapy", "resilience", "leadership"]),
        targetAudience: z.string().optional(),
        duration: z.number().optional(),
        facilitator: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        maxParticipants: z.number().optional(),
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

      const id = nanoid();

      await db.insert(interventionPrograms).values({
        id,
        tenantId: input.tenantId,
        title: input.title,
        description: input.description || null,
        programType: input.programType,
        targetAudience: input.targetAudience || null,
        duration: input.duration || null,
        facilitator: input.facilitator || null,
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        status: "planned",
        maxParticipants: input.maxParticipants || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id };
    }),

  // Adicionar módulo ao programa
  addModule: publicProcedure
    .input(
      z.object({
        programId: z.string(),
        tenantId: z.string(),
        title: z.string(),
        content: z.string().optional(),
        order: z.number().optional(),
        duration: z.number().optional(),
        videoUrl: z.string().optional(),
        quizQuestions: z.array(z.any()).optional(),
        passingScore: z.number().optional(),
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

      const id = nanoid();

      await db.insert(trainingModules).values({
        id,
        programId: input.programId,
        tenantId: input.tenantId,
        title: input.title,
        content: input.content || null,
        order: input.order ?? 0,
        duration: input.duration || null,
        videoUrl: input.videoUrl || null,
        quizQuestions: input.quizQuestions || null,
        passingScore: input.passingScore ?? 70,
        createdAt: new Date(),
      });

      return { id };
    }),

  // Atualizar módulo
  updateModule: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        content: z.string().optional(),
        order: z.number().optional(),
        duration: z.number().optional(),
        videoUrl: z.string().optional(),
        quizQuestions: z.array(z.any()).optional(),
        passingScore: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { id, ...data } = input;
      const updateData: any = {};

      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.order !== undefined) updateData.order = data.order;
      if (data.duration !== undefined) updateData.duration = data.duration;
      if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl;
      if (data.quizQuestions !== undefined) updateData.quizQuestions = data.quizQuestions;
      if (data.passingScore !== undefined) updateData.passingScore = data.passingScore;

      await db
        .update(trainingModules)
        .set(updateData)
        .where(eq(trainingModules.id, id));

      return { success: true };
    }),

  // Deletar módulo
  deleteModule: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .delete(trainingModules)
        .where(eq(trainingModules.id, input.id));

      return { success: true };
    }),

  // Inscrever participante no programa
  enrollParticipant: publicProcedure
    .input(
      z.object({
        programId: z.string(),
        personId: z.string(),
        tenantId: z.string(),
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

      const id = nanoid();

      await db.insert(programParticipants).values({
        id,
        programId: input.programId,
        personId: input.personId,
        tenantId: input.tenantId,
        enrolledAt: new Date(),
      });

      return { id };
    }),

  // Obter progresso do participante
  getProgress: publicProcedure
    .input(
      z.object({
        participantId: z.string(),
        programId: z.string(),
        tenantId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Buscar módulos do programa
      const modules = await db
        .select()
        .from(trainingModules)
        .where(eq(trainingModules.programId, input.programId))
        .orderBy(trainingModules.order);

      // Buscar progresso do participante
      const progress = await db
        .select()
        .from(trainingProgress)
        .where(
          and(
            eq(trainingProgress.participantId, input.participantId),
            eq(trainingProgress.tenantId, input.tenantId)
          )
        );

      const progressMap = new Map(
        progress.map((p) => [p.moduleId, p])
      );

      return modules.map((module) => ({
        ...module,
        progress: progressMap.get(module.id) || null,
      }));
    }),

  // Iniciar módulo
  startModule: publicProcedure
    .input(
      z.object({
        participantId: z.string(),
        moduleId: z.string(),
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

      // Verificar se já existe progresso
      const [existing] = await db
        .select()
        .from(trainingProgress)
        .where(
          and(
            eq(trainingProgress.participantId, input.participantId),
            eq(trainingProgress.moduleId, input.moduleId)
          )
        );

      if (existing) {
        // Atualizar para in_progress
        await db
          .update(trainingProgress)
          .set({ status: "in_progress", startedAt: new Date() })
          .where(eq(trainingProgress.id, existing.id));

        return { id: existing.id };
      }

      // Criar novo progresso
      const id = nanoid();

      await db.insert(trainingProgress).values({
        id,
        participantId: input.participantId,
        moduleId: input.moduleId,
        tenantId: input.tenantId,
        status: "in_progress",
        startedAt: new Date(),
        attempts: 0,
        createdAt: new Date(),
      });

      return { id };
    }),

  // Completar módulo
  completeModule: publicProcedure
    .input(
      z.object({
        participantId: z.string(),
        moduleId: z.string(),
        tenantId: z.string(),
        quizScore: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Buscar módulo para verificar passingScore
      const [module] = await db
        .select()
        .from(trainingModules)
        .where(eq(trainingModules.id, input.moduleId));

      if (!module) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Módulo não encontrado",
        });
      }

      // Se o módulo tem quiz, verificar se a nota é suficiente
      const hasQuiz = module.quizQuestions && Array.isArray(module.quizQuestions) && (module.quizQuestions as any[]).length > 0;
      const passingScore = module.passingScore ?? 70;

      if (hasQuiz && input.quizScore !== undefined && input.quizScore < passingScore) {
        // Incrementar tentativas mas não completar
        const [existing] = await db
          .select()
          .from(trainingProgress)
          .where(
            and(
              eq(trainingProgress.participantId, input.participantId),
              eq(trainingProgress.moduleId, input.moduleId)
            )
          );

        if (existing) {
          await db
            .update(trainingProgress)
            .set({
              quizScore: input.quizScore,
              attempts: (existing.attempts || 0) + 1,
            })
            .where(eq(trainingProgress.id, existing.id));
        }

        return {
          completed: false,
          message: `Nota insuficiente. Mínimo: ${passingScore}, Obtido: ${input.quizScore}`,
        };
      }

      // Buscar progresso existente
      const [existing] = await db
        .select()
        .from(trainingProgress)
        .where(
          and(
            eq(trainingProgress.participantId, input.participantId),
            eq(trainingProgress.moduleId, input.moduleId)
          )
        );

      if (existing) {
        await db
          .update(trainingProgress)
          .set({
            status: "completed",
            completedAt: new Date(),
            quizScore: input.quizScore ?? null,
            attempts: (existing.attempts || 0) + 1,
          })
          .where(eq(trainingProgress.id, existing.id));

        return { completed: true, id: existing.id };
      }

      // Criar progresso como completed diretamente
      const id = nanoid();

      await db.insert(trainingProgress).values({
        id,
        participantId: input.participantId,
        moduleId: input.moduleId,
        tenantId: input.tenantId,
        status: "completed",
        startedAt: new Date(),
        completedAt: new Date(),
        quizScore: input.quizScore ?? null,
        attempts: 1,
        createdAt: new Date(),
      });

      return { completed: true, id };
    }),
});
