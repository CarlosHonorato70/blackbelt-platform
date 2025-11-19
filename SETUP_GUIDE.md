# 🚀 Guia de Instalação - Black Belt Platform

Este guia irá ajudá-lo a configurar e executar a plataforma Black Belt em seu ambiente local.

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** 20.0+ (recomendado: 22.13.0)
- **pnpm** 9.0+ (gerenciador de pacotes)
- **MySQL** 8.0+ (banco de dados)
- **Git** (controle de versão)

### Verificar Instalações

```bash
node --version    # Deve mostrar v20.x ou superior
pnpm --version    # Deve mostrar 9.x ou superior
mysql --version   # Deve mostrar 8.0 ou superior
```

### Instalar Node.js e pnpm

Se não tiver Node.js instalado:
```bash
# Via nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# Ou baixe diretamente de https://nodejs.org/
```

Instalar pnpm:
```bash
npm install -g pnpm@10.4.1
```

## 📦 Passo 1: Clonar o Repositório

```bash
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform
```

## 🔧 Passo 2: Instalar Dependências

```bash
pnpm install
```

Este comando irá:
- Instalar todas as dependências do projeto
- Configurar patches necessários
- Preparar o ambiente de desenvolvimento

**Tempo estimado:** 1-2 minutos

## 🗄️ Passo 3: Configurar Banco de Dados MySQL

### 3.1 Criar Banco de Dados

Conecte-se ao MySQL e crie o banco de dados:

```bash
mysql -u root -p
```

No console MySQL:
```sql
CREATE DATABASE blackbelt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'blackbelt_user'@'localhost' IDENTIFIED BY 'senha_segura_aqui';
GRANT ALL PRIVILEGES ON blackbelt.* TO 'blackbelt_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3.2 Verificar Conexão

```bash
mysql -u blackbelt_user -p blackbelt
```

## ⚙️ Passo 4: Configurar Variáveis de Ambiente

### 4.1 Copiar Arquivo de Exemplo

```bash
cp .env.example .env
```

### 4.2 Editar Arquivo .env

Abra o arquivo `.env` e configure as variáveis:

```env
# ============================================
# CONFIGURAÇÕES DO BANCO DE DADOS
# ============================================
DATABASE_URL=mysql://blackbelt_user:senha_segura_aqui@localhost:3306/blackbelt

# ============================================
# CONFIGURAÇÕES DE AUTENTICAÇÃO (OAuth)
# ============================================
VITE_APP_ID=proj_blackbelt_platform
VITE_OAUTH_PORTAL_URL=https://vida.butterfly-effect.dev
OAUTH_SERVER_URL=https://vidabiz.butterfly-effect.dev

# ============================================
# SEGURANÇA
# ============================================
JWT_SECRET=gere_um_token_secreto_aleatorio_aqui_min_32_caracteres

# ============================================
# CONFIGURAÇÕES DA APLICAÇÃO
# ============================================
VITE_APP_TITLE="Black Belt Platform"
VITE_APP_LOGO="https://placehold.co/40x40/3b82f6/ffffff?text=BB"
PORT=3000

# ============================================
# OPENAI (Opcional - para recursos de IA)
# ============================================
OPENAI_API_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-proj-your-key-here

# ============================================
# ANALYTICS (Opcional)
# ============================================
VITE_ANALYTICS_ENDPOINT=https://umami.dev.ops.butterfly-effect.dev
VITE_ANALYTICS_WEBSITE_ID=analytics_blackbelt
```

### 4.3 Gerar JWT Secret Seguro

```bash
# Opção 1: Usando openssl
openssl rand -base64 32

# Opção 2: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Copie o resultado e cole em JWT_SECRET
```

## 🔄 Passo 5: Executar Migrations do Banco de Dados

```bash
pnpm db:push
```

Este comando irá:
- Gerar o schema do banco de dados
- Criar todas as tabelas necessárias (30+ tabelas)
- Configurar índices e relacionamentos

**Importante:** Certifique-se de que o MySQL está rodando e o DATABASE_URL está correto.

### Verificar Tabelas Criadas

```bash
mysql -u blackbelt_user -p blackbelt -e "SHOW TABLES;"
```

Você deve ver tabelas como:
- users
- tenants
- sectors
- people
- riskAssessments
- clients
- services
- proposals
- etc.

## 🎯 Passo 6: Iniciar o Servidor de Desenvolvimento

```bash
pnpm dev
```

Este comando irá:
- Iniciar o servidor backend (Express + tRPC)
- Iniciar o servidor frontend (Vite + React)
- Habilitar hot-reload para desenvolvimento
- Abrir a aplicação em http://localhost:3000

**Output esperado:**
```
VITE v7.1.9  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help

