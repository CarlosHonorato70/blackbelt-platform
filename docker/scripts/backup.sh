#!/bin/bash
# ============================================================
# Black Belt Platform - MySQL Backup Script
# Usage: ./backup.sh
# Cron:  0 3 * * * /path/to/backup.sh >> /var/log/blackbelt-backup.log 2>&1
# ============================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./docker/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-blackbelt}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-blackbelt_secret}"
MYSQL_DATABASE="${MYSQL_DATABASE:-blackbelt}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/blackbelt_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup..."

# Run mysqldump and compress
mysqldump \
  --host="${MYSQL_HOST}" \
  --port="${MYSQL_PORT}" \
  --user="${MYSQL_USER}" \
  --password="${MYSQL_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  --databases "${MYSQL_DATABASE}" \
  | gzip > "${BACKUP_FILE}"

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[$(date)] Backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Clean up old backups
echo "[$(date)] Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "blackbelt_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

REMAINING=$(ls -1 "${BACKUP_DIR}"/blackbelt_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Backup complete. ${REMAINING} backup(s) retained."
