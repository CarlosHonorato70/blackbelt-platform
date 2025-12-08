#!/bin/bash

# Script para configurar automaticamente os secrets do GitHub
# Autor: BlackBelt Platform
# Descrição: Configura todos os secrets necessários para CI/CD automaticamente

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}\n"
}

# Função para ler input com valor padrão
read_input() {
    local prompt="$1"
    local default="$2"
    local is_secret="${3:-false}"
    local value
    
    if [ "$is_secret" = "true" ]; then
        read -s -p "$(echo -e "${prompt} ${YELLOW}[${default}]${NC}: ")" value
        echo ""
    else
        read -p "$(echo -e "${prompt} ${YELLOW}[${default}]${NC}: ")" value
    fi
    
    echo "${value:-$default}"
}

# Verificar se gh CLI está instalado
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLI (gh) não está instalado!"
        echo ""
        print_info "Instale o GitHub CLI:"
        echo "  - Linux/Mac: https://cli.github.com/manual/installation"
        echo "  - Windows: winget install --id GitHub.cli"
        echo ""
        exit 1
    fi
    
    print_success "GitHub CLI encontrado: $(gh --version | head -1)"
}

# Verificar autenticação do GitHub
check_gh_auth() {
    if ! gh auth status &> /dev/null; then
        print_error "Você não está autenticado no GitHub CLI!"
        echo ""
        print_info "Execute: gh auth login"
        echo ""
        exit 1
    fi
    
    print_success "Autenticado no GitHub CLI"
}

# Obter repositório atual
get_repository() {
    local repo=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
    
    if [ -z "$repo" ]; then
        print_error "Não foi possível detectar o repositório atual"
        read -p "Digite o nome do repositório (formato: owner/repo): " repo
    fi
    
    echo "$repo"
}

# Criar ou atualizar secret
create_secret() {
    local name="$1"
    local value="$2"
    local repo="$3"
    
    if [ -z "$value" ]; then
        print_warning "Valor vazio para $name - pulando..."
        return
    fi
    
    if echo "$value" | gh secret set "$name" -R "$repo" 2>/dev/null; then
        print_success "Secret criado/atualizado: $name"
    else
        print_error "Erro ao criar secret: $name"
        return 1
    fi
}

# Gerar chave SSH
generate_ssh_key() {
    local key_name="$1"
    local key_path="$HOME/.ssh/$key_name"
    
    if [ -f "$key_path" ]; then
        print_warning "Chave SSH já existe: $key_path"
        read -p "Deseja usar a chave existente? (s/n): " use_existing
        if [[ $use_existing =~ ^[Ss]$ ]]; then
            echo "$key_path"
            return
        fi
    fi
    
    # Nota de Segurança: A chave é gerada sem passphrase para permitir
    # automação de deploy no CI/CD. A chave privada fica armazenada
    # como secret criptografado no GitHub.
    print_info "Gerando nova chave SSH: $key_path"
    ssh-keygen -t ed25519 -f "$key_path" -N "" -C "github-actions-blackbelt"
    print_success "Chave SSH gerada com sucesso!"
    echo "$key_path"
}

# Exibir chave pública para adicionar ao servidor
show_public_key() {
    local key_path="$1"
    local server_type="$2"
    
    if [ ! -f "${key_path}.pub" ]; then
        print_error "Chave pública não encontrada: ${key_path}.pub"
        return
    fi
    
    print_header "IMPORTANTE: Adicione esta chave pública no servidor $server_type"
    echo ""
    echo "Copie o conteúdo abaixo:"
    echo "─────────────────────────────────────────────────────────"
    cat "${key_path}.pub"
    echo "─────────────────────────────────────────────────────────"
    echo ""
    echo "Execute no servidor $server_type:"
    echo "  mkdir -p ~/.ssh"
    echo "  echo \"$(cat ${key_path}.pub)\" >> ~/.ssh/authorized_keys"
    echo "  chmod 700 ~/.ssh"
    echo "  chmod 600 ~/.ssh/authorized_keys"
    echo ""
    read -p "Pressione Enter após adicionar a chave pública no servidor..."
}

# Banner inicial
print_header "🔐 Configuração Automática de Secrets do GitHub"
echo "Este script irá configurar todos os secrets necessários para CI/CD"
echo "da plataforma BlackBelt automaticamente."
echo ""

# Verificações iniciais
print_info "Verificando pré-requisitos..."
check_gh_cli
check_gh_auth
echo ""

