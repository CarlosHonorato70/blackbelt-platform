# 🔐 Guia Detalhado - Configurar 10 Secrets no GitHub

## 📌 Objetivo

Configurar todas as 10 secrets necessárias no GitHub para que os workflows de CI/CD funcionem corretamente, com foco especial em credenciais Docker e chaves SSH.

---

## 🎯 Visão Geral das 10 Secrets

| # | Secret | Tipo | Prioridade | Complexidade |
|---|--------|------|-----------|--------------|
| 1 | DOCKER_USERNAME | Credencial | Alta | Baixa |
| 2 | DOCKER_PASSWORD | Credencial | Alta | Baixa |
| 3 | STAGING_HOST | Servidor | Alta | Baixa |
| 4 | STAGING_USER | Servidor | Alta | Baixa |
| 5 | STAGING_SSH_KEY | SSH | Alta | **Alta** |
| 6 | PROD_HOST | Servidor | Alta | Baixa |
| 7 | PROD_USER | Servidor | Alta | Baixa |
| 8 | PROD_SSH_KEY | SSH | Alta | **Alta** |
| 9 | SONAR_TOKEN | Token | Média | Média |
| 10 | SLACK_WEBHOOK | Webhook | Média | Baixa |

---

## 🚀 Passo 1: Acessar Settings do Repositório

### Via GitHub Web

1. Acesse seu repositório: https://github.com/CarlosHonorato70/blackbelt-platform
2. Clique em **Settings** (engrenagem no canto superior direito)
3. No menu lateral, clique em **Secrets and variables** → **Actions**

### Resultado Esperado

Você verá a página de Secrets com:
- Botão "New repository secret" (verde)
- Lista vazia (se primeira vez)
- Aba "Repository secrets" selecionada

---

## 📋 Secret 1 & 2: Credenciais Docker

### O que é?

Credenciais para fazer login no Docker Hub e fazer push de imagens.

### Passo 1.1: Criar Conta Docker Hub (se não tiver)

1. Acesse https://hub.docker.com
2. Clique em **Sign Up**
3. Preencha:
   - Email
   - Username (ex: `seu-username`)
   - Password (forte e segura)
4. Confirme email
5. Faça login

### Passo 1.2: Gerar Token de Acesso (Recomendado)

**Por que token?** Mais seguro que usar senha diretamente.

1. Faça login em https://hub.docker.com
2. Clique no seu avatar (canto superior direito)
3. Clique em **Account Settings**
4. No menu lateral, clique em **Security**
5. Clique em **New Access Token**
6. Preencha:
   - Token name: `github-actions-blackbelt`
   - Access permissions: Selecione **Read & Write**
7. Clique em **Generate**
8. **COPIE O TOKEN** (não será mostrado novamente!)

### Passo 1.3: Adicionar DOCKER_USERNAME no GitHub

1. Na página de Secrets do GitHub, clique em **New repository secret**
2. Preencha:
   - **Name:** `DOCKER_USERNAME`
   - **Value:** Seu username do Docker Hub (ex: `carloshonorato`)
3. Clique em **Add secret**

### Passo 1.4: Adicionar DOCKER_PASSWORD no GitHub

1. Clique em **New repository secret**
2. Preencha:
   - **Name:** `DOCKER_PASSWORD`
   - **Value:** Cole o token gerado no Passo 1.2
3. Clique em **Add secret**

### Validação

```bash
# Teste localmente
docker login -u seu-username

# Quando pedir senha, cole o token
# Se funcionar, está correto!
```

---

## 🖥️ Secrets 3 & 4: Servidor Staging

### O que é?

Informações para conectar ao servidor de staging via SSH.

### Passo 2.1: Obter IP/Domínio do Servidor Staging

**Opção A: Servidor já existe**
```bash
# Pergunte ao seu provedor de hosting
# Exemplo: 192.168.1.100 ou staging.blackbelt.com
```

**Opção B: Criar servidor (AWS, DigitalOcean, etc)**

**DigitalOcean:**
1. Acesse https://cloud.digitalocean.com
2. Clique em **Create** → **Droplets**
3. Selecione:
   - Image: Ubuntu 22.04
   - Size: Basic ($6/mês)
   - Region: Mais próxima
