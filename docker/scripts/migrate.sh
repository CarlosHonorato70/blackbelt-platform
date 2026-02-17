#!/bin/bash
# Database Migration Script for Black Belt Platform

set -e

echo "======================================"
echo "Black Belt Platform - Database Migration"
echo "======================================"
echo "Timestamp: $(date)"
echo "======================================"

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL}" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "Generating migration files..."
pnpm drizzle-kit generate

echo "Running migrations..."
pnpm drizzle-kit migrate

echo "======================================"
echo "Migration completed successfully!"
echo "======================================"
