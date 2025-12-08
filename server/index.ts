import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

const app = express();

// Configuração de segurança básica
app.use(helmet({
  contentSecurityPolicy: false, // Desativa CSP para evitar conflitos com Vite em dev
  crossOriginEmbedderPolicy: false,
}));

// Configuração de CORS - Permissiva para evitar erros em produção
app.use(cors({
  origin: true, // Permite qualquer origem (útil para debug e produção inicial)
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Rate Limiting - Proteção contra DDoS
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas requisições, tente novamente mais tarde." }
});

// Speed Limiting - Desacelera requisições excessivas
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 50, // começa a desacelerar após 50 requisições
  delayMs: () => 500 // adiciona 500ms de delay por requisição
});

// Aplica limitadores apenas em rotas de API
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

    // Não logar stack trace em produção para erros comuns
    if (status >= 500) {
      console.error(err);
    }

    res.status(status).json({ message });
  });

  // Configuração do Vite ou arquivos estáticos
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Inicialização do servidor
  // IMPORTANTE: Usa a porta definida no ambiente ou 8080 como fallback
  const PORT = parseInt(process.env.PORT || "8080", 10);
  
  // Garante que o host seja 0.0.0.0 para Docker/Render
  const HOST = "0.0.0.0";

  server.listen(PORT, HOST, () => {
    log(`Server running on http://${HOST}:${PORT}/`);
  });
})();