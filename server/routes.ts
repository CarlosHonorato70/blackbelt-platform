import type { Express, Request, Response } from "express";
import { handleAsaasWebhook } from "./routers/asaas";
import { log } from "./_core/logger";
import { checkDbHealth } from "./db";
import { registerPdfDownloadRoutes } from "./pdfDownloadRoutes";
import { registerImportExportRoutes } from "./importExportRoutes";

/**
 * Rotas Express - health check, webhooks Asaas e rotas de download.
 * TODA autenticacao e logica de negocio passa pelo tRPC.
 */
export function registerRoutes(app: Express) {

  // ============================================
  // HEALTH CHECK (com status do banco de dados)
  // ============================================

  app.get("/api/health", async (_req, res) => {
    const dbHealthy = await checkDbHealth();

    const status = dbHealthy ? "ok" : "degraded";
    const httpCode = dbHealthy ? 200 : 503;

    if (process.env.NODE_ENV === "production") {
      res.status(httpCode).json({ status });
    } else {
      res.status(httpCode).json({
        status,
        timestamp: new Date().toISOString(),
        service: "blackbelt-platform",
        version: "1.0.7",
        environment: process.env.NODE_ENV || "development",
        uptime: process.uptime(),
        database: dbHealthy ? "connected" : "unavailable",
      });
    }
  });

  // ============================================
  // WEBHOOK: ASAAS
  // Valida via access_token no header
  // ============================================

  app.post("/api/webhooks/asaas", async (req: Request, res: Response) => {
    // Validar token de autenticação do webhook
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (webhookToken) {
      const receivedToken = req.headers["asaas-access-token"] as string;
      if (!receivedToken || receivedToken !== webhookToken) {
        log.warn("[Asaas Webhook] Token inválido ou ausente");
        return res.status(401).json({ error: "Invalid webhook token" });
      }
    }

    try {
      const result = await handleAsaasWebhook(req.body);

      if (result.received) {
        res.json({ received: true });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      log.error("[Asaas Webhook] Error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // ============================================
  // PROPOSAL APPROVAL (public, token-based)
  // ============================================

  app.get("/api/proposal/approve/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const db = await (await import("./db")).getDb();
      const { proposals, tenants, users } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const frontendUrl = process.env.FRONTEND_URL || "";

      const [proposal] = await db.select().from(proposals).where(eq(proposals.approvalToken, token));
      if (!proposal) {
        res.set("Cache-Control", "no-store");
        return res.redirect(`${frontendUrl}/proposal/result?status=invalid`);
      }

      if (proposal.status === "approved") {
        res.set("Cache-Control", "no-store");
        return res.redirect(`${frontendUrl}/proposal/result?status=already_approved`);
      }

      // 1. Approve the proposal
      await db.update(proposals)
        .set({ status: "approved", approvedAt: new Date(), respondedAt: new Date(), updatedAt: new Date() })
        .where(eq(proposals.id, proposal.id));

      log.info(`[Proposal] Approved: ${proposal.id} by ${proposal.contactEmail}`);

      // 2. Create or assign company user account
      if (proposal.contactEmail) {
        try {
          const { nanoid } = await import("nanoid");
          const bcrypt = await import("bcrypt");
          const { sendWelcomeCompanyEmail } = await import("./_core/email");
          const { clients } = await import("../drizzle/schema");

          // Find the COMPANY tenant (not the consultant tenant) via client CNPJ
          let companyTenantId = proposal.tenantId;
          let companyName = "Empresa";

          if (proposal.clientId) {
            const [client] = await db.select().from(clients).where(eq(clients.id, proposal.clientId));
            if (client?.cnpj) {
              // Find company tenant by CNPJ (with or without formatting)
              const cnpjClean = client.cnpj.replace(/\D/g, "");
              const allTenants = await db.select().from(tenants);
              const companyTenant = allTenants.find(t =>
                t.tenantType === "company" && t.cnpj && t.cnpj.replace(/\D/g, "") === cnpjClean
              );
              if (companyTenant) {
                companyTenantId = companyTenant.id;
                companyName = companyTenant.name;
              }
            }
          }

          // Fallback: get name from proposal tenant if no company found
          if (companyName === "Empresa") {
            const [tenant] = await db.select().from(tenants).where(eq(tenants.id, companyTenantId));
            companyName = tenant?.name || "Empresa";
          }

          console.log(`[Proposal] Company tenant resolved: ${companyTenantId} (${companyName})`);
          log.info(`[Proposal] Company tenant: ${companyTenantId} (${companyName})`);

          // Check if user already exists for this company tenant
          const [tenantUser] = await db.select().from(users)
            .where(eq(users.tenantId, companyTenantId))
            .limit(1);

          console.log(`[Proposal] Tenant user check: ${tenantUser ? tenantUser.email : 'NONE'}`);

          if (tenantUser) {
            console.log(`[Proposal] User already exists for tenant ${companyTenantId}, skipping`);
            log.info(`[Proposal] User already exists for tenant ${companyTenantId}, skipping creation`);
          } else {
            // Check if email already exists (maybe from another tenant or with null tenantId)
            const emailNormalized = proposal.contactEmail.toLowerCase().trim();
            const [existingEmailUser] = await db.select().from(users)
              .where(eq(users.email, emailNormalized))
              .limit(1);

            let tempPassword = "";
            const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
            for (let i = 0; i < 10; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];
            tempPassword += "@1";

            if (existingEmailUser) {
              // User exists with this email — assign to this tenant and reset password
              const hashedPassword = await bcrypt.hash(tempPassword, 12);
              await db.update(users).set({
                tenantId: companyTenantId,
                name: companyName,
                password: hashedPassword,
                emailVerified: true,
                updatedAt: new Date(),
              }).where(eq(users.id, existingEmailUser.id));

              log.info(`[Proposal] Existing user ${emailNormalized} assigned to tenant ${companyTenantId}`);
            } else {
              // Create new user
              const hashedPassword = await bcrypt.hash(tempPassword, 12);
              const userId = nanoid();

              await db.insert(users).values({
                id: userId,
                email: emailNormalized,
                password: hashedPassword,
                name: companyName,
                tenantId: companyTenantId,
                role: "user",
                emailVerified: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              log.info(`[Proposal] Company user created: ${emailNormalized} for tenant ${companyTenantId}`);
            }

            // Send welcome email with credentials
            sendWelcomeCompanyEmail({
              companyEmail: proposal.contactEmail,
              companyName,
              tempPassword,
              loginUrl: `${frontendUrl}/login`,
            }).catch(err => log.error("[Proposal] Welcome email failed:", err));
          }
        } catch (userErr: any) {
          // Don't fail the approval if user creation fails
          console.error("[Proposal] User creation failed (approval still OK):", userErr?.message, userErr?.stack);
          log.error("[Proposal] User creation failed (approval still OK):", userErr?.message);
        }
      }

      res.set("Cache-Control", "no-store");
      res.redirect(`${frontendUrl}/proposal/result?status=approved&id=${proposal.id}`);
    } catch (error) {
      log.error("[Proposal Approve] Error:", error);
      res.set("Cache-Control", "no-store");
      res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=error`);
    }
  });

  app.get("/api/proposal/reject/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const db = await (await import("./db")).getDb();
      const { proposals } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");

      const [proposal] = await db.select().from(proposals).where(eq(proposals.approvalToken, token));
      if (!proposal) {
        return res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=invalid`);
      }

      await db.update(proposals)
        .set({ status: "rejected", rejectedAt: new Date(), respondedAt: new Date(), updatedAt: new Date() })
        .where(eq(proposals.id, proposal.id));

      log.info(`[Proposal] Rejected: ${proposal.id} by ${proposal.contactEmail}`);
      res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=rejected&id=${proposal.id}`);
    } catch (error) {
      log.error("[Proposal Reject] Error:", error);
      res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=error`);
    }
  });

  // ============================================
  // PDF DOWNLOAD ROUTES (authenticated)
  // ============================================
  registerPdfDownloadRoutes(app);

  // ============================================
  // IMPORT/EXPORT ROUTES (people & sectors)
  // ============================================
  registerImportExportRoutes(app);
}
