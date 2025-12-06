-- Migration: Add PDF Exports table for Phase 4
-- Created: 2025-12-06

CREATE TABLE `pdf_exports` (
	`id` varchar(64) PRIMARY KEY NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`documentType` enum('proposal','assessment','report','invoice','contract') NOT NULL,
	`documentId` varchar(64) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`fileSize` int NOT NULL,
	`mimeType` varchar(100) NOT NULL DEFAULT 'application/pdf',
	`s3Key` varchar(500),
	`s3Bucket` varchar(100),
	`url` varchar(1000),
	`status` enum('pending','processing','completed','failed','expired') NOT NULL DEFAULT 'pending',
	`metadata` json,
	`errorMessage` text,
	`brandingApplied` boolean NOT NULL DEFAULT false,
	`customLogo` varchar(500),
	`customColors` json,
	`emailSent` boolean NOT NULL DEFAULT false,
	`emailTo` varchar(320),
	`emailSentAt` timestamp,
	`expiresAt` timestamp,
	`downloadCount` int NOT NULL DEFAULT 0,
	`lastDownloadedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now())
);

-- Create indexes for better query performance
CREATE INDEX `idx_pdf_export_tenant` ON `pdf_exports` (`tenantId`);
CREATE INDEX `idx_pdf_export_user` ON `pdf_exports` (`userId`);
CREATE INDEX `idx_pdf_export_doc_type` ON `pdf_exports` (`documentType`);
CREATE INDEX `idx_pdf_export_doc_id` ON `pdf_exports` (`documentId`);
CREATE INDEX `idx_pdf_export_status` ON `pdf_exports` (`status`);
CREATE INDEX `idx_pdf_export_created` ON `pdf_exports` (`createdAt`);
