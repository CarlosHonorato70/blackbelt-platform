# 👨‍💻 Developer Guide - Black Belt Platform

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Development Setup](#development-setup)
5. [Coding Standards](#coding-standards)
6. [Testing](#testing)
7. [Database](#database)
8. [API Development](#api-development)
9. [Frontend Development](#frontend-development)
10. [Security](#security)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

Black Belt Platform follows a modern **full-stack TypeScript** architecture:

```
┌─────────────────────────────────────────────┐
│           Client (React + Vite)             │
│  ┌──────────────────────────────────────┐   │
│  │  UI Components (shadcn/ui)           │   │
│  │  State Management (TanStack Query)   │   │
│  │  Routing (React Router DOM)           │   │
│  └──────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │ tRPC (Type-safe API)
┌─────────────────▼───────────────────────────┐
│          Server (Node.js + Express)         │
│  ┌──────────────────────────────────────┐   │
│  │  API Routers (tRPC)                  │   │
│  │  Business Logic                      │   │
│  │  Authentication (OAuth 2.0)          │   │
│  │  Security Middleware                 │   │
│  └──────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │ Drizzle ORM
┌─────────────────▼───────────────────────────┐
│              Database (MySQL)               │
│  ┌──────────────────────────────────────┐   │
│  │  Multi-tenant isolation (RLS)        │   │
│  │  Audit logs                          │   │
│  │  Migrations                          │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Key Patterns

- **Type-safe end-to-end**: TypeScript everywhere
- **Multi-tenancy**: Row-level security (RLS) with tenant isolation
- **tRPC**: Type-safe API with automatic client generation
- **Monorepo**: Client and server in same repository
- **Security-first**: Rate limiting, CORS, CSP headers

---

## Technology Stack

### Frontend

- **React 19**: UI framework
- **Vite 7**: Build tool and dev server
- **TypeScript 5**: Type safety
- **TanStack Query (React Query)**: Server state management
- **tRPC Client**: Type-safe API client
- **shadcn/ui**: Component library (Radix UI + Tailwind)
- **Tailwind CSS 4**: Styling
- **Recharts**: Data visualization
- **React Router DOM**: Client-side routing

### Backend

- **Node.js 22**: Runtime
- **Express 4**: Web server
- **tRPC 11**: Type-safe API framework
- **Drizzle ORM**: Type-safe database ORM (3 schemas, 85 tables)
- **MySQL 8**: Database
- **bcrypt**: Password hashing (12 rounds)
- **Helmet**: Security headers
- **express-rate-limit**: Rate limiting
- **cors**: CORS handling

### IA Module (server/_ai/)

- **invokeLLM**: Unified LLM interface (Anthropic Claude / OpenAI)
- **agentOrchestrator.ts**: SamurAI 10-phase workflow + auto-transitions
- **agentAlerts.ts**: Alert system (risk, deadline, compliance, phase_transition)
- **Prompt templates**: agent-system.ts, copsoq-analysis.ts, risk-inventory.ts, gro-document.ts, action-plan-generator.ts
- **nlp.ts**: Intent detection and entity extraction via LLM

### DevOps

- **Docker**: Containerization (app + mysql + nginx)
- **Nginx**: Reverse proxy + SSL termination
- **Let's Encrypt**: Auto-renewed SSL certificates
- **GitHub Actions**: CI/CD pipeline
- **Vitest**: Testing framework
- **DigitalOcean**: Production hosting

---

## Project Structure

```
blackbelt-platform/
├── client/                    # Frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── DashboardLayout.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── contexts/        # React contexts
│   │   │   └── ThemeContext.tsx
│   │   ├── lib/             # Utilities
│   │   │   └── trpc.ts      # tRPC client setup
│   │   ├── pages/           # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Tenants.tsx
│   │   │   ├── RiskAssessments.tsx
│   │   │   ├── COPSOQ.tsx
│   │   │   ├── SecurityDashboard.tsx
│   │   │   └── ...
│   │   ├── App.tsx          # Root component
│   │   └── main.tsx         # Entry point
│   ├── index.html
│   └── vite.config.ts
│
├── server/                    # Backend application
│   ├── _core/                # Core server setup
│   │   ├── index.ts         # Server entry point
│   │   ├── trpc.ts          # tRPC setup + procedure chain
│   │   ├── context.ts       # Request context (tenantId)
│   │   ├── security.ts      # CORS, rate limiting, CSP
│   │   ├── email.ts         # Email service (Brevo SMTP)
│   │   ├── llm.ts           # invokeLLM (Anthropic/OpenAI)
│   │   └── vite.ts          # Vite dev server
│   ├── _ai/                  # AI module (SamurAI)
│   │   ├── agentOrchestrator.ts  # 10-phase workflow
│   │   ├── agentAlerts.ts        # Alert system
│   │   ├── nlp.ts                # Intent/entity extraction
│   │   └── prompts/              # LLM prompt templates
│   │       ├── agent-system.ts
│   │       ├── copsoq-analysis.ts
│   │       ├── risk-inventory.ts
│   │       ├── gro-document.ts
│   │       └── action-plan-generator.ts
│   ├── routers/              # 47 API routers
│   │   ├── tenants.ts
│   │   ├── riskAssessments.ts
│   │   ├── copsoq.ts
│   │   ├── complianceChecklist.ts
│   │   ├── esocialExport.ts
│   │   ├── pcmsoIntegration.ts
│   │   ├── climateSurveys.ts
│   │   ├── psychosocialDashboard.ts
│   │   ├── supportAgent.ts
│   │   ├── nr01Pdf.ts
│   │   ├── benchmark.ts
│   │   └── ...
│   ├── db.ts                 # Database functions
│   └── routers.ts            # Router aggregation
│
├── drizzle/                   # Database schemas & migrations
│   ├── schema.ts             # Core (47 tables)
│   ├── schema_nr01.ts        # NR-01 (34 tables)
│   ├── schema_agent.ts       # Agent (4 tables)
│   └── migrations/
│
├── server/__tests__/          # Test files
│   ├── business-logic.test.ts
│   ├── data-validation.test.ts
│   ├── pricing-calculations.test.ts
│   ├── e2e-assessment-to-proposal.test.ts
│   └── e2e-copsoq-workflow.test.ts
│
├── shared/                    # Shared code
│   └── types/                # Shared types
│
├── docker/                    # Docker configs
│   └── mysql/
│
├── .github/                   # GitHub configs
│   └── workflows/
│
├── docs/                      # Documentation
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── drizzle.config.ts
└── docker-compose.yml
```

---

## Development Setup

### Prerequisites

- Node.js 22+
- pnpm 9+
- MySQL 8+
- Docker (optional)

### Quick Start

1. **Clone repository**
```bash
git clone https://github.com/CarlosHonorato70/blackbelt-platform.git
cd blackbelt-platform
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Setup database**
```bash
# Option A: Docker
docker-compose up -d

# Option B: Local MySQL
# Create database manually
mysql -u root -p
CREATE DATABASE blackbelt;
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your settings
```

5. **Run migrations**
```bash
pnpm db:push
```

6. **Start development server**
```bash
pnpm dev
```

Access: `http://localhost:3000`

---

## Coding Standards

### TypeScript

- **Strict mode enabled**: No implicit any
- **Use explicit types** for function parameters and returns
- **Prefer interfaces** for object shapes
- **Use enums** for fixed sets of values

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// Avoid
function getUser(id) {
  // ...
}
```

### Naming Conventions

- **Components**: PascalCase (`DashboardLayout.tsx`)
- **Functions**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`UserProfile`)
- **Files**: kebab-case (`risk-assessments.ts`)

### Code Organization

- **One component per file**
- **Group related code** in directories
- **Separate concerns**: UI, logic, data
- **Use barrel exports** (index.ts)

### React Best Practices

```typescript
// Use functional components
export default function MyComponent() {
  // Hooks at the top
  const [state, setState] = useState();
  const data = useQuery(...);
  
  // Event handlers
  const handleClick = () => {
    // ...
  };
  
  // Render
  return <div>...</div>;
}
```

### tRPC Procedure Chain

The platform uses a layered procedure chain for authorization:

```
publicProcedure      → No auth required
  └─ protectedProcedure  → Requires valid session
       └─ tenantProcedure    → Requires tenantId in context
            └─ subscribedProcedure → Requires active subscription
                 └─ adminProcedure      → Requires admin role
```

**RBAC** with `permittedProcedure`:

```typescript
// Only users with "riskAssessments:write" permission can access
export const createAssessment = permittedProcedure("riskAssessments", "write")
  .input(z.object({ ... }))
  .mutation(async ({ input, ctx }) => { ... });
```

Admin role bypasses all permission checks. 4 roles, 20 permissions, 40 role-permission associations seeded automatically.

### tRPC Router Example

```typescript
// Router definition
export const myRouter = router({
  list: tenantProcedure
    .input(z.object({ page: z.number() }))
    .query(async ({ input, ctx }) => {
      // ctx.tenantId automatically available
    }),

  create: tenantProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // ...
    }),
});
```

---

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage

# Specific file
pnpm test server/__tests__/business-logic.test.ts
```

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  it('should do something', () => {
    // Arrange
    const input = createTestData();
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### Test Categories

1. **Unit Tests**: Test individual functions
2. **Integration Tests**: Test module interactions
3. **E2E Tests**: Test complete workflows

### Writing Good Tests

- **Test behavior, not implementation**
- **Use descriptive test names**
- **One assertion per test** (ideally)
- **Mock external dependencies**
- **Test edge cases and errors**

---

## Database

### Schema Definition

Using Drizzle ORM:

```typescript
import { mysqlTable, varchar, int, timestamp } from 'drizzle-orm/mysql-core';

export const tenants = mysqlTable('tenants', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Migrations

```bash
# Generate migration
pnpm drizzle-kit generate

# Run migrations
pnpm drizzle-kit migrate

# Push to database
pnpm db:push
```

### Querying

```typescript
import { db } from './db';
import { tenants } from './schema';
import { eq } from 'drizzle-orm';

// Select
const allTenants = await db.select().from(tenants);

// Where
const tenant = await db.select()
  .from(tenants)
  .where(eq(tenants.id, 'tenant-123'));

// Insert
await db.insert(tenants).values({
  id: nanoid(),
  name: 'Acme Corp',
});

// Update
await db.update(tenants)
  .set({ name: 'New Name' })
  .where(eq(tenants.id, 'tenant-123'));

// Delete
await db.delete(tenants)
  .where(eq(tenants.id, 'tenant-123'));
```

---

## API Development

### Creating a New Router

1. **Define schema** (`server/schema/*.ts`)
2. **Create database functions** (`server/db.ts`)
3. **Create router** (`server/routers/my-feature.ts`)
4. **Register router** (`server/routers.ts`)

Example:

```typescript
// server/routers/my-feature.ts
import { z } from 'zod';
import { t, protectedProcedure } from '../_core/trpc';
import * as db from '../db';

export const myFeatureRouter = t.router({
  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await db.listMyFeatures(ctx.tenantId);
    }),
  
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      return await db.createMyFeature({
        ...input,
        tenantId: ctx.tenantId,
      });
    }),
});

// server/routers.ts
import { myFeatureRouter } from './routers/my-feature';

export const appRouter = t.router({
  // ...
  myFeature: myFeatureRouter,
});
```

### Input Validation

Use Zod for all inputs:

```typescript
const inputSchema = z.object({
  email: z.string().email(),
  age: z.number().min(18).max(120),
  role: z.enum(['admin', 'user']),
  metadata: z.record(z.string()),
});
```

### Error Handling

```typescript
import { TRPCError } from '@trpc/server';

if (!user) {
  throw new TRPCError({
    code: 'NOT_FOUND',
    message: 'User not found',
  });
}
```

---

## Frontend Development

### Creating a Page

```typescript
// client/src/pages/MyPage.tsx
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';

export default function MyPage() {
  const { data, isLoading } = trpc.myFeature.list.useQuery();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <DashboardLayout>
      <h1>My Page</h1>
      {data?.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </DashboardLayout>
  );
}
```

### Using tRPC Mutations

```typescript
const createMutation = trpc.myFeature.create.useMutation({
  onSuccess: () => {
    toast.success('Created successfully');
    trpc.useContext().myFeature.list.invalidate();
  },
  onError: (error) => {
    toast.error(error.message);
  },
});

const handleSubmit = (data) => {
  createMutation.mutate(data);
};
```

### Styling

Use Tailwind utility classes:

```tsx
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h2 className="text-xl font-bold">Title</h2>
  <Button>Action</Button>
</div>
```

---

## Security

### Rate Limiting

Configured in `server/_core/security.ts`:

- General API: 100 req/15min
- Auth: 5 req/15min
- Email: 10 req/hour
- Uploads: 20 req/hour

### CORS

Whitelist origins in `security.ts`:

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
];
```

### Authentication

OAuth 2.0 flow:
1. User clicks login
2. Redirect to OAuth provider
3. Provider callback with code
4. Exchange code for token
5. Store in HTTP-only cookie

### Multi-tenant Isolation

All queries automatically filtered by `tenantId` in context.

---

## Deployment

### Docker

```bash
# Build
docker build -t blackbelt-platform .

# Run
docker run -p 3000:3000 blackbelt-platform
```

### Environment Variables

See `.env.example` for required variables.

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set secure `SESSION_SECRET`
- [ ] Configure CORS origins
- [ ] Enable SSL/TLS
- [ ] Setup backup strategy
- [ ] Configure monitoring
- [ ] Test load capacity

---

## Troubleshooting

### Common Issues

**Port already in use**
```bash
# Find process
lsof -i :3000
# Kill process
kill -9 <PID>
```

**Database connection failed**
- Check MySQL is running
- Verify credentials in .env
- Check firewall rules

**tRPC type errors**
- Restart TypeScript server
- Delete node_modules and reinstall
- Check tsconfig.json

**Build fails**
- Clear cache: `rm -rf node_modules .next dist`
- Reinstall: `pnpm install`
- Check Node.js version

---

## Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Write tests
5. Run linter
6. Submit PR

---

## Resources

- [tRPC Docs](https://trpc.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [React Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vitest](https://vitest.dev/)

---

**Happy Coding! 🚀**
