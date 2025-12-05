#!/bin/bash

# ====================================================
# Black Belt Platform - Docker Setup Script
# ====================================================
# Este script automatiza a instalação usando Docker
# ====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Black Belt Platform - Setup Docker                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erro: Execute este script no diretório raiz do projeto${NC}"
    exit 1
fi

# Function to check command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 não está instalado${NC}"
        return 1
    else
        echo -e "${GREEN}✓${NC} $1 instalado"
        return 0
    fi
}

# Step 1: Check prerequisites
echo -e "${YELLOW}📋 Passo 1: Verificando pré-requisitos...${NC}"
echo ""

MISSING_DEPS=0

if check_command "node"; then
    NODE_VERSION=$(node --version)
    echo -e "   Versão: ${NODE_VERSION}"
else
    MISSING_DEPS=1
fi

if check_command "pnpm"; then
    PNPM_VERSION=$(pnpm --version)
    echo -e "   Versão: ${PNPM_VERSION}"
else
    echo -e "${YELLOW}⚠️  Instalando pnpm...${NC}"
    npm install -g pnpm@10.4.1
fi

if check_command "docker"; then
    DOCKER_VERSION=$(docker --version)
    echo -e "   ${DOCKER_VERSION}"
else
    echo -e "${RED}❌ Docker não detectado.${NC}"
    echo -e "${YELLOW}Por favor, instale o Docker Desktop.${NC}"
    MISSING_DEPS=1
fi

if check_command "docker-compose"; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "   ${COMPOSE_VERSION}"
else
    echo -e "${RED}❌ docker-compose não detectado.${NC}"
    MISSING_DEPS=1
fi

echo ""

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "${RED}❌ Alguns pré-requisitos estão faltando.${NC}"
    echo -e "${YELLOW}Por favor, instale as dependências faltantes e execute novamente.${NC}"
    exit 1
fi

# Step 2: Install dependencies
echo -e "${YELLOW}📦 Passo 2: Instalando dependências do Node.js...${NC}"
echo ""

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules já existe"
    read -p "Reinstalar dependências? (s/N): " REINSTALL
    if [[ $REINSTALL =~ ^[Ss]$ ]]; then
        echo "Removendo node_modules..."
        rm -rf node_modules
        pnpm install
    fi
else
    pnpm install
fi

echo ""

# Step 3: Configure environment variables
echo -e "${YELLOW}⚙️  Passo 3: Configurando variáveis de ambiente...${NC}"
echo ""

if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} Arquivo .env já existe"
    read -p "Sobrescrever com .env.example? (s/N): " OVERWRITE
    if [[ $OVERWRITE =~ ^[Ss]$ ]]; then
        cp .env.example .env
        echo -e "${GREEN}✓${NC} Arquivo .env atualizado"
    fi
else
    cp .env.example .env
    echo -e "${GREEN}✓${NC} Arquivo .env criado"
fi

# Update .env for Docker
echo ""
echo -e "${YELLOW}Configurando .env para Docker...${NC}"
if grep -q "DATABASE_URL=.*localhost:3306" .env; then
    sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL=mysql://blackbelt_user:blackbelt_password@localhost:3306/blackbelt?charset=utf8mb4|g' .env
    echo -e "${GREEN}✓${NC} DATABASE_URL configurado para Docker"
fi

echo ""

# Generate JWT_SECRET if needed
if grep -q "JWT_SECRET=your-jwt-secret" .env || grep -q "JWT_SECRET=$" .env; then
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" 2>/dev/null)
    if [ ! -z "$JWT_SECRET" ]; then
        sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" .env
        echo -e "${GREEN}✓${NC} JWT_SECRET gerado automaticamente"
    fi
fi

echo ""

# Step 4: Start Docker containers
echo -e "${YELLOW}🐳 Passo 4: Iniciando containers Docker...${NC}"
echo ""

