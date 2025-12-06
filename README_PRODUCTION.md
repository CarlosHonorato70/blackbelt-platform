# 🏢 Black Belt Platform - NR-01 Psychosocial Risk Assessment

[![CI](https://github.com/CarlosHonorato70/blackbelt-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/CarlosHonorato70/blackbelt-platform/actions/workflows/ci.yml)
[![Tests](https://github.com/CarlosHonorato70/blackbelt-platform/actions/workflows/test.yml/badge.svg)](https://github.com/CarlosHonorato70/blackbelt-platform/actions/workflows/test.yml)
[![Security](https://github.com/CarlosHonorato70/blackbelt-platform/actions/workflows/security.yml/badge.svg)](https://github.com/CarlosHonorato70/blackbelt-platform/actions/workflows/security.yml)

Plataforma completa para gestão de avaliações de riscos psicossociais conforme NR-01, incluindo questionário COPSOQ-II, geração automática de propostas comerciais e sistema de precificação inteligente.

## ✨ Características Principais

- 🔐 **Multi-tenant** com isolamento completo de dados
- 📋 **COPSOQ-II** - Questionário completo com 76 questões e 12 dimensões psicossociais
- ⚠️ **Avaliações NR-01** - Sistema completo de avaliação de riscos
- 💰 **Precificação Inteligente** - Geração automática de propostas baseadas em risco
- 📧 **Sistema de Email** - Templates profissionais para propostas e convites
- 🔒 **Segurança Robusta** - Rate limiting, CORS, headers de segurança
- 📊 **Dashboards** - Visualização de indicadores e métricas
- 🧪 **149 Testes** - Cobertura completa (unit, integration, E2E)

## 🚀 Quick Start

### Desenvolvimento Local

```bash
# Clone o repositório
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform

# Instale as dependências
pnpm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# Inicie o banco de dados com Docker
pnpm docker:up

# Execute as migrações
pnpm db:push

# Inicie o servidor de desenvolvimento
pnpm dev
```

Acesse: http://localhost:5173

### Produção com Docker

```bash
# Clone e configure
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform
cp .env.production.template .env

# Configure SSL (Let's Encrypt recomendado)
sudo certbot certonly --standalone -d seudomain.com

# Copie certificados
sudo mkdir -p docker/nginx/ssl
sudo cp /etc/letsencrypt/live/seudomain.com/*.pem docker/nginx/ssl/

# Inicie os serviços
docker compose -f docker-compose.production.yml up -d

# Verifique o status
docker compose -f docker-compose.production.yml ps
```

Ver [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) para guia completo.

## 📚 Documentação

- **[Guia do Usuário](./USER_GUIDE.md)** - Manual completo em português
- **[API Documentation](./API_DOCUMENTATION.md)** - Referência completa da API tRPC
- **[Developer Guide](./DEVELOPER_GUIDE.md)** - Arquitetura e padrões de desenvolvimento
- **[Security Documentation](./SECURITY_DOCUMENTATION.md)** - Segurança e compliance
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Deploy para produção detalhado
- **[Production Deployment](./PRODUCTION_DEPLOYMENT.md)** - Guia rápido de deploy

## 🏗️ Arquitetura

### Stack Tecnológica

**Frontend:**
- React 18 + TypeScript
- Vite (build tool)
- TanStack Query (React Query)
- Radix UI + Tailwind CSS
- React Hook Form + Zod

**Backend:**
- Node.js 22 + TypeScript
- tRPC (type-safe API)
- Express.js
- Drizzle ORM
- MongoDB

**Infraestrutura:**
- Docker + Docker Compose
- Nginx (reverse proxy)
- GitHub Actions (CI/CD)
- Let's Encrypt (SSL)

### Estrutura do Projeto

```
blackbelt-platform/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── components/    # Componentes reutilizáveis
│   │   └── lib/           # Utilitários e tRPC client
├── server/                # Backend Node.js
│   ├── _core/            # Core do servidor
│   │   ├── index.ts      # Entry point
│   │   ├── security.ts   # Middleware de segurança
│   │   └── email.ts      # Sistema de email
│   ├── routers/          # Routers tRPC
│   ├── db.ts             # Database layer
│   └── __tests__/        # Testes
├── docker/               # Configurações Docker
│   ├── nginx/           # Nginx configs
│   └── scripts/         # Scripts de deploy
└── shared/              # Código compartilhado
```

## 🧪 Testes

```bash
# Executar todos os testes
pnpm test

# Testes unitários
pnpm test:unit

# Testes de integração
pnpm test:integration

# Testes E2E
pnpm test:e2e

# Coverage
pnpm test:coverage
```

**Status dos Testes:**
- ✅ 149 testes passando (100%)
- Unit Tests: 33 testes
- Validation Tests: 57 testes
- Pricing Tests: 23 testes
- E2E Tests: 36 testes

## 🔒 Segurança

A plataforma implementa múltiplas camadas de segurança:

- **Rate Limiting**: 5 configurações diferentes por tipo de endpoint
- **CORS**: Validação de origem com whitelist
- **Headers de Segurança**: Helmet (CSP, HSTS, XSS Protection)
- **Autenticação**: OAuth 2.0 + JWT
- **Autorização**: RBAC + ABAC
- **Criptografia**: Dados sensíveis em repouso e em trânsito
- **Auditoria**: Logs completos de todas as ações
- **Isolamento Multi-tenant**: Segregação completa de dados

Ver [SECURITY_DOCUMENTATION.md](./SECURITY_DOCUMENTATION.md) para detalhes.

## 🚢 Deploy e CI/CD

### Deploy Automático

O projeto inclui GitHub Actions configurado para deploy automático:

1. **Push para `main`** → Deploy para produção
2. **Tags `v*.*.*`** → Release versionado
3. **Pull Requests** → Testes automáticos

### Deploy Manual

```bash
# Build da aplicação
pnpm build

# Deploy com Docker
docker compose -f docker-compose.production.yml up -d

# Ou deploy manual
NODE_ENV=production node dist/index.js
```

### Comandos Úteis

```bash
# Backup do banco
docker compose -f docker-compose.production.yml run --rm mongodb-backup

# Restore do banco
docker/scripts/restore.sh /backups/backup_file.tar.gz

# Health check
docker/scripts/health-check.sh

# Migrações
docker/scripts/migrate.sh

# Logs
docker compose -f docker-compose.production.yml logs -f

# Restart
docker compose -f docker-compose.production.yml restart
```

## 📊 Funcionalidades

### Módulo NR-01

- Avaliação de riscos psicossociais
- Gestão de fatores de risco
- Matriz de severidade/probabilidade
- Planos de ação e intervenções
- Relatórios de compliance
- Exportação (PDF, Excel, JSON)

### Módulo COPSOQ-II

- Questionário completo (76 questões)
- 12 dimensões psicossociais
- Convites em massa por email
- Sistema de lembretes automáticos
- Agregação de respostas
- Classificação de risco organizacional
- Relatórios com estatísticas

### Módulo de Precificação

- Cadastro de clientes e serviços
- Cálculo automático de preços
- Impostos por regime tributário
- Geração de propostas comerciais
- Integração com avaliações
- Email automático de propostas

### Funcionalidades Gerais

- Multi-tenant com seleção visual
- Gestão de usuários e permissões (RBAC/ABAC)
- Dashboard com indicadores
- Auditoria completa (logs)
- Notificações em tempo real
- Exportação de dados (LGPD)
- Guia interativo para novos usuários

## 🌍 Ambientes

- **Desenvolvimento**: http://localhost:5173
- **Produção**: https://seudomain.com
- **API**: https://seudomain.com/api
- **Health Check**: https://seudomain.com/health

## 📈 Monitoramento

O sistema inclui:

- Health checks automáticos (HTTP, Database, Resources)
- Logs estruturados com rotação
- Métricas de performance (Docker stats)
- Dashboard de segurança
- Alertas de backup e falhas

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto é propriedade da Black Belt Consultoria. Todos os direitos reservados.

## 👥 Equipe

- **Carlos Honorato** - Founder & Lead Developer
- **GitHub Copilot** - AI Development Assistant

## 📞 Suporte

- 📧 Email: suporte@blackbelt.com.br
- 🐛 Issues: [GitHub Issues](https://github.com/CarlosHonorato70/blackbelt-platform/issues)
- 📖 Docs: Ver links de documentação acima

## 🎯 Roadmap

- [x] #37 - Permissões Multi-Tenant
- [x] #38 - Avaliações NR-01 (Backend + Frontend)
- [x] #39 - Convites COPSOQ (com lembretes)
- [x] #40 - Integração Avaliação → Proposta → Email
- [x] #41 - Testes E2E Finais
- [x] #42 - Segurança e Limitação de Taxa
- [x] #43 - Documentação Completa
- [x] #44 - Implantação e Produção
- [ ] Melhorias futuras: Redis, Email Queue, S3, Analytics avançados

---

**Black Belt Consultoria** - Excelência em Gestão de Riscos Psicossociais
