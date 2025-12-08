# 🎓 Guia Passo a Passo para Iniciantes - Configuração de Secrets

## 📌 O Que Você Vai Fazer?

Você vai configurar automaticamente os "secrets" (segredos) do GitHub que são necessários para fazer deploy (publicação) automático da sua aplicação. Pense nos secrets como senhas e chaves de acesso que o GitHub Actions precisa para:
- Publicar imagens Docker
- Conectar no seu servidor
- Fazer deploy da aplicação

## 🖥️ Onde Executar os Comandos?

**SIM, você vai usar o Git Bash!** (ou Terminal no Mac/Linux)

### No Windows:
1. Clique com botão direito na pasta do projeto
2. Selecione **"Git Bash Here"**
3. Uma janela preta com texto vai abrir - é ali que você vai colar os comandos

### No Mac/Linux:
1. Abra o **Terminal**
2. Navegue até a pasta do projeto com `cd caminho/para/blackbelt-platform`

## 🚀 Passo a Passo Completo

### ✅ Passo 1: Instalar o GitHub CLI

O script precisa do GitHub CLI (gh) instalado.

#### Windows:

**Opção A: Usar winget (Recomendado)**
```bash
# Cole este comando no PowerShell (não no Git Bash ainda)
winget install --id GitHub.cli
```

**Opção B: Baixar instalador**
1. Acesse: https://cli.github.com/
2. Clique em "Download for Windows"
3. Execute o instalador
4. Siga as instruções na tela

Depois de instalar, **feche e abra novamente o Git Bash** para o comando `gh` funcionar.

#### Mac:
```bash
# Cole este comando no Terminal
brew install gh
```

#### Linux:
```bash
# Cole estes comandos um por vez no Terminal
sudo apt update
sudo apt install gh -y
```

### ✅ Passo 2: Fazer Login no GitHub CLI

Agora você precisa conectar o GitHub CLI com sua conta do GitHub.

**No Git Bash (Windows) ou Terminal (Mac/Linux), cole:**
```bash
gh auth login
```

**O que vai acontecer:**
1. Pergunta: `What account do you want to log into?`
   - Escolha: **GitHub.com** (pressione Enter)

2. Pergunta: `What is your preferred protocol for Git operations?`
   - Escolha: **HTTPS** (pressione Enter)

3. Pergunta: `Authenticate Git with your GitHub credentials?`
   - Digite: **Y** e pressione Enter

4. Pergunta: `How would you like to authenticate GitHub CLI?`
   - Escolha: **Login with a web browser** (recomendado)
   - Pressione Enter

5. Um código vai aparecer (ex: `1234-5678`)
   - **COPIE ESTE CÓDIGO**
   - Pressione Enter para abrir o navegador
   - Cole o código na página que abrir
   - Clique em "Authorize"

✓ Pronto! Você está conectado!

### ✅ Passo 3: Clonar o Repositório (se ainda não clonou)

Se você já tem a pasta do projeto no seu computador, **pule este passo**.

Se não tem, cole este comando:
```bash
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform
```

### ✅ Passo 4: Executar o Script de Configuração

Agora vem a parte principal! O script vai te guiar por todas as configurações.

**Cole este comando no Git Bash:**
```bash
./setup-github-secrets.sh
```

**Se der erro "Permission denied":**
```bash
# Torne o script executável primeiro
chmod +x setup-github-secrets.sh

# Depois execute novamente
./setup-github-secrets.sh
```

### ✅ Passo 5: Responder as Perguntas do Script

O script vai fazer várias perguntas. Vou explicar cada uma:

#### 5.1. Confirmar Execução
```
Deseja continuar com a configuração de secrets? (s/n):
```
**Digite:** `s` e pressione Enter

#### 5.2. Escolher Registro de Containers
```
Escolha o serviço de registro de containers:
  1) GitHub Container Registry (GHCR) - Recomendado para GitHub
  2) Docker Hub

Escolha uma opção (1 ou 2):
```
**Digite:** `1` (GHCR é recomendado) e pressione Enter

#### 5.3. Token do GitHub (IMPORTANTE!)

O script vai mostrar instruções para criar um token. **Siga exatamente:**

1. **Abra seu navegador** e vá em: https://github.com/settings/tokens/new

2. **Preencha o formulário:**
   - **Note (nome do token):** `github-actions-blackbelt`
   - **Expiration:** Selecione `90 days` ou `No expiration`
   - **Select scopes:** Marque estas caixinhas:
     - ☑️ `write:packages`
     - ☑️ `read:packages`
     - ☑️ `delete:packages` (opcional)

3. **Clique no botão verde:** "Generate token" (no final da página)

4. **IMPORTANTE:** Um token vai aparecer (começa com `ghp_...`)
   - **COPIE ESTE TOKEN AGORA!** Ele não será mostrado novamente!
   - Exemplo: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

5. **Volte para o Git Bash** e cole o token quando pedir:
```
Cole seu GitHub Personal Access Token (PAT) []:
```
**Cole o token** (não vai aparecer na tela por segurança) e pressione Enter

#### 5.4. Informações do Servidor

Agora você precisa informar onde sua aplicação vai rodar:

```
IP ou domínio do servidor []:
```
**Digite:** O IP ou domínio do seu servidor
- Exemplo: `192.168.1.100` ou `servidor.seudominio.com`
- Se não tiver ainda, pode usar qualquer IP temporário (você pode mudar depois)

```
Usuário SSH no servidor [deploy]:
```
**Digite:** O nome do usuário no servidor
- Geralmente é `deploy`, `ubuntu`, ou `root`
- Se não souber, deixe `deploy` (pressione Enter)

