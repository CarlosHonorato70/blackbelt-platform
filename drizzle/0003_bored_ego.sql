CREATE TABLE `assessment_proposals` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`assessmentId` varchar(64) NOT NULL,
	`proposalId` varchar(64) NOT NULL,
	`recommendedServices` json,
	`riskLevel` enum('low','medium','high') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`cnpj` varchar(18),
	`industry` varchar(100),
	`companySize` enum('micro','small','medium','large'),
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`contactPhone` varchar(20),
	`street` varchar(255),
	`number` varchar(20),
	`complement` varchar(100),
	`neighborhood` varchar(100),
	`city` varchar(100),
	`state` varchar(2),
	`zipCode` varchar(10),
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricing_parameters` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`monthlyFixedCost` int NOT NULL,
	`laborCost` int NOT NULL,
	`productiveHoursPerMonth` int NOT NULL,
	`defaultTaxRegime` enum('MEI','SN','LP','autonomous') NOT NULL DEFAULT 'SN',
	`volumeDiscounts` json,
	`riskAdjustment` int NOT NULL DEFAULT 100,
	`seniorityAdjustment` int NOT NULL DEFAULT 100,
	`taxRates` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pricing_parameters_id` PRIMARY KEY(`id`),
	CONSTRAINT `pricing_parameters_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `proposal_items` (
	`id` varchar(64) NOT NULL,
	`proposalId` varchar(64) NOT NULL,
	`serviceId` varchar(64) NOT NULL,
	`serviceName` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`unitPrice` int NOT NULL,
	`subtotal` int NOT NULL,
	`technicalHours` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposal_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `proposals` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`clientId` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`status` enum('draft','sent','accepted','rejected','expired') NOT NULL DEFAULT 'draft',
	`subtotal` int NOT NULL,
	`discount` int NOT NULL DEFAULT 0,
	`discountPercent` int NOT NULL DEFAULT 0,
	`taxes` int NOT NULL DEFAULT 0,
	`totalValue` int NOT NULL,
	`taxRegime` enum('MEI','SN','LP','autonomous') NOT NULL,
	`validUntil` datetime,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	`respondedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100) NOT NULL,
	`unit` enum('hour','day','project','month') NOT NULL DEFAULT 'hour',
	`minPrice` int NOT NULL,
	`maxPrice` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_assess_proposal_tenant` ON `assessment_proposals` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_assess_proposal_assessment` ON `assessment_proposals` (`assessmentId`);--> statement-breakpoint
CREATE INDEX `idx_assess_proposal_proposal` ON `assessment_proposals` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_client_tenant` ON `clients` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_client_cnpj` ON `clients` (`cnpj`);--> statement-breakpoint
CREATE INDEX `idx_client_email` ON `clients` (`contactEmail`);--> statement-breakpoint
CREATE INDEX `idx_pricing_param_tenant` ON `pricing_parameters` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_proposal_item_proposal` ON `proposal_items` (`proposalId`);--> statement-breakpoint
CREATE INDEX `idx_proposal_item_service` ON `proposal_items` (`serviceId`);--> statement-breakpoint
CREATE INDEX `idx_proposal_tenant_client` ON `proposals` (`tenantId`,`clientId`);--> statement-breakpoint
CREATE INDEX `idx_proposal_status` ON `proposals` (`status`);--> statement-breakpoint
CREATE INDEX `idx_proposal_date` ON `proposals` (`generatedAt`);--> statement-breakpoint
CREATE INDEX `idx_service_tenant` ON `services` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_service_category` ON `services` (`category`);