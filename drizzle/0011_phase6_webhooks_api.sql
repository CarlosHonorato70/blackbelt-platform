-- Migration: Add Webhooks and API Keys for Phase 6
-- Created: 2025-12-06
-- Description: Add webhooks, webhook_deliveries, and api_keys tables for Phase 6 (Webhooks and Public API)

-- ============================================================================
-- WEBHOOKS TABLE
-- ============================================================================
CREATE TABLE `webhooks` (
  `id` varchar(64) PRIMARY KEY NOT NULL,
  `tenantId` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `url` varchar(500) NOT NULL,
  `secret` varchar(128) NOT NULL,
  `events` json NOT NULL COMMENT 'Array of event types like ["assessment.created", "proposal.sent"]',
  `active` boolean NOT NULL DEFAULT true,
  `description` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now())
);

CREATE INDEX `idx_webhook_tenant` ON `webhooks` (`tenantId`);
CREATE INDEX `idx_webhook_active` ON `webhooks` (`active`);

-- ============================================================================
-- WEBHOOK DELIVERIES TABLE (Logs de entregas)
-- ============================================================================
CREATE TABLE `webhook_deliveries` (
  `id` varchar(64) PRIMARY KEY NOT NULL,
  `webhookId` varchar(64) NOT NULL,
  `eventType` varchar(100) NOT NULL,
  `payload` json NOT NULL,
  `responseStatus` int,
  `responseBody` text,
  `responseHeaders` json,
  `deliveredAt` timestamp,
  `attempts` int NOT NULL DEFAULT 0,
  `maxAttempts` int NOT NULL DEFAULT 5,
  `nextRetryAt` timestamp,
  `lastError` text,
  `success` boolean DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT (now())
);

CREATE INDEX `idx_delivery_webhook` ON `webhook_deliveries` (`webhookId`);
CREATE INDEX `idx_delivery_event` ON `webhook_deliveries` (`eventType`);
CREATE INDEX `idx_delivery_next_retry` ON `webhook_deliveries` (`nextRetryAt`);
CREATE INDEX `idx_delivery_created` ON `webhook_deliveries` (`createdAt`);

-- ============================================================================
-- API KEYS TABLE
-- ============================================================================
CREATE TABLE `api_keys` (
  `id` varchar(64) PRIMARY KEY NOT NULL,
  `tenantId` varchar(64) NOT NULL,
  `name` varchar(255) NOT NULL,
  `keyHash` varchar(64) NOT NULL UNIQUE COMMENT 'SHA-256 hash of the API key',
  `keyPrefix` varchar(16) NOT NULL COMMENT 'First chars for display (e.g., "pk_live_****")',
  `scopes` json NOT NULL COMMENT 'Array of scopes like ["assessments:read", "proposals:write"]',
  `lastUsedAt` timestamp,
  `expiresAt` timestamp,
  `active` boolean NOT NULL DEFAULT true,
  `description` text,
  `rateLimit` int COMMENT 'Requests per hour (null = unlimited)',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now())
);

CREATE INDEX `idx_api_key_tenant` ON `api_keys` (`tenantId`);
CREATE INDEX `idx_api_key_hash` ON `api_keys` (`keyHash`);
CREATE INDEX `idx_api_key_active` ON `api_keys` (`active`);
CREATE INDEX `idx_api_key_expires` ON `api_keys` (`expiresAt`);

-- ============================================================================
-- API KEY USAGE LOGS (Optional - for rate limiting and analytics)
-- ============================================================================
CREATE TABLE `api_key_usage` (
  `id` varchar(64) PRIMARY KEY NOT NULL,
  `apiKeyId` varchar(64) NOT NULL,
  `endpoint` varchar(255) NOT NULL,
  `method` varchar(10) NOT NULL,
  `statusCode` int NOT NULL,
  `requestDuration` int COMMENT 'Duration in milliseconds',
  `ipAddress` varchar(45),
  `userAgent` varchar(500),
  `createdAt` timestamp NOT NULL DEFAULT (now())
);

CREATE INDEX `idx_api_usage_key` ON `api_key_usage` (`apiKeyId`);
CREATE INDEX `idx_api_usage_created` ON `api_key_usage` (`createdAt`);
CREATE INDEX `idx_api_usage_endpoint` ON `api_key_usage` (`endpoint`);