# Obter repositório
REPO=$(get_repository)
print_success "Repositório detectado: $REPO"
echo ""

# Confirmação
read -p "Deseja continuar com a configuração de secrets? (s/n): " confirm
if [[ ! $confirm =~ ^[Ss]$ ]]; then
    print_warning "Operação cancelada pelo usuário"
    exit 0
fi

# ════════════════════════════════════════════════════════════
# 1. CONFIGURAÇÃO DO REGISTRO DE CONTAINERS
# ════════════════════════════════════════════════════════════

print_header "1. Configuração do Registro de Containers"
echo "Escolha o serviço de registro de containers:"
echo "  1) GitHub Container Registry (GHCR) - Recomendado para GitHub"
echo "  2) Docker Hub"
echo ""
read -p "Escolha uma opção (1 ou 2): " registry_choice

if [ "$registry_choice" = "1" ]; then
    # GitHub Container Registry (GHCR)
    print_info "Configurando GitHub Container Registry (GHCR)..."
    echo ""
    echo "Para criar um Personal Access Token (PAT):"
    echo "  1. Acesse: https://github.com/settings/tokens/new"
    echo "  2. Note: 'github-actions-blackbelt'"
    echo "  3. Expiration: 90 days (ou conforme necessário)"
    echo "  4. Scopes: Marque 'write:packages' e 'read:packages'"
    echo "  5. Clique em 'Generate token'"
    echo "  6. Copie o token gerado"
    echo ""
    
    GHCR_TOKEN=$(read_input "Cole seu GitHub Personal Access Token (PAT)" "" "true")
    
    # Extrair username do repositório
    GITHUB_USERNAME=$(echo "$REPO" | cut -d'/' -f1)
    
    # Criar secrets (DOCKER_USERNAME e DOCKER_PASSWORD são aliases
    # para compatibilidade com workflows existentes que usam Docker Hub)
    create_secret "GHCR_TOKEN" "$GHCR_TOKEN" "$REPO"
    create_secret "DOCKER_USERNAME" "$GITHUB_USERNAME" "$REPO"
    create_secret "DOCKER_PASSWORD" "$GHCR_TOKEN" "$REPO"
    
    print_success "GHCR configurado com sucesso!"
    
else
    # Docker Hub
    print_info "Configurando Docker Hub..."
    echo ""
    echo "Para criar um Access Token no Docker Hub:"
    echo "  1. Acesse: https://hub.docker.com/settings/security"
    echo "  2. Clique em 'New Access Token'"
    echo "  3. Description: 'github-actions-blackbelt'"
    echo "  4. Access permissions: 'Read & Write'"
    echo "  5. Copie o token gerado"
    echo ""
    
    DOCKER_USERNAME=$(read_input "Digite seu username do Docker Hub" "")
    DOCKER_PASSWORD=$(read_input "Cole seu Docker Hub Access Token" "" "true")
    
    create_secret "DOCKER_USERNAME" "$DOCKER_USERNAME" "$REPO"
    create_secret "DOCKER_PASSWORD" "$DOCKER_PASSWORD" "$REPO"
fi

# ════════════════════════════════════════════════════════════
# 2. CONFIGURAÇÃO DO SERVIDOR DE DEPLOY
# ════════════════════════════════════════════════════════════

print_header "2. Configuração do Servidor de Deploy"

SSH_HOST=$(read_input "IP ou domínio do servidor" "")
SSH_USER=$(read_input "Usuário SSH no servidor" "deploy")
SSH_PORT=$(read_input "Porta SSH" "22")
DEPLOY_PATH=$(read_input "Caminho do deploy no servidor" "/home/deploy/blackbelt")

create_secret "SSH_HOST" "$SSH_HOST" "$REPO"
create_secret "SSH_USER" "$SSH_USER" "$REPO"
create_secret "SSH_PORT" "$SSH_PORT" "$REPO"
create_secret "DEPLOY_PATH" "$DEPLOY_PATH" "$REPO"

# Aliases para compatibilidade com workflows existentes
create_secret "SERVER_HOST" "$SSH_HOST" "$REPO"
create_secret "SERVER_USER" "$SSH_USER" "$REPO"

# ════════════════════════════════════════════════════════════
# 3. CONFIGURAÇÃO DA CHAVE SSH
# ════════════════════════════════════════════════════════════

