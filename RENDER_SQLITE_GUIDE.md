# 🗄️ Guia: Usar SQLite (Armazenamento Local) no Render

## 📋 Visão Geral

Este guia explica como configurar a Black Belt Platform para usar SQLite ao invés do PostgreSQL do Render, eliminando a necessidade de um banco de dados externo.

### ✅ Vantagens do SQLite

- **Custo Zero**: Sem taxa de banco de dados separado (economiza US$ 7/mês)
- **Simplicidade**: Um único arquivo de banco de dados
- **Deploy Rápido**: Sem necessidade de provisionar database
- **Ideal para**: MVP, testes, demonstrações, aplicações de usuário único

### ⚠️ Limitações do SQLite

- **Disco Efêmero no Render**: Dados são perdidos em cada redeploy (ver soluções abaixo)
- **Sem Escalabilidade Horizontal**: Não suporta múltiplas instâncias
- **Performance**: Limitada para alto volume de transações concorrentes
- **Backup Manual**: Necessário configurar backup externo

## 🚀 Opção 1: SQLite com Render Disks (Persistência)

O Render oferece **Render Disks** para persistência de dados. Esta é a melhor opção para produção com SQLite.

### Passo 1: Adicionar Dependências SQLite

```bash
# Adicionar better-sqlite3 ao package.json
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

### Passo 2: Criar Configuração SQLite

Crie `drizzle.config.sqlite.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL || "file:./data/blackbelt.db";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: connectionString,
  },
});
```

### Passo 3: Criar Schema SQLite

Crie `drizzle/schema.sqlite.ts`:

```typescript
import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

// Adaptar schema existente para SQLite
// SQLite não tem alguns tipos do PostgreSQL, então precisamos converter:
// - varchar -> text
// - timestamp -> integer (Unix timestamp)
// - jsonb -> text (JSON string)
// - boolean -> integer (0 ou 1)