# Check if containers are already running
if docker ps | grep -q "blackbelt-mysql"; then
    echo -e "${GREEN}✓${NC} Container MySQL já está rodando"
    read -p "Reiniciar container? (s/N): " RESTART
    if [[ $RESTART =~ ^[Ss]$ ]]; then
        echo "Reiniciando containers..."
        docker-compose down
        docker-compose up -d
    fi
else
    echo "Iniciando containers Docker..."
    docker-compose up -d
fi

echo ""
echo -e "${YELLOW}Aguardando MySQL inicializar...${NC}"
sleep 10

# Verify MySQL is ready
echo -e "${YELLOW}Verificando MySQL...${NC}"
MAX_RETRIES=30
RETRY=0
until docker exec blackbelt-mysql mysqladmin ping -h localhost -u blackbelt_user -pblackbelt_password &> /dev/null || [ $RETRY -eq $MAX_RETRIES ]; do
    echo -e "${YELLOW}⏳ Aguardando MySQL... ($((RETRY+1))/$MAX_RETRIES)${NC}"
    sleep 2
    RETRY=$((RETRY+1))
done

if [ $RETRY -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Timeout aguardando MySQL${NC}"
    echo -e "${YELLOW}Verifique os logs: docker-compose logs mysql${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} MySQL está pronto!"
echo ""

# Step 5: Database migrations
echo -e "${YELLOW}🗄️  Passo 5: Executando migrations...${NC}"
echo ""

if pnpm db:push; then
    echo -e "${GREEN}✓${NC} Migrations executadas com sucesso"
else
    echo -e "${RED}❌ Erro ao executar migrations${NC}"
    echo -e "${YELLOW}Verifique os logs: docker-compose logs mysql${NC}"
    exit 1
fi

echo ""

# Step 6: Run tests
echo -e "${YELLOW}🧪 Passo 6: Executando testes...${NC}"
echo ""

if pnpm test; then
    echo ""
    echo -e "${GREEN}✓${NC} Todos os testes passaram!"
else
    echo ""
    echo -e "${YELLOW}⚠️  Alguns testes falharam, mas você pode continuar${NC}"
fi

echo ""

# Final summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✨ Setup Docker Concluído! ✨              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Container MySQL está rodando:${NC}"
echo -e "  Host: ${GREEN}localhost${NC}"
echo -e "  Port: ${GREEN}3306${NC}"
echo -e "  Database: ${GREEN}blackbelt${NC}"
echo -e "  User: ${GREEN}blackbelt_user${NC}"
echo -e "  Password: ${GREEN}blackbelt_password${NC}"
echo ""
echo -e "${BLUE}Para iniciar o servidor de desenvolvimento:${NC}"
echo -e "  ${GREEN}pnpm dev${NC}"
echo ""
echo -e "${BLUE}A aplicação estará disponível em:${NC}"
echo -e "  ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}Comandos Docker úteis:${NC}"
echo -e "  ${GREEN}pnpm docker:logs${NC}       - Ver logs do MySQL"
echo -e "  ${GREEN}pnpm docker:mysql${NC}      - Acessar MySQL CLI"
echo -e "  ${GREEN}pnpm docker:down${NC}       - Parar containers"
echo -e "  ${GREEN}pnpm docker:reset${NC}      - Resetar e recriar containers"
echo -e "  ${GREEN}docker-compose ps${NC}      - Ver status dos containers"
echo ""
echo -e "${BLUE}Comandos da aplicação:${NC}"
echo -e "  ${GREEN}pnpm dev${NC}               - Iniciar desenvolvimento"
echo -e "  ${GREEN}pnpm build${NC}             - Build para produção"
echo -e "  ${GREEN}pnpm test${NC}              - Executar testes"
echo -e "  ${GREEN}pnpm db:push${NC}           - Executar migrations"
echo ""
echo -e "${BLUE}Documentação:${NC}"
echo -e "  - DOCKER_SETUP.md       - Guia Docker completo"
echo -e "  - COMO_RODAR.md         - Guia rápido"
echo -e "  - README.md             - Visão geral"
echo ""
echo -e "${YELLOW}Próximo passo: ${GREEN}pnpm dev${NC}"
echo ""
