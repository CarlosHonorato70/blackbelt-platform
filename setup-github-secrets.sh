#!/usr/bin/env bash

echo "=============================================================="
echo "     🚀 Configuração Automática de Secrets – GitHub Actions"
echo "=============================================================="
echo ""
echo "Este script vai configurar automaticamente todos os secrets"
echo "necessários para o deploy automático da sua aplicação."
echo ""

# Confirmar execução
read -p "Deseja continuar com a configuração de secrets? (s/n): " confirm
if [[ "$confirm" != "s" ]]; then
    echo "❌ Configuração cancelada."
    exit 1
fi

echo ""
echo "=============================================================="
echo "🔧 Passo 1 – Escolher o serviço de registro de containers"
echo "=============================================================="
echo ""
echo "Escolha o registro de containers:"
echo "  1) GitHub Container Registry (GHCR) – recomendado"
echo "  2) Docker Hub"
read -p "Escolha uma opção (1 ou 2): " registry_option

if [[ "$registry_option" == "1" ]]; then
    REGISTRY="ghcr.io"
    SECRET_TOKEN_NAME="GHCR_TOKEN"
    echo "✔️ GHCR selecionado."
elif [[ "$registry_option" == "2" ]]; then
    REGISTRY="docker.io"
    SECRET_TOKEN_NAME="DOCKER_PASSWORD"
    echo "✔️ Docker Hub selecionado."
else
    echo "❌ Opção inválida."
    exit 1
fi

echo ""
echo "=============================================================="
echo "🔑 Passo 2 – Token de Acesso (PAT)"
echo "=============================================================="
echo ""
echo "➡️ Abra esta página no navegador:"
echo "    https://github.com/settings/tokens/new"
echo ""
echo "Crie um token com estas permissões:"
echo "   ☑️ write:packages"
echo "   ☑️ read:packages"
echo "   ☑️ delete:packages (opcional)"
echo ""
read -p "Cole aqui o seu GitHub Personal Access Token (PAT): " PAT

if [[ -z "$PAT" ]]; then
    echo "❌ Você não forneceu um token. Abortando."
    exit 1
fi

echo ""
echo "=============================================================="
echo "🌐 Passo 3 – Informações do Servidor"
echo "=============================================================="
echo ""
read -p "IP ou domínio do servidor []: " SERVER_HOST
read -p "Usuário SSH do servidor [deploy]: " SERVER_USER
read -p "Porta SSH [22]: " SERVER_PORT
read -p "Caminho no servidor [/home/deploy/blackbelt]: " DEPLOY_PATH

SERVER_USER=${SERVER_USER:-deploy}
SERVER_PORT=${SERVER_PORT:-22}
DEPLOY_PATH=${DEPLOY_PATH:-/home/deploy/blackbelt}

echo ""
echo "=============================================================="
echo "🔐 Passo 4 – Chave SSH"
echo "=============================================================="
echo ""
echo "Escolha:"
echo "  1) Gerar nova chave SSH"
echo "  2) Usar chave existente"
read -p "Opção (1 ou 2): " ssh_option

SSH_KEY_PATH="$HOME/.ssh/github_actions_key"

if [[ "$ssh_option" == "1" ]]; then
    echo "🛠️ Gerando chave SSH ED25519..."
    ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -C "github-actions-key"
    SSH_PRIVATE_KEY=$(cat "$SSH_KEY_PATH")
    SSH_PUBLIC_KEY=$(cat "$SSH_KEY_PATH.pub")

    echo ""
    echo "=============================================================="
    echo "📤 Copie esta chave pública e adicione no servidor:"
    echo "=============================================================="
    echo ""
    echo "─────────────────────────────────────────────────────────────"
    echo "$SSH_PUBLIC_KEY"
    echo "─────────────────────────────────────────────────────────────"
    echo ""
    read -p "Pressione ENTER após adicionar a chave ao servidor..."
else
    read -p "Digite o caminho completo da chave privada: " EXISTING_KEY
    SSH_PRIVATE_KEY=$(cat "$EXISTING_KEY")
fi

echo ""
echo "=============================================================="
echo "📦 Passo 5 – Criando Secrets no GitHub"
echo "=============================================================="
echo ""

set_secret() {
    gh secret set "$1" --body "$2"
    echo "✔️ Secret $1 configurado."
}

set_secret "SERVER_HOST" "$SERVER_HOST"
set_secret "SERVER_USER" "$SERVER_USER"
set_secret "SSH_PORT" "$SERVER_PORT"
set_secret "DEPLOY_PATH" "$DEPLOY_PATH"
set_secret "SSH_PRIVATE_KEY" "$SSH_PRIVATE_KEY"
set_secret "$SECRET_TOKEN_NAME" "$PAT"

if [[ "$registry_option" == "2" ]]; then
    read -p "Digite seu usuário do Docker Hub: " DOCKER_USER
    set_secret "DOCKER_USERNAME" "$DOCKER_USER"
fi

echo ""
echo "=============================================================="
echo "🧪 Testar conexão SSH"
echo "=============================================================="
echo ""
read -p "Deseja testar a conexão SSH? (s/n): " test_ssh

if [[ "$test_ssh" == "s" ]]; then
    echo "Testando conexão..."
    ssh -i "$SSH_KEY_PATH" -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "echo 'Conexão bem-sucedida!'"
fi

echo ""
echo "=============================================================="
echo "🎉 TUDO PRONTO!"
echo "=============================================================="
echo ""
echo "Todos os secrets foram configurados com sucesso!"
echo "Agora seus deploys automáticos via GitHub Actions estão prontos."
echo ""
