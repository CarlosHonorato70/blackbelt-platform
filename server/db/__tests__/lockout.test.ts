import { describe, it, expect } from "vitest";
import { getLockedMinutesRemaining } from "../../db";

describe("Account Lockout (db.ts)", () => {
  describe("getLockedMinutesRemaining", () => {
    it("should return 0 when lockedUntil is null", () => {
      expect(getLockedMinutesRemaining(null)).toBe(0);
    });

    it("should return 0 when lockedUntil is in the past", () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      expect(getLockedMinutesRemaining(pastDate)).toBe(0);
    });

    it("should return remaining minutes when lockedUntil is in the future", () => {
      const futureDate = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const minutes = getLockedMinutesRemaining(futureDate);
      expect(minutes).toBeGreaterThanOrEqual(14);
      expect(minutes).toBeLessThanOrEqual(15);
    });

    it("should ceil to the next minute", () => {
      // 1.5 minutes from now should return 2
      const futureDate = new Date(Date.now() + 90 * 1000);
      const minutes = getLockedMinutesRemaining(futureDate);
      expect(minutes).toBe(2);
    });

    it("should return 1 for just under 1 minute remaining", () => {
      const futureDate = new Date(Date.now() + 30 * 1000); // 30 seconds
      const minutes = getLockedMinutesRemaining(futureDate);
      expect(minutes).toBe(1);
    });

    it("should return 30 for a standard lockout duration", () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      const minutes = getLockedMinutesRemaining(futureDate);
      expect(minutes).toBe(30);
    });

    it("should return 0 for Date.now() exactly (edge case)", () => {
      const now = new Date();
      // This could return 0 or 1 depending on timing, but should not throw
      const minutes = getLockedMinutesRemaining(now);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThanOrEqual(1);
    });
  });
});
