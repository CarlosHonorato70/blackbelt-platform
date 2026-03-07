/**
 * Configuracao de ambiente centralizada com validacao de seguranca.
 * NUNCA use valores default com credenciais reais.
 *
 * Em producao:
 *  - Todas as variaveis OBRIGATORIAS devem ser definidas
 *  - COOKIE_SECRET deve ter >= 64 chars (256-bit HMAC)
 *  - DATABASE_URL nao pode ter senha vazia
 */

const isProduction = process.env.NODE_ENV === "production";

// ============================================================================
// Helpers de validacao
// ============================================================================

const warnings: string[] = [];

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value && isProduction) {
    throw new Error(`[ENV] Variavel de ambiente obrigatoria nao definida: ${name}`);
  }
  return value ?? "";
}

/**
 * Exige uma variavel de ambiente que contem um secret.
 * Em producao: valida comprimento minimo.
 * Em dev: aceita fallback mas loga warning se parece placeholder.
 */
function requireSecret(name: string, fallback: string | undefined, minLength: number = 32): string {
  const value = process.env[name] ?? fallback;

  if (!value && isProduction) {
    throw new Error(`[ENV] Secret obrigatorio nao definido: ${name}`);
  }

  if (!value) return "";

  // Em producao, exigir comprimento minimo
  if (isProduction && value.length < minLength) {
    throw new Error(
      `[ENV] ${name} muito curto (${value.length} chars). Minimo: ${minLength} chars. ` +
      `Gere com: node -e "console.log(require('crypto').randomBytes(${Math.ceil(minLength / 2)}).toString('hex'))"`
    );
  }

  // Warning se parece placeholder (em qualquer ambiente)
  const placeholderPatterns = ["change", "secret", "default", "example", "placeholder", "todo"];
  const lowerValue = value.toLowerCase();
  if (placeholderPatterns.some((p) => lowerValue.includes(p))) {
    warnings.push(`[ENV] WARNING: ${name} parece ser um placeholder. Altere antes do deploy!`);
  }

  return value;
}

/** Valida que DATABASE_URL nao tem senha vazia em producao */
function validateDatabaseUrl(url: string): string {
  if (isProduction) {
    // Patterns inseguros: root sem senha, user: sem senha
    if (/\/\/\w+:@/.test(url) || /\/\/root:@/.test(url)) {
      throw new Error(
        "[ENV] DATABASE_URL em producao nao pode ter senha vazia. " +
        "Configure uma senha forte para o usuario do banco."
      );
    }
  }
  return url;
}

// ============================================================================
// ENV Object
// ============================================================================

export const ENV = {
  // Seguranca - em producao: >= 64 chars (256-bit HMAC)
  cookieSecret: requireSecret(
    "COOKIE_SECRET",
    isProduction ? undefined : "dev-only-secret-change-in-production-this-is-long-enough-for-tests",
    64
  ),

  // Banco de dados MySQL
  databaseUrl: validateDatabaseUrl(
    requireEnv("DATABASE_URL", "mysql://root:@localhost:3306/blackbelt")
  ),

  // Ambiente
  isProduction,
  nodeEnv: process.env.NODE_ENV ?? "development",

  // App
  appTitle: process.env.VITE_APP_TITLE ?? "Black Belt Consultoria",
  appLogo: process.env.VITE_APP_LOGO ?? "/logo.png",

  // Frontend URL (para CORS) - obrigatorio em producao
  frontendUrl: requireEnv("FRONTEND_URL", isProduction ? undefined : "http://localhost:5000"),

  // Porta do servidor
  port: parseInt(process.env.PORT ?? "5000", 10),
};

// ============================================================================
// Startup validation — loga warnings acumulados
// ============================================================================

/**
 * Chamado no boot do server para logar warnings de secrets.
 * Nao impede o startup — apenas alerta.
 */
export function logSecurityWarnings(): void {
  if (warnings.length === 0) return;

  for (const w of warnings) {
    console.warn(w);
  }

  if (isProduction) {
    console.error(
      `[ENV] ${warnings.length} warning(s) de seguranca detectados em PRODUCAO. ` +
      "Corrija antes do deploy!"
    );
  }
}
