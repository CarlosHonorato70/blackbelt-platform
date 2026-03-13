# Deploy BlackBelt Platform — DigitalOcean + Cloudflare

Guia completo passo a passo. Tempo estimado: ~15 minutos.

---

## PASSO 1: Criar Droplet na DigitalOcean

1. Acesse https://cloud.digitalocean.com
2. Clique em **"Create"** (botao verde no topo) → **"Droplets"**
3. Configure:

```
Region:           Sao Paulo (SFO3 ou NYC1 se SP nao tiver)
Image:            Ubuntu 24.04 (LTS) x64
Size:             Basic → Regular → $6/mo (1 vCPU, 1 GB RAM, 25 GB SSD)
Authentication:   SSH Key (recomendado) ou Password
Hostname:         blackbelt-platform
```

4. Clique **"Create Droplet"**
5. **Anote o IP** que aparece (ex: `164.90.xxx.xxx`)

> Se escolheu Password: anote a senha. Se SSH Key: use a chave que ja tem no PC.

---

## PASSO 2: Configurar DNS no Cloudflare

1. Acesse https://dash.cloudflare.com
2. Selecione o dominio **blackbeltconsultoria.com.br**
3. Va em **DNS** → **Records**
4. Adicione (ou edite) estes registros:

```
Tipo    Nome    Conteudo              Proxy     TTL
A       @       164.90.xxx.xxx        DNS only  Auto
A       www     164.90.xxx.xxx        DNS only  Auto
```

**IMPORTANTE:** Deixe como **"DNS only"** (nuvem cinza), NAO "Proxied" (nuvem laranja).
Isso porque o Nginx no servidor ja faz SSL com Let's Encrypt.
Se usar proxy do Cloudflare, vai conflitar com o SSL do servidor.

5. Se existir um registro A antigo apontando para a HostGator, **delete** ele
6. Aguarde 2-5 minutos para propagar

### Verificar propagacao:
Abra o terminal (PowerShell) e rode:
```
nslookup blackbeltconsultoria.com.br
```
Deve mostrar o IP do Droplet (164.90.xxx.xxx).

---

## PASSO 3: Conectar no Servidor via SSH

### Windows (PowerShell):
```powershell
ssh root@164.90.xxx.xxx
```

Se pedir confirmacao de fingerprint, digite `yes`.

### Se usou senha:
Digite a senha que definiu na criacao do Droplet.

### Se usou SSH Key:
Conecta automaticamente.

> Dica: Se der erro "Connection refused", aguarde 1-2 minutos — o Droplet pode ainda estar inicializando.

---

## PASSO 4: Deploy Automatico (1 comando)

Ja conectado no servidor via SSH, rode:

```bash
apt update -y && apt install -y git && git clone https://github.com/CarlosHonorato70/blackbelt-platform.git /opt/blackbelt && cd /opt/blackbelt && chmod +x scripts/deploy-setup.sh && ./scripts/deploy-setup.sh
```

### O que o script vai fazer automaticamente:
```
[1/10] Instalar Docker, Git, Certbot, OpenSSL
       Configurar firewall (SSH + HTTP + HTTPS)
[2/10] Clonar repositorio
[3/10] Gerar secrets seguros (senhas, cookie, DB)
[4/10] Perguntar configuracoes:
       → Dominio: blackbeltconsultoria.com.br
       → Email SSL: seu email
       → SMTP: dados do Brevo
       → Stripe/MercadoPago: opcional
       → Sentry: opcional
[5/10] Gerar certificado SSL (Let's Encrypt)
[6/10] Criar .env.production
[7/10] Construir e iniciar containers Docker
[8/10] Rodar migrations (criar tabelas) e seed (admin + planos)
[9/10] Configurar backup diario + renovacao SSL
[10/10] Exibir credenciais de acesso
```

### Respostas para o script:

Quando perguntar, responda:

```
Seu dominio:        blackbeltconsultoria.com.br
Email para SSL:     contato@blackbeltconsultoria.com.br
SMTP Host:          smtp-relay.brevo.com  (Enter = padrao)
SMTP Port:          587  (Enter = padrao)
SMTP User:          a48473001@smtp-brevo.com
SMTP Password:      [sua senha do Brevo]
Email remetente:    contato@blackbeltconsultoria.com  (Enter = padrao)
Stripe Secret Key:  [Enter para pular ou cole sk_live_...]
Mercado Pago:       [Enter para pular ou cole o token]
Sentry DSN:         [Enter para pular ou cole o DSN]
```

### Ao final, o script exibe:

```
╔══════════════════════════════════════════════════╗
║              Plataforma no ar!                   ║
╚══════════════════════════════════════════════════╝

  URL:           https://blackbeltconsultoria.com.br
  Admin email:   ricardo@consultoriasst.com.br
  Admin senha:   [senha gerada automaticamente]

  IMPORTANTE: Anote a senha acima e troque no primeiro login!
```

---

## PASSO 5: Verificar que tudo esta funcionando

### Ainda no SSH do servidor:
```bash
# Ver status dos containers
docker compose ps

# Deve mostrar 4 containers "healthy" ou "running":
# blackbelt-app      healthy
# blackbelt-mysql    healthy
# blackbelt-nginx    running
# blackbelt-backup   running
```

### No seu navegador:
1. Acesse **https://blackbeltconsultoria.com.br**
2. Faca login com:
   - Email: `ricardo@consultoriasst.com.br`
   - Senha: a que apareceu no final do script

### Se algo der errado:
```bash
# Ver logs do app
docker compose logs -f app

# Ver logs do nginx
docker compose logs -f nginx

# Reiniciar tudo
docker compose restart
```

---

## PASSO 6: Popular dados de teste (opcional)

Se quiser os mesmos dados que testamos localmente (2 consultores, 4 empresas, etc.),
rode o teste E2E apontando para o servidor:

No seu PC local (nao no servidor), edite a primeira linha do `test-e2e-full.cjs`:
```javascript
// Mude de:
const BASE = "http://localhost:5000/api/trpc";
// Para:
const BASE = "https://blackbeltconsultoria.com.br/api/trpc";
```

E rode:
```bash
node test-e2e-full.cjs
```

---

## Comandos do dia-a-dia

### Atualizar a plataforma (apos push no GitHub):
```bash
ssh root@164.90.xxx.xxx
cd /opt/blackbelt
git pull origin main
docker compose up --build -d
```

### Ver logs:
```bash
docker compose logs -f app      # logs da aplicacao
docker compose logs -f nginx    # logs do nginx
docker compose logs -f mysql    # logs do banco
```

### Backup manual:
```bash
docker compose exec -T mysql mysqldump -u blackbelt -p'SENHA' --single-transaction blackbelt | gzip > ~/backup_$(date +%Y%m%d).sql.gz
```

### Restaurar backup:
```bash
gunzip < ~/backup_20260312.sql.gz | docker compose exec -T mysql mysql -u blackbelt -p'SENHA' blackbelt
```

### Renovar SSL:
```bash
certbot renew
cp /etc/letsencrypt/live/blackbeltconsultoria.com.br/*.pem /opt/blackbelt/docker/nginx/ssl/
docker compose restart nginx
```

---

## Custos

| Item | Custo |
|------|-------|
| Droplet DigitalOcean (1GB) | $6/mes (~R$30) |
| Dominio (Cloudflare) | Ja pago |
| SSL (Let's Encrypt) | Gratis |
| Email (Brevo) | Gratis ate 300/dia |
| **Total** | **~R$30/mes** |

Se precisar de mais performance, faca upgrade do Droplet para $12/mes (2GB RAM).
