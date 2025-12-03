# ============================================================================
# SCRIPT DE SETUP - Black Belt Platform Standalone (Windows)
# ============================================================================
# Uso: .\setup-windows.ps1
# Requer: PowerShell 5.0+, Docker Desktop, Node.js 22+

Write-Host "🚀 Black Belt Platform - Setup Automático (Windows)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na pasta correta
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto!" -ForegroundColor Red
    exit 1
}

# Função para verificar se comando existe
function Test-CommandExists {
    param($command)
    $null = Get-Command $command -ErrorAction SilentlyContinue
    return $?
}

# Verificar pré-requisitos
Write-Host "📋 Verificando pré-requisitos..." -ForegroundColor Yellow

$prerequisites = @{
    "docker" = "Docker Desktop"
    "docker-compose" = "Docker Compose"
    "node" = "Node.js"
    "git" = "Git"
}

$allInstalled = $true
foreach ($cmd in $prerequisites.Keys) {
    if (Test-CommandExists $cmd) {
        Write-Host "✅ $($prerequisites[$cmd]) instalado" -ForegroundColor Green
    } else {
        Write-Host "❌ $($prerequisites[$cmd]) NÃO instalado" -ForegroundColor Red
        $allInstalled = $false
    }
}

if (-not $allInstalled) {
    Write-Host ""
    Write-Host "⚠️  Por favor, instale os pré-requisitos faltantes:" -ForegroundColor Yellow
    Write-Host "   - Docker Desktop: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    Write-Host "   - Node.js: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "   - Git: https://git-scm.com/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ Todos os pré-requisitos estão instalados!" -ForegroundColor Green
Write-Host ""

# Criar arquivo .env se não existir
Write-Host "🔧 Configurando variáveis de ambiente..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host "   Criando arquivo .env..." -ForegroundColor Cyan
    
    $envContent = @"
# Banco de Dados
DATABASE_URL=mongodb://admin:blackbelt2024@mongodb:27017/blackbelt?authSource=admin

# Autenticação
JWT_SECRET=$(python -c "import secrets; print(secrets.token_hex(32))")

# Aplicação
NODE_ENV=production
VITE_APP_TITLE=Black Belt Consultoria
VITE_APP_LOGO=https://files.manuscdn.com/user_upload_by_module/web_dev_logo/310519663180008591/HtZnCnjHPPapRywu.png
PORT=3000
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host "   ✅ Arquivo .env criado" -ForegroundColor Green
} else {
    Write-Host "   ℹ️  Arquivo .env já existe" -ForegroundColor Cyan
}

Write-Host ""

# Instalar dependências
Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
Write-Host "   Executando: pnpm install" -ForegroundColor Cyan
pnpm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependências instaladas" -ForegroundColor Green
Write-Host ""

# Iniciar Docker Compose
Write-Host "🐳 Iniciando Docker Compose..." -ForegroundColor Yellow
Write-Host "   Executando: docker-compose up -d" -ForegroundColor Cyan
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao iniciar Docker Compose" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker Compose iniciado" -ForegroundColor Green
Write-Host ""

# Aguardar MongoDB estar pronto
Write-Host "⏳ Aguardando MongoDB estar pronto..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0

while ($attempt -lt $maxAttempts) {
    try {
        docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ MongoDB está pronto" -ForegroundColor Green
            break
        }
    } catch {
        # Continuar tentando
    }
    
    $attempt++
    Write-Host "   Tentativa $attempt/$maxAttempts..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
}

if ($attempt -eq $maxAttempts) {
    Write-Host "⚠️  MongoDB demorou muito para ficar pronto, continuando mesmo assim..." -ForegroundColor Yellow
}

Write-Host ""

# Executar migrations
Write-Host "🗄️  Executando migrations do banco de dados..." -ForegroundColor Yellow
Write-Host "   Executando: pnpm db:push" -ForegroundColor Cyan
pnpm db:push

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Erro ao executar migrations (pode ser normal na primeira vez)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ SETUP CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Acesse a plataforma:" -ForegroundColor Cyan
Write-Host "   URL: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "📊 MongoDB Express (GUI):" -ForegroundColor Cyan
Write-Host "   URL: http://localhost:8081" -ForegroundColor Yellow
Write-Host "   Usuário: admin" -ForegroundColor Yellow
Write-Host "   Senha: blackbelt2024" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Próximos passos:" -ForegroundColor Cyan
Write-Host "   1. Abra http://localhost:3000 no navegador" -ForegroundColor Yellow
Write-Host "   2. Clique em 'Registrar' para criar sua conta" -ForegroundColor Yellow
Write-Host "   3. Use a plataforma!" -ForegroundColor Yellow
Write-Host ""
Write-Host "🛑 Para parar os serviços:" -ForegroundColor Cyan
Write-Host "   docker-compose down" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 Para mais informações, veja: GUIA_SETUP_STANDALONE.md" -ForegroundColor Cyan
Write-Host ""
