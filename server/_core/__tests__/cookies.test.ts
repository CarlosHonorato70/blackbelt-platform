import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  SESSION_MAX_AGE_MS,
  SESSION_REFRESH_THRESHOLD_MS,
} from "../cookies";

describe("Session Token (cookies.ts)", () => {
  describe("createSessionToken", () => {
    it("should return a token with 4 dot-separated parts", () => {
      const token = createSessionToken("user123");
      const parts = token.split(".");
      expect(parts).toHaveLength(4);
    });

    it("should embed the userId in the token", () => {
      const token = createSessionToken("user123");
      const parts = token.split(".");
      expect(parts[1]).toBe("user123");
    });

    it("should embed a future expiresAt timestamp", () => {
      const before = Date.now();
      const token = createSessionToken("user123");
      const after = Date.now();

      const expiresAt = parseInt(token.split(".")[2], 10);
      expect(expiresAt).toBeGreaterThanOrEqual(before + SESSION_MAX_AGE_MS);
      expect(expiresAt).toBeLessThanOrEqual(after + SESSION_MAX_AGE_MS);
    });

    it("should generate unique tokens for the same userId", () => {
      const token1 = createSessionToken("user123");
      const token2 = createSessionToken("user123");
      expect(token1).not.toBe(token2);
    });

    it("should have a 64-char hex random part", () => {
      const token = createSessionToken("user123");
      const randomPart = token.split(".")[0];
      expect(randomPart).toHaveLength(64);
      expect(randomPart).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("verifySessionToken", () => {
    it("should return { userId, expiresAt } for a valid token", () => {
      const token = createSessionToken("user456");
      const result = verifySessionToken(token);

      expect(result).not.toBeNull();
      expect(result!.userId).toBe("user456");
      expect(result!.expiresAt).toBeGreaterThan(Date.now());
    });

    it("should return null for a tampered signature", () => {
      const token = createSessionToken("user123");
      const parts = token.split(".");
      // Flip last char of signature
      const lastChar = parts[3].slice(-1);
      const flipped = lastChar === "a" ? "b" : "a";
      parts[3] = parts[3].slice(0, -1) + flipped;

      const result = verifySessionToken(parts.join("."));
      expect(result).toBeNull();
    });

    it("should return null for a tampered userId", () => {
      const token = createSessionToken("user123");
      const parts = token.split(".");
      parts[1] = "hacker";

      const result = verifySessionToken(parts.join("."));
      expect(result).toBeNull();
    });

    it("should return null for a tampered expiresAt", () => {
      const token = createSessionToken("user123");
      const parts = token.split(".");
      // Set expiresAt to far future — signature won't match
      parts[2] = String(Date.now() + 999999999);

      const result = verifySessionToken(parts.join("."));
      expect(result).toBeNull();
    });

    it("should return null for an expired token", () => {
      // Create token, then mock Date.now to simulate 31 minutes later
      const token = createSessionToken("user123");
      const originalNow = Date.now;

      try {
        Date.now = () => originalNow() + SESSION_MAX_AGE_MS + 1000;
        const result = verifySessionToken(token);
        expect(result).toBeNull();
      } finally {
        Date.now = originalNow;
      }
    });

    it("should return valid result for a non-expired token", () => {
      const token = createSessionToken("user123");
      const originalNow = Date.now;

      try {
        // 15 minutes later — still within 30 min window
        Date.now = () => originalNow() + 15 * 60 * 1000;
        const result = verifySessionToken(token);
        expect(result).not.toBeNull();
        expect(result!.userId).toBe("user123");
      } finally {
        Date.now = originalNow;
      }
    });

    // Invalid inputs
    it("should return null for null input", () => {
      expect(verifySessionToken(null as any)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(verifySessionToken("")).toBeNull();
    });

    it("should return null for non-string input", () => {
      expect(verifySessionToken(123 as any)).toBeNull();
      expect(verifySessionToken(undefined as any)).toBeNull();
    });

    it("should return null for token with wrong number of parts", () => {
      expect(verifySessionToken("a.b")).toBeNull();
      expect(verifySessionToken("a.b.c")).toBeNull();
      expect(verifySessionToken("a.b.c.d.e")).toBeNull();
    });

    it("should return null for token with non-numeric expiresAt", () => {
      const token = createSessionToken("user123");
      const parts = token.split(".");
      parts[2] = "not-a-number";
      // Recalculating signature is not possible without the secret,
      // so the HMAC will fail first — this tests the parse path
      expect(verifySessionToken(parts.join("."))).toBeNull();
    });
  });

  describe("Sliding Window Constants", () => {
    it("SESSION_MAX_AGE_MS should be 30 minutes", () => {
      expect(SESSION_MAX_AGE_MS).toBe(30 * 60 * 1000);
    });

    it("SESSION_REFRESH_THRESHOLD_MS should be 10 minutes", () => {
      expect(SESSION_REFRESH_THRESHOLD_MS).toBe(10 * 60 * 1000);
    });

    it("refresh threshold should be less than max age", () => {
      expect(SESSION_REFRESH_THRESHOLD_MS).toBeLessThan(SESSION_MAX_AGE_MS);
    });
  });
});
