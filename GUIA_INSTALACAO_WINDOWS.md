# 🪟 Guia Completo - Instalação no Windows (Online/Offline)

**Plataforma:** Black Belt - Plataforma de Gestão Multi-Tenant  
**Sistema Operacional:** Windows 10/11  
**Tempo Estimado:** 1-2 horas  
**Dificuldade:** Intermediária

---

## ✅ Pré-requisitos

Você já tem:
- ✅ Node.js instalado
- ✅ Docker Desktop instalado
- ✅ Python instalado
- ✅ Domínio contratado

Precisamos verificar:
- [ ] Git instalado (para clonar repositório)
- [ ] pnpm instalado (gerenciador de pacotes)
- [ ] MySQL/MariaDB (via Docker ou local)

---

## 🔍 Passo 1: Verificar Instalações

### 1.1 Verificar Node.js

Abra **PowerShell** ou **Prompt de Comando** e execute:

```powershell
node --version
npm --version
```

Esperado: Node.js v22+ e npm v10+

### 1.2 Verificar Docker

```powershell
docker --version
docker run hello-world
```

Esperado: Docker version 20.10+

### 1.3 Verificar Python

```powershell
python --version
```

Esperado: Python 3.8+

### 1.4 Verificar Git

```powershell
git --version
```

Se não tiver, baixe em: https://git-scm.com/download/win

---

## 📦 Passo 2: Instalar pnpm

pnpm é o gerenciador de pacotes recomendado (mais rápido que npm).

```powershell
npm install -g pnpm
pnpm --version
```

Esperado: pnpm 9.0+

---

## 🗂️ Passo 3: Clonar o Repositório

### 3.1 Escolher Pasta

Crie uma pasta para o projeto:

```powershell
mkdir C:\projetos
cd C:\projetos
```

### 3.2 Clonar Repositório

```powershell
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform
```

### 3.3 Verificar Estrutura

```powershell
dir
```

Você deve ver:
- `client/` - Frontend React
- `server/` - Backend Express
- `drizzle/` - Schema do banco
- `package.json` - Dependências
- `README.md` - Documentação

---

## 🗄️ Passo 4: Configurar Banco de Dados

### Opção A: Usar Docker (Recomendado)

#### 4A.1 Criar Container MySQL

```powershell
docker run -d `
  --name blackbelt-mysql `
  -e MYSQL_ROOT_PASSWORD=root123 `
  -e MYSQL_DATABASE=blackbelt `
  -e MYSQL_USER=blackbelt `
  -e MYSQL_PASSWORD=blackbelt123 `
  -p 3306:3306 `
  -v blackbelt-data:/var/lib/mysql `
  mysql:8.0
```

#### 4A.2 Verificar Container

```powershell
docker ps
docker logs blackbelt-mysql
```

Esperado: Container rodando na porta 3306

### Opção B: Usar MySQL Local

Se preferir instalar localmente:

1. Baixe MySQL: https://dev.mysql.com/downloads/mysql/
2. Instale com padrões
3. Anote a senha do root
4. Crie banco: `CREATE DATABASE blackbelt;`

---

## 🔧 Passo 5: Configurar Variáveis de Ambiente

### 5.1 Criar Arquivo .env.local

Na pasta `blackbelt-platform`, crie arquivo `.env.local`:

```powershell
# Windows PowerShell
New-Item -Path ".env.local" -ItemType File

# Ou use Notepad
notepad .env.local
```

### 5.2 Adicionar Conteúdo

Cole o seguinte conteúdo:

```env
# Database
DATABASE_URL=mysql://blackbelt:blackbelt123@localhost:3306/blackbelt

# OAuth (Manus)
VITE_APP_ID=your_app_id_here
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# JWT Secret
JWT_SECRET=seu_secret_super_seguro_aqui_minimo_32_caracteres

# App Config
VITE_APP_TITLE=Black Belt Consultoria
VITE_APP_LOGO=https://seu-dominio.com/logo.png

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua_chave_api_aqui

# Owner Info (Opcional)
OWNER_NAME=Carlos Honorato
OWNER_OPEN_ID=seu_open_id

# Analytics (Opcional)
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=seu_website_id
```

### 5.3 Configurar OAuth (Importante!)