Server running on http://localhost:3000
```

## ✅ Passo 7: Verificar Instalação

### 7.1 Acessar a Aplicação

Abra seu navegador e acesse: http://localhost:3000

Você deve ver a página inicial da Black Belt Platform.

### 7.2 Executar Testes

```bash
pnpm test
```

**Output esperado:**
```
✓ server/__tests__/pricing-calculations.test.ts (23 tests)
✓ server/__tests__/data-validation.test.ts (57 tests)
✓ server/__tests__/business-logic.test.ts (33 tests)

Test Files  3 passed (3)
Tests  113 passed (113)
```

### 7.3 Verificar Build

```bash
pnpm build
```

Este comando deve compilar a aplicação sem erros.

## 🔧 Comandos Úteis

### Desenvolvimento
```bash
pnpm dev          # Iniciar servidor de desenvolvimento
pnpm build        # Build para produção
pnpm start        # Executar versão de produção
pnpm check        # Verificar tipos TypeScript
```

### Banco de Dados
```bash
pnpm db:push      # Executar migrations
pnpm db:generate  # Gerar migrations
```

### Testes e Qualidade
```bash
pnpm test              # Executar testes
pnpm test --watch      # Modo watch
pnpm test --coverage   # Com cobertura
pnpm format            # Formatar código
```

## 🐛 Solução de Problemas

### Erro: "Cannot connect to database"

**Problema:** Não consegue conectar ao MySQL.

**Soluções:**
1. Verifique se o MySQL está rodando:
   ```bash
   sudo systemctl status mysql  # Linux
   brew services list           # macOS
   ```

2. Verifique o DATABASE_URL no arquivo .env
3. Teste a conexão manualmente:
   ```bash
   mysql -u blackbelt_user -p blackbelt
   ```

### Erro: "pnpm: command not found"

**Problema:** pnpm não está instalado.

**Solução:**
```bash
npm install -g pnpm@10.4.1
```

### Erro: "Port 3000 already in use"

**Problema:** A porta 3000 já está em uso.

**Soluções:**
1. Parar o processo que está usando a porta:
   ```bash
   # Linux/macOS
   lsof -ti:3000 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   ```

2. Ou mudar a porta no arquivo .env:
   ```env
   PORT=3001
   ```

### Erro: "Module not found"

**Problema:** Dependências não instaladas corretamente.

**Solução:**
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Erro nas Migrations

**Problema:** Erro ao executar `pnpm db:push`.

**Soluções:**
1. Verificar se o banco de dados existe
2. Verificar permissões do usuário MySQL
3. Limpar e recriar o banco:
   ```sql
   DROP DATABASE IF EXISTS blackbelt;
   CREATE DATABASE blackbelt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
4. Executar novamente: `pnpm db:push`

### Erro: "ENOSPC: System limit for number of file watchers reached"

**Problema:** Limite de watchers do sistema (Linux).

**Solução:**
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 📊 Estrutura Após Instalação

```
blackbelt-platform/
├── .env                    ✅ Criado por você
├── node_modules/           ✅ Criado por pnpm install
├── dist/                   ✅ Criado por pnpm build
├── client/                 📂 Frontend (React)
├── server/                 📂 Backend (Express + tRPC)
├── drizzle/                📂 Schema e migrations
├── package.json            📄 Dependências
└── README.md               📄 Documentação
```

## 🎓 Próximos Passos

Após a instalação bem-sucedida:

1. **Explorar a Aplicação**
   - Dashboard: http://localhost:3000
   - Gestão de Empresas (Tenants)
   - Avaliações NR-01
   - Precificação Comercial

2. **Ler Documentação**
   - [TESTING.md](TESTING.md) - Como testar
   - [TESTING_QUICKSTART.md](TESTING_QUICKSTART.md) - Início rápido
   - [DOCUMENTACAO_TECNICA.md](DOCUMENTACAO_TECNICA.md) - Documentação técnica

3. **Desenvolver**
   - Criar novas features
   - Adicionar testes
   - Contribuir para o projeto

## 🆘 Precisa de Ajuda?

- **Issues**: https://github.com/CarlosHonorato70/blackbelt-platform/issues
- **Documentação**: Veja os arquivos `.md` no repositório
- **Testes**: Execute `pnpm test` para verificar se tudo está funcionando

## 📝 Checklist de Instalação

Use este checklist para garantir que tudo foi configurado:

- [ ] Node.js 20+ instalado
- [ ] pnpm instalado
- [ ] MySQL 8.0+ instalado e rodando
- [ ] Repositório clonado
- [ ] Dependências instaladas (`pnpm install`)
- [ ] Banco de dados criado
- [ ] Arquivo `.env` configurado
- [ ] Migrations executadas (`pnpm db:push`)
- [ ] Servidor de desenvolvimento rodando (`pnpm dev`)
- [ ] Aplicação acessível em http://localhost:3000
- [ ] Testes passando (`pnpm test`)

## 🎉 Sucesso!

Se você chegou até aqui e completou todos os passos, parabéns! A Black Belt Platform está rodando em seu ambiente local.

**Acesse:** http://localhost:3000

---

**Desenvolvido com ❤️ pela Black Belt Consultoria**

*Última atualização: Novembro 2024*
