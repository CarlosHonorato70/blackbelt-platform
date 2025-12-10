import type { Express, Request, Response, NextFunction } from "express";

// Lazy load do DB para evitar problemas de bundle no esbuild
let db: any;
let users: any;
let eq: any;

async function initDB() {
  if (!db) {
    const dbModule = await import("../drizzle/db");
    const schemaModule = await import("../drizzle/schema");
    const drizzleModule = await import("drizzle-orm");
    db = dbModule.db;
    users = schemaModule.users;
    eq = drizzleModule.eq;
  }
}

// Middleware de validação de entrada
function validateLoginInput(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ 
      message: "Email e senha são obrigatórios",
      code: "MISSING_CREDENTIALS"
    });
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ 
      message: "Formato inválido de credenciais",
      code: "INVALID_FORMAT"
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ 
      message: "Email inválido",
      code: "INVALID_EMAIL"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      message: "Senha deve ter no mínimo 6 caracteres",
      code: "PASSWORD_TOO_SHORT"
    });
  }

  next();
}

// Middleware de autenticação JWT (placeholder para implementação futura)
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ 
      message: "Token de autenticação não fornecido",
      code: "NO_TOKEN"
    });
  }

  // TODO: Implementar validação JWT real com jsonwebtoken
  // Por enquanto, aceita qualquer token que comece com "mock-token-"
  if (!token.startsWith("mock-token-")) {
    return res.status(403).json({ 
      message: "Token inválido ou expirado",
      code: "INVALID_TOKEN"
    });
  }

  // Anexa dados do usuário ao request (mock)
  (req as any).user = {
    id: "1",
    email: "demo@blackbelt.com",
    role: "admin"
  };

  next();
}

// Registro de rotas
export function registerRoutes(app: Express) {
  
  // ============================================
  // HEALTH CHECK & SYSTEM INFO
  // ============================================
  
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "blackbelt-platform",
      version: "1.0.6",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: "MB"
      }
    });
  });

  app.get("/api/status", (req, res) => {
    res.json({
      database: "connected", // TODO: Implementar health check real do DB
      api: "operational",
      timestamp: new Date().toISOString()
    });
  });

  // ============================================
  // AUTENTICAÇÃO
  // ============================================
  
  app.post("/api/auth/login", validateLoginInput, async (req, res) => {
    const { email, password } = req.body;
    
    try {
      await initDB();
      
      // Busca usuário no banco
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      
      if (!userResult.length) {
        return res.status(401).json({ 
          message: "Credenciais inválidas",
          code: "INVALID_CREDENTIALS"
        });
      }

      const user = userResult[0];

      // TODO: Implementar bcrypt para validação de senha
      // Por enquanto, aceita qualquer senha (APENAS PARA DESENVOLVIMENTO)
      if (process.env.NODE_ENV === "production") {
        console.warn("⚠️ WARNING: Password validation not implemented in production!");
      }

      // TODO: Gerar JWT token real com jsonwebtoken
      const token = `mock-token-${Date.now()}-${user.id}`;
      
      // Log de auditoria (sem dados sensíveis)
      console.log(`[AUTH] Login successful for user: ${user.email} (ID: ${user.id})`);

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error("[AUTH ERROR] Login failed:", error);
      res.status(500).json({ 
        message: "Erro interno no servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      await initDB();
      const userId = (req as any).user.id;

      // Busca dados atualizados do usuário
      const userResult = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!userResult.length) {
        return res.status(404).json({ 
          message: "Usuário não encontrado",
          code: "USER_NOT_FOUND"
        });
      }

      const user = userResult[0];

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error("[AUTH ERROR] Failed to fetch user data:", error);
      res.status(500).json({ 
        message: "Erro ao buscar dados do usuário",
        code: "FETCH_ERROR"
      });
    }
  });

  app.post("/api/auth/logout", authenticateToken, (req, res) => {
    const userId = (req as any).user.id;
    
    // TODO: Implementar blacklist de tokens ou invalidação no Redis
    console.log(`[AUTH] Logout for user ID: ${userId}`);
    
    res.json({ 
      success: true,
      message: "Logout realizado com sucesso" 
    });
  });

  app.post("/api/auth/refresh", authenticateToken, (req, res) => {
    const userId = (req as any).user.id;
    
    // TODO: Implementar refresh token real
    const newToken = `mock-token-${Date.now()}-${userId}`;
    
    res.json({
      success: true,
      token: newToken
    });
  });

  // ============================================
  // GESTÃO DE USUÁRIOS (PROTEGIDO)
  // ============================================
  
  app.get("/api/users", authenticateToken, async (req, res) => {
    try {
      await initDB();
      const requestingUser = (req as any).user;

      // Verifica se usuário tem permissão (apenas admin)
      if (requestingUser.role !== "admin") {
        return res.status(403).json({ 
          message: "Acesso negado. Apenas administradores podem listar usuários.",
          code: "FORBIDDEN"
        });
      }

      const allUsers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt
      }).from(users);

      res.json({
        success: true,
        count: allUsers.length,
        users: allUsers
      });
    } catch (error) {
      console.error("[API ERROR] Failed to fetch users:", error);
      res.status(500).json({ 
        message: "Erro ao buscar usuários",
        code: "FETCH_ERROR"
      });
    }
  });

  app.get("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      await initDB();
      const { id } = req.params;
      const requestingUser = (req as any).user;

      // Usuário só pode ver seus próprios dados, exceto admin
      if (requestingUser.id !== id && requestingUser.role !== "admin") {
        return res.status(403).json({ 
          message: "Acesso negado",
          code: "FORBIDDEN"
        });
      }

      const userResult = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!userResult.length) {
        return res.status(404).json({ 
          message: "Usuário não encontrado",
          code: "USER_NOT_FOUND"
        });
      }

      res.json({
        success: true,
        user: userResult[0]
      });
    } catch (error) {
      console.error("[API ERROR] Failed to fetch user:", error);
      res.status(500).json({ 
        message: "Erro ao buscar usuário",
        code: "FETCH_ERROR"
      });
    }
  });

  // ============================================
  // DASHBOARD & ANALYTICS (PLACEHOLDER)
  // ============================================
  
  app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      await initDB();
      const totalUsers = await db.select().from(users);

      res.json({
        success: true,
        stats: {
          totalUsers: totalUsers.length,
          activeUsers: totalUsers.filter((u: any) => u.role !== "inactive").length,
          adminUsers: totalUsers.filter((u: any) => u.role === "admin").length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("[API ERROR] Failed to fetch dashboard stats:", error);
      res.status(500).json({ 
        message: "Erro ao buscar estatísticas",
        code: "FETCH_ERROR"
      });
    }
  });

  // ============================================
  // ERROR HANDLERS
  // ============================================
  
  // 404 para rotas de API não encontradas
  app.use("/api/*", (req, res) => {
    res.status(404).json({ 
      message: "Endpoint não encontrado",
      code: "NOT_FOUND",
      path: req.path,
      method: req.method
    });
  });
}
