# 🚀 Guia de Configuração Automática de Secrets do GitHub

## 📌 Visão Geral

Este guia explica como usar o script automatizado `setup-github-secrets.sh` para configurar todos os secrets necessários do GitHub Actions de forma rápida e interativa.

## ✨ Benefícios do Setup Automático

- ⚡ **Rápido**: Configure todos os secrets em minutos
- 🎯 **Interativo**: O script guia você passo a passo
- 🔒 **Seguro**: Usa GitHub CLI oficial para gerenciar secrets
- ✅ **Validação**: Testa conexões e verifica configurações
- 🌐 **Suporte GHCR**: Configuração automática para GitHub Container Registry
- 🐳 **Suporte Docker Hub**: Alternativa para quem prefere Docker Hub

## 📋 Pré-requisitos

### 1. GitHub CLI (gh)

O script requer o GitHub CLI instalado e configurado.

**Linux/Mac:**
```bash
# Instalar GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

**Windows:**
```powershell
# Usando winget
winget install --id GitHub.cli

# Ou usando scoop
scoop install gh
```

**Mac:**
```bash
brew install gh
```

### 2. Autenticação no GitHub

```bash
# Fazer login no GitHub CLI
gh auth login

# Escolha:
# - GitHub.com
# - HTTPS
# - Login com navegador (recomendado)
```

### 3. Permissões Necessárias

Você precisa ter permissões de **administrador** ou **write** no repositório para criar secrets.

## 🎯 Secrets Configurados pelo Script

O script configura automaticamente os seguintes secrets:

| Secret | Descrição | Obrigatório |
|--------|-----------|-------------|
| `GHCR_TOKEN` ou `DOCKER_PASSWORD` | Token para push de imagens Docker | ✅ Sim |
| `DOCKER_USERNAME` | Username do Docker Hub ou GitHub | ✅ Sim |
| `SSH_PRIVATE_KEY` | Chave privada SSH para deploy | ✅ Sim |
| `SSH_HOST` | IP ou domínio do servidor | ✅ Sim |
| `SSH_USER` | Usuário SSH no servidor | ✅ Sim |
| `SSH_PORT` | Porta SSH (padrão: 22) | ✅ Sim |
| `DEPLOY_PATH` | Caminho do deploy no servidor | ✅ Sim |
| `SERVER_HOST` | Alias para SSH_HOST | ✅ Sim (auto) |
| `SERVER_USER` | Alias para SSH_USER | ✅ Sim (auto) |
| `PRODUCTION_URL` | URL de produção para health checks | ⚪ Opcional |
| `SLACK_WEBHOOK` | Webhook para notificações Slack | ⚪ Opcional |

## 🚀 Como Usar

### Passo 1: Clone o Repositório

```bash
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform
```

### Passo 2: Execute o Script

```bash
./setup-github-secrets.sh
```

### Passo 3: Siga as Instruções Interativas

O script irá guiá-lo através das seguintes etapas:

#### 3.1. Verificação de Pré-requisitos

O script verifica automaticamente:
- ✅ GitHub CLI instalado
- ✅ Autenticação ativa
- ✅ Repositório detectado

#### 3.2. Escolha do Registro de Containers

**Opção 1: GitHub Container Registry (GHCR) - Recomendado**

Vantagens:
- ✅ Integrado com GitHub
- ✅ Melhor integração com GitHub Actions
- ✅ Sem limite de pulls públicos
- ✅ Versionamento automático

Como obter o token:
1. Acesse: https://github.com/settings/tokens/new
2. Note: `github-actions-blackbelt`
3. Expiration: `90 days` (ou conforme necessário)
4. Scopes necessários:
   - ✅ `write:packages`
   - ✅ `read:packages`
   - ✅ `delete:packages` (opcional, para limpeza)
5. Clique em **Generate token**
6. **COPIE O TOKEN** (não será mostrado novamente!)

**Opção 2: Docker Hub**

Como obter o token:
1. Acesse: https://hub.docker.com/settings/security
2. Clique em **New Access Token**
3. Description: `github-actions-blackbelt`
4. Access permissions: **Read & Write**
5. Clique em **Generate**
6. **COPIE O TOKEN**

#### 3.3. Configuração do Servidor

Você precisará fornecer:

- **SSH_HOST**: IP ou domínio do servidor
  - Exemplo: `192.168.1.100` ou `server.blackbelt.com`
  
- **SSH_USER**: Usuário para SSH
  - Exemplo: `deploy`, `ubuntu`, ou `root`
  
- **SSH_PORT**: Porta SSH (padrão: 22)
  - Mantenha 22 se não alterou
  
- **DEPLOY_PATH**: Caminho onde a aplicação será instalada
  - Exemplo: `/home/deploy/blackbelt` ou `/opt/blackbelt-platform`

#### 3.4. Configuração da Chave SSH

O script oferece duas opções:

**Opção 1: Gerar Nova Chave (Recomendado)**

O script irá:
1. Gerar um par de chaves SSH (pública + privada)
2. Salvar em `~/.ssh/blackbelt_deploy_key`
3. Mostrar a chave pública para você adicionar no servidor
4. Adicionar automaticamente a chave privada como secret

**Opção 2: Usar Chave Existente**

Se você já tem uma chave SSH:
1. Informe o caminho da chave privada
2. O script irá usar essa chave
3. Certifique-se de que a chave pública já está no servidor

**Como Adicionar a Chave Pública no Servidor:**

```bash
# No servidor de deploy (via SSH ou console)
mkdir -p ~/.ssh
echo "sua-chave-publica-aqui" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

