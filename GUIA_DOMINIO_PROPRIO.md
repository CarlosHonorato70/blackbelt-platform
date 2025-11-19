# 🌐 Guia Completo - Configurar Domínio Próprio

**Plataforma:** Black Belt - Plataforma de Gestão Multi-Tenant  
**Objetivo:** Configurar domínio personalizado (ex: app.blackbelt-consultoria.com)  
**Tempo Estimado:** 15-30 minutos  
**Dificuldade:** Intermediária

---

## 📋 Pré-requisitos

- ✅ Domínio registrado (ex: blackbelt-consultoria.com)
- ✅ Acesso ao painel de controle do registrador de domínio
- ✅ Acesso ao Management Dashboard da plataforma
- ✅ Conhecimento básico de DNS

---

## 🎯 Opção 1: Usando Manus (Recomendado)

Se você está usando a plataforma Manus, o processo é muito simples!

### Passo 1: Acessar o Management Dashboard

1. Acesse: https://app.manus.im (ou seu dashboard Manus)
2. Faça login com suas credenciais
3. Selecione o projeto "blackbelt-platform"
4. Clique em **Settings** → **Domains**

### Passo 2: Adicionar Domínio Personalizado

1. Clique em **"Add Custom Domain"**
2. Digite seu domínio: `app.blackbelt-consultoria.com`
3. Clique em **"Verify Domain"**

### Passo 3: Verificar Propriedade do Domínio

Manus fornecerá um registro DNS para verificação:

```
Tipo: TXT
Nome: _acme-challenge.app.blackbelt-consultoria.com
Valor: abc123def456ghi789jkl012mno345pqr
TTL: 3600
```

### Passo 4: Adicionar Registro DNS no Registrador

1. Acesse o painel de controle do seu registrador (GoDaddy, Namecheap, etc)
2. Vá para **DNS Management** ou **Zone File**
3. Clique em **"Add Record"**
4. Preencha:
   - **Type:** TXT
   - **Name:** `_acme-challenge.app.blackbelt-consultoria.com`
   - **Value:** `abc123def456ghi789jkl012mno345pqr`
   - **TTL:** 3600
5. Clique em **"Save"**

### Passo 5: Verificar no Manus

1. Retorne ao dashboard Manus
2. Clique em **"Verify"**
3. Aguarde 5-10 minutos enquanto o DNS se propaga
4. Quando verificado, clique em **"Activate"**

### Passo 6: Configurar Apontamento

Manus fornecerá um CNAME ou A record:

```
Tipo: CNAME
Nome: app.blackbelt-consultoria.com
Valor: app-blackbelt-platform.manus.space
TTL: 3600
```

Ou:

```
Tipo: A
Nome: app.blackbelt-consultoria.com
Valor: 123.45.67.89 (IP fornecido)
TTL: 3600
```

1. Adicione este registro no seu registrador
2. Aguarde 15-30 minutos para propagação DNS
3. Acesse seu domínio: `https://app.blackbelt-consultoria.com`

---

## 🎯 Opção 2: Usando AWS Route 53

Se você está hospedando na AWS:

### Passo 1: Criar Hosted Zone

1. Acesse AWS Console → Route 53
2. Clique em **"Create hosted zone"**
3. Digite seu domínio: `blackbelt-consultoria.com`
4. Clique em **"Create hosted zone"**

### Passo 2: Atualizar Name Servers

1. Copie os 4 Name Servers fornecidos pela AWS
2. Acesse o painel do seu registrador
3. Vá para **Name Servers** ou **DNS Settings**
4. Cole os 4 Name Servers da AWS
5. Salve as mudanças

### Passo 3: Criar Registro CNAME

1. No Route 53, clique em **"Create record"**
2. Preencha:
   - **Record name:** `app.blackbelt-consultoria.com`
   - **Record type:** CNAME
   - **Value:** `seu-app.elb.amazonaws.com` (ou seu ALB/CloudFront)
   - **TTL:** 300
3. Clique em **"Create records"**

### Passo 4: Configurar SSL/TLS

