# 🚀 Roteiro Completo de CI/CD com GitHub Actions

## 📌 Objetivo

Implementar um pipeline de **Integração Contínua e Deployment Contínuo (CI/CD)** automatizado para a plataforma Black Belt usando GitHub Actions, garantindo qualidade, segurança e deployment rápido.

---

## 🎯 Visão Geral do Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                    GITHUB ACTIONS PIPELINE                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. TRIGGER                                                   │
│     └─ Push em main/develop                                  │
│     └─ Pull Request                                          │
│     └─ Manual (workflow_dispatch)                            │
│                                                               │
│  2. SETUP                                                     │
│     └─ Checkout código                                       │
│     └─ Setup Node.js 22                                      │
│     └─ Cache de dependências                                 │
│                                                               │
│  3. LINT & FORMAT                                             │
│     └─ ESLint (TypeScript)                                   │
│     └─ Prettier (Formatação)                                 │
│     └─ Type checking (tsc)                                   │
│                                                               │
│  4. TESTES                                                    │
│     └─ Unit Tests (Vitest)                                   │
│     └─ Integration Tests                                     │
│     └─ E2E Tests (Playwright)                                │
│                                                               │
│  5. BUILD                                                     │
│     └─ Build Frontend (Vite)                                 │
│     └─ Build Backend (tsc)                                   │
│     └─ Docker Image                                          │
│                                                               │
│  6. SEGURANÇA                                                 │
│     └─ SAST (SonarQube)                                      │
│     └─ Dependency Check                                      │
│     └─ Secret Scanning                                       │
│                                                               │
│  7. DEPLOY                                                    │
│     └─ Staging (develop branch)                              │
│     └─ Production (main branch)                              │
│     └─ Notificações                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Workflows

```
.github/
└── workflows/
    ├── ci.yml                    # Lint, Type Check, Build
    ├── test.yml                  # Unit, Integration, E2E Tests
    ├── security.yml              # SAST, Dependency Check
    ├── deploy-staging.yml        # Deploy para Staging
    ├── deploy-production.yml     # Deploy para Production
    └── scheduled-tasks.yml       # Tarefas agendadas
```

---

## 🔧 Workflow 1: CI (Lint, Type Check, Build)

### Arquivo: `.github/workflows/ci.yml`

```yaml
name: CI - Lint, Type Check, Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

jobs:
  lint-and-build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [22.x]

    steps:
      # 1. Checkout
      - name: Checkout código
        uses: actions/checkout@v4

      # 2. Setup Node.js
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "pnpm"

      # 3. Setup pnpm
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      # 4. Instalar dependências
      - name: Instalar dependências
        run: pnpm install --frozen-lockfile

      # 5. ESLint
      - name: Executar ESLint
        run: pnpm lint
        continue-on-error: true

      # 6. Prettier (verificar formatação)
      - name: Verificar formatação com Prettier
        run: pnpm format:check
        continue-on-error: true

      # 7. Type Check
      - name: Type checking com TypeScript
        run: pnpm tsc --noEmit

      # 8. Build Frontend
      - name: Build Frontend (Vite)
        run: pnpm build:client

      # 9. Build Backend
      - name: Build Backend
        run: pnpm build:server

      # 10. Upload artifacts
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-${{ github.sha }}
          path: |
            dist/
            build/
          retention-days: 5

      # 11. Notificação de sucesso
      - name: Notificar sucesso
        if: success()
        run: echo "✅ CI passou com sucesso!"

      # 12. Notificação de falha
      - name: Notificar falha
        if: failure()
        run: echo "❌ CI falhou!"
```

---

## 🧪 Workflow 2: Testes (Unit, Integration, E2E)

### Arquivo: `.github/workflows/test.yml`

```yaml
name: Testes - Unit, Integration, E2E

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: "pnpm"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Instalar dependências
        run: pnpm install --frozen-lockfile

      - name: Executar testes unitários
        run: pnpm test:unit

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

  integration-tests:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root123
          MYSQL_DATABASE: blackbelt_test
          MYSQL_USER: blackbelt
          MYSQL_PASSWORD: blackbelt123
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 3306:3306

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: "pnpm"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Instalar dependências
        run: pnpm install --frozen-lockfile

      - name: Setup banco de testes
        run: |
          pnpm db:push
        env:
          DATABASE_URL: mysql://blackbelt:blackbelt123@localhost:3306/blackbelt_test

      - name: Executar testes de integração
        run: pnpm test:integration
        env:
          DATABASE_URL: mysql://blackbelt:blackbelt123@localhost:3306/blackbelt_test

  e2e-tests:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root123
          MYSQL_DATABASE: blackbelt_e2e
          MYSQL_USER: blackbelt
          MYSQL_PASSWORD: blackbelt123
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 3306:3306

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: "pnpm"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Instalar dependências
        run: pnpm install --frozen-lockfile

      - name: Setup banco de testes E2E
        run: pnpm db:push
        env:
          DATABASE_URL: mysql://blackbelt:blackbelt123@localhost:3306/blackbelt_e2e

      - name: Build aplicação
        run: pnpm build

      - name: Executar testes E2E
        run: pnpm test:e2e
        env:
          DATABASE_URL: mysql://blackbelt:blackbelt123@localhost:3306/blackbelt_e2e

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## 🔒 Workflow 3: Segurança (SAST, Dependency Check)

### Arquivo: `.github/workflows/security.yml`

```yaml
name: Segurança - SAST, Dependency Check

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: "0 2 * * *" # Diariamente às 2 AM

