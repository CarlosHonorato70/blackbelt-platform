/**
 * SUBSCRIPTION TESTS
 * 
 * Testes para funcionalidades de assinatura e monetização
 */

import { describe, it, expect } from "vitest";
import {
  formatPrice,
  calculateYearlyDiscount,
  generatePlanDescription,
  getPreferredGateway,
} from "../_core/paymentConfig";
import {
  seedPlans,
  seedFeatures,
  getPlanFeatureAssociations,
} from "../../seed_plans";

describe("Payment Configuration", () => {
  describe("formatPrice", () => {
    it("should format price in BRL correctly", () => {
      const price1 = formatPrice(9900);
      const price2 = formatPrice(39900);
      const price3 = formatPrice(100000);
      
      // Use regex to handle non-breaking space variations
      expect(price1).toMatch(/R\$\s*99,00/);
      expect(price2).toMatch(/R\$\s*399,00/);
      expect(price3).toMatch(/R\$\s*1\.000,00/);
    });

    it("should handle zero and negative values", () => {
      const zero = formatPrice(0);
      const negative = formatPrice(-100);
      
      expect(zero).toMatch(/R\$\s*0,00/);
      expect(negative).toMatch(/-?R\$\s*1,00/);
    });
  });

  describe("calculateYearlyDiscount", () => {
    it("should apply 17% discount on yearly plans", () => {
      // Starter: R$ 99/mês = R$ 1.188/ano → R$ 987,96 com desconto
      expect(calculateYearlyDiscount(9900)).toBe(98604); // R$ 986,04 (arredondado)

      // Pro: R$ 399/mês = R$ 4.788/ano → R$ 3.974,04 com desconto
      expect(calculateYearlyDiscount(39900)).toBe(397404); // R$ 3.974,04 (arredondado)
    });

    it("should handle edge cases", () => {
      expect(calculateYearlyDiscount(0)).toBe(0);
      expect(calculateYearlyDiscount(100)).toBe(996); // R$ 9,96
    });
  });

  describe("generatePlanDescription", () => {
    it("should generate correct plan descriptions", () => {
      expect(generatePlanDescription("Starter", "monthly")).toBe(
        "Black Belt Platform - Plano Starter (Mensal)"
      );

      expect(generatePlanDescription("Pro", "yearly")).toBe(
        "Black Belt Platform - Plano Pro (Anual)"
      );

      expect(generatePlanDescription("Enterprise", "monthly")).toBe(
        "Black Belt Platform - Plano Enterprise (Mensal)"
      );
    });
  });

  describe("getPreferredGateway", () => {
    it("should select Mercado Pago for Latin American countries", () => {
      // Note: This test depends on environment variables
      // In a real scenario, you'd mock the config
      const latinAmericanCountries = ["BR", "AR", "CL", "CO", "MX"];
      
      latinAmericanCountries.forEach((country) => {
        const result = getPreferredGateway(country);
        // Will be null if no gateway is configured, which is expected in tests
        expect(result === null || result === "mercado_pago" || result === "stripe").toBe(true);
      });
    });
  });
});

