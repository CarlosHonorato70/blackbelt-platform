#!/bin/bash
# MongoDB Backup Script for Black Belt Platform
# This script creates compressed backups of the MongoDB database

set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="blackbelt_backup_${DATE}"
RETENTION_DAYS=30

# MongoDB credentials from environment
MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_ROOT_USER}"
MONGO_PASSWORD="${MONGO_ROOT_PASSWORD}"
MONGO_DB="${MONGO_DATABASE}"

echo "======================================"
echo "Black Belt Platform - MongoDB Backup"
echo "======================================"
echo "Timestamp: $(date)"
echo "Database: ${MONGO_DB}"
echo "Backup Directory: ${BACKUP_DIR}"
echo "======================================"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Perform the backup
echo "Starting backup..."
mongodump \
    --host="${MONGO_HOST}" \
    --port="${MONGO_PORT}" \
    --username="${MONGO_USER}" \
    --password="${MONGO_PASSWORD}" \
    --authenticationDatabase=admin \
    --db="${MONGO_DB}" \
    --out="${BACKUP_DIR}/${BACKUP_NAME}" \
    --gzip

# Create archive
echo "Creating compressed archive..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
rm -rf "${BACKUP_NAME}"

# Get backup size
BACKUP_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
echo "Backup completed: ${BACKUP_NAME}.tar.gz (${BACKUP_SIZE})"

# Remove old backups
echo "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "blackbelt_backup_*.tar.gz" -type f -mtime +${RETENTION_DAYS} -delete

# List current backups
echo "======================================"
echo "Current backups:"
ls -lh "${BACKUP_DIR}"/blackbelt_backup_*.tar.gz 2>/dev/null || echo "No backups found"
echo "======================================"
echo "Backup process completed successfully!"