Ou usando SCP:
```bash
# Do seu computador
scp ~/.ssh/blackbelt_deploy_key.pub usuario@servidor:~/chave.pub

# No servidor
cat ~/chave.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
rm ~/chave.pub
```

#### 3.5. Configurações Opcionais

**Production URL (Opcional)**

URL para health checks após deploy:
- Exemplo: `blackbelt.com` ou `app.blackbelt.com`
- Usado para validar se o deploy foi bem-sucedido

**Slack Webhook (Opcional)**

Para receber notificações de deploy no Slack:

1. Acesse: https://api.slack.com/apps
2. Clique em **Create New App** → **From scratch**
3. Nome: `BlackBelt Deployments`
4. Selecione seu workspace
5. No menu lateral, clique em **Incoming Webhooks**
6. Ative o toggle para **On**
7. Clique em **Add New Webhook to Workspace**
8. Selecione o canal (ex: `#deployments`)
9. Copie a Webhook URL (ex: `https://hooks.slack.com/services/T.../B.../X...`)

## 📊 Verificação dos Secrets

### Via GitHub CLI

```bash
# Listar todos os secrets
gh secret list

# Ver quando um secret foi atualizado
gh secret list | grep SSH_PRIVATE_KEY
```

### Via Interface Web

1. Acesse: https://github.com/CarlosHonorato70/blackbelt-platform
2. Clique em **Settings**
3. No menu lateral: **Secrets and variables** → **Actions**
4. Você verá todos os secrets criados

## 🧪 Testando a Configuração

### Teste 1: Verificar Secrets

```bash
# Listar secrets criados
gh secret list -R CarlosHonorato70/blackbelt-platform

# Deve mostrar:
# DEPLOY_PATH
# DOCKER_PASSWORD
# DOCKER_USERNAME
# GHCR_TOKEN (se escolheu GHCR)
# PRODUCTION_URL (se configurou)
# SERVER_HOST
# SERVER_USER
# SLACK_WEBHOOK (se configurou)
# SSH_HOST
# SSH_PORT
# SSH_PRIVATE_KEY
# SSH_USER
```

### Teste 2: Testar Conexão SSH

```bash
# Testar com a chave gerada
ssh -i ~/.ssh/blackbelt_deploy_key usuario@servidor

# Se conectar sem pedir senha, está correto!
```

### Teste 3: Executar Workflow Manual

1. Acesse seu repositório no GitHub
2. Clique em **Actions**
3. Selecione um workflow (ex: `Deploy to Production`)
4. Clique em **Run workflow**
5. Verifique os logs para erros

### Teste 4: Validar Docker Login

```bash
# Se usando GHCR
echo $GHCR_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Se usando Docker Hub
echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
```

## 🔧 Resolução de Problemas

### Erro: "gh: command not found"

**Problema**: GitHub CLI não instalado

**Solução**:
```bash
# Linux
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo apt update && sudo apt install gh

# Mac
brew install gh

# Windows
winget install --id GitHub.cli
```

### Erro: "not logged in to any GitHub hosts"

**Problema**: Não autenticado no GitHub CLI

**Solução**:
```bash
gh auth login
# Siga as instruções no terminal
```

### Erro: "permission denied (publickey)"

**Problema**: Chave SSH não configurada no servidor

