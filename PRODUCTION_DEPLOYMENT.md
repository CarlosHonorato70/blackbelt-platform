# Production Deployment Guide - Quick Reference
# Black Belt Platform

## Prerequisites Checklist
- [ ] Linux server (Ubuntu 20.04+ or similar)
- [ ] Docker and Docker Compose installed
- [ ] Domain name configured with DNS
- [ ] SSL certificate (Let's Encrypt recommended)
- [ ] SSH access to server
- [ ] MongoDB backup strategy

## Step 1: Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

## Step 2: Clone and Configure

```bash
# Clone repository
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform

# Checkout production branch
git checkout main

# Create production environment file
cp .env.production.template .env
nano .env  # Edit with your values
```

## Step 3: SSL Certificate Setup

### Option A: Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt install certbot -y

# Generate certificate
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@domain.com \
  --agree-tos

# Copy certificates
sudo mkdir -p docker/nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/nginx/ssl/
sudo chown -R $USER:$USER docker/nginx/ssl
```

### Option B: Self-Signed (Development/Testing)
```bash
mkdir -p docker/nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/privkey.pem \
  -out docker/nginx/ssl/fullchain.pem
```

## Step 4: Deploy Application

```bash
# Build and start services
docker compose -f docker-compose.production.yml up -d

# Check status
docker compose -f docker-compose.production.yml ps

# View logs
docker compose -f docker-compose.production.yml logs -f

# Run database migrations
docker compose -f docker-compose.production.yml exec backend sh -c "pnpm db:push"
```

## Step 5: Verify Deployment

```bash
# Health check
curl http://localhost:3000/health

# Check API endpoint
curl http://localhost:3000/api/health

# Check via domain (after DNS configured)
curl https://yourdomain.com/health
```

## Step 6: Setup Automated Backups

```bash
# Create cron job for daily backups
crontab -e

# Add this line (daily backup at 2 AM)
0 2 * * * cd /opt/blackbelt-platform && docker compose -f docker-compose.production.yml run --rm mongodb-backup
```

## Step 7: Configure GitHub Actions (CI/CD)

Add these secrets to your GitHub repository (Settings → Secrets):

- `DOCKER_USERNAME`: Your Docker Hub username
- `DOCKER_PASSWORD`: Your Docker Hub password/token
- `SSH_PRIVATE_KEY`: SSH private key for server access
- `SERVER_HOST`: Your server IP or domain
- `SERVER_USER`: SSH user (e.g., deploy)
- `DEPLOY_PATH`: Path on server (e.g., /opt/blackbelt-platform)
- `PRODUCTION_URL`: Your production domain
- `SLACK_WEBHOOK`: (Optional) Slack webhook for notifications

## Step 8: Monitoring Setup

```bash
# View container logs
docker compose -f docker-compose.production.yml logs -f backend

# Check resource usage
docker stats

# Monitor disk space
df -h

# Monitor MongoDB
docker compose -f docker-compose.production.yml exec mongodb mongosh -u admin -p
```

## Common Commands

```bash
# Stop services
docker compose -f docker-compose.production.yml down

# Restart services
docker compose -f docker-compose.production.yml restart

# Update application
git pull origin main
docker compose -f docker-compose.production.yml up -d --build

# Manual backup
docker compose -f docker-compose.production.yml run --rm mongodb-backup

# Restore backup
docker compose -f docker-compose.production.yml run --rm \
  -v $(pwd)/docker/backups:/backups \
  mongodb bash /scripts/restore.sh /backups/backup_file.tar.gz

# View Nginx logs
docker compose -f docker-compose.production.yml logs nginx

# Access MongoDB shell
docker compose -f docker-compose.production.yml exec mongodb mongosh -u admin -p
```

## Troubleshooting

### Container won't start
```bash
docker compose -f docker-compose.production.yml logs backend
docker compose -f docker-compose.production.yml restart backend
```

### Database connection issues
```bash
# Check MongoDB is running
docker compose -f docker-compose.production.yml ps mongodb

# Check connection string
docker compose -f docker-compose.production.yml exec backend env | grep DATABASE_URL
```

### SSL certificate issues
```bash
# Check certificate files
ls -l docker/nginx/ssl/

# Renew Let's Encrypt certificate
sudo certbot renew
sudo cp /etc/letsencrypt/live/yourdomain.com/*.pem docker/nginx/ssl/
docker compose -f docker-compose.production.yml restart nginx
```

### Performance issues
```bash
# Check resource usage
docker stats

# Increase container resources
# Edit docker-compose.production.yml and add resource limits

# Clear logs
docker compose -f docker-compose.production.yml logs --tail=0 -f > /dev/null
```

## Security Best Practices

1. **Change all default passwords** in .env file
2. **Enable firewall** (UFW recommended)
3. **Keep system updated**: `sudo apt update && sudo apt upgrade`
4. **Regular backups**: Verify backup cron job is running
5. **Monitor logs**: Check for suspicious activity
6. **Use HTTPS only**: Ensure SSL is properly configured
7. **Rate limiting**: Configured in Nginx
8. **Strong JWT secrets**: Minimum 32 characters

## Maintenance Schedule

- **Daily**: Automated backups
- **Weekly**: Check logs and disk space
- **Monthly**: Update packages and dependencies
- **Quarterly**: Security audit and review

## Support

- Documentation: See DEPLOYMENT_GUIDE.md for detailed information
- Issues: GitHub Issues
- Security: Report to security@blackbelt.com

## Production Checklist

- [ ] All environment variables configured
- [ ] SSL certificate installed and working
- [ ] Database backup system tested
- [ ] Monitoring and logging configured
- [ ] Firewall rules configured
- [ ] Domain DNS configured
- [ ] Health checks passing
- [ ] CI/CD pipeline configured
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Email delivery tested
- [ ] All services running and healthy
