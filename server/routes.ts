import type { Express, Request, Response } from "express";
import { handleAsaasWebhook } from "./routers/asaas";
import { log } from "./_core/logger";
import { checkDbHealth } from "./db";
import { registerPdfDownloadRoutes } from "./pdfDownloadRoutes";
import { registerImportExportRoutes } from "./importExportRoutes";

/**
 * Rotas Express - health check, webhooks Asaas e rotas de download.
 * TODA autenticacao e logica de negocio passa pelo tRPC.
 */
export function registerRoutes(app: Express) {

  // ============================================
  // HEALTH CHECK (com status do banco de dados)
  // ============================================

  app.get("/api/health", async (_req, res) => {
    const dbHealthy = await checkDbHealth();

    const status = dbHealthy ? "ok" : "degraded";
    const httpCode = dbHealthy ? 200 : 503;

    if (process.env.NODE_ENV === "production") {
      res.status(httpCode).json({ status });
    } else {
      res.status(httpCode).json({
        status,
        timestamp: new Date().toISOString(),
        service: "blackbelt-platform",
        version: "1.0.7",
        environment: process.env.NODE_ENV || "development",
        uptime: process.uptime(),
        database: dbHealthy ? "connected" : "unavailable",
      });
    }
  });

  // ============================================
  // WEBHOOK: ASAAS
  // Valida via access_token no header
  // ============================================

  app.post("/api/webhooks/asaas", async (req: Request, res: Response) => {
    // Validar token de autenticação do webhook
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (webhookToken) {
      const receivedToken = req.headers["asaas-access-token"] as string;
      if (!receivedToken || receivedToken !== webhookToken) {
        log.warn("[Asaas Webhook] Token inválido ou ausente");
        return res.status(401).json({ error: "Invalid webhook token" });
      }
    }

    try {
      const result = await handleAsaasWebhook(req.body);

      if (result.received) {
        res.json({ received: true });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      log.error("[Asaas Webhook] Error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ============================================
  // PROPOSAL APPROVAL (public, token-based)
  // ============================================

  app.get("/api/proposal/approve/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const db = await (await import("./db")).getDb();
      const { proposals } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const [proposal] = await db.select().from(proposals).where(eq(proposals.approvalToken, token));
      if (!proposal) {
        return res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=invalid`);
      }

      if (proposal.status === "approved") {
        return res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=already_approved`);
      }

      await db.update(proposals)
        .set({ status: "approved", approvedAt: new Date(), respondedAt: new Date(), updatedAt: new Date() })
        .where(eq(proposals.id, proposal.id));

      log.info(`[Proposal] Approved: ${proposal.id} by ${proposal.contactEmail}`);
      res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=approved&id=${proposal.id}`);
    } catch (error) {
      log.error("[Proposal Approve] Error:", error);
      res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=error`);
    }
  });

  app.get("/api/proposal/reject/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const db = await (await import("./db")).getDb();
      const { proposals } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const [proposal] = await db.select().from(proposals).where(eq(proposals.approvalToken, token));
      if (!proposal) {
        return res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=invalid`);
      }

      await db.update(proposals)
        .set({ status: "rejected", rejectedAt: new Date(), respondedAt: new Date(), updatedAt: new Date() })
        .where(eq(proposals.id, proposal.id));

      log.info(`[Proposal] Rejected: ${proposal.id} by ${proposal.contactEmail}`);
      res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=rejected&id=${proposal.id}`);
    } catch (error) {
      log.error("[Proposal Reject] Error:", error);
      res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=error`);
    }
  });

  // ============================================
  // PDF DOWNLOAD ROUTES (authenticated)
  // ============================================
  registerPdfDownloadRoutes(app);

  // ============================================
  // IMPORT/EXPORT ROUTES (people & sectors)
  // ============================================
  registerImportExportRoutes(app);
}
