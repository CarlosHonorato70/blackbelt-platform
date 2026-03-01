#!/bin/bash
# ============================================================
# Black Belt Platform - Setup de Produção (Automático)
# ============================================================
# Execute no servidor: ./scripts/setup-production.sh
# Ou remotamente:
#   curl -fsSL https://raw.githubusercontent.com/CarlosHonorato70/blackbelt-platform/main/scripts/setup-production.sh | bash
# ============================================================

set -euo pipefail

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_DIR="${PROJECT_DIR:-/opt/blackbelt}"
REPO_URL="${REPO_URL:-https://github.com/CarlosHonorato70/blackbelt-platform.git}"

banner() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   ${BOLD}Black Belt Platform — Setup Automático de Produção${NC}${CYAN}       ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""
}

step() { echo -e "\n${BLUE}[$1/10]${NC} ${BOLD}$2${NC}\n"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

ask() {
  local prompt="$1" default="${2:-}" var_name="$3"
  if [ -n "$default" ]; then
    read -rp "  $prompt [$default]: " input
    eval "$var_name=\"${input:-$default}\""
  else
    read -rp "  $prompt: " input
    eval "$var_name=\"$input\""
  fi
}

ask_secret() {
  local prompt="$1" var_name="$2"
  read -rsp "  $prompt: " input
  echo ""
  eval "$var_name=\"$input\""
}

ask_optional() {
  local prompt="$1" var_name="$2"
  read -rp "  $prompt (Enter para pular): " input
  eval "$var_name=\"$input\""
}

# ============================================================
banner

if [ "$(id -u)" -ne 0 ]; then
  fail "Execute como root: sudo ./scripts/setup-production.sh"
fi

# ============================================================
step "1" "Verificando e instalando pré-requisitos"

# Docker
if command -v docker &>/dev/null; then
  ok "Docker $(docker --version | grep -oP '\d+\.\d+\.\d+')"
else
  warn "Docker não encontrado. Instalando..."
  curl -fsSL https://get.docker.com | sh
  ok "Docker instalado"
fi

# Docker Compose
if docker compose version &>/dev/null; then
  ok "Docker Compose $(docker compose version --short)"
else
  fail "Docker Compose não encontrado. Atualize o Docker: curl -fsSL https://get.docker.com | sh"
fi

# Git
if command -v git &>/dev/null; then
  ok "Git $(git --version | awk '{print $3}')"
else
  apt-get update -qq && apt-get install -y -qq git >/dev/null
  ok "Git instalado"
fi

# openssl
if command -v openssl &>/dev/null; then
  ok "OpenSSL disponível"
else
  apt-get update -qq && apt-get install -y -qq openssl >/dev/null
  ok "OpenSSL instalado"
fi

# Certbot
if command -v certbot &>/dev/null; then
  ok "Certbot $(certbot --version 2>&1 | grep -oP '\d+\.\d+\.\d+')"
else
  warn "Certbot não encontrado. Instalando..."
  apt-get update -qq && apt-get install -y -qq certbot >/dev/null
  ok "Certbot instalado"
fi

# ============================================================
step "2" "Clonando repositório"

if [ -f "$PROJECT_DIR/package.json" ]; then
  ok "Projeto já existe em $PROJECT_DIR"
  cd "$PROJECT_DIR"
  git pull origin main 2>/dev/null || warn "git pull falhou (pode estar em outra branch)"
else
  warn "Clonando em $PROJECT_DIR..."
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
  ok "Repositório clonado"
fi

# ============================================================
step "3" "Gerando secrets de segurança"

DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)
DB_ROOT_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)
SESSION_SECRET=$(openssl rand -base64 48)
ADMIN_PASSWORD="$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | head -c 14)Aa1!"

ok "SESSION_SECRET gerado (64 chars)"
ok "DB_PASSWORD gerado (32 chars)"
ok "DB_ROOT_PASSWORD gerado (32 chars)"
ok "ADMIN_PASSWORD gerado (18 chars)"

# ============================================================
step "4" "Configuração — responda as perguntas abaixo"

echo -e "  ${YELLOW}Informações obrigatórias:${NC}"
echo ""

ask "Seu domínio (ex: blackbelt.com.br)" "" DOMAIN
while [ -z "$DOMAIN" ]; do
  warn "Domínio é obrigatório"
  ask "Seu domínio" "" DOMAIN
done

