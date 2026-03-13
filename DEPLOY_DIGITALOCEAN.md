# Deploy BlackBelt Platform — Guia Completo

DigitalOcean + Cloudflare + Docker. Tempo: ~20 minutos.

---

## PASSO 1: Criar Droplet na DigitalOcean

### 1.1 Acessar o painel

1. Abra o navegador e va em **https://cloud.digitalocean.com**
2. Faca login com sua conta

### 1.2 Criar o Droplet

1. No topo da pagina, clique no botao verde **"Create"**
2. No menu dropdown, clique em **"Droplets"**

### 1.3 Escolher regiao

- Na secao **"Choose a region"**, clique em **"São Paulo"** (bandeira do Brasil, codigo `SFO3`)
- Se Sao Paulo nao estiver disponivel, escolha **"New York"** (NYC1)
- A regiao mais proxima do Brasil = menor latencia para seus usuarios

### 1.4 Escolher imagem

- Na secao **"Choose an image"**, a aba **"OS"** ja vem selecionada
- Clique em **"Ubuntu"**
- No dropdown de versao, selecione **"24.04 (LTS) x64"**

### 1.5 Escolher tamanho

- Na secao **"Choose Size"**:
  - Tipo: **"Basic"** (ja vem selecionado)
  - CPU options: **"Regular"** (Intel/AMD, nao Premium)
  - Scroll ate encontrar o plano de **$6/mo**:
    ```
    $6/mo    $0.009/hr    1 vCPU    1 GB RAM    25 GB SSD    1 TB transfer
    ```
  - Clique nele para selecionar

### 1.6 Escolher autenticacao

Voce tem 2 opcoes:

**Opcao A — Senha (mais facil):**
- Clique em **"Password"**
- Digite uma senha forte (minimo 8 chars, com maiuscula e numero)
- **Anote essa senha** — voce vai precisar para conectar via SSH

**Opcao B — SSH Key (mais seguro):**
- Clique em **"SSH Key"**
- Se voce ja tem uma chave cadastrada, selecione-a
- Se nao tem, clique em **"New SSH Key"** e siga:
  1. No PowerShell do seu PC, rode: `cat ~/.ssh/id_rsa.pub`
  2. Se nao existir, gere uma: `ssh-keygen -t rsa -b 4096` (Enter em tudo)
  3. Copie o conteudo que aparece (comeca com `ssh-rsa ...`)
  4. Cole no campo do DigitalOcean e clique **"Add SSH Key"**

### 1.7 Configurar hostname

- Na secao **"Choose a hostname"**, apague o nome gerado e digite:
  ```
  blackbelt-platform
  ```

### 1.8 Opcoes extras (opcional)

- **Backups ($1.20/mo):** Recomendado ativar — faz snapshot semanal do servidor inteiro
- **Monitoring:** Pode ativar (gratis) — mostra graficos de CPU/RAM no painel

### 1.9 Criar

1. Clique no botao verde **"Create Droplet"** no final da pagina
2. Aguarde ~60 segundos enquanto o servidor e criado
3. Quando terminar, voce vera o Droplet na lista com um **endereco IP** (ex: `164.90.152.37`)
4. **Copie esse IP** — voce vai usar em todos os proximos passos

---

## PASSO 2: Configurar DNS no Cloudflare

### 2.1 Acessar o Cloudflare

1. Abra **https://dash.cloudflare.com**
2. Faca login
3. Na lista de sites, clique em **"blackbeltconsultoria.com.br"**

### 2.2 Ir para DNS

1. No menu lateral esquerdo, clique em **"DNS"**
2. Clique em **"Records"** (submenu)

### 2.3 Verificar registros existentes

Voce vai ver uma lista de registros DNS. Procure por:
- Registros do tipo **A** apontando para um IP antigo (HostGator)
- Se existirem, clique no botao **"Edit"** (icone de lapis) ao lado de cada um

### 2.4 Criar/editar registro principal (@)

Se ja existe um registro A com nome `@` ou `blackbeltconsultoria.com.br`:
1. Clique em **"Edit"** (lapis)
2. Mude o campo **"IPv4 address"** para o IP do seu Droplet (ex: `164.90.152.37`)
3. **IMPORTANTE:** Clique na nuvem laranja para mudar para **nuvem cinza** ("DNS only")
4. Clique **"Save"**

Se NAO existe:
1. Clique no botao **"Add record"**
2. Preencha:
   ```
   Type:    A
   Name:    @
   IPv4:    164.90.152.37    (seu IP do Droplet)
   Proxy:   DNS only         (nuvem CINZA, nao laranja!)
   TTL:     Auto
   ```
