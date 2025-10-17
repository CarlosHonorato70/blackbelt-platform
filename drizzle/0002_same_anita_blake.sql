CREATE TABLE `action_plans` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`assessmentItemId` varchar(64),
	`title` varchar(255) NOT NULL,
	`description` text,
	`actionType` enum('elimination','substitution','engineering','administrative','ppe') NOT NULL,
	`responsibleId` varchar(64),
	`deadline` timestamp,
	`status` enum('pending','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`budget` int,
	`completedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `action_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `compliance_documents` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`documentType` enum('gro','inventory','action_plan','training_record','audit_report') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`fileUrl` varchar(500),
	`version` varchar(20) DEFAULT '1.0',
	`validFrom` timestamp NOT NULL,
	`validUntil` timestamp,
	`status` enum('draft','active','expired','archived') NOT NULL DEFAULT 'draft',
	`signedBy` varchar(255),
	`signedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `compliance_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `individual_sessions` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`personId` varchar(64) NOT NULL,
	`sessionType` enum('psychological','mentoring','coaching','medical') NOT NULL,
	`professional` varchar(255),
	`scheduledAt` timestamp NOT NULL,
	`duration` int,
	`status` enum('scheduled','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`followUp` text,
	`completedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `individual_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `intervention_programs` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`programType` enum('training','mentoring','workshop','therapy','resilience','leadership') NOT NULL,
	`targetAudience` text,
	`duration` int,
	`facilitator` varchar(255),
	`startDate` timestamp,
	`endDate` timestamp,
	`status` enum('planned','active','completed','cancelled') NOT NULL DEFAULT 'planned',
	`maxParticipants` int,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `intervention_programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mental_health_indicators` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`sectorId` varchar(64),
	`period` varchar(20) NOT NULL,
	`absenteeismRate` int,
	`turnoverRate` int,
	`burnoutCases` int,
	`stressLevel` int,
	`engagementScore` int,
	`satisfactionScore` int,
	`incidentsReported` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `mental_health_indicators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `program_participants` (
	`id` varchar(64) NOT NULL,
	`programId` varchar(64) NOT NULL,
	`personId` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`enrolledAt` timestamp DEFAULT (now()),
	`completedAt` timestamp,
	`attendance` int,
	`feedback` text,
	`rating` int,
	CONSTRAINT `program_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `psychosocial_surveys` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`surveyType` enum('climate','stress','burnout','engagement','custom') NOT NULL,
	`questions` json,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `psychosocial_surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_assessment_items` (
	`id` varchar(64) NOT NULL,
	`assessmentId` varchar(64) NOT NULL,
	`riskFactorId` varchar(64) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL,
	`probability` enum('rare','unlikely','possible','likely','certain') NOT NULL,
	`riskLevel` enum('low','medium','high','critical') NOT NULL,
	`affectedPopulation` int,
	`currentControls` text,
	`observations` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `risk_assessment_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_assessments` (
	`id` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`sectorId` varchar(64),
	`title` varchar(255) NOT NULL,
	`description` text,
	`assessmentDate` timestamp NOT NULL,
	`assessor` varchar(255),
	`status` enum('draft','in_progress','completed','reviewed') NOT NULL DEFAULT 'draft',
	`methodology` text,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()),
	CONSTRAINT `risk_assessments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_categories` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`order` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `risk_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_factors` (
	`id` varchar(64) NOT NULL,
	`categoryId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`referenceNorm` varchar(100),
	`order` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `risk_factors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` varchar(64) NOT NULL,
	`surveyId` varchar(64) NOT NULL,
	`personId` varchar(64) NOT NULL,
	`tenantId` varchar(64) NOT NULL,
	`responses` json,
	`score` int,
	`riskLevel` enum('low','medium','high','critical'),
	`isAnonymous` boolean DEFAULT false,
	`completedAt` timestamp DEFAULT (now()),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `survey_responses_id` PRIMARY KEY(`id`)
);