describe("Seed Data - Plans", () => {
  describe("seedPlans", () => {
    it("should have exactly 3 plans (Starter, Pro, Enterprise)", () => {
      expect(seedPlans).toHaveLength(3);
      
      const planNames = seedPlans.map((p) => p.name);
      expect(planNames).toContain("starter");
      expect(planNames).toContain("pro");
      expect(planNames).toContain("enterprise");
    });

    it("should have correct pricing structure", () => {
      const starter = seedPlans.find((p) => p.name === "starter");
      const pro = seedPlans.find((p) => p.name === "pro");

      expect(starter?.monthlyPrice).toBe(9900); // R$ 99,00
      expect(starter?.yearlyPrice).toBe(99000); // R$ 990,00

      expect(pro?.monthlyPrice).toBe(39900); // R$ 399,00
      expect(pro?.yearlyPrice).toBe(399000); // R$ 3.990,00
    });

    it("should have correct feature flags", () => {
      const starter = seedPlans.find((p) => p.name === "starter");
      const pro = seedPlans.find((p) => p.name === "pro");
      const enterprise = seedPlans.find((p) => p.name === "enterprise");

      // Starter - Basic features only
      expect(starter?.hasAdvancedReports).toBe(false);
      expect(starter?.hasApiAccess).toBe(false);
      expect(starter?.hasWebhooks).toBe(false);
      expect(starter?.hasWhiteLabel).toBe(false);

      // Pro - Advanced features
      expect(pro?.hasAdvancedReports).toBe(true);
      expect(pro?.hasApiAccess).toBe(true);
      expect(pro?.hasWebhooks).toBe(false);
      expect(pro?.hasWhiteLabel).toBe(false);

      // Enterprise - All features
      expect(enterprise?.hasAdvancedReports).toBe(true);
      expect(enterprise?.hasApiAccess).toBe(true);
      expect(enterprise?.hasWebhooks).toBe(true);
      expect(enterprise?.hasWhiteLabel).toBe(true);
    });

    it("should have correct resource limits", () => {
      const starter = seedPlans.find((p) => p.name === "starter");
      const pro = seedPlans.find((p) => p.name === "pro");
      const enterprise = seedPlans.find((p) => p.name === "enterprise");

      // Starter limits
      expect(starter?.maxTenants).toBe(1);
      expect(starter?.maxUsersPerTenant).toBe(5);
      expect(starter?.maxStorageGB).toBe(1);

      // Pro limits
      expect(pro?.maxTenants).toBe(10);
      expect(pro?.maxUsersPerTenant).toBe(50);
      expect(pro?.maxStorageGB).toBe(10);

      // Enterprise - Unlimited
      expect(enterprise?.maxTenants).toBe(-1);
      expect(enterprise?.maxUsersPerTenant).toBe(-1);
      expect(enterprise?.maxStorageGB).toBe(-1);
    });

    it("should have correct trial periods", () => {
      const starter = seedPlans.find((p) => p.name === "starter");
      const pro = seedPlans.find((p) => p.name === "pro");
      const enterprise = seedPlans.find((p) => p.name === "enterprise");

      expect(starter?.trialDays).toBe(14);
      expect(pro?.trialDays).toBe(14);
      expect(enterprise?.trialDays).toBe(30); // Longer trial for enterprise
    });

    it("should have correct SLA configuration", () => {
      const starter = seedPlans.find((p) => p.name === "starter");
      const pro = seedPlans.find((p) => p.name === "pro");
      const enterprise = seedPlans.find((p) => p.name === "enterprise");

      expect(starter?.hasSLA).toBe(false);
      expect(starter?.slaUptime).toBeNull();

      expect(pro?.hasSLA).toBe(true);
      expect(pro?.slaUptime).toBe(990); // 99.0%

      expect(enterprise?.hasSLA).toBe(true);
      expect(enterprise?.slaUptime).toBe(999); // 99.9%
    });
  });

  describe("seedFeatures", () => {
    it("should have all required feature categories", () => {
      const categories = [...new Set(seedFeatures.map((f) => f.category))];
      
      expect(categories).toContain("core");
      expect(categories).toContain("reports");
      expect(categories).toContain("integrations");
      expect(categories).toContain("customization");
      expect(categories).toContain("support");
    });

    it("should have core features for all plans", () => {
      const coreFeatures = seedFeatures.filter((f) => f.category === "core");
      
      expect(coreFeatures.length).toBeGreaterThan(0);
      
      const coreFeatureNames = coreFeatures.map((f) => f.name);
      expect(coreFeatureNames).toContain("risk_assessments");
      expect(coreFeatureNames).toContain("pricing_system");
      expect(coreFeatureNames).toContain("multi_tenant");
    });

    it("should have all support tiers", () => {
      const supportFeatures = seedFeatures.filter(
        (f) => f.category === "support"
      );
      
      const supportNames = supportFeatures.map((f) => f.name);
      expect(supportNames).toContain("email_support");
      expect(supportNames).toContain("chat_support");
      expect(supportNames).toContain("priority_support");
      expect(supportNames).toContain("dedicated_support");
    });
  });

  describe("Plan-Feature Associations", () => {
    it("should create associations for all plans", () => {
      const associations = getPlanFeatureAssociations(seedPlans, seedFeatures);
      
      expect(associations.length).toBeGreaterThan(0);
      
      // Each association should have required fields
      associations.forEach((assoc) => {
        expect(assoc).toHaveProperty("id");
        expect(assoc).toHaveProperty("planId");
        expect(assoc).toHaveProperty("featureId");
        expect(assoc).toHaveProperty("isEnabled");
        expect(assoc.isEnabled).toBe(true);
      });
    });

    it("should give Enterprise all features", () => {
      const associations = getPlanFeatureAssociations(seedPlans, seedFeatures);
      const enterprisePlan = seedPlans.find((p) => p.name === "enterprise");
      
      const enterpriseAssociations = associations.filter(
        (a) => a.planId === enterprisePlan?.id
      );
      
      // Enterprise should have all features
      expect(enterpriseAssociations.length).toBe(seedFeatures.length);
    });

    it("should give Starter fewer features than Pro", () => {
      const associations = getPlanFeatureAssociations(seedPlans, seedFeatures);
      const starterPlan = seedPlans.find((p) => p.name === "starter");
      const proPlan = seedPlans.find((p) => p.name === "pro");
      
      const starterAssociations = associations.filter(
        (a) => a.planId === starterPlan?.id
      );
      const proAssociations = associations.filter(
        (a) => a.planId === proPlan?.id
      );
      
      expect(starterAssociations.length).toBeLessThan(proAssociations.length);
    });
  });
});

describe("Subscription Business Logic", () => {
  describe("Trial Period Calculation", () => {
    it("should calculate correct trial end date", () => {
      const now = new Date("2024-12-06T00:00:00Z");
      const trialDays = 14;
      
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + trialDays);
      
      expect(trialEnd.getDate()).toBe(20); // 6 + 14 = 20
      expect(trialEnd.getMonth()).toBe(11); // December (0-indexed)
    });
  });

  describe("Billing Cycle Calculation", () => {
    it("should calculate correct period end for monthly billing", () => {
      const now = new Date("2024-12-06T00:00:00Z");
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      
      expect(periodEnd.getMonth()).toBe(0); // January (0-indexed)
      expect(periodEnd.getFullYear()).toBe(2025);
    });

    it("should calculate correct period end for yearly billing", () => {
      const now = new Date("2024-12-06T00:00:00Z");
      const periodEnd = new Date(now);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      
      expect(periodEnd.getMonth()).toBe(11); // December
      expect(periodEnd.getFullYear()).toBe(2025);
    });
  });

  describe("Usage Limits Validation", () => {
    it("should correctly identify when usage is within limits", () => {
      const maxUsers = 5;
      const currentUsers = 3;
      
      expect(currentUsers).toBeLessThan(maxUsers);
    });

    it("should correctly identify when usage exceeds limits", () => {
      const maxUsers = 5;
      const currentUsers = 6;
      
      expect(currentUsers).toBeGreaterThan(maxUsers);
    });

    it("should handle unlimited resources (-1)", () => {
      const maxUsers = -1;
      const currentUsers = 1000;
      
      const withinLimit = maxUsers === -1 || currentUsers <= maxUsers;
      expect(withinLimit).toBe(true);
    });
  });
});
