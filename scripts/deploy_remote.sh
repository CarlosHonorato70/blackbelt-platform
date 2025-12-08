#!/usr/bin/env bash
set -e
DEPLOY_PATH="${1:-/home/deploy/blackbelt}"

cd "$DEPLOY_PATH"
docker compose pull || true
docker compose up -d --remove-orphans
docker image prune -f

echo "Deploy completo."
