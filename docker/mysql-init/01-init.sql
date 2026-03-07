-- Black Belt Platform - Database Initialization
-- This script runs automatically when the MySQL container starts for the first time

CREATE DATABASE IF NOT EXISTS blackbelt
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Ensure the application user has full access
GRANT ALL PRIVILEGES ON blackbelt.* TO 'blackbelt'@'%';
FLUSH PRIVILEGES;
