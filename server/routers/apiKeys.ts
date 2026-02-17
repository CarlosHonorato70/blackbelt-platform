/**
 * Phase 6: API Keys Management Router
 * 
 * Gerenciamento de API keys para autenticação na API REST pública
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { apiKeys, apiKeyUsage } from "../../drizzle/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";

/**
 * Escopos disponíveis para API keys
 */
const scopeEnum = z.enum([
  "assessments:read",
  "assessments:write",
  "proposals:read",
  "proposals:write",
  "companies:read",
  "companies:write",
  "reports:read",
  "webhooks:read",
  "webhooks:write",
]);

/**
 * Router de gerenciamento de API keys
 */
export const apiKeysRouter = router({
  /**
   * Listar API keys do tenant (sem mostrar chaves completas)
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }

    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.tenantId, ctx.tenantId),
      orderBy: [desc(apiKeys.createdAt)],
    });

    return keys.map((key) => ({
      ...key,
      keyHash: undefined, // Nunca retornar hash
      scopes: JSON.parse(key.scopes as string) as string[],
    }));
  }),

  /**
   * Criar nova API key
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        scopes: z.array(scopeEnum).min(1),
        description: z.string().optional(),
        expiresInDays: z.number().min(1).max(365).optional(),
        rateLimit: z.number().min(100).max(10000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Gerar API key segura
      const apiKey = generateApiKey();
      const keyHash = hashApiKey(apiKey);
      const keyPrefix = apiKey.substring(0, 12) + "****";

      // Calcular data de expiração
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const keyId = nanoid();

      await db.insert(apiKeys).values({
        id: keyId,
        tenantId: ctx.tenantId,
        name: input.name,
        keyHash,
        keyPrefix,
        scopes: JSON.stringify(input.scopes),
        active: true,
        description: input.description || null,
        expiresAt,
        rateLimit: input.rateLimit || null,
      });

      return {
        id: keyId,
        apiKey, // Retornar apenas uma vez
        message:
          "API key created successfully. Save this key securely, it will not be shown again.",
        expiresAt,
      };
    }),

  /**
   * Atualizar API key (não pode mudar a chave em si)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(255).optional(),
        scopes: z.array(scopeEnum).min(1).optional(),
        active: z.boolean().optional(),
        description: z.string().optional(),
        rateLimit: z.number().min(100).max(10000).optional().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      const { id, ...updates } = input;

      // Verificar se API key existe e pertence ao tenant
      const existing = await db.query.apiKeys.findFirst({
        where: and(eq(apiKeys.id, id), eq(apiKeys.tenantId, ctx.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
      }

      await db
        .update(apiKeys)
        .set({
          ...updates,
          scopes: updates.scopes ? JSON.stringify(updates.scopes) : undefined,
          updatedAt: new Date(),
        })
        .where(and(eq(apiKeys.id, id), eq(apiKeys.tenantId, ctx.tenantId)));

      return { success: true };
    }),

  /**
   * Deletar API key
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Verificar se API key existe e pertence ao tenant
      const existing = await db.query.apiKeys.findFirst({
        where: and(eq(apiKeys.id, input.id), eq(apiKeys.tenantId, ctx.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
      }

      await db
        .delete(apiKeys)
        .where(and(eq(apiKeys.id, input.id), eq(apiKeys.tenantId, ctx.tenantId)));

      return { success: true };
    }),

  /**
   * Obter estatísticas de uso de uma API key
   */
  getUsage: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        days: z.number().min(1).max(90).default(7),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Verificar se API key existe e pertence ao tenant
      const key = await db.query.apiKeys.findFirst({
        where: and(eq(apiKeys.id, input.id), eq(apiKeys.tenantId, ctx.tenantId)),
      });

      if (!key) {
        throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
      }

      // Buscar logs de uso dos últimos N dias
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      
      const usageLogs = await db.query.apiKeyUsage.findMany({
        where: and(eq(apiKeyUsage.apiKeyId, input.id), gte(apiKeyUsage.createdAt, since)),
        orderBy: [desc(apiKeyUsage.createdAt)],
        limit: 1000,
      });

      // Calcular estatísticas
      const stats = {
        totalRequests: usageLogs.length,
        successRequests: usageLogs.filter((l) => l.statusCode >= 200 && l.statusCode < 300).length,
        errorRequests: usageLogs.filter((l) => l.statusCode >= 400).length,
        avgResponseTime: 
          usageLogs.length > 0
            ? Math.round(
                usageLogs.reduce((acc, l) => acc + (l.requestDuration || 0), 0) /
                  usageLogs.length
              )
            : 0,
        byEndpoint: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        recentRequests: usageLogs.slice(0, 20),
      };

      // Agrupar por endpoint
      usageLogs.forEach((log) => {
        stats.byEndpoint[log.endpoint] = (stats.byEndpoint[log.endpoint] || 0) + 1;
        const statusGroup = `${Math.floor(log.statusCode / 100)}xx`;
        stats.byStatus[statusGroup] = (stats.byStatus[statusGroup] || 0) + 1;
      });

      return stats;
    }),

  /**
   * Rotacionar API key (gerar nova chave mantendo o ID)
   */
  rotate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      // Verificar se API key existe e pertence ao tenant
      const existing = await db.query.apiKeys.findFirst({
        where: and(eq(apiKeys.id, input.id), eq(apiKeys.tenantId, ctx.tenantId)),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
      }

      // Gerar nova chave
      const newApiKey = generateApiKey();
      const newKeyHash = hashApiKey(newApiKey);
      const newKeyPrefix = newApiKey.substring(0, 12) + "****";

      await db
        .update(apiKeys)
        .set({
          keyHash: newKeyHash,
          keyPrefix: newKeyPrefix,
          updatedAt: new Date(),
        })
        .where(and(eq(apiKeys.id, input.id), eq(apiKeys.tenantId, ctx.tenantId)));

      return {
        apiKey: newApiKey,
        message: "API key rotated successfully. Update your applications with the new key.",
      };
    }),
});

/**
 * Gerar API key segura
 * Formato: pk_live_XXXXXXXXXXXXXXXXXXXXX (32 chars)
 */
function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(24);
  const key = randomBytes.toString("base64url");
  return `pk_live_${key}`;
}

/**
 * Hash API key com SHA-256
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}
