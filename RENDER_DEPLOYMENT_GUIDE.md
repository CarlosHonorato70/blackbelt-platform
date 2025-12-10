# 🚀 Guia de Deploy no Render - Black Belt Platform

Este guia explica como fazer o deploy da Black Belt Platform no [Render](https://render.com/), uma plataforma moderna de hospedagem com suporte nativo a Docker e PostgreSQL.

## 📋 Pré-requisitos

- [ ] Conta no [Render](https://render.com/) (plano gratuito disponível)
- [ ] Repositório GitHub com o código da aplicação
- [ ] Git instalado localmente

## 🔍 Por que o deploy não funcionava antes?

### Problemas Identificados e Corrigidos:

1. **❌ Conflito de Dialeto do Banco de Dados**
   - **Problema**: `drizzle.config.ts` estava configurado com `dialect: "mysql"` mas o código usa PostgreSQL
   - **Solução**: Alterado para `dialect: "postgresql"`

2. **❌ Arquivo .env.production Incorreto**
   - **Problema**: Continha string de conexão MongoDB, mas a aplicação usa PostgreSQL
   - **Solução**: Atualizado com variáveis corretas para PostgreSQL

3. **❌ Falta de Configuração do Render**
   - **Problema**: Não existia arquivo `render.yaml` para configuração automática
   - **Solução**: Criado `render.yaml` com todas as configurações necessárias

4. **❌ Porta e Host não configurados corretamente**
   - **Problema**: Variáveis de ambiente não estavam padronizadas
   - **Solução**: Dockerfile.production e server/index.ts já estavam corretos usando PORT=8080 e HOST=0.0.0.0

## 🎯 Opções de Deploy

### Opção 1: Deploy Automático com render.yaml (Recomendado)

Este método usa o arquivo `render.yaml` para criar automaticamente todos os recursos necessários.

#### Passo 1: Preparar o Repositório

```bash
# 1. Certifique-se de que está na branch main
git checkout main

# 2. Faça commit das alterações (já feitas)
git status

# 3. Push para o GitHub
git push origin main
```

#### Passo 2: Criar os Serviços no Render

1. Acesse [Render Dashboard](https://dashboard.render.com/)
2. Clique em **"New +"** → **"Blueprint"**
3. Conecte seu repositório GitHub
4. Selecione o repositório `CarlosHonorato70/blackbelt-platform`
5. O Render detectará automaticamente o `render.yaml`
6. Clique em **"Apply"**

O Render irá criar automaticamente:
- ✅ Web Service (aplicação)
- ✅ PostgreSQL Database
- ✅ Variáveis de ambiente conectadas

#### Passo 3: Configurar Variáveis de Ambiente

Após a criação, você precisa configurar as URLs do frontend:

1. No Render Dashboard, vá até o serviço `blackbelt-platform`
2. Clique em **"Environment"**
3. Adicione/Edite:
   ```
   VITE_FRONTEND_URL=https://blackbelt-platform.onrender.com
   FRONTEND_URL=https://blackbelt-platform.onrender.com
   ```
   (Substitua pela URL real do seu serviço)
4. Clique em **"Save Changes"**

O serviço será re-deployed automaticamente.

### Opção 2: Deploy Manual (Sem render.yaml)

Se preferir criar os recursos manualmente:

#### Passo 1: Criar o Banco de Dados PostgreSQL

1. No Render Dashboard, clique em **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `blackbelt-db`
   - **Database**: `blackbelt`
   - **User**: (gerado automaticamente)
   - **Region**: `Oregon` (ou mais próximo de você)
   - **Plan**: `Starter` (gratuito) ou superior
3. Clique em **"Create Database"**
4. Aguarde a criação (leva ~2 minutos)
5. **IMPORTANTE**: Copie a **Internal Database URL** (começa com `postgresql://`)

#### Passo 2: Criar o Web Service

1. No Render Dashboard, clique em **"New +"** → **"Web Service"**
2. Conecte ao repositório GitHub `CarlosHonorato70/blackbelt-platform`
3. Configure:
   - **Name**: `blackbelt-platform`
   - **Region**: `Oregon` (mesma região do database)
   - **Branch**: `main`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `Dockerfile.production`
   - **Plan**: `Starter` (US$ 7/mês) ou superior

#### Passo 3: Configurar Variáveis de Ambiente

Na seção **Environment**, adicione:

```bash
# Obrigatório
NODE_ENV=production
PORT=8080
HOST=0.0.0.0

# Database - Cole a Internal Database URL do Passo 1
DATABASE_URL=postgresql://user:pass@hostname/dbname

# Session Secret - Gere com: openssl rand -hex 32
SESSION_SECRET=your-generated-secret-here

# Frontend URLs - Use a URL do seu serviço Render
VITE_FRONTEND_URL=https://blackbelt-platform.onrender.com
FRONTEND_URL=https://blackbelt-platform.onrender.com
```

#### Passo 4: Deploy

1. Clique em **"Create Web Service"**
2. O Render iniciará o build e deploy automaticamente
3. Acompanhe os logs em tempo real

## ✅ Verificação do Deploy

### 1. Verificar Health Check

Aguarde o deploy completar e teste:

```bash
curl https://sua-url.onrender.com/api/health
```

Resposta esperada:
```json
{"status":"ok"}
```

### 2. Verificar Logs

No Render Dashboard:
1. Vá até o serviço `blackbelt-platform`
2. Clique na aba **"Logs"**
3. Verifique se não há erros

### 3. Testar a Aplicação

1. Acesse `https://sua-url.onrender.com`
2. A página inicial deve carregar
3. Teste o login/cadastro

## 🔧 Troubleshooting

### Problema: "Database not available"

**Causa**: DATABASE_URL não está configurada ou incorreta

**Solução**:
1. Vá para **Environment** no Render Dashboard
2. Verifique se `DATABASE_URL` está presente
3. Se usar Blueprint, certifique-se de que o database está conectado
4. Se manual, cole a Internal Database URL do PostgreSQL

### Problema: "Cannot find module 'pg'"

**Causa**: Build não instalou as dependências corretamente

**Solução**:
1. Verifique se `Dockerfile.production` está correto
2. Force um rebuild: **Manual Deploy** → **Clear build cache & deploy**

### Problema: Migrations não rodaram

**Causa**: Comando `db:push` falhou durante o startup

**Solução**:
1. Verifique os logs de deploy
2. Se necessário, rode manualmente:
   ```bash
   # No Render Shell
   npm run db:push
   ```

### Problema: "Error: listen EADDRINUSE: address already in use"

**Causa**: PORT configurada incorretamente

**Solução**:
1. Certifique-se de que `PORT=8080` (Render usa 8080 internamente)
2. Não use porta diferente

### Problema: Timeout durante o build

**Causa**: Build do Dockerfile está demorando muito

**Solução**:
1. Upgrade para um plano superior (mais recursos)
2. Ou otimize o Dockerfile (já está otimizado com multi-stage)

### Problema: Frontend não carrega (404)

**Causa**: Arquivos estáticos não foram copiados corretamente

**Solução**:
1. Verifique se `scripts/copy-files.js` rodou no build
2. Verifique nos logs se `dist/public` existe

## 📊 Monitoramento

### Logs em Tempo Real

```bash
# No Render Dashboard
1. Acesse o serviço
2. Clique em "Logs"
3. Veja logs em tempo real
```

### Métricas

O Render fornece automaticamente:
- ✅ CPU Usage
- ✅ Memory Usage
- ✅ Response Time
- ✅ Error Rate

Acesse em: **Metrics** tab no serviço

### Alertas

Configure alertas para:
1. Deploy failures
2. Health check failures
3. High error rate

## 🔄 Atualizações e Re-deploys

### Deploy Automático (Git Push)

```bash
# Qualquer push para a branch main dispara deploy automático
git add .
git commit -m "Update feature"
git push origin main
```

### Deploy Manual

No Render Dashboard:
1. Vá até o serviço
2. Clique em **"Manual Deploy"**
3. Selecione **"Deploy latest commit"**
4. Ou **"Clear build cache & deploy"** se houver problemas

### Rollback

Para reverter para uma versão anterior:

1. No Render Dashboard → **"Events"**
2. Encontre o deploy anterior bem-sucedido
3. Clique em **"Rollback"**

## 💰 Custos Estimados

### Plano Starter (Recomendado para MVP/Testes)

| Recurso | Plano | Custo |
|---------|-------|-------|
| Web Service | Starter | US$ 7/mês |
| PostgreSQL | Starter | US$ 7/mês |
| **Total** | | **US$ 14/mês** |

### Plano Standard (Produção)

| Recurso | Plano | Custo |
|---------|-------|-------|
| Web Service | Standard | US$ 25/mês |
| PostgreSQL | Standard | US$ 20/mês |
| **Total** | | **US$ 45/mês** |

**Nota**: Render oferece crédito gratuito de US$ 5/mês para novos usuários.

## 🔐 Segurança

### Checklist Pós-Deploy

- [ ] Alterar `SESSION_SECRET` para um valor seguro
- [ ] Configurar domínio customizado com HTTPS (Render fornece SSL grátis)
- [ ] Habilitar Render's IP Allowlist para o database (se necessário)
- [ ] Revisar variáveis de ambiente sensíveis
- [ ] Configurar backup do database (disponível no plano Pro+)
- [ ] Habilitar Health Checks (já configurado no render.yaml)

## 📚 Recursos Adicionais

- [Documentação Oficial do Render](https://render.com/docs)
- [Render Community Forum](https://community.render.com/)
- [Render Status Page](https://status.render.com/)

## 🆘 Suporte

Se encontrar problemas:

1. **Logs**: Sempre verifique os logs primeiro no Render Dashboard
2. **GitHub Issues**: Abra uma issue no repositório
3. **Render Support**: Para problemas específicos do Render

---

**Desenvolvido com ❤️ para simplificar o deploy da Black Belt Platform no Render**
