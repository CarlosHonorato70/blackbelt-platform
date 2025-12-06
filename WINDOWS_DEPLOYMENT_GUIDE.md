# 🪟 Guia de Implantação no Windows com GitBash

Este guia fornece instruções detalhadas para implantar a plataforma BlackBelt em um ambiente Windows usando GitBash.

## 📋 Pré-requisitos

### Software Necessário

1. **Git para Windows** (com GitBash)
   - Download: https://git-scm.com/download/win
   - Versão mínima: 2.30+

2. **Node.js**
   - Download: https://nodejs.org/
   - Versão recomendada: 18.x LTS ou 20.x LTS
   - Inclui npm automaticamente

3. **MySQL/MariaDB**
   - MySQL: https://dev.mysql.com/downloads/installer/
   - MariaDB: https://mariadb.org/download/
   - Versão recomendada: MySQL 8.0+ ou MariaDB 10.6+

4. **Visual Studio Code** (opcional, mas recomendado)
   - Download: https://code.visualstudio.com/

### Verificação de Instalação

Abra o GitBash e execute:

```bash
# Verificar Git
git --version
# Esperado: git version 2.x.x

# Verificar Node.js
node --version
# Esperado: v18.x.x ou v20.x.x

# Verificar npm
npm --version
# Esperado: 9.x.x ou 10.x.x

# Verificar MySQL
mysql --version
# Esperado: mysql Ver 8.0.x
```

---

## 🚀 Passo 1: Clonar o Repositório

```bash
# Abra o GitBash
# Navegue até o diretório desejado
cd /c/Projects

# Clone o repositório
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git

# Entre no diretório
cd blackbelt-platform

# Verifique a branch atual
git branch
```

---

## 🔧 Passo 2: Configurar o Banco de Dados

### 2.1 Criar o Banco de Dados

Abra o MySQL Workbench ou GitBash:

```bash
# Conectar ao MySQL via GitBash
mysql -u root -p

# Dentro do MySQL, execute:
CREATE DATABASE blackbelt_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Criar usuário (opcional, mas recomendado)
CREATE USER 'blackbelt_user'@'localhost' IDENTIFIED BY 'sua_senha_segura_aqui';

# Conceder privilégios
GRANT ALL PRIVILEGES ON blackbelt_platform.* TO 'blackbelt_user'@'localhost';

# Aplicar mudanças
FLUSH PRIVILEGES;

# Sair do MySQL
EXIT;
```

### 2.2 Verificar Conexão

```bash
# Teste a conexão com o novo usuário
mysql -u blackbelt_user -p blackbelt_platform
# Digite a senha quando solicitado

# Se conectou com sucesso, saia:
EXIT;
```

---

## 📦 Passo 3: Instalar Dependências

```bash
# No diretório raiz do projeto (blackbelt-platform)

# Limpar cache do npm (recomendado)
npm cache clean --force

# Instalar dependências
npm install

# Aguarde a conclusão (pode levar alguns minutos)
# Você verá: "added XXX packages"
```

### Solução de Problemas Comuns

**Erro: "EACCES: permission denied"**
```bash
# Execute o GitBash como Administrador
# Ou ajuste permissões:
npm config set unsafe-perm true
```

**Erro: "gyp ERR! build error"**
```bash
# Instale as ferramentas de build do Windows
npm install --global windows-build-tools
```

**Erro de certificado SSL**
```bash
# Desabilite SSL temporariamente (não recomendado para produção)
npm config set strict-ssl false
```

---

## ⚙️ Passo 4: Configurar Variáveis de Ambiente

### 4.1 Criar Arquivo .env

```bash
# Copiar o template de exemplo
cp .env.example .env

# Ou se não existir .env.example:
touch .env
```

### 4.2 Editar o Arquivo .env

Abra o arquivo `.env` no seu editor preferido:

```bash
# Abrir com VSCode
code .env

# Ou usar nano no GitBash
nano .env

# Ou Notepad
notepad .env
```

### 4.3 Configurações Necessárias

Adicione as seguintes configurações ao `.env`:

