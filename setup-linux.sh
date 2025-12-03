#!/bin/bash

# ============================================================================
# SCRIPT DE SETUP - Black Belt Platform Standalone (Linux/macOS)
# ============================================================================
# Uso: bash setup-linux.sh
# Requer: Docker, Docker Compose, Node.js 22+

set -e

echo "🚀 Black Belt Platform - Setup Automático (Linux/macOS)"
echo "================================================="
echo ""

# Verificar se está na pasta correta
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script na raiz do projeto!"
    exit 1
fi

# Função para verificar se comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar pré-requisitos
echo "📋 Verificando pré-requisitos..."

prerequisites=(
    "docker:Docker"
    "docker-compose:Docker Compose"
    "node:Node.js"
    "git:Git"
)

all_installed=true
for prereq in "${prerequisites[@]}"; do
    cmd="${prereq%:*}"
    name="${prereq#*:}"
    
    if command_exists "$cmd"; then
        echo "✅ $name instalado"
    else
        echo "❌ $name NÃO instalado"
        all_installed=false
    fi
done

if [ "$all_installed" = false ]; then
    echo ""
    echo "⚠️  Por favor, instale os pré-requisitos faltantes:"
    echo "   - Docker: https://docs.docker.com/engine/install/"
    echo "   - Node.js: https://nodejs.org/"
    echo "   - Git: https://git-scm.com/"
    exit 1
fi

echo ""
echo "✅ Todos os pré-requisitos estão instalados!"
echo ""

# Criar arquivo .env se não existir
echo "🔧 Configurando variáveis de ambiente..."

if [ ! -f ".env" ]; then
    echo "   Criando arquivo .env..."
    
    JWT_SECRET=$(openssl rand -hex 32)
    
    cat > .env << EOF
# Banco de Dados
DATABASE_URL=mongodb://admin:blackbelt2024@mongodb:27017/blackbelt?authSource=admin

# Autenticação
JWT_SECRET=$JWT_SECRET

# Aplicação
NODE_ENV=production
VITE_APP_TITLE=Black Belt Consultoria
VITE_APP_LOGO=https://files.manuscdn.com/user_upload_by_module/web_dev_logo/310519663180008591/HtZnCnjHPPapRywu.png
PORT=3000
EOF
    
    echo "   ✅ Arquivo .env criado"
else
    echo "   ℹ️  Arquivo .env já existe"
fi

echo ""

# Instalar dependências
echo "📦 Instalando dependências..."
echo "   Executando: pnpm install"
pnpm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

echo "✅ Dependências instaladas"
echo ""

# Iniciar Docker Compose
echo "🐳 Iniciando Docker Compose..."
echo "   Executando: docker-compose up -d"
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Erro ao iniciar Docker Compose"
    exit 1
fi

echo "✅ Docker Compose iniciado"
echo ""

# Aguardar MongoDB estar pronto
echo "⏳ Aguardando MongoDB estar pronto..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        echo "✅ MongoDB está pronto"
        break
    fi
    
    attempt=$((attempt + 1))
    echo "   Tentativa $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "⚠️  MongoDB demorou muito para ficar pronto, continuando mesmo assim..."
fi

echo ""

# Executar migrations
echo "🗄️  Executando migrations do banco de dados..."
echo "   Executando: pnpm db:push"
pnpm db:push || echo "⚠️  Erro ao executar migrations (pode ser normal na primeira vez)"

echo ""
echo "================================================="
echo "✅ SETUP CONCLUÍDO COM SUCESSO!"
echo "================================================="
echo ""
echo "🌐 Acesse a plataforma:"
echo "   URL: http://localhost:3000"
echo ""
echo "📊 MongoDB Express (GUI):"
echo "   URL: http://localhost:8081"
echo "   Usuário: admin"
echo "   Senha: blackbelt2024"
echo ""
echo "📝 Próximos passos:"
echo "   1. Abra http://localhost:3000 no navegador"
echo "   2. Clique em 'Registrar' para criar sua conta"
echo "   3. Use a plataforma!"
echo ""
echo "🛑 Para parar os serviços:"
echo "   docker-compose down"
echo ""
echo "📚 Para mais informações, veja: GUIA_SETUP_STANDALONE.md"
echo ""
