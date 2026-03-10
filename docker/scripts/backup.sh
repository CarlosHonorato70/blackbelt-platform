#!/bin/bash
# ============================================================
# Black Belt Platform - MySQL Backup Script (com verificacao)
# Usage: ./backup.sh (manual ou via cron no container backup)
# Cron:  0 3 * * * /scripts/backup.sh >> /var/log/backup.log 2>&1
# ============================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
MYSQL_HOST="${MYSQL_HOST:-mysql}"
MYSQL_PORT="${MYSQL_PORT:-3306}"
MYSQL_USER="${MYSQL_USER:-blackbelt}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-blackbelt_secret}"
MYSQL_DATABASE="${MYSQL_DATABASE:-blackbelt}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/blackbelt_${TIMESTAMP}.sql.gz"

echo "[$(date)] =============================="
echo "[$(date)] Starting MySQL backup..."
echo "[$(date)] Host: ${MYSQL_HOST}:${MYSQL_PORT}"
echo "[$(date)] Database: ${MYSQL_DATABASE}"

# Run mysqldump and compress
if ! mysqldump \
  --host="${MYSQL_HOST}" \
  --port="${MYSQL_PORT}" \
  --user="${MYSQL_USER}" \
  --password="${MYSQL_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  --databases "${MYSQL_DATABASE}" \
  2>/dev/null | gzip > "${BACKUP_FILE}"; then
  echo "[$(date)] ERROR: mysqldump failed!"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Verify backup integrity
if ! gzip -t "${BACKUP_FILE}" 2>/dev/null; then
  echo "[$(date)] ERROR: Backup file is corrupted!"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

BACKUP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[$(date)] Backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})"

# Clean up old backups
echo "[$(date)] Removing backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "blackbelt_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

REMAINING=$(ls -1 "${BACKUP_DIR}"/blackbelt_*.sql.gz 2>/dev/null | wc -l)
echo "[$(date)] Done. ${REMAINING} backup(s) retained."
echo "[$(date)] =============================="
