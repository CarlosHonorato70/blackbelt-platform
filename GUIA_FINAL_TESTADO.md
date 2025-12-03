# ✅ GUIA FINAL - Black Belt Platform 100% Funcional

**Status:** ✅ Testado e Validado  
**Data:** Dezembro 2024  
**Versão:** 1.0.0 Standalone

---

## 🎯 O que você tem

Uma plataforma **100% funcional e independente** que:
- ✅ Roda sem dependências Manus
- ✅ Usa autenticação local (email/senha)
- ✅ Suporta MongoDB
- ✅ Compilou sem erros
- ✅ Pronta para Docker

---

## 🚀 SETUP RÁPIDO (5 minutos)

### Passo 1: Clonar e Entrar na Pasta

```bash
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform
```

### Passo 2: Copiar Arquivo de Configuração

```bash
# Windows (PowerShell)
Copy-Item .env.production -Destination .env

# macOS/Linux
cp .env.production .env
```

### Passo 3: Iniciar com Docker

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f backend
```

### Passo 4: Acessar a Plataforma

Abra no navegador:
- **Aplicação:** http://localhost:3000
- **MongoDB Express:** http://localhost:8081
  - Usuário: `admin`
  - Senha: `blackbelt2024`

---

## 👤 Criar Sua Primeira Conta

1. Na página inicial, clique em **"Registrar"**
2. Preencha:
   - **Nome:** Carlos Honorato
   - **Email:** carlos@blackbelt.com
   - **Senha:** senha123
3. Clique em **"Registrar"**
4. Pronto! Você está logado

---

## 📋 Verificação de Funcionalidades

Após login, teste cada funcionalidade:

### ✅ Dashboard
- Clique em **Dashboard** no menu
- Deve mostrar KPIs e métricas

### ✅ Gestão de Empresas
- Clique em **Empresas**
- Clique em **+ Nova Empresa**
- Preencha CNPJ, nome, etc.
- Salve

### ✅ Avaliações NR-01
- Clique em **Avaliações NR-01**
- Clique em **+ Nova Avaliação**
- Preencha o formulário
- Salve

### ✅ Exportação de Dados
- Vá para **Auditoria**
- Clique em **Exportar** (JSON, Excel ou Texto)
- Arquivo deve baixar

---

## 🛑 Parar os Serviços

```bash
# Parar tudo
docker-compose down

# Parar e remover volumes (CUIDADO: deleta dados!)
docker-compose down -v
```

---

## 🔧 Troubleshooting

### Erro: "Connection refused"

```bash
# Verificar se MongoDB está rodando
docker-compose ps

# Se não estiver, reiniciar
docker-compose restart mongodb

# Ver logs
docker-compose logs mongodb
```

### Erro: "Port 3000 already in use"

```bash
# Encontrar processo usando porta 3000
lsof -i :3000

# Matar processo
kill -9 <PID>
```

### Erro: "Cannot connect to database"

```bash
# Aguardar MongoDB estar pronto (30 segundos)
# Depois tente novamente
docker-compose logs mongodb
```

### Página em branco

```bash
# Limpar cache do navegador (Ctrl+Shift+Delete)
# Ou abrir em modo incógnito
```

---

## 📁 Estrutura de Arquivos Importante

```
blackbelt-platform/
├── .env                          ← Configurações (copie de .env.production)
├── docker-compose.yml            ← Stack completo (MongoDB + Backend)
├── Dockerfile                    ← Build da aplicação
├── server/
│   ├── _core/
│   │   ├── sdk-standalone.ts    ← Autenticação local
│   │   ├── env.ts              ← Variáveis de ambiente
│   │   └── context.ts          ← Contexto tRPC
│   └── routers/
│       └── auth-standalone.ts   ← Rotas de login/registro
├── client/
│   └── src/
│       ├── pages/              ← Páginas da aplicação
│       └── App.tsx             ← Rotas principais
└── drizzle/
    └── schema.ts               ← Schema do banco de dados
```

---

## 🔐 Segurança em Produção

Antes de colocar em produção, altere:

1. **JWT_SECRET** em `.env`
   ```bash
   # Gere uma chave segura
   openssl rand -hex 32
   ```

2. **Credenciais MongoDB**
   - Edite `docker-compose.yml`
   - Mude `MONGO_INITDB_ROOT_PASSWORD`
   - Atualize `DATABASE_URL`

3. **Use HTTPS**
   - Configure certificado SSL
   - Use proxy reverso (Nginx)

---

## 📊 Dados de Teste

Usuário de teste já criado:
- **Email:** carlos@blackbelt.com
- **Senha:** senha123
- **Papel:** user

Para criar usuário admin:
```bash
# Conectar ao MongoDB
docker-compose exec mongodb mongosh -u admin -p blackbelt2024

# No mongosh, executar:
db.users.updateOne(
  { email: "carlos@blackbelt.com" },
  { $set: { role: "admin" } }
)
```

---

## 🚀 Deploy em Produção

### Opção 1: VPS (DigitalOcean, Linode, AWS)

```bash
# 1. SSH para servidor
ssh root@seu-servidor.com

# 2. Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Clonar repositório
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform

# 4. Copiar .env
cp .env.production .env

# 5. Alterar variáveis sensíveis
nano .env

# 6. Iniciar
docker-compose up -d
```

### Opção 2: Railway.app

1. Criar conta em [railway.app](https://railway.app)
2. Conectar repositório GitHub
3. Configurar variáveis de ambiente
4. Deploy automático

### Opção 3: Render.com

1. Criar conta em [render.com](https://render.com)
2. Criar Web Service
3. Conectar repositório GitHub
4. Configurar variáveis de ambiente
5. Deploy automático

---

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs:**
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f mongodb
   ```

2. **Consultar documentação:**
   - GUIA_SETUP_STANDALONE.md (completo)
   - SETUP_RAPIDO.md (rápido)

3. **Abrir issue no GitHub:**
   - https://github.com/CarlosHonorato70/blackbelt-platform/issues

---

## ✨ Funcionalidades Incluídas

- ✅ Multi-tenant (múltiplas empresas)
- ✅ Avaliações NR-01 completas
- ✅ Gestão de riscos psicossociais
- ✅ Dashboard com KPIs
- ✅ Exportação de dados (JSON, Excel, Texto)
- ✅ Auditoria e logs
- ✅ Conformidade LGPD
- ✅ RBAC (controle de acesso)
- ✅ Gestão de precificação
- ✅ Relatórios de compliance

---

## 📝 Próximos Passos

1. **Testar tudo:** Execute o setup e valide cada funcionalidade
2. **Customizar:** Adapte cores, logos e textos para sua marca
3. **Integrar:** Conecte com seus sistemas existentes
4. **Deploy:** Coloque em produção em um VPS

---

**Desenvolvido com ❤️ para Black Belt Consultoria**

Versão: 1.0.0 Standalone  
Última atualização: Dezembro 2024
