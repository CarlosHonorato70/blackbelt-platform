#!/bin/bash

# ====================================================
# Black Belt Platform - Setup Script
# ====================================================
# Este script automatiza a instalação da plataforma
# ====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Black Belt Platform - Setup Automatizado            ║${NC}"
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

if check_command "mysql"; then
    MYSQL_VERSION=$(mysql --version)
    echo -e "   Versão: ${MYSQL_VERSION}"
else
    echo -e "${YELLOW}⚠️  MySQL não detectado. Você precisará instalá-lo manualmente.${NC}"
    MISSING_DEPS=1
fi

echo ""

if [ $MISSING_DEPS -eq 1 ]; then
    echo -e "${RED}❌ Alguns pré-requisitos estão faltando.${NC}"
    echo -e "${YELLOW}Por favor, instale as dependências faltantes e execute novamente.${NC}"
    exit 1
fi

# Step 2: Install dependencies
echo -e "${YELLOW}📦 Passo 2: Instalando dependências...${NC}"
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

echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Configure o arquivo .env antes de continuar!${NC}"
echo ""
echo -e "Você precisa configurar:"
echo -e "  1. ${BLUE}DATABASE_URL${NC} - String de conexão do MySQL"
echo -e "  2. ${BLUE}JWT_SECRET${NC} - Token secreto (mínimo 32 caracteres)"
echo ""

# Generate JWT_SECRET suggestion
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" 2>/dev/null || echo "")
if [ ! -z "$JWT_SECRET" ]; then
    echo -e "JWT_SECRET sugerido:"
    echo -e "${GREEN}$JWT_SECRET${NC}"
    echo ""
fi

read -p "Deseja editar o arquivo .env agora? (s/N): " EDIT_ENV
if [[ $EDIT_ENV =~ ^[Ss]$ ]]; then
    ${EDITOR:-nano} .env
fi

echo ""

# Step 4: Database setup
echo -e "${YELLOW}🗄️  Passo 4: Configuração do banco de dados${NC}"
echo ""

read -p "O banco de dados MySQL já está criado? (s/N): " DB_EXISTS
if [[ ! $DB_EXISTS =~ ^[Ss]$ ]]; then
    echo ""
    echo -e "${YELLOW}Execute os seguintes comandos no MySQL:${NC}"
    echo ""
    echo -e "${BLUE}CREATE DATABASE blackbelt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;${NC}"
    echo -e "${BLUE}CREATE USER 'blackbelt_user'@'localhost' IDENTIFIED BY 'senha_segura';${NC}"
    echo -e "${BLUE}GRANT ALL PRIVILEGES ON blackbelt.* TO 'blackbelt_user'@'localhost';${NC}"
    echo -e "${BLUE}FLUSH PRIVILEGES;${NC}"
    echo ""
    read -p "Pressione Enter quando o banco estiver criado..."
fi

echo ""
echo -e "${YELLOW}Executando migrations...${NC}"
if pnpm db:push; then
    echo -e "${GREEN}✓${NC} Migrations executadas com sucesso"
else
    echo -e "${RED}❌ Erro ao executar migrations${NC}"
    echo -e "${YELLOW}Verifique se o DATABASE_URL está correto no arquivo .env${NC}"
    exit 1
fi

echo ""

# Step 5: Run tests
echo -e "${YELLOW}🧪 Passo 5: Executando testes...${NC}"
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
echo -e "${GREEN}║              ✨ Setup Concluído! ✨                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Para iniciar o servidor de desenvolvimento:${NC}"
echo -e "  ${GREEN}pnpm dev${NC}"
echo ""
echo -e "${BLUE}A aplicação estará disponível em:${NC}"
echo -e "  ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}Comandos úteis:${NC}"
echo -e "  ${GREEN}pnpm dev${NC}          - Iniciar desenvolvimento"
echo -e "  ${GREEN}pnpm build${NC}        - Build para produção"
echo -e "  ${GREEN}pnpm test${NC}         - Executar testes"
echo -e "  ${GREEN}pnpm db:push${NC}      - Executar migrations"
echo ""
echo -e "${BLUE}Documentação:${NC}"
echo -e "  - SETUP_GUIDE.md        - Guia completo"
echo -e "  - TESTING.md            - Documentação de testes"
echo -e "  - README.md             - Visão geral"
echo ""
echo -e "${YELLOW}Próximo passo: ${GREEN}pnpm dev${NC}"
echo ""
