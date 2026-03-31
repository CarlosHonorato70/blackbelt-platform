import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb, checkDbHealth } from "../db";
import { monitoringChecks, maintenanceRequests } from "../../drizzle/schema";
import { publicProcedure } from "../_core/trpc";
import { agentConversations, agentMessages } from "../../drizzle/schema_agent";
import { copsoqAssessments, riskAssessments, actionPlans, complianceCertificates } from "../../drizzle/schema_nr01";
import { desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { log } from "../_core/logger";
import { sendEmail } from "../_core/email";
import { invokeLLM } from "../_core/llm";
import { runAllE2ETests } from "../_core/e2eTests";
import fs from "fs";
import path from "path";
import os from "os";

const ALERT_EMAIL = "psicarloshonorato@gmail.com";
const MEMORY_WARN_PERCENT = 75;
const MEMORY_CRIT_PERCENT = 90;
const ERROR_WARN_THRESHOLD = 5;
const ERROR_CRIT_THRESHOLD = 20;

// Shared logic used by both the router and the background agent
export async function runMonitoringCheck(): Promise<{
  status: "ok" | "warning" | "critical";
  app: { uptime: number; nodeVersion: string; pid: number };
  memory: { heapUsedMB: number; heapTotalMB: number; maxHeapMB: number; rssMB: number; heapPercent: number; memoryStatus: string };
  database: { connected: boolean };
  errors24h: number;
  disk: { totalGB: number; freeGB: number; usedPercent: number };
  lastBackup: { file: string; sizeMB: number; date: string } | null;
}> {
  // Memory
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  // Use max heap size (--max-old-space-size or V8 default) as denominator, not dynamic heapTotal
  const v8 = await import("v8");
  const heapStats = v8.getHeapStatistics();
  const maxHeapMB = Math.round(heapStats.heap_size_limit / 1024 / 1024);
  const heapPercent = Math.round((mem.heapUsed / heapStats.heap_size_limit) * 100);

  let memoryStatus: "ok" | "warning" | "critical" = "ok";
  if (heapPercent >= MEMORY_CRIT_PERCENT) memoryStatus = "critical";
  else if (heapPercent >= MEMORY_WARN_PERCENT) memoryStatus = "warning";

  // Database
  const dbConnected = await checkDbHealth();

  // Error count (last 24h) — count JSON log entries with timestamp in last 24h
  let errors24h = 0;
  try {
    const logsDir = path.resolve("logs");
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir).filter(f => f.startsWith("error-"));
      const cutoff = new Date(Date.now() - 86400000);
      for (const file of files) {
        const stat = fs.statSync(path.join(logsDir, file));
        if (Date.now() - stat.mtimeMs < 86400000) {
          const content = fs.readFileSync(path.join(logsDir, file), "utf-8");
          const lines = content.split("\n").filter(l => l.trim());
          for (const line of lines) {
            try {
              const entry = JSON.parse(line);
              if (entry.timestamp) {
                // Normalize "YYYY-MM-DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS" for ISO compatibility
                const ts = new Date(String(entry.timestamp).replace(" ", "T"));
                if (!isNaN(ts.getTime()) && ts > cutoff) errors24h++;
                else if (isNaN(ts.getTime())) errors24h++; // unparseable timestamp still counts
              }
            } catch { errors24h++; } // Count non-JSON lines too
          }
        }
      }
    }
  } catch { /* ignore */ }

  // System RAM — use /proc/meminfo for accurate "available" (includes buff/cache)
  let totalGB = 0, freeGB = 0, usedPercent = 0;
  try {
    const meminfo = fs.readFileSync("/proc/meminfo", "utf-8");
    const getKB = (key: string) => {
      const m = meminfo.match(new RegExp(`${key}:\\s+(\\d+)`));
      return m ? parseInt(m[1], 10) : 0;
    };
    const totalKB = getKB("MemTotal");
    const availKB = getKB("MemAvailable") || (getKB("MemFree") + getKB("Buffers") + getKB("Cached"));
    totalGB = Math.round(totalKB / 1024 / 1024 * 10) / 10;
    freeGB = Math.round(availKB / 1024 / 1024 * 10) / 10;
    usedPercent = totalKB > 0 ? Math.round(((totalKB - availKB) / totalKB) * 100) : 0;
  } catch {
    // Fallback for non-Linux
    const total = os.totalmem();
    const free = os.freemem();
    totalGB = Math.round(total / 1024 / 1024 / 1024 * 10) / 10;
    freeGB = Math.round(free / 1024 / 1024 / 1024 * 10) / 10;
    usedPercent = Math.round(((total - free) / total) * 100);
  }

  // Last backup
  let lastBackup: { file: string; sizeMB: number; date: string } | null = null;
  try {
    const backupDirs = ["/backups", path.resolve("backups")];
    for (const dir of backupDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir)
          .filter(f => f.endsWith(".sql.gz"))
          .sort()
          .reverse();
        if (files.length > 0) {
          const stat = fs.statSync(path.join(dir, files[0]));
          lastBackup = {
            file: files[0],
            sizeMB: Math.round(stat.size / 1024 / 1024 * 100) / 100,
            date: stat.mtime.toISOString(),
          };
        }
        break;
      }
    }
  } catch { /* ignore */ }

  // Overall status
  let status: "ok" | "warning" | "critical" = "ok";
  if (!dbConnected || memoryStatus === "critical" || errors24h >= ERROR_CRIT_THRESHOLD) {
    status = "critical";
  } else if (memoryStatus === "warning" || errors24h >= ERROR_WARN_THRESHOLD) {
    status = "warning";
  }

  return {
    status,
    app: { uptime: Math.floor(process.uptime()), nodeVersion: process.version, pid: process.pid },
    memory: { heapUsedMB, heapTotalMB, maxHeapMB, rssMB, heapPercent, memoryStatus },
    database: { connected: dbConnected },
    errors24h,
    disk: { totalGB, freeGB, usedPercent },
    lastBackup,
  };
}

