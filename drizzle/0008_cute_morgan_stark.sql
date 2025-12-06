CREATE TABLE `feature_flags` (
	`id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`description` text,
	`category` enum('core','reports','integrations','customization','support') NOT NULL DEFAULT 'core',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `feature_flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `feature_flags_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`subscriptionId` varchar(64) NOT NULL,
	`stripeInvoiceId` varchar(255),
	`mercadoPagoInvoiceId` varchar(255),
	`subtotal` int NOT NULL,
	`discount` int NOT NULL DEFAULT 0,
	`tax` int NOT NULL DEFAULT 0,
	`total` int NOT NULL,
	`status` enum('draft','open','paid','void','uncollectible') NOT NULL DEFAULT 'draft',
	`description` text,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`dueDate` timestamp,
	`paidAt` timestamp,
	`paymentMethod` varchar(50),
	`invoiceUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_features` (
	`id` varchar(64) NOT NULL,
	`planId` varchar(64) NOT NULL,
	`featureId` varchar(64) NOT NULL,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plan_features_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_plan_feature` UNIQUE(`planId`,`featureId`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` varchar(64) NOT NULL,
	`name` varchar(100) NOT NULL,
	`displayName` varchar(100) NOT NULL,
	`description` text,
	`monthlyPrice` int NOT NULL,
	`yearlyPrice` int NOT NULL,
	`maxTenants` int NOT NULL,
	`maxUsersPerTenant` int NOT NULL,
	`maxStorageGB` int NOT NULL,
	`maxApiRequestsPerDay` int NOT NULL,
	`hasAdvancedReports` boolean NOT NULL DEFAULT false,
	`hasApiAccess` boolean NOT NULL DEFAULT false,
	`hasWebhooks` boolean NOT NULL DEFAULT false,
	`hasWhiteLabel` boolean NOT NULL DEFAULT false,
	`hasPrioritySupport` boolean NOT NULL DEFAULT false,
	`hasSLA` boolean NOT NULL DEFAULT false,
	`slaUptime` int,
	`trialDays` int NOT NULL DEFAULT 14,
	`isActive` boolean NOT NULL DEFAULT true,
	`isPublic` boolean NOT NULL DEFAULT true,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`planId` varchar(64) NOT NULL,
	`status` enum('trialing','active','past_due','canceled','unpaid') NOT NULL DEFAULT 'trialing',
	`billingCycle` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	`startDate` timestamp NOT NULL DEFAULT (now()),
	`currentPeriodStart` timestamp NOT NULL,
	`currentPeriodEnd` timestamp NOT NULL,
	`trialEnd` timestamp,
	`canceledAt` timestamp,
	`endedAt` timestamp,
	`stripeSubscriptionId` varchar(255),
	`stripeCustomerId` varchar(255),
	`mercadoPagoSubscriptionId` varchar(255),
	`currentPrice` int NOT NULL,
	`autoRenew` boolean NOT NULL DEFAULT true,
	`cancelAtPeriodEnd` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `usage_metrics` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`activeUsers` int NOT NULL DEFAULT 0,
	`storageUsedGB` int NOT NULL DEFAULT 0,
	`apiRequests` int NOT NULL DEFAULT 0,
	`assessmentsCreated` int NOT NULL DEFAULT 0,
	`proposalsGenerated` int NOT NULL DEFAULT 0,
	`additionalMetrics` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usage_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_feature_name` ON `feature_flags` (`name`);--> statement-breakpoint
CREATE INDEX `idx_feature_category` ON `feature_flags` (`category`);--> statement-breakpoint
CREATE INDEX `idx_invoice_tenant` ON `invoices` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_invoice_subscription` ON `invoices` (`subscriptionId`);--> statement-breakpoint
CREATE INDEX `idx_invoice_status` ON `invoices` (`status`);--> statement-breakpoint
CREATE INDEX `idx_invoice_due_date` ON `invoices` (`dueDate`);--> statement-breakpoint
CREATE INDEX `idx_plan_feature_plan` ON `plan_features` (`planId`);--> statement-breakpoint
CREATE INDEX `idx_plan_feature_feature` ON `plan_features` (`featureId`);--> statement-breakpoint
CREATE INDEX `idx_plan_name` ON `plans` (`name`);--> statement-breakpoint
CREATE INDEX `idx_plan_active` ON `plans` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_subscription_tenant` ON `subscriptions` (`tenantId`);--> statement-breakpoint
CREATE INDEX `idx_subscription_plan` ON `subscriptions` (`planId`);--> statement-breakpoint
CREATE INDEX `idx_subscription_status` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_subscription_stripe` ON `subscriptions` (`stripeSubscriptionId`);--> statement-breakpoint
CREATE INDEX `idx_usage_tenant_period` ON `usage_metrics` (`tenantId`,`periodStart`);