import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. SEGURANÇA COMERCIAL (CSP CONFIGURADO)
// Em vez de desativar, configuramos explicitamente o que é permitido.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Permite scripts do próprio site e do Google (Translate/Analytics)
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://translate.googleapis.com", "https://translate.google.com"],
      // Permite estilos do próprio site, do Google e estilos inline (comum em React)
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://translate.googleapis.com", "https://www.gstatic.com"],
      // Permite imagens do próprio site, dados (base64) e do Google
      imgSrc: ["'self'", "data:", "https://www.gstatic.com", "https://translate.googleapis.com"],
      // Permite conexões (API) para o próprio backend
      connectSrc: ["'self'", "https://blackbelt-backend.onrender.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Necessário desativar para alguns recursos externos carregarem
}));

// Configuração de CORS
app.use(cors({
  origin: true, // Em produção, idealmente troque pelo domínio exato do frontend se estiver separado
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Rate Limiting (Proteção contra DDoS/Brute Force)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
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
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = createServer(app);

  // Registra as rotas da API
  registerRoutes(app);

  // Tratamento de erros global
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[SERVER ERROR] ${status} - ${message}`);
    if (err.stack) console.error(err.stack);
    res.status(status).json({ message });
  });

  // 2. SERVIR FRONTEND EM PRODUÇÃO (CORREÇÃO DE CAMINHO ROBUSTA)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Tenta localizar a pasta 'public' em múltiplos locais possíveis
    const possiblePaths = [
      path.join(__dirname, "public"),      
      path.join(__dirname, "..", "public"), 
      path.join(process.cwd(), "dist", "public") 
    ];

    let distPath = possiblePaths.find(p => fs.existsSync(p));

    if (distPath) {
      log(`✅ Serving static files from: ${distPath}`);
      
      app.use(express.static(distPath, {
        maxAge: "1d",
        immutable: true
      }));

      app.get("*", (req, res) => {
        if (!req.path.startsWith("/api")) {
          res.sendFile(path.join(distPath!, "index.html"));
        }
      });
    } else {
      log(`❌ CRITICAL: Could not find 'public' folder. Checked: ${possiblePaths.join(", ")}`);
      app.get("*", (req, res) => {
        if (!req.path.startsWith("/api")) {
          res.status(500).send("System Error: Frontend build not found.");
        }
      });
    }
  }

  const PORT = parseInt(process.env.PORT || "8080", 10);
  const HOST = "0.0.0.0";

  server.listen(PORT, HOST, () => {
    log(`Server running on http://${HOST}:${PORT}/`);
  });
})();