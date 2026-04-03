-- Consultant Certifications table
CREATE TABLE IF NOT EXISTS `consultant_certifications` (
  `id` VARCHAR(64) PRIMARY KEY,
  `tenantId` VARCHAR(64) NOT NULL,
  `uploadedBy` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `registryNumber` VARCHAR(100),
  `certType` VARCHAR(50) NOT NULL,
  `issuer` VARCHAR(255),
  `issuedAt` TIMESTAMP NULL,
  `expiresAt` TIMESTAMP NULL,
  `fileKey` VARCHAR(500) NOT NULL,
  `fileUrl` VARCHAR(1000) NOT NULL,
  `fileName` VARCHAR(255) NOT NULL,
  `fileSize` INT NOT NULL,
  `mimeType` VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `isSigningCert` BOOLEAN NOT NULL DEFAULT FALSE,
  `certPassword` VARCHAR(500),
  `certSubject` VARCHAR(500),
  `certValidTo` TIMESTAMP NULL,
  `notes` TEXT,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_cert_tenant` (`tenantId`),
  INDEX `idx_cert_type` (`certType`),
  INDEX `idx_cert_status` (`status`)
);

-- Add new columns if table already exists (idempotent)
ALTER TABLE `consultant_certifications`
  ADD COLUMN IF NOT EXISTS `isSigningCert` BOOLEAN NOT NULL DEFAULT FALSE AFTER `status`,
  ADD COLUMN IF NOT EXISTS `certPassword` VARCHAR(500) AFTER `isSigningCert`,
  ADD COLUMN IF NOT EXISTS `certSubject` VARCHAR(500) AFTER `certPassword`,
  ADD COLUMN IF NOT EXISTS `certValidTo` TIMESTAMP NULL AFTER `certSubject`;
