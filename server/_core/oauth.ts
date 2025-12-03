// OAuth routes removed - using local authentication instead
// See server/routers/auth-standalone.ts for authentication endpoints

import type { Express } from "express";

export function registerOAuthRoutes(app: Express) {
  // No OAuth routes needed for standalone version
}
