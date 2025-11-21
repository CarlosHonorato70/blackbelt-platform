# 🚀 Como Fazer a Plataforma Rodar - Guia Prático

Este é o guia mais rápido e direto para você colocar a **Black Belt Platform** para rodar no seu computador.

## ⚡ Início Rápido (3 Passos)

Se você já tem Node.js, pnpm e MySQL instalados, execute:

```bash
# 1. Clonar e instalar
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform
pnpm install

# 2. Configurar banco de dados
mysql -u root -p -e "CREATE DATABASE blackbelt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
cp .env.example .env
# Edite o .env com suas credenciais do MySQL

# 3. Iniciar
pnpm db:push
pnpm dev
```

✅ **Pronto!** Acesse http://localhost:3000

---

## 📋 Pré-requisitos (Se não tiver instalado)

### 1. Node.js (Obrigatório)

```bash
# Verificar se está instalado
node --version

# Se não estiver, instalar:
# macOS
brew install node@22

# Linux (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Windows
# Baixar de: https://nodejs.org/
```

### 2. pnpm (Obrigatório)

```bash
# Instalar globalmente
npm install -g pnpm@10.4.1

# Verificar instalação
pnpm --version
```

### 3. MySQL (Obrigatório)

```bash
# macOS
brew install mysql
brew services start mysql

# Linux (Ubuntu/Debian)
sudo apt-get install mysql-server
sudo systemctl start mysql

# Windows
# Baixar de: https://dev.mysql.com/downloads/mysql/
```

---

## 🔧 Instalação Passo a Passo

### Passo 1: Clonar o Projeto

```bash
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform
```

### Passo 2: Instalar Dependências

```bash
pnpm install
```

**Aguarde 1-2 minutos** enquanto as dependências são instaladas.

### Passo 3: Criar Banco de Dados

Abra o terminal MySQL:

```bash
mysql -u root -p
```

Execute os comandos SQL:

```sql
CREATE DATABASE blackbelt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'blackbelt_user'@'localhost' IDENTIFIED BY 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON blackbelt.* TO 'blackbelt_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Passo 4: Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env
```

Edite o arquivo `.env` com seu editor preferido:

```env
# Banco de Dados (OBRIGATÓRIO)
DATABASE_URL=mysql://blackbelt_user:sua_senha_aqui@localhost:3306/blackbelt

# Autenticação OAuth (Manter padrão por enquanto)
VITE_APP_ID=proj_blackbelt_platform
VITE_OAUTH_PORTAL_URL=https://vida.butterfly-effect.dev
OAUTH_SERVER_URL=https://vidabiz.butterfly-effect.dev

# Segurança (OBRIGATÓRIO - gerar chave aleatória)
JWT_SECRET=cole_uma_chave_aleatoria_aqui

# Aplicação
VITE_APP_TITLE="Black Belt Platform"
PORT=3000
```

**Gerar JWT Secret:**

```bash
# Linux/macOS
openssl rand -base64 32

# Ou com Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Passo 5: Criar Tabelas no Banco

```bash
pnpm db:push
```

Isso criará **mais de 30 tabelas** necessárias para a plataforma funcionar.

### Passo 6: Iniciar o Servidor

```bash
pnpm dev
```

Você verá algo como:

```
VITE v7.1.9  ready in 1234 ms

  ➜  Local:   http://localhost:3000/
  ➜  press h + enter to show help

Server running on http://localhost:3000
```

### Passo 7: Acessar a Plataforma

Abra seu navegador e acesse:

👉 **http://localhost:3000**

---

## 🎯 O que você verá

A plataforma inclui:

- **Dashboard Principal** - Visão geral do sistema
- **Gestão de Empresas** - Módulo multi-tenant
- **Avaliações NR-01** - Conformidade com riscos psicossociais
- **Precificação Comercial** - Sistema de propostas e orçamentos
- **Relatórios** - Exportação de dados
- **Auditoria** - Logs de todas as ações

---

## ⚙️ Comandos Úteis

```bash
# Desenvolvimento
pnpm dev                 # Iniciar servidor de desenvolvimento
pnpm build              # Compilar para produção
pnpm start              # Executar versão de produção

# Banco de Dados
pnpm db:push            # Aplicar mudanças no banco
pnpm db:generate        # Gerar migrations

# Testes
pnpm test               # Executar todos os testes (113 testes)
pnpm test --watch       # Modo watch para testes

