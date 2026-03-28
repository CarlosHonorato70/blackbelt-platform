import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb, checkDbHealth } from "../db";
import { monitoringChecks } from "../../drizzle/schema";
import { desc, sql, gte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { log } from "../_core/logger";
import { sendEmail } from "../_core/email";
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
  memory: { heapUsedMB: number; heapTotalMB: number; rssMB: number; heapPercent: number; memoryStatus: string };
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
  const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  let memoryStatus: "ok" | "warning" | "critical" = "ok";
  if (heapPercent >= MEMORY_CRIT_PERCENT) memoryStatus = "critical";
  else if (heapPercent >= MEMORY_WARN_PERCENT) memoryStatus = "warning";

  // Database
  const dbConnected = await checkDbHealth();

  // Error count (last 24h) — count lines in today's error log
  let errors24h = 0;
  try {
    const logsDir = path.resolve("logs");
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir).filter(f => f.startsWith("error-"));
      const now = Date.now();
      for (const file of files) {
        const stat = fs.statSync(path.join(logsDir, file));
        if (now - stat.mtimeMs < 86400000) {
          const content = fs.readFileSync(path.join(logsDir, file), "utf-8");
          errors24h += content.split("\n").filter(l => l.trim()).length;
        }
      }
    }
  } catch { /* ignore */ }

  // Disk
  let totalGB = 0, freeGB = 0, usedPercent = 0;
  try {
    const total = os.totalmem();
    const free = os.freemem();
    totalGB = Math.round(total / 1024 / 1024 / 1024 * 10) / 10;
    freeGB = Math.round(free / 1024 / 1024 / 1024 * 10) / 10;
    usedPercent = Math.round(((total - free) / total) * 100);
  } catch { /* ignore */ }

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
    memory: { heapUsedMB, heapTotalMB, rssMB, heapPercent, memoryStatus },
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
});
