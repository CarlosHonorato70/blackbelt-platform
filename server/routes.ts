import type { Express, Request, Response, NextFunction } from "express";
import { handleStripeWebhook } from "./routers/stripe";
import { handleMercadoPagoWebhook } from "./routers/mercadopago";
import crypto from "crypto";

/**
 * Rotas Express - apenas health check e webhooks de pagamento.
 * TODA autenticacao e logica de negocio passa pelo tRPC (authLocalRouter).
 * As rotas REST de autenticacao fake foram REMOVIDAS por serem vulneraveis.
 */
export function registerRoutes(app: Express) {

  // ============================================
  // HEALTH CHECK
  // ============================================

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "blackbelt-platform",
      version: "1.0.6",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
    });
  });

  // ============================================
  // WEBHOOK: STRIPE
  // Precisa receber o raw body para validar a assinatura
  // ============================================

  app.post(
    "/api/webhooks/stripe",
    // O Stripe exige raw body para validacao de assinatura
    // O express.raw() deve ser usado ANTES do express.json()
    // Certifique-se de que esta rota nao passa pelo express.json() middleware
    async (req: Request, res: Response) => {
      const signature = req.headers["stripe-signature"];

      if (!signature || typeof signature !== "string") {
        return res.status(400).json({ error: "Missing stripe-signature header" });
      }

      try {
        const result = await handleStripeWebhook(req.body, signature);

        if (result.received) {
          res.json({ received: true });
        } else {
          res.status(400).json({ error: result.error });
        }
      } catch (error) {
        console.error("[Stripe Webhook] Error:", error);
        res.status(500).json({ error: "Webhook processing failed" });
      }
    }
  );

  // ============================================
  // WEBHOOK: MERCADO PAGO
  // Valida assinatura HMAC-SHA256
  // ============================================

  app.post("/api/webhooks/mercadopago", async (req: Request, res: Response) => {
    // Verificar assinatura do Mercado Pago (se configurada)
    const mpWebhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

    if (mpWebhookSecret) {
      const xSignature = req.headers["x-signature"] as string;
      const xRequestId = req.headers["x-request-id"] as string;

      if (!xSignature || !xRequestId) {
        return res.status(401).json({ error: "Missing signature headers" });
      }

      // Extrair ts e v1 do header x-signature
      const parts = xSignature.split(",");
      const tsMatch = parts.find((p) => p.trim().startsWith("ts="));
      const v1Match = parts.find((p) => p.trim().startsWith("v1="));

      if (!tsMatch || !v1Match) {
        return res.status(401).json({ error: "Invalid signature format" });
      }

      const ts = tsMatch.split("=")[1];
      const v1 = v1Match.split("=")[1];

      // Montar template para validacao
      const dataId = req.query["data.id"] || req.body?.data?.id || "";
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

      const expectedSignature = crypto
        .createHmac("sha256", mpWebhookSecret)
        .update(manifest)
        .digest("hex");

      if (expectedSignature !== v1) {
        console.warn("[MercadoPago Webhook] Invalid signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    try {
      const result = await handleMercadoPagoWebhook(req.body);

      if (result.received) {
        res.json({ received: true });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("[MercadoPago Webhook] Error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}
