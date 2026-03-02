# ============================================================
# Black Belt Platform - Setup Local para Windows
# ============================================================
# Execute no PowerShell (como Administrador):
#   .\scripts\dev-setup.ps1
#
# Pre-requisitos: Docker Desktop instalado e rodando
# ============================================================

# Nao usar $ErrorActionPreference = "Stop" globalmente porque
# o Docker escreve mensagens de progresso no stderr, e o PowerShell
# com "Stop" trata qualquer stderr como excecao fatal.

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
$dockerVersion = docker --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker nao encontrado. Instale o Docker Desktop: https://www.docker.com/products/docker-desktop/"
}
Write-Ok "Docker: $dockerVersion"

# Docker Compose
$composeVersion = docker compose version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker Compose nao encontrado. Atualize o Docker Desktop."
}
Write-Ok "Docker Compose: $composeVersion"

# Docker running?
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker Desktop nao esta rodando. Abra o Docker Desktop e tente novamente."
}
Write-Ok "Docker Desktop esta rodando"

# Git
$gitVersion = git --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Ok "Git: $gitVersion"
} else {
    Write-Warn "Git nao encontrado (opcional para dev local)"
}

# ============================================================
Write-Step "2" "Gerando secrets de seguranca"

function New-Secret($length) {
    $rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    $bytes = New-Object byte[] $length
    $rng.GetBytes($bytes)
    $rng.Dispose()
    $base64 = [Convert]::ToBase64String($bytes) -replace '[^A-Za-z0-9]',''
    return $base64.Substring(0, [Math]::Min($length, $base64.Length))
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
Write-Step "5" "Parando containers antigos e iniciando novos"

# Parar containers antigos deste projeto (se existirem)
Write-Host "  Parando containers anteriores (se existirem)..." -ForegroundColor Gray
docker compose -f docker-compose.dev.yml down 2>&1 | Out-Null

# Remover containers orfaos com nomes conflitantes (podem ter sido criados por outro compose file)
docker rm -f blackbelt-app blackbelt-mysql 2>&1 | Out-Null

Write-Host "  Construindo imagens (pode levar 3-5 minutos na primeira vez)..." -ForegroundColor Gray
docker compose -f docker-compose.dev.yml up --build -d 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Fail "Falha ao construir/iniciar containers. Verifique os erros acima."
}

# Verificar se o container app esta rodando
Start-Sleep -Seconds 5
$appState = docker inspect --format '{{.State.Status}}' blackbelt-app 2>&1
if ($LASTEXITCODE -ne 0 -or $appState -ne "running") {
    Write-Host ""
    Write-Host "  Container 'blackbelt-app' nao esta rodando (estado: $appState)" -ForegroundColor Red
    Write-Host "  Logs do container:" -ForegroundColor Yellow
    docker compose -f docker-compose.dev.yml logs --tail 30 app 2>&1
    Write-Host ""
    Write-Fail "Build ou inicializacao do app falhou. Corrija os erros acima e rode o script novamente."
}
Write-Ok "Container blackbelt-app esta rodando"

Write-Host ""
Write-Host "  Aguardando MySQL inicializar..." -ForegroundColor Gray
$retries = 30
$ready = $false
while ($retries -gt 0 -and -not $ready) {
    docker compose -f docker-compose.dev.yml exec -T mysql mysqladmin ping -h localhost -u root --password="$DB_ROOT_PASSWORD" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true }
    if (-not $ready) {
        Start-Sleep -Seconds 2
        $retries--
    }
}
if ($ready) { Write-Ok "MySQL disponivel" } else { Write-Warn "MySQL demorou para inicializar - continuando mesmo assim..." }

Write-Host "  Aguardando aplicacao responder..." -ForegroundColor Gray
$retries = 20
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
if ($ready) {
    Write-Ok "Aplicacao rodando em http://localhost:5000"
} else {
    Write-Host ""
    Write-Host "  Logs do container app:" -ForegroundColor Yellow
    docker compose -f docker-compose.dev.yml logs --tail 20 app 2>&1
    Write-Fail "App nao respondeu ao health check. Verifique os logs acima."
}

Write-Host ""
docker compose -f docker-compose.dev.yml ps 2>&1

# ============================================================
Write-Step "6" "Configurando banco de dados"

Write-Host "  Executando migrations..." -ForegroundColor Gray
docker compose -f docker-compose.dev.yml exec -T app npx tsx node_modules/drizzle-kit/bin.cjs push 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Falha ao executar migrations. Verifique os logs acima."
}
Write-Ok "Tabelas criadas"

Write-Host "  Executando seed (admin + planos + roles)..." -ForegroundColor Gray
docker compose -f docker-compose.dev.yml exec -T -e ADMIN_PASSWORD="$ADMIN_PASSWORD" app npx tsx drizzle/seed.ts 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Falha ao executar seed. Verifique os logs acima."
}
Write-Ok "Banco populado com dados iniciais"

# ============================================================
Write-Step "7" "Verificacao final"

try {
    $health = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 5 -ErrorAction SilentlyContinue
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
