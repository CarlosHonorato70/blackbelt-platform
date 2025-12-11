import { createServer as createHttpServer } from "http";
import express, { type Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { setupVite } from "./vite.js";
import { registerRoutes } from "./routes.js";
import { db } from "../db.js";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createHttpServer(app);

// Segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://translate.googleapis.com", "https://translate.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://translate.googleapis.com", "https://www.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://www.gstatic.com", "https://translate.googleapis.com"],
      connectSrc: ["'self'", "https://blackbelt-backend.onrender.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas requisições, tente novamente mais tarde." }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: () => 500
});

app.use("/api", limiter);
app.use("/api", speedLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de log
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      console.log(logLine);
    }
  });

  next();
});

(async () => {
  // 1. REGISTRAR ROTAS DA API
  const routes = registerRoutes(app);
  
  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[SERVER ERROR] ${status} - ${message}`);
    if (err.stack) console.error(err.stack);
    res.status(status).json({ message });
  });

  // 2. SERVIR FRONTEND
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    const possiblePaths = [
      path.join(__dirname, "public"),
      path.join(__dirname, "..", "public"),
      path.join(process.cwd(), "dist", "public")
    ];

    let distPath = possiblePaths.find(p => fs.existsSync(p));

    if (distPath) {
      console.log(`✅ Servindo arquivos estáticos de: ${distPath}`);
      
      // Serve arquivos estáticos
      app.use(express.static(distPath, {
        maxAge: "1d",
        immutable: true
      }));

      // SPA FALLBACK - CRÍTICO PARA REACT ROUTER
      app.get("*", (req, res, next) => {
        // Se for rota de API, pula
        if (req.path.startsWith("/api")) {
          return next();
        }
        
        // Para todas as outras rotas, serve o index.html
        const indexPath = path.join(distPath!, "index.html");
        
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(500).send("Frontend build not found");
        }
      });
    } else {
      console.log(`❌ CRITICAL: Could not find 'public' folder. Checked: ${possiblePaths.join(", ")}`);
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) {
          return next();
        }
        res.status(500).send("System Error: Frontend build not found.");
      });
    }
  }

  const PORT = parseInt(process.env.PORT || "8080", 10);
  
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor em execução em http://0.0.0.0:${PORT}/`);
  });
})();

