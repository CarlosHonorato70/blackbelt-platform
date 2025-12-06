import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startReminderScheduler } from "./reminder-scheduler";
import {
  helmetConfig,
  corsConfig,
  apiRateLimiter,
  authRateLimiter,
  requestLogger,
  validateHeaders,
  ipMonitoring,
  validateTenantIsolation,
  healthCheck,
} from "./security";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ============================================================================
  // SECURITY MIDDLEWARE (Applied first)
  // ============================================================================

  // Helmet security headers
  app.use(helmetConfig);

  // CORS configuration
  app.use(corsConfig);

  // Request logging
  if (process.env.NODE_ENV === "development") {
    app.use(requestLogger);
  }

  // Security validation
  app.use(validateHeaders);
  app.use(ipMonitoring);
  app.use(validateTenantIsolation);

  // Health check endpoint (before rate limiting)
  app.get("/health", healthCheck);
  app.get("/api/health", healthCheck);

  // ============================================================================
  // WEBHOOK ENDPOINTS (Before body parsing - need raw body)
  // ============================================================================

  // Stripe webhook (requires raw body)
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];
      
      if (!signature || typeof signature !== "string") {
        return res.status(400).send("Missing stripe-signature header");
      }

      try {
        const { handleStripeWebhook } = await import("../routers/stripe");
        const result = await handleStripeWebhook(req.body, signature);
        
        if (result.received) {
          res.json({ received: true });
        } else {
          res.status(400).json({ error: result.error });
        }
      } catch (error) {
        console.error("Stripe webhook error:", error);
        res.status(400).send("Webhook Error");
      }
    }
  );

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  // Apply general rate limiting to all API routes
  app.use("/api", apiRateLimiter);

  // Stricter rate limiting for auth routes
  app.use("/api/auth", authRateLimiter);
  app.use("/api/oauth", authRateLimiter);

  // ============================================================================
  // BODY PARSING
  // ============================================================================

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ============================================================================
  // APPLICATION ROUTES
  // ============================================================================

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Mercado Pago webhook (can use parsed JSON body)
  app.post("/api/webhooks/mercadopago", async (req, res) => {
    try {
      const { handleMercadoPagoWebhook } = await import("../routers/mercadopago");
      const result = await handleMercadoPagoWebhook(req.body);
      
      if (result.received) {
        res.status(200).json({ success: true });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Mercado Pago webhook error:", error);
      res.status(400).json({ error: "Webhook processing failed" });
    }
  });

  // ============================================================================
  // STATIC FILES / VITE
  // ============================================================================

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Iniciar agendador de lembretes
  startReminderScheduler();
}

startServer().catch(console.error);
