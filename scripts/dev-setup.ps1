# ============================================================
# Black Belt Platform - Setup Local para Windows
# ============================================================
# Execute no PowerShell (como Administrador):
#   .\scripts\dev-setup.ps1
#
# Pre-requisitos: Docker Desktop instalado e rodando
# ============================================================

$ErrorActionPreference = "Stop"

# --- Colors/helpers ---
function Write-Step($num, $msg) { Write-Host "`n[$num/8] $msg`n" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "  OK " -ForegroundColor Green -NoNewline; Write-Host $msg }
function Write-Warn($msg) { Write-Host "  !! " -ForegroundColor Yellow -NoNewline; Write-Host $msg }
function Write-Fail($msg) { Write-Host "  X  " -ForegroundColor Red -NoNewline; Write-Host $msg; exit 1 }

Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host "   Black Belt Platform - Setup Local (Windows + Docker)" -ForegroundColor Cyan
Write-Host "  ======================================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
Write-Step "1" "Verificando pre-requisitos"

# Docker
try {
    $dockerVersion = docker --version 2>$null
    Write-Ok "Docker: $dockerVersion"
} catch {
    Write-Fail "Docker nao encontrado. Instale o Docker Desktop: https://www.docker.com/products/docker-desktop/"
}

# Docker Compose
try {
    $composeVersion = docker compose version 2>$null
    Write-Ok "Docker Compose: $composeVersion"
} catch {
    Write-Fail "Docker Compose nao encontrado. Atualize o Docker Desktop."
}

# Docker running?
try {
    docker info 2>$null | Out-Null
    Write-Ok "Docker Desktop esta rodando"
} catch {
    Write-Fail "Docker Desktop nao esta rodando. Abra o Docker Desktop e tente novamente."
}

# Git
try {
    $gitVersion = git --version 2>$null
    Write-Ok "Git: $gitVersion"
} catch {
    Write-Warn "Git nao encontrado (opcional para dev local)"
}

# ============================================================
Write-Step "2" "Gerando secrets de seguranca"

function New-Secret($length) {
    $bytes = New-Object byte[] $length
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]','' | ForEach-Object { $_.Substring(0, [Math]::Min($length, $_.Length)) }
}

$DB_PASSWORD = New-Secret 24
$DB_ROOT_PASSWORD = New-Secret 24
$SESSION_SECRET = New-Secret 48
$ADMIN_PASSWORD = "$(New-Secret 14)Aa1!"

Write-Ok "SESSION_SECRET gerado"
Write-Ok "DB_PASSWORD gerado"
Write-Ok "ADMIN_PASSWORD gerado"

# ============================================================
Write-Step "3" "Criando docker-compose.dev.yml (sem Nginx/SSL)"

$devCompose = @"
version: "3.8"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: blackbelt-app
    restart: unless-stopped
    env_file: .env
    environment:
      - NODE_ENV=development
      - DATABASE_URL=mysql://blackbelt:${DB_PASSWORD}@mysql:3306/blackbelt
    ports:
      - "5000:5000"
    depends_on:
      mysql:
        condition: service_healthy
    volumes:
      - app_logs:/app/logs
    networks:
      - blackbelt-net
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:5000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mysql:
    image: mysql:8.0
    container_name: blackbelt-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: blackbelt
      MYSQL_USER: blackbelt
      MYSQL_PASSWORD: ${DB_PASSWORD}
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql-init:/docker-entrypoint-initdb.d
    networks:
      - blackbelt-net
    command: >
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci
      --default-authentication-plugin=mysql_native_password
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${DB_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

volumes:
  mysql_data:
    driver: local
  app_logs:
    driver: local

networks:
  blackbelt-net:
    driver: bridge
"@

$devCompose | Set-Content -Path "docker-compose.dev.yml" -Encoding UTF8
Write-Ok "docker-compose.dev.yml criado (app + MySQL, sem Nginx)"

# ============================================================
Write-Step "4" "Gerando arquivo .env"

$envContent = @"
# ============================================================
# Black Belt Platform - Ambiente Local (Docker)
# Gerado automaticamente em $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
# ============================================================

# --- Banco de Dados ---
DATABASE_URL=mysql://blackbelt:${DB_PASSWORD}@mysql:3306/blackbelt

# --- Aplicacao ---
NODE_ENV=development
PORT=5000

# --- Seguranca ---
SESSION_SECRET=${SESSION_SECRET}
COOKIE_SECRET=${SESSION_SECRET}

# --- URL / CORS ---
FRONTEND_URL=http://localhost:5000
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3000

# --- Docker MySQL ---
MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
MYSQL_DATABASE=blackbelt
MYSQL_USER=blackbelt
MYSQL_PASSWORD=${DB_PASSWORD}

# --- Opcional: Email (SMTP) ---
# SMTP_HOST=smtp-relay.brevo.com
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASSWORD=
# SMTP_FROM=noreply@localhost

# --- Opcional: Stripe ---
STRIPE_ENABLED=false
# STRIPE_SECRET_KEY=sk_test_...

# --- Opcional: Mercado Pago ---
MERCADO_PAGO_ENABLED=false
# MERCADO_PAGO_ACCESS_TOKEN=TEST-...

# --- Opcional: Sentry ---
# SENTRY_DSN=
"@

if (Test-Path ".env") {
    Write-Warn "Arquivo .env ja existe"
    $overwrite = Read-Host "  Sobrescrever? (s/N)"
    if ($overwrite -eq "s" -or $overwrite -eq "S") {
        $envContent | Set-Content -Path ".env" -Encoding UTF8
        Write-Ok "Arquivo .env atualizado"
    } else {
        Write-Ok "Arquivo .env mantido"
    }
} else {
    $envContent | Set-Content -Path ".env" -Encoding UTF8
    Write-Ok "Arquivo .env criado"
}

# ============================================================
Write-Step "5" "Iniciando containers Docker"

Write-Host "  Construindo imagens (pode levar 3-5 minutos na primeira vez)..." -ForegroundColor Gray
docker compose -f docker-compose.dev.yml up --build -d

Write-Host ""
Write-Host "  Aguardando MySQL inicializar..." -ForegroundColor Gray
$retries = 30
$ready = $false
while ($retries -gt 0 -and -not $ready) {
    try {
        $result = docker compose -f docker-compose.dev.yml exec -T mysql mysqladmin ping -h localhost -u root --password="$DB_ROOT_PASSWORD" 2>$null
        if ($LASTEXITCODE -eq 0) { $ready = $true }
    } catch {}
    if (-not $ready) {
        Start-Sleep -Seconds 2
        $retries--
    }
}
if ($ready) { Write-Ok "MySQL disponivel" } else { Write-Warn "MySQL demorou para inicializar" }

Write-Host "  Aguardando aplicacao..." -ForegroundColor Gray
$retries = 15
$ready = $false
while ($retries -gt 0 -and -not $ready) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) { $ready = $true }
    } catch {}
    if (-not $ready) {
        Start-Sleep -Seconds 3
        $retries--
    }
}
if ($ready) { Write-Ok "Aplicacao rodando em http://localhost:5000" } else { Write-Warn "App demorou. Verifique: docker compose -f docker-compose.dev.yml logs app" }

