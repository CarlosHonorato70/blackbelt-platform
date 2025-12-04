CREATE TABLE `copsoq_reminders` (
	`id` varchar(64) NOT NULL,
	`invite_id` varchar(64) NOT NULL,
	`assessment_id` varchar(64) NOT NULL,
	`respondent_email` varchar(320) NOT NULL,
	`respondent_name` varchar(255) NOT NULL,
	`reminder_number` int NOT NULL DEFAULT 1,
	`sent_at` timestamp NOT NULL DEFAULT (now()),
	`next_reminder_at` timestamp,
	`status` enum('sent','failed','bounced') NOT NULL DEFAULT 'sent',
	`error_message` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `copsoq_reminders_id` PRIMARY KEY(`id`)
);
