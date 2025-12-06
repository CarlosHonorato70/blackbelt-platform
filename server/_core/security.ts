/**
 * Security Middleware Configuration
 * 
 * Implements comprehensive security features including:
 * - Rate limiting for API endpoints
 * - CORS configuration
 * - Helmet security headers
 * - Request logging and monitoring
 */

import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Store in memory (for production, consider Redis)
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health" || req.path === "/api/health";
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * Limits: 5 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Medium rate limiter for data mutations
 * Limits: 30 requests per 15 minutes per IP
 */
export const mutationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs
  message: {
    error: "Too many data modification requests, please slow down.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Email rate limiter
 * Limits: 10 emails per hour per IP
 */
export const emailRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 email requests per hour
  message: {
    error: "Too many email requests, please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * File upload rate limiter
 * Limits: 20 uploads per hour per IP
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: {
    error: "Too many file uploads, please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// HELMET SECURITY HEADERS
// ============================================================================

/**
 * Helmet configuration for security headers
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for development
      styleSrc: ["'self'", "'unsafe-inline'"], // Needed for styled components
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disabled for compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: "deny" },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xssFilter: true,
});

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

/**
 * CORS configuration
 */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173", // Vite dev server
  process.env.VITE_FRONTEND_URL,
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

export const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV === "development") {
      // Allow all origins in development
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-Tenant-ID",
  ],
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
  maxAge: 86400, // 24 hours
});

// ============================================================================
// REQUEST LOGGING
// ============================================================================

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const { method, url, ip } = req;

  // Log request
  console.log(`[${new Date().toISOString()}] ${method} ${url} from ${ip}`);

  // Log response when finished
  res.on("finish", () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(
      `[${new Date().toISOString()}] ${method} ${url} ${statusCode} - ${duration}ms`
    );
  });

  next();
}

// ============================================================================
// SECURITY VALIDATION
// ============================================================================

/**
 * Validate request headers for potential security issues
 */
export function validateHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Check for suspicious user agents
  const userAgent = req.get("user-agent") || "";
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /burp/i,
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
    console.warn(
      `[SECURITY] Suspicious user agent detected: ${userAgent} from ${req.ip}`
    );
    return res.status(403).json({ error: "Forbidden" });
  }

  // Validate content length
  const contentLength = parseInt(req.get("content-length") || "0");
  if (contentLength > 50 * 1024 * 1024) {
    // 50MB limit
    console.warn(
      `[SECURITY] Request body too large: ${contentLength} bytes from ${req.ip}`
    );
    return res
      .status(413)
      .json({ error: "Request entity too large", maxSize: "50MB" });
  }

  next();
}

// ============================================================================
// IP BLOCKING
// ============================================================================

const blockedIPs = new Set<string>();
const suspiciousIPs = new Map<string, number>(); // IP -> violation count

/**
 * Track and block suspicious IPs
 */
export function ipMonitoring(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  // Check if IP is blocked
  if (blockedIPs.has(ip)) {
    console.warn(`[SECURITY] Blocked IP attempted access: ${ip}`);
    return res.status(403).json({ error: "Access denied" });
  }

  // Track suspicious behavior
  res.on("finish", () => {
    if (res.statusCode === 403 || res.statusCode === 429) {
      const violations = (suspiciousIPs.get(ip) || 0) + 1;
      suspiciousIPs.set(ip, violations);

      // Block IP after 5 violations
      if (violations >= 5) {
        blockedIPs.add(ip);
        console.warn(
          `[SECURITY] IP blocked due to repeated violations: ${ip}`
        );
      }
    }
  });

  next();
}

/**
 * Unblock an IP (for administrative purposes)
 */
export function unblockIP(ip: string) {
  blockedIPs.delete(ip);
  suspiciousIPs.delete(ip);
  console.log(`[SECURITY] IP unblocked: ${ip}`);
}

/**
 * Get list of blocked IPs
 */
export function getBlockedIPs(): string[] {
  return Array.from(blockedIPs);
}

/**
 * Get suspicious IP statistics
 */
export function getSuspiciousIPs(): Map<string, number> {
  return new Map(suspiciousIPs);
}

// ============================================================================
// TENANT ISOLATION VALIDATION
// ============================================================================

/**
 * Validate tenant isolation in requests
 */
export function validateTenantIsolation(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip for non-API routes
  if (!req.path.startsWith("/api/trpc")) {
    return next();
  }

  // Tenant ID should be in context, not directly accessible in headers
  // This is handled by tRPC middleware, but we add an extra layer
  const tenantHeader = req.get("X-Tenant-ID");

  if (tenantHeader) {
    // Log potential security issue
    console.warn(
      `[SECURITY] Direct tenant ID in header from ${req.ip}: ${tenantHeader}`
    );
  }

  next();
}

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * Health check endpoint (bypasses rate limiting)
 */
export function healthCheck(req: Request, res: Response) {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    blockedIPs: blockedIPs.size,
    suspiciousIPs: suspiciousIPs.size,
  };

  res.status(200).json(health);
}