```env
# === CONFIGURAÇÃO DO BANCO DE DADOS ===
DATABASE_URL="mysql://blackbelt_user:sua_senha_segura_aqui@localhost:3306/blackbelt_platform"

# === CONFIGURAÇÃO DO SERVIDOR ===
NODE_ENV=production
PORT=3000
APP_URL=http://localhost:3000
APP_DOMAIN=localhost

# === SEGURANÇA ===
JWT_SECRET=gere_uma_chave_secreta_muito_longa_e_aleatoria_aqui_com_minimo_32_caracteres
SESSION_SECRET=outra_chave_secreta_diferente_minimo_32_caracteres

# === EMAIL (Configure seu provedor) ===
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_de_app_do_gmail
EMAIL_FROM=noreply@blackbelt-platform.com

# === STRIPE (Pagamentos) ===
STRIPE_SECRET_KEY=sk_test_seu_stripe_secret_key_aqui
STRIPE_PUBLISHABLE_KEY=pk_test_seu_stripe_publishable_key_aqui
STRIPE_WEBHOOK_SECRET=whsec_seu_webhook_secret_aqui

# === MERCADO PAGO (Pagamentos Brasil) ===
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui

# === ARMAZENAMENTO (Opcional - S3) ===
AWS_ACCESS_KEY_ID=sua_access_key_aqui
AWS_SECRET_ACCESS_KEY=sua_secret_key_aqui
AWS_REGION=us-east-1
AWS_BUCKET_NAME=blackbelt-platform-uploads

# === LOGS E MONITORAMENTO (Opcional) ===
SENTRY_DSN=seu_sentry_dsn_aqui_opcional
LOG_LEVEL=info
```

### 4.4 Gerar Chaves Secretas

```bash
# No GitBash, gere chaves aleatórias seguras:

# Método 1: Usando OpenSSL (incluído no GitBash)
openssl rand -base64 32

# Método 2: Usando Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Use saídas diferentes para JWT_SECRET e SESSION_SECRET
```

---

## 🗄️ Passo 5: Executar Migrações do Banco de Dados

### 5.1 Ordem das Migrações

Execute as migrações na ordem correta:

```bash
# Verificar se os arquivos existem
ls -l drizzle/*.sql

# Executar cada migração manualmente no MySQL
# Substitua os nomes pelos arquivos reais do seu projeto
mysql -u blackbelt_user -p blackbelt_platform < drizzle/0000_initial_migration.sql
mysql -u blackbelt_user -p blackbelt_platform < drizzle/0001_add_tenants.sql
mysql -u blackbelt_user -p blackbelt_platform < drizzle/0002_add_users.sql
mysql -u blackbelt_user -p blackbelt_platform < drizzle/0003_add_subscriptions.sql
mysql -u blackbelt_user -p blackbelt_platform < drizzle/0004_add_assessments.sql
# ... continue com todas as migrações

# Migrações das Fases 5-10:
mysql -u blackbelt_user -p blackbelt_platform < drizzle/0010_phase5_white_label.sql
mysql -u blackbelt_user -p blackbelt_platform < drizzle/0011_phase6_webhooks_api.sql
mysql -u blackbelt_user -p blackbelt_platform < drizzle/0012_phase7_security.sql
mysql -u blackbelt_user -p blackbelt_platform < drizzle/0013_phase10_onboarding.sql
```

### 5.2 Verificar Migrações

```bash
# Conectar ao banco de dados
mysql -u blackbelt_user -p blackbelt_platform

# Listar todas as tabelas
SHOW TABLES;

# Verificar estrutura de uma tabela específica
DESCRIBE tenants;

# Contar registros (deve estar vazio inicialmente)
SELECT COUNT(*) FROM tenants;

# Sair
EXIT;
```

### 5.3 Script Automatizado (Opcional)

Crie um arquivo `migrate.sh`:

```bash
# Criar arquivo de migração
cat > migrate.sh << 'EOF'
#!/bin/bash

echo "🗄️  Executando migrações do banco de dados..."

DB_USER="blackbelt_user"
DB_PASS="sua_senha_aqui"
DB_NAME="blackbelt_platform"

for file in drizzle/*.sql; do
    if [ -f "$file" ]; then
        echo "Executando: $file"
        mysql -u $DB_USER -p$DB_PASS $DB_NAME < "$file"
        if [ $? -eq 0 ]; then
            echo "✅ $file - Sucesso"
        else
            echo "❌ $file - Falhou"
            exit 1
        fi
    fi
done

echo "✅ Todas as migrações concluídas!"
EOF

# Dar permissão de execução
chmod +x migrate.sh

# Executar
./migrate.sh
```

