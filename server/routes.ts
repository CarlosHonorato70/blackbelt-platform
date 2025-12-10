import type { Express } from "express";
import { db } from "../drizzle/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express) {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "blackbelt-platform",
      version: "1.0.6"
    });
  });

  // Auth endpoints (placeholder - implement with passport later)
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    
    try {
      // TODO: Implement proper password hashing and validation
      const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (!user.length) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // TODO: Generate JWT token
      const token = `mock-token-${Date.now()}`;
      
      res.json({
        token,
        user: {
          id: user[0].id,
          name: user[0].name,
          email: user[0].email,
          role: user[0].role
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro no servidor" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: "Token não fornecido" });
    }

    try {
      // TODO: Implement proper JWT validation
      // For now, return mock user
      res.json({
        user: {
          id: "1",
          name: "Usuário Demo",
          email: "demo@blackbelt.com",
          role: "admin"
        }
      });
    } catch (error) {
      console.error("Auth validation error:", error);
      res.status(401).json({ message: "Token inválido" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Logout realizado com sucesso" });
  });

  // API endpoints (placeholder for future features)
  app.get("/api/users", async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // 404 handler for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ message: "Endpoint não encontrado" });
  });
}
