import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import type { Server } from "http";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Configura o Vite em modo de desenvolvimento com HMR
 * @param app - Instância do Express
 * @param server - Servidor HTTP
 */
export async function setupVite(app: Express, server: Server): Promise<void> {
  if (isProduction) {
    log("⚠️ setupVite called in production mode - skipping Vite dev server");
    return;
  }

  try {
    log("🔧 Setting up Vite development server...");

    const vite: ViteDevServer = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: {
          server: server
        }
      },
      appType: "spa",
      logLevel: "info"
    });

    app.use(vite.middlewares);
    
    log("✅ Vite dev server configured successfully");
  } catch (error) {
    log(`❌ Failed to setup Vite dev server: ${error}`);
    throw error;
  }
}

/**
 * Serve arquivos estáticos do build de produção
 * @param app - Instância do Express
 */
export function serveStatic(app: Express): void {
  const possiblePaths = [
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(process.cwd(), "dist"),
    path.resolve(__dirname, "public"),
    path.resolve(__dirname, "..", "public"),
  ];

  let distPath: string | undefined;

  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      const indexPath = path.join(possiblePath, "index.html");
      if (fs.existsSync(indexPath)) {
        distPath = possiblePath;
        break;
      }
    }
  }

  if (!distPath) {
    const errorMsg = `❌ CRITICAL: Frontend build not found. Checked paths:\n${possiblePaths.map(p => `  - ${p}`).join("\n")}`;
    log(errorMsg);
    
    // Serve página de erro amigável
    app.get("*", (req, res) => {
      if (!req.path.startsWith("/api")) {
        res.status(503).send(`
          <!DOCTYPE html>
          <html lang="pt-BR">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sistema Indisponível</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 1rem;
                backdrop-filter: blur(10px);
              }
              h1 { font-size: 3rem; margin: 0 0 1rem 0; }
              p { font-size: 1.2rem; margin: 0.5rem 0; }
              .code { font-family: monospace; background: rgba(0,0,0,0.2); padding: 0.5rem 1rem; border-radius: 0.5rem; margin-top: 1rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⚠️ Sistema Temporariamente Indisponível</h1>
              <p>O frontend da aplicação não foi encontrado.</p>
              <p>Por favor, execute o build da aplicação:</p>
              <div class="code">pnpm build</div>
              <p style="margin-top: 2rem; font-size: 0.9rem; opacity: 0.8;">
                Black Belt Platform v1.0.6
              </p>
            </div>
          </body>
          </html>
        `);
      }
    });
    return;
  }

  log(`✅ Serving static files from: ${distPath}`);

  // Configuração otimizada de cache para produção
  app.use(express.static(distPath, {
    maxAge: isProduction ? "1y" : "0", // Cache agressivo em produção
    immutable: isProduction,
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Cache específico por tipo de arquivo
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      } else if (filePath.match(/\.(js|css|woff2|woff|ttf)$/)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (filePath.match(/\.(jpg|jpeg|png|gif|svg|ico|webp)$/)) {
        res.setHeader("Cache-Control", "public, max-age=2592000"); // 30 dias
      }
    }
  }));

  // SPA fallback - serve index.html para todas as rotas não-API
  app.get("*", (req, res, next) => {
    // Ignora rotas de API
    if (req.path.startsWith("/api")) {
      return next();
    }

    const indexPath = path.join(distPath!, "index.html");
    
    if (!fs.existsSync(indexPath)) {
      log(`❌ index.html not found at: ${indexPath}`);
      return res.status(500).send("index.html não encontrado");
    }

    // Headers de segurança para o HTML
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    
    res.sendFile(indexPath);
  });
}

/**
 * Logger com timestamp formatado
 * @param message - Mensagem a ser logada
 */
export function log(message: string): void {
  const timestamp = new Date().toISOString();
  const formattedTime = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  
  console.log(`[${formattedTime}] ${message}`);
}
