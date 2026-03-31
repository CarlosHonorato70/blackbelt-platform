/**
 * Reset script — limpa dados de usuarios/tenants preservando planos, roles e permissoes.
 * Usage: node drizzle/reset-users.js [local|prod|both]
 */
const mysql = require("mysql2/promise");

const LOCAL_URL = "mysql://blackbelt:gqkY2hbGSxzOLc6L2100IPKR@localhost:3307/blackbelt";
const PROD_URL = "mysql://3uPxJdZd8x3KCNp.root:1ArZhMo9qtWDBIhh@gateway01.eu-central-1.prod.aws.tidbcloud.com:4000/blackbelt";

// Ordem de DELETE respeita dependencias (filhas antes de pais)
const TABLES_TO_CLEAR = [
  // Mensagens de ticket (depende de tickets)
  "ticket_messages",
  // Tickets (depende de tenants/users)
  "support_tickets",
  // Sessoes e login
  "sessions",
  "login_attempts",
  // 2FA
  "user_2fa",
  // Convites
  "user_invites",
  // RBAC usuario (depende de users)
  "user_roles",
  // Audit / security
  "audit_logs",
  "security_alerts",
  // Data consents
  "data_consents",
  // DSR requests (LGPD)
  "dsr_requests",
  // Onboarding
  "onboarding_progress",
  // Usage metrics
  "usage_metrics",
  // Invoices (depende de subscriptions)
  "invoices",
  // PDF exports
  "pdf_exports",
  // Webhooks
  "webhook_deliveries",
  "webhooks",
  // API keys
  "api_key_usage",
  "api_keys",
  // IP whitelist
  "ip_whitelist",
  // NR-01: COPSOQ (ordem: reminders > invites > responses > reports > assessments)
  "copsoq_reminders",
  "copsoq_invites",
  "copsoq_responses",
  "copsoq_reports",
  "copsoq_assessments",
  // NR-01: Programs
  "individual_sessions",
  "program_participants",
  "intervention_programs",
  // NR-01: Surveys
  "survey_responses",
  "psychosocial_surveys",
  // NR-01: Mental health
  "mental_health_indicators",
  // NR-01: Compliance
  "compliance_documents",
  // NR-01: Action plans
  "action_plans",
  // NR-01: Risk assessments
  "risk_assessment_items",
  "risk_assessments",
  // Proposals
  "assessment_proposals",
  "proposal_items",
  "proposals",
  // Pricing / services / clients
  "pricing_parameters",
  "services",
  "clients",
  // People / sectors (depende de tenants)
  "people",
  "sectors",
  // Tenant settings
  "tenant_settings",
  // Subscriptions (depende de tenants e plans)
  "subscriptions",
  // Users (depende de tenants)
  "users",
  // Tenants (pai de tudo)
  "tenants",
];

async function resetDB(url, label) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Resetando: ${label}`);
  console.log(`${"=".repeat(60)}`);

  const conn = await mysql.createConnection({
    uri: url,
    ssl: url.includes("tidbcloud") ? { rejectUnauthorized: true } : undefined,
  });

  // Desabilitar FK checks temporariamente
  await conn.execute("SET FOREIGN_KEY_CHECKS = 0");

  for (const table of TABLES_TO_CLEAR) {
    try {
      const [rows] = await conn.execute(`SELECT COUNT(*) as c FROM \`${table}\``);
      const count = rows[0].c;
      if (count > 0) {
        await conn.execute(`DELETE FROM \`${table}\``);
        console.log(`  [OK] ${table}: ${count} registros removidos`);
      } else {
        console.log(`  [--] ${table}: vazia`);
      }
    } catch (err) {
      if (err.code === "ER_NO_SUCH_TABLE" || err.message.includes("doesn't exist")) {
        console.log(`  [??] ${table}: tabela nao existe (ok)`);
      } else {
        console.log(`  [ERRO] ${table}: ${err.message}`);
      }
    }
  }

  // Reabilitar FK checks
  await conn.execute("SET FOREIGN_KEY_CHECKS = 1");

  // Verificar o que sobrou
  const [preserved] = await conn.execute("SELECT COUNT(*) as c FROM plans");
  const [preserved2] = await conn.execute("SELECT COUNT(*) as c FROM roles");
  const [preserved3] = await conn.execute("SELECT COUNT(*) as c FROM permissions");
  console.log(`\nPreservados: ${preserved[0].c} planos, ${preserved2[0].c} perfis, ${preserved3[0].c} permissoes`);

  await conn.end();
  console.log(`${label} resetado com sucesso!`);
}

async function main() {
  const target = process.argv[2] || "both";

  if (target === "local" || target === "both") {
    try {
      await resetDB(LOCAL_URL, "LOCAL (Docker)");
    } catch (err) {
      console.log(`\nLocal nao disponivel: ${err.message}`);
    }
  }

  if (target === "prod" || target === "both") {
    await resetDB(PROD_URL, "PRODUCAO (TiDB Cloud)");
  }

  console.log("\nReset completo! Agora execute o seed:");
  console.log('ADMIN_EMAIL=psicarloshonorato@gmail.com ADMIN_PASSWORD="Znfn23@bc@#$%" pnpm db:seed');
}

main().catch(console.error);
