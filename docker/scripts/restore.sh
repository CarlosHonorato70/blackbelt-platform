#!/bin/bash
# MongoDB Restore Script for Black Belt Platform
# Usage: ./restore.sh <backup_file.tar.gz>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    echo "Available backups:"
    ls -lh /backups/blackbelt_backup_*.tar.gz 2>/dev/null || echo "No backups found"
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_DIR="/backups"
TEMP_DIR="/tmp/restore_$(date +%Y%m%d_%H%M%S)"

# MongoDB credentials from environment
MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_ROOT_USER}"
MONGO_PASSWORD="${MONGO_ROOT_PASSWORD}"
MONGO_DB="${MONGO_DATABASE}"

echo "======================================"
echo "Black Belt Platform - MongoDB Restore"
echo "======================================"
echo "Timestamp: $(date)"
echo "Database: ${MONGO_DB}"
echo "Backup File: ${BACKUP_FILE}"
echo "======================================"

# Verify backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

# Extract backup
echo "Extracting backup..."
mkdir -p "${TEMP_DIR}"
tar -xzf "${BACKUP_FILE}" -C "${TEMP_DIR}"

# Find the database directory
DB_DIR=$(find "${TEMP_DIR}" -type d -name "${MONGO_DB}" | head -1)

if [ -z "${DB_DIR}" ]; then
    echo "Error: Database directory not found in backup"
    rm -rf "${TEMP_DIR}"
    exit 1
fi

# Confirm restore
read -p "This will replace the current database. Continue? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore cancelled"
    rm -rf "${TEMP_DIR}"
    exit 0
fi

# Perform the restore
echo "Restoring database..."
mongorestore \
    --host="${MONGO_HOST}" \
    --port="${MONGO_PORT}" \
    --username="${MONGO_USER}" \
    --password="${MONGO_PASSWORD}" \
    --authenticationDatabase=admin \
    --db="${MONGO_DB}" \
    --drop \
    --gzip \
    "${DB_DIR}"

# Cleanup
rm -rf "${TEMP_DIR}"

echo "======================================"
echo "Restore completed successfully!"
echo "======================================"
