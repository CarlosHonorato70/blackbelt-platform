# Deploy para Produção (GitHub Actions → GHCR → SSH → Docker Compose)

Este documento descreve como funciona o deploy automático proposto e como implantar manualmente se necessário.

## O que o workflow faz
1. Ao dar push na branch `main`:
   - Constrói a imagem Docker usando `Dockerfile.production`.
   - Publica a imagem no GitHub Container Registry (GHCR) com a tag `ghcr.io/<github-username>/blackbelt-platform:<commit-sha>` (onde `<github-username>` é o owner do repositório).
   - Copia `docker-compose.production.yml` para o servidor via SCP.
   - Executa comandos remotos (docker compose pull && docker compose up -d) passando a imagem correta via variável de ambiente.

## Secrets necessários (GitHub → Settings → Secrets and variables → Actions)
- GHCR_TOKEN — token com permissão `write:packages` para publicar imagens em ghcr.io.
- SSH_PRIVATE_KEY — chave privada PEM do usuário que fará SSH (sem passphrase preferível).
- SSH_HOST — host/IP do servidor de destino.
- SSH_PORT — (opcional) porta SSH (padrão 22).
- SSH_USER — usuário SSH que realizará o deploy (ex.: deploy).
- DEPLOY_PATH — pasta remota onde ficará `docker-compose.production.yml` (ex.: `/home/deploy/blackbelt`).
- Variáveis de aplicação (DB/segredos): recomenda-se manter estas no servidor (arquivo `.env` protegido) ou em um secret manager:
  - DATABASE_URL
  - JWT_SECRET
  - OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET
  - OUTRAS variáveis quaisquer necessárias

## Requisitos no servidor de destino
- Docker (compatível com Compose v2)
- Docker Compose (comando `docker compose` disponível)
- Usuário SSH com permissão para executar Docker (membro do grupo `docker` ou sudo sem senha configurado)
- Espaço em disco suficiente e conectividade para puxar imagens

## Passo-a-passo para deploy manual (se preferir não usar Actions)
1. Construa a imagem localmente ou use a imagem publicada:
   ```bash
   # Substituir <owner> pelo username do GitHub (ex: carloshonorato70)
   docker build -f Dockerfile.production -t ghcr.io/<owner>/blackbelt-platform:latest .
   docker push ghcr.io/<owner>/blackbelt-platform:latest
   ```

2. Copie o arquivo docker-compose.production.yml para o servidor:
   ```bash
   scp docker-compose.production.yml user@host:/home/deploy/blackbelt/
   ```

3. Conecte-se ao servidor via SSH e execute:
   ```bash
   cd /home/deploy/blackbelt
   # Defina a imagem a ser usada (ou deixe usar a padrão do docker-compose)
   export DOCKER_IMAGE=ghcr.io/<owner>/blackbelt-platform:latest
   docker compose pull
   docker compose up -d --remove-orphans
   docker image prune -f
   ```

## Script de deploy remoto
Um script auxiliar está disponível em `scripts/deploy_remote.sh` para facilitar o deploy manual no servidor remoto:

```bash
# No servidor remoto, execute:
./scripts/deploy_remote.sh /home/deploy/blackbelt
```

Este script executa automaticamente:
- `docker compose pull` - Puxa as últimas imagens
- `docker compose up -d --remove-orphans` - Atualiza os containers
- `docker image prune -f` - Remove imagens antigas

## Configuração inicial do servidor

1. **Instalar Docker e Docker Compose:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   ```

2. **Criar estrutura de diretórios:**
   ```bash
   mkdir -p /home/deploy/blackbelt
   cd /home/deploy/blackbelt
   ```

3. **Configurar arquivo .env no servidor:**
   ```bash
   # Criar .env com variáveis de ambiente necessárias
   cat > .env << 'EOF'
   MONGO_ROOT_USER=admin
   MONGO_ROOT_PASSWORD=senha_segura
   MONGO_DATABASE=blackbelt
   JWT_SECRET=seu_jwt_secret_aqui
   SESSION_SECRET=seu_session_secret_aqui
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=seu_email@gmail.com
   SMTP_PASSWORD=sua_senha_app
   SMTP_FROM=noreply@blackbelt.com.br
   CORS_ORIGIN=https://seu-dominio.com
   EOF
   ```

4. **Configurar SSL (Let's Encrypt):**
   ```bash
   sudo certbot certonly --standalone -d seu-dominio.com
   sudo mkdir -p docker/nginx/ssl
   sudo cp /etc/letsencrypt/live/seu-dominio.com/*.pem docker/nginx/ssl/
   ```

## Variáveis de ambiente importantes

### No servidor (.env)
O arquivo `.env` no servidor deve conter todas as variáveis necessárias para a aplicação:

```bash
# Banco de dados
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=senha_segura
MONGO_DATABASE=blackbelt

# Autenticação
JWT_SECRET=seu_jwt_secret_aqui
SESSION_SECRET=seu_session_secret_aqui

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASSWORD=sua_senha_app
SMTP_FROM=noreply@blackbelt.com.br

# Aplicação
CORS_ORIGIN=https://seu-dominio.com
VITE_APP_TITLE="Black Belt Platform"
VITE_APP_LOGO="/logo.png"

# Imagem Docker (opcional - sobrescreve a padrão do docker-compose)
DOCKER_IMAGE=ghcr.io/carloshonorato70/blackbelt-platform:latest
```

### Passada pelo workflow
O workflow passa automaticamente a variável `DOCKER_IMAGE` com a imagem correta (incluindo o SHA do commit) para garantir que a versão exata seja deployada.

## Autenticação no GHCR

Para fazer pull das imagens privadas do GHCR no servidor:

```bash
# Criar um Personal Access Token no GitHub com permissão read:packages
echo "SEU_TOKEN_AQUI" | docker login ghcr.io -u SEU_USERNAME --password-stdin
```

## Troubleshooting

### Erro ao fazer pull da imagem
- Verifique se o usuário está autenticado no GHCR: `docker login ghcr.io`
- Verifique se a imagem existe: `docker pull ghcr.io/<owner>/blackbelt-platform:<sha>`

### Permissão negada ao executar docker
- Adicione o usuário ao grupo docker: `sudo usermod -aG docker $USER`
- Faça logout e login novamente

### Containers não iniciam
- Verifique os logs: `docker compose logs -f`
- Verifique se todas as variáveis de ambiente estão configuradas no .env
- Verifique se as portas não estão em uso: `sudo netstat -tulpn | grep :80`

## Rollback

Para reverter para uma versão anterior:

```bash
cd /home/deploy/blackbelt
# Edite docker-compose.production.yml para usar a tag anterior
# Ou especifique a imagem diretamente:
docker compose pull
docker compose up -d --remove-orphans
```

## Monitoramento

Após o deploy, verifique:

```bash
# Status dos containers
docker compose ps

# Logs em tempo real
docker compose logs -f

# Health check
curl http://localhost:3000/health

# Uso de recursos
docker stats
```
