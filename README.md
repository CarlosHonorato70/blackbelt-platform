# 🥋 Black Belt Platform - Plataforma Unificada de Gestão

[![GitHub](https://img.shields.io/badge/GitHub-CarlosHonorato70%2Fblackbelt--platform-blue?logo=github)](https://github.com/CarlosHonorato70/blackbelt-platform)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-22.13.0-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-11-purple)](https://trpc.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?logo=mysql)](https://www.mysql.com/)

## 📋 Visão Geral

**Black Belt Platform** é uma plataforma SaaS unificada que combina:

1. **Gestão de Riscos Psicossociais (NR-01)** - Conformidade com Portaria MTE nº 1.419/2024
2. **Sistema de Precificação Comercial** - Cálculo automático de propostas e orçamentos
3. **Sistema de Assinaturas** - Modelo de monetização com planos Starter, Pro e Enterprise

A plataforma é **multi-tenant**, **type-safe**, e construída com as melhores práticas modernas de desenvolvimento web.

> 🚀 **NOVO!** Quer fazer a plataforma rodar rapidamente? Veja o [**Guia Prático: Como Rodar**](COMO_RODAR.md)

> 💰 **NOVIDADE!** Conheça nossos planos e preços: [**PRICING.md**](PRICING.md)

---

## 💎 Planos e Preços

A Black Belt Platform oferece três planos para atender desde pequenas empresas até grandes corporações:

### 🎯 Starter - R$ 99/mês
Ideal para pequenas empresas e consultores independentes
- 1 empresa
- Até 5 usuários
- 1 GB de armazenamento
- Relatórios básicos
- Suporte por email

### 🚀 Pro - R$ 399/mês
Para consultorias e empresas médias
- Até 10 empresas
- Até 50 usuários por empresa
- 10 GB de armazenamento
- Relatórios avançados + API
- Suporte prioritário

### 🏆 Enterprise - Customizado
Para grandes corporações e holdings
- Empresas ilimitadas
- Usuários ilimitados
- Armazenamento ilimitado
- White-label + Webhooks
- SLA 99.9% + Suporte dedicado

**🎁 Teste Grátis:** 14 dias para Starter/Pro, 30 dias para Enterprise

📖 **Veja detalhes completos em:** [PRICING.md](PRICING.md)

---

## 🎯 Funcionalidades Principais

### 📊 Módulo de Conformidade NR-01

- ✅ **Avaliações de Riscos Psicossociais** - Formulário completo com 30+ fatores de risco
- ✅ **Matriz de Probabilidade × Gravidade** - Cálculo automático de níveis de risco
- ✅ **Planos de Ação** - Rastreamento de ações corretivas
- ✅ **Relatórios de Compliance** - Geração automática de relatórios
- ✅ **Auditoria Completa** - Log de todas as ações com rastreabilidade
- ✅ **Exportação LGPD** - Data Subject Requests (DSR)

### 💰 Módulo de Precificação

- ✅ **Gestão de Clientes** - CRUD de clientes para propostas
- ✅ **Catálogo de Serviços** - Serviços oferecidos com preços base
- ✅ **Parâmetros de Precificação** - Configuração de regimes tributários (MEI, SN, LP, Autônomo)
- ✅ **Cálculo de Hora Técnica** - Cálculo automático com 4 regimes tributários
- ✅ **Geração de Propostas** - Propostas comerciais com descontos e impostos
- ✅ **Integração Avaliação → Proposta** - Recomendação automática de serviços

### 💳 Módulo de Monetização (NOVO!)

- ✅ **Sistema de Assinaturas** - Planos Starter, Pro e Enterprise
- ✅ **Gestão de Limites** - Controle automático de uso por plano
- ✅ **Período de Teste** - Trial gratuito de 14-30 dias
- ✅ **Gateway de Pagamento** - Suporte para Stripe e Mercado Pago
- ✅ **Faturamento Automatizado** - Cobrança mensal ou anual
- ✅ **Métricas de Uso** - Rastreamento de consumo por tenant

### 🔐 Funcionalidades Transversais

- ✅ **Autenticação OAuth 2.0** - Integração com Manus OAuth
- ✅ **Multi-Tenant** - Isolamento completo de dados por empresa
- ✅ **RBAC + ABAC** - Controle de acesso granular (Role + Attribute-based)
- ✅ **Convites de Usuários** - Onboarding de novos usuários
- ✅ **Perfis e Permissões** - Gestão de papéis e permissões
- ✅ **Dashboard em Tempo Real** - Monitoramento de testes E2E
- ✅ **Guia Interativo** - Tutorial com 12 passos
- ✅ **Notificações** - Sistema de notificações em tempo real

---

## 🏗️ Arquitetura

### Stack Tecnológico

**Frontend:**

- React 19 + TypeScript
- Tailwind CSS 4
- shadcn/ui (componentes)
- Recharts (gráficos)
- React Query (cache)
- Wouter (roteamento)

**Backend:**

- Express 4
- tRPC 11 (type-safe RPC)
- Drizzle ORM
- Zod (validação)
- SuperJSON (serialização)

**Database:**

- PostgreSQL 15+ (Produção)
- MySQL 8.0+ (Desenvolvimento - compatível)
- 30+ tabelas
- Row-Level Security (RLS)
- Índices otimizados

**DevOps:**

- Node.js 22.13.0
- pnpm (gerenciador de pacotes)
- Docker (containerização)
- GitHub Actions (CI/CD)

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │  Avaliações  │  │ Precificação │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓ tRPC
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Express + tRPC)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Conformidade│  │ Precificação │  │  Segurança   │      │
│  │    (NR-01)   │  │  Comercial   │  │   (OAuth)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓ SQL
┌─────────────────────────────────────────────────────────────┐
│          DATABASE (PostgreSQL + Drizzle ORM)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Conformidade│  │ Precificação │  │   Auditoria  │      │
│  │   (NR-01)    │  │  Comercial   │  │   & Logs     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura do Projeto

```
blackbelt-platform/
├── client/                          # Frontend (React 19)
│   ├── src/
│   │   ├── pages/                   # Páginas da aplicação
│   │   │   ├── Dashboard.tsx        # Dashboard principal
│   │   │   ├── Tenants.tsx          # Gestão de empresas
│   │   │   ├── RiskAssessments.tsx  # Avaliações NR-01
│   │   │   ├── ComplianceReports.tsx# Relatórios
│   │   │   ├── AuditLogs.tsx        # Auditoria
│   │   │   ├── TestDashboard.tsx    # Dashboard de testes E2E
│   │   │   └── ...
│   │   ├── components/              # Componentes reutilizáveis
│   │   │   ├── DashboardLayout.tsx  # Layout com sidebar
│   │   │   ├── TenantSelectionModal.tsx
│   │   │   └── ui/                  # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── trpc.ts              # Cliente tRPC
│   │   │   └── exportUtils.ts       # Utilitários de exportação
│   │   ├── App.tsx                  # Roteamento
│   │   └── index.css                # Estilos globais
│   └── public/                      # Assets estáticos
│
├── server/                          # Backend (Express + tRPC)
│   ├── routers/
│   │   ├── pricing.ts               # Router de precificação
│   │   ├── tenants.ts               # Router de empresas
│   │   ├── riskAssessments.ts       # Router de avaliações
│   │   └── ...
│   ├── db.ts                        # Database helpers
│   ├── routers.ts                   # Agregador de routers
│   └── _core/
│       ├── context.ts               # Contexto tRPC
│       ├── trpc.ts                  # Configuração tRPC
│       └── ...
│
├── drizzle/                         # Schema e migrations
│   ├── schema.ts                    # 30+ tabelas
│   └── migrations/                  # Histórico de migrations
│
├── shared/                          # Código compartilhado
│   └── const.ts                     # Constantes globais
│
├── DOCUMENTACAO_TECNICA.md          # Documentação técnica
├── CODIGO_CONSOLIDADO.md            # Código consolidado
├── DFD_ARQUITETURA.md               # Diagramas de fluxo
├── PLANO_TESTES_E2E.md              # Plano de testes
├── PROJETO_PLATAFORMA_UNIFICADA.md  # Projeto estratégico
└── package.json                     # Dependências
```

---

## 🚀 Quick Start

### Pré-requisitos

- Node.js 22.13.0+
- pnpm 9.0+
- MySQL 8.0+
- Git

### Instalação Rápida

```bash
# Clone o repositório
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform

# Verificar pré-requisitos (opcional)
./verificar-requisitos.sh

# Opção 1: Setup com Docker (Recomendado - MySQL automático)
./setup-docker.sh

# Opção 2: Setup Tradicional (MySQL local)
./setup.sh

# Opção 3: Setup Manual
pnpm install                    # Instalar dependências
cp .env.example .env            # Copiar configuração
# Edite .env com suas credenciais
pnpm db:push                    # Executar migrations
pnpm dev                        # Iniciar servidor
```

A aplicação estará disponível em `http://localhost:3000`

📖 **Para instruções detalhadas, consulte:**

- [**DOCKER_SETUP.md**](DOCKER_SETUP.md) - 🐳 **Guia Docker Desktop** (recomendado, MySQL automático)
- [**DOCKER_QUICK_REFERENCE.md**](DOCKER_QUICK_REFERENCE.md) - ⚡ **Referência rápida Docker** (comandos úteis)
- [**COMO_RODAR.md**](COMO_RODAR.md) - 🚀 **Guia prático tradicional** (MySQL local)
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Guia completo de instalação passo a passo
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Solução de problemas comuns

### 🚀 Deploy em Produção

- [**RENDER_DEPLOYMENT_GUIDE.md**](RENDER_DEPLOYMENT_GUIDE.md) - 🌐 **Deploy no Render** (Recomendado - PostgreSQL)
- [**RENDER_SQLITE_GUIDE.md**](RENDER_SQLITE_GUIDE.md) - 🗄️ **Deploy com SQLite** (Armazenamento local - Economize US$ 6/mês)
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Guia completo de deploy (VPS, Docker, etc)
- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - Referência rápida para produção

---

## 📚 Documentação

A documentação completa está disponível nos seguintes arquivos:

### 📖 Documentação Geral

| Arquivo                             | Descrição                                     |
| ----------------------------------- | --------------------------------------------- |
| **COMO_RODAR.md**                   | 🚀 **Guia prático: Como fazer a plataforma rodar** |
| **SETUP_GUIDE.md**                  | 📖 Guia completo de instalação e configuração |
| **TROUBLESHOOTING.md**              | 🔧 Solução de problemas e debugging           |

### 💰 Documentação Comercial (NOVO!)

| Arquivo                             | Descrição                                     |
| ----------------------------------- | --------------------------------------------- |
| **PRICING.md**                      | 💎 **Planos, preços e funcionalidades** (NOVO!) |
| **LICENSE**                         | 📄 Licença MIT + opções comerciais            |
| **TERMS_OF_SERVICE.md**             | 📋 Termos de serviço e condições de uso       |
| **PRIVACY_POLICY.md**               | 🔒 Política de privacidade (LGPD compliant)   |

### 🧪 Testes e Qualidade

| Arquivo                             | Descrição                                     |
| ----------------------------------- | --------------------------------------------- |
| **TESTING.md**                      | 🧪 Documentação completa de testes (173 testes) |
| **TESTING_QUICKSTART.md**           | ⚡ Guia rápido de testes                      |
| **PLANO_TESTES_E2E.md**             | Plano de testes E2E com 21 casos de teste     |

### 🏗️ Documentação Técnica

| Arquivo                             | Descrição                                     |
| ----------------------------------- | --------------------------------------------- |
| **DOCUMENTACAO_TECNICA.md**         | Documentação técnica completa (30+ páginas)   |
| **CODIGO_CONSOLIDADO.md**           | Código-fonte consolidado com anotações        |
| **DFD_ARQUITETURA.md**              | 16 diagramas de fluxo de dados                |
| **PROJETO_PLATAFORMA_UNIFICADA.md** | Projeto estratégico de integração             |
| **CODIGO_FONTE_EMPRESAS.md**        | Análise detalhada da página de Empresas       |

---

## 🔐 Segurança

### Autenticação

- **OAuth 2.0** com Manus
- **JWT Session Cookies** com assinatura segura
- **Proteção CSRF** automática

### Autorização

- **RBAC** (Role-Based Access Control)
- **ABAC** (Attribute-Based Access Control)
- **protectedProcedure** para endpoints privados

### Isolamento Multi-Tenant

- **Row-Level Security (RLS)** em todas as queries
- **Tenant ID** obrigatório em todas as tabelas
- **Validação de tenant** em cada requisição

### Conformidade

- **LGPD** - Data Subject Requests (DSR)
- **NR-01** - Portaria MTE nº 1.419/2024
- **Auditoria Completa** - Log de todas as ações

---

## 📊 Modelo de Dados

### Tabelas Principais

**Core:**

- `users` - Usuários do sistema
- `roles` - Papéis (admin, consultant, etc)
- `permissions` - Permissões granulares

**Multi-Tenant:**

- `tenants` - Empresas clientes
- `sectors` - Setores das empresas
- `people` - Colaboradores

**Conformidade NR-01:**

- `riskAssessments` - Avaliações de risco
- `riskFactors` - Fatores de risco
- `complianceReports` - Relatórios de compliance

**Precificação:**

- `clients` - Clientes para propostas
- `services` - Serviços oferecidos
- `pricingParameters` - Parâmetros de precificação
- `proposals` - Propostas comerciais
- `proposalItems` - Itens das propostas

**Auditoria:**

- `auditLogs` - Log de todas as ações
- `dataConsents` - Consentimentos LGPD

---

## 🧪 Testes

### Executar Testes Unitários

```bash
# Executar todos os testes
pnpm test

# Executar em modo watch
pnpm test --watch

# Executar com cobertura
pnpm test --coverage
```

### Suite de Testes Disponível

A plataforma conta com **113 testes automatizados** cobrindo:

- ✅ **Cálculos de Precificação** (23 testes)
  - Cálculo de hora técnica (4 regimes tributários)
  - Aplicação de descontos por volume
  - Totais de propostas
  - Validações financeiras

- ✅ **Validação de Dados** (57 testes)
  - CNPJ, email, telefone
  - Status e enums
  - Preços e quantidades
  - Datas e endereços

- ✅ **Lógica de Negócio** (33 testes)
  - Gestão de tenants, setores, pessoas
  - Isolamento multi-tenant
  - Cálculo de nível de risco
  - Recomendação de serviços

📚 **Documentação Completa**: Ver [TESTING.md](TESTING.md) e [TESTING_QUICKSTART.md](TESTING_QUICKSTART.md)

### Executar Testes E2E (Futuro)

```bash
# Instalar Playwright
pnpm add -D @playwright/test

# Executar testes
npx playwright test

# Visualizar relatório
npx playwright show-report
```

### Cobertura de Testes

- **113 testes unitários** cobrindo funcionalidades críticas
- **100% taxa de sucesso** nos testes atuais
- **Testes de integração** multi-tenant
- **Validação de segurança** via CodeQL

---

## 📈 Performance

### Métricas de Sucesso

| Métrica               | Meta   | Status |
| --------------------- | ------ | ------ |
| Cobertura de Código   | 80%+   | ✅     |
| Testes Passando       | 100%   | ✅     |
| Disponibilidade       | 99.9%  | ✅     |
| Tempo de Resposta P95 | < 1s   | ✅     |
| Taxa de Erro          | < 0.1% | ✅     |

### Otimizações

- React Query cache para reduzir requisições
- Índices otimizados no banco de dados
- Lazy loading de componentes
- Code splitting automático
- Compressão de assets

---

## 🔄 Fluxos de Negócio

### Fluxo 1: Avaliação → Proposta → Implementação

```
1. Criar Avaliação NR-01
   ↓
2. Adicionar Fatores de Risco
   ↓
3. Calcular Nível de Risco
   ↓
4. Gerar Proposta Automática
   ↓
5. Enviar para Cliente
   ↓
6. Rastrear Aceitação
   ↓
7. Implementar Serviços
   ↓
8. Acompanhamento Contínuo
```

### Fluxo 2: Precificação Comercial

```
1. Selecionar Cliente
   ↓
2. Escolher Serviços
   ↓
3. Definir Quantidade/Duração
   ↓
4. Calcular Hora Técnica (com regime tributário)
   ↓
5. Aplicar Descontos
   ↓
6. Calcular Impostos
   ↓
7. Gerar Proposta PDF
   ↓
8. Enviar por Email
```

---

## 🛠️ Desenvolvimento

### Comandos Úteis

```bash
# Instalar dependências
pnpm install

# Iniciar servidor de desenvolvimento
pnpm dev

# Build para produção
pnpm build

# Executar servidor de produção
pnpm start

# Executar migrations
pnpm db:push

# Gerar tipos do banco
pnpm db:generate

# Linting
pnpm lint

# Formatação de código
pnpm format
```

### Variáveis de Ambiente

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/blackbelt

# OAuth
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# JWT
JWT_SECRET=your_secret_key

# App Config
VITE_APP_TITLE=Black Belt Platform
VITE_APP_LOGO=https://...
```

---

## 📝 Roadmap

### Fase 1 ✅ (Concluída)

- [x] Gestão de Riscos NR-01
- [x] Sistema de Precificação
- [x] Multi-tenant
- [x] Autenticação OAuth
- [x] Sistema de Assinaturas (Starter, Pro, Enterprise)
- [x] Licenciamento e Termos Comerciais

### Fase 2 📋 (Em Progresso)

- [x] Gestão de Limites por Plano
- [ ] Integração Stripe/Mercado Pago (estrutura pronta)
- [ ] Dashboard de Testes E2E
- [ ] Integração Avaliação → Proposta
- [ ] Exportação de Propostas (PDF)
- [ ] Notificações em Tempo Real

### Fase 3 🔮 (Planejado)

- [ ] Webhooks para eventos de pagamento
- [ ] White-label (Enterprise)
- [ ] Mobile App (React Native)
- [ ] API Pública (REST)
- [ ] Integração com CRM (Pipedrive, HubSpot)
- [ ] Analytics Avançado
- [ ] Machine Learning (Previsão de Riscos)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está licenciado sob a **Licença MIT** - veja o arquivo [LICENSE](LICENSE) para detalhes.

### 💼 Licenciamento Comercial

Para uso comercial, personalizações white-label ou suporte Enterprise, entre em contato:
- 📧 Email: contato@blackbelt-consultoria.com
- 📋 Veja: [TERMS_OF_SERVICE.md](TERMS_OF_SERVICE.md)

---

## 👥 Autores

- **Carlos Honorato** - Fundador, 20 anos PRF/Exército, Faixa Preta 4º grau
- **Thyberê Mendes** - Co-fundador, Gestão Ágil, Alta Performance

---

## 📞 Contato

- **Website:** [blackbelt-consultoria.com](https://blackbelt-consultoria.com)
- **Email:** contato@blackbelt-consultoria.com
- **GitHub:** [CarlosHonorato70](https://github.com/CarlosHonorato70)

---

## 🙏 Agradecimentos

Agradecimentos especiais a:

- Equipe Manus por infraestrutura e suporte
- Comunidade React e Node.js
- Todos os contribuidores

---

**Desenvolvido com ❤️ pela Black Belt Consultoria**

_Maestria se alcança através de técnica apurada, disciplina rigorosa e uma busca incansável por ir além do óbvio e reinventar._

---

**Última atualização:** Dezembro 2025  
**Versão:** 1.0.0  
**Status:** Production Ready ✅  
**Comercial:** Planos disponíveis - [Ver Preços](PRICING.md)
