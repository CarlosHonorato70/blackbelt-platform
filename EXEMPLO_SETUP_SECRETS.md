# 🔐 Exemplo de Uso do Script de Configuração de Secrets

Este arquivo demonstra como usar o script `setup-github-secrets.sh` para configurar automaticamente os secrets do GitHub.

## 🎬 Demonstração Passo a Passo

### 1. Executar o Script

```bash
./setup-github-secrets.sh
```

### 2. Saída Esperada

```
═══════════════════════════════════════════════════════════════
  🔐 Configuração Automática de Secrets do GitHub
═══════════════════════════════════════════════════════════════

Este script irá configurar todos os secrets necessários para CI/CD
da plataforma BlackBelt automaticamente.

ℹ Verificando pré-requisitos...
✓ GitHub CLI encontrado: gh version 2.83.1 (2025-11-13)
✓ Autenticado no GitHub CLI
✓ Repositório detectado: CarlosHonorato70/blackbelt-platform

Deseja continuar com a configuração de secrets? (s/n): s

═══════════════════════════════════════════════════════════════
  1. Configuração do Registro de Containers
═══════════════════════════════════════════════════════════════

Escolha o serviço de registro de containers:
  1) GitHub Container Registry (GHCR) - Recomendado para GitHub
  2) Docker Hub

Escolha uma opção (1 ou 2): 1

ℹ Configurando GitHub Container Registry (GHCR)...

Para criar um Personal Access Token (PAT):
  1. Acesse: https://github.com/settings/tokens/new
  2. Note: 'github-actions-blackbelt'
  3. Expiration: 90 days (ou conforme necessário)
  4. Scopes: Marque 'write:packages' e 'read:packages'
  5. Clique em 'Generate token'
  6. Copie o token gerado

Cole seu GitHub Personal Access Token (PAT) []: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

✓ Secret criado/atualizado: GHCR_TOKEN
✓ Secret criado/atualizado: DOCKER_USERNAME
✓ Secret criado/atualizado: DOCKER_PASSWORD
✓ GHCR configurado com sucesso!

═══════════════════════════════════════════════════════════════
  2. Configuração do Servidor de Deploy
═══════════════════════════════════════════════════════════════

IP ou domínio do servidor []: 192.168.1.100
Usuário SSH no servidor [deploy]: deploy
Porta SSH [22]: 22
Caminho do deploy no servidor [/home/deploy/blackbelt]: /home/deploy/blackbelt

✓ Secret criado/atualizado: SSH_HOST
✓ Secret criado/atualizado: SSH_USER
✓ Secret criado/atualizado: SSH_PORT
✓ Secret criado/atualizado: DEPLOY_PATH
✓ Secret criado/atualizado: SERVER_HOST
✓ Secret criado/atualizado: SERVER_USER

═══════════════════════════════════════════════════════════════
  3. Configuração da Chave SSH
═══════════════════════════════════════════════════════════════

Escolha como configurar a chave SSH:
  1) Gerar nova chave SSH (recomendado)
  2) Usar chave SSH existente

Escolha uma opção (1 ou 2): 1

ℹ Gerando nova chave SSH: /home/usuario/.ssh/blackbelt_deploy_key
✓ Chave SSH gerada com sucesso!

═══════════════════════════════════════════════════════════════
  IMPORTANTE: Adicione esta chave pública no servidor deploy
═══════════════════════════════════════════════════════════════

Copie o conteúdo abaixo:
─────────────────────────────────────────────────────────────
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx github-actions-blackbelt
─────────────────────────────────────────────────────────────

Execute no servidor deploy:
  mkdir -p ~/.ssh
  echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx github-actions-blackbelt" >> ~/.ssh/authorized_keys
  chmod 700 ~/.ssh
  chmod 600 ~/.ssh/authorized_keys

Pressione Enter após adicionar a chave pública no servidor...

✓ Secret criado/atualizado: SSH_PRIVATE_KEY

═══════════════════════════════════════════════════════════════
  4. Configuração Adicional (Opcional)
═══════════════════════════════════════════════════════════════

Deseja configurar URL de produção? (s/n): s
URL de produção (ex: blackbelt.com) []: blackbelt.com
✓ Secret criado/atualizado: PRODUCTION_URL

Deseja configurar Slack webhook para notificações? (s/n): n

═══════════════════════════════════════════════════════════════
  ✅ Configuração Concluída!
═══════════════════════════════════════════════════════════════

Secrets configurados no repositório: CarlosHonorato70/blackbelt-platform

Para verificar os secrets criados, execute:
  gh secret list -R CarlosHonorato70/blackbelt-platform

Ou visite:
  https://github.com/CarlosHonorato70/blackbelt-platform/settings/secrets/actions

ℹ Próximos passos:
  1. Verifique se todos os secrets foram criados corretamente
  2. Teste a conexão SSH com o servidor
  3. Execute um workflow manual para validar a configuração
  4. Consulte GUIA_CONFIGURACAO_SECRETS_GITHUB.md para mais detalhes

Deseja testar a conexão SSH com o servidor agora? (s/n): s

ℹ Testando conexão SSH...
✓ Conexão SSH funcionando corretamente!

✓ Script finalizado com sucesso! 🎉
```

