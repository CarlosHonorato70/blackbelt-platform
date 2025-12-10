import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet"; // Import mantido, mas não usado no middleware principal temporariamente
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- DEBUG CRÍTICO ---
const dbUrl = process.env.DATABASE_URL || "";
console.log("--- DEBUG DE CONEXÃO ---");
console.log(`DATABASE_URL definida? ${dbUrl ? "SIM" : "NÃO"}`);
console.log(`DATABASE_URL começa com: ${dbUrl.substring(0, 10)}...`);
console.log(`DATABASE_URL contém 'render.com'? ${dbUrl.includes("render.com") ? "SIM" : "NÃO"}`);
console.log("------------------------");
// ---------------------

// 1. LIBERAÇÃO TOTAL (TEMPORÁRIA PARA TESTE)
app.use(cors()); // Libera tudo. Se der erro de CORS agora, é cache do navegador.

// Desativa Helmet temporariamente para garantir que nada bloqueie
// app.use(helmet(...)); 

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
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const server = createServer(app);

  registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(err);
    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Tenta achar a pasta public
    const possiblePaths = [
      path.join(__dirname, "public"),      
      path.join(__dirname, "..", "public"), 
      path.join(process.cwd(), "dist", "public") 
    ];
    let distPath = possiblePaths.find(p => fs.existsSync(p));

    if (distPath) {
      log(`Serving static files from: ${distPath}`);
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        if (!req.path.startsWith("/api")) {
          res.sendFile(path.join(distPath!, "index.html"));
        }
      });
    } else {
      log(`ERROR: Public folder not found.`);
    }
  }

  const PORT = parseInt(process.env.PORT || "8080", 10);
  const HOST = "0.0.0.0";

  server.listen(PORT, HOST, () => {
    log(`Server running on http://${HOST}:${PORT}/`);
  });
})();