export async function saveCheckAndAlert(result: Awaited<ReturnType<typeof runMonitoringCheck>>): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const alertSent = result.status !== "ok";

    await db.insert(monitoringChecks).values({
      id: nanoid(),
      status: result.status,
      details: JSON.stringify(result),
      alertSent,
      checkedAt: new Date(),
    });

    if (alertSent) {
      const problems: string[] = [];
      if (!result.database.connected) problems.push("Banco de dados desconectado");
      if (result.memory.memoryStatus === "critical") problems.push(`Memoria critica: ${result.memory.heapPercent}%`);
      if (result.memory.memoryStatus === "warning") problems.push(`Memoria alta: ${result.memory.heapPercent}%`);
      if (result.errors24h >= ERROR_CRIT_THRESHOLD) problems.push(`${result.errors24h} erros nas ultimas 24h`);
      else if (result.errors24h >= ERROR_WARN_THRESHOLD) problems.push(`${result.errors24h} erros nas ultimas 24h`);

      await sendEmail({
        to: ALERT_EMAIL,
        subject: `[BlackBelt] Alerta: ${result.status.toUpperCase()} - Plataforma com problemas`,
        html: `
          <h2>Alerta de Monitoramento - BlackBelt Platform</h2>
          <p><strong>Status:</strong> ${result.status.toUpperCase()}</p>
          <p><strong>Problemas detectados:</strong></p>
          <ul>${problems.map(p => `<li>${p}</li>`).join("")}</ul>
          <hr>
          <p><strong>Uptime:</strong> ${Math.floor(result.app.uptime / 3600)}h ${Math.floor((result.app.uptime % 3600) / 60)}m</p>
          <p><strong>Memoria:</strong> ${result.memory.heapUsedMB}MB / ${result.memory.heapTotalMB}MB (${result.memory.heapPercent}%)</p>
          <p><strong>Banco:</strong> ${result.database.connected ? "Conectado" : "DESCONECTADO"}</p>
          <p><strong>Erros 24h:</strong> ${result.errors24h}</p>
          <p style="color:#888;font-size:12px">Verificacao automatica - BlackBelt Platform</p>
        `,
      });

      log.warn(`[Monitoring] Alert sent: ${result.status}`, { problems });

      // Create maintenance request for Claude Code to pick up
      const maintenanceType = !result.database.connected ? "db_down"
        : result.memory.memoryStatus === "critical" ? "ram_high"
        : result.errors24h >= ERROR_CRIT_THRESHOLD ? "errors_spike"
        : result.disk.usedPercent >= 90 ? "disk_full"
        : "general";

      // Avoid duplicates — only create if no pending request of same type
      const existing = await db.select({ id: maintenanceRequests.id })
        .from(maintenanceRequests)
        .where(sql`${maintenanceRequests.status} = 'pending' AND ${maintenanceRequests.type} = ${maintenanceType}`)
        .limit(1);

      if (existing.length === 0) {
        await db.insert(maintenanceRequests).values({
          id: nanoid(),
          type: maintenanceType,
          status: "pending",
          details: JSON.stringify({ problems, snapshot: result }),
          requestedAt: new Date(),
        });
        log.info(`[Monitoring] Maintenance request created: ${maintenanceType}`);
      }
    }

    // Clean old checks (keep last 500)
    const count = await db.select({ count: sql<number>`count(*)` }).from(monitoringChecks);
    if (count[0]?.count > 500) {
      const oldest = await db.select({ id: monitoringChecks.id })
        .from(monitoringChecks)
        .orderBy(desc(monitoringChecks.checkedAt))
        .offset(500)
        .limit(100);
      if (oldest.length > 0) {
        const ids = oldest.map(r => r.id);
        await db.delete(monitoringChecks).where(
          sql`${monitoringChecks.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`
        );
      }
    }
  } catch (err) {
    log.error("[Monitoring] Failed to save check", { error: String(err) });
  }
}