## 📋 Secrets Configurados

Após a execução bem-sucedida, os seguintes secrets estarão disponíveis:

```bash
$ gh secret list -R CarlosHonorato70/blackbelt-platform

DEPLOY_PATH          Updated 2025-12-08
DOCKER_PASSWORD      Updated 2025-12-08
DOCKER_USERNAME      Updated 2025-12-08
GHCR_TOKEN           Updated 2025-12-08
PRODUCTION_URL       Updated 2025-12-08
SERVER_HOST          Updated 2025-12-08
SERVER_USER          Updated 2025-12-08
SSH_HOST             Updated 2025-12-08
SSH_PORT             Updated 2025-12-08
SSH_PRIVATE_KEY      Updated 2025-12-08
SSH_USER             Updated 2025-12-08
```

## 🧪 Verificar Configuração

### 1. Verificar Secrets via CLI

```bash
gh secret list -R CarlosHonorato70/blackbelt-platform
```

### 2. Verificar via Web

Acesse: https://github.com/CarlosHonorato70/blackbelt-platform/settings/secrets/actions

### 3. Testar Conexão SSH

```bash
ssh -i ~/.ssh/blackbelt_deploy_key deploy@192.168.1.100
```

### 4. Executar Workflow de Teste

```bash
gh workflow run deploy-production.yml -R CarlosHonorato70/blackbelt-platform
```

## ❓ Perguntas Frequentes

### O script pode atualizar secrets existentes?

Sim! Se um secret já existir, ele será atualizado com o novo valor.

### Posso executar o script múltiplas vezes?

Sim, o script é idempotente. Você pode executá-lo quantas vezes quiser.

### Como revogar os secrets?

```bash
# Deletar um secret específico
gh secret delete SECRET_NAME -R CarlosHonorato70/blackbelt-platform

# Ou via interface web
# Settings → Secrets → Actions → [Nome do Secret] → Delete
```

### O script funciona em Windows?

Sim, desde que você tenha:
- Git Bash instalado
- GitHub CLI instalado
- OpenSSH instalado

### Preciso ser administrador do repositório?

Sim, você precisa ter permissões de **write** ou **admin** no repositório.

## 🔐 Segurança

- ✅ Secrets são armazenados criptografados no GitHub
- ✅ Secrets nunca são exibidos em logs ou output de workflows
- ✅ O script não envia dados para nenhum servidor externo
- ✅ Tokens e chaves são tratados como dados sensíveis
- ✅ Use tokens com escopo mínimo necessário

## 📚 Documentação Relacionada

- [GUIA_SETUP_AUTOMATICO_SECRETS.md](./GUIA_SETUP_AUTOMATICO_SECRETS.md) - Guia completo
- [GUIA_CONFIGURACAO_SECRETS_GITHUB.md](./GUIA_CONFIGURACAO_SECRETS_GITHUB.md) - Guia manual
- [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) - Deploy em produção
- [GitHub Actions Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## 🎯 Próximos Passos

1. ✅ Execute o script: `./setup-github-secrets.sh`
2. ✅ Verifique os secrets criados
3. ✅ Teste a conexão SSH
4. ✅ Execute um workflow de teste
5. ✅ Configure seu servidor de produção
6. ✅ Faça seu primeiro deploy!

---

**Configuração automática = Deploy sem complicações! 🚀**
