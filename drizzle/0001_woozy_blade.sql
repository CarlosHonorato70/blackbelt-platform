CREATE TABLE `audit_logs` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64),
	`userId` varchar(64) NOT NULL,
	`action` varchar(50) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` varchar(64),
	`oldValues` json,
	`newValues` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_consents` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`personId` varchar(64) NOT NULL,
	`consentType` varchar(50) NOT NULL,
	`granted` boolean NOT NULL,
	`grantedAt` timestamp,
	`revokedAt` timestamp,
	`ipAddress` varchar(45),
	`userAgent` text,
	`version` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `data_consents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `people` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`sectorId` varchar(64),
	`name` varchar(255) NOT NULL,
	`position` varchar(255),
	`email` varchar(320),
	`phone` varchar(20),
	`employmentType` enum('own','outsourced') NOT NULL DEFAULT 'own',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `people_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`resource` varchar(50) NOT NULL,
	`action` varchar(50) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` varchar(64) NOT NULL,
	`roleId` varchar(64) NOT NULL,
	`permissionId` varchar(64) NOT NULL,
	`tenantId` varchar(64),
	`conditions` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(64) NOT NULL,
	`systemName` varchar(100) NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`description` text,
	`scope` enum('global','tenant') NOT NULL DEFAULT 'tenant',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_systemName_unique` UNIQUE(`systemName`)
);
--> statement-breakpoint
CREATE TABLE `sectors` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`responsibleName` varchar(255),
	`unit` varchar(100),
	`shift` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sectors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_settings` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenant_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_tenant_setting` UNIQUE(`tenantId`,`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`cnpj` varchar(18) NOT NULL,
	`street` varchar(255),
	`number` varchar(20),
	`complement` varchar(100),
	`neighborhood` varchar(100),
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`contactPhone` varchar(20),
	`status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
	`strategy` enum('shared_rls','dedicated_schema') NOT NULL DEFAULT 'shared_rls',
	`schemaName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_cnpj_unique` UNIQUE(`cnpj`)
);
--> statement-breakpoint
CREATE TABLE `user_invites` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64),
	`email` varchar(320) NOT NULL,
	`roleId` varchar(64) NOT NULL,
	`token` varchar(255) NOT NULL,
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`invitedBy` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` varchar(64) NOT NULL,
	`userId` varchar(64) NOT NULL,
	`roleId` varchar(64) NOT NULL,
	`tenantId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_audit_tenant_time` ON `audit_logs` (`tenantId`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_audit_user_time` ON `audit_logs` (`userId`,`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entityType`,`entityId`);--> statement-breakpoint
CREATE INDEX `idx_consent_person` ON `data_consents` (`personId`,`consentType`);--> statement-breakpoint
CREATE INDEX `idx_consent_tenant` ON `data_consents` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_people_tenant` ON `people` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_people_tenant_sector` ON `people` (`tenantId`,`sectorId`);--> statement-breakpoint
CREATE INDEX `idx_people_email` ON `people` (`email`);--> statement-breakpoint
CREATE INDEX `idx_perm_resource_action` ON `permissions` (`resource`,`action`);--> statement-breakpoint
CREATE INDEX `idx_role_perm` ON `role_permissions` (`roleId`,`permissionId`);--> statement-breakpoint
CREATE INDEX `idx_role_perm_tenant` ON `role_permissions` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_role_scope` ON `roles` (`scope`);--> statement-breakpoint
CREATE INDEX `idx_sector_tenant` ON `sectors` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_sector_tenant_name` ON `sectors` (`tenantId`,`name`);--> statement-breakpoint
CREATE INDEX `idx_setting_tenant` ON `tenant_settings` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_tenant_name` ON `tenants` (`name`);--> statement-breakpoint
CREATE INDEX `idx_tenant_status` ON `tenants` (`status`);--> statement-breakpoint
CREATE INDEX `idx_invite_email_status` ON `user_invites` (`email`,`status`);--> statement-breakpoint
CREATE INDEX `idx_invite_tenant` ON `user_invites` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_invite_token` ON `user_invites` (`token`);--> statement-breakpoint
CREATE INDEX `idx_user_role_tenant` ON `user_roles` (`userId`,`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_user_role` ON `user_roles` (`userId`,`roleId`);