1. Acesse AWS Certificate Manager
2. Clique em **"Request certificate"**
3. Digite seu domínio: `app.blackbelt-consultoria.com`
4. Escolha **DNS validation**
5. Crie os registros DNS fornecidos
6. Aguarde validação

### Passo 5: Atualizar Load Balancer

1. Acesse seu Application Load Balancer (ALB)
2. Vá para **Listeners**
3. Edite o listener HTTPS
4. Selecione o certificado criado
5. Salve as mudanças

---

## 🎯 Opção 3: Usando GoDaddy

### Passo 1: Acessar Painel GoDaddy

1. Faça login em https://www.godaddy.com
2. Clique em **"My Products"**
3. Selecione seu domínio

### Passo 2: Acessar DNS Management

1. Clique em **"Manage DNS"** ou **"DNS"**
2. Você verá a lista de registros DNS

### Passo 3: Adicionar Registro CNAME

1. Clique em **"Add"** ou **"+"**
2. Preencha:
   - **Type:** CNAME
   - **Name:** `app` (sem o domínio)
   - **Value:** `seu-app.manus.space` (ou seu servidor)
   - **TTL:** 1 hour
3. Clique em **"Save"**

### Passo 4: Verificar Propagação

1. Abra terminal/prompt
2. Execute: `nslookup app.blackbelt-consultoria.com`
3. Aguarde até ver o novo IP/CNAME

### Passo 5: Acessar Domínio

1. Acesse: `https://app.blackbelt-consultoria.com`
2. Você deve ver a plataforma Black Belt

---

## 🎯 Opção 4: Usando Namecheap

### Passo 1: Acessar Painel Namecheap

1. Faça login em https://www.namecheap.com
2. Clique em **"Dashboard"**
3. Clique em **"Manage"** ao lado do seu domínio

### Passo 2: Acessar Advanced DNS

1. Clique em **"Advanced DNS"**
2. Você verá a lista de registros

### Passo 3: Adicionar Registro CNAME

1. Clique em **"Add New Record"**
2. Preencha:
   - **Type:** CNAME Record
   - **Host:** `app`
   - **Value:** `seu-app.manus.space`
   - **TTL:** 3600
3. Clique em **"Save All Changes"**

### Passo 4: Aguardar Propagação

1. Propagação pode levar 15-30 minutos
2. Use https://www.whatsmydns.net para verificar

### Passo 5: Acessar Domínio

1. Acesse: `https://app.blackbelt-consultoria.com`

---

## 🎯 Opção 5: Usando Cloudflare

### Passo 1: Criar Conta Cloudflare

1. Acesse https://www.cloudflare.com
2. Clique em **"Sign Up"**
3. Crie sua conta

### Passo 2: Adicionar Domínio

1. Clique em **"Add a Site"**
2. Digite seu domínio: `blackbelt-consultoria.com`
3. Clique em **"Add site"**
4. Selecione o plano (Free é suficiente)

### Passo 3: Atualizar Name Servers

1. Copie os 2 Name Servers fornecidos
2. Acesse seu registrador
3. Atualize os Name Servers
4. Aguarde 24 horas

### Passo 4: Adicionar Registro CNAME

1. No Cloudflare, vá para **DNS**
2. Clique em **"Add record"**
3. Preencha:
   - **Type:** CNAME
   - **Name:** `app`
   - **Content:** `seu-app.manus.space`
   - **Proxy status:** Proxied (laranja)
   - **TTL:** Auto
4. Clique em **"Save"**

### Passo 5: Configurar SSL/TLS

1. Vá para **SSL/TLS**
2. Selecione **"Full"** ou **"Full (strict)"**
3. Isso fornecerá SSL grátis via Cloudflare

### Passo 6: Acessar Domínio

1. Acesse: `https://app.blackbelt-consultoria.com`

---

## 🔍 Verificar Configuração

### Teste 1: Verificar DNS

```bash
# Windows
nslookup app.blackbelt-consultoria.com

# Mac/Linux
dig app.blackbelt-consultoria.com
```

