# 🚀 Deployment Guide - Black Belt Platform

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Database Migrations](#database-migrations)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Monitoring](#monitoring)
8. [Backup Strategy](#backup-strategy)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Security

- [ ] Change all default passwords
- [ ] Generate strong `SESSION_SECRET` (32+ characters)
- [ ] Configure production CORS origins
- [ ] Enable HTTPS/TLS
- [ ] Review and harden CSP headers
- [ ] Setup firewall rules
- [ ] Enable database encryption at rest

### Configuration

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database URL
- [ ] Setup SMTP for email notifications
- [ ] Configure OAuth providers
- [ ] Set rate limiting parameters
- [ ] Configure file upload limits

### Infrastructure

- [ ] Provision production server (min 2GB RAM, 2 CPUs)
- [ ] Setup MySQL 8+ database
- [ ] Configure DNS records
- [ ] Setup CDN (optional, recommended)
- [ ] Configure load balancer (if multi-server)

### Monitoring

- [ ] Setup error tracking (Sentry)
- [ ] Configure APM (Datadog, New Relic)
- [ ] Setup log aggregation (ELK, CloudWatch)
- [ ] Configure uptime monitoring
- [ ] Setup alerting

### Backup

- [ ] Configure automated database backups
- [ ] Test backup restoration
- [ ] Setup file storage backups
- [ ] Document recovery procedures

---

## Environment Setup

### 1. Create Production Environment File

```bash
cp .env.example .env.production
```

### 2. Configure Production Variables

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=mysql://user:password@db-host:3306/blackbelt_prod

# Session
SESSION_SECRET=$(openssl rand -base64 32)

# CORS
VITE_FRONTEND_URL=https://app.blackbelt.com.br
FRONTEND_URL=https://app.blackbelt.com.br

# SMTP
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@blackbelt.com.br

# OAuth
OAUTH_CLIENT_ID=prod_client_id
OAUTH_CLIENT_SECRET=prod_client_secret
OAUTH_CALLBACK_URL=https://app.blackbelt.com.br/api/oauth/callback

# Redis (for distributed rate limiting)
REDIS_URL=redis://redis-host:6379
REDIS_PASSWORD=your-redis-password

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
DATADOG_API_KEY=your_datadog_api_key
```

### 3. Validate Configuration

```bash
# Test database connection
mysql -h db-host -u user -p blackbelt_prod -e "SELECT 1"

# Test Redis connection
redis-cli -h redis-host -a your-redis-password ping
```

---

## Docker Deployment

### Option A: Docker Compose (Recommended)

#### 1. Create docker-compose.prod.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - SESSION_SECRET=${SESSION_SECRET}
    depends_on:
      - db
      - redis
    restart: unless-stopped
    networks:
      - blackbelt-network

  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
      - ./backups:/backups
    ports:
      - "3306:3306"
    restart: unless-stopped
    networks:
      - blackbelt-network

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - blackbelt-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - blackbelt-network

volumes:
  mysql-data:
  redis-data:

networks:
  blackbelt-network:
    driver: bridge
```

#### 2. Build and Deploy

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

#### 3. Run Migrations

```bash
docker-compose -f docker-compose.prod.yml exec app pnpm db:push
```

### Option B: Standalone Docker

```bash
# Build image
docker build -t blackbelt-platform:latest .

# Run container
docker run -d \
  --name blackbelt-app \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  blackbelt-platform:latest

# Check logs
docker logs -f blackbelt-app
```

---

## Manual Deployment

### 1. Server Prerequisites

```bash
# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install MySQL
sudo apt-get install -y mysql-server

# Install Nginx
sudo apt-get install -y nginx

# Install Redis
sudo apt-get install -y redis-server
```

### 2. Clone and Build

```bash
# Clone repository
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform

# Checkout production branch
git checkout main

# Install dependencies
pnpm install --prod

# Build application
pnpm build

# The build creates:
# - dist/public/        (frontend assets)
# - dist/index.js       (server bundle)
```

### 3. Configure Systemd Service

Create `/etc/systemd/system/blackbelt.service`:

```ini
[Unit]
Description=Black Belt Platform
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/blackbelt-platform
Environment="NODE_ENV=production"
EnvironmentFile=/var/www/blackbelt-platform/.env.production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable blackbelt
sudo systemctl start blackbelt
sudo systemctl status blackbelt
```

### 4. Configure Nginx

Create `/etc/nginx/sites-available/blackbelt`:

```nginx
upstream blackbelt_app {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name app.blackbelt.com.br;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.blackbelt.com.br;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Static files
    location /assets {
        alias /var/www/blackbelt-platform/dist/public/assets;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API and App
    location / {
        proxy_pass http://blackbelt_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://blackbelt_app/health;
        access_log off;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/blackbelt /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Database Migrations

### Production Migration Strategy

```bash
# 1. Backup database BEFORE migration
mysqldump -h db-host -u user -p blackbelt_prod > backup-$(date +%Y%m%d).sql

# 2. Test migration on staging first
pnpm db:push --dry-run

# 3. Run migration
pnpm db:push

# 4. Verify migration
mysql -h db-host -u user -p blackbelt_prod -e "SHOW TABLES"

# 5. If issues, restore backup
mysql -h db-host -u user -p blackbelt_prod < backup-YYYYMMDD.sql
```

### Zero-Downtime Migrations

For large tables:

1. Add new columns (non-breaking)
2. Deploy new code that writes to both old and new columns
3. Backfill data
4. Deploy code that reads from new columns
5. Remove old columns

---

## SSL/TLS Configuration

### Option A: Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d app.blackbelt.com.br

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

### Option B: Custom Certificate

```bash
# Copy certificates
sudo cp fullchain.pem /etc/nginx/ssl/
sudo cp privkey.pem /etc/nginx/ssl/
sudo chmod 600 /etc/nginx/ssl/*

# Configure in Nginx (see above)
```

---

## Monitoring

### 1. Application Monitoring

#### Sentry (Error Tracking)

```bash
# Install Sentry SDK (already in package.json)
# Configure in .env.production
SENTRY_DSN=https://...@sentry.io/...
```

#### Datadog (APM)

```bash
# Install Datadog agent
DD_API_KEY=your_api_key DD_SITE="datadoghq.com" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure in .env.production
DATADOG_API_KEY=your_datadog_api_key
```

### 2. Server Monitoring

```bash
# Install node_exporter for Prometheus
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
```

### 3. Uptime Monitoring

Use services like:
- [UptimeRobot](https://uptimerobot.com/)
- [Pingdom](https://www.pingdom.com/)
- [StatusCake](https://www.statuscake.com/)

Monitor:
- `https://app.blackbelt.com.br/health` (every 1 minute)

---

## Backup Strategy

### Automated Daily Backups

Create `/usr/local/bin/backup-blackbelt.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/blackbelt"
DATE=$(date +%Y%m%d-%H%M%S)
DB_NAME="blackbelt_prod"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mysqldump -h localhost -u backup_user -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/db-$DATE.sql.gz

# Backup application files (if needed)
tar -czf $BACKUP_DIR/files-$DATE.tar.gz /var/www/blackbelt-platform/uploads

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/db-$DATE.sql.gz s3://blackbelt-backups/

echo "Backup completed: $DATE"
```

Add to crontab:

```bash
# Run daily at 2 AM
0 2 * * * /usr/local/bin/backup-blackbelt.sh >> /var/log/blackbelt-backup.log 2>&1
```

---

## Scaling

### Horizontal Scaling

#### Load Balancer Configuration

```nginx
upstream blackbelt_cluster {
    least_conn;
    server app1.blackbelt.local:3000 weight=1;
    server app2.blackbelt.local:3000 weight=1;
    server app3.blackbelt.local:3000 weight=1;
    keepalive 64;
}
```

#### Session Storage

Use Redis for session storage:

```typescript
// Configure in server/_core/context.ts
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

// Use Redis for sessions
app.use(session({
  store: new RedisStore({ client: redisClient }),
  // ...
}));
```

### Vertical Scaling

Recommended production specs per instance:
- **Small**: 2 CPUs, 4GB RAM (100-500 users)
- **Medium**: 4 CPUs, 8GB RAM (500-2000 users)
- **Large**: 8 CPUs, 16GB RAM (2000-10000 users)

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
sudo journalctl -u blackbelt -f

# Check port availability
sudo lsof -i :3000

# Check environment variables
sudo systemctl show blackbelt --property=Environment
```

### Database Connection Issues

```bash
# Test connection
mysql -h db-host -u user -p -e "SELECT 1"

# Check MySQL status
sudo systemctl status mysql

# View MySQL logs
sudo tail -f /var/log/mysql/error.log
```

### High Memory Usage

```bash
# Check Node.js memory
ps aux | grep node

# Analyze memory leaks
node --inspect dist/index.js

# Restart application
sudo systemctl restart blackbelt
```

### Slow Response Times

```bash
# Check database slow queries
mysql> SHOW FULL PROCESSLIST;

# Check server load
top
htop

# Analyze access logs
tail -f /var/log/nginx/access.log
```

---

## Rollback Procedure

If deployment fails:

```bash
# 1. Stop new version
sudo systemctl stop blackbelt

# 2. Restore previous version
git checkout <previous-tag>
pnpm install
pnpm build

# 3. Restore database if needed
mysql -u user -p blackbelt_prod < backup-YYYYMMDD.sql

# 4. Start application
sudo systemctl start blackbelt

# 5. Verify
curl https://app.blackbelt.com.br/health
```

---

## Post-Deployment Checklist

- [ ] Verify health check endpoint responds
- [ ] Test user login flow
- [ ] Test critical features (assessments, proposals)
- [ ] Check error logs for issues
- [ ] Verify email notifications working
- [ ] Test rate limiting
- [ ] Check security dashboard
- [ ] Verify backups configured
- [ ] Test database connection
- [ ] Check SSL certificate validity
- [ ] Review monitoring dashboards
- [ ] Test mobile responsiveness

---

## Support

For deployment support:
- **Email**: devops@blackbelt.com.br
- **On-call**: +55 11 98765-4321

---

**Happy Deploying! 🚀**