Write-Host ""
docker compose -f docker-compose.dev.yml ps

# ============================================================
Write-Step "6" "Configurando banco de dados"

Write-Host "  Executando migrations..." -ForegroundColor Gray
docker compose -f docker-compose.dev.yml exec -T app npx tsx node_modules/drizzle-kit/bin.cjs push
Write-Ok "Tabelas criadas"

Write-Host "  Executando seed (admin + planos + roles)..." -ForegroundColor Gray
docker compose -f docker-compose.dev.yml exec -T -e ADMIN_PASSWORD="$ADMIN_PASSWORD" app npx tsx drizzle/seed.ts
Write-Ok "Banco populado com dados iniciais"

# ============================================================
Write-Step "7" "Verificacao"

try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 5
    Write-Ok "Health check: $($health.status)"
} catch {
    Write-Warn "Health check falhou - verifique os logs"
}

# ============================================================
Write-Step "8" "Setup concluido!"

Write-Host ""
Write-Host "  ======================================================" -ForegroundColor Green
Write-Host "       Plataforma rodando localmente!" -ForegroundColor Green
Write-Host "  ======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL:           " -NoNewline; Write-Host "http://localhost:5000" -ForegroundColor Yellow
Write-Host "  Admin email:   " -NoNewline; Write-Host "admin@blackbelt-platform.com" -ForegroundColor Yellow
Write-Host "  Admin senha:   " -NoNewline; Write-Host $ADMIN_PASSWORD -ForegroundColor Yellow
Write-Host ""
Write-Host "  IMPORTANTE: Anote a senha acima!" -ForegroundColor Red
Write-Host ""
Write-Host "  Comandos uteis:" -ForegroundColor Cyan
Write-Host "    docker compose -f docker-compose.dev.yml ps          # ver status"
Write-Host "    docker compose -f docker-compose.dev.yml logs -f app # ver logs"
Write-Host "    docker compose -f docker-compose.dev.yml down        # parar tudo"
Write-Host "    docker compose -f docker-compose.dev.yml up -d       # iniciar tudo"
Write-Host ""

# Salvar credenciais
$credsContent = @"
# Credenciais geradas em $(Get-Date)
# APAGUE ESTE ARQUIVO APOS ANOTAR AS SENHAS

URL=http://localhost:5000
ADMIN_EMAIL=admin@blackbelt-platform.com
ADMIN_PASSWORD=$ADMIN_PASSWORD
DB_PASSWORD=$DB_PASSWORD
DB_ROOT_PASSWORD=$DB_ROOT_PASSWORD
"@
$credsContent | Set-Content -Path ".credentials" -Encoding UTF8
Write-Ok "Credenciais salvas em .credentials (apague apos anotar)"
Write-Host ""