1. Acesse: https://app.manus.im
2. Crie uma aplicação
3. Configure redirect URI: `http://localhost:3000/api/oauth/callback`
4. Copie `VITE_APP_ID` e `OAUTH_SERVER_URL`
5. Cole em `.env.local`

---

## 📥 Passo 6: Instalar Dependências

```powershell
cd C:\projetos\blackbelt-platform

# Instalar dependências
pnpm install

# Tempo estimado: 5-10 minutos
```

---

## 🗄️ Passo 7: Configurar Banco de Dados

### 7.1 Criar Migrations

```powershell
pnpm db:push
```

Isso criará todas as 30 tabelas no banco de dados.

### 7.2 Verificar Banco

Conecte ao MySQL e verifique:

```sql
USE blackbelt;
SHOW TABLES;
```

Esperado: 30 tabelas criadas

---

## 🚀 Passo 8: Iniciar Servidor de Desenvolvimento

### 8.1 Iniciar Aplicação

```powershell
pnpm dev
```

Esperado:
```
✓ Frontend running on http://localhost:5173
✓ Backend running on http://localhost:3000
✓ Ready to accept connections
```

### 8.2 Acessar Aplicação

Abra navegador e acesse:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3000

---

## 🌐 Passo 9: Configurar Domínio Próprio (Opcional)

### 9.1 Configurar Hosts (Windows)

Edite `C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1  app.blackbelt-consultoria.com
127.0.0.1  api.blackbelt-consultoria.com
```

### 9.2 Usar Domínio Localmente

Acesse:
- http://app.blackbelt-consultoria.com:5173 (Frontend)
- http://api.blackbelt-consultoria.com:3000 (Backend)

### 9.3 Configurar SSL Local (Opcional)

Para HTTPS local, use mkcert:

```powershell
# Instalar mkcert
choco install mkcert

# Criar certificado
mkcert app.blackbelt-consultoria.com

# Isso gera:
# - app.blackbelt-consultoria.com.pem (certificado)
# - app.blackbelt-consultoria.com-key.pem (chave privada)
```

---

## 🔌 Passo 10: Modo Offline

### 10.1 Build para Produção

```powershell
pnpm build
```

Isso gera:
- `dist/` - Frontend compilado
- `server/` - Backend pronto

### 10.2 Servir Offline

```powershell
# Terminal 1 - Backend
pnpm start

# Terminal 2 - Frontend (se quiser servir também)
pnpm preview
```

### 10.3 Dados Offline

Os dados são armazenados localmente no MySQL, então funcionam offline:

1. **Dados já sincronizados** - Disponíveis offline
2. **Novas ações** - Salvas localmente
3. **Sincronização** - Quando voltar online

---

## 🐳 Passo 11: Docker Compose (Opcional - Recomendado)

Para facilitar, crie `docker-compose.yml`:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: blackbelt-mysql
    environment:
      MYSQL_ROOT_PASSWORD: root123
      MYSQL_DATABASE: blackbelt
      MYSQL_USER: blackbelt
      MYSQL_PASSWORD: blackbelt123
    ports:
      - "3306:3306"
    volumes:
      - blackbelt-data:/var/lib/mysql
    networks:
      - blackbelt-network

  app:
    build: .
    container_name: blackbelt-app
    environment:
      DATABASE_URL: mysql://blackbelt:blackbelt123@mysql:3306/blackbelt
      VITE_APP_ID: ${VITE_APP_ID}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3000:3000"
      - "5173:5173"
    depends_on:
      - mysql
    networks:
      - blackbelt-network

volumes:
  blackbelt-data:

networks:
  blackbelt-network:
    driver: bridge
```

### Usar Docker Compose

```powershell
# Iniciar tudo
docker-compose up -d

# Parar
docker-compose down

# Ver logs
docker-compose logs -f
```

---

## 🔒 Passo 12: Segurança

### 12.1 Mudar Senhas Padrão

Edite `.env.local`:

```env
# Gere senhas seguras em: https://www.random.org/passwords/
JWT_SECRET=sua_senha_super_segura_aqui_minimo_32_caracteres
MYSQL_PASSWORD=sua_senha_mysql_segura
```

### 12.2 Firewall

Abra portas apenas necessárias:
- 3000 (Backend)
- 5173 (Frontend)
- 3306 (MySQL - apenas local)

### 12.3 SSL/TLS

Para produção, use certificado válido:

```powershell
# Usar Let's Encrypt
# Ou certificado auto-assinado para teste
```

---

## 🧪 Passo 13: Testes

### 13.1 Testar Backend

```powershell
pnpm test
```

### 13.2 Testar E2E

```powershell
pnpm test:e2e
```

### 13.3 Verificar Saúde

```powershell
# Verificar se backend está rodando
curl http://localhost:3000/health