---

## 🏗️ Passo 6: Compilar o Projeto

### 6.1 Compilar TypeScript

```bash
# Compilar o código TypeScript para JavaScript
npm run build

# Aguarde a compilação
# Você verá: "Build completed successfully"
```

### 6.2 Verificar Saída

```bash
# Verificar os arquivos compilados
ls -l dist/

# Você deve ver arquivos .js compilados
```

### 6.3 Solução de Erros de Compilação

**Erro: "Cannot find module"**
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

**Erro: "TypeScript version mismatch"**
```bash
# Instalar TypeScript globalmente
npm install -g typescript

# Ou usar a versão local
npx tsc --version
```

---

## 🧪 Passo 7: Executar Testes (Opcional)

```bash
# Executar suite de testes
npm test

# Executar testes específicos
npm test -- --grep "authentication"

# Executar com cobertura
npm run test:coverage
```

---

## 🚀 Passo 8: Iniciar o Servidor

### 8.1 Modo Desenvolvimento

```bash
# Iniciar em modo desenvolvimento (com hot-reload)
npm run dev

# Você verá:
# Server running on http://localhost:3000
# Database connected successfully
```

### 8.2 Modo Produção

```bash
# Compilar e iniciar em produção
npm run build
npm start

# Ou usar PM2 para gerenciamento de processos
npm install -g pm2
pm2 start dist/index.js --name blackbelt-platform
pm2 save
pm2 startup
```

### 8.3 Verificar Status

```bash
# Testar o servidor
curl http://localhost:3000/api/v1/health

# Ou abrir no navegador:
# http://localhost:3000

# Ver logs em tempo real (se usando PM2)
pm2 logs blackbelt-platform
```

---

## 🔒 Passo 9: Configurações de Segurança

### 9.1 Firewall do Windows

```powershell
# Abra PowerShell como Administrador e execute:

# Permitir porta 3000 (ou sua porta configurada)
New-NetFirewallRule -DisplayName "BlackBelt Platform" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### 9.2 HTTPS/SSL (Produção)

Para produção, use um certificado SSL. No Windows, você pode usar:

1. **IIS com ARR (Application Request Routing)**
2. **nginx for Windows**
3. **Cloudflare** (proxy reverso)

Exemplo com nginx:

```nginx
# C:\nginx\conf\nginx.conf

server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;

    ssl_certificate C:/nginx/ssl/certificate.crt;
    ssl_certificate_key C:/nginx/ssl/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 Passo 10: Monitoramento e Logs

### 10.1 Configurar Winston para Logs

Os logs são salvos automaticamente em:
- `logs/error.log` - Erros
- `logs/combined.log` - Todos os logs
- `logs/access.log` - Requisições HTTP

```bash
# Ver logs em tempo real
tail -f logs/combined.log

# Ver últimas 100 linhas
tail -n 100 logs/error.log

# Buscar por palavra-chave
grep "ERROR" logs/combined.log
```

### 10.2 PM2 Monitoramento

```bash
# Dashboard do PM2
pm2 monit

# Status de todos os processos
pm2 status

# Informações detalhadas
pm2 info blackbelt-platform

# Logs
pm2 logs blackbelt-platform --lines 100
```

---

## 🔄 Passo 11: Backup e Restauração

### 11.1 Backup do Banco de Dados

```bash
# Criar backup
mysqldump -u blackbelt_user -p blackbelt_platform > backup_$(date +%Y%m%d_%H%M%S).sql

# Ou com compressão
mysqldump -u blackbelt_user -p blackbelt_platform | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 11.2 Restaurar Backup

```bash
# Restaurar de backup
mysql -u blackbelt_user -p blackbelt_platform < backup_20241206_150000.sql

