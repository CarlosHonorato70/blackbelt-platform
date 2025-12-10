import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";

const isProduction = process.env.NODE_ENV === "production";

export async function setupVite(app: Express) {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    serveStatic(app);
  }
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist/public");
  
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Diretório de build não encontrado: ${distPath}. Execute 'pnpm build' primeiro.`
    );
  }

  app.use(express.static(distPath));

  // SPA fallback - serve index.html for all non-API routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("index.html não encontrado");
    }
  });
}

export function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}
