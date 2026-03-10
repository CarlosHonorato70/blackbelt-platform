import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("Environment Validation (env.ts)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv };
    // Clear module cache so env.ts re-evaluates
    vi.resetModules();
  });

  describe("requireEnv in production", () => {
    it("should throw if required variable is missing in production", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.COOKIE_SECRET;
      delete process.env.FRONTEND_URL;

      await expect(async () => {
        await import("../env");
      }).rejects.toThrow(/obrigatori/);
    });
  });

  describe("requireEnv in development", () => {
    it("should use fallback values in development", async () => {
      process.env.NODE_ENV = "test";
      process.env.COOKIE_SECRET = "test-secret-for-testing-purposes-minimum-length";

      const { ENV } = await import("../env");
      expect(ENV.cookieSecret).toBeTruthy();
      expect(ENV.nodeEnv).toBe("test");
    });

    it("should detect production mode correctly", async () => {
      process.env.NODE_ENV = "test";
      process.env.COOKIE_SECRET = "test-secret-for-testing-purposes-minimum-length";

      const { ENV } = await import("../env");
      expect(ENV.isProduction).toBe(false);
    });
  });

  describe("ENV object", () => {
    it("should have all required properties", async () => {
      process.env.NODE_ENV = "test";
      process.env.COOKIE_SECRET = "test-secret-for-testing-purposes-minimum-length";

      const { ENV } = await import("../env");
      expect(ENV).toHaveProperty("cookieSecret");
      expect(ENV).toHaveProperty("databaseUrl");
      expect(ENV).toHaveProperty("isProduction");
      expect(ENV).toHaveProperty("nodeEnv");
      expect(ENV).toHaveProperty("frontendUrl");
      expect(ENV).toHaveProperty("port");
    });

    it("should parse port as integer", async () => {
      process.env.NODE_ENV = "test";
      process.env.COOKIE_SECRET = "test-secret";
      process.env.PORT = "3000";

      const { ENV } = await import("../env");
      expect(ENV.port).toBe(3000);
      expect(typeof ENV.port).toBe("number");
    });
  });
});