ask "Email para SSL (Let's Encrypt)" "" CERT_EMAIL
while [ -z "$CERT_EMAIL" ]; do
  warn "Email é obrigatório para SSL"
  ask "Email para SSL" "" CERT_EMAIL
done

echo ""
echo -e "  ${YELLOW}Configuração de Email (SMTP):${NC}"
echo -e "  ${CYAN}Dica: Brevo (brevo.com) é grátis até 300 emails/dia${NC}"
echo ""
ask "SMTP Host" "smtp-relay.brevo.com" SMTP_HOST
ask "SMTP Port" "587" SMTP_PORT
ask "SMTP User" "" SMTP_USER
ask_secret "SMTP Password" SMTP_PASSWORD
ask "Email remetente (from)" "noreply@$DOMAIN" SMTP_FROM

echo ""
echo -e "  ${YELLOW}Pagamentos (opcional — pule se ainda não configurou):${NC}"
echo ""
ask_optional "Stripe Secret Key (sk_live_...)" STRIPE_SECRET_KEY
ask_optional "Stripe Webhook Secret (whsec_...)" STRIPE_WEBHOOK_SECRET
ask_optional "Mercado Pago Access Token" MP_ACCESS_TOKEN

echo ""
echo -e "  ${YELLOW}Monitoramento (opcional):${NC}"
echo ""
ask_optional "Sentry DSN (https://xxx@xxx.ingest.sentry.io/xxx)" SENTRY_DSN

# ============================================================
step "5" "Gerando certificado SSL (Let's Encrypt)"

# Garantir que porta 80 está livre
docker compose down 2>/dev/null || true

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  ok "Certificado já existe para $DOMAIN"
else
  echo -e "  Gerando certificado para ${BOLD}$DOMAIN${NC}..."
  if certbot certonly --standalone \
    -d "$DOMAIN" -d "www.$DOMAIN" \
    --email "$CERT_EMAIL" \
    --agree-tos --non-interactive 2>/dev/null; then
    ok "Certificado SSL gerado com sucesso"
  else
    warn "Falha ao gerar SSL. Tentando apenas domínio principal..."
    if certbot certonly --standalone \
      -d "$DOMAIN" \
      --email "$CERT_EMAIL" \
      --agree-tos --non-interactive 2>/dev/null; then
      ok "Certificado SSL gerado (sem www)"
    else
      warn "SSL falhou. O DNS pode não estar propagado ainda."
      warn "Você pode gerar manualmente depois: certbot certonly --standalone -d $DOMAIN"
      echo ""
      read -rp "  Continuar sem SSL? (s/N): " CONTINUE_NO_SSL
      if [[ ! "$CONTINUE_NO_SSL" =~ ^[Ss]$ ]]; then
        fail "Setup cancelado. Configure o DNS e execute novamente."
      fi
    fi
  fi
fi

# Copiar certs
mkdir -p docker/nginx/ssl
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" docker/nginx/ssl/
  cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" docker/nginx/ssl/
  ok "Certificados copiados para docker/nginx/ssl/"
fi

# ============================================================
step "6" "Gerando arquivo .env de produção"

STRIPE_ENABLED="false"
MP_ENABLED="false"
[ -n "$STRIPE_SECRET_KEY" ] && STRIPE_ENABLED="true"
[ -n "$MP_ACCESS_TOKEN" ] && MP_ENABLED="true"

cat > .env << ENVFILE
# ============================================================
# Black Belt Platform — Produção
# Gerado automaticamente em $(date '+%Y-%m-%d %H:%M:%S')
# ============================================================

# --- Banco de Dados ---
DATABASE_URL=mysql://blackbelt:${DB_PASSWORD}@mysql:3306/blackbelt

# --- Aplicação ---
NODE_ENV=production
PORT=5000

# --- Segurança ---
SESSION_SECRET=${SESSION_SECRET}

# --- Domínio / CORS ---
FRONTEND_URL=https://${DOMAIN}
ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}

# --- Email (SMTP) ---
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=${SMTP_PORT}
SMTP_USER=${SMTP_USER}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM=${SMTP_FROM}

# --- Pagamentos ---
STRIPE_ENABLED=${STRIPE_ENABLED}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}

MERCADO_PAGO_ENABLED=${MP_ENABLED}
MERCADO_PAGO_ACCESS_TOKEN=${MP_ACCESS_TOKEN}

# --- Monitoramento ---
SENTRY_DSN=${SENTRY_DSN}

