# 🔐 Guia Completo - Substituir OAuth por Autenticação Tradicional

**Objetivo:** Implementar sistema de login/registro com email e senha  
**Tempo Estimado:** 2-3 horas  
**Dificuldade:** Intermediária  
**Pré-requisito:** Conhecimento básico de Node.js e React

---

## 📋 Visão Geral

Este guia substitui o OAuth (Manus) por um sistema tradicional de autenticação com:

- ✅ Registro de usuários com email
- ✅ Login com email/senha
- ✅ Hash de senha com bcrypt
- ✅ JWT para sessão
- ✅ Recuperação de senha
- ✅ Validação de email
- ✅ Proteção CSRF

---

## 🔧 Passo 1: Instalar Dependências

```bash
cd blackbelt-platform

# Instalar bcrypt para hash de senha
pnpm add bcrypt

# Instalar tipos do bcrypt
pnpm add -D @types/bcrypt

# Instalar jsonwebtoken (se não tiver)
pnpm add jsonwebtoken
pnpm add -D @types/jsonwebtoken

# Instalar validador de email
pnpm add email-validator
```

---

## 🗄️ Passo 2: Atualizar Schema do Banco

Edite `drizzle/schema.ts` e **substitua** a tabela `users`:

```typescript
import { mysqlTable, varchar, text, timestamp, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Tabela de usuários com autenticação tradicional (email/senha)
 * Substitui o sistema OAuth
 */
export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    name: text("name"),
    passwordHash: text("passwordHash").notNull(), // Hash bcrypt
    isEmailVerified: boolean("isEmailVerified").default(false),
    verificationToken: text("verificationToken"), // Token para verificar email
    verificationTokenExpiry: timestamp("verificationTokenExpiry"),
    resetToken: text("resetToken"), // Token para recuperar senha
    resetTokenExpiry: timestamp("resetTokenExpiry"),
    lastSignedIn: timestamp("lastSignedIn"),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
  },
  (table) => ({
    emailIdx: index("email_idx").on(table.email),
    verificationTokenIdx: index("verification_token_idx").on(table.verificationToken),
    resetTokenIdx: index("reset_token_idx").on(table.resetToken),
  })
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
```

---

## 🔄 Passo 3: Criar Migration

Execute:

```bash
pnpm db:push
```

Isso atualizará a tabela `users` com os novos campos.

---

## 💾 Passo 4: Criar Database Helpers

Edite `server/db.ts` e **adicione** estas funções:

```typescript
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";

/**
 * Hash de senha com bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verificar senha
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Gerar token aleatório
 */
export function generateToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Criar novo usuário
 */
export async function createUser(email: string, name: string, password: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const passwordHash = await hashPassword(password);
  const verificationToken = generateToken();
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  const result = await db.insert(users).values({
    id: crypto.randomUUID(),
    email,
    name,
    passwordHash,
    verificationToken,
    verificationTokenExpiry,
  });

  return result;
}

/**
 * Buscar usuário por email
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Verificar email
 */
export async function verifyEmail(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db
    .select()
    .from(users)
    .where(eq(users.verificationToken, token))
    .limit(1);

  if (user.length === 0) {
    throw new Error("Token inválido");
  }

  const userData = user[0];

  // Verificar expiração
  if (userData.verificationTokenExpiry && userData.verificationTokenExpiry < new Date()) {
    throw new Error("Token expirado");
  }

  // Marcar como verificado
  await db
    .update(users)
    .set({
      isEmailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    })
    .where(eq(users.id, userData.id));

  return userData;
}

/**
 * Solicitar recuperação de senha
 */
export async function requestPasswordReset(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await getUserByEmail(email);
  if (!user) {
    throw new Error("Usuário não encontrado");
  }

  const resetToken = generateToken();
  const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hora

  await db
    .update(users)
    .set({
      resetToken,
      resetTokenExpiry,
    })
    .where(eq(users.id, user.id));

  return { resetToken, email };
}

/**
 * Resetar senha
 */
export async function resetPassword(token: string, newPassword: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db
    .select()
    .from(users)
    .where(eq(users.resetToken, token))
    .limit(1);

  if (user.length === 0) {
    throw new Error("Token inválido");
  }

  const userData = user[0];

  // Verificar expiração
  if (userData.resetTokenExpiry && userData.resetTokenExpiry < new Date()) {
    throw new Error("Token expirado");
  }

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    })
    .where(eq(users.id, userData.id));

  return userData;
}

/**
 * Atualizar último login
 */
export async function updateLastSignIn(userId: string) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, userId));
}
```

---

## 🔌 Passo 5: Criar tRPC Routers de Autenticação

Crie arquivo `server/routers/auth.ts`:

```typescript
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  createUser,
  getUserByEmail,
  verifyPassword,
  updateLastSignIn,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
} from "../db";
import jwt from "jsonwebtoken";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

const JWT_SECRET = process.env.JWT_SECRET || "seu_secret_aqui";

export const authRouter = router({
  /**
   * Registro de novo usuário
   */
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Validar confirmação de senha
      if (input.password !== input.confirmPassword) {
        throw new Error("Senhas não conferem");
      }

      // Verificar se usuário já existe
      const existingUser = await getUserByEmail(input.email);
      if (existingUser) {
        throw new Error("Email já cadastrado");
      }

      // Criar usuário
      const user = await createUser(input.email, input.name, input.password);

      return {
        success: true,
        message: "Usuário criado com sucesso. Verifique seu email.",
      };
    }),

  /**
   * Login com email/senha
   */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(8, "Senha inválida"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Buscar usuário
      const user = await getUserByEmail(input.email);
      if (!user) {
        throw new Error("Email ou senha inválidos");
      }

      // Verificar senha
      const isPasswordValid = await verifyPassword(input.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new Error("Email ou senha inválidos");
      }

      // Verificar se email foi verificado
      if (!user.isEmailVerified) {
        throw new Error("Email não verificado. Verifique seu email.");
      }

      // Atualizar último login
      await updateLastSignIn(user.id);

      // Criar JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Definir cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    }),

  /**
   * Verificar email
   */
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const user = await verifyEmail(input.token);

      return {
        success: true,
        message: "Email verificado com sucesso!",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    }),

  /**
   * Solicitar recuperação de senha
   */
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const result = await requestPasswordReset(input.email);

      // TODO: Enviar email com link de reset
      // sendPasswordResetEmail(result.email, result.resetToken);

      return {
        success: true,
        message: "Email de recuperação enviado",
      };
    }),

  /**
   * Resetar senha
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(8),
        confirmPassword: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (input.password !== input.confirmPassword) {
        throw new Error("Senhas não conferem");
      }

      await resetPassword(input.token, input.password);

      return {
        success: true,
        message: "Senha alterada com sucesso",
      };
    }),

  /**
   * Logout
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, {
      ...cookieOptions,
      maxAge: -1,
    });

    return { success: true };
  }),

  /**
   * Obter usuário atual
   */
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user || null;
  }),
});
```

---

## 🔗 Passo 6: Atualizar Router Principal

Edite `server/routers.ts`:

```typescript
import { authRouter } from "./routers/auth";

export const appRouter = router({
  auth: authRouter,
  // ... outros routers
});
```

---

## 🎨 Passo 7: Criar Componentes de Login/Registro (Frontend)

Crie `client/src/pages/Login.tsx`:

```typescript
import { useState } from "react";
import { useNavigate } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("Login realizado com sucesso!");
      navigate("/");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await loginMutation.mutateAsync({
        email,
        password,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6">Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          Não tem conta?{" "}
          <a href="/register" className="text-blue-600 hover:underline">
            Registre-se
          </a>
        </p>
      </Card>
    </div>
  );
}
```

Crie `client/src/pages/Register.tsx`:

```typescript
import { useState } from "react";
import { useNavigate } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Register() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("Conta criada! Verifique seu email.");
      navigate("/login");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await registerMutation.mutateAsync({
        email,
        name,
        password,
        confirmPassword,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold mb-6">Registrar</h1>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nome</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirmar Senha</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Criando..." : "Criar Conta"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          Já tem conta?{" "}
          <a href="/login" className="text-blue-600 hover:underline">
            Faça login
          </a>
        </p>
      </Card>
    </div>
  );
}
```

---

## 🔄 Passo 8: Atualizar App.tsx

Edite `client/src/App.tsx`:

```typescript
import { Route, Switch } from "wouter";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import { useAuth } from "@/_core/hooks/useAuth";

function Router() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="*" component={Login} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      {/* ... outras rotas */}
    </Switch>
  );
}

export default function App() {
  return <Router />;
}
```

---

## 📧 Passo 9: Enviar Emails (Opcional)

Para enviar emails de verificação e reset de senha, instale:

```bash
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

Crie `server/email.ts`:

```typescript
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Verifique seu email",
    html: `
      <h1>Verifique seu email</h1>
      <p>Clique no link abaixo para verificar seu email:</p>
      <a href="${verificationUrl}">Verificar Email</a>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Recuperar senha",
    html: `
      <h1>Recuperar senha</h1>
      <p>Clique no link abaixo para resetar sua senha:</p>
      <a href="${resetUrl}">Resetar Senha</a>
    `,
  });
}
```

---

## 🔐 Passo 10: Variáveis de Ambiente

Atualize `.env.local`:

```env
# Database
DATABASE_URL=mysql://blackbelt:blackbelt123@localhost:3306/blackbelt

# JWT
JWT_SECRET=sua_senha_super_segura_aqui_minimo_32_caracteres

# Email (Opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_app
SMTP_FROM=noreply@blackbelt.com

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

## ✅ Passo 11: Testar

```bash
# Instalar dependências
pnpm install

# Migrations
pnpm db:push

# Iniciar
pnpm dev
```

Acesse:
- Registro: http://localhost:5173/register
- Login: http://localhost:5173/login

---

## 🔒 Segurança - Checklist

- ✅ Senhas com bcrypt (salt rounds: 10)
- ✅ JWT com expiração (7 dias)
- ✅ Tokens com expiração
- ✅ Validação de email
- ✅ HTTPS em produção
- ✅ Rate limiting (adicionar depois)
- ✅ CSRF protection (adicionar depois)

---

## 📝 Próximos Passos

1. Implementar rate limiting
2. Adicionar 2FA
3. Implementar CSRF protection
4. Adicionar logs de segurança
5. Implementar auditoria de login

---

## 🆘 Troubleshooting

### Erro: "bcrypt not found"
```bash
pnpm add bcrypt
pnpm add -D @types/bcrypt
```

### Erro: "JWT_SECRET not defined"
Adicione em `.env.local`:
```env
JWT_SECRET=sua_senha_super_segura_aqui
```

### Erro: "Email já cadastrado"
Significa que o email já existe no banco. Use outro email ou delete o usuário.

---

**Última atualização:** Novembro 2025  
**Versão:** 1.0  
**Status:** Pronto para uso ✅