// ============================================================================
// KLINIKOS — SamurAI Flow Health Check
// Fluxo de 18 etapas (ver Fluxograma_SamurAI_BlackBelt.pdf)
// ============================================================================

const SAMURAI_PHASE_LABELS: Record<string, string> = {
  create_assessment:       "Etapa 10 — Enviar COPSOQ",
  awaiting_responses:      "Etapa 11 — Aguardando Respostas",
  generate_inventory:      "Etapa 12/13 — Gerar Relatório + Inventário",
  create_training:         "Etapa 14 — Plano de Ação / Treinamento",
  complete_checklist:      "Etapa 15 — Checklist de Conformidade",
  generate_final_proposal: "Etapa 15 — Gerar Proposta Final",
  awaiting_final_approval: "Etapa 16 — Aguardando Aprovação Final",
  awaiting_payment:        "Etapa 16 — Aguardando Pagamento",
  completed:               "Etapa 18 — Concluído",
  unknown:                 "Fase desconhecida",
};

// Horas sem atividade para considerar "travado"
const STUCK_HOURS: Record<string, number> = {
  awaiting_responses:      168, // 7 dias (prazo do COPSOQ)
  awaiting_final_approval: 240, // 10 dias (aguarda decisão da empresa)
  awaiting_payment:        240, // 10 dias
  default:                  48, // 2 dias para fases de execução
};