```
Porta SSH [22]:
```
**Digite:** Apenas pressione Enter (a porta padrão 22 é a mais comum)

```
Caminho do deploy no servidor [/home/deploy/blackbelt]:
```
**Digite:** Onde a aplicação vai ficar no servidor
- Pode deixar o padrão (pressione Enter)
- Ou digitar outro caminho como `/opt/blackbelt`

#### 5.5. Chave SSH

```
Escolha como configurar a chave SSH:
  1) Gerar nova chave SSH (recomendado)
  2) Usar chave SSH existente

Escolha uma opção (1 ou 2):
```
**Digite:** `1` (recomendado) e pressione Enter

**O script vai:**
1. Gerar uma chave SSH automaticamente
2. Mostrar a chave pública na tela
3. Pedir para você adicionar no servidor

**IMPORTANTE:** Quando a chave pública aparecer:
```
─────────────────────────────────────────────────────────────
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx github-actions-blackbelt
─────────────────────────────────────────────────────────────
```

**COPIE TODA ESTA LINHA** e adicione no seu servidor:

**Se você tem acesso SSH ao servidor:**
1. Abra outra janela do Git Bash
2. Conecte no servidor: `ssh usuario@ip-do-servidor`
3. Cole estes comandos:
```bash
mkdir -p ~/.ssh
echo "COLE-A-CHAVE-PUBLICA-AQUI" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**Se você usa painel de controle (cPanel, etc):**
1. Procure por "SSH Keys" ou "Chaves SSH"
2. Cole a chave pública lá

**Depois de adicionar no servidor**, volte para o Git Bash original e pressione Enter

#### 5.6. Configurações Opcionais

```
Deseja configurar URL de produção? (s/n):
```
- Digite `s` se você tem um domínio (ex: `meusistema.com`)
- Digite `n` se não tiver ainda

```
Deseja configurar Slack webhook para notificações? (s/n):
```
- Digite `s` se você usa Slack e quer notificações
- Digite `n` se não usar (recomendado para começar)

#### 5.7. Teste de Conexão SSH

```
Deseja testar a conexão SSH com o servidor agora? (s/n):
```
**Digite:** `s` e pressione Enter

Se der erro, não se preocupe! Você pode testar depois manualmente.

### ✅ Passo 6: Verificar se Funcionou

Depois que o script terminar, você pode verificar se os secrets foram criados:

**Cole no Git Bash:**
```bash
gh secret list
```

**Você deve ver algo assim:**
```
DEPLOY_PATH          Updated 2025-12-08
DOCKER_PASSWORD      Updated 2025-12-08
DOCKER_USERNAME      Updated 2025-12-08
GHCR_TOKEN           Updated 2025-12-08
SERVER_HOST          Updated 2025-12-08
SERVER_USER          Updated 2025-12-08
SSH_HOST             Updated 2025-12-08
SSH_PORT             Updated 2025-12-08
SSH_PRIVATE_KEY      Updated 2025-12-08
SSH_USER             Updated 2025-12-08
```

✅ **Se você ver esta lista, está tudo certo!**

### ✅ Passo 7: Verificar no GitHub (Opcional)

Você também pode ver os secrets na interface do GitHub:

1. Acesse: https://github.com/CarlosHonorato70/blackbelt-platform
2. Clique em **Settings** (no topo)
3. No menu lateral esquerdo: **Secrets and variables** → **Actions**
4. Você verá todos os secrets listados

## 🎯 Resumo do Que Você Fez

1. ✅ Instalou o GitHub CLI
2. ✅ Fez login na sua conta GitHub
3. ✅ Executou o script `setup-github-secrets.sh` no Git Bash
4. ✅ Criou um token de acesso no GitHub
5. ✅ Configurou informações do servidor
6. ✅ Gerou e configurou chaves SSH
7. ✅ Todos os secrets foram criados automaticamente no GitHub

## ❓ Perguntas Frequentes

### Preciso colar os comandos um por um?

**SIM!** Cole um comando por vez no Git Bash, espere ele terminar, veja o resultado, depois cole o próximo.

### Os comandos funcionam no CMD ou PowerShell?

O script `setup-github-secrets.sh` **funciona melhor no Git Bash**. Para instalar o GitHub CLI, use o PowerShell ou CMD.

### E se eu errar alguma informação?

Sem problemas! Você pode executar o script novamente com `./setup-github-secrets.sh` e ele vai atualizar os valores.

### Posso pular alguma etapa?

Não recomendo. Todas as etapas são necessárias para o CI/CD funcionar corretamente.

### O que fazer se der erro "gh: command not found"?

Significa que o GitHub CLI não está instalado ou não está no PATH. Feche e abra o Git Bash novamente depois de instalar.

### Meu token parou de funcionar

Tokens têm validade. Se expirar, gere um novo em https://github.com/settings/tokens e execute o script novamente.

## 🆘 Precisa de Ajuda?

Se algo não funcionar:

1. **Leia a mensagem de erro** que apareceu
2. **Consulte a documentação completa:** [GUIA_SETUP_AUTOMATICO_SECRETS.md](./GUIA_SETUP_AUTOMATICO_SECRETS.md)
3. **Veja exemplos detalhados:** [EXEMPLO_SETUP_SECRETS.md](./EXEMPLO_SETUP_SECRETS.md)
4. **Abra uma issue** no GitHub explicando o erro

## ✅ Pronto!

Agora seu repositório está configurado para fazer deploys automáticos! 🎉

Quando você fizer um commit na branch `main`, o GitHub Actions vai:
1. Construir a imagem Docker
2. Publicar no registry
3. Fazer deploy no servidor automaticamente

---

**Criado para facilitar sua vida! Se este guia ajudou, deixe um ⭐ no repositório!**
