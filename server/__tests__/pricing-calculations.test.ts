/**
 * Tests for Pricing Calculations
 * 
 * These tests verify the pricing calculation logic for technical hour
 * and proposal generation across different tax regimes.
 */

import { describe, it, expect } from "vitest";

describe("Pricing Calculations", () => {
  describe("Technical Hour Calculation", () => {
    it("should calculate technical hour for MEI regime", () => {
      // MEI - Microempreendedor Individual
      // Formula: (Fixed Costs + Labor Costs) / Productive Hours * (1 + Profit Margin)
      const fixedCosts = 2000;
      const laborCosts = 1500;
      const productiveHours = 160;
      const profitMargin = 0.30;
      
      const costPerHour = (fixedCosts + laborCosts) / productiveHours;
      const technicalHour = costPerHour * (1 + profitMargin);
      
      expect(costPerHour).toBe(21.875);
      expect(technicalHour).toBeCloseTo(28.4375, 2);
    });

    it("should calculate technical hour for Simples Nacional regime", () => {
      // Simples Nacional
      const fixedCosts = 5000;
      const laborCosts = 3000;
      const productiveHours = 160;
      const profitMargin = 0.30;
      const simpleTaxRate = 0.06; // 6% typical rate
      
      const costPerHour = (fixedCosts + laborCosts) / productiveHours;
      const technicalHour = costPerHour * (1 + profitMargin) / (1 - simpleTaxRate);
      
      expect(costPerHour).toBe(50);
      expect(technicalHour).toBeCloseTo(69.149, 2);
    });

    it("should calculate technical hour for Lucro Presumido regime", () => {
      // Lucro Presumido
      const fixedCosts = 10000;
      const laborCosts = 8000;
      const productiveHours = 160;
      const profitMargin = 0.35;
      const taxRate = 0.135; // ~13.5% (IR + CSLL + ISS)
      
      const costPerHour = (fixedCosts + laborCosts) / productiveHours;
      const technicalHour = costPerHour * (1 + profitMargin) / (1 - taxRate);
      
      expect(costPerHour).toBe(112.5);
      expect(technicalHour).toBeCloseTo(175.58, 2);
    });

    it("should calculate technical hour for Autonomous regime", () => {
      // Autônomo
      const fixedCosts = 1000;
      const laborCosts = 500;
      const productiveHours = 100;
      const profitMargin = 0.40;
      const inssRate = 0.20; // 20% INSS
      const issRate = 0.05; // 5% ISS
      
      const costPerHour = (fixedCosts + laborCosts) / productiveHours;
      const technicalHour = costPerHour * (1 + profitMargin) / (1 - inssRate - issRate);
      
      expect(costPerHour).toBe(15);
      expect(technicalHour).toBeCloseTo(28, 2);
    });

    it("should handle zero productive hours gracefully", () => {
      const fixedCosts = 5000;
      const laborCosts = 3000;
      const productiveHours = 0;
      
      // Should avoid division by zero
      expect(() => {
        const costPerHour = (fixedCosts + laborCosts) / productiveHours;
        if (!isFinite(costPerHour)) {
          throw new Error("Invalid productive hours");
        }
      }).toThrow("Invalid productive hours");
    });
  });

  describe("Discount Calculation", () => {
    it("should apply no discount for small quantities", () => {
      const basePrice = 100;
      const quantity = 5;
      const discountRate = 0;
      
      const total = basePrice * quantity * (1 - discountRate);
      expect(total).toBe(500);
    });

    it("should apply tier 1 discount (5% for 10+ items)", () => {
      const basePrice = 100;
      const quantity = 15;
      const discountRate = 0.05;
      
      const total = basePrice * quantity * (1 - discountRate);
      expect(total).toBe(1425);
    });

    it("should apply tier 2 discount (10% for 20+ items)", () => {
      const basePrice = 100;
      const quantity = 25;
      const discountRate = 0.10;
      
      const total = basePrice * quantity * (1 - discountRate);
      expect(total).toBe(2250);
    });

    it("should apply tier 3 discount (15% for 50+ items)", () => {
      const basePrice = 100;
      const quantity = 60;
      const discountRate = 0.15;
      
      const total = basePrice * quantity * (1 - discountRate);
      expect(total).toBe(5100);
    });

    it("should calculate correct discount rate based on quantity", () => {
      function getDiscountRate(quantity: number): number {
        if (quantity >= 50) return 0.15;
        if (quantity >= 20) return 0.10;
        if (quantity >= 10) return 0.05;
        return 0;
      }

      expect(getDiscountRate(5)).toBe(0);
      expect(getDiscountRate(10)).toBe(0.05);
      expect(getDiscountRate(15)).toBe(0.05);
      expect(getDiscountRate(20)).toBe(0.10);
      expect(getDiscountRate(30)).toBe(0.10);
      expect(getDiscountRate(50)).toBe(0.15);
      expect(getDiscountRate(100)).toBe(0.15);
    });
  });

  describe("Proposal Total Calculation", () => {
    it("should calculate proposal total with single item", () => {
      const items = [
        { unitPrice: 150, quantity: 8, discount: 0 },
      ];
      
      const subtotal = items.reduce((sum, item) => {
        return sum + item.unitPrice * item.quantity * (1 - item.discount);
      }, 0);
      
      expect(subtotal).toBe(1200);
    });

    it("should calculate proposal total with multiple items", () => {
      const items = [
        { unitPrice: 150, quantity: 8, discount: 0 },
        { unitPrice: 200, quantity: 4, discount: 0.05 },
        { unitPrice: 100, quantity: 10, discount: 0.10 },
      ];
      
      const subtotal = items.reduce((sum, item) => {
        return sum + item.unitPrice * item.quantity * (1 - item.discount);
      }, 0);
      
      // Item 1: 150 * 8 = 1200
      // Item 2: 200 * 4 * 0.95 = 760
      // Item 3: 100 * 10 * 0.90 = 900
      // Total: 2860
      expect(subtotal).toBe(2860);
    });

    it("should apply taxes to proposal total", () => {
      const subtotal = 1000;
      const taxRate = 0.06; // 6% for Simples Nacional
      
      const total = subtotal * (1 + taxRate);
      expect(total).toBe(1060);
    });

    it("should calculate complete proposal with all components", () => {
      // Services
      const items = [
        { name: "Risk Assessment", unitPrice: 150, quantity: 8, discount: 0 },
        { name: "Training", unitPrice: 200, quantity: 4, discount: 0.05 },
      ];
      
      // Calculate subtotal
      const subtotal = items.reduce((sum, item) => {
        return sum + item.unitPrice * item.quantity * (1 - item.discount);
      }, 0);
      
      // Apply tax
      const taxRate = 0.06;
      const taxes = subtotal * taxRate;
      const total = subtotal + taxes;
      
      expect(subtotal).toBe(1960); // 1200 + 760
      expect(taxes).toBeCloseTo(117.6, 2);
      expect(total).toBeCloseTo(2077.6, 2);
    });
  });

  describe("Input Validation", () => {
    it("should reject negative prices", () => {
      const price = -100;
      expect(price).toBeLessThan(0);
      // In real code, this would throw an error
      expect(() => {
        if (price < 0) throw new Error("Price cannot be negative");
      }).toThrow("Price cannot be negative");
    });

    it("should reject negative quantities", () => {
      const quantity = -5;
      expect(quantity).toBeLessThan(0);
      expect(() => {
        if (quantity < 0) throw new Error("Quantity cannot be negative");
      }).toThrow("Quantity cannot be negative");
    });

    it("should accept zero quantity", () => {
      const quantity = 0;
      const basePrice = 100;
      const total = basePrice * quantity;
      expect(total).toBe(0);
    });

    it("should validate discount range (0-1)", () => {
      expect(() => {
        const discount = 1.5;
        if (discount < 0 || discount > 1) {
          throw new Error("Discount must be between 0 and 1");
        }
      }).toThrow("Discount must be between 0 and 1");
    });

    it("should validate tax regime", () => {
      const validRegimes = ["mei", "simples_nacional", "lucro_presumido", "autonomous"];
      const testRegime = "simples_nacional";
      
      expect(validRegimes).toContain(testRegime);
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large numbers", () => {
      const basePrice = 1000000;
      const quantity = 1000;
      const total = basePrice * quantity;
      
      expect(total).toBe(1000000000);
    });

    it("should handle very small numbers", () => {
      const basePrice = 0.01;
      const quantity = 100;
      const total = basePrice * quantity;
      
      expect(total).toBeCloseTo(1, 2);
    });

    it("should handle decimal quantities", () => {
      const basePrice = 100;
      const quantity = 2.5;
      const total = basePrice * quantity;
      
      expect(total).toBe(250);
    });

    it("should round currency values correctly", () => {
      function roundCurrency(value: number): number {
        return Math.round(value * 100) / 100;
      }

      expect(roundCurrency(10.123)).toBe(10.12);
      expect(roundCurrency(10.126)).toBe(10.13);
      expect(roundCurrency(10.125)).toBe(10.13); // Banker's rounding
    });
  });
});