3. Clique **"Save"**

### 2.5 Criar/editar registro www

Repita o mesmo processo para o `www`:
1. Clique **"Add record"**
2. Preencha:
   ```
   Type:    A
   Name:    www
   IPv4:    164.90.152.37    (mesmo IP)
   Proxy:   DNS only         (nuvem CINZA)
   TTL:     Auto
   ```
3. Clique **"Save"**

### 2.6 Por que "DNS only" (nuvem cinza)?

O Cloudflare em modo "Proxied" (laranja) adiciona seu proprio SSL/proxy.
Nosso servidor ja tem Nginx + Let's Encrypt fazendo SSL.
Se ambos tentarem fazer SSL, da conflito e o site nao carrega.
Use "DNS only" para que o Cloudflare so resolva o DNS sem interferir.

### 2.7 Verificar que o DNS propagou

Abra o **PowerShell** no seu PC e rode:

```powershell
nslookup blackbeltconsultoria.com.br
```

Deve retornar algo como:
```
Name:    blackbeltconsultoria.com.br
Address: 164.90.152.37
```

Se ainda mostrar o IP antigo, aguarde 5 minutos e tente novamente.
O Cloudflare geralmente propaga em menos de 2 minutos.

---

## PASSO 3: Conectar no Servidor via SSH

### 3.1 Abrir o PowerShell

1. No Windows, pressione `Win + X`
2. Clique em **"Terminal"** ou **"PowerShell"**

### 3.2 Conectar

Digite (substitua pelo seu IP real):

```powershell
ssh root@164.90.152.37
```

### 3.3 Primeira conexao

Na primeira vez, aparece a mensagem:
```
The authenticity of host '164.90.152.37' can't be established.
ED25519 key fingerprint is SHA256:xxxxx
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

Digite **`yes`** e pressione Enter.

### 3.4 Autenticacao

- **Se usou senha:** Digite a senha que criou no Passo 1.6
  (nao aparece nada enquanto digita — e normal, so digite e aperte Enter)
- **Se usou SSH Key:** Conecta automaticamente

### 3.5 Confirmar conexao

Quando conectar, voce vera algo como:
```
Welcome to Ubuntu 24.04 LTS
root@blackbelt-platform:~#
```

Voce agora esta dentro do servidor! Tudo que digitar roda no servidor, nao no seu PC.

### Problemas comuns:

**"Connection refused":**
- O servidor ainda esta inicializando. Aguarde 1-2 minutos e tente novamente.

**"Permission denied":**
- Se usou senha: verifique se esta digitando corretamente
- Se usou SSH Key: verifique se a chave correta esta em `~/.ssh/id_rsa`

**"Connection timed out":**
- Verifique se o IP esta correto
- Verifique se o Droplet esta ligado no painel do DigitalOcean

---

## PASSO 4: Instalar a Plataforma

### 4.1 Rodar o comando de instalacao

Copie e cole este comando inteiro no terminal SSH:

```bash
apt update -y && apt install -y git && git clone https://github.com/CarlosHonorato70/blackbelt-platform.git /opt/blackbelt && cd /opt/blackbelt && chmod +x scripts/deploy-setup.sh && ./scripts/deploy-setup.sh
```

Pressione **Enter**. O script comeca a rodar.

### 4.2 O que acontece automaticamente

O script vai:
```
[1/10] Verificando e instalando pre-requisitos
  ✓ Docker 27.x.x
  ✓ Docker Compose 2.x.x
  ✓ Git 2.x.x
  ✓ OpenSSL disponivel
  ✓ Certbot instalado
  ✓ Firewall configurado (SSH + HTTP + HTTPS)