# Ou de arquivo comprimido
gunzip < backup_20241206_150000.sql.gz | mysql -u blackbelt_user -p blackbelt_platform
```

### 11.3 Script de Backup Automatizado

```bash
# Criar script de backup automático
cat > backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/c/Backups/blackbelt"
DATE=$(date +%Y%m%d_%H%M%S)
DB_USER="blackbelt_user"
DB_PASS="sua_senha_aqui"
DB_NAME="blackbelt_platform"

mkdir -p $BACKUP_DIR

echo "🗄️  Criando backup do banco de dados..."
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

echo "📁 Criando backup dos uploads..."
tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz uploads/

echo "✅ Backup concluído: $BACKUP_DIR"

# Manter apenas últimos 7 backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x backup.sh

# Executar backup
./backup.sh
```

### 11.4 Agendar Backups Automáticos

No Windows, use o Agendador de Tarefas:

1. Abra o "Agendador de Tarefas" do Windows
2. Crie uma nova tarefa
3. Configure para executar diariamente
4. Ação: `C:\Program Files\Git\bin\bash.exe`
5. Argumentos: `/c/Projects/blackbelt-platform/backup.sh`

---

## 🌐 Passo 12: Configurar Domínio (Opcional)

### 12.1 DNS Local (Desenvolvimento)

Edite o arquivo hosts:

```bash
# Abrir Notepad como Administrador
# Editar: C:\Windows\System32\drivers\etc\hosts

# Adicionar linha:
127.0.0.1 blackbelt.local
```

Agora acesse: `http://blackbelt.local:3000`

### 12.2 Domínio Público (Produção)

1. Configure DNS no seu provedor:
   ```
   A Record: @ → seu_ip_publico
   A Record: www → seu_ip_publico
   ```

2. Configure port forwarding no roteador:
   - Porta externa: 80 → Porta interna: 3000
   - Porta externa: 443 → Porta interna: 3000

3. Atualize `.env`:
   ```env
   APP_URL=https://seu-dominio.com
   APP_DOMAIN=seu-dominio.com
   ```

---

## 📱 Passo 13: Primeiros Passos Após Instalação

### 13.1 Criar Usuário Admin

```bash
# Conectar ao banco de dados
mysql -u blackbelt_user -p blackbelt_platform

# Criar primeiro usuário admin
INSERT INTO users (name, email, password, role, active) 
VALUES ('Admin', 'admin@blackbelt.com', 'senha_hash_aqui', 'admin', 1);

# Ou use a API de registro
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin",
    "email": "admin@blackbelt.com",
    "password": "SenhaSegura123!"
  }'
```

### 13.2 Acessar Dashboard

1. Abra o navegador: `http://localhost:3000`
2. Faça login com as credenciais criadas
3. Complete o wizard de onboarding (Fase 10)
4. Explore os recursos da plataforma

---

## 🛠️ Comandos Úteis de Manutenção

```bash
# Ver processos Node.js em execução
ps aux | grep node

# Matar processo específico
kill -9 <PID>

# Limpar cache do npm
npm cache clean --force

# Atualizar dependências
npm update

# Verificar dependências vulneráveis
npm audit

# Corrigir vulnerabilidades
npm audit fix

# Reiniciar servidor (PM2)
pm2 restart blackbelt-platform

# Parar servidor (PM2)
pm2 stop blackbelt-platform

# Remover processo (PM2)
pm2 delete blackbelt-platform

# Ver uso de memória
pm2 monit
```

---

## 🐛 Solução de Problemas Comuns

### Problema: "Cannot connect to database"

**Solução:**
```bash
# Verificar se MySQL está rodando
sc query MySQL80  # ou MariaDB

# Iniciar MySQL se necessário
net start MySQL80

# Testar conexão
mysql -u blackbelt_user -p -e "SELECT 1"
```

### Problema: "Port 3000 already in use"

**Solução:**
```bash
# Encontrar processo usando a porta
netstat -ano | findstr :3000

# Matar processo
taskkill /PID <PID> /F

# Ou mudar a porta no .env
PORT=3001
```

### Problema: "npm install falha"

