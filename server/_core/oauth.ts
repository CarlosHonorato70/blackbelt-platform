// OAuth routes removed - using local authentication instead
// See server/routers/auth-local.ts for authentication endpoints
import { log } from "./logger";

import type { Express } from "express";

export function registerOAuthRoutes(_app: Express) {
  log.info("OAuth routes not configured - using local authentication");
  // No OAuth routes needed for standalone version
}
