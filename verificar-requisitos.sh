#!/bin/bash

# Script de Verificação de Pré-requisitos
# Black Belt Platform

echo "🔍 Verificando pré-requisitos para a Black Belt Platform..."
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de problemas
ISSUES=0

# Função para verificar comando
check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "${GREEN}✓${NC} $2 está instalado"
        if [ ! -z "$3" ]; then
            VERSION=$($3 2>&1)
            echo "  Versão: $VERSION"
        fi
        return 0
    else
        echo -e "${RED}✗${NC} $2 não está instalado"
        echo -e "  ${YELLOW}Instale com: $4${NC}"
        ISSUES=$((ISSUES + 1))
        return 1
    fi
}

# Verificar Node.js
echo "📦 Node.js"
if check_command "node" "Node.js" "node --version" "https://nodejs.org/"; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ $NODE_VERSION -lt 20 ]; then
        echo -e "  ${YELLOW}⚠ Versão muito antiga. Recomendado: Node.js 20+${NC}"
        ISSUES=$((ISSUES + 1))
    fi
fi
echo ""

# Verificar pnpm
echo "📦 pnpm"
check_command "pnpm" "pnpm" "pnpm --version" "npm install -g pnpm@10.4.1"
echo ""

# Verificar MySQL
echo "🗄️  MySQL"
if check_command "mysql" "MySQL" "mysql --version" "https://dev.mysql.com/downloads/"; then
    # Tentar verificar se o servidor está rodando
    if pgrep -x "mysqld" > /dev/null; then
        echo -e "  ${GREEN}✓${NC} Servidor MySQL está rodando"
    else
        echo -e "  ${YELLOW}⚠${NC} Servidor MySQL pode não estar rodando"
        echo "  Inicie com: sudo systemctl start mysql (Linux) ou brew services start mysql (macOS)"
    fi
fi
echo ""

# Verificar Git
echo "📂 Git"
check_command "git" "Git" "git --version" "https://git-scm.com/downloads"
echo ""

# Verificar se está no diretório do projeto
echo "📁 Verificando diretório do projeto..."
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} Você está no diretório do projeto"
    
    # Verificar se node_modules existe
    if [ -d "node_modules" ]; then
        echo -e "${GREEN}✓${NC} Dependências instaladas (node_modules existe)"
    else
        echo -e "${YELLOW}⚠${NC} Dependências não instaladas"
        echo "  Execute: pnpm install"
        ISSUES=$((ISSUES + 1))
    fi
    
    # Verificar arquivo .env
    if [ -f ".env" ]; then
        echo -e "${GREEN}✓${NC} Arquivo .env existe"
        
        # Verificar se DATABASE_URL está configurado
        if grep -q "DATABASE_URL=mysql://" .env 2>/dev/null; then
            echo -e "${GREEN}✓${NC} DATABASE_URL está configurado"
        else
            echo -e "${YELLOW}⚠${NC} DATABASE_URL pode não estar configurado corretamente"
            ISSUES=$((ISSUES + 1))
        fi
        
        # Verificar JWT_SECRET
        if grep -q "JWT_SECRET=your-jwt-secret" .env 2>/dev/null; then
            echo -e "${YELLOW}⚠${NC} JWT_SECRET usa valor padrão (inseguro)"
            echo "  Gere um novo com: openssl rand -base64 32"
            ISSUES=$((ISSUES + 1))
        elif grep -q "JWT_SECRET=" .env 2>/dev/null; then
            echo -e "${GREEN}✓${NC} JWT_SECRET está configurado"
        fi
    else
        echo -e "${RED}✗${NC} Arquivo .env não encontrado"
        echo "  Execute: cp .env.example .env"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}✗${NC} package.json não encontrado"
    echo "  Execute este script no diretório raiz do projeto"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# Verificar conexão com banco de dados (se possível)
if [ -f ".env" ] && command -v mysql &> /dev/null; then
    echo "🔌 Tentando conectar ao banco de dados..."
    
    # Extrair informações do DATABASE_URL
    if grep -q "DATABASE_URL=" .env; then
        DB_URL=$(grep "DATABASE_URL=" .env | cut -d'=' -f2-)
        
        # Parse básico da URL (mysql://user:pass@host:port/db)
        if [[ $DB_URL =~ mysql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
            DB_USER="${BASH_REMATCH[1]}"
            DB_PASS="${BASH_REMATCH[2]}"
            DB_HOST="${BASH_REMATCH[3]}"
            DB_PORT="${BASH_REMATCH[4]}"
            DB_NAME="${BASH_REMATCH[5]}"
            
            # Tentar conectar (sem mostrar senha no output)
            if mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" -e "USE $DB_NAME" 2>/dev/null; then
                echo -e "${GREEN}✓${NC} Conexão com banco de dados bem-sucedida"
                
                # Verificar se há tabelas
                TABLE_COUNT=$(mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" -P "$DB_PORT" -D "$DB_NAME" -e "SHOW TABLES" 2>/dev/null | wc -l)
                if [ $TABLE_COUNT -gt 1 ]; then
                    echo -e "${GREEN}✓${NC} Banco de dados tem $((TABLE_COUNT - 1)) tabelas"
                else
                    echo -e "${YELLOW}⚠${NC} Banco de dados está vazio"
                    echo "  Execute: pnpm db:push"
                    ISSUES=$((ISSUES + 1))
                fi
            else
                echo -e "${RED}✗${NC} Não foi possível conectar ao banco de dados"
                echo "  Verifique as credenciais no arquivo .env"
                ISSUES=$((ISSUES + 1))
            fi
        fi
    fi
    echo ""
fi

# Resumo
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ Tudo pronto!${NC} A plataforma está pronta para rodar."
    echo ""
    echo "Execute para iniciar:"
    echo "  pnpm dev"
    echo ""
    echo "Acesse: http://localhost:3000"
else
    echo -e "${YELLOW}⚠ Encontrados $ISSUES problema(s)${NC}"
    echo ""
    echo "Corrija os problemas acima e execute este script novamente."
    echo ""
    echo "Para ajuda detalhada, consulte:"
    echo "  - COMO_RODAR.md - Guia rápido"
    echo "  - SETUP_GUIDE.md - Guia completo"
    echo "  - TROUBLESHOOTING.md - Solução de problemas"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $ISSUES
