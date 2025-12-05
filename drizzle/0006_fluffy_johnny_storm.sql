CREATE TABLE `copsoq_invites` (
	`id` varchar(64) NOT NULL,
	`assessmentId` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`respondentEmail` varchar(320) NOT NULL,
	`respondentName` varchar(255) NOT NULL,
	`respondentPosition` varchar(255),
	`sectorId` varchar(64),
	`inviteToken` varchar(255) NOT NULL,
	`status` enum('pending','sent','viewed','completed','expired') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`viewedAt` timestamp,
	`completedAt` timestamp,
	`expiresAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `copsoq_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `copsoq_invites_inviteToken_unique` UNIQUE(`inviteToken`)
);