**Solução:**
```bash
# Limpar cache
npm cache clean --force

# Deletar node_modules e package-lock.json
rm -rf node_modules package-lock.json

# Reinstalar
npm install

# Se persistir, use --legacy-peer-deps
npm install --legacy-peer-deps
```

### Problema: "Permission denied"

**Solução:**
```bash
# Execute GitBash como Administrador
# Ou ajuste permissões:
icacls "C:\Projects\blackbelt-platform" /grant Users:F /T
```

### Problema: "MySQL connection timeout"

**Solução:**
```bash
# Verificar configuração do MySQL
mysql -u root -p -e "SHOW VARIABLES LIKE 'max_connections'"

# Aumentar timeout no .env
DATABASE_CONNECTION_TIMEOUT=30000
```

---

## 📈 Otimizações de Performance

### 1. Configurar PM2 Cluster Mode

```bash
# pm2.config.js
module.exports = {
  apps: [{
    name: 'blackbelt-platform',
    script: './dist/index.js',
    instances: 'max',  // Usa todos os CPUs
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
};

# Iniciar com config
pm2 start pm2.config.js
```

### 2. Configurar Cache Redis (Opcional)

```bash
# Instalar Redis para Windows
# Download: https://github.com/microsoftarchive/redis/releases

# Instalar cliente Redis
npm install redis

# Adicionar ao .env
REDIS_URL=redis://localhost:6379
```

### 3. Otimizar MySQL

```sql
-- my.ini (C:\ProgramData\MySQL\MySQL Server 8.0\my.ini)
[mysqld]
innodb_buffer_pool_size = 1G
max_connections = 500
query_cache_type = 1
query_cache_size = 256M
```

---

## 🎯 Checklist Final de Implantação

- [ ] GitBash instalado e configurado
- [ ] Node.js instalado (v18+ ou v20+)
- [ ] MySQL instalado e rodando
- [ ] Repositório clonado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env` configurado
- [ ] Chaves secretas geradas (JWT, SESSION)
- [ ] Banco de dados criado
- [ ] Migrações executadas (todas as 13 migrações)
- [ ] Projeto compilado (`npm run build`)
- [ ] Testes executados (`npm test`)
- [ ] Servidor iniciado (`npm start` ou PM2)
- [ ] Verificação de saúde OK (`/api/v1/health`)
- [ ] Usuário admin criado
- [ ] Firewall configurado (porta 3000)
- [ ] Backup configurado
- [ ] Logs funcionando
- [ ] SSL configurado (produção)
- [ ] Domínio configurado (produção)

---

## 📚 Recursos Adicionais

### Documentação das Fases

- `PHASE5_WHITE_LABEL_GUIDE.md` - White-label branding
- `PHASE6_IMPLEMENTATION_GUIDE.md` - Webhooks e API
- `PHASE7_SECURITY_GUIDE.md` - Segurança 2FA/IP
- `PHASE8_ANALYTICS_GUIDE.md` - Analytics e dashboards
- `PHASE9_MOBILE_GUIDE.md` - App mobile React Native
- `PHASE10_ONBOARDING_GUIDE.md` - Onboarding wizard
- `PRODUCTION_READINESS_REPORT.md` - Relatório de produção

### Links Úteis

- **Node.js:** https://nodejs.org/
- **MySQL:** https://dev.mysql.com/
- **Git for Windows:** https://git-scm.com/download/win
- **PM2:** https://pm2.keymetrics.io/
- **VS Code:** https://code.visualstudio.com/

### Suporte

Para problemas específicos, consulte:
1. Documentação das fases específicas
2. Issues no GitHub do projeto
3. Logs do servidor em `logs/`

---

## ✅ Conclusão

Parabéns! Sua plataforma BlackBelt está agora implantada no Windows usando GitBash.

**Próximos Passos:**
1. ✅ Faça login no sistema
2. ✅ Complete o onboarding wizard
3. ✅ Configure a marca (branding)
4. ✅ Convide sua equipe
5. ✅ Crie sua primeira avaliação
6. ✅ Explore as funcionalidades

**Lembre-se:**
- Mantenha backups regulares
- Monitore os logs
- Atualize dependências regularmente
- Mantenha credenciais seguras

🚀 **Boa sorte com sua plataforma!**
