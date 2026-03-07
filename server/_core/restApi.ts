/**
 * Phase 6: Public REST API
 * 
 * API REST pública com autenticação via API keys
 * Endpoints: /api/v1/*
 */

import express from "express";
import { log } from "./logger";
import { getDb } from "../db";
import { apiKeys, apiKeyUsage, riskAssessments, proposals } from "../../drizzle/schema";
import { eq, and, isNull, gte } from "drizzle-orm";
import crypto from "crypto";
import { nanoid } from "nanoid";
import rateLimit from "express-rate-limit";

const router = express.Router();

/**
 * Middleware de autenticação via API key
 */
async function authenticateAPIKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "API key required. Include X-API-Key header.",
    });
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).json({ error: "Database unavailable" });
  }

  // Hash da API key
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

  // Buscar API key
  const apiKeyRecord = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.keyHash, keyHash),
      eq(apiKeys.active, true),
      // Verificar se não expirou
      isNull(apiKeys.expiresAt)
    ),
  });

  if (!apiKeyRecord) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired API key",
    });
  }

  // Verificar se expirou
  if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "API key expired",
    });
  }

  // Atualizar lastUsedAt
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKeyRecord.id));

  // Adicionar info ao request
  (req as any).tenantId = apiKeyRecord.tenantId;
  (req as any).apiKeyId = apiKeyRecord.id;
  (req as any).apiKeyScopes = JSON.parse(apiKeyRecord.scopes as string) as string[];

  next();
}

/**
 * Middleware para verificar escopo
 */
function requireScope(scope: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const scopes = (req as any).apiKeyScopes as string[];

    if (!scopes || !scopes.includes(scope)) {
      return res.status(403).json({
        error: "Forbidden",
        message: `This endpoint requires '${scope}' scope`,
      });
    }

    next();
  };
}

/**
 * Middleware para logging de uso da API
 */
async function logApiUsage(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const startTime = Date.now();

  // Hook no finish do response
  res.on("finish", async () => {
    const duration = Date.now() - startTime;
    const apiKeyId = (req as any).apiKeyId;

    if (!apiKeyId) return;

    try {
      const db = await getDb();
      if (!db) return;

      await db.insert(apiKeyUsage).values({
        id: nanoid(),
        apiKeyId,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        requestDuration: duration,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      });
    } catch (error) {
      log.error("Failed to log API usage", { error: error instanceof Error ? error.message : String(error) });
    }
  });

  next();
}

/**
 * Rate limiting por API key
 */
const apiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req) => {
    const apiKeyId = (req as any).apiKeyId;
    if (!apiKeyId) return 100; // Default limit

    const db = await getDb();
    if (!db) return 100;

    const key = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, apiKeyId),
    });

    return key?.rateLimit || 1000; // Default 1000 req/hour
  },
  keyGenerator: (req) => (req as any).apiKeyId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", message: "Rate limit exceeded" },
});

// Aplicar middlewares globais
router.use(authenticateAPIKey);
router.use(logApiUsage);
router.use(apiRateLimiter);

// ============================================================================
// ASSESSMENTS ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/riskAssessments - Listar avaliações
 */
router.get("/riskAssessments", requireScope("riskAssessments:read"), async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    const tenantId = (req as any).tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = Math.min(parseInt(req.query.perPage as string) || 20, 100);

    const results = await db.query.riskAssessments.findMany({
      where: eq(riskAssessments.tenantId, tenantId),
      limit: perPage,
      offset: (page - 1) * perPage,
      orderBy: (riskAssessments, { desc }) => [desc(riskAssessments.createdAt)],
    });

    res.json({
      data: results,
      pagination: {
        page,
        perPage,
        total: results.length,
      },
    });
  } catch (error) {
    log.error("Error fetching riskAssessments", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/riskAssessments/:id - Obter avaliação específica
 */
router.get("/riskAssessments/:id", requireScope("riskAssessments:read"), async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    const tenantId = (req as any).tenantId;
    const assessment = await db.query.riskAssessments.findFirst({
      where: and(
        eq(riskAssessments.id, req.params.id),
        eq(riskAssessments.tenantId, tenantId)
      ),
    });

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    res.json({ data: assessment });
  } catch (error) {
    log.error("Error fetching assessment", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// PROPOSALS ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/proposals - Listar propostas
 */
router.get("/proposals", requireScope("proposals:read"), async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    const tenantId = (req as any).tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const perPage = Math.min(parseInt(req.query.perPage as string) || 20, 100);

    const results = await db.query.proposals.findMany({
      where: eq(proposals.tenantId, tenantId),
      limit: perPage,
      offset: (page - 1) * perPage,
      orderBy: (proposals, { desc }) => [desc(proposals.createdAt)],
    });

    res.json({
      data: results,
      pagination: {
        page,
        perPage,
        total: results.length,
      },
    });
  } catch (error) {
    log.error("Error fetching proposals", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/proposals/:id - Obter proposta específica
 */
router.get("/proposals/:id", requireScope("proposals:read"), async (req, res) => {
  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "Database unavailable" });
    }

    const tenantId = (req as any).tenantId;
    const proposal = await db.query.proposals.findFirst({
      where: and(eq(proposals.id, req.params.id), eq(proposals.tenantId, tenantId)),
    });

    if (!proposal) {
      return res.status(404).json({ error: "Proposal not found" });
    }

    res.json({ data: proposal });
  } catch (error) {
    log.error("Error fetching proposal", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * GET /api/v1/health - Health check endpoint
 */
router.get("/health", async (req, res) => {
  res.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

export default router;
