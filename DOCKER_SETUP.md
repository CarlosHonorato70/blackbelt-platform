# 🐳 Guia Docker Desktop - Black Belt Platform

Este guia explica como executar a Black Belt Platform usando Docker Desktop.

## 📋 Pré-requisitos

- **Docker Desktop** instalado e rodando
- **Node.js** 20+ (para executar a aplicação)
- **pnpm** (gerenciador de pacotes)

## 🚀 Início Rápido

### 1. Clonar o Repositório

```bash
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform
```

### 2. Iniciar MySQL com Docker

```bash
# Iniciar o container MySQL
docker-compose up -d

# Verificar se o container está rodando
docker ps
```

Você deve ver o container `blackbelt-mysql` em execução.

### 3. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env
```

Edite o arquivo `.env` e use a configuração do Docker:

```env
# Para Docker Desktop
DATABASE_URL=mysql://blackbelt_user:blackbelt_password@localhost:3306/blackbelt?charset=utf8mb4
```

### 4. Instalar Dependências

```bash
pnpm install
```

### 5. Executar Migrations

```bash
# Aguardar alguns segundos para o MySQL inicializar completamente
sleep 5

# Executar migrations
pnpm db:push
```

### 6. Iniciar a Aplicação

```bash
pnpm dev
```

✅ **Pronto!** Acesse http://localhost:3000

---

## 🔧 Comandos Úteis do Docker

### Gerenciar Containers

```bash
# Iniciar containers
docker-compose up -d

# Parar containers
docker-compose down

# Ver logs do MySQL
docker-compose logs -f mysql

# Reiniciar MySQL
docker-compose restart mysql
```

### Acessar MySQL

```bash
# Acessar MySQL via linha de comando
docker exec -it blackbelt-mysql mysql -u blackbelt_user -pblackbelt_password blackbelt

# Ou usando o cliente MySQL local
mysql -h 127.0.0.1 -P 3306 -u blackbelt_user -pblackbelt_password blackbelt
```

### Backup e Restore

```bash
# Fazer backup
docker exec blackbelt-mysql mysqldump -u blackbelt_user -pblackbelt_password blackbelt > backup.sql

# Restaurar backup
docker exec -i blackbelt-mysql mysql -u blackbelt_user -pblackbelt_password blackbelt < backup.sql
```

---

## 📊 Estrutura do Docker

### docker-compose.yml

O arquivo `docker-compose.yml` define:

- **MySQL 8.0** com charset `utf8mb4`
- **Porta 3306** exposta
- **Volume persistente** para dados
- **Script de inicialização** para configurar charset

### Configuração de Charset

A configuração garante que:

1. **Server charset:** `utf8mb4`
2. **Server collation:** `utf8mb4_unicode_ci`
3. **Connection charset:** `utf8mb4` (via URL de conexão)

Isso é essencial para suportar:
- Emojis 😊
- Caracteres especiais (ç, á, é, etc.)
- Caracteres internacionais

---

## 🐛 Solução de Problemas

### ❌ Erro: "Port 3306 already in use"

**Problema:** Outro MySQL está usando a porta 3306.

**Solução 1:** Parar o MySQL local

```bash
# Linux
sudo systemctl stop mysql

# macOS
brew services stop mysql
```

**Solução 2:** Mudar a porta do Docker

Edite `docker-compose.yml`:

```yaml
ports:
  - "3307:3306"  # Mapear para porta 3307
```

E atualize o `.env`:

```env
DATABASE_URL=mysql://blackbelt_user:blackbelt_password@localhost:3307/blackbelt?charset=utf8mb4
```

### ❌ Erro: "Cannot connect to database"

**Problema:** Container não está pronto ou URL incorreta.

**Solução:**

```bash
# 1. Verificar se container está rodando
docker ps

# 2. Ver logs do MySQL
docker-compose logs mysql

# 3. Aguardar inicialização completa
sleep 10

# 4. Testar conexão
docker exec blackbelt-mysql mysqladmin ping -h localhost
```

### ❌ Erro: "Character set issues"

**Problema:** Charset não configurado corretamente.

**Solução:**

```bash
# Verificar charset do servidor
docker exec -it blackbelt-mysql mysql -u root -proot_password \
  -e "SHOW VARIABLES LIKE 'character_set%';"

# Deve mostrar utf8mb4 em todas as variáveis
```

Se não estiver correto, recrie o container:

```bash
docker-compose down -v
docker-compose up -d
```

### ❌ Erro: "Connection refused"

**Problema:** Docker Desktop não está rodando ou configurado incorretamente.

**Solução:**

1. Abrir Docker Desktop
2. Verificar se está rodando: ícone do Docker na barra de tarefas
3. Aguardar alguns segundos após iniciar
4. Tentar novamente

---

## 🔄 Limpar e Reiniciar

Para começar do zero:

```bash
# Parar e remover containers e volumes
docker-compose down -v

# Remover imagem (opcional)
docker rmi mysql:8.0

# Iniciar novamente
docker-compose up -d

# Aguardar inicialização
sleep 10

# Executar migrations
pnpm db:push
```

---

## 📝 Configuração Avançada

### Variáveis de Ambiente do MySQL

Você pode customizar as credenciais no `docker-compose.yml`:

```yaml
environment:
  MYSQL_ROOT_PASSWORD: sua_senha_root
  MYSQL_DATABASE: nome_do_banco
  MYSQL_USER: seu_usuario
  MYSQL_PASSWORD: sua_senha
```

Lembre-se de atualizar o `.env` para corresponder.

### Performance

Para melhor performance, adicione ao `docker-compose.yml`:

```yaml
command:
  - --character-set-server=utf8mb4
  - --collation-server=utf8mb4_unicode_ci
  - --default-authentication-plugin=mysql_native_password
  - --max_connections=200
  - --innodb_buffer_pool_size=256M
```

---

## 🎯 Checklist de Verificação

Use este checklist para garantir que tudo está funcionando:

- [ ] Docker Desktop instalado e rodando
- [ ] `docker-compose up -d` executado com sucesso
- [ ] Container `blackbelt-mysql` em execução (`docker ps`)
- [ ] Arquivo `.env` configurado com DATABASE_URL correto
- [ ] `pnpm install` concluído
- [ ] `pnpm db:push` executado sem erros
- [ ] Tabelas criadas no banco (verificar com `docker exec`)
- [ ] `pnpm dev` rodando sem erros
- [ ] Aplicação acessível em http://localhost:3000

---

## 💡 Dicas

1. **Persistência de Dados:** Os dados são salvos no volume `mysql_data` e persistem entre reinicializações
2. **Logs:** Use `docker-compose logs -f` para debug
3. **Conexão Externa:** Aplicativos como MySQL Workbench podem se conectar em `localhost:3306`
4. **Charset:** A URL de conexão sempre inclui `charset=utf8mb4` automaticamente

---

## 📚 Recursos Adicionais

- [Docker Desktop Documentation](https://docs.docker.com/desktop/)
- [MySQL Docker Image](https://hub.docker.com/_/mysql)
- [Drizzle ORM com MySQL](https://orm.drizzle.team/docs/get-started-mysql)

---

**Desenvolvido com ❤️ pela Black Belt Consultoria**

_Última atualização: Novembro 2024_