```

Isso leva ~2 minutos. Depois ele clona o repositorio e gera secrets.

### 4.3 Responder as perguntas interativas

O script vai parar e pedir informacoes. Responda exatamente assim:

```
[4/10] Configuracao — responda as perguntas abaixo

  Informacoes obrigatorias:

  Seu dominio (ex: blackbelt.com.br): blackbeltconsultoria.com.br
  Email para SSL (Let's Encrypt): contato@blackbeltconsultoria.com.br

  Configuracao de Email (SMTP):
  Dica: Brevo (brevo.com) e gratis ate 300 emails/dia

  SMTP Host [smtp-relay.brevo.com]: (aperte Enter — usar padrao)
  SMTP Port [587]: (aperte Enter — usar padrao)
  SMTP User: a48473001@smtp-brevo.com
  SMTP Password: (cole a senha do Brevo e aperte Enter — nao aparece na tela)
  Email remetente (from) [noreply@blackbeltconsultoria.com.br]: contato@blackbeltconsultoria.com

  Pagamentos (opcional — pule se ainda nao configurou):

  Stripe Secret Key (sk_live_...): (aperte Enter para pular)
  Stripe Webhook Secret (whsec_...): (aperte Enter para pular)
  Mercado Pago Access Token: (aperte Enter para pular)

  Monitoramento (opcional):

  Sentry DSN: (aperte Enter para pular)
```

### 4.4 Geracao do SSL

O script tenta gerar o certificado SSL automaticamente:
```
[5/10] Gerando certificado SSL (Let's Encrypt)
  Gerando certificado para blackbeltconsultoria.com.br...
  ✓ Certificado SSL gerado com sucesso
```

**Se falhar:** Significa que o DNS ainda nao propagou. O script vai perguntar:
```
  ⚠ SSL falhou. O DNS pode nao estar propagado ainda.
  Continuar sem SSL? (s/N):
```
- Digite **`s`** para continuar sem SSL (voce gera depois)
- Ou espere o DNS propagar e rode o script novamente

### 4.5 Build e containers

O script agora constroi e sobe tudo:
```
[7/10] Iniciando containers Docker
  Construindo imagens (pode levar 3-5 minutos)...
  ✓ MySQL disponivel
  ✓ Aplicacao rodando na porta 5000

[8/10] Configurando banco de dados
  Executando migrations...
  ✓ Tabelas criadas
  Executando seed (admin + planos + roles)...
  ✓ Banco populado com dados iniciais
```

### 4.6 Resultado final

Ao terminar, o script exibe:
```
╔══════════════════════════════════════════════════════════════╗
║              ✨ Plataforma no ar! ✨                        ║
╚══════════════════════════════════════════════════════════════╝

  URL:           https://blackbeltconsultoria.com.br
  Admin email:   ricardo@consultoriasst.com.br
  Admin senha:   xK7mBq2pLnR4Aa1!

  IMPORTANTE: Anote a senha acima e troque no primeiro login!

  Comandos uteis:
    docker compose ps          — ver status dos servicos
    docker compose logs -f app — ver logs da aplicacao
    docker compose down        — parar tudo
    docker compose up -d       — iniciar tudo

  ✓ Credenciais salvas em /root/.blackbelt-credentials (apague apos anotar)
```

**ANOTE A SENHA** que aparece na tela! Ela e gerada aleatoriamente e nao sera exibida novamente.

---

## PASSO 5: Verificar que tudo funciona

### 5.1 Verificar containers (no SSH)

Ainda no terminal SSH, rode:

```bash
cd /opt/blackbelt && docker compose ps
```

Voce deve ver 4 containers:
```
NAME               STATUS                   PORTS
blackbelt-app      Up (healthy)             5000/tcp
blackbelt-mysql    Up (healthy)             3306/tcp
blackbelt-nginx    Up                       0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
blackbelt-backup   Up
```

Todos devem estar **"Up"**. O app e mysql devem estar **"(healthy)"**.

### 5.2 Testar pelo navegador

1. Abra o navegador no seu PC
2. Acesse **https://blackbeltconsultoria.com.br**
3. Deve aparecer a tela de login da BlackBelt Platform
4. Faca login com:
   - **Email:** `ricardo@consultoriasst.com.br`
   - **Senha:** a senha que anotou no passo 4.6

### 5.3 Se o site nao carregar

**Erro "Connection refused" ou pagina em branco:**
```bash
# Ver logs do app
docker compose logs app --tail 50

# Ver logs do nginx
docker compose logs nginx --tail 50
```

**Erro de SSL ("certificado invalido"):**
```bash
# Verificar se os certificados existem
ls -la docker/nginx/ssl/

# Se nao existem, gerar agora (o DNS ja deve ter propagado)
certbot certonly --standalone -d blackbeltconsultoria.com.br -d www.blackbeltconsultoria.com.br --email contato@blackbeltconsultoria.com.br --agree-tos --non-interactive
cp /etc/letsencrypt/live/blackbeltconsultoria.com.br/fullchain.pem docker/nginx/ssl/
cp /etc/letsencrypt/live/blackbeltconsultoria.com.br/privkey.pem docker/nginx/ssl/
docker compose restart nginx
```

**Erro "502 Bad Gateway":**
```bash
# O app ainda esta iniciando. Aguarde 30 segundos e recarregue a pagina.
# Se persistir, verifique os logs:
docker compose logs -f app
```

**Tela de login aparece mas login falha:**
```bash
# O seed pode nao ter rodado. Execute manualmente:
docker compose exec -T app npx tsx drizzle/seed.ts
```

---

## PASSO 6: Popular dados de teste (opcional)

Se quiser ter os mesmos dados que testamos localmente (consultores, empresas, etc.):

### 6.1 No seu PC local (nao no servidor)

Abra o PowerShell e navegue ate o projeto:

```powershell
cd "C:\Users\Carlos Honorato\OneDrive\Área de trabalho\blackbelt-platform-main"
```

### 6.2 Rodar teste E2E apontando para producao

```powershell
$env:BASE_URL="https://blackbeltconsultoria.com.br/api/trpc"; node test-e2e-full.cjs
```

Se o script usa `const BASE = "http://localhost:5000/api/trpc"` fixo,
edite a primeira linha de `test-e2e-full.cjs`:

```javascript
const BASE = process.env.BASE_URL || "http://localhost:5000/api/trpc";
```

E rode novamente.

---

## Manutencao do dia-a-dia

### Atualizar a plataforma (apos fazer push no GitHub)

```bash
ssh root@164.90.152.37
cd /opt/blackbelt
git pull origin main
docker compose up --build -d
# Aguarde ~3 minutos para o build
docker compose ps   # verificar que esta tudo "Up"
```

### Ver logs em tempo real

```bash
# Logs do app (Node.js)
docker compose logs -f app

# Logs do nginx (acessos e erros HTTP)
docker compose logs -f nginx

# Logs do banco (MySQL)
docker compose logs -f mysql

# Todos os logs juntos
docker compose logs -f

# Parar de ver logs: Ctrl+C
```

### Reiniciar servicos

```bash
# Reiniciar tudo
docker compose restart

# Reiniciar so o app (sem derrubar banco)
docker compose restart app

# Parar tudo
docker compose down

# Subir tudo de novo
docker compose up -d
```

### Backup manual do banco

```bash
# Ver a senha do banco (salva durante o deploy)
cat /root/.blackbelt-credentials | grep DB_PASSWORD

# Fazer backup
docker compose exec -T mysql mysqldump -u blackbelt -p'COLE_A_SENHA_AQUI' --single-transaction blackbelt | gzip > ~/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Ver tamanho do backup
ls -lh ~/backup_*.sql.gz
```

### Restaurar um backup

```bash
# Listar backups disponiveis
ls -lh ~/backup_*.sql.gz

# Restaurar (substitua o nome do arquivo)
gunzip < ~/backup_20260312_030000.sql.gz | docker compose exec -T mysql mysql -u blackbelt -p'COLE_A_SENHA_AQUI' blackbelt
```

### Renovar certificado SSL

O cron faz isso automaticamente a cada 60 dias, mas se precisar manualmente:

```bash
certbot renew --force-renewal
cp /etc/letsencrypt/live/blackbeltconsultoria.com.br/fullchain.pem /opt/blackbelt/docker/nginx/ssl/
cp /etc/letsencrypt/live/blackbeltconsultoria.com.br/privkey.pem /opt/blackbelt/docker/nginx/ssl/
docker compose restart nginx
```

### Ver uso de disco e memoria

```bash
# Espaco em disco
df -h /

# Memoria e CPU dos containers
docker stats --no-stream

# Limpar imagens Docker antigas (libera espaco)
docker system prune -a --volumes
```

### Ver credenciais salvas

```bash
cat /root/.blackbelt-credentials
```

---

## Custos

| Item | Custo mensal |
|------|-------------|
| Droplet DigitalOcean 1GB | $6 (~R$30) |
| Backup semanal DO (opcional) | $1.20 (~R$6) |
| Dominio Cloudflare | Ja pago |
| SSL Let's Encrypt | Gratis |
| Email Brevo | Gratis (ate 300/dia) |
| **Total** | **~R$30-36/mes** |

Se precisar mais performance: upgrade para $12/mes (2 vCPU, 2GB RAM) direto no painel do DigitalOcean (sem perder dados).

---

## Resumo dos acessos

| O que | Onde |
|-------|------|
| Painel DigitalOcean | https://cloud.digitalocean.com |
| Painel Cloudflare | https://dash.cloudflare.com |
| Plataforma | https://blackbeltconsultoria.com.br |
| SSH no servidor | `ssh root@IP_DO_DROPLET` |
| Arquivos no servidor | `/opt/blackbelt/` |
| Logs do app | `docker compose logs -f app` |
| Credenciais | `cat /root/.blackbelt-credentials` |
| Backups automaticos | Diario as 3h (30 dias retencao) |