# --- Docker MySQL ---
MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
MYSQL_DATABASE=blackbelt
MYSQL_USER=blackbelt
MYSQL_PASSWORD=${DB_PASSWORD}
ENVFILE

ok "Arquivo .env gerado com todas as variáveis"

# ============================================================
step "7" "Iniciando containers Docker"

echo -e "  Construindo imagens (pode levar 3-5 minutos)..."
docker compose up --build -d 2>&1 | tail -5

# Aguardar MySQL ficar healthy
echo -e "  Aguardando MySQL inicializar..."
RETRIES=30
until docker compose exec -T mysql mysqladmin ping -h localhost -u root --password="$DB_ROOT_PASSWORD" --silent 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    warn "MySQL demorou para inicializar. Continuando..."
    break
  fi
  sleep 2
done
ok "MySQL disponível"

# Aguardar app
echo -e "  Aguardando aplicação..."
RETRIES=15
until curl -sf http://localhost:5000/api/health >/dev/null 2>&1; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -le 0 ]; then
    warn "App demorou para inicializar. Verifique: docker compose logs app"
    break
  fi
  sleep 3
done
ok "Aplicação rodando na porta 5000"

echo ""
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# ============================================================
step "8" "Configurando banco de dados"

echo -e "  Executando migrations..."
docker compose exec -T app npx tsx node_modules/drizzle-kit/bin.cjs push 2>&1 | tail -3
ok "Tabelas criadas"

echo -e "  Executando seed (admin + planos + roles)..."
docker compose exec -T -e ADMIN_PASSWORD="$ADMIN_PASSWORD" app npx tsx drizzle/seed.ts 2>&1 | tail -5
ok "Banco populado com dados iniciais"

# ============================================================
step "9" "Configurando cron (backup + SSL)"

CRON_BACKUP="0 2 * * * cd $PROJECT_DIR && docker compose exec -T mysql mysqldump -u blackbelt -p'${DB_PASSWORD}' --single-transaction blackbelt | gzip > $PROJECT_DIR/docker/backups/blackbelt_\$(date +\\%Y\\%m\\%d_\\%H\\%M\\%S).sql.gz && find $PROJECT_DIR/docker/backups -name '*.sql.gz' -mtime +30 -delete"
CRON_SSL="0 3 1 */2 * certbot renew --quiet && cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem $PROJECT_DIR/docker/nginx/ssl/ && cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem $PROJECT_DIR/docker/nginx/ssl/ && cd $PROJECT_DIR && docker compose restart nginx"

mkdir -p "$PROJECT_DIR/docker/backups"

# Adicionar sem duplicar
(crontab -l 2>/dev/null | grep -v "blackbelt" || true; echo "$CRON_BACKUP"; echo "$CRON_SSL") | crontab -

ok "Backup diário às 2h configurado"
ok "Renovação SSL a cada 60 dias configurada"

# ============================================================
step "10" "Setup concluído!"

echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✨ Plataforma no ar! ✨                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}URL:${NC}           https://${DOMAIN}"
echo -e "  ${BOLD}Admin email:${NC}   admin@blackbelt-platform.com"
echo -e "  ${BOLD}Admin senha:${NC}   ${YELLOW}${ADMIN_PASSWORD}${NC}"
echo ""
echo -e "  ${RED}${BOLD}IMPORTANTE: Anote a senha acima e troque no primeiro login!${NC}"
echo ""
echo -e "  ${CYAN}Comandos úteis:${NC}"
echo -e "    docker compose ps          — ver status dos serviços"
echo -e "    docker compose logs -f app — ver logs da aplicação"
echo -e "    docker compose down        — parar tudo"
echo -e "    docker compose up -d       — iniciar tudo"
echo ""

# Salvar credenciais em arquivo (leitura só pelo root)
CREDS_FILE="$PROJECT_DIR/.credentials"
cat > "$CREDS_FILE" << CREDS
# Credenciais geradas em $(date)
# APAGUE ESTE ARQUIVO APÓS ANOTAR AS SENHAS

URL=https://${DOMAIN}
ADMIN_EMAIL=admin@blackbelt-platform.com
ADMIN_PASSWORD=${ADMIN_PASSWORD}
DB_PASSWORD=${DB_PASSWORD}
DB_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
SESSION_SECRET=${SESSION_SECRET}
CREDS
chmod 600 "$CREDS_FILE"
ok "Credenciais salvas em $CREDS_FILE (apague após anotar)"
echo ""
