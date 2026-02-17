import "dotenv/config";
import * as Sentry from "@sentry/node";
import { createServer as createHttpServer } from "http";
import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { setupVite } from "./vite.js";
import { registerRoutes } from "./routes.js";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import { ENV } from "./_core/env";
import { log } from "./_core/logger";

// tRPC
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

// ============================================
// SENTRY ERROR TRACKING
// ============================================
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
  log.info("Sentry initialized", { environment: process.env.NODE_ENV });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createHttpServer(app);

// ============================================
// SEGURANCA: Helmet (CSP)
// ============================================

const isProduction = ENV.isProduction;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isProduction
          ? ["'self'"]
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: [
          "'self'",
          ENV.frontendUrl,
        ].filter(Boolean),
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ============================================
// CORS RESTRITIVO
// ============================================

const allowedOrigins = [
  ENV.frontendUrl,
  "http://localhost:5000",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sem origin (curl, mobile, server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} nao permitida pelo CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// ============================================
// RATE LIMITING
// ============================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas requisicoes, tente novamente mais tarde." },
  skip: (req) => req.path === "/api/health",
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas de login. Aguarde 15 minutos." },
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: () => 500,
});

app.use("/api", apiLimiter);
app.use("/api", speedLimiter);
app.use("/api/trpc/auth.", authLimiter);

// ============================================
// STRIPE WEBHOOK - precisa do raw body ANTES do express.json()
// ============================================
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));

// ============================================
// BODY PARSING & COOKIES
// ============================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// ============================================
// LOGGING (sem expor dados sensiveis)
// ============================================

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log.http(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
});

// ============================================
// INICIALIZACAO
// ============================================

(async () => {
  // 1. REGISTRAR ROTAS REST (health + webhooks)
  registerRoutes(app);

  // 2. REGISTRAR tRPC
  app.use(
    "/api/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // 3. ERROR HANDLER GLOBAL
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message =
      isProduction && status === 500
        ? "Erro interno do servidor"
        : err.message || "Internal Server Error";

    log.error(`[ERROR] ${status} - ${err.message}`, { stack: err.stack });

    if (status >= 500 && process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }

    res.status(status).json({ message });
  });

  // 4. SERVIR FRONTEND
  if (!isProduction) {
    await setupVite(app, server);
  } else {
    const possiblePaths = [
      path.join(__dirname, "public"),
      path.join(__dirname, "..", "public"),
      path.join(process.cwd(), "dist", "public"),
    ];

    const distPath = possiblePaths.find((p) => fs.existsSync(p));

    if (distPath) {
      log.info(`Servindo arquivos estaticos de: ${distPath}`);

      app.use(
        express.static(distPath, {
          maxAge: "1d",
          immutable: true,
        })
      );

      // SPA fallback
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) return next();

        const indexPath = path.join(distPath!, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(500).send("Frontend build not found");
        }
      });
    } else {
      log.error(
        `CRITICAL: Frontend build nao encontrado. Caminhos verificados: ${possiblePaths.join(", ")}`
      );
    }
  }

  // 5. START
  const PORT = ENV.port;

  server.listen(PORT, "0.0.0.0", () => {
    log.info(`Servidor rodando em http://0.0.0.0:${PORT}/`);
    log.info(`Ambiente: ${ENV.nodeEnv}`);
  });
})();
