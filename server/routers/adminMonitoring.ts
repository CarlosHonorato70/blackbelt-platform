import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, router } from "../_core/trpc";
import { getDb, checkDbHealth } from "../db";
import { monitoringChecks } from "../../drizzle/schema";
import { agentConversations, agentMessages } from "../../drizzle/schema_agent";
import { desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { log } from "../_core/logger";
import { sendEmail } from "../_core/email";
import { invokeLLM } from "../_core/llm";
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
              if (entry.timestamp && new Date(entry.timestamp) > cutoff) {
                errors24h++;
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

      // 5. Build LLM messages
      const uptimeH = Math.floor(status.app.uptime / 3600);
      const uptimeM = Math.floor((status.app.uptime % 3600) / 60);

      const systemPrompt = `Voce e o Klinikos IA, o agente inteligente de monitoramento da plataforma BlackBelt.
Responda sempre em portugues de forma clara e direta.
Voce tem acesso aos dados em tempo real da plataforma que sao fornecidos a cada mensagem.
Ajude o admin a entender o estado do sistema, diagnosticar problemas e sugerir acoes.
Seja conciso mas completo. Use emojis para indicar status (verde, amarelo, vermelho).
Quando o admin perguntar sobre algo especifico, foque na resposta e nao repita todos os dados.`;

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

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        { role: "system" as const, content: contextMsg },
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
});
