import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { handleAsaasWebhook } from "./routers/asaas";
import { log } from "./_core/logger";
import { checkDbHealth } from "./db";
import { registerPdfDownloadRoutes } from "./pdfDownloadRoutes";
import { registerImportExportRoutes } from "./importExportRoutes";
import { registerCertificationUploadRoutes } from "./certificationUploadRoutes";

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

    const mem = process.memoryUsage();

    res.status(httpCode).json({
      status,
      uptime: Math.floor(process.uptime()),
      database: dbHealthy ? "connected" : "unavailable",
      memory: {
        heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
        rssMB: Math.round(mem.rss / 1024 / 1024),
      },
      ...(process.env.NODE_ENV !== "production" && {
        timestamp: new Date().toISOString(),
        service: "blackbelt-platform",
        version: "1.0.7",
        environment: process.env.NODE_ENV || "development",
      }),
    });
  });

  // ============================================
  // WEBHOOK: ASAAS
  // Valida via access_token no header
  // ============================================

  app.post("/api/webhooks/asaas", async (req: Request, res: Response) => {
    // Validar token de autenticação do webhook (timing-safe)
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;

    if (webhookToken) {
      const receivedToken = req.headers["asaas-access-token"] as string;
      if (!receivedToken) {
        log.warn("[Asaas Webhook] Token ausente");
        return res.status(401).json({ error: "Missing webhook token" });
      }
      const expected = Buffer.from(webhookToken, "utf8");
      const received = Buffer.from(receivedToken, "utf8");
      if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
        log.warn("[Asaas Webhook] Token inválido");
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
      log.error("[Asaas Webhook] Error:", error as Record<string, unknown>);
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
      if (proposal.status === "rejected") {
        res.set("Cache-Control", "no-store");
        return res.redirect(`${frontendUrl}/proposal/result?status=already_rejected`);
      }

      // 1. Approve the proposal (atomic update with status check to prevent race condition)
      const { and } = await import("drizzle-orm");
      const [updated] = await db.update(proposals)
        .set({ status: "approved", approvedAt: new Date(), respondedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(proposals.id, proposal.id), eq(proposals.status, proposal.status)));

      // If no rows updated, another request already approved it
      if (!updated || (updated as any).affectedRows === 0) {
        res.set("Cache-Control", "no-store");
        return res.redirect(`${frontendUrl}/proposal/result?status=already_approved`);
      }

      log.info(`[Proposal] Approved: ${proposal.id} by ${proposal.contactEmail}`);

      // 1b. Notify consultant via agentAlert (CNPJ will be added below after client lookup)
      let _proposalAlertCnpj: string | undefined = undefined;

      // 2. Create or assign company user account
      if (proposal.contactEmail) {
        try {
          const { nanoid } = await import("nanoid");
          const bcryptMod = await import("bcryptjs");
          const bcrypt = bcryptMod.default || bcryptMod;
          const { sendWelcomeCompanyEmail } = await import("./_core/email");
          const { clients } = await import("../drizzle/schema");

          // Find the COMPANY tenant (not the consultant tenant) via client CNPJ
          let companyTenantId = proposal.tenantId;
          let companyName = "Empresa";

          if (proposal.clientId) {
            const [client] = await db.select().from(clients).where(eq(clients.id, proposal.clientId));
            if (client?.cnpj) {
              _proposalAlertCnpj = client.cnpj;
              // Find company tenant by CNPJ (with or without formatting)
              const cnpjClean = client.cnpj.replace(/\D/g, "");
              const allTenants = await db.select().from(tenants);
              const companyTenant = allTenants.find(t =>
                t.tenantType === "company" && t.cnpj && t.cnpj.replace(/\D/g, "") === cnpjClean
              );
              if (companyTenant) {
                companyTenantId = companyTenant.id;
                companyName = companyTenant.name;
              } else {
                // Company tenant doesn't exist — create it automatically
                const newTenantId = nanoid();
                await db.insert(tenants).values({
                  id: newTenantId,
                  name: client.name || "Empresa",
                  cnpj: client.cnpj,
                  tenantType: "company",
                  parentTenantId: proposal.tenantId,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
                companyTenantId = newTenantId;
                companyName = client.name || "Empresa";
                console.log(`[Proposal] Auto-created company tenant: ${newTenantId} (${companyName})`);
              }
            }
          }

          // Fallback: get name from client or proposal tenant
          if (companyName === "Empresa") {
            const [tenant] = await db.select().from(tenants).where(eq(tenants.id, companyTenantId));
            companyName = tenant?.name || "Empresa";
          }

          // Insert approval alert now that we have the CNPJ
          try {
            const { nanoid: nanoidFn } = await import("nanoid");
            const { agentAlerts } = await import("../drizzle/schema_agent");
            await db.insert(agentAlerts).values({
              id: nanoidFn(),
              tenantId: proposal.tenantId,
              alertType: "proposal_approved",
              title: proposal.proposalType === "final" ? "Proposta Final aprovada" : "Pré-Proposta aprovada",
              message: `A empresa aprovou a proposta. Clique para continuar o fluxo no SamurAI.`,
              severity: "info",
              dismissed: false,
              metadata: { proposalId: proposal.id, proposalType: proposal.proposalType, ...((_proposalAlertCnpj) ? { cnpj: _proposalAlertCnpj } : {}) },
              createdAt: new Date(),
            });
          } catch (alertErr) {
            log.warn("[Proposal] Failed to create approval alert", { error: String(alertErr) });
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
                passwordHash: hashedPassword,
                emailVerified: true,
              }).where(eq(users.id, existingEmailUser.id));

              log.info(`[Proposal] Existing user ${emailNormalized} assigned to tenant ${companyTenantId}`);
            } else {
              // Create new user
              const hashedPassword = await bcrypt.hash(tempPassword, 12);
              const userId = nanoid();

              await db.insert(users).values({
                id: userId,
                email: emailNormalized,
                passwordHash: hashedPassword,
                name: companyName,
                tenantId: companyTenantId,
                role: "user",
                emailVerified: true,
                createdAt: new Date(),
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
      } else {
        // No contactEmail: still create the approval alert (without CNPJ)
        try {
          const { nanoid: nanoidFn } = await import("nanoid");
          const { agentAlerts } = await import("../drizzle/schema_agent");
          await db.insert(agentAlerts).values({
            id: nanoidFn(),
            tenantId: proposal.tenantId,
            alertType: "proposal_approved",
            title: proposal.proposalType === "final" ? "Proposta Final aprovada" : "Pré-Proposta aprovada",
            message: `A empresa aprovou a proposta. Clique para continuar o fluxo no SamurAI.`,
            severity: "info",
            dismissed: false,
            metadata: { proposalId: proposal.id, proposalType: proposal.proposalType },
            createdAt: new Date(),
          });
        } catch (alertErr) {
          log.warn("[Proposal] Failed to create approval alert (no email path)", { error: String(alertErr) });
        }
      }

      // 3. Handle payment flow for final proposals
      if (proposal.proposalType === "final" && proposal.contactEmail) {
        try {
          const { nanoid: nanoidPayment } = await import("nanoid");
          const { proposalPayments } = await import("../drizzle/schema");
          const { sendPaymentInstructionsEmail } = await import("./_core/email");
          const { getTenantSetting } = await import("./db");

          const totalValue = proposal.totalValue || 0;
          const percentages = [40, 30, 30];
          const installmentsData = percentages.map((pct, idx) => ({
            id: nanoidPayment(),
            proposalId: proposal.id,
            installment: idx + 1,
            percentage: pct,
            amount: Math.round(totalValue * pct / 100),
            status: "pending" as const,
            createdAt: new Date(),
          }));

          // Create payment installments
          for (const inst of installmentsData) {
            await db.insert(proposalPayments).values(inst);
          }

          // Set payment status on proposal
          await db.update(proposals)
            .set({ paymentStatus: "pending", updatedAt: new Date() })
            .where(eq(proposals.id, proposal.id));

          log.info(`[Proposal] Created ${installmentsData.length} payment installments for proposal ${proposal.id}`);

          // Fetch consultancy payment settings
          const paymentPix = await getTenantSetting(proposal.tenantId, "payment_pix");
          const paymentBank = await getTenantSetting(proposal.tenantId, "payment_bank");
          const paymentInstructions = await getTenantSetting(proposal.tenantId, "payment_instructions");

          // Send payment instructions email
          sendPaymentInstructionsEmail({
            clientEmail: proposal.contactEmail,
            clientName: proposal.contactEmail,
            proposalTitle: proposal.title || "Proposta",
            totalValue,
            installments: installmentsData.map(i => ({
              installment: i.installment,
              percentage: i.percentage,
              amount: i.amount,
            })),
            paymentPix: paymentPix?.settingValue as string | undefined,
            paymentBank: paymentBank?.settingValue as string | undefined,
            paymentInstructions: paymentInstructions?.settingValue as string | undefined,
          }).catch(err => log.error("[Proposal] Payment instructions email failed:", err));
        } catch (payErr: any) {
          console.error("[Proposal] Payment setup failed (approval still OK):", payErr?.message);
          log.error("[Proposal] Payment setup failed:", payErr?.message);
        }
      }

      res.set("Cache-Control", "no-store");
      res.redirect(`${frontendUrl}/proposal/result?status=approved&id=${proposal.id}`);
    } catch (error) {
      log.error("[Proposal Approve] Error:", error as Record<string, unknown>);
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

      const { and } = await import("drizzle-orm");
      await db.update(proposals)
        .set({ status: "rejected", rejectedAt: new Date(), respondedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(proposals.id, proposal.id), eq(proposals.status, proposal.status)));

      log.info(`[Proposal] Rejected: ${proposal.id} by ${proposal.contactEmail}`);
      res.redirect(`${process.env.FRONTEND_URL || ""}/proposal/result?status=rejected&id=${proposal.id}`);
    } catch (error) {
      log.error("[Proposal Reject] Error:", error as Record<string, unknown>);
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

  // ============================================
  // CERTIFICATION UPLOAD ROUTES
  // ============================================
  registerCertificationUploadRoutes(app);
}
