# 🐳 Docker Quick Reference - Black Belt Platform

Referência rápida de comandos Docker para a Black Belt Platform.

## 🚀 Setup Inicial

### Opção 1: Script Automatizado (Recomendado)

```bash
# Setup completo com Docker em um comando
./setup-docker.sh
```

### Opção 2: Manual

```bash
# 1. Clonar repositório
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform

# 2. Instalar dependências
pnpm install

# 3. Configurar ambiente
cp .env.example .env

# 4. Iniciar MySQL com Docker
pnpm docker:up

# 5. Aguardar MySQL inicializar (10 segundos)
sleep 10

# 6. Executar migrations
pnpm db:push

# 7. Iniciar aplicação
pnpm dev
```

## 📋 Comandos NPM (package.json)

### Aplicação

```bash
pnpm dev                # Iniciar servidor de desenvolvimento
pnpm build              # Build para produção
pnpm start              # Iniciar versão de produção
pnpm test               # Executar testes
pnpm check              # Verificar tipos TypeScript
```

### Banco de Dados

```bash
pnpm db:push            # Executar migrations (gerar + migrar)
```

### Docker

```bash
pnpm docker:up          # Iniciar containers
pnpm docker:down        # Parar containers
pnpm docker:logs        # Ver logs do MySQL
pnpm docker:mysql       # Acessar MySQL CLI
pnpm docker:reset       # Resetar containers (remove dados!)
pnpm docker:backup      # Fazer backup do banco
pnpm setup:docker       # Setup completo (up + migrations)
```

## 🐋 Comandos Docker Compose

### Gerenciamento de Containers

```bash
# Iniciar containers
docker-compose up -d

# Parar containers
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados!)
docker-compose down -v

# Ver status
docker-compose ps

# Ver logs
docker-compose logs -f mysql

# Reiniciar
docker-compose restart mysql
```

### Informações

```bash
# Ver logs em tempo real
docker-compose logs -f

# Ver últimas 100 linhas dos logs
docker-compose logs --tail=100

# Verificar saúde do container
docker-compose ps
```

## 💾 Comandos MySQL

### Acessar MySQL

```bash
# Via Docker
docker exec -it blackbelt-mysql mysql -u blackbelt_user -pblackbelt_password blackbelt

# Via cliente local
mysql -h 127.0.0.1 -P 3306 -u blackbelt_user -pblackbelt_password blackbelt
```

### Backup e Restore

```bash
# Backup (automático via npm)
pnpm docker:backup

# Backup manual
docker exec blackbelt-mysql mysqldump -u blackbelt_user -pblackbelt_password blackbelt > backup.sql

# Restore
docker exec -i blackbelt-mysql mysql -u blackbelt_user -pblackbelt_password blackbelt < backup.sql
```

### Verificações

```bash
# Verificar se MySQL está pronto
docker exec blackbelt-mysql mysqladmin ping -h localhost -u blackbelt_user -pblackbelt_password

# Ver charset do servidor
docker exec -it blackbelt-mysql mysql -u root -proot_password -e "SHOW VARIABLES LIKE 'character_set%';"

# Ver collation do servidor
docker exec -it blackbelt-mysql mysql -u root -proot_password -e "SHOW VARIABLES LIKE 'collation%';"

# Verificar banco de dados
docker exec -it blackbelt-mysql mysql -u blackbelt_user -pblackbelt_password -e "SHOW DATABASES;"

# Ver tabelas
docker exec -it blackbelt-mysql mysql -u blackbelt_user -pblackbelt_password blackbelt -e "SHOW TABLES;"
```

## 🔧 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs mysql

# Verificar se porta 3306 está livre
lsof -ti:3306  # Mac/Linux
netstat -ano | findstr :3306  # Windows

# Parar MySQL local se estiver rodando
sudo systemctl stop mysql  # Linux
brew services stop mysql   # Mac
```

### Resetar tudo

```bash
# Parar e remover tudo
docker-compose down -v

# Remover imagem
docker rmi mysql:8.0

# Iniciar do zero
docker-compose up -d
sleep 10
pnpm db:push
```

### Erros de conexão

```bash
# Verificar se container está rodando
docker ps | grep blackbelt-mysql

# Verificar logs
docker-compose logs mysql

# Testar conexão
docker exec blackbelt-mysql mysqladmin ping

# Verificar .env
cat .env | grep DATABASE_URL
```

### Problemas de charset

```bash
# Verificar charset do banco
docker exec -it blackbelt-mysql mysql -u blackbelt_user -pblackbelt_password \
  -e "SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'blackbelt';"

# Deve retornar:
# +----------------------------+------------------------+
# | DEFAULT_CHARACTER_SET_NAME | DEFAULT_COLLATION_NAME |
# +----------------------------+------------------------+
# | utf8mb4                    | utf8mb4_unicode_ci     |
# +----------------------------+------------------------+
```

## 📊 Informações do Container

### Credenciais Padrão

```
Host: localhost
Port: 3306
Database: blackbelt
User: blackbelt_user
Password: blackbelt_password
Root Password: root_password
```

### Charset Configurado

```
Character Set: utf8mb4
Collation: utf8mb4_unicode_ci
```

### Volume

```
Nome: mysql_data
Localização: Docker managed volume
```

## 🎯 Workflows Comuns

### Desenvolvimento Diário

```bash
# Manhã - Iniciar tudo
pnpm docker:up
pnpm dev

# Durante o dia - Ver logs se houver problema
pnpm docker:logs

# Final do dia - Parar containers (opcional)
pnpm docker:down
```

### Deploy de Nova Feature

```bash
# 1. Pull das mudanças
git pull origin main

# 2. Atualizar dependências
pnpm install

# 3. Executar migrations
pnpm db:push

# 4. Executar testes
pnpm test

# 5. Iniciar
pnpm dev
```

### Resetar Ambiente de Desenvolvimento

```bash
# CUIDADO: Isso apaga todos os dados!
pnpm docker:reset
pnpm db:push
```

## 📖 Documentação Completa

- **DOCKER_SETUP.md** - Guia completo Docker (troubleshooting detalhado)
- **COMO_RODAR.md** - Guia rápido de instalação
- **README.md** - Visão geral da plataforma

## 🆘 Suporte

Problemas com Docker? Consulte:

1. **DOCKER_SETUP.md** - Seção "Solução de Problemas"
2. **GitHub Issues** - https://github.com/CarlosHonorato70/blackbelt-platform/issues
3. **Docker Desktop Docs** - https://docs.docker.com/desktop/

---

**Desenvolvido com ❤️ pela Black Belt Consultoria**

_Última atualização: Novembro 2024_