print_header "3. Configuração da Chave SSH"
echo "Escolha como configurar a chave SSH:"
echo "  1) Gerar nova chave SSH (recomendado)"
echo "  2) Usar chave SSH existente"
echo ""
read -p "Escolha uma opção (1 ou 2): " ssh_choice

if [ "$ssh_choice" = "1" ]; then
    # Gerar nova chave
    SSH_KEY_PATH=$(generate_ssh_key "blackbelt_deploy_key")
    show_public_key "$SSH_KEY_PATH" "deploy"
    SSH_PRIVATE_KEY=$(cat "$SSH_KEY_PATH")
else
    # Usar chave existente
    echo ""
    echo "Chaves SSH disponíveis:"
    ls -1 ~/.ssh/*.pub 2>/dev/null | sed 's/.pub$//' || echo "  (nenhuma encontrada)"
    echo ""
    
    read -p "Digite o caminho completo da chave privada: " SSH_KEY_PATH
    
    if [ ! -f "$SSH_KEY_PATH" ]; then
        print_error "Arquivo não encontrado: $SSH_KEY_PATH"
        exit 1
    fi
    
    if [ -f "${SSH_KEY_PATH}.pub" ]; then
        show_public_key "$SSH_KEY_PATH" "deploy"
    else
        print_warning "Chave pública não encontrada. Certifique-se de que a chave já está no servidor."
    fi
    
    SSH_PRIVATE_KEY=$(cat "$SSH_KEY_PATH")
fi

create_secret "SSH_PRIVATE_KEY" "$SSH_PRIVATE_KEY" "$REPO"

# ════════════════════════════════════════════════════════════
# 4. CONFIGURAÇÃO ADICIONAL (OPCIONAL)
# ════════════════════════════════════════════════════════════

print_header "4. Configuração Adicional (Opcional)"

read -p "Deseja configurar URL de produção? (s/n): " config_prod_url
if [[ $config_prod_url =~ ^[Ss]$ ]]; then
    PRODUCTION_URL=$(read_input "URL de produção (ex: blackbelt.com)" "")
    create_secret "PRODUCTION_URL" "$PRODUCTION_URL" "$REPO"
fi

read -p "Deseja configurar Slack webhook para notificações? (s/n): " config_slack
if [[ $config_slack =~ ^[Ss]$ ]]; then
    echo ""
    echo "Para criar um Slack webhook:"
    echo "  1. Acesse: https://api.slack.com/apps"
    echo "  2. Clique em 'Create New App' > 'From scratch'"
    echo "  3. Configure 'Incoming Webhooks'"
    echo "  4. Copie a Webhook URL"
    echo ""
    
    SLACK_WEBHOOK=$(read_input "Cole a URL do Slack webhook" "" "true")
    create_secret "SLACK_WEBHOOK" "$SLACK_WEBHOOK" "$REPO"
fi

# ════════════════════════════════════════════════════════════
# RESUMO FINAL
# ════════════════════════════════════════════════════════════

print_header "✅ Configuração Concluída!"

echo "Secrets configurados no repositório: $REPO"
echo ""
echo "Para verificar os secrets criados, execute:"
echo "  gh secret list -R $REPO"
echo ""
echo "Ou visite:"
echo "  https://github.com/$REPO/settings/secrets/actions"
echo ""

print_info "Próximos passos:"
echo "  1. Verifique se todos os secrets foram criados corretamente"
echo "  2. Teste a conexão SSH com o servidor"
echo "  3. Execute um workflow manual para validar a configuração"
echo "  4. Consulte GUIA_SETUP_AUTOMATICO_SECRETS.md para mais detalhes"
echo ""

# Testar conexão SSH (opcional)
read -p "Deseja testar a conexão SSH com o servidor agora? (s/n): " test_ssh
if [[ $test_ssh =~ ^[Ss]$ ]]; then
    print_info "Testando conexão SSH..."
    # Usar StrictHostKeyChecking=accept-new para melhor segurança em primeira conexão
    if ssh -i "$SSH_KEY_PATH" -p "$SSH_PORT" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "$SSH_USER@$SSH_HOST" "echo 'Conexão SSH bem-sucedida!'" 2>/dev/null; then
        print_success "Conexão SSH funcionando corretamente!"
    else
        print_error "Falha na conexão SSH. Verifique:"
        echo "  - Se a chave pública foi adicionada ao servidor"
        echo "  - Se o usuário e host estão corretos"
        echo "  - Se o firewall permite conexões SSH"
    fi
fi

print_success "Script finalizado com sucesso! 🎉"
