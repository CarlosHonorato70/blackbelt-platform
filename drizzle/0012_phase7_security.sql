-- Migration: Add Security Features for Phase 7
-- Created: 2025-12-06
-- Description: Add 2FA, IP whitelisting, session management, and security alerts tables

-- ============================================================================
-- 2FA/MFA TABLE
-- ============================================================================
CREATE TABLE `user_2fa` (
  `id` varchar(64) PRIMARY KEY NOT NULL,
  `userId` varchar(64) NOT NULL UNIQUE,
  `secret` varchar(128) NOT NULL COMMENT 'TOTP secret key',
  `enabled` boolean NOT NULL DEFAULT false,
  `backupCodes` json COMMENT 'Array of backup codes (hashed)',
  `verifiedAt` timestamp COMMENT 'When 2FA was last verified',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now())
);

CREATE INDEX `idx_2fa_user` ON `user_2fa` (`userId`);
CREATE INDEX `idx_2fa_enabled` ON `user_2fa` (`enabled`);

-- ============================================================================
-- IP WHITELIST TABLE (Enterprise feature)
-- ============================================================================
CREATE TABLE `ip_whitelist` (
  `id` varchar(64) PRIMARY KEY NOT NULL,
  `tenantId` varchar(64) NOT NULL,
  `ipAddress` varchar(45) NOT NULL COMMENT 'IPv4 or IPv6 address',
  `description` varchar(255),
  `active` boolean NOT NULL DEFAULT true,
  `createdBy` varchar(64),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now())
);

CREATE INDEX `idx_ip_whitelist_tenant` ON `ip_whitelist` (`tenantId`);
CREATE INDEX `idx_ip_whitelist_ip` ON `ip_whitelist` (`ipAddress`);
CREATE INDEX `idx_ip_whitelist_active` ON `ip_whitelist` (`active`);

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================
CREATE TABLE `sessions` (
  `id` varchar(64) PRIMARY KEY NOT NULL,
  `userId` varchar(64) NOT NULL,
  `tenantId` varchar(64) NOT NULL,
  `token` varchar(255) NOT NULL UNIQUE,
  `ipAddress` varchar(45),
  `userAgent` varchar(500),
  `deviceInfo` json COMMENT 'Browser, OS, device type',
  `lastActivity` timestamp NOT NULL DEFAULT (now()),
  `expiresAt` timestamp NOT NULL,
  `active` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now())
);

CREATE INDEX `idx_session_user` ON `sessions` (`userId`);
CREATE INDEX `idx_session_tenant` ON `sessions` (`tenantId`);
CREATE INDEX `idx_session_token` ON `sessions` (`token`);
CREATE INDEX `idx_session_expires` ON `sessions` (`expiresAt`);
CREATE INDEX `idx_session_active` ON `sessions` (`active`);

-- ============================================================================
-- SECURITY ALERTS TABLE
-- ============================================================================
CREATE TABLE `security_alerts` (
  `id` varchar(64) PRIMARY KEY NOT NULL,
  `tenantId` varchar(64) NOT NULL,
  `userId` varchar(64),
  `alertType` varchar(50) NOT NULL COMMENT 'suspicious_login, failed_2fa, ip_blocked, etc',
  `severity` enum('low', 'medium', 'high', 'critical') NOT NULL,
  `message` text NOT NULL,
  `metadata` json COMMENT 'Additional alert data',
  `ipAddress` varchar(45),
  `resolved` boolean NOT NULL DEFAULT false,
  `resolvedAt` timestamp,
  `resolvedBy` varchar(64),
  `createdAt` timestamp NOT NULL DEFAULT (now())
);

CREATE INDEX `idx_security_alert_tenant` ON `security_alerts` (`tenantId`);
CREATE INDEX `idx_security_alert_user` ON `security_alerts` (`userId`);
CREATE INDEX `idx_security_alert_type` ON `security_alerts` (`alertType`);
CREATE INDEX `idx_security_alert_severity` ON `security_alerts` (`severity`);
CREATE INDEX `idx_security_alert_resolved` ON `security_alerts` (`resolved`);
CREATE INDEX `idx_security_alert_created` ON `security_alerts` (`createdAt`);

-- ============================================================================
-- LOGIN ATTEMPTS TABLE (for security monitoring)
-- ============================================================================
CREATE TABLE `login_attempts` (
  `id` varchar(64) PRIMARY KEY NOT NULL,
  `email` varchar(320) NOT NULL,
  `userId` varchar(64),
  `success` boolean NOT NULL,
  `ipAddress` varchar(45),
  `userAgent` varchar(500),
  `failureReason` varchar(100) COMMENT 'invalid_password, 2fa_failed, account_locked, etc',
  `createdAt` timestamp NOT NULL DEFAULT (now())
);

CREATE INDEX `idx_login_attempt_email` ON `login_attempts` (`email`);
CREATE INDEX `idx_login_attempt_user` ON `login_attempts` (`userId`);
CREATE INDEX `idx_login_attempt_ip` ON `login_attempts` (`ipAddress`);
CREATE INDEX `idx_login_attempt_created` ON `login_attempts` (`createdAt`);
CREATE INDEX `idx_login_attempt_success` ON `login_attempts` (`success`);