# Qualidade de Código
pnpm check              # Verificar tipos TypeScript
pnpm format             # Formatar código
```

---

## 🔥 Resolução Rápida de Problemas

### ❌ Erro: "Cannot connect to database"

**Solução:**

```bash
# 1. Verificar se MySQL está rodando
sudo systemctl status mysql  # Linux
brew services list          # macOS

# 2. Testar conexão
mysql -u blackbelt_user -p blackbelt

# 3. Verificar .env
cat .env | grep DATABASE_URL
```

### ❌ Erro: "Port 3000 already in use"

**Solução:**

```bash
# Matar processo na porta 3000
lsof -ti:3000 | xargs kill -9  # Linux/macOS
netstat -ano | findstr :3000   # Windows

# Ou usar outra porta no .env
echo "PORT=3001" >> .env
```

### ❌ Erro: "pnpm: command not found"

**Solução:**

```bash
npm install -g pnpm@10.4.1
```

### ❌ Erro: "Module not found"

**Solução:**

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### ❌ Tela branca no navegador

**Solução:**

```bash
# Limpar cache e rebuild
rm -rf dist .vite
pnpm build
pnpm dev
```

---

## 📚 Próximos Passos

Depois que a plataforma estiver rodando:

1. **Explorar a Interface**
   - Navegue pelas diferentes páginas
   - Teste as funcionalidades principais
   - Crie uma empresa de teste (tenant)

2. **Ler a Documentação Completa**
   - [README.md](README.md) - Visão geral da plataforma
   - [SETUP_GUIDE.md](SETUP_GUIDE.md) - Guia detalhado de instalação
   - [TESTING.md](TESTING.md) - Como executar testes
   - [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Problemas comuns

3. **Entender a Arquitetura**
   - [DOCUMENTACAO_TECNICA.md](DOCUMENTACAO_TECNICA.md) - Documentação técnica
   - [DFD_ARQUITETURA.md](DFD_ARQUITETURA.md) - Diagramas de fluxo
   - [CODIGO_CONSOLIDADO.md](CODIGO_CONSOLIDADO.md) - Código comentado

4. **Executar Testes**
   ```bash
   pnpm test
   # Deve passar todos os 113 testes
   ```

---

## 🆘 Precisa de Ajuda?

- **Problemas Comuns:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Issues no GitHub:** https://github.com/CarlosHonorato70/blackbelt-platform/issues
- **Documentação Técnica:** [DOCUMENTACAO_TECNICA.md](DOCUMENTACAO_TECNICA.md)

---

## ✅ Checklist de Verificação

Use este checklist para garantir que tudo está funcionando:

- [ ] Node.js 20+ instalado (`node --version`)
- [ ] pnpm instalado (`pnpm --version`)
- [ ] MySQL rodando (`sudo systemctl status mysql`)
- [ ] Banco de dados `blackbelt` criado
- [ ] Arquivo `.env` configurado
- [ ] Dependências instaladas (`node_modules` existe)
- [ ] Migrations executadas (`pnpm db:push`)
- [ ] Servidor iniciado (`pnpm dev`)
- [ ] Plataforma acessível em http://localhost:3000
- [ ] Testes passando (`pnpm test`)

---

## 🎓 Stack Tecnológico

A plataforma utiliza:

- **Frontend:** React 19 + TypeScript + Tailwind CSS
- **Backend:** Express + tRPC 11
- **Database:** MySQL 8.0 + Drizzle ORM
- **Auth:** OAuth 2.0 (Manus)
- **Testes:** Vitest (113 testes)

---

## 📊 Funcionalidades Principais

### ✅ Conformidade NR-01
- Avaliações de riscos psicossociais
- Matriz de probabilidade × gravidade
- Planos de ação
- Relatórios de compliance

### ✅ Precificação Comercial
- Gestão de clientes
- Catálogo de serviços
- Cálculo de hora técnica (4 regimes tributários)
- Geração de propostas comerciais

### ✅ Multi-Tenant
- Isolamento completo de dados
- Gestão de empresas
- Controle de acesso (RBAC + ABAC)

### ✅ Auditoria e Segurança
- Log de todas as ações
- Conformidade LGPD
- Proteção CSRF
- Row-Level Security (RLS)

---

**Desenvolvido com ❤️ pela Black Belt Consultoria**

_Maestria se alcança através de técnica apurada, disciplina rigorosa e uma busca incansável por ir além do óbvio e reinventar._

---

**Última atualização:** Novembro 2024  
**Versão:** 1.0.0
