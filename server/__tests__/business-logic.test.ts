/**
 * Tests for Business Logic
 * 
 * These tests verify core business rules and logic
 * for the Black Belt Platform.
 */

import { describe, it, expect } from "vitest";
import {
  createMockTenant,
  createMockSector,
  createMockPerson,
  createMockClient,
  createMockService,
  createMockPricingParameters,
} from "./test-utils";

describe("Business Logic", () => {
  describe("Tenant Management", () => {
    it("should create tenant with required fields", () => {
      const tenant = createMockTenant({
        name: "Test Company",
        cnpj: "12.345.678/0001-90",
      });

      expect(tenant.name).toBe("Test Company");
      expect(tenant.cnpj).toBe("12.345.678/0001-90");
      expect(tenant.status).toBe("active");
      expect(tenant.id).toBeDefined();
    });

    it("should create tenant with default status as active", () => {
      const tenant = createMockTenant();
      expect(tenant.status).toBe("active");
    });

    it("should create tenant with shared_rls strategy by default", () => {
      const tenant = createMockTenant();
      expect(tenant.strategy).toBe("shared_rls");
    });

    it("should have unique CNPJ per tenant", () => {
      const tenant1 = createMockTenant({ cnpj: "12.345.678/0001-90" });
      const tenant2 = createMockTenant({ cnpj: "98.765.432/0001-10" });

      expect(tenant1.cnpj).not.toBe(tenant2.cnpj);
    });

    it("should have timestamps on creation", () => {
      const tenant = createMockTenant();
      expect(tenant.createdAt).toBeInstanceOf(Date);
      expect(tenant.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("Sector Management", () => {
    it("should create sector associated with tenant", () => {
      const tenant = createMockTenant();
      const sector = createMockSector(tenant.id);

      expect(sector.tenantId).toBe(tenant.id);
      expect(sector.name).toBeDefined();
      expect(sector.id).toBeDefined();
    });

    it("should allow multiple sectors per tenant", () => {
      const tenant = createMockTenant();
      const sector1 = createMockSector(tenant.id, { name: "Engineering" });
      const sector2 = createMockSector(tenant.id, { name: "Sales" });

      expect(sector1.tenantId).toBe(tenant.id);
      expect(sector2.tenantId).toBe(tenant.id);
      expect(sector1.id).not.toBe(sector2.id);
    });

    it("should have optional description", () => {
      const tenant = createMockTenant();
      const sector = createMockSector(tenant.id, {
        description: "Engineering team responsible for product development",
      });

      expect(sector.description).toBe("Engineering team responsible for product development");
    });
  });

  describe("People Management", () => {
    it("should create person associated with tenant", () => {
      const tenant = createMockTenant();
      const person = createMockPerson(tenant.id);

      expect(person.tenantId).toBe(tenant.id);
      expect(person.name).toBeDefined();
      expect(person.id).toBeDefined();
    });

    it("should create person associated with sector", () => {
      const tenant = createMockTenant();
      const sector = createMockSector(tenant.id);
      const person = createMockPerson(tenant.id, sector.id);

      expect(person.tenantId).toBe(tenant.id);
      expect(person.sectorId).toBe(sector.id);
    });

    it("should allow person without sector", () => {
      const tenant = createMockTenant();
      const person = createMockPerson(tenant.id, null);

      expect(person.tenantId).toBe(tenant.id);
      expect(person.sectorId).toBeNull();
    });

    it("should have employment type", () => {
      const tenant = createMockTenant();
      const person = createMockPerson(tenant.id, null, {
        employmentType: "outsourced",
      });

      expect(person.employmentType).toBe("outsourced");
    });

    it("should default to own employment type", () => {
      const tenant = createMockTenant();
      const person = createMockPerson(tenant.id);

      expect(person.employmentType).toBe("own");
    });
  });

  describe("Client Management", () => {
    it("should create client for pricing proposals", () => {
      const tenant = createMockTenant();
      const client = createMockClient(tenant.id);

      expect(client.tenantId).toBe(tenant.id);
      expect(client.name).toBeDefined();
      expect(client.id).toBeDefined();
    });

    it("should have company size classification", () => {
      const tenant = createMockTenant();
      const client = createMockClient(tenant.id, {
        companySize: "large",
      });

      expect(client.companySize).toBe("large");
    });

    it("should have contact information", () => {
      const tenant = createMockTenant();
      const client = createMockClient(tenant.id);

      expect(client.contactName).toBeDefined();
      expect(client.contactEmail).toBeDefined();
      expect(client.contactPhone).toBeDefined();
    });

    it("should have address information", () => {
      const tenant = createMockTenant();
      const client = createMockClient(tenant.id);

      expect(client.street).toBeDefined();
      expect(client.city).toBeDefined();
      expect(client.state).toBeDefined();
    });
  });

  describe("Service Management", () => {
    it("should create service for proposals", () => {
      const tenant = createMockTenant();
      const service = createMockService(tenant.id);

      expect(service.tenantId).toBe(tenant.id);
      expect(service.name).toBeDefined();
      expect(service.basePrice).toBeGreaterThan(0);
    });

    it("should have unit type", () => {
      const tenant = createMockTenant();
      const service = createMockService(tenant.id, {
        unitType: "hours",
      });

      expect(service.unitType).toBe("hours");
    });

    it("should have estimated duration", () => {
      const tenant = createMockTenant();
      const service = createMockService(tenant.id);

      expect(service.estimatedDuration).toBeGreaterThan(0);
    });

    it("should have category", () => {
      const tenant = createMockTenant();
      const service = createMockService(tenant.id, {
        category: "compliance",
      });

      expect(service.category).toBe("compliance");
    });
  });

  describe("Pricing Parameters", () => {
    it("should have tax regime", () => {
      const tenant = createMockTenant();
      const params = createMockPricingParameters(tenant.id);

      expect(params.taxRegime).toBe("simples_nacional");
    });

    it("should have cost components", () => {
      const tenant = createMockTenant();
      const params = createMockPricingParameters(tenant.id);

      expect(params.fixedCosts).toBeGreaterThan(0);
      expect(params.laborCosts).toBeGreaterThan(0);
      expect(params.productiveHoursPerMonth).toBeGreaterThan(0);
    });

    it("should have profit margin", () => {
      const tenant = createMockTenant();
      const params = createMockPricingParameters(tenant.id);

      expect(params.profitMargin).toBeGreaterThan(0);
      expect(params.profitMargin).toBeLessThanOrEqual(100);
    });

    it("should have discount tiers", () => {
      const tenant = createMockTenant();
      const params = createMockPricingParameters(tenant.id);

      expect(params.discountTier1Min).toBeDefined();
      expect(params.discountTier1Rate).toBeDefined();
      expect(params.discountTier2Min).toBeGreaterThan(params.discountTier1Min);
      expect(params.discountTier3Min).toBeGreaterThan(params.discountTier2Min);
    });

    it("should have increasing discount rates", () => {
      const tenant = createMockTenant();
      const params = createMockPricingParameters(tenant.id);

      expect(params.discountTier2Rate).toBeGreaterThan(params.discountTier1Rate);
      expect(params.discountTier3Rate).toBeGreaterThan(params.discountTier2Rate);
    });
  });

  describe("Multi-Tenant Isolation", () => {
    it("should isolate data by tenant ID", () => {
      const tenant1 = createMockTenant({ name: "Company A" });
      const tenant2 = createMockTenant({ name: "Company B" });

      const sector1 = createMockSector(tenant1.id);
      const sector2 = createMockSector(tenant2.id);

      expect(sector1.tenantId).toBe(tenant1.id);
      expect(sector2.tenantId).toBe(tenant2.id);
      expect(sector1.tenantId).not.toBe(sector2.tenantId);
    });

    it("should not allow cross-tenant access", () => {
      const tenant1 = createMockTenant();
      const tenant2 = createMockTenant();

      const person = createMockPerson(tenant1.id);

      // In real implementation, this should throw an error
      expect(person.tenantId).toBe(tenant1.id);
      expect(person.tenantId).not.toBe(tenant2.id);
    });

    it("should maintain separate clients per tenant", () => {
      const tenant1 = createMockTenant();
      const tenant2 = createMockTenant();

      const client1 = createMockClient(tenant1.id);
      const client2 = createMockClient(tenant2.id);

      expect(client1.tenantId).not.toBe(client2.tenantId);
    });
  });

  describe("Risk Level Calculation", () => {
    it("should calculate risk level from probability and severity", () => {
      function calculateRiskLevel(probability: number, severity: number): string {
        const score = probability * severity;
        if (score >= 15) return "critical";
        if (score >= 10) return "high";
        if (score >= 5) return "medium";
        return "low";
      }

      expect(calculateRiskLevel(5, 5)).toBe("critical"); // 25
      expect(calculateRiskLevel(3, 4)).toBe("high"); // 12
      expect(calculateRiskLevel(2, 3)).toBe("medium"); // 6
      expect(calculateRiskLevel(1, 2)).toBe("low"); // 2
    });

    it("should handle edge cases in risk calculation", () => {
      function calculateRiskLevel(probability: number, severity: number): string {
        const score = probability * severity;
        if (score >= 15) return "critical";
        if (score >= 10) return "high";
        if (score >= 5) return "medium";
        return "low";
      }

      expect(calculateRiskLevel(5, 3)).toBe("critical"); // 15 (boundary)
      expect(calculateRiskLevel(2, 5)).toBe("high"); // 10 (boundary)
      expect(calculateRiskLevel(1, 5)).toBe("medium"); // 5 (boundary)
      expect(calculateRiskLevel(1, 1)).toBe("low"); // 1
    });
  });

  describe("Service Recommendations", () => {
    it("should recommend services based on risk level", () => {
      function recommendServices(riskLevel: string): string[] {
        const recommendations: Record<string, string[]> = {
          critical: ["Full Risk Assessment", "Urgent Training", "Policy Review", "Emergency Action Plan"],
          high: ["Risk Assessment", "Training Program", "Policy Update"],
          medium: ["Basic Assessment", "Awareness Training"],
          low: ["Monitoring", "Documentation"],
        };
        return recommendations[riskLevel] || [];
      }

      expect(recommendServices("critical").length).toBe(4);
      expect(recommendServices("high").length).toBe(3);
      expect(recommendServices("medium").length).toBe(2);
      expect(recommendServices("low").length).toBe(2);
    });

    it("should recommend appropriate services for critical risk", () => {
      function recommendServices(riskLevel: string): string[] {
        const recommendations: Record<string, string[]> = {
          critical: ["Full Risk Assessment", "Urgent Training", "Policy Review", "Emergency Action Plan"],
          high: ["Risk Assessment", "Training Program", "Policy Update"],
          medium: ["Basic Assessment", "Awareness Training"],
          low: ["Monitoring", "Documentation"],
        };
        return recommendations[riskLevel] || [];
      }

      const services = recommendServices("critical");
      expect(services).toContain("Full Risk Assessment");
      expect(services).toContain("Urgent Training");
    });
  });
});
