-- Migration: Add White-Label fields for Phase 5 (Enterprise)
-- Created: 2025-12-06
-- Description: Add branding customization fields to tenants table for Enterprise white-label features

-- Add White-Label / Branding fields to tenants table
ALTER TABLE `tenants` ADD COLUMN `logoUrl` varchar(500);
ALTER TABLE `tenants` ADD COLUMN `faviconUrl` varchar(500);
ALTER TABLE `tenants` ADD COLUMN `primaryColor` varchar(7) DEFAULT '#3b82f6';
ALTER TABLE `tenants` ADD COLUMN `secondaryColor` varchar(7) DEFAULT '#10b981';
ALTER TABLE `tenants` ADD COLUMN `customDomain` varchar(255);
ALTER TABLE `tenants` ADD COLUMN `customDomainVerified` boolean DEFAULT false;
ALTER TABLE `tenants` ADD COLUMN `emailSenderName` varchar(255);
ALTER TABLE `tenants` ADD COLUMN `emailSenderEmail` varchar(320);
ALTER TABLE `tenants` ADD COLUMN `whiteLabelEnabled` boolean DEFAULT false;

-- Create index for custom domain lookup
CREATE INDEX `idx_tenant_custom_domain` ON `tenants` (`customDomain`);