export const users = sqliteTable("users", {
  id: text("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: text("email", { length: 320 }),
  loginMethod: text("loginMethod", { length: 64 }),
  passwordHash: text("passwordHash", { length: 255 }),
  role: text("role").default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// ... converter restante das tabelas
```

### Passo 4: Criar Adapter de Database

Crie `server/db.sqlite.ts`:

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    try {
      // Garantir que o diretório data existe
      const dbPath = process.env.DATABASE_URL || "./data/blackbelt.db";
      const dbDir = path.dirname(dbPath.replace("file:", ""));
      
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const sqlite = new Database(dbPath.replace("file:", ""));
      
      // Habilitar WAL mode para melhor performance
      sqlite.pragma("journal_mode = WAL");
      
      _db = drizzle(sqlite);
      console.log(`✅ SQLite database connected: ${dbPath}`);
    } catch (error) {
      console.error("[Database] Failed to connect to SQLite:", error);
      _db = null;
    }
  }
  return _db;
}
```

### Passo 5: Atualizar render.yaml para Usar Disco Persistente

```yaml
services:
  - type: web
    name: blackbelt-platform-sqlite
    env: docker
    dockerfilePath: ./Dockerfile.production
    plan: starter
    
    # Adicionar Render Disk para persistência
    disk:
      name: blackbelt-data
      mountPath: /app/data
      sizeGB: 1  # 1GB de storage persistente
    
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 8080
      - key: HOST
        value: 0.0.0.0
      - key: DATABASE_URL
        value: file:/app/data/blackbelt.db
      - key: USE_SQLITE
        value: true
      - key: SESSION_SECRET
        generateValue: true
      - key: VITE_FRONTEND_URL
        sync: false
      - key: FRONTEND_URL
        sync: false
    
    healthCheckPath: /api/health
    autoDeploy: true
    branch: main

# Remover seção databases (não necessária com SQLite)
```

### Passo 6: Modificar Dockerfile para Suportar SQLite

Adicione ao `Dockerfile.production`:

```dockerfile
# ... existing content ...

FROM node:22-alpine AS runtime
WORKDIR /app
RUN npm install -g pnpm@10.4.1

# Adicionar SQLite
RUN apk add --no-cache sqlite

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod
COPY --from=builder /app/dist ./dist

# Criar diretório para banco de dados
RUN mkdir -p /app/data && chmod 777 /app/data

ENV PORT=8080
ENV HOST=0.0.0.0
ENV NODE_ENV=production

EXPOSE 8080
CMD ["node", "dist/index.js"]
```

### Passo 7: Deploy

```bash
# 1. Commit das mudanças
git add .
git commit -m "feat: add SQLite support with Render Disk"
git push origin main

# 2. No Render Dashboard
# - Criar Web Service
# - Configurar Disk (Storage → Add Disk)
# - Deploy

# 3. Verificar
curl https://seu-app.onrender.com/api/health
```

### Custo

**Com SQLite + Render Disk**:
- Web Service Starter: US$ 7/mês
- Render Disk (1GB): US$ 1/mês
- **Total**: US$ 8/mês (economiza US$ 6/mês vs PostgreSQL)

---

## 🔄 Opção 2: SQLite Efêmero (Sem Persistência)

Para testes temporários ou demonstrações onde perder dados em cada deploy é aceitável.

### Configuração Simples

```yaml
# render.yaml
services:
  - type: web
    name: blackbelt-platform-sqlite-temp
    env: docker
    dockerfilePath: ./Dockerfile.production
    
    envVars:
      - key: DATABASE_URL
        value: file:./blackbelt.db  # Arquivo local temporário
      - key: USE_SQLITE
        value: true
```

### ⚠️ Importante

- Dados são perdidos em cada redeploy
- Útil apenas para demos/testes
- **NÃO use em produção**

---

## 📦 Opção 3: SQLite com Backup para S3

Combina SQLite local com backup automático para AWS S3 ou similar.

### Script de Backup

Crie `scripts/backup-sqlite.sh`:

```bash
#!/bin/bash
# Backup automático do SQLite para S3

DB_PATH="/app/data/blackbelt.db"
BACKUP_PATH="/tmp/blackbelt-backup-$(date +%Y%m%d-%H%M%S).db"
S3_BUCKET="${S3_BACKUP_BUCKET}"

# Fazer backup usando SQLite .backup
sqlite3 $DB_PATH ".backup $BACKUP_PATH"

# Upload para S3
if [ -n "$S3_BUCKET" ]; then
  aws s3 cp $BACKUP_PATH s3://$S3_BUCKET/backups/
  echo "✅ Backup uploaded to S3"
fi

# Limpar backup local
rm $BACKUP_PATH
```

### Configurar Cron no Render

No `render.yaml`, adicione um Cron Job:

```yaml
services:
  # ... web service ...

  # Backup automático diário
  - type: cron
    name: blackbelt-sqlite-backup
    env: docker
    schedule: "0 2 * * *"  # Diariamente às 2 AM
    dockerfilePath: ./Dockerfile.production
    dockerCommand: sh /app/scripts/backup-sqlite.sh
    
    envVars:
      - key: DATABASE_URL
        value: file:/app/data/blackbelt.db
      - key: S3_BACKUP_BUCKET
        value: my-blackbelt-backups
      - key: AWS_ACCESS_KEY_ID
        sync: false
      - key: AWS_SECRET_ACCESS_KEY
        sync: false
```

---

## 🔄 Migrando de PostgreSQL para SQLite

Se você já tem dados no PostgreSQL:

### 1. Exportar Dados do PostgreSQL

```bash
# Conectar ao PostgreSQL do Render
pg_dump $DATABASE_URL > backup.sql
```

### 2. Converter para SQLite

Use ferramenta como `pgloader`:

```bash
# Instalar pgloader
brew install pgloader  # macOS
# ou apt-get install pgloader  # Linux

# Converter
pgloader backup.sql sqlite://blackbelt.db
```

### 3. Upload para Render Disk

Use Render Shell ou script de deploy para fazer upload do arquivo `.db`.

---

## 🔍 Comparação: PostgreSQL vs SQLite

| Característica | PostgreSQL (Render) | SQLite (Render Disk) | SQLite (Efêmero) |
|----------------|---------------------|----------------------|------------------|
| **Custo/Mês** | US$ 14 | US$ 8 | US$ 7 |
| **Persistência** | ✅ Sim | ✅ Sim | ❌ Não |
| **Backup Automático** | ✅ Sim | ⚠️ Manual | ❌ Não |
| **Escalabilidade** | ✅ Alta | ⚠️ Limitada | ⚠️ Limitada |
| **Performance** | ✅ Alta | ✅ Boa | ✅ Boa |
| **Múltiplas Instâncias** | ✅ Sim | ❌ Não | ❌ Não |
| **Setup** | Médio | Simples | Muito Simples |
| **Ideal para** | Produção | MVP/Small Apps | Demos/Testes |

---

## 🎯 Recomendação

### Use SQLite com Render Disk quando:
- ✅ Aplicação para 1 usuário/empresa (não multi-tenant em escala)
- ✅ Menos de 1000 requisições/dia
- ✅ Orçamento limitado
- ✅ MVP ou produto inicial
- ✅ Backup manual é aceitável

### Use PostgreSQL quando:
- ✅ Multi-tenant com múltiplos clientes
- ✅ Alto volume de transações (>1000/dia)
- ✅ Necessita backup automático
- ✅ Escalabilidade horizontal futura
- ✅ Produção crítica

---

## 🆘 Troubleshooting

### "Error: unable to open database file"

**Solução**: Verificar se o diretório `/app/data` existe e tem permissões corretas.

```dockerfile
RUN mkdir -p /app/data && chmod 777 /app/data
```

### "Database locked"

**Solução**: Habilitar WAL mode:

```typescript
sqlite.pragma("journal_mode = WAL");
```

### Dados perdidos após redeploy

**Solução**: Certifique-se de que o Render Disk está configurado e montado corretamente em `/app/data`.

---

## 📚 Recursos

- [Render Disks Documentation](https://render.com/docs/disks)
- [SQLite vs PostgreSQL](https://www.sqlite.org/whentouse.html)
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3)
- [Drizzle ORM SQLite](https://orm.drizzle.team/docs/get-started-sqlite)

---

**Nota**: Esta implementação completa de SQLite requer mudanças no código. Para uma implementação rápida, considere usar PostgreSQL do Render que já está funcionando, ou entre em contato para implementação profissional do SQLite.