export async function runSamurAIHealthCheck(): Promise<{
  totalFlows: number;
  activeFlows: number;
  completedFlows: number;
  stuckFlows: Array<{
    conversationId: string;
    companyId: string | null;
    tenantId: string;
    phase: string;
    phaseLabel: string;
    lastActivity: string;
    daysSinceActivity: number;
  }>;
  phaseDistribution: Array<{ phase: string; label: string; count: number }>;
  dataIntegrity: {
    copsoqTotal: number;
    copsoqInProgress: number;
    copsoqCompleted: number;
    riskAssessmentsTotal: number;
    actionPlansTotal: number;
    certificatesTotal: number;
  };
}> {
  const empty = {
    totalFlows: 0, activeFlows: 0, completedFlows: 0,
    stuckFlows: [], phaseDistribution: [],
    dataIntegrity: { copsoqTotal: 0, copsoqInProgress: 0, copsoqCompleted: 0, riskAssessmentsTotal: 0, actionPlansTotal: 0, certificatesTotal: 0 },
  };

  try {
    const db = await getDb();
    if (!db) return empty;
    const now = Date.now();

    // 1. Todas as conversas reais do SamurAI (exclui monitoring-agent e suporte)
    const conversations = await db
      .select({ id: agentConversations.id, tenantId: agentConversations.tenantId, companyId: agentConversations.companyId, phase: agentConversations.phase, updatedAt: agentConversations.updatedAt })
      .from(agentConversations)
      .where(sql`${agentConversations.companyId} IS NOT NULL AND ${agentConversations.companyId} NOT IN ('monitoring-agent', 'support-agent')`);

    const totalFlows = conversations.length;
    const completedFlows = conversations.filter(c => c.phase === "completed").length;

    const stuckFlows = conversations
      .filter(c => c.phase !== "completed")
      .filter(c => {
        if (!c.updatedAt) return false;
        const basePhase = (c.phase ?? "").split(":")[0];
        const threshold = STUCK_HOURS[basePhase] ?? STUCK_HOURS.default;
        const hoursSince = (now - new Date(c.updatedAt).getTime()) / 3600000;
        return hoursSince > threshold;
      })
      .map(c => {
        const basePhase = (c.phase ?? "unknown").split(":")[0];
        const hoursSince = (now - new Date(c.updatedAt!).getTime()) / 3600000;
        return {
          conversationId: c.id,
          companyId: c.companyId ?? null,
          tenantId: c.tenantId,
          phase: c.phase ?? "unknown",
          phaseLabel: SAMURAI_PHASE_LABELS[basePhase] ?? SAMURAI_PHASE_LABELS.unknown,
          lastActivity: c.updatedAt!.toISOString(),
          daysSinceActivity: Math.floor(hoursSince / 24),
        };
      });

    const activeFlows = totalFlows - completedFlows - stuckFlows.length;

    // Distribuição por fase
    const phaseMap: Record<string, number> = {};
    for (const c of conversations) {
      const base = (c.phase ?? "unknown").split(":")[0];
      phaseMap[base] = (phaseMap[base] || 0) + 1;
    }
    const phaseDistribution = Object.entries(phaseMap).map(([phase, count]) => ({
      phase,
      label: SAMURAI_PHASE_LABELS[phase] ?? phase,
      count,
    }));

    // 2. Integridade de dados
    const [cTotal] = await db.select({ n: sql<number>`count(*)` }).from(copsoqAssessments);
    const [cProgress] = await db.select({ n: sql<number>`count(*)` }).from(copsoqAssessments).where(eq(copsoqAssessments.status, "in_progress"));
    const [cDone] = await db.select({ n: sql<number>`count(*)` }).from(copsoqAssessments).where(sql`${copsoqAssessments.status} IN ('completed','reviewed')`);
    const [rTotal] = await db.select({ n: sql<number>`count(*)` }).from(riskAssessments);
    const [aTotal] = await db.select({ n: sql<number>`count(*)` }).from(actionPlans);
    const [certTotal] = await db.select({ n: sql<number>`count(*)` }).from(complianceCertificates);

    return {
      totalFlows,
      activeFlows,
      completedFlows,
      stuckFlows,
      phaseDistribution,
      dataIntegrity: {
        copsoqTotal:           Number(cTotal?.n ?? 0),
        copsoqInProgress:      Number(cProgress?.n ?? 0),
        copsoqCompleted:       Number(cDone?.n ?? 0),
        riskAssessmentsTotal:  Number(rTotal?.n ?? 0),
        actionPlansTotal:      Number(aTotal?.n ?? 0),
        certificatesTotal:     Number(certTotal?.n ?? 0),
      },
    };
  } catch (err) {
    log.error("[Klinikos] runSamurAIHealthCheck failed", { error: String(err) });
    return empty;
  }
}

// ============================================================================
// KLINIKOS — Code Integrity Check
// Monitora: E2E tests, padrões de erro, dependências, estado do build
// ============================================================================

