-- Add S-2210 event type to eSocial exports enum
ALTER TABLE `esocial_exports` MODIFY COLUMN `esocialEventType` ENUM('S-2210', 'S-2220', 'S-2240') NOT NULL;

-- Add customizable sections to proposals
ALTER TABLE `proposals` ADD COLUMN `scope` TEXT NULL;
ALTER TABLE `proposals` ADD COLUMN `methodology` TEXT NULL;
ALTER TABLE `proposals` ADD COLUMN `deliverables` JSON NULL;
ALTER TABLE `proposals` ADD COLUMN `timeline` TEXT NULL;
ALTER TABLE `proposals` ADD COLUMN `paymentTerms` TEXT NULL;
ALTER TABLE `proposals` ADD COLUMN `terms` TEXT NULL;
