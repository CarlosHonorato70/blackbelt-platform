# Deploy automático via GitHub Actions + GHCR + SSH

Fluxo:
1. Build Docker (Dockerfile.production)
2. Push para GHCR com tag SHA
3. Copia docker-compose.production.yml via SCP
4. Executa docker compose pull + up remotamente

Segredos necessários:
- GHCR_TOKEN
- SSH_PRIVATE_KEY
- SSH_HOST
- SSH_USER
- SSH_PORT (opcional)
- DEPLOY_PATH
