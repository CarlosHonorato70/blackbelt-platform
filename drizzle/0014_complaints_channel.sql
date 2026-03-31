-- Migration: Add complaint channel enhancements
-- Adds adminNotes column and extends category enum for anonymous_reports

ALTER TABLE `anonymous_reports`
  ADD COLUMN `adminNotes` TEXT DEFAULT NULL AFTER `resolution`;

ALTER TABLE `anonymous_reports`
  MODIFY COLUMN `reportCategory` ENUM(
    'harassment', 'discrimination', 'violence', 'workload', 'leadership', 'other',
    'assedio_moral', 'assedio_sexual', 'condicoes_trabalho', 'violencia_psicologica'
  ) NOT NULL;