# Esperado: 200 OK
```

---

## 📊 Passo 14: Monitoramento

### 14.1 Ver Logs

```powershell
# Backend
pnpm dev

# Frontend (em outro terminal)
pnpm dev
```

### 14.2 Monitorar Banco

```powershell
# Conectar ao MySQL
docker exec -it blackbelt-mysql mysql -u blackbelt -p

# Senha: blackbelt123
# Comando: USE blackbelt; SELECT COUNT(*) FROM users;
```

### 14.3 Performance

Monitore em:
- http://localhost:3000/health
- http://localhost:5173 (DevTools)

---

## 🚨 Troubleshooting

### Problema: "Port 3000 already in use"

**Solução:**
```powershell
# Encontrar processo na porta 3000
netstat -ano | findstr :3000

# Matar processo
taskkill /PID <PID> /F
```

### Problema: "Cannot connect to MySQL"

**Solução:**
```powershell
# Verificar se container está rodando
docker ps

# Reiniciar container
docker restart blackbelt-mysql

# Verificar logs
docker logs blackbelt-mysql
```

### Problema: "Module not found"

**Solução:**
```powershell
# Limpar cache
pnpm store prune

# Reinstalar
pnpm install
```

### Problema: "ENOENT: no such file or directory"

**Solução:**
```powershell
# Verificar permissões
icacls "C:\projetos\blackbelt-platform" /grant:r "%USERNAME%:F"

# Ou executar PowerShell como Admin
```

---

## 📋 Checklist de Instalação

- [ ] Node.js 22+ instalado
- [ ] Docker Desktop instalado
- [ ] Python 3.8+ instalado
- [ ] Git instalado
- [ ] pnpm instalado
- [ ] Repositório clonado
- [ ] MySQL container rodando
- [ ] .env.local configurado
- [ ] Dependências instaladas
- [ ] Migrations executadas
- [ ] Servidor iniciado
- [ ] Aplicação acessível em localhost
- [ ] Domínio configurado em hosts
- [ ] Testes passando

---

## 🎯 Próximos Passos

1. **Fazer login** - Use OAuth para autenticar
2. **Criar empresa** - Adicione sua empresa
3. **Criar avaliação** - Teste fluxo de avaliação NR-01
4. **Gerar proposta** - Teste sistema de precificação
5. **Exportar dados** - Teste exportação

---

## 📞 Suporte

Se tiver problemas:

1. **Verificar logs:**
   ```powershell
   pnpm dev 2>&1 | Tee-Object -FilePath logs.txt
   ```

2. **Consultar documentação:**
   - README.md
   - DOCUMENTACAO_TECNICA.md
   - DFD_ARQUITETURA.md

3. **Abrir issue no GitHub:**
   - https://github.com/CarlosHonorato70/blackbelt-platform/issues

---

## 🔗 Recursos Úteis

- [Node.js](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [MySQL](https://www.mysql.com/)
- [pnpm](https://pnpm.io/)
- [Git](https://git-scm.com/)
- [mkcert](https://github.com/FiloSottile/mkcert)

---

## 🎓 Dicas Profissionais

### Desenvolvimento Eficiente

1. **Use VSCode** - Instale extensões:
   - ES7+ React/Redux/React-Native snippets
   - Prettier - Code formatter
   - ESLint
   - Thunder Client (para testar API)

2. **Debug**
   ```powershell
   # Adicione em código
   debugger;
   
   # Execute com inspect
   node --inspect server/index.js
   ```

3. **Hot Reload**
   - Frontend: automático com Vite
   - Backend: use `nodemon`

### Produção

1. **Build otimizado**
   ```powershell
   pnpm build --prod
   ```

2. **Compressão**
   ```powershell
   # Gzip assets
   gzip -r dist/
   ```

3. **CDN**
   - Use Cloudflare para cache
   - Distribua assets globalmente

---

**Última atualização:** Novembro 2025  
**Versão:** 1.0  
**Status:** Pronto para uso ✅

