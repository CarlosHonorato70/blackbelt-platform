# 🔧 Guia de Solução de Problemas - Black Belt Platform

Este guia ajuda a resolver problemas comuns ao configurar e executar a plataforma.

## 📋 Índice

1. [Problemas de Instalação](#problemas-de-instalação)
2. [Problemas com Banco de Dados](#problemas-com-banco-de-dados)
3. [Problemas com Servidor](#problemas-com-servidor)
4. [Problemas com Testes](#problemas-com-testes)
5. [Problemas de Performance](#problemas-de-performance)
6. [Logs e Debugging](#logs-e-debugging)

---

## 1. Problemas de Instalação

### ❌ Erro: "pnpm: command not found"

**Causa:** pnpm não está instalado globalmente.

**Solução:**

```bash
npm install -g pnpm@10.4.1
```

Verificar instalação:

```bash
pnpm --version
```

---

### ❌ Erro: "EACCES: permission denied"

**Causa:** Permissões insuficientes para instalação global.

**Solução (Linux/macOS):**

```bash
# Opção 1: Usar sudo
sudo npm install -g pnpm@10.4.1

# Opção 2: Mudar diretório npm global
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g pnpm@10.4.1
```

**Solução (Windows):**
Execute o terminal como Administrador.

---

### ❌ Erro: "Module not found" após pnpm install

**Causa:** Instalação incompleta ou cache corrompido.

**Solução:**

```bash
# Limpar cache e reinstalar
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

---

### ❌ Erro: "ERESOLVE unable to resolve dependency tree"

**Causa:** Conflitos de versões de dependências.

**Solução:**

```bash
# Forçar resolução
pnpm install --force

# Ou limpar cache
pnpm store prune
pnpm install
```

---

## 2. Problemas com Banco de Dados

### ❌ Erro: "Cannot connect to database"

**Causa:** MySQL não está rodando ou credenciais incorretas.

**Diagnóstico:**

```bash
# Verificar se MySQL está rodando
# Linux
sudo systemctl status mysql

# macOS
brew services list | grep mysql

# Windows
net start | findstr MySQL
```

**Soluções:**

1. **Iniciar MySQL:**

   ```bash
   # Linux
   sudo systemctl start mysql

   # macOS
   brew services start mysql

   # Windows
   net start MySQL80
   ```

2. **Verificar credenciais:**

   ```bash
   mysql -u blackbelt_user -p
   # Deve conectar sem erros
   ```

3. **Verificar DATABASE_URL no .env:**

   ```env
   # Formato correto:
   DATABASE_URL=mysql://usuario:senha@host:porta/database

   # Exemplo:
   DATABASE_URL=mysql://blackbelt_user:senha123@localhost:3306/blackbelt
   ```

4. **Testar conexão:**
   ```bash
   # No diretório do projeto
   node -e "
   const mysql = require('mysql2');
   const url = process.env.DATABASE_URL || 'mysql://blackbelt_user:senha@localhost:3306/blackbelt';
   const conn = mysql.createConnection(url);
   conn.connect(err => {
     if (err) console.error('❌ Erro:', err.message);
     else console.log('✓ Conexão bem-sucedida!');
     conn.end();
   });
   "
   ```

---

### ❌ Erro: "Access denied for user"

**Causa:** Usuário não tem permissões ou senha incorreta.

**Solução:**

```sql
-- Conectar como root
mysql -u root -p

-- Recriar usuário com permissões
DROP USER IF EXISTS 'blackbelt_user'@'localhost';
CREATE USER 'blackbelt_user'@'localhost' IDENTIFIED BY 'sua_senha_segura';
GRANT ALL PRIVILEGES ON blackbelt.* TO 'blackbelt_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Atualizar .env com a nova senha.

---

### ❌ Erro: "Unknown database 'blackbelt'"

**Causa:** Banco de dados não foi criado.

**Solução:**

```bash
mysql -u root -p -e "CREATE DATABASE blackbelt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

### ❌ Erro ao executar migrations (pnpm db:push)

**Causa:** Schema incompatível ou banco corrompido.

**Solução:**

```bash
# Opção 1: Resetar banco de dados
mysql -u root -p -e "DROP DATABASE IF EXISTS blackbelt; CREATE DATABASE blackbelt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
pnpm db:push

# Opção 2: Forçar regeneração
rm -rf drizzle/migrations/*
pnpm db:push
```

---

### ❌ Erro: "Table already exists"

**Causa:** Tentativa de criar tabelas que já existem.

**Solução:**

```bash
# Ver tabelas existentes
mysql -u blackbelt_user -p blackbelt -e "SHOW TABLES;"

# Se necessário, dropar e recriar
mysql -u root -p -e "DROP DATABASE blackbelt; CREATE DATABASE blackbelt CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
pnpm db:push
```

---

## 3. Problemas com Servidor

### ❌ Erro: "Port 3000 already in use"

**Causa:** Outra aplicação está usando a porta 3000.

**Solução 1 - Matar processo:**

```bash
# Linux/macOS
lsof -ti:3000 | xargs kill -9

# Ou identificar processo
lsof -i:3000

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Solução 2 - Usar outra porta:**

```env
# No arquivo .env
PORT=3001
```

```bash
pnpm dev
# Acessar http://localhost:3001
```

---

### ❌ Erro: "EADDRINUSE: address already in use"

**Causa:** Servidor anterior não foi encerrado.

**Solução:**

```bash
# Parar todos os processos Node
pkill -f "node.*tsx"
pkill -f "vite"

# Reiniciar
pnpm dev
```

---

### ❌ Erro: "Cannot find module"

**Causa:** Build desatualizado ou módulos faltando.

**Solução:**

```bash
# Reinstalar dependências
rm -rf node_modules
pnpm install

# Limpar cache de build
rm -rf dist
rm -rf .vite

# Reiniciar servidor
pnpm dev
```

---

### ❌ Página em branco no navegador

**Causa:** Erro no JavaScript do frontend.

**Diagnóstico:**

1. Abrir DevTools (F12)
2. Ver aba Console para erros
3. Ver aba Network para problemas de requisição

**Solução:**

```bash
# Limpar cache do navegador
# Ou forçar refresh: Ctrl+Shift+R (Windows/Linux) ou Cmd+Shift+R (macOS)

# Verificar logs do servidor
# Deve mostrar erros específicos

# Rebuild
pnpm build
pnpm dev
```

---

## 4. Problemas com Testes

### ❌ Testes falhando

**Causa:** Dependências de teste ou configuração incorreta.

**Solução:**

```bash
# Limpar cache de testes
rm -rf node_modules/.vitest

# Reinstalar e executar
pnpm install
pnpm test
```

---

### ❌ Erro: "Cannot find module" nos testes

**Causa:** Paths ou imports incorretos.

**Solução:**

```bash
# Verificar tsconfig.json
# Verificar vitest.config.ts

# Executar com debug
pnpm test --reporter=verbose
```

---

### ❌ Testes lentos

**Causa:** Muitos testes ou recursos insuficientes.

**Solução:**

```bash
# Executar testes em paralelo (padrão)
pnpm test

# Ou específicos
pnpm test pricing-calculations

# Com timeout maior
pnpm test --testTimeout=10000
```

---

## 5. Problemas de Performance

### 🐌 Aplicação lenta

**Diagnóstico:**

```bash
# Verificar uso de CPU/memória
top
htop

# Verificar processos Node
ps aux | grep node
```

**Soluções:**

1. Verificar queries lentas no banco
2. Adicionar índices nas tabelas
3. Otimizar imports de componentes
4. Usar lazy loading

---

### 🐌 Banco de dados lento

**Solução:**

```sql
-- Ver queries lentas
SHOW PROCESSLIST;

-- Otimizar tabelas
OPTIMIZE TABLE tenants;
OPTIMIZE TABLE sectors;
OPTIMIZE TABLE people;

-- Analisar queries
EXPLAIN SELECT * FROM tenants WHERE status = 'active';
```

---

## 6. Logs e Debugging

### 📝 Ver logs do servidor

```bash
# Durante desenvolvimento
pnpm dev
# Logs aparecem no terminal

# Ver logs de erro específicos
NODE_ENV=development pnpm dev 2>&1 | grep -i error
```

---

### 🔍 Debugging com VS Code

**launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

### 🔍 Debugging do banco de dados

```bash
# Habilitar logs de queries no MySQL
# my.cnf ou my.ini:
[mysqld]
general_log = 1
general_log_file = /var/log/mysql/query.log

# Ver logs
tail -f /var/log/mysql/query.log
```

---

## 🆘 Ainda com Problemas?

### Passos de Diagnóstico Completo

1. **Verificar versões:**

   ```bash
   node --version    # 20.0+
   pnpm --version    # 9.0+
   mysql --version   # 8.0+
   ```

2. **Limpar tudo e recomeçar:**

   ```bash
   rm -rf node_modules
   rm pnpm-lock.yaml
   rm -rf dist
   rm -rf .vite
   pnpm install
   ```

3. **Verificar configuração:**

   ```bash
   cat .env | grep -v "^#"
   ```

4. **Testar componentes:**

   ```bash
   # Testar conexão DB
   mysql -u blackbelt_user -p blackbelt -e "SELECT 1;"

   # Testar servidor
   curl http://localhost:3000

   # Testar testes
   pnpm test
   ```

5. **Coletar informações:**

   ```bash
   # Sistema operacional
   uname -a

   # Memória disponível
   free -h

   # Espaço em disco
   df -h
   ```

---

## 📞 Obter Ajuda

Se nenhuma solução funcionou:

1. **Issues no GitHub:**
   - Criar issue em: https://github.com/CarlosHonorato70/blackbelt-platform/issues
   - Incluir:
     - Sistema operacional
     - Versões (Node, pnpm, MySQL)
     - Mensagem de erro completa
     - Passos para reproduzir

2. **Informações úteis para reportar:**
   ```bash
   # Coletar informações do sistema
   node --version > debug-info.txt
   pnpm --version >> debug-info.txt
   mysql --version >> debug-info.txt
   cat .env | grep -v "PASSWORD\|SECRET" >> debug-info.txt
   pnpm list >> debug-info.txt
   ```

---

## ✅ Checklist de Verificação

Use este checklist para verificar problemas comuns:

- [ ] Node.js 20+ instalado
- [ ] pnpm instalado globalmente
- [ ] MySQL rodando
- [ ] Banco de dados criado
- [ ] Usuário MySQL com permissões
- [ ] Arquivo .env configurado
- [ ] DATABASE_URL correto
- [ ] JWT_SECRET configurado
- [ ] Porta 3000 disponível
- [ ] node_modules existe
- [ ] Migrations executadas
- [ ] Testes passando

---

**Última atualização:** Novembro 2024