**Solução**:
```bash
# 1. Verificar se a chave pública está no servidor
ssh usuario@servidor "cat ~/.ssh/authorized_keys"

# 2. Se não estiver, adicione:
cat ~/.ssh/blackbelt_deploy_key.pub | ssh usuario@servidor "cat >> ~/.ssh/authorized_keys"

# 3. Corrigir permissões no servidor
ssh usuario@servidor "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

### Erro: "HTTP 403: Resource not accessible by integration"

**Problema**: Token sem permissões necessárias

**Solução**:
```bash
# Gere um novo token com as permissões corretas:
# - write:packages
# - read:packages

# Execute o script novamente e forneça o novo token
```

### Workflow Falha com "Authentication required"

**Problema**: Secrets não estão configurados ou estão incorretos

**Solução**:
```bash
# 1. Verifique se todos os secrets existem
gh secret list

# 2. Se algum estiver faltando, execute o script novamente
./setup-github-secrets.sh

# 3. Ou adicione manualmente:
gh secret set SECRET_NAME
```

## 🔒 Segurança e Boas Práticas

### ✅ Recomendações

1. **Use tokens de acesso, não senhas**
   - Tokens são mais seguros e podem ser revogados
   - Configure expiração (90 dias recomendado)

2. **Rotação regular de secrets**
   - Recomendado: a cada 3 meses
   - Execute o script novamente para atualizar

3. **Chaves SSH separadas**
   - Use uma chave específica para deploy
   - Não reutilize sua chave pessoal

4. **Princípio do menor privilégio**
   - O usuário de deploy deve ter apenas as permissões necessárias
   - Não use `root` se possível

5. **Monitoramento**
   - Monitore tentativas de login SSH falhadas
   - Configure alertas no GitHub Actions

### ⚠️ O Que Evitar

- ❌ Nunca compartilhe secrets via email/chat
- ❌ Não commite secrets no código
- ❌ Não use a mesma senha em múltiplos serviços
- ❌ Não desative 2FA para facilitar automação
- ❌ Não use chaves SSH sem passphrase em ambientes compartilhados

## 📝 Atualizar Secrets Existentes

Se você precisar atualizar um secret:

### Opção 1: Re-executar o Script

```bash
./setup-github-secrets.sh
# O script irá sobrescrever os secrets existentes
```

### Opção 2: Atualizar Manualmente

```bash
# Via GitHub CLI
echo "novo-valor" | gh secret set SECRET_NAME

# Ou com arquivo
gh secret set SSH_PRIVATE_KEY < ~/.ssh/nova_chave
```

### Opção 3: Via Interface Web

1. Vá em Settings → Secrets → Actions
2. Clique no secret que deseja atualizar
3. Clique em **Update secret**
4. Cole o novo valor
5. Clique em **Update secret**

## 📚 Documentação Adicional

- [GUIA_CONFIGURACAO_SECRETS_GITHUB.md](./GUIA_CONFIGURACAO_SECRETS_GITHUB.md) - Guia manual detalhado
- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Guia de deploy em produção
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub CLI Manual](https://cli.github.com/manual/)

## 🆘 Suporte

Se você encontrar problemas:

1. **Verifique os logs do workflow**
   - Actions → Workflow → View logs

2. **Consulte o troubleshooting**
   - [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

3. **Abra uma issue**
   - https://github.com/CarlosHonorato70/blackbelt-platform/issues

## ✅ Checklist de Configuração Completa

Após executar o script, verifique:

- [ ] Todos os secrets foram criados com sucesso
- [ ] Conexão SSH com o servidor funciona
- [ ] Docker login funciona (GHCR ou Docker Hub)
- [ ] Workflow de CI/CD executa sem erros de autenticação
- [ ] Health checks passam após deploy
- [ ] Notificações Slack funcionam (se configurado)
- [ ] Documentação está atualizada com suas informações

## 🎉 Próximos Passos

Agora que seus secrets estão configurados:

1. **Execute um deploy de teste**
   ```bash
   # Trigger manual workflow
   gh workflow run deploy-production.yml
   ```

2. **Configure o servidor de produção**
   - Siga o [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

3. **Configure monitoramento**
   - Logs
   - Métricas
   - Alertas

4. **Documente seu ambiente**
   - IPs dos servidores
   - Usuários configurados
   - Chaves SSH utilizadas

---

**Configuração automatizada = Deploy mais rápido e seguro! 🚀**
