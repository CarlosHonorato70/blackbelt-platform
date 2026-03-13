# Deploy em Producao — BlackBelt Platform

## Arquitetura

```
Internet → Nginx (80/443 SSL) → Node.js App (5000) → MySQL 8.0 (3306)
                                                    → Backup diario (cron)
```

Tudo roda em Docker via `docker-compose.yml`. Nginx faz proxy reverso com SSL.

---

## Opcao 1: Deploy Automatico (Recomendado)

### Pre-requisitos
- Droplet DigitalOcean Ubuntu 24.04 ($6/mes — 1 vCPU, 1GB RAM, 25GB SSD)
- Dominio apontando para o IP do Droplet (DNS A record)

### Executar

```bash
# SSH no servidor
ssh root@SEU_IP

# Clonar e rodar setup
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git /opt/blackbelt
cd /opt/blackbelt
chmod +x scripts/deploy-setup.sh
./scripts/deploy-setup.sh
```

O script faz tudo automaticamente:
1. Instala Docker, Git, Certbot
2. Configura firewall (SSH + HTTP + HTTPS)
3. Gera certificado SSL (Let's Encrypt)
4. Pede configuracoes (dominio, email SMTP, pagamentos)
5. Gera `.env.production` com secrets seguros
6. Sobe containers Docker (app + mysql + nginx + backup)
7. Roda migrations e seed (admin + planos + roles)
8. Configura cron de backup diario e renovacao SSL

### Apos o setup

Acesse `https://blackbeltconsultoria.com.br` e faca login:
- **Email:** ricardo@consultoriasst.com.br
- **Senha:** exibida no final do script (anote e troque no primeiro login)

---

## Opcao 2: Deploy Manual

### 1. Instalar Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### 2. Clonar repositorio

```bash
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git /opt/blackbelt
cd /opt/blackbelt
```

### 3. Criar `.env.production`

```bash
cp .env.production.template .env.production
nano .env.production
```

Preencher obrigatoriamente:
- `DATABASE_URL=mysql://blackbelt:SUA_SENHA@mysql:3306/blackbelt`
- `COOKIE_SECRET=` (minimo 64 caracteres: `openssl rand -base64 48`)
- `FRONTEND_URL=https://seudominio.com.br`
- `ALLOWED_ORIGINS=https://seudominio.com.br`
- `MYSQL_PASSWORD=SUA_SENHA` (mesma do DATABASE_URL)
- `MYSQL_ROOT_PASSWORD=OUTRA_SENHA`

### 4. Gerar SSL

```bash
apt install certbot -y
certbot certonly --standalone -d seudominio.com.br -d www.seudominio.com.br --email seu@email.com --agree-tos
mkdir -p docker/nginx/ssl
cp /etc/letsencrypt/live/seudominio.com.br/fullchain.pem docker/nginx/ssl/
cp /etc/letsencrypt/live/seudominio.com.br/privkey.pem docker/nginx/ssl/
```

### 5. Subir containers

```bash
docker compose up --build -d
```

### 6. Rodar migrations e seed

```bash
docker compose exec -T app npx tsx node_modules/drizzle-kit/bin.cjs push
docker compose exec -T app npx tsx drizzle/seed.ts
```

### 7. Verificar

```bash
docker compose ps
curl https://seudominio.com.br/api/health
```

---

## Comandos Uteis

```bash
# Ver status dos servicos
docker compose ps

# Ver logs da aplicacao
docker compose logs -f app

# Ver logs do nginx
docker compose logs -f nginx

# Reiniciar tudo
docker compose restart

# Parar tudo
docker compose down

# Atualizar aplicacao
cd /opt/blackbelt && git pull origin main && docker compose up --build -d

# Backup manual do banco
docker compose exec -T mysql mysqldump -u blackbelt -p'SENHA' --single-transaction blackbelt | gzip > backup_$(date +%Y%m%d).sql.gz

# Restaurar backup
gunzip < backup_20260312.sql.gz | docker compose exec -T mysql mysql -u blackbelt -p'SENHA' blackbelt

# Renovar SSL manualmente
certbot renew
cp /etc/letsencrypt/live/seudominio.com.br/*.pem /opt/blackbelt/docker/nginx/ssl/
docker compose restart nginx
```

---

## Servicos Docker

| Servico | Container | Funcao |
|---------|-----------|--------|
| `app` | blackbelt-app | Node.js (porta 5000, interno) |
| `mysql` | blackbelt-mysql | MySQL 8.0 (porta 3306, interno) |
| `nginx` | blackbelt-nginx | Proxy reverso (portas 80/443) |
| `backup` | blackbelt-backup | Backup diario as 3h (30 dias retencao) |

---

## Troubleshooting

**App nao inicia:**
```bash
docker compose logs app | tail -30
```

**MySQL nao conecta:**
```bash
docker compose exec mysql mysqladmin ping -u root -p'SENHA'
```

**SSL expirou:**
```bash
certbot renew --force-renewal
cp /etc/letsencrypt/live/seudominio.com.br/*.pem /opt/blackbelt/docker/nginx/ssl/
docker compose restart nginx
```

**Disco cheio:**
```bash
docker system prune -a    # Remove imagens/containers antigos
find docker/backups -name '*.sql.gz' -mtime +7 -delete
```
