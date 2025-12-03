# 🚀 Guia de Setup - Black Belt Platform Standalone

Bem-vindo! Este guia irá ajudá-lo a rodar a plataforma Black Belt 100% fora do ambiente Manus, usando Docker, Node.js e MongoDB.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Docker Desktop** (versão 20.10+)
  - [Download para Windows](https://www.docker.com/products/docker-desktop)
  - [Download para Mac](https://www.docker.com/products/docker-desktop)
  - [Download para Linux](https://docs.docker.com/engine/install/)

- **Node.js** (versão 22+)
  - [Download](https://nodejs.org/)

- **Git** (para clonar o repositório)
  - [Download](https://git-scm.com/)

- **MongoDB** (opcional - será rodado em Docker)

## 🔧 Instalação Rápida (Com Docker)

### 1. Clonar o Repositório

```bash
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform
```

### 2. Criar arquivo `.env`

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Banco de Dados
DATABASE_URL=mongodb://admin:blackbelt2024@mongodb:27017/blackbelt?authSource=admin

# Autenticação
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345

# Aplicação
NODE_ENV=production
VITE_APP_TITLE=Black Belt Consultoria
VITE_APP_LOGO=https://files.manuscdn.com/user_upload_by_module/web_dev_logo/310519663180008591/HtZnCnjHPPapRywu.png
PORT=3000
```

### 3. Iniciar com Docker Compose

```bash
# Iniciar todos os serviços
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f backend
```

A plataforma estará disponível em: **http://localhost:3000**

### 4. Acessar a Plataforma

- **URL**: http://localhost:3000
- **MongoDB Express** (GUI): http://localhost:8081
  - Usuário: `admin`
  - Senha: `blackbelt2024`

## 🛠️ Instalação Manual (Sem Docker)

Se preferir rodar sem Docker:

### 1. Instalar Dependências

```bash
# Com pnpm (recomendado)
pnpm install

# Ou com npm
npm install
```

### 2. Configurar MongoDB Localmente

```bash
# No Windows (PowerShell)
# Assumindo que MongoDB está instalado em C:\Program Files\MongoDB\Server\7.0\bin
$env:MONGODB_HOME = "C:\Program Files\MongoDB\Server\7.0"
& "$env:MONGODB_HOME\bin\mongod.exe" --dbpath "C:\data\db"

# No macOS (com Homebrew)
brew services start mongodb-community

# No Linux (com systemctl)
sudo systemctl start mongod
```

### 3. Criar arquivo `.env`

```env
DATABASE_URL=mongodb://localhost:27017/blackbelt
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
NODE_ENV=development
VITE_APP_TITLE=Black Belt Consultoria
PORT=3000
```

### 4. Executar Migrations (Drizzle)

```bash
pnpm db:push
```

### 5. Iniciar Servidor de Desenvolvimento

```bash
pnpm dev
```

A plataforma estará disponível em: **http://localhost:3000**

## 👤 Criar Primeiro Usuário

### Via Interface Web

1. Acesse http://localhost:3000
2. Clique em "Registrar"
3. Preencha:
   - Nome: `Carlos Honorato`
   - Email: `carlos@blackbelt.com`
   - Senha: `senha123`
4. Clique em "Registrar"

### Via MongoDB (Direto no Banco)

```javascript
// Conectar ao MongoDB
mongosh "mongodb://admin:blackbelt2024@localhost:27017/blackbelt" --authenticationDatabase admin

// Executar no mongosh
db.users.insertOne({
  _id: "user_001",
  name: "Carlos Honorato",
  email: "carlos@blackbelt.com",
  passwordHash: "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3", // "123456"
  loginMethod: "email",
  role: "admin",
  createdAt: new Date(),
  lastSignedIn: new Date()
})
```

## 📱 Funcionalidades Principais

Após login, você terá acesso a:

### 1. **Dashboard**
   - Visão geral de empresas, colaboradores e avaliações
   - KPIs e métricas em tempo real
   - Status de conformidade NR-01

### 2. **Gestão de Empresas**
   - Criar e gerenciar tenants (empresas)
   - Associar setores e colaboradores
   - Validação de CNPJ

### 3. **Avaliações NR-01**
   - Criar avaliações de riscos psicossociais
   - Gerar relatórios de compliance
   - Exportar em JSON, Excel ou Texto

### 4. **Gestão de Precificação**
   - Cadastro de clientes
   - Gestão de serviços
   - Geração de propostas comerciais
   - Cálculo de hora técnica (MEI, SN, LP, Autônomo)

### 5. **Auditoria e Compliance**
   - Logs de todas as ações
   - Exportação de dados (LGPD)
   - Relatórios de compliance

## 🐛 Troubleshooting

### Erro: "Connection refused" ao conectar ao MongoDB

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
# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess

# macOS/Linux
lsof -i :3000

# Matar processo
kill -9 <PID>
```

### Erro: "Cannot find module"

```bash
# Limpar cache e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Banco de dados vazio

```bash
# Executar migrations
pnpm db:push

# Ou resetar banco
docker-compose down -v
docker-compose up -d
```

## 🔐 Segurança em Produção

Antes de colocar em produção:

1. **Alterar JWT_SECRET**
   ```env
   JWT_SECRET=gerar-uma-chave-segura-aleatoria-muito-longa
   ```

2. **Alterar credenciais MongoDB**
   - Editar `docker-compose.yml`
   - Mudar `MONGO_INITDB_ROOT_PASSWORD`
   - Atualizar `DATABASE_URL`

3. **Usar HTTPS**
   - Configurar certificado SSL
   - Usar proxy reverso (Nginx)

4. **Backup de Dados**
   ```bash
   docker-compose exec mongodb mongodump --uri="mongodb://admin:blackbelt2024@localhost:27017/blackbelt" --out=/backup
   ```

## 📚 Comandos Úteis

```bash
# Iniciar serviços
docker-compose up -d

# Parar serviços
docker-compose down

# Parar e remover volumes (CUIDADO: deleta dados!)
docker-compose down -v

# Ver logs em tempo real
docker-compose logs -f backend

# Executar comando no container
docker-compose exec backend pnpm db:push

# Acessar shell do MongoDB
docker-compose exec mongodb mongosh -u admin -p blackbelt2024

# Rebuild da imagem
docker-compose build --no-cache

# Limpar tudo
docker-compose down -v
docker system prune -a
```

## 🚀 Deploy em Produção

### Opção 1: VPS (DigitalOcean, Linode, AWS)

```bash
# 1. SSH para o servidor
ssh root@seu-servidor.com

# 2. Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Clonar repositório
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform

# 4. Criar .env com credenciais seguras
nano .env

# 5. Iniciar com Docker Compose
docker-compose up -d

# 6. Configurar Nginx (proxy reverso)
# ... (ver seção de Nginx abaixo)
```

### Opção 2: Railway.app

```bash
# 1. Criar conta em railway.app
# 2. Conectar repositório GitHub
# 3. Configurar variáveis de ambiente
# 4. Deploy automático
```

### Opção 3: Render.com

```bash
# 1. Criar conta em render.com
# 2. Conectar repositório GitHub
# 3. Criar Web Service
# 4. Configurar variáveis de ambiente
# 5. Deploy automático
```

## 🔄 Atualizar Plataforma

```bash
# Puxar últimas mudanças
git pull origin main

# Reinstalar dependências
pnpm install

# Executar migrations
pnpm db:push

# Rebuild e restart
docker-compose down
docker-compose up -d --build
```

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte a documentação em `/docs`
2. Verifique os logs: `docker-compose logs -f`
3. Abra uma issue no GitHub

## 📄 Licença

MIT License - Veja LICENSE para detalhes

---

**Desenvolvido com ❤️ para Black Belt Consultoria**
