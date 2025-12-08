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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuração de segurança básica
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Configuração de CORS
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
    if (status >= 500) console.error(err);
    res.status(status).json({ message });
  });

  // SERVIR FRONTEND EM PRODUÇÃO
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Serve arquivos estáticos da pasta 'public' dentro de 'dist'
    // O Vite geralmente gera 'dist/index.html' e 'dist/assets'
    // Ajuste o caminho conforme sua estrutura de build
    const distPath = path.join(__dirname, "..", "public"); // Tenta achar a pasta public no nível acima de server/
    
    // Serve arquivos estáticos
    app.use(express.static(distPath));

    // Fallback para SPA (Single Page Application)
    // Qualquer rota não-API retorna o index.html
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  const PORT = parseInt(process.env.PORT || "8080", 10);
  const HOST = "0.0.0.0";

  server.listen(PORT, HOST, () => {
    log(`Server running on http://${HOST}:${PORT}/`);
  });
})();