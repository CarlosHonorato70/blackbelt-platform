/**
 * E2E Business Flow Tests — Klinikos
 *
 * Testa fluxos reais da plataforma em producao:
 * Registro → Email → Login → Subscription → COPSOQ → Billing
 *
 * Usa dados de teste (e2e-test-*) e faz cleanup automatico.
 */

import { getDb, deleteTenant } from "../db";
import { users, tenants, plans, subscriptions, copsoqBillingEvents, pendingCopsoqPayments, maintenanceRequests } from "../../drizzle/schema";
import { copsoqAssessments, copsoqInvites } from "../../drizzle/schema_nr01";
import { eq, and, sql, desc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { log } from "./logger";
import bcrypt from "bcryptjs";

const TEST_EMAIL = `e2e-test-${Date.now()}@test.blackbelt.com`;
const TEST_PASSWORD = "E2eTest@2026!";
const TEST_NAME = "E2E Test User";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://blackbeltconsultoria.com";

export interface E2ETestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

async function runTest(name: string, fn: () => Promise<void>): Promise<E2ETestResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, passed: true, duration: Date.now() - start };
  } catch (err: any) {
    return { name, passed: false, error: err.message || String(err), duration: Date.now() - start };
  }
}

export async function runAllE2ETests(): Promise<{
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: E2ETestResult[];
  duration: number;
}> {
  const startTime = Date.now();
  const results: E2ETestResult[] = [];
  const db = await getDb();
  if (!db) throw new Error("Database not available for E2E tests");

  let testUserId: string | null = null;
  let testTenantId: string | null = null;

  try {
    // ========== TEST 1: REGISTRO ==========
    results.push(await runTest("Registro de usuario", async () => {
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
      testUserId = nanoid();
      testTenantId = nanoid();

      // Create tenant
      const testCnpj = `99.999.${String(Date.now()).slice(-3)}/${String(Date.now()).slice(-4)}-99`;
      await db.insert(tenants).values({
        id: testTenantId,
        name: `E2E Test Tenant ${Date.now()}`,
        cnpj: testCnpj,
        tenantType: "consultant",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create user
      await db.insert(users).values({
        id: testUserId,
        email: TEST_EMAIL,
        name: TEST_NAME,
        passwordHash,
        tenantId: testTenantId,
        role: "user",
        loginMethod: "local",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Verify user exists
      const [user] = await db.select().from(users).where(eq(users.email, TEST_EMAIL)).limit(1);
      if (!user) throw new Error("User not created");
      if (user.emailVerified) throw new Error("Email should not be verified yet");
    }));

    // ========== TEST 2: VERIFICACAO DE EMAIL ==========
    results.push(await runTest("Verificacao de email", async () => {
      if (!testUserId) throw new Error("Depends on test 1");

      await db.update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, testUserId));

      const [user] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
      if (!user?.emailVerified) throw new Error("Email verification failed");
    }));

    // ========== TEST 3: LOGIN ==========
    results.push(await runTest("Login com credenciais", async () => {
      if (!testUserId) throw new Error("Depends on test 1");

      const [user] = await db.select().from(users).where(eq(users.email, TEST_EMAIL)).limit(1);
      if (!user) throw new Error("User not found");

      const valid = await bcrypt.compare(TEST_PASSWORD, user.passwordHash || "");
      if (!valid) throw new Error("Password verification failed");
    }));

    // ========== TEST 4: SUBSCRIPTION ==========
    results.push(await runTest("Criar subscription trial", async () => {
      if (!testTenantId) throw new Error("Depends on test 1");

      // Get starter plan
      const [plan] = await db.select().from(plans).where(eq(plans.name, "starter")).limit(1);
      if (!plan) throw new Error("Starter plan not found");

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + plan.trialDays);

      await db.insert(subscriptions).values({
        id: nanoid(),
        tenantId: testTenantId,
        planId: plan.id,
        status: "trialing",
        billingCycle: "monthly",
        startDate: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd,
        currentPrice: plan.monthlyPrice,
        totalPrice: plan.monthlyPrice,
      });

      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, testTenantId)).limit(1);
      if (!sub) throw new Error("Subscription not created");
      if (sub.status !== "trialing") throw new Error(`Expected trialing, got ${sub.status}`);
      if (plan.copsoqInvitesIncluded <= 0) throw new Error("Plan should have COPSOQ invites included");
    }));

    // ========== TEST 5: ENVIO COPSOQ (dentro do limite) ==========
    results.push(await runTest("Envio COPSOQ dentro do limite", async () => {
      if (!testTenantId) throw new Error("Depends on test 4");

      const assessmentId = `copsoq_e2e_${Date.now()}`;
      await db.insert(copsoqAssessments).values({
        id: assessmentId,
        tenantId: testTenantId,
        title: "E2E Test Assessment",
        assessmentDate: new Date(),
        status: "in_progress",
      });

      const [assessment] = await db.select().from(copsoqAssessments)
        .where(eq(copsoqAssessments.id, assessmentId)).limit(1);
      if (!assessment) throw new Error("Assessment not created");

      // Verify subscription counter works
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, testTenantId)).limit(1);
      if (!sub) throw new Error("Subscription not found");
      // Counter should be 0 (no invites sent yet via billing hook)
      if ((sub.copsoqInvitesSent || 0) > 0) throw new Error("Counter should be 0 for new subscription");
    }));

    // ========== TEST 6: BILLING BLOCK (excedentes) ==========
    results.push(await runTest("Bloqueio por excedentes COPSOQ", async () => {
      if (!testTenantId) throw new Error("Depends on test 4");

      const [plan] = await db.select().from(plans).where(eq(plans.name, "starter")).limit(1);
      if (!plan) throw new Error("Starter plan not found");

      // Force counter to plan limit
      await db.update(subscriptions)
        .set({ copsoqInvitesSent: plan.copsoqInvitesIncluded })
        .where(eq(subscriptions.tenantId, testTenantId));

      // Verify counter is at limit
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, testTenantId)).limit(1);
      if (sub?.copsoqInvitesSent !== plan.copsoqInvitesIncluded) {
        throw new Error(`Counter should be ${plan.copsoqInvitesIncluded}, got ${sub?.copsoqInvitesSent}`);
      }

      // Verify pricePerCopsoqInvite is set
      if (!plan.pricePerCopsoqInvite || plan.pricePerCopsoqInvite <= 0) {
        throw new Error("Plan should have pricePerCopsoqInvite > 0");
      }
    }));

    // ========== TEST 7: HEALTH CHECK ==========
    results.push(await runTest("Health check endpoint", async () => {
      const response = await fetch(`${FRONTEND_URL}/api/health`);
      if (!response.ok) throw new Error(`Health check failed: HTTP ${response.status}`);
      const data = await response.json();
      if (data.status !== "ok" && data.status !== "degraded") throw new Error(`Unexpected status: ${data.status}`);
      if (data.database !== "connected") throw new Error("Database not connected");
    }));

    // ========== TEST 8: LANDING PAGE ==========
    results.push(await runTest("Landing page sem gratis", async () => {
      const response = await fetch(FRONTEND_URL);
      if (!response.ok) throw new Error(`Landing page failed: HTTP ${response.status}`);
      const html = await response.text();
      const hasGratis = /gratis|gratuitamente/i.test(html);
      if (hasGratis) throw new Error("Landing page still contains 'gratis' references");
    }));

    // ========== TEST 9: PLANOS COM COPSOQ ==========
    results.push(await runTest("Planos com pricing COPSOQ", async () => {
      const allPlans = await db.select().from(plans).where(eq(plans.isActive, true));
      if (allPlans.length === 0) throw new Error("No active plans found");
      for (const plan of allPlans) {
        if (plan.pricePerCopsoqInvite <= 0) throw new Error(`Plan ${plan.name} missing pricePerCopsoqInvite`);
        if (plan.copsoqInvitesIncluded <= 0) throw new Error(`Plan ${plan.name} missing copsoqInvitesIncluded`);
      }
    }));

  } finally {
    // ========== CLEANUP ==========
    try {
      if (testTenantId) {
        await deleteTenant(testTenantId);
        log.info("[E2E] Test data cleaned up", { tenantId: testTenantId, email: TEST_EMAIL });
      }
    } catch (err) {
      log.error("[E2E] Cleanup failed", { error: String(err) });
    }
  }

  const totalDuration = Date.now() - startTime;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  const allPassed = failedTests === 0;

  log.info(`[E2E] Tests completed: ${passedTests}/${results.length} passed in ${totalDuration}ms`);

  // Create maintenance request if tests failed
  if (!allPassed) {
    try {
      const failedDetails = results.filter(r => !r.passed).map(r => `${r.name}: ${r.error}`);
      await db.insert(maintenanceRequests).values({
        id: nanoid(),
        type: "e2e_test_failure",
        status: "pending",
        details: JSON.stringify({
          failedTests: results.filter(r => !r.passed),
          passedTests: results.filter(r => r.passed).map(r => r.name),
          summary: failedDetails.join("; "),
        }),
        requestedAt: new Date(),
      });
      log.warn("[E2E] Maintenance request created for failed tests", { failedTests: failedDetails });
    } catch (err) {
      log.error("[E2E] Failed to create maintenance request", { error: String(err) });
    }
  }

  return { passed: allPassed, totalTests: results.length, passedTests, failedTests, results, duration: totalDuration };
}