4. Clique em **Create Droplet**
5. Copie o IP fornecido

### Passo 2.2: Adicionar STAGING_HOST no GitHub

1. Clique em **New repository secret**
2. Preencha:
   - **Name:** `STAGING_HOST`
   - **Value:** IP ou domínio (ex: `192.168.1.100` ou `staging.blackbelt.com`)
3. Clique em **Add secret**

### Passo 2.3: Adicionar STAGING_USER no GitHub

1. Clique em **New repository secret**
2. Preencha:
   - **Name:** `STAGING_USER`
   - **Value:** Usuário SSH (geralmente `root` ou `ubuntu`)
3. Clique em **Add secret**

### Validação

```bash
# Teste conexão SSH localmente
ssh -i sua-chave.pem root@192.168.1.100

# Se conectar, está correto!
```

---

## 🔑 Secret 5: Chave SSH Staging (IMPORTANTE!)

### O que é?

Chave privada SSH para autenticar no servidor staging sem pedir senha.

### Passo 3.1: Gerar Chave SSH (se não tiver)

**No Windows (Git Bash):**

```bash
# 1. Abra Git Bash
# 2. Execute:
ssh-keygen -t rsa -b 4096 -f ~/.ssh/staging_key -N ""

# Resultado:
# Generating public/private rsa key pair.
# Your identification has been saved in /c/Users/seu-usuario/.ssh/staging_key
# Your public key has been saved in /c/Users/seu-usuario/.ssh/staging_key.pub
```

**No Windows (PowerShell):**

```powershell
# 1. Abra PowerShell como Admin
# 2. Execute:
ssh-keygen -t rsa -b 4096 -f $env:USERPROFILE\.ssh\staging_key -N ""
```

**No Linux/Mac:**

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/staging_key -N ""
```

### Passo 3.2: Copiar Chave Privada

**No Windows (Git Bash):**

```bash
# 1. Abra a chave privada
cat ~/.ssh/staging_key

# 2. Copie TODO o conteúdo (incluindo BEGIN e END)
# Resultado:
# -----BEGIN RSA PRIVATE KEY-----
# MIIEpAIBAAKCAQEA...
# ...
# -----END RSA PRIVATE KEY-----
```

**No Windows (PowerShell):**

```powershell
Get-Content $env:USERPROFILE\.ssh\staging_key
```

### Passo 3.3: Adicionar STAGING_SSH_KEY no GitHub

1. Clique em **New repository secret**
2. Preencha:
   - **Name:** `STAGING_SSH_KEY`
   - **Value:** Cole TODO o conteúdo da chave privada (incluindo BEGIN e END)
3. Clique em **Add secret**

### Passo 3.4: Adicionar Chave Pública no Servidor Staging

**No servidor staging (via SSH ou console):**

```bash
# 1. Crie pasta .ssh se não existir
mkdir -p ~/.ssh

# 2. Adicione a chave pública
echo "sua-chave-publica-aqui" >> ~/.ssh/authorized_keys

# 3. Configure permissões
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**Ou via SCP:**

```bash
# No seu computador
scp ~/.ssh/staging_key.pub root@192.168.1.100:~/staging_key.pub

# No servidor
cat ~/staging_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Validação

```bash
# Teste SSH com chave privada
ssh -i ~/.ssh/staging_key root@192.168.1.100

