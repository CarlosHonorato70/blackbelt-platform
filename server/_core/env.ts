/**
 * Configuracao de ambiente centralizada
 * NUNCA use valores default com credenciais reais
 */

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`[ENV] Variavel de ambiente obrigatoria nao definida: ${name}`);
  }
  return value ?? "";
}

export const ENV = {
  // Seguranca - em producao, DEVE ser definido via variavel de ambiente
  cookieSecret: requireEnv("COOKIE_SECRET", process.env.NODE_ENV === "production" ? undefined : "dev-only-secret-change-in-production"),

  // Banco de dados MySQL (XAMPP)
  databaseUrl: requireEnv("DATABASE_URL", "mysql://root:@localhost:3306/blackbelt"),

  // Ambiente
  isProduction: process.env.NODE_ENV === "production",
  nodeEnv: process.env.NODE_ENV ?? "development",

  // App
  appTitle: process.env.VITE_APP_TITLE ?? "Black Belt Consultoria",
  appLogo: process.env.VITE_APP_LOGO ?? "/logo.png",

  // Frontend URL (para CORS)
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5000",

  // Porta do servidor
  port: parseInt(process.env.PORT ?? "5000", 10),
};
