# ⚡ Setup Rápido - Black Belt Platform

## 🚀 Opção 1: Setup Automático (Recomendado)

### Windows (PowerShell)
```powershell
# Abra PowerShell como Administrador na pasta do projeto
.\setup-windows.ps1
```

### Linux/macOS (Bash)
```bash
# Na pasta do projeto
bash setup-linux.sh
```

## 🐳 Opção 2: Docker Compose Manual

```bash
# 1. Clonar repositório
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform

# 2. Criar arquivo .env
cp .env.example .env

# 3. Iniciar com Docker
docker-compose up -d

# 4. Aguardar MongoDB estar pronto (30 segundos)

# 5. Executar migrations
docker-compose exec backend pnpm db:push
```

## 🔧 Opção 3: Desenvolvimento Local (Sem Docker)

```bash
# 1. Instalar dependências
pnpm install

# 2. Iniciar MongoDB localmente
# Windows: mongod.exe
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# 3. Criar arquivo .env
DATABASE_URL=mongodb://localhost:27017/blackbelt
JWT_SECRET=seu-secret-aqui

# 4. Executar migrations
pnpm db:push

# 5. Iniciar servidor
pnpm dev
```

## 🌐 Acessar a Plataforma

- **Aplicação**: http://localhost:3000
- **MongoDB Express**: http://localhost:8081 (user: admin, senha: blackbelt2024)

## 👤 Criar Primeira Conta

1. Clique em "Registrar"
2. Preencha:
   - Nome: `Carlos Honorato`
   - Email: `carlos@blackbelt.com`
   - Senha: `senha123`
3. Clique em "Registrar"

## ✅ Verificar Status

```bash
# Ver status dos containers
docker-compose ps

# Ver logs
docker-compose logs -f backend

# Parar tudo
docker-compose down
```

## 📚 Documentação Completa

Veja **GUIA_SETUP_STANDALONE.md** para instruções detalhadas, troubleshooting e deployment em produção.

---

**Desenvolvido para Black Belt Consultoria** ❤️