jobs:
  sast:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: "pnpm"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Instalar dependências
        run: pnpm install --frozen-lockfile

      - name: SonarQube Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  dependency-check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Dependency Check
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: "blackbelt-platform"
          path: "."
          format: "JSON"
          args: >
            --enableExperimental

      - name: Upload Dependency Check report
        uses: actions/upload-artifact@v3
        with:
          name: dependency-check-report
          path: reports/

      - name: Publicar resultados
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: reports/

  npm-audit:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: "pnpm"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Instalar dependências
        run: pnpm install --frozen-lockfile

      - name: npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true
```

---

## 🚀 Workflow 4: Deploy para Staging

### Arquivo: `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy - Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy-staging:
    runs-on: ubuntu-latest

    environment:
      name: staging
      url: https://staging.blackbelt-consultoria.com

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: "pnpm"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Instalar dependências
        run: pnpm install --frozen-lockfile

      - name: Build aplicação
        run: pnpm build
        env:
          VITE_API_URL: https://staging-api.blackbelt-consultoria.com

      - name: Build Docker image
        run: |
          docker build -t blackbelt:staging-${{ github.sha }} .
          docker tag blackbelt:staging-${{ github.sha }} blackbelt:staging-latest

      - name: Push Docker image
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push blackbelt:staging-${{ github.sha }}
          docker push blackbelt:staging-latest

      - name: Deploy para Staging
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /app/blackbelt-platform
            docker pull blackbelt:staging-latest
            docker-compose -f docker-compose.staging.yml down
            docker-compose -f docker-compose.staging.yml up -d
            docker-compose -f docker-compose.staging.yml exec -T app pnpm db:push

      - name: Health check
        run: |
          for i in {1..30}; do
            if curl -f https://staging.blackbelt-consultoria.com/health; then
              echo "✅ Staging está saudável"
              exit 0
            fi
            echo "Aguardando... ($i/30)"
            sleep 10
          done
          echo "❌ Staging não respondeu"
          exit 1

      - name: Notificar sucesso
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "✅ Deploy para Staging bem-sucedido!"
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Notificar falha
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "❌ Deploy para Staging falhou!"
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 🌍 Workflow 5: Deploy para Production

### Arquivo: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy - Production

on:
  push:
    branches: [main]
    tags:
      - "v*"
  workflow_dispatch:

jobs:
  deploy-production:
    runs-on: ubuntu-latest

    environment:
      name: production
      url: https://blackbelt-consultoria.com

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22.x
          cache: "pnpm"

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Instalar dependências
        run: pnpm install --frozen-lockfile

      - name: Build aplicação
        run: pnpm build
        env:
          VITE_API_URL: https://api.blackbelt-consultoria.com

      - name: Build Docker image
        run: |
          docker build -t blackbelt:prod-${{ github.sha }} .
          docker tag blackbelt:prod-${{ github.sha }} blackbelt:prod-latest

      - name: Push Docker image
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push blackbelt:prod-${{ github.sha }}
          docker push blackbelt:prod-latest

      - name: Deploy para Production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /app/blackbelt-platform
            docker pull blackbelt:prod-latest
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml up -d
            docker-compose -f docker-compose.prod.yml exec -T app pnpm db:push

      - name: Health check
        run: |
          for i in {1..30}; do
            if curl -f https://blackbelt-consultoria.com/health; then
              echo "✅ Production está saudável"
              exit 0
            fi
            echo "Aguardando... ($i/30)"
            sleep 10
          done
          echo "❌ Production não respondeu"
          exit 1

      - name: Criar Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          body: |
            Versão: ${{ github.ref }}
            Commit: ${{ github.sha }}
            Deploy: Production

      - name: Notificar sucesso
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "✅ Deploy para Production bem-sucedido!"
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Notificar falha
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "❌ Deploy para Production falhou!"
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## ⏰ Workflow 6: Tarefas Agendadas

### Arquivo: `.github/workflows/scheduled-tasks.yml`

```yaml
name: Tarefas Agendadas

on:
  schedule:
    - cron: "0 2 * * *" # Diariamente às 2 AM
    - cron: "0 0 * * 0" # Semanalmente (domingo)
  workflow_dispatch:

jobs:
  backup-database:
    runs-on: ubuntu-latest

    steps:
      - name: Backup do banco de dados
        run: |
          echo "Executando backup..."
          # Comandos de backup

      - name: Upload backup
        uses: actions/upload-artifact@v3
        with:
          name: db-backup-${{ github.run_id }}
          path: backups/
          retention-days: 30

  security-scan:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Executar scan de segurança
        run: |
          echo "Executando scan de segurança..."
          # Comandos de scan

  performance-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Executar testes de performance
        run: |
          echo "Executando testes de performance..."
          # Comandos de teste
```