# Se conectar sem pedir senha, está correto!
```

---

## 🌍 Secrets 6, 7 & 8: Servidor Production

### O que é?

Informações para conectar ao servidor de production via SSH.

### Passo 4.1: Preparar Servidor Production

Repita os mesmos passos do Staging:

1. Obtenha IP/domínio do servidor
2. Gere nova chave SSH (ex: `production_key`)
3. Configure servidor com chave pública

### Passo 4.2: Adicionar PROD_HOST no GitHub

1. Clique em **New repository secret**
2. Preencha:
   - **Name:** `PROD_HOST`
   - **Value:** IP ou domínio production (ex: `blackbelt-consultoria.com`)
3. Clique em **Add secret**

### Passo 4.3: Adicionar PROD_USER no GitHub

1. Clique em **New repository secret**
2. Preencha:
   - **Name:** `PROD_USER`
   - **Value:** Usuário SSH production (geralmente `root` ou `ubuntu`)
3. Clique em **Add secret**

### Passo 4.4: Adicionar PROD_SSH_KEY no GitHub

1. Clique em **New repository secret**
2. Preencha:
   - **Name:** `PROD_SSH_KEY`
   - **Value:** Cole TODO o conteúdo da chave privada production
3. Clique em **Add secret**

### ⚠️ Segurança Production

**IMPORTANTE:**
- Use chave SSH diferente para production
- Restrinja acesso SSH apenas a IPs conhecidos
- Use firewall para bloquear portas desnecessárias
- Considere usar 2FA no servidor

---

## 🔍 Secret 9: SonarQube Token

### O que é?

Token para análise estática de código (SAST) no SonarQube.

### Passo 5.1: Criar Conta SonarCloud (Gratuito)

1. Acesse https://sonarcloud.io
2. Clique em **Log in**
3. Clique em **GitHub** (login com GitHub)
4. Autorize SonarCloud
5. Selecione seu repositório

### Passo 5.2: Gerar Token

1. Acesse https://sonarcloud.io/account/security
2. Clique em **Generate Tokens**
3. Preencha:
   - Token name: `github-actions-blackbelt`
   - Type: `Global Analysis Token`
4. Clique em **Generate**
5. **COPIE O TOKEN**

### Passo 5.3: Adicionar SONAR_TOKEN no GitHub

1. Clique em **New repository secret**
2. Preencha:
   - **Name:** `SONAR_TOKEN`
   - **Value:** Cole o token gerado
3. Clique em **Add secret**

---

## 💬 Secret 10: Slack Webhook

### O que é?

URL para enviar notificações de deploy para canal Slack.

### Passo 6.1: Criar Workspace Slack (se não tiver)

1. Acesse https://slack.com
2. Clique em **Create a new workspace**
3. Preencha informações
4. Crie um canal (ex: `#deployments`)

### Passo 6.2: Criar Webhook

1. Acesse https://api.slack.com/apps
2. Clique em **Create New App**
3. Selecione **From scratch**
4. Preencha:
   - App name: `BlackBelt Deployments`
   - Workspace: Seu workspace
5. Clique em **Create App**

### Passo 6.3: Ativar Incoming Webhooks

1. No menu lateral, clique em **Incoming Webhooks**
2. Ative o toggle **On**
3. Clique em **Add New Webhook to Workspace**
4. Selecione o canal (ex: `#deployments`)
5. Clique em **Allow**

### Passo 6.4: Copiar Webhook URL

1. Você verá a URL gerada (ex: `https://hooks.slack.com/services/T...`)
2. **COPIE A URL COMPLETA**

### Passo 6.5: Adicionar SLACK_WEBHOOK no GitHub

1. Clique em **New repository secret**
2. Preencha:
   - **Name:** `SLACK_WEBHOOK`
   - **Value:** Cole a URL completa do webhook
3. Clique em **Add secret**

### Validação

```bash
# Teste webhook localmente
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Teste do webhook"}' \
  https://hooks.slack.com/services/T.../B.../X...

# Se mensagem aparecer no Slack, está correto!
```

---

## 📊 Checklist de Configuração

- [ ] Secret 1: DOCKER_USERNAME ✅
- [ ] Secret 2: DOCKER_PASSWORD ✅
- [ ] Secret 3: STAGING_HOST ✅
- [ ] Secret 4: STAGING_USER ✅
- [ ] Secret 5: STAGING_SSH_KEY ✅
- [ ] Secret 6: PROD_HOST ✅
- [ ] Secret 7: PROD_USER ✅
- [ ] Secret 8: PROD_SSH_KEY ✅
- [ ] Secret 9: SONAR_TOKEN ✅
- [ ] Secret 10: SLACK_WEBHOOK ✅

---

## 🧪 Teste de Validação

### Teste 1: Verificar Secrets no GitHub

