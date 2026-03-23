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
  // PDF DOWNLOAD ROUTES (authenticated)
  // ============================================
  registerPdfDownloadRoutes(app);

  // ============================================
  // IMPORT/EXPORT ROUTES (people & sectors)
  // ============================================
  registerImportExportRoutes(app);
}