export async function runCodeIntegrityCheck(): Promise<{
  score: number; // 0-100
  status: "ok" | "warning" | "critical";
  e2e: { lastRun: string | null; passed: number; total: number; status: string };
  errorPatterns: Array<{ message: string; count: number }>;
  buildArtifact: { exists: boolean; ageMins: number | null };
  auditIssues: number;
  summary: string[];
}> {
  const result = {
    score: 100,
    status: "ok" as "ok" | "warning" | "critical",
    e2e: { lastRun: null as string | null, passed: 0, total: 0, status: "never_run" },
    errorPatterns: [] as Array<{ message: string; count: number }>,
    buildArtifact: { exists: false, ageMins: null as number | null },
    auditIssues: 0,
    summary: [] as string[],
  };

  // 1. Último resultado de E2E (da tabela monitoringChecks)
  try {
    const db = await getDb();
    if (db) {
      const rows = await db.select()
        .from(monitoringChecks)
        .where(sql`JSON_EXTRACT(details, '$.e2eTests') IS NOT NULL`)
        .orderBy(desc(monitoringChecks.checkedAt))
        .limit(1);
      if (rows.length > 0) {
        const d = typeof rows[0].details === "string" ? JSON.parse(rows[0].details) : rows[0].details;
        const e2e = d?.e2eTests;
        if (e2e) {
          result.e2e = {
            lastRun: rows[0].checkedAt?.toISOString() ?? null,
            passed: e2e.passedTests ?? 0,
            total: e2e.totalTests ?? 0,
            status: e2e.passed ? "passing" : "failing",
          };
          if (!e2e.passed) {
            result.score -= 30;
            result.summary.push(`E2E: ${e2e.passedTests}/${e2e.totalTests} testes passaram`);
          } else {
            result.summary.push(`E2E: ${e2e.passedTests}/${e2e.totalTests} ✅`);
          }
        }
      } else {
        result.summary.push("E2E: nenhum teste registrado ainda");
      }
    }
  } catch { /* ignore */ }

  // 2. Padrões de erro nos logs (últimas 24h)
  try {
    const logsDir = path.resolve("logs");
    const errorMap: Record<string, number> = {};
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir).filter(f => f.startsWith("error-")).sort().reverse();
      const cutoff = Date.now() - 86400000;
      for (const file of files.slice(0, 3)) {
        const content = fs.readFileSync(path.join(logsDir, file), "utf-8");
        for (const line of content.split("\n").filter(l => l.trim())) {
          try {
            const entry = JSON.parse(line);
            const tsNorm = new Date(String(entry.timestamp || "").replace(" ", "T"));
            if (entry.timestamp && !isNaN(tsNorm.getTime()) && tsNorm.getTime() > cutoff) {
              const key = (entry.message || entry.msg || "unknown").slice(0, 80);
              errorMap[key] = (errorMap[key] || 0) + 1;
            }
          } catch { /* skip */ }
        }
      }
    }
    result.errorPatterns = Object.entries(errorMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }));
    const totalErrors = Object.values(errorMap).reduce((a, b) => a + b, 0);
    if (totalErrors >= 20) { result.score -= 20; result.summary.push(`${totalErrors} erros recorrentes em 24h`); }
    else if (totalErrors >= 5) { result.score -= 10; result.summary.push(`${totalErrors} erros em 24h`); }
    else { result.summary.push(`Erros 24h: ${totalErrors} ✅`); }
  } catch { /* ignore */ }

  // 3. Artefato de build (dist/index.js)
  try {
    const distFile = path.resolve("dist/index.js");
    if (fs.existsSync(distFile)) {
      const stat = fs.statSync(distFile);
      const ageMins = Math.round((Date.now() - stat.mtimeMs) / 60000);
      result.buildArtifact = { exists: true, ageMins };
      result.summary.push(`Build: presente (${ageMins < 60 ? ageMins + "min atrás" : Math.round(ageMins / 60) + "h atrás"}) ✅`);
    } else {
      result.score -= 25;
      result.buildArtifact = { exists: false, ageMins: null };
      result.summary.push("Build: dist/index.js não encontrado ❌");
    }
  } catch { /* ignore */ }

  // 4. npm audit (dependências com vulnerabilidades conhecidas)
  try {
    const { execSync } = await import("child_process");
    const auditOutput = execSync("npm audit --json --omit=dev 2>/dev/null || true", { timeout: 15000 }).toString();
    const audit = JSON.parse(auditOutput);
    const high = (audit.metadata?.vulnerabilities?.high ?? 0) + (audit.metadata?.vulnerabilities?.critical ?? 0);
    result.auditIssues = high;
    if (high > 0) {
      result.score -= Math.min(high * 5, 25);
      result.summary.push(`Dependências: ${high} vulnerabilidade(s) alta/crítica ⚠️`);
    } else {
      result.summary.push("Dependências: sem vulnerabilidades críticas ✅");
    }
  } catch { result.summary.push("Dependências: auditoria não disponível"); }

  // Score final → status
  result.score = Math.max(0, result.score);
  if (result.score < 50) result.status = "critical";
  else if (result.score < 80) result.status = "warning";
  else result.status = "ok";

  return result;
}