1. Acesse Settings → Secrets
2. Verifique que todas as 10 secrets estão listadas
3. Clique em cada uma para confirmar (não mostra valor)

### Teste 2: Executar Workflow

1. Acesse seu repositório
2. Clique em **Actions**
3. Selecione um workflow (ex: CI)
4. Clique em **Run workflow**
5. Verifique se executa sem erros de autenticação

### Teste 3: Verificar Logs

Se houver erro:

1. Clique no workflow que falhou
2. Clique no job
3. Expanda os passos
4. Procure por mensagens de erro (ex: "Access denied")

---

## 🚨 Troubleshooting

### Erro: "Permission denied (publickey)"

**Causa:** Chave SSH não está correta ou não foi adicionada ao servidor.

**Solução:**
```bash
# 1. Verifique se chave privada está correta
cat ~/.ssh/staging_key | wc -l
# Deve ter 25+ linhas

# 2. Verifique se chave pública está no servidor
ssh -i ~/.ssh/staging_key root@192.168.1.100 "cat ~/.ssh/authorized_keys"

# 3. Se não aparecer, adicione novamente
cat ~/.ssh/staging_key.pub | ssh -i ~/.ssh/staging_key root@192.168.1.100 "cat >> ~/.ssh/authorized_keys"
```

### Erro: "Docker login failed"

**Causa:** Credenciais Docker incorretas.

**Solução:**
```bash
# 1. Teste localmente
docker login -u seu-username

# 2. Se funcionar, credenciais estão corretas
# 3. Se não, regenere token no Docker Hub
```

### Erro: "Webhook URL invalid"

**Causa:** URL do Slack webhook incorreta ou expirada.

**Solução:**
```bash
# 1. Regenere webhook no Slack
# 2. Copie URL completa (incluindo https://)
# 3. Atualize secret no GitHub
```

### Erro: "SonarQube token expired"

**Causa:** Token expirou.

**Solução:**
```bash
# 1. Acesse https://sonarcloud.io/account/security
# 2. Gere novo token
# 3. Atualize secret no GitHub
```

---

## 🔒 Boas Práticas de Segurança

1. **Nunca compartilhe secrets** - Nem em chat, email ou repositório
2. **Use tokens em vez de senhas** - Mais seguros e revogáveis
3. **Rotação de secrets** - Altere periodicamente (a cada 3 meses)
4. **Chaves SSH diferentes** - Use chave diferente para staging e production
5. **Firewall** - Restrinja acesso SSH apenas a IPs conhecidos
6. **Monitoramento** - Monitore tentativas de login falhadas
7. **Backup de chaves** - Guarde cópia segura das chaves SSH
8. **Revogar acesso** - Remova secrets quando não precisar mais

---

## 📋 Resumo das 10 Secrets

| # | Nome | Valor | Onde Obter |
|---|------|-------|-----------|
| 1 | DOCKER_USERNAME | Username Docker Hub | https://hub.docker.com |
| 2 | DOCKER_PASSWORD | Token Docker Hub | https://hub.docker.com/settings/security |
| 3 | STAGING_HOST | IP/domínio staging | Seu provedor hosting |
| 4 | STAGING_USER | Usuário SSH | `root` ou `ubuntu` |
| 5 | STAGING_SSH_KEY | Chave privada | `ssh-keygen` |
| 6 | PROD_HOST | IP/domínio production | Seu provedor hosting |
| 7 | PROD_USER | Usuário SSH | `root` ou `ubuntu` |
| 8 | PROD_SSH_KEY | Chave privada | `ssh-keygen` |
| 9 | SONAR_TOKEN | Token SonarCloud | https://sonarcloud.io/account/security |
| 10 | SLACK_WEBHOOK | URL webhook | https://api.slack.com/apps |

---

## ✅ Próximas Etapas

1. **Configurar todas as 10 secrets** - Siga este guia
2. **Testar workflows** - Execute um workflow manual
3. **Monitorar logs** - Verifique se tudo funciona
4. **Documentar** - Guarde informações de acesso em local seguro
5. **Treinar equipe** - Ensine como usar CI/CD

---

**Todas as 10 secrets configuradas = CI/CD 100% funcional! 🚀**