---

## 🔐 Secrets Necessários

Configure estes secrets no GitHub (Settings → Secrets):

```
DOCKER_USERNAME          # Usuário Docker Hub
DOCKER_PASSWORD          # Senha Docker Hub
STAGING_HOST             # IP/domínio do servidor staging
STAGING_USER             # Usuário SSH staging
STAGING_SSH_KEY          # Chave SSH staging
PROD_HOST                # IP/domínio do servidor production
PROD_USER                # Usuário SSH production
PROD_SSH_KEY             # Chave SSH production
SONAR_TOKEN              # Token SonarQube
SLACK_WEBHOOK            # Webhook Slack para notificações
DATABASE_URL             # URL do banco de testes
JWT_SECRET               # Secret JWT
VITE_APP_ID              # App ID OAuth
```

---

## 📊 Matriz de Workflows

| Workflow       | Trigger          | Duração   | Ambiente   |
| -------------- | ---------------- | --------- | ---------- |
| **CI**         | Push/PR          | 5-10 min  | N/A        |
| **Testes**     | Push/PR          | 15-20 min | Docker     |
| **Segurança**  | Push/PR/Schedule | 10-15 min | N/A        |
| **Staging**    | Push develop     | 10-15 min | Staging    |
| **Production** | Push main/tags   | 15-20 min | Production |
| **Agendadas**  | Cron             | Variável  | N/A        |

---

## 🎯 Fluxo Completo de Desenvolvimento

```
1. DESENVOLVIMENTO LOCAL
   ├─ Criar branch: git checkout -b feature/xyz
   ├─ Fazer mudanças
   ├─ Commit: git commit -m "feat: xyz"
   └─ Push: git push origin feature/xyz

2. PULL REQUEST
   ├─ Abrir PR em GitHub
   ├─ CI roda automaticamente
   │  ├─ Lint & Type Check
   │  ├─ Build
   │  └─ Testes
   ├─ Segurança roda
   │  ├─ SAST
   │  └─ Dependency Check
   └─ Revisor aprova

3. MERGE PARA DEVELOP
   ├─ Merge PR
   ├─ Deploy para Staging automático
   └─ Testes em Staging

4. RELEASE PARA PRODUCTION
   ├─ Criar tag: git tag v1.0.0
   ├─ Push tag: git push origin v1.0.0
   ├─ Deploy para Production automático
   └─ Criar Release no GitHub
```

---

## 📈 Métricas e Monitoramento

### Badges para README.md

```markdown
![CI](https://github.com/CarlosHonorato70/blackbelt-platform/workflows/CI/badge.svg)
![Tests](https://github.com/CarlosHonorato70/blackbelt-platform/workflows/Testes/badge.svg)
![Security](https://github.com/CarlosHonorato70/blackbelt-platform/workflows/Segurança/badge.svg)
[![codecov](https://codecov.io/gh/CarlosHonorato70/blackbelt-platform/branch/main/graph/badge.svg)](https://codecov.io/gh/CarlosHonorato70/blackbelt-platform)
```

---

## 🚨 Troubleshooting CI/CD

### Erro: "Workflow não inicia"

- Verifique se o arquivo YAML está em `.github/workflows/`
- Valide sintaxe YAML
- Verifique permissões do repositório

### Erro: "Testes falhando"

- Verifique logs do workflow
- Teste localmente: `pnpm test`
- Verifique variáveis de ambiente

### Erro: "Deploy falhando"

- Verifique secrets configurados
- Teste SSH connection
- Verifique permissões do servidor

---

## ✅ Checklist de Implementação

- [ ] Criar pasta `.github/workflows/`
- [ ] Criar arquivo `ci.yml`
- [ ] Criar arquivo `test.yml`
- [ ] Criar arquivo `security.yml`
- [ ] Criar arquivo `deploy-staging.yml`
- [ ] Criar arquivo `deploy-production.yml`
- [ ] Criar arquivo `scheduled-tasks.yml`
- [ ] Configurar todos os secrets
- [ ] Testar CI em PR
- [ ] Testar deploy em staging
- [ ] Testar deploy em production
- [ ] Adicionar badges ao README
- [ ] Documentar processo

---

## 🎓 Próximas Melhorias

1. **Canary Deployment** - Deploy gradual para production
2. **Blue-Green Deployment** - Zero downtime deployment
3. **Feature Flags** - Ativar/desativar features remotamente
4. **Rollback Automático** - Reverter em caso de falha
5. **Performance Monitoring** - Monitorar performance após deploy
6. **Cost Optimization** - Otimizar custos de CI/CD

---

**Pipeline CI/CD completo e pronto para produção! 🚀**
