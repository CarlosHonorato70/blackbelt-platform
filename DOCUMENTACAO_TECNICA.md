# Documentação Técnica - Black Belt Platform

## Plataforma de Gestão de Riscos Psicossociais e Desenvolvimento Humano

**Versao:** 2.0.0
**Data de Criacao:** Novembro 2025
**Ultima Atualizacao:** Abril 2026
**Status:** Pronto para Producao
**Ambiente:** Multi-Tenant com Row-Level Security (RLS)

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estrutura do Projeto](#estrutura-do-projeto)
5. [Funcionalidades Implementadas](#funcionalidades-implementadas)
6. [Modelo de Dados](#modelo-de-dados)
7. [Fluxos de Negócio](#fluxos-de-negócio)
8. [Segurança e Conformidade](#segurança-e-conformidade)
9. [Testes Realizados](#testes-realizados)
10. [Guia de Deployment](#guia-de-deployment)

---

## 🎯 Visão Geral

### Objetivo da Plataforma

A **Black Belt Platform** é uma solução **SaaS multi-tenant** desenvolvida para gerenciar riscos psicossociais em ambientes corporativos, em conformidade com a **Portaria MTE nº 1.419/2024 (NR-01)**.

### Públicos-Alvo

- **Empresas**: Gestão centralizada de avaliações de riscos psicossociais
- **Consultores**: Monitoramento de múltiplos clientes
- **Colaboradores**: Participação em avaliações e acesso a programas de resiliência
- **Administradores**: Conformidade regulatória e auditoria

### Diferenciais

- ✅ Método Black Belt de Resiliência (baseado em 20+ anos de experiência)
- ✅ Conformidade total com NR-01 (Portaria MTE nº 1.419/2024)
- ✅ LGPD ready (Data Subject Requests - DSR)
- ✅ Multi-tenant com isolamento de dados por empresa
- ✅ RBAC granular com suporte a ABAC
- ✅ Auditoria completa de todas as ações
- ✅ Exportação de dados em múltiplos formatos

---

## 🏗️ Arquitetura

### Padrão Arquitetural: Monolítico Escalável

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 19)                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 48 Pages (Dashboard, Empresas, Setores, COPSOQ, etc.) │  │
│  │ Components (shadcn/ui + Tailwind CSS)                  │  │
│  │ Contexts (TenantContext, ThemeContext)                  │  │
│  │ Hooks (useAuth, useTenant)                             │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                             | (tRPC)
┌──────────────────────────────────────────────────────────────┐
│                   BACKEND (Express + tRPC)                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 47 Routers (tRPC procedures)                           │  │
│  │ |-- auth, tenants, sectors, people                     │  │
│  │ |-- riskAssessments, copsoq, climateSurveys            │  │
│  │ |-- complianceChecklist, esocialExport                 │  │
│  │ |-- psychosocialDashboard, benchmark                   │  │
│  │ |-- agent, supportAgent                                │  │
│  │ |-- nr01Pdf, pcmsoIntegration                          │  │
│  │ |-- proposals, clients, services, pricingParameters    │  │
│  │ +-- auditLogs, system, subscriptions, tickets ...      │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ Modulo IA (server/_ai/)                                │  │
│  │ |-- agentOrchestrator.ts (10 fases + auto-transicoes)  │  │
│  │ |-- agentAlerts.ts, actionPlanGenerator.ts, nlp.ts     │  │
│  │ +-- prompts/ (agent-system, copsoq-analysis, etc.)     │  │
│  ├────────────────────────────────────────────────────────┤  │
│  │ Core (server/_core/)                                   │  │
│  │ |-- llm.ts (invokeLLM - OpenAI)                        │  │
│  │ |-- cookies.ts (HMAC sessions)                         │  │
│  │ +-- context.ts, env.ts, notification.ts                │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                             | (SQL)
┌──────────────────────────────────────────────────────────────┐
│            DATABASE (MySQL 8 + Drizzle ORM)                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 85 tabelas em 3 schemas:                               │  │
│  │ schema.ts (47) - core, tenants, people, pricing, audit │  │
│  │ schema_nr01.ts (34) - risk, COPSOQ, action plans,      │  │
│  │   compliance, eSocial, benchmarks, pcmso_exam_results  │  │
│  │ schema_agent.ts (4) - conversations, messages,          │  │
│  │   alerts, actions                                       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Estratégia Multi-Tenant: Row-Level Security (RLS)

Todas as tabelas de negócio incluem `tenantId` para isolamento de dados:

```sql
-- Exemplo: Tabela de Setores
CREATE TABLE sectors (
  id VARCHAR(64) PRIMARY KEY,
  tenantId VARCHAR(64) NOT NULL,  -- ← Isolamento por tenant
  name VARCHAR(255) NOT NULL,
  description TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  INDEX idx_sector_tenant (tenantId)
);

-- Query com RLS automático
SELECT * FROM sectors
WHERE tenantId = ? AND id = ?;
```

**Benefícios:**

- ✅ Dados isolados por empresa
- ✅ Escalabilidade horizontal
- ✅ Conformidade com LGPD (dados separados por pessoa jurídica)
- ✅ Custo operacional reduzido vs. dedicated schemas

---

## 💻 Stack Tecnológico

### Frontend

| Tecnologia        | Versão   | Propósito                   |
| ----------------- | -------- | --------------------------- |
| **React**         | 19.1.1   | Framework UI                |
| **Vite**          | 7.1.7    | Build tool e dev server     |
| **TypeScript**    | 5.9.3    | Type safety                 |
| **Tailwind CSS**  | 4.1.14   | Styling utilitário          |
| **shadcn/ui**     | Latest   | Componentes acessíveis      |
| **React Router DOM** | 7.x  | Roteamento SPA              |
| **React Query**   | 5.90.2   | State management (via tRPC) |
| **Recharts**      | 2.15.2   | Gráficos de dados           |
| **Framer Motion** | 12.23.22 | Animações                   |
| **date-fns**      | 4.1.0    | Manipulação de datas        |
| **Zod**           | 4.1.12   | Validação de schemas        |
| **xlsx**          | 0.18.5   | Exportação para Excel       |

### Backend

| Tecnologia      | Versão  | Propósito               |
| --------------- | ------- | ----------------------- |
| **Express**     | 4.21.2  | Framework HTTP          |
| **tRPC**        | 11.6.0  | RPC type-safe           |
| **TypeScript**  | 5.9.3   | Type safety             |
| **Drizzle ORM** | 0.44.5  | Query builder type-safe |
| **MySQL2**      | 3.15.0  | Driver MySQL            |
| **jose**        | 6.1.0   | JWT signing             |
| **SuperJSON**   | 1.13.3  | Serialização avançada   |
| **AWS SDK**     | 3.693.0 | S3 storage              |

### Banco de Dados

| Tecnologia      | Versão | Propósito                      |
| --------------- | ------ | ------------------------------ |
| **MySQL**       | 8.0+   | Database relacional            |
| **Drizzle Kit** | 0.31.4 | Migrations e schema management |

### DevOps & Ferramentas

| Tecnologia   | Versão  | Propósito           |
| ------------ | ------- | ------------------- |
| **Node.js**  | 22.13.0 | Runtime             |
| **pnpm**     | 10.4.1  | Package manager     |
| **Prettier** | 3.6.2   | Code formatting     |
| **Vitest**   | 2.1.4   | Unit testing        |
| **tsx**      | 4.19.1  | TypeScript executor |

---

## 📁 Estrutura do Projeto

```
blackbelt-platform/
├── client/                          # Frontend React
│   ├── public/                      # Assets estáticos
│   │   └── logo.svg
│   ├── src/
│   │   ├── pages/                   # Páginas da aplicação
│   │   │   ├── Home.tsx             # Dashboard principal
│   │   │   ├── Empresas.tsx         # Gestão de tenants
│   │   │   ├── Setores.tsx          # Gestão de setores
│   │   │   ├── Colaboradores.tsx    # Gestão de pessoas
│   │   │   ├── RiskAssessments.tsx  # Avaliações NR-01
│   │   │   ├── ComplianceReports.tsx # Relatórios
│   │   │   ├── AuditLogs.tsx        # Auditoria
│   │   │   ├── ExportLGPD.tsx       # DSR LGPD
│   │   │   ├── UserInvites.tsx      # Convites
│   │   │   ├── RolesPermissions.tsx # RBAC
│   │   │   └── NotFound.tsx         # 404
│   │   ├── components/              # Componentes reutilizáveis
│   │   │   ├── DashboardLayout.tsx  # Layout com sidebar
│   │   │   ├── ErrorBoundary.tsx    # Error handling
│   │   │   ├── TenantSelectionModal.tsx
│   │   │   └── ui/                  # shadcn/ui components
│   │   ├── contexts/                # React contexts
│   │   │   ├── TenantContext.tsx    # Seleção de empresa
│   │   │   └── ThemeContext.tsx     # Dark/light mode
│   │   ├── hooks/                   # Custom hooks
│   │   │   ├── useAuth.ts           # Auth state
│   │   │   └── useTheme.ts          # Theme switching
│   │   ├── lib/                     # Utilitários
│   │   │   ├── trpc.ts              # tRPC client setup
│   │   │   └── exportUtils.ts       # Funções de exportação
│   │   ├── const.ts                 # Constantes globais
│   │   ├── App.tsx                  # Router principal
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Estilos globais
│   └── vite.config.ts               # Configuração Vite
│
├── server/                          # Backend Express + tRPC
│   ├── _core/                       # Framework internals
│   │   ├── index.ts                 # Servidor Express
│   │   ├── context.ts               # tRPC context builder
│   │   ├── trpc.ts                  # tRPC instance
│   │   ├── cookies.ts               # Session management (HMAC)
│   │   ├── env.ts                   # Environment variables
│   │   ├── notification.ts          # Owner notifications
│   │   ├── llm.ts                   # invokeLLM (OpenAI)
│   │   ├── imageService.ts          # Image generation
│   │   └── systemRouter.ts          # System procedures
│   ├── _ai/                         # Modulo de IA
│   │   ├── prompts/                 # System prompts
│   │   │   ├── agent-system.ts      # Prompt do agente principal
│   │   │   ├── copsoq-analysis.ts   # Analise COPSOQ
│   │   │   ├── risk-inventory.ts    # Inventario de riscos
│   │   │   └── gro-document.ts      # Documento GRO
│   │   ├── agentOrchestrator.ts     # 10 fases + auto-transicoes
│   │   ├── agentAlerts.ts           # Alertas do agente
│   │   ├── actionPlanGenerator.ts   # Gerador de planos de acao
│   │   └── nlp.ts                   # Processamento de linguagem natural
│   ├── db.ts                        # Database helpers
│   ├── routers.ts                   # tRPC procedure definitions (47 routers)
│   └── storage.ts                   # S3 storage helpers
│
├── drizzle/                         # Database schema (85 tabelas)
│   ├── schema.ts                    # 47 tabelas (core, tenants, people, pricing, audit)
│   ├── schema_nr01.ts               # 34 tabelas (risk, COPSOQ, action plans, compliance, eSocial, benchmarks, pcmso)
│   ├── schema_agent.ts              # 4 tabelas (conversations, messages, alerts, actions)
│   ├── seed.ts                      # Seed data (8 etapas)
│   └── migrations/                  # SQL migrations
│
├── shared/                          # Código compartilhado
│   ├── const.ts                     # Constantes
│   └── types.ts                     # Tipos TypeScript
│
├── storage/                         # S3 helpers
│   └── index.ts
│
├── drizzle.config.ts                # Drizzle configuration
├── tsconfig.json                    # TypeScript config
├── tailwind.config.ts               # Tailwind config
├── package.json                     # Dependencies
├── pnpm-lock.yaml                   # Lock file
└── README.md                        # Documentação
```

---

## ✨ Funcionalidades Implementadas

### 1. **Autenticacao e Autorizacao**

#### Autenticacao Local (bcrypt-12 + HMAC sessions + 2FA)

```typescript
// Fluxo de login
1. Usuario insere email/senha na pagina de login
2. Backend valida senha com bcrypt-12
3. Se 2FA habilitado, solicita codigo TOTP
4. Session cookie HMAC-signed criado
5. Usuario autenticado

// Cadeia de procedures (middleware)
public -> protected -> tenant -> subscribed -> admin
```

#### Contexto de Autenticacao

```typescript
// useAuth() hook
const { user, loading, isAuthenticated, logout } = useAuth();

// Retorna:
{
  user: {
    id: string,
    name: string,
    email: string,
    role: "user" | "admin"
  },
  loading: boolean,
  isAuthenticated: boolean,
  logout: () => Promise<void>
}
```

### 2. **Multi-Tenant com Seleção Visual**

#### Modal de Seleção de Empresa

```typescript
// TenantSelectionModal.tsx
- Exibe lista de empresas disponíveis
- Seleção visual com highlight
- Confirmação com botão "Confirmar Seleção"
- Armazenamento em TenantContext
- Persistência em localStorage
```

#### Contexto de Tenant

```typescript
// TenantContext.tsx
const { selectedTenant, setSelectedTenant } = useTenant();

// Retorna:
{
  id: string,
  name: string,
  cnpj: string
}
```

### 3. **Gestão de Empresas (Tenants)**

**Página: `/empresas`**

Funcionalidades:

- ✅ Listagem de empresas com paginação
- ✅ Criação de nova empresa (modal)
- ✅ Edição de dados da empresa
- ✅ Exclusão com confirmação
- ✅ Filtro por status (ativo, inativo, suspenso)
- ✅ Visualização de CNPJ e contato

Campos:

```typescript
{
  id: string,
  name: string,
  cnpj: string,
  street: string,
  number: string,
  complement: string,
  neighborhood: string,
  city: string,
  state: string,
  zipCode: string,
  contactName: string,
  contactEmail: string,
  contactPhone: string,
  status: "active" | "inactive" | "suspended",
  strategy: "shared_rls" | "dedicated_schema",
  createdAt: Date,
  updatedAt: Date
}
```

### 4. **Gestão de Setores**

**Página: `/setores`**

Funcionalidades:

- ✅ Listagem de setores por empresa
- ✅ Criação de novo setor
- ✅ Edição de setor
- ✅ Exclusão com confirmação
- ✅ Filtro por empresa
- ✅ Visualização de responsável

Campos:

```typescript
{
  id: string,
  tenantId: string,
  name: string,
  description: string,
  responsibleName: string,
  unit: string,
  shift: string,
  createdAt: Date,
  updatedAt: Date
}
```

### 5. **Gestão de Colaboradores**

**Página: `/colaboradores`**

Funcionalidades:

- ✅ Listagem de colaboradores por empresa
- ✅ Filtro por setor
- ✅ Criação de novo colaborador
- ✅ Edição de dados
- ✅ Exclusão com confirmação
- ✅ Tipo de vínculo (próprio/terceirizado)

Campos:

```typescript
{
  id: string,
  tenantId: string,
  sectorId: string,
  name: string,
  position: string,
  email: string,
  phone: string,
  employmentType: "own" | "outsourced",
  createdAt: Date,
  updatedAt: Date
}
```

### 6. **Avaliações de Riscos Psicossociais (NR-01)**

**Página: `/risk-assessments`**

#### Funcionalidades

- ✅ Listagem de avaliações com status
- ✅ Criação de nova avaliação (modal)
- ✅ Visualização de detalhes
- ✅ Edição de avaliação
- ✅ **Exportação em 3 formatos:**
  - 📄 Texto (relatório formatado)
  - 📊 JSON (dados estruturados)
  - 📈 Excel (planilha)
- ✅ Exclusão com confirmação
- ✅ Filtro por status e nível de risco

#### Campos da Avaliação

```typescript
{
  id: string,
  title: string,
  tenant: string,
  sector: string,
  date: string,
  status: "draft" | "in_progress" | "completed" | "reviewed",
  riskLevel: "low" | "medium" | "high" | "critical",
  assessor: string,

  // Dados de avaliação
  methodology: string,
  riskFactors: Array<{
    id: string,
    name: string,
    probability: number,
    severity: number,
    controlMeasures: string[]
  }>,

  // Resultado
  overallRisk: number,
  actionPlan: string,
  nextReviewDate: Date
}
```

#### Badges de Status

```typescript
- draft: "Rascunho" (cinza)
- in_progress: "Em Andamento" (azul)
- completed: "Concluída" (verde)
- reviewed: "Revisada" (roxo)
```

#### Badges de Risco

```typescript
- low: "Baixo" (verde)
- medium: "Médio" (amarelo)
- high: "Alto" (laranja)
- critical: "Crítico" (vermelho)
```

### 7. **Relatórios de Compliance NR-01**

**Página: `/compliance-reports`**

Funcionalidades:

- ✅ Listagem de relatórios
- ✅ Geração automática de relatórios
- ✅ **Exportação em 3 formatos:**
  - 📄 Texto
  - 📊 JSON
  - 📈 Excel
- ✅ Visualização de checklist de conformidade
- ✅ Plano de ação integrado
- ✅ Status de implementação

### 8. **Auditoria (Logs)**

**Página: `/auditoria`**

Funcionalidades:

- ✅ Listagem de todos os logs de auditoria
- ✅ Filtro por usuário, ação, data
- ✅ Visualização de mudanças (antes/depois)
- ✅ **Exportação em 3 formatos:**
  - 📄 Texto
  - 📊 JSON
  - 📈 Excel
- ✅ Rastreamento de IP e User Agent
- ✅ Timestamp preciso (UTC)

Campos de Log:

```typescript
{
  id: string,
  tenantId: string,
  userId: string,
  action: "CREATE" | "READ" | "UPDATE" | "DELETE",
  entityType: string,
  entityId: string,
  oldValues: Record<string, any>,
  newValues: Record<string, any>,
  ipAddress: string,
  userAgent: string,
  timestamp: Date
}
```

### 9. **Exportação LGPD (Data Subject Requests)**

**Página: `/exportacao-lgpd`**

Funcionalidades:

- ✅ Formulário de solicitação DSR
- ✅ Seleção de dados a exportar
- ✅ **Múltiplos formatos:**
  - 📄 Texto
  - 📊 JSON
  - 📈 Excel
- ✅ Conformidade com LGPD
- ✅ Download seguro com timestamp

### 10. **Convites de Usuários**

**Página: `/convites-usuarios`**

Funcionalidades:

- ✅ Envio de convites por e-mail
- ✅ Geração de token único
- ✅ Rastreamento de status (pending, accepted, expired, cancelled)
- ✅ Expiração automática (7 dias)
- ✅ Resgate de convite com ativação de conta

### 11. **Perfis e Permissões (RBAC)**

**Página: `/perfis-permissoes`**

Funcionalidades:

- ✅ CRUD de roles customizadas
- ✅ Atribuição de permissões granulares
- ✅ Suporte a ABAC (Attribute-Based Access Control)
- ✅ Herança de permissões
- ✅ Auditoria de mudanças

Estrutura RBAC:

```typescript
// Roles (Perfis)
{
  id: string,
  systemName: string,
  displayName: string,
  description: string,
  scope: "global" | "tenant"
}

// Permissions (Permissões)
{
  id: string,
  name: string,        // ex: "colaboradores.create"
  resource: string,    // ex: "colaboradores"
  action: string,      // ex: "create"
  description: string
}

// Role-Permission (Associação com condições ABAC)
{
  id: string,
  roleId: string,
  permissionId: string,
  tenantId: string,
  conditions: {        // JSON com condições
    sector_id?: string,
    own_data_only?: boolean
  }
}
```

### 12. **Guia Interativo**

**Componente: Tour com 12 passos**

Funcionalidades:

- ✅ Onboarding para novos usuários
- ✅ 12 passos cobrindo todas as funcionalidades
- ✅ Tooltips informativos
- ✅ Navegação com setas
- ✅ Opção de pular/concluir

---

## 🗄️ Modelo de Dados

### Diagrama ER (Entidade-Relacionamento)

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS                               │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                     │
│ name                                                        │
│ email (UNIQUE)                                              │
│ loginMethod                                                 │
│ role (user | admin)                                         │
│ createdAt                                                   │
│ lastSignedIn                                                │
└─────────────────────────────────────────────────────────────┘
         │
         │ 1:N
         ├─────────────────────────────────────────────────────────┐
         │                                                         │
         ▼                                                         ▼
┌──────────────────────┐                          ┌──────────────────────┐
│    USER_ROLES        │                          │    AUDIT_LOGS        │
├──────────────────────┤                          ├──────────────────────┤
│ id (PK)              │                          │ id (PK)              │
│ userId (FK)          │                          │ userId (FK)          │
│ roleId (FK)          │                          │ tenantId (FK)        │
│ tenantId (FK)        │                          │ action               │
│ createdAt            │                          │ entityType           │
└──────────────────────┘                          │ entityId             │
         │                                        │ oldValues            │
         │ N:1                                    │ newValues            │
         ▼                                        │ ipAddress            │
┌──────────────────────┐                          │ userAgent            │
│      ROLES           │                          │ timestamp            │
├──────────────────────┤                          └──────────────────────┘
│ id (PK)              │
│ systemName (UNIQUE)  │
│ displayName          │
│ description          │
│ scope                │
│ createdAt            │
└──────────────────────┘
         │
         │ N:M
         ├─────────────────────────────────────────────────────────┐
         │                                                         │
         ▼                                                         ▼
┌──────────────────────┐                          ┌──────────────────────┐
│ ROLE_PERMISSIONS     │                          │   PERMISSIONS        │
├──────────────────────┤                          ├──────────────────────┤
│ id (PK)              │                          │ id (PK)              │
│ roleId (FK)          │                          │ name (UNIQUE)        │
│ permissionId (FK)    │                          │ resource             │
│ tenantId (FK)        │                          │ action               │
│ conditions (JSON)    │                          │ description          │
│ createdAt            │                          │ createdAt            │
└──────────────────────┘                          └──────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│                       TENANTS                               │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                     │
│ name                                                        │
│ cnpj (UNIQUE)                                               │
│ street, number, complement, neighborhood, city, state, zip  │
│ contactName, contactEmail, contactPhone                     │
│ status (active | inactive | suspended)                      │
│ strategy (shared_rls | dedicated_schema)                    │
│ schemaName                                                  │
│ createdAt, updatedAt                                        │
└─────────────────────────────────────────────────────────────┘
         │
         │ 1:N
         ├──────────────────────────────────────────────────────┐
         │                                                      │
         ▼                                                      ▼
┌──────────────────────┐                         ┌──────────────────────┐
│     SECTORS          │                         │  TENANT_SETTINGS     │
├──────────────────────┤                         ├──────────────────────┤
│ id (PK)              │                         │ id (PK)              │
│ tenantId (FK)        │                         │ tenantId (FK)        │
│ name                 │                         │ settingKey           │
│ description          │                         │ settingValue (JSON)  │
│ responsibleName      │                         │ createdAt, updatedAt │
│ unit                 │                         └──────────────────────┘
│ shift                │
│ createdAt, updatedAt │
└──────────────────────┘
         │
         │ 1:N
         ▼
┌──────────────────────┐
│      PEOPLE          │
├──────────────────────┤
│ id (PK)              │
│ tenantId (FK)        │
│ sectorId (FK)        │
│ name                 │
│ position             │
│ email                │
│ phone                │
│ employmentType       │
│ createdAt, updatedAt │
└──────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│              LGPD & COMPLIANCE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │  DATA_CONSENTS       │    │  USER_INVITES        │      │
│  ├──────────────────────┤    ├──────────────────────┤      │
│  │ id (PK)              │    │ id (PK)              │      │
│  │ tenantId (FK)        │    │ tenantId (FK)        │      │
│  │ personId (FK)        │    │ email                │      │
│  │ consentType          │    │ roleId (FK)          │      │
│  │ granted              │    │ token (UNIQUE)       │      │
│  │ grantedAt            │    │ status               │      │
│  │ revokedAt            │    │ invitedBy (FK)       │      │
│  │ ipAddress            │    │ expiresAt            │      │
│  │ userAgent            │    │ acceptedAt           │      │
│  │ version              │    │ createdAt            │      │
│  │ createdAt            │    └──────────────────────┘      │
│  └──────────────────────┘                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Schemas do Banco de Dados (85 tabelas)

#### schema.ts (47 tabelas - Core)

Tabelas de infraestrutura da plataforma:
- **Core:** users, roles, permissions, role_permissions, user_roles
- **Multi-Tenant:** tenants, tenant_settings, sectors, people
- **Pricing:** plans, features, plan_features, subscriptions, invoices
- **CRM:** clients, services, pricing_parameters, proposals, proposal_items, assessment_proposals
- **Audit:** audit_logs, data_consents
- **Auth:** user_invites, password_reset_tokens, two_factor_secrets
- **Support:** tickets, ticket_messages
- **Upload:** uploads, storage_quotas

#### schema_nr01.ts (34 tabelas - NR-01)

Tabelas especificas para gestao de riscos psicossociais:
- **Risk:** risk_assessments, risk_items, risk_factors, risk_factor_categories
- **COPSOQ:** copsoq_assessments, copsoq_invites, copsoq_responses, copsoq_dimensions
- **Climate Surveys:** climate_surveys, climate_survey_invites, climate_survey_responses, climate_survey_instruments
- **Action Plans:** action_plans, action_plan_items, action_plan_reviews
- **Compliance:** compliance_checklist_items, compliance_reports
- **eSocial:** esocial_exports, esocial_events, esocial_certificates
- **Dashboard:** psychosocial_metrics, dimension_scores, sector_comparisons
- **Benchmarks:** benchmarks, benchmark_sectors
- **PCMSO:** pcmso_integrations, pcmso_exam_results
- **PDF:** pdf_exports, pdf_templates

#### schema_agent.ts (4 tabelas - Agente IA)

Tabelas para o agente conversacional:
- **agent_conversations:** Conversas entre usuario e agente
- **agent_messages:** Mensagens com role (user/assistant/system)
- **agent_alerts:** Alertas gerados pelo monitoramento
- **agent_actions:** Acoes executadas pelo agente

---

### Routers por Dominio (47 routers)

| Dominio | Routers |
|---------|---------|
| **Autenticacao** | auth, twoFactor |
| **Multi-Tenant** | tenants, sectors, people, tenantSettings |
| **Avaliacoes** | riskAssessments, copsoq, climateSurveys |
| **Compliance** | complianceChecklist, complianceReports |
| **Dashboard** | psychosocialDashboard, benchmark |
| **eSocial** | esocialExport |
| **IA** | agent, supportAgent |
| **PDF/Relatorios** | nr01Pdf, pcmsoIntegration |
| **CRM/Precificacao** | clients, services, pricingParameters, proposals, assessmentProposals |
| **Assinatura** | subscriptions, plans, features |
| **Pagamentos** | asaasPayments, asaasWebhook |
| **Admin** | adminSubscriptions, impersonation, metrics |
| **Suporte** | tickets |
| **Auditoria** | auditLogs |
| **Sistema** | system, uploads, userInvites, rolesPermissions |

---

### Geracao de PDF

O modulo `nr01Pdf` gera relatorios PDF usando um sistema de secoes tipadas:

```typescript
type PdfSectionType =
  | "title"      // Titulo principal
  | "subtitle"   // Subtitulo
  | "text"       // Paragrafo de texto
  | "kpis"       // Indicadores-chave (cards)
  | "table"      // Tabela de dados
  | "list"       // Lista com bullets
  | "divider"    // Separador horizontal
  | "spacer"     // Espaco vertical
  | "signature"; // Bloco de assinatura
```

Relatorios disponiveis: GRO, COPSOQ, PGR Consolidado, Integracao PCMSO, Pesquisa de Clima, Tendencias de Avaliacoes, Comparacao com Benchmarks.

Todos retornam `{ filename: string, data: string }` com conteudo base64.

---

### Integracao eSocial

Exportacao de eventos trabalhistas para o eSocial do governo federal:

- **Eventos suportados:** S-2210 (CAT), S-2220 (ASO), S-2240 (Condicoes Ambientais)
- **Protocolo:** SOAP sobre HTTPS
- **Autenticacao:** mTLS com certificado digital A1 (e-CNPJ)
- **Fluxo:** Gerar XML -> Validar contra XSD -> Assinar digitalmente -> Enviar -> Receber recibo
- **Tabela de controle:** esocial_exports (status: pending/validated/submitted/accepted/rejected)

---

### Modulo de IA (server/_ai/)

#### Agente Orquestrador (agentOrchestrator.ts)

O agente opera em 10 fases com transicoes automaticas:

1. **greeting** - Saudacao e contextualizacao
2. **data_collection** - Coleta de dados do tenant
3. **copsoq_analysis** - Analise dos resultados COPSOQ
4. **risk_identification** - Identificacao de fatores de risco
5. **risk_evaluation** - Avaliacao de probabilidade x gravidade
6. **action_planning** - Geracao de planos de acao (IA)
7. **compliance_check** - Verificacao de conformidade NR-01
8. **report_generation** - Geracao de relatorios PDF
9. **monitoring** - Monitoramento continuo de indicadores
10. **review** - Revisao e ajuste de planos

#### Prompts (server/_ai/prompts/)

- **agent-system.ts** - Prompt base do agente com contexto NR-01
- **copsoq-analysis.ts** - Analise estatistica de dimensoes COPSOQ
- **risk-inventory.ts** - Inventario de riscos psicossociais
- **gro-document.ts** - Geracao do documento GRO

#### Componentes auxiliares

- **actionPlanGenerator.ts** - Gera planos de acao baseados em evidencias
- **agentAlerts.ts** - Sistema de alertas para indicadores criticos
- **nlp.ts** - Processamento de linguagem natural para classificacao

Toda comunicacao com LLM passa por `server/_core/llm.ts` (invokeLLM via OpenAI API).

---

### Tabelas NR-01 (Schema Separado)

```typescript
// Importado de schema_nr01.ts
export const riskAssessments = mysqlTable("risk_assessments", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tenantId: varchar("tenantId", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  sectorId: varchar("sectorId", { length: 64 }),

  // Avaliação
  methodology: varchar("methodology", { length: 100 }),
  assessor: varchar("assessor", { length: 255 }),
  assessmentDate: datetime("assessmentDate"),

  // Status
  status: mysqlEnum("status", [
    "draft",
    "in_progress",
    "completed",
    "reviewed",
  ]),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]),

  // Dados estruturados
  riskFactors: json("riskFactors"),
  controlMeasures: json("controlMeasures"),
  actionPlan: text("actionPlan"),

  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});
```

---

## 🔄 Fluxos de Negócio

### 1. Fluxo de Autenticacao

```
┌─────────────┐
│   Usuario   │
└──────┬──────┘
       │ Acessa /login
       v
┌──────────────────────────┐
│ Pagina de Login           │
└──────┬───────────────────┘
       │ Insere email/senha
       v
┌──────────────────────────┐
│ Backend: bcrypt-12 verify │
└──────┬───────────────────┘
       │ Se 2FA habilitado
       v
┌──────────────────────────┐
│ Validacao TOTP (opcional) │
└──────┬───────────────────┘
       │ Credenciais validas
       v
┌──────────────────────────┐
│ Session cookie HMAC-signed│
│ - HttpOnly + Secure       │
└──────┬───────────────────┘
       │ Redirect para /
       v
┌──────────────────────────┐
│ Dashboard Autenticado     │
│ - Exibe modal de empresa  │
└──────────────────────────┘
```

### 2. Fluxo de Seleção de Empresa

```
┌──────────────────────────┐
│ Usuário no Dashboard     │
└──────┬───────────────────┘
       │ Clica "Selecione uma empresa"
       ▼
┌──────────────────────────────────┐
│ Modal de Seleção                 │
│ - Carrega lista de tenants       │
│ - Usuário seleciona empresa      │
└──────┬───────────────────────────┘
       │ Clica "Confirmar Seleção"
       ▼
┌──────────────────────────────────┐
│ TenantContext atualizado         │
│ - selectedTenant = {...}         │
│ - localStorage salvo             │
└──────┬───────────────────────────┘
       │ Componentes re-renderizam
       ▼
┌──────────────────────────────────┐
│ Dados filtrados por tenant       │
│ - Setores da empresa             │
│ - Colaboradores da empresa       │
│ - Avaliações da empresa          │
└──────────────────────────────────┘
```

### 3. Fluxo de Criação de Avaliação NR-01

```
┌─────────────────────────────┐
│ Página Avaliações NR-01     │
└──────┬──────────────────────┘
       │ Clica "Nova Avaliação"
       ▼
┌──────────────────────────────────┐
│ Modal de Criação                 │
│ - Empresa (selecionada)          │
│ - Setor (dropdown)               │
│ - Título da avaliação            │
│ - Data da avaliação              │
│ - Avaliador responsável          │
│ - Metodologia (ISO 45003, etc.)  │
└──────┬───────────────────────────┘
       │ Valida campos obrigatórios
       ▼
┌──────────────────────────────────┐
│ Chamada tRPC                     │
│ trpc.riskAssessments.create()    │
└──────┬───────────────────────────┘
       │ Backend valida e insere
       ▼
┌──────────────────────────────────┐
│ Audit Log criado                 │
│ - userId, action, timestamp      │
└──────┬───────────────────────────┘
       │ Sucesso
       ▼
┌──────────────────────────────────┐
│ Notificação ao usuário           │
│ - Toast: "Avaliação criada"      │
│ - Tabela atualizada              │
└──────────────────────────────────┘
```

### 4. Fluxo de Exportação de Dados

```
┌────────────────────────────────┐
│ Página (Avaliações, Auditoria) │
└──────┬─────────────────────────┘
       │ Clica menu de ações (3 pontos)
       ▼
┌────────────────────────────────┐
│ Dropdown Menu                  │
│ - Visualizar                   │
│ - Editar                       │
│ - Exportar Texto               │
│ - Exportar JSON                │
│ - Exportar Excel               │
│ - Excluir                      │
└──────┬─────────────────────────┘
       │ Seleciona formato
       ▼
┌────────────────────────────────┐
│ Função exportUtils.ts          │
│ - generateReport()             │
│ - exportToJSON()               │
│ - exportToExcel()              │
└──────┬─────────────────────────┘
       │ Gera arquivo
       ▼
┌────────────────────────────────┐
│ Download automático            │
│ - Nome: tipo_ID_YYYY-MM-DD     │
│ - MIME type correto            │
│ - Arquivo salvo em Downloads   │
└────────────────────────────────┘
```

### 5. Fluxo de Auditoria

```
Qualquer ação (CREATE, UPDATE, DELETE)
       │
       ▼
┌──────────────────────────────┐
│ Middleware de Auditoria      │
│ - Captura userId             │
│ - Captura tenantId           │
│ - Captura action             │
│ - Captura oldValues          │
│ - Captura newValues          │
│ - Captura IP address         │
│ - Captura User-Agent         │
└──────┬───────────────────────┘
       │ Insere em auditLogs
       ▼
┌──────────────────────────────┐
│ Página Auditoria             │
│ - Exibe todos os logs        │
│ - Filtro por usuário, ação   │
│ - Visualiza mudanças         │
│ - Exporta dados              │
└──────────────────────────────┘
```

---

## 🔒 Segurança e Conformidade

### 1. Autenticação e Autorização

#### Autenticacao Local

- bcrypt-12 para hash de senhas
- Session cookies HMAC-signed (HttpOnly, Secure)
- 2FA opcional via TOTP
- Expiracao automatica de sessao
- Campo passwordChangedAt para invalidacao de tokens

#### RBAC (Role-Based Access Control)

```typescript
// Exemplo de proteção de rota
const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx });
});

// Exemplo de verificação de permissão
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
```

#### ABAC (Attribute-Based Access Control)

```typescript
// Exemplo: Usuário só pode ver dados de seu setor
const conditions = {
  sector_id: "uuid-do-setor",
  own_data_only: true,
};
```

### 2. Isolamento de Dados (Multi-Tenant)

#### Row-Level Security (RLS)

```typescript
// Todas as queries incluem tenantId
const getUserTodos = async (userId: string, tenantId: string) => {
  return db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        eq(todos.tenantId, tenantId) // ← Isolamento
      )
    );
};
```

#### Validação de Tenant

```typescript
// Middleware valida que usuário tem acesso ao tenant
const validateTenantAccess = async (userId: string, tenantId: string) => {
  const hasAccess = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));

  if (!hasAccess.length) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
};
```

### 3. Conformidade NR-01

#### Elementos Implementados

- ✅ Identificação de riscos psicossociais
- ✅ Avaliação de gravidade e probabilidade
- ✅ Matriz de probabilidade x gravidade
- ✅ Plano de ação integrado
- ✅ Documentação completa
- ✅ Auditoria de conformidade
- ✅ Relatórios exportáveis

#### Checklist de Conformidade

```typescript
const complianceChecklist = {
  identification: {
    label: "Identificação de Riscos",
    status: "completed",
    evidence: "Inventário de riscos",
  },
  assessment: {
    label: "Avaliação de Riscos",
    status: "completed",
    evidence: "Matriz de probabilidade x gravidade",
  },
  control: {
    label: "Controle de Riscos",
    status: "completed",
    evidence: "Plano de ação",
  },
  documentation: {
    label: "Documentação",
    status: "completed",
    evidence: "Relatórios e registros",
  },
};
```

### 4. LGPD (Lei Geral de Proteção de Dados)

#### Data Subject Requests (DSR)

- ✅ Acesso aos dados pessoais
- ✅ Exportação em múltiplos formatos
- ✅ Direito ao esquecimento (exclusão)
- ✅ Portabilidade de dados

#### Consentimentos

```typescript
// Rastreamento de consentimentos
{
  id: string,
  personId: string,
  consentType: "data_processing" | "marketing",
  granted: boolean,
  grantedAt: Date,
  revokedAt?: Date,
  ipAddress: string,
  userAgent: string,
  version: string
}
```

#### Auditoria de Dados Pessoais

- ✅ Todos os acessos registrados
- ✅ Timestamp preciso
- ✅ IP address e User-Agent
- ✅ Identificação do usuário

### 5. Proteção de Dados em Trânsito

- ✅ HTTPS/TLS obrigatório
- ✅ Cookies com flag `Secure`
- ✅ Cookies com flag `HttpOnly`
- ✅ CORS configurado corretamente

### 6. Proteção de Dados em Repouso

- ✅ Banco de dados criptografado (TLS)
- ✅ S3 com criptografia KMS
- ✅ Backups criptografados

---

## ✅ Testes Realizados

### 1. Testes Funcionais

#### Autenticação

- ✅ Login com OAuth
- ✅ Logout
- ✅ Persistência de sessão
- ✅ Expiração de sessão

#### Multi-Tenant

- ✅ Seleção de empresa
- ✅ Isolamento de dados
- ✅ Filtro por tenant em todas as páginas
- ✅ Contexto de tenant persistente

#### Gestão de Dados

- ✅ CRUD de empresas
- ✅ CRUD de setores
- ✅ CRUD de colaboradores
- ✅ CRUD de avaliações

#### Exportação

- ✅ Exportação para Texto
- ✅ Exportação para JSON
- ✅ Exportação para Excel
- ✅ Nomes de arquivo com data
- ✅ Download automático

#### Auditoria

- ✅ Registro de ações
- ✅ Filtro por usuário
- ✅ Filtro por data
- ✅ Visualização de mudanças

### 2. Testes de Interface

#### Responsividade

- ✅ Desktop (1920x1080)
- ✅ Tablet (768x1024)
- ✅ Mobile (375x667)

#### Navegação

- ✅ Menu lateral funcional
- ✅ Rotas corretas
- ✅ Breadcrumbs (se aplicável)
- ✅ Botões de ação

#### Componentes

- ✅ Modais aparecem/desaparecem
- ✅ Dropdowns funcionam
- ✅ Tabelas com paginação
- ✅ Filtros funcionam

### 3. Testes de Dados

#### Validação

- ✅ Campos obrigatórios
- ✅ Formato de email
- ✅ Formato de CNPJ
- ✅ Datas válidas

#### Integridade

- ✅ Foreign keys respeitadas
- ✅ Índices funcionam
- ✅ Constraints aplicadas
- ✅ Transações consistentes

### 4. Testes de Performance

#### Carregamento

- ✅ Dashboard carrega em < 2s
- ✅ Tabelas com 1000+ registros
- ✅ Paginação eficiente
- ✅ Filtros rápidos

#### Exportação

- ✅ Exportação de 100 registros < 1s
- ✅ Arquivo Excel válido
- ✅ Arquivo JSON válido
- ✅ Arquivo Texto legível

---

## 🚀 Guia de Deployment

### Pré-requisitos

- Node.js 22.13.0+
- pnpm 10.4.1+
- MySQL 8.0+
- Chave OpenAI (para modulo IA)

### Variáveis de Ambiente

```bash
# Banco de dados
DATABASE_URL=mysql://user:password@host:3306/blackbelt

# Autenticação
JWT_SECRET=seu-secret-aleatorio-seguro
VITE_APP_ID=seu-app-id-manus
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im

# Branding
VITE_APP_TITLE=Black Belt - Plataforma de Gestão
VITE_APP_LOGO=https://seu-dominio.com/logo.svg

# Owner (opcional)
OWNER_NAME=Carlos Honorato
OWNER_OPEN_ID=seu-open-id

# APIs Manus
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua-api-key

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT=https://seu-analytics.com
VITE_ANALYTICS_WEBSITE_ID=seu-website-id
```

### Instalação e Build

```bash
# 1. Clonar repositório
git clone https://github.com/seu-repo/blackbelt-platform.git
cd blackbelt-platform

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com valores reais

# 4. Executar migrations
pnpm db:push

# 5. Build para produção
pnpm build

# 6. Iniciar servidor
pnpm start
```

### Docker Deployment

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar arquivos
COPY . .

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm build

# Expor porta
EXPOSE 3000

# Iniciar
CMD ["pnpm", "start"]
```

### Docker Compose

```yaml
version: "3.8"

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: blackbelt
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  app:
    build: .
    environment:
      DATABASE_URL: mysql://root:root@db:3306/blackbelt
      JWT_SECRET: ${JWT_SECRET}
      VITE_APP_ID: ${VITE_APP_ID}
      # ... outras variáveis
    ports:
      - "3000:3000"
    depends_on:
      - db

volumes:
  mysql_data:
```

### CI/CD Pipeline (GitHub Actions)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: "22"

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test

      - name: Build
        run: pnpm build

      - name: Deploy
        run: |
          # Deploy script aqui
          echo "Deploying to production..."
```

---

## 📊 Estatísticas do Projeto

| Metrica                       | Valor              |
| ----------------------------- | ------------------ |
| **Linhas de Codigo**          | ~50,000+           |
| **Componentes React**         | 100+               |
| **Paginas**                   | 48                 |
| **Tabelas de Banco de Dados** | 85 (3 schemas)     |
| **Routers tRPC**              | 47                 |
| **Procedures tRPC**           | 200+               |
| **Testes E2E**                | 91/91 (100%)       |
| **Performance (Lighthouse)**  | 90+                |
| **Acessibilidade (WCAG)**     | AA                 |

---

## 🔧 Troubleshooting

### Servidor não inicia

```bash
# Limpar cache e reinstalar
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

### Erro de conexão com banco de dados

```bash
# Verificar DATABASE_URL
echo $DATABASE_URL

# Testar conexão
mysql -u user -p -h host -D blackbelt
```

### Erro de autenticacao

```bash
# Verificar variaveis de sessao
echo $SESSION_SECRET

# Verificar logs
tail -f logs/app.log

# Verificar se bcrypt esta funcionando
node -e "const b=require('bcrypt'); b.hash('test',12).then(h=>console.log(h))"
```

### Exportação não funciona

```bash
# Verificar se xlsx está instalado
pnpm list xlsx

# Reinstalar se necessário
pnpm add xlsx
```

---

## 📞 Suporte e Contribuição

Para suporte técnico ou contribuições, entre em contato com:

- **Email**: tech@blackbelt.com.br
- **GitHub**: https://github.com/seu-repo/blackbelt-platform
- **Issues**: https://github.com/seu-repo/blackbelt-platform/issues

---

## 📄 Licença

MIT License - Veja LICENSE.md para detalhes

---

**Documentacao Criada em:** Novembro 2025
**Ultima Atualizacao:** Abril 2026
**Versao:** 2.0.0
