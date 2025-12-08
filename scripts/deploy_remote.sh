#!/usr/bin/env bash
# Uso: ./deploy_remote.sh /home/deploy/blackbelt
set -e

DEPLOY_PATH="${1:-/home/deploy/blackbelt}"

if [ ! -d "$DEPLOY_PATH" ]; then
  echo "Diretório $DEPLOY_PATH não existe. Saindo."
  exit 1
fi

cd "$DEPLOY_PATH"

docker compose pull || true
docker compose up -d --remove-orphans
docker image prune -f

echo "Deploy concluído."