Esperado: Ver o IP ou CNAME apontando para seu servidor

### Teste 2: Verificar SSL

```bash
# Verificar certificado
curl -I https://app.blackbelt-consultoria.com

# Esperado: HTTP/2 200 OK com certificado válido
```

### Teste 3: Verificar Propagação

Acesse: https://www.whatsmydns.net  
Digite: `app.blackbelt-consultoria.com`  
Você deve ver o IP em todos os servidores DNS

---

## 🚨 Troubleshooting

### Problema: "DNS_PROBE_FINISHED_NXDOMAIN"

**Causa:** DNS ainda não foi propagado  
**Solução:**
1. Aguarde 15-30 minutos
2. Limpe o cache do navegador (Ctrl+Shift+Del)
3. Use navegador privado para testar
4. Verifique com: `nslookup app.blackbelt-consultoria.com`

### Problema: "ERR_SSL_PROTOCOL_ERROR"

**Causa:** Certificado SSL não configurado  
**Solução:**
1. Verifique se SSL está ativado no servidor
2. Regenere certificado SSL
3. Aguarde 5-10 minutos para ativação

### Problema: "Connection refused"

**Causa:** Servidor não está respondendo  
**Solução:**
1. Verifique se a aplicação está rodando
2. Verifique firewall e portas abertas
3. Verifique logs do servidor

### Problema: "Too many redirects"

**Causa:** Redirecionamento infinito  
**Solução:**
1. Verifique configuração de SSL/TLS
2. Remova redirecionamentos duplicados
3. Verifique regras de rewrite

---

## 📊 Comparação de Provedores

| Provedor | Dificuldade | Tempo | Custo | Suporte |
|----------|-------------|-------|-------|---------|
| **Manus** | ⭐ Fácil | 5 min | Incluído | Excelente |
| **AWS Route 53** | ⭐⭐⭐ Difícil | 30 min | $0.50/mês | Bom |
| **GoDaddy** | ⭐⭐ Médio | 15 min | Incluído | Bom |
| **Namecheap** | ⭐⭐ Médio | 15 min | Incluído | Bom |
| **Cloudflare** | ⭐⭐ Médio | 20 min | Grátis | Excelente |

---

## 🎯 Recomendação

**Para iniciantes:** Use **Manus** (mais simples)  
**Para máximo controle:** Use **AWS Route 53**  
**Para melhor custo-benefício:** Use **Cloudflare**

---

## 📝 Checklist de Configuração

- [ ] Domínio registrado
- [ ] Acesso ao painel do registrador
- [ ] Acesso ao Management Dashboard
- [ ] Registro DNS criado
- [ ] DNS propagado (verificado com nslookup)
- [ ] SSL/TLS configurado
- [ ] Domínio acessível via HTTPS
- [ ] Redirecionamento HTTP → HTTPS funcionando
- [ ] Email funcionando (se aplicável)
- [ ] Certificado válido por 12 meses

---

## 🔐 Segurança

### Certificado SSL

- ✅ Sempre use HTTPS
- ✅ Renove certificado antes de expirar
- ✅ Use certificados de autoridades confiáveis
- ✅ Configure HSTS (HTTP Strict Transport Security)

### DNS

- ✅ Use registrador confiável
- ✅ Ative 2FA no painel
- ✅ Monitore mudanças de DNS
- ✅ Configure alertas de expiração

---

## 📞 Suporte

Se tiver dúvidas:

1. **Manus:** https://help.manus.im
2. **GoDaddy:** https://www.godaddy.com/help
3. **Namecheap:** https://www.namecheap.com/support
4. **Cloudflare:** https://support.cloudflare.com
5. **AWS:** https://aws.amazon.com/support

---

## 📚 Recursos Adicionais

- [ICANN - Domain Registration](https://www.icann.org/)
- [DNS Checker](https://dnschecker.org/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [Moz - Domain Authority](https://moz.com/domain-analysis)

---

**Última atualização:** Novembro 2025  
**Versão:** 1.0  
**Status:** Pronto para uso ✅

