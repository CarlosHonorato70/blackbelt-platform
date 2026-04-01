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
import { log } from "./logger";
import {
  helmetConfig,
  corsConfig,
  apiRateLimiter,
  authRateLimiter,
  emailRateLimiter,
  uploadRateLimiter,
  aiRateLimiter,
  requestTracing,
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

  // Request tracing — generates X-Request-ID for every request
  app.use(requestTracing);

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

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  // Apply general rate limiting to all API routes
  app.use("/api", apiRateLimiter);

  // Stricter rate limiting for auth routes
  app.use("/api/auth", authRateLimiter);
  app.use("/api/oauth", authRateLimiter);

  // Email rate limiting (10/hour per IP) — matches tRPC procedure paths
  app.use("/api/trpc/assessments.sendInvites", emailRateLimiter);
  app.use("/api/trpc/reminders.sendManualReminder", emailRateLimiter);
  app.use("/api/trpc/pdfExports.generateProposal", emailRateLimiter);
  app.use("/api/trpc/pdfExports.generateAssessment", emailRateLimiter);

  // Upload rate limiting (20/hour per IP)
  app.use("/api/trpc/pdfExports.generateProposal", uploadRateLimiter);
  app.use("/api/trpc/pdfExports.generateAssessment", uploadRateLimiter);

  // AI analysis rate limiting (20/hour per IP)
  app.use("/api/trpc/ai.analyzeCopsoq", aiRateLimiter);
  app.use("/api/trpc/ai.generateInventory", aiRateLimiter);
  app.use("/api/trpc/ai.generatePlan", aiRateLimiter);

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

  // ============================================================================
  // PHASE 6: REST API v1 (Public API with API Key authentication)
  // ============================================================================
  
  const restApiRouter = await import("../_core/restApi");
  app.use("/api/v1", restApiRouter.default);

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
    log.info("Port is busy, using alternate port", { preferredPort, port });
  }

  server.listen(port, () => {
    log.info("Server running", { url: `http://localhost:${port}/` });
  });

  // Iniciar agendador de lembretes
  startReminderScheduler();
}

startServer().catch((err) => log.error("Server startup failed", { error: err instanceof Error ? err.message : String(err) }));

// Force rebuild Wed Dec 10 23:30:17     2025