export const adminMonitoringRouter = router({

  getStatus: adminProcedure.query(async () => {
    return runMonitoringCheck();
  }),

  getErrorLog: adminProcedure.query(async () => {
    const lines: string[] = [];
    try {
      const logsDir = path.resolve("logs");
      if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir)
          .filter(f => f.startsWith("error-"))
          .sort()
          .reverse();
        for (const file of files) {
          const content = fs.readFileSync(path.join(logsDir, file), "utf-8");
          const fileLines = content.split("\n").filter(l => l.trim()).reverse();
          lines.push(...fileLines);
          if (lines.length >= 50) break;
        }
      }
    } catch { /* ignore */ }
    return { lines: lines.slice(0, 50) };
  }),

  runCheck: adminProcedure.mutation(async () => {
    const result = await runMonitoringCheck();
    await saveCheckAndAlert(result);
    return result;
  }),

  getHistory: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const rows = await db.select()
        .from(monitoringChecks)
        .orderBy(desc(monitoringChecks.checkedAt))
        .limit(input?.limit ?? 20);

      return rows.map(r => ({
        ...r,
        details: typeof r.details === "string" ? JSON.parse(r.details) : r.details,
      }));
    }),

  // ============================================
  // KLINIKOS — SamurAI Flow Health
  // ============================================

  getFlowHealth: adminProcedure.query(async () => {
    return runSamurAIHealthCheck();
  }),

  getCodeIntegrity: adminProcedure.query(async () => {
    return runCodeIntegrityCheck();
  }),

  // ============================================
  // CHAT IA — Conversa com o Agente de Monitoramento
  // ============================================

  chatInit: adminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const existing = await db.select()
      .from(agentConversations)
      .where(eq(agentConversations.companyId, "monitoring-agent"))
      .limit(1);

    if (existing.length > 0) return { id: existing[0].id };

    const id = nanoid();
    await db.insert(agentConversations).values({
      id,
      tenantId: ctx.user.tenantId,
      userId: ctx.user.id,
      companyId: "monitoring-agent",
      title: "Klinikos IA",
      phase: "monitoring",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id };
  }),

  chatHistory: adminProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const msgs = await db.select()
        .from(agentMessages)
        .where(eq(agentMessages.conversationId, input.conversationId))
        .orderBy(agentMessages.createdAt)
        .limit(100);

      return msgs.map(m => ({ id: m.id, role: m.role, content: m.content }));
    }),

  chatSend: adminProcedure
    .input(z.object({
      conversationId: z.string(),
      content: z.string().min(1).max(5000),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 1. Save user message
      const userMsgId = nanoid();
      await db.insert(agentMessages).values({
        id: userMsgId,
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
        createdAt: new Date(),
      });

      // 2. Get conversation history (last 20)
      const recent = await db.select()
        .from(agentMessages)
        .where(eq(agentMessages.conversationId, input.conversationId))
        .orderBy(desc(agentMessages.createdAt))
        .limit(20);
      const history = [...recent].reverse();

      // 3. Get live monitoring data
      const status = await runMonitoringCheck();

      // 4. Get recent error log
      let errorLines: string[] = [];
      try {
        const logsDir = path.resolve("logs");
        if (fs.existsSync(logsDir)) {
          const files = fs.readdirSync(logsDir).filter(f => f.startsWith("error-")).sort().reverse();
          for (const file of files) {
            const content = fs.readFileSync(path.join(logsDir, file), "utf-8");
            errorLines.push(...content.split("\n").filter(l => l.trim()).reverse());
            if (errorLines.length >= 10) break;
          }
          errorLines = errorLines.slice(0, 10);
        }
      } catch { /* ignore */ }

      // 5. Get SamurAI flow health + code integrity
      const [flowHealth, codeIntegrity] = await Promise.all([
        runSamurAIHealthCheck(),
        runCodeIntegrityCheck(),
      ]);

      // 6. Build LLM messages
      const uptimeH = Math.floor(status.app.uptime / 3600);
      const uptimeM = Math.floor((status.app.uptime % 3600) / 60);

      const systemPrompt = `Voce e o Klinikos IA, o agente de saude e integridade da plataforma BlackBelt.
Suas responsabilidades sao quatro:
1. SAUDE DA PLATAFORMA: memoria, banco de dados, erros, uptime, disco, backups.
2. INTEGRIDADE DO FLUXO SAMURAI: monitorar as 18 etapas do processo NR-01 para cada empresa cliente. Detectar fluxos travados, fases sem avanco, inconsistencias de dados.
3. INTEGRIDADE DO CODIGO: score calculado via testes E2E automatizados, padroes de erro nos logs, auditoria de dependencias npm e estado do artefato de build. Quando perguntado sobre integridade do codigo, use os dados em INTEGRIDADE_CODIGO abaixo.
4. INTEGRIDADE DE DADOS: verificar consistencia entre avaliacoes COPSOQ, inventarios de risco, planos de acao e certificados.

Fluxo SamurAI (18 etapas resumidas):
Etapa 1-3: CNPJ → Receita Federal → Cadastro Empresa
Etapa 4-7: Pre-Proposta → Editar → Enviar Email → Aprovacao
Etapa 8-9: Criar Conta → Cadastrar Pessoas
Etapa 10-11: Enviar COPSOQ → Respostas (anonimo, 7 dias)
Etapa 12-14: Gerar Relatorio → Inventario Riscos → Plano de Acao
Etapa 15-16: Proposta Final → Aprovar + Pagar
Etapa 17-18: Liberar 7 PDFs → Entrega Final

Responda sempre em portugues. Seja direto e use emojis para status (verde OK, amarelo atencao, vermelho critico).
Quando detectar fluxos travados ou problemas, sugira acoes corretivas especificas.`;

      const contextMsg = `[DADOS EM TEMPO REAL DA PLATAFORMA]
Status Geral: ${status.status.toUpperCase()}
Uptime: ${uptimeH}h ${uptimeM}m
Node: ${status.app.nodeVersion} (PID: ${status.app.pid})
Memoria Heap: ${status.memory.heapUsedMB}MB / ${status.memory.maxHeapMB}MB (${status.memory.heapPercent}%)
Memoria Status: ${status.memory.memoryStatus}
RSS: ${status.memory.rssMB}MB
Banco de Dados: ${status.database.connected ? "Conectado" : "DESCONECTADO"}
Erros (24h): ${status.errors24h}
RAM Sistema: ${status.disk.totalGB}GB total, ${status.disk.freeGB}GB livre (${status.disk.usedPercent}% uso)
Ultimo Backup: ${status.lastBackup ? `${status.lastBackup.file} (${status.lastBackup.sizeMB}MB em ${status.lastBackup.date})` : "Nenhum encontrado"}
${errorLines.length > 0 ? `\nUltimos erros:\n${errorLines.join("\n")}` : "Sem erros recentes."}`;

      const flowContextMsg = `[SAUDE DO FLUXO SAMURAI — ${new Date().toLocaleString("pt-BR")}]
Fluxos Totais: ${flowHealth.totalFlows} | Ativos: ${flowHealth.activeFlows} | Concluidos: ${flowHealth.completedFlows} | Travados: ${flowHealth.stuckFlows.length}
${flowHealth.stuckFlows.length > 0 ? `\nEMPRESAS COM FLUXO TRAVADO:\n${flowHealth.stuckFlows.map(f => `- ID ${f.companyId} | ${f.phaseLabel} | ${f.daysSinceActivity} dia(s) sem atividade`).join("\n")}` : "Nenhum fluxo travado."}
\nDistribuicao por Fase:\n${flowHealth.phaseDistribution.map(p => `- ${p.label}: ${p.count}`).join("\n") || "Sem dados."}
\nIntegridade de Dados:
- Avaliacoes COPSOQ: ${flowHealth.dataIntegrity.copsoqTotal} total | ${flowHealth.dataIntegrity.copsoqInProgress} em andamento | ${flowHealth.dataIntegrity.copsoqCompleted} concluidas
- Inventarios de Risco: ${flowHealth.dataIntegrity.riskAssessmentsTotal}
- Planos de Acao: ${flowHealth.dataIntegrity.actionPlansTotal}
- Certificados NR-01 emitidos: ${flowHealth.dataIntegrity.certificatesTotal}`;

      const codeIntegrityContextMsg = `[INTEGRIDADE_CODIGO — ${new Date().toLocaleString("pt-BR")}]
Score: ${codeIntegrity.score}/100 — Status: ${codeIntegrity.status.toUpperCase()}
Testes E2E: ${codeIntegrity.e2e.lastRun ? `${codeIntegrity.e2e.passed}/${codeIntegrity.e2e.total} passaram | Ultimo: ${new Date(codeIntegrity.e2e.lastRun).toLocaleString("pt-BR")} | Status: ${codeIntegrity.e2e.status}` : "Nenhum teste E2E registrado ainda"}
Artefato Build (dist/index.js): ${codeIntegrity.buildArtifact.exists ? `Presente (${codeIntegrity.buildArtifact.ageMins !== null ? codeIntegrity.buildArtifact.ageMins < 60 ? codeIntegrity.buildArtifact.ageMins + " min atras" : Math.round(codeIntegrity.buildArtifact.ageMins / 60) + "h atras" : "?"})` : "NAO ENCONTRADO"}
Vulnerabilidades npm (alta+critica): ${codeIntegrity.auditIssues}
${codeIntegrity.errorPatterns.length > 0 ? `Padroes de erro (24h):\n${codeIntegrity.errorPatterns.map(e => `  - "${e.message}" (${e.count}x)`).join("\n")}` : "Sem padroes de erro recorrentes."}
Resumo: ${codeIntegrity.summary.join(" | ")}`;

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        { role: "system" as const, content: contextMsg },
        { role: "system" as const, content: flowContextMsg },
        { role: "system" as const, content: codeIntegrityContextMsg },
        ...history.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      // 6. Call LLM
      let assistantContent: string;
      try {
        const result = await invokeLLM({ messages: llmMessages });
        assistantContent = result.choices[0]?.message?.content || "Desculpe, nao consegui processar sua solicitacao.";
      } catch (err) {
        log.error("[MonitoringChat] LLM call failed", { error: String(err) });
        // Fallback: respond with raw data
        assistantContent = `Nao consegui acessar a IA no momento, mas aqui estao os dados atuais:\n\n**Status:** ${status.status}\n**Memoria:** ${status.memory.heapPercent}% (${status.memory.heapUsedMB}MB/${status.memory.maxHeapMB}MB)\n**Banco:** ${status.database.connected ? "Conectado" : "Desconectado"}\n**Erros 24h:** ${status.errors24h}`;
      }

      // 7. Save assistant message
      const assistantMsgId = nanoid();
      await db.insert(agentMessages).values({
        id: assistantMsgId,
        conversationId: input.conversationId,
        role: "assistant",
        content: assistantContent,
        createdAt: new Date(),
      });

      return {
        userMessage: { id: userMsgId, role: "user", content: input.content },
        assistantMessage: { id: assistantMsgId, role: "assistant", content: assistantContent },
      };
    }),

  // ============================================
  // MAINTENANCE BRIDGE (Klinikos → Claude Code)
  // ============================================

  pendingMaintenance: publicProcedure
    .input(z.object({ token: z.string() }).optional())
    .query(async ({ input }) => {
      if (input?.token !== (process.env.MAINTENANCE_TOKEN || "klinikos-2026")) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid maintenance token" });
      }
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select()
        .from(maintenanceRequests)
        .where(eq(maintenanceRequests.status, "pending"))
        .orderBy(maintenanceRequests.requestedAt)
        .limit(10);
      return rows.map(r => ({
        ...r,
        details: typeof r.details === "string" ? JSON.parse(r.details) : r.details,
      }));
    }),

  completeMaintenance: publicProcedure
    .input(z.object({
      token: z.string(),
      id: z.string(),
      resolution: z.string(),
      status: z.enum(["completed", "failed"]).default("completed"),
    }))
    .mutation(async ({ input }) => {
      if (input.token !== (process.env.MAINTENANCE_TOKEN || "klinikos-2026")) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid maintenance token" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(maintenanceRequests)
        .set({ status: input.status, resolution: input.resolution, completedAt: new Date() })
        .where(eq(maintenanceRequests.id, input.id));
      log.info(`[Monitoring] Maintenance ${input.status}: ${input.id} — ${input.resolution}`);
      return { success: true };
    }),

  maintenanceHistory: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select()
        .from(maintenanceRequests)
        .orderBy(desc(maintenanceRequests.requestedAt))
        .limit(input?.limit ?? 20);
      return rows.map(r => ({
        ...r,
        details: typeof r.details === "string" ? JSON.parse(r.details) : r.details,
      }));
    }),

  // ============================================
  // E2E TESTS — Testes de fluxo de negocio
  // ============================================

  runE2ETests: adminProcedure.mutation(async () => {
    return runAllE2ETests();
  }),

  getE2EResults: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select()
      .from(monitoringChecks)
      .where(sql`JSON_EXTRACT(details, '$.e2eTests') IS NOT NULL`)
      .orderBy(desc(monitoringChecks.checkedAt))
      .limit(10);
    return rows.map(r => ({
      ...r,
      details: typeof r.details === "string" ? JSON.parse(r.details) : r.details,
    }));
  }),
});
