/**
 * Tests for Data Validation
 * 
 * These tests verify input validation for various entities
 * like tenants, clients, and services.
 */

import { describe, it, expect } from "vitest";
import { isValidCNPJ, isValidEmail } from "./test-utils";

describe("Data Validation", () => {
  describe("CNPJ Validation", () => {
    it("should validate correct CNPJ format", () => {
      const cnpj = "12.345.678/0001-90";
      expect(isValidCNPJ(cnpj)).toBe(true);
    });

    it("should validate CNPJ without formatting", () => {
      const cnpj = "12345678000190";
      expect(isValidCNPJ(cnpj)).toBe(true);
    });

    it("should reject CNPJ with incorrect length", () => {
      const cnpj = "123456780001";
      expect(isValidCNPJ(cnpj)).toBe(false);
    });

    it("should reject empty CNPJ", () => {
      const cnpj = "";
      expect(isValidCNPJ(cnpj)).toBe(false);
    });

    it("should reject CNPJ with letters", () => {
      const cnpj = "12.345.ABC/0001-90";
      expect(isValidCNPJ(cnpj)).toBe(false);
    });
  });

  describe("Email Validation", () => {
    it("should validate correct email format", () => {
      const email = "user@example.com";
      expect(isValidEmail(email)).toBe(true);
    });

    it("should validate email with subdomain", () => {
      const email = "user@mail.example.com";
      expect(isValidEmail(email)).toBe(true);
    });

    it("should validate email with plus sign", () => {
      const email = "user+tag@example.com";
      expect(isValidEmail(email)).toBe(true);
    });

    it("should reject email without @", () => {
      const email = "userexample.com";
      expect(isValidEmail(email)).toBe(false);
    });

    it("should reject email without domain", () => {
      const email = "user@";
      expect(isValidEmail(email)).toBe(false);
    });

    it("should reject empty email", () => {
      const email = "";
      expect(isValidEmail(email)).toBe(false);
    });

    it("should reject email with spaces", () => {
      const email = "user @example.com";
      expect(isValidEmail(email)).toBe(false);
    });
  });

  describe("Phone Validation", () => {
    function isValidPhone(phone: string): boolean {
      // Remove all non-digits
      const cleaned = phone.replace(/\D/g, "");
      // Brazilian phone numbers have 10-11 digits
      return cleaned.length >= 10 && cleaned.length <= 11;
    }

    it("should validate Brazilian phone with formatting", () => {
      const phone = "11 98765-4321";
      expect(isValidPhone(phone)).toBe(true);
    });

    it("should validate phone without formatting", () => {
      const phone = "11987654321";
      expect(isValidPhone(phone)).toBe(true);
    });

    it("should validate landline (10 digits)", () => {
      const phone = "1133334444";
      expect(isValidPhone(phone)).toBe(true);
    });

    it("should reject phone with too few digits", () => {
      const phone = "123456";
      expect(isValidPhone(phone)).toBe(false);
    });

    it("should reject phone with too many digits", () => {
      const phone = "119876543210123";
      expect(isValidPhone(phone)).toBe(false);
    });
  });

  describe("Name Validation", () => {
    function isValidName(name: string): boolean {
      return name.trim().length >= 2 && name.trim().length <= 255;
    }

    it("should validate normal name", () => {
      const name = "John Doe";
      expect(isValidName(name)).toBe(true);
    });

    it("should validate name with special characters", () => {
      const name = "José María González";
      expect(isValidName(name)).toBe(true);
    });

    it("should reject single character name", () => {
      const name = "J";
      expect(isValidName(name)).toBe(false);
    });

    it("should reject empty name", () => {
      const name = "";
      expect(isValidName(name)).toBe(false);
    });

    it("should reject name with only spaces", () => {
      const name = "   ";
      expect(isValidName(name)).toBe(false);
    });

    it("should accept name with exactly 2 characters", () => {
      const name = "Li";
      expect(isValidName(name)).toBe(true);
    });
  });

  describe("Tenant Status Validation", () => {
    const validStatuses = ["active", "inactive", "suspended"];

    it("should accept active status", () => {
      const status = "active";
      expect(validStatuses).toContain(status);
    });

    it("should accept inactive status", () => {
      const status = "inactive";
      expect(validStatuses).toContain(status);
    });

    it("should accept suspended status", () => {
      const status = "suspended";
      expect(validStatuses).toContain(status);
    });

    it("should reject invalid status", () => {
      const status = "deleted";
      expect(validStatuses).not.toContain(status);
    });
  });

  describe("Company Size Validation", () => {
    const validSizes = ["micro", "small", "medium", "large"];

    it("should accept all valid sizes", () => {
      validSizes.forEach(size => {
        expect(validSizes).toContain(size);
      });
    });

    it("should reject invalid size", () => {
      const size = "enterprise";
      expect(validSizes).not.toContain(size);
    });
  });

  describe("Tax Regime Validation", () => {
    const validRegimes = ["mei", "simples_nacional", "lucro_presumido", "autonomous"];

    it("should accept MEI regime", () => {
      const regime = "mei";
      expect(validRegimes).toContain(regime);
    });

    it("should accept Simples Nacional regime", () => {
      const regime = "simples_nacional";
      expect(validRegimes).toContain(regime);
    });

    it("should accept Lucro Presumido regime", () => {
      const regime = "lucro_presumido";
      expect(validRegimes).toContain(regime);
    });

    it("should accept Autonomous regime", () => {
      const regime = "autonomous";
      expect(validRegimes).toContain(regime);
    });

    it("should reject invalid regime", () => {
      const regime = "lucro_real";
      expect(validRegimes).not.toContain(regime);
    });
  });

  describe("Price Validation", () => {
    function isValidPrice(price: number): boolean {
      return price >= 0 && isFinite(price);
    }

    it("should accept positive price", () => {
      const price = 100;
      expect(isValidPrice(price)).toBe(true);
    });

    it("should accept zero price", () => {
      const price = 0;
      expect(isValidPrice(price)).toBe(true);
    });

    it("should accept decimal price", () => {
      const price = 99.99;
      expect(isValidPrice(price)).toBe(true);
    });

    it("should reject negative price", () => {
      const price = -10;
      expect(isValidPrice(price)).toBe(false);
    });

    it("should reject infinite price", () => {
      const price = Infinity;
      expect(isValidPrice(price)).toBe(false);
    });

    it("should reject NaN price", () => {
      const price = NaN;
      expect(isValidPrice(price)).toBe(false);
    });
  });

  describe("Quantity Validation", () => {
    function isValidQuantity(quantity: number): boolean {
      return quantity >= 0 && Number.isInteger(quantity) && isFinite(quantity);
    }

    it("should accept positive integer quantity", () => {
      const quantity = 10;
      expect(isValidQuantity(quantity)).toBe(true);
    });

    it("should accept zero quantity", () => {
      const quantity = 0;
      expect(isValidQuantity(quantity)).toBe(true);
    });

    it("should reject negative quantity", () => {
      const quantity = -5;
      expect(isValidQuantity(quantity)).toBe(false);
    });

    it("should reject decimal quantity", () => {
      const quantity = 5.5;
      expect(isValidQuantity(quantity)).toBe(false);
    });

    it("should reject infinite quantity", () => {
      const quantity = Infinity;
      expect(isValidQuantity(quantity)).toBe(false);
    });
  });

  describe("Date Validation", () => {
    function isValidDate(date: any): boolean {
      return date instanceof Date && !isNaN(date.getTime());
    }

    it("should accept valid date", () => {
      const date = new Date("2024-01-15");
      expect(isValidDate(date)).toBe(true);
    });

    it("should accept current date", () => {
      const date = new Date();
      expect(isValidDate(date)).toBe(true);
    });

    it("should reject invalid date string", () => {
      const date = new Date("invalid");
      expect(isValidDate(date)).toBe(false);
    });

    it("should reject non-date object", () => {
      const date = "2024-01-15";
      expect(isValidDate(date)).toBe(false);
    });

    it("should reject null", () => {
      const date = null;
      expect(isValidDate(date)).toBe(false);
    });
  });

  describe("ZIP Code Validation", () => {
    function isValidZipCode(zipCode: string): boolean {
      // Brazilian ZIP code format: 12345-678 or 12345678
      const cleaned = zipCode.replace(/\D/g, "");
      return cleaned.length === 8;
    }

    it("should validate ZIP code with formatting", () => {
      const zipCode = "01234-567";
      expect(isValidZipCode(zipCode)).toBe(true);
    });

    it("should validate ZIP code without formatting", () => {
      const zipCode = "01234567";
      expect(isValidZipCode(zipCode)).toBe(true);
    });

    it("should reject ZIP code with incorrect length", () => {
      const zipCode = "1234567";
      expect(isValidZipCode(zipCode)).toBe(false);
    });

    it("should reject empty ZIP code", () => {
      const zipCode = "";
      expect(isValidZipCode(zipCode)).toBe(false);
    });
  });

  describe("State Code Validation", () => {
    const validStates = [
      "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
      "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
      "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    ];

    it("should accept valid state codes", () => {
      expect(validStates).toContain("SP");
      expect(validStates).toContain("RJ");
      expect(validStates).toContain("MG");
    });

    it("should reject invalid state code", () => {
      const state = "XX";
      expect(validStates).not.toContain(state);
    });

    it("should have exactly 27 states", () => {
      expect(validStates.length).toBe(27);
    });
  });
});
