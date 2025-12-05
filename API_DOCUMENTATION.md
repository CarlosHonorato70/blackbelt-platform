# 📚 API Documentation - Black Belt Platform

## Overview

The Black Belt Platform uses [tRPC](https://trpc.io/) for type-safe API communication between the client and server. All endpoints are automatically type-checked and provide full IntelliSense support.

## Base URL

- **Development**: `http://localhost:3000/api/trpc`
- **Production**: `https://your-domain.com/api/trpc`

## Authentication

All API calls require authentication via OAuth 2.0 tokens. The token is automatically managed by the client library and passed in HTTP-only cookies.

## Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| General API | 100 requests | 15 minutes |
| Authentication | 5 requests | 15 minutes |
| Email Sending | 10 requests | 1 hour |
| File Uploads | 20 requests | 1 hour |

## API Routers

### 1. Tenants Router

Manage multi-tenant organizations.

#### `tenants.list`
Get list of all tenants for the authenticated user.

**Type**: Query  
**Auth**: Required

```typescript
const tenants = await trpc.tenants.list.query();
// Returns: Tenant[]
```

#### `tenants.create`
Create a new tenant organization.

**Type**: Mutation  
**Auth**: Required

```typescript
const tenant = await trpc.tenants.create.mutate({
  name: "Acme Corp",
  cnpj: "12.345.678/0001-90",
  status: "active",
  strategy: "shared_rls"
});
```

#### `tenants.update`
Update an existing tenant.

**Type**: Mutation  
**Auth**: Required

```typescript
await trpc.tenants.update.mutate({
  id: "tenant-123",
  name: "Acme Corporation",
  status: "active"
});
```

#### `tenants.delete`
Delete a tenant (soft delete).

**Type**: Mutation  
**Auth**: Required

```typescript
await trpc.tenants.delete.mutate({ id: "tenant-123" });
```

---

### 2. Sectors Router

Manage departments/sectors within a tenant.

#### `sectors.list`
Get all sectors for a tenant.

**Type**: Query  
**Auth**: Required  
**Tenant Context**: Required

```typescript
const sectors = await trpc.sectors.list.query();
// Returns: Sector[]
```

#### `sectors.create`
Create a new sector.

**Type**: Mutation  
**Auth**: Required

```typescript
const sector = await trpc.sectors.create.mutate({
  name: "Engineering",
  description: "Software development team",
  managerName: "John Doe"
});
```

---

### 3. People Router

Manage employees/collaborators.

#### `people.list`
Get all people in a tenant.

**Type**: Query  
**Auth**: Required  
**Tenant Context**: Required

```typescript
const people = await trpc.people.list.query();
// Returns: Person[]
```

#### `people.create`
Create a new person.

**Type**: Mutation  
**Auth**: Required

```typescript
const person = await trpc.people.create.mutate({
  name: "Jane Smith",
  email: "jane@example.com",
  position: "Software Engineer",
  sectorId: "sector-123",
  employmentType: "own" // or "outsourced"
});
```

---

### 4. Risk Assessments Router

Manage NR-01 psychosocial risk assessments.

#### `riskAssessments.list`
Get all risk assessments for a tenant.

**Type**: Query  
**Auth**: Required  
**Tenant Context**: Required

```typescript
const assessments = await trpc.riskAssessments.list.query();
// Returns: RiskAssessment[]
```

#### `riskAssessments.create`
Create a new risk assessment.

**Type**: Mutation  
**Auth**: Required

```typescript
const assessment = await trpc.riskAssessments.create.mutate({
  title: "Q1 2025 Risk Assessment",
  description: "Quarterly assessment",
  assessmentDate: new Date(),
  assessor: "Carlos Honorato",
  sectorId: "sector-123" // optional
});
```

#### `riskAssessments.getById`
Get a specific risk assessment with all items.

**Type**: Query  
**Auth**: Required

```typescript
const assessment = await trpc.riskAssessments.getById.query({
  id: "assessment-123"
});
// Returns: RiskAssessment with riskItems[]
```

#### `riskAssessments.addItem`
Add a risk item to an assessment.

**Type**: Mutation  
**Auth**: Required

```typescript
await trpc.riskAssessments.addItem.mutate({
  assessmentId: "assessment-123",
  riskFactorId: "factor-456",
  severity: "high", // "low" | "medium" | "high" | "critical"
  probability: "likely", // "rare" | "unlikely" | "possible" | "likely" | "certain"
  currentControls: "Monthly safety meetings",
  recommendations: "Implement weekly check-ins"
});
```

---

### 5. COPSOQ Router

COPSOQ-II psychosocial assessment questionnaire (76 questions, 12 dimensions).

#### `copsoq.create`
Create a new COPSOQ assessment.

**Type**: Mutation  
**Auth**: Required

```typescript
const copsoq = await trpc.copsoq.create.mutate({
  title: "COPSOQ Q1 2025",
  description: "Quarterly psychosocial assessment",
  sectorId: "sector-123" // optional - null for organization-wide
});
```

#### `copsoq.createInvites`
Generate invites for respondents.

**Type**: Mutation  
**Auth**: Required

```typescript
await trpc.copsoq.createInvites.mutate({
  assessmentId: "copsoq-123",
  personIds: ["person-1", "person-2", "person-3"],
  expiresInDays: 7
});
```

#### `copsoq.submitResponse`
Submit a completed COPSOQ response.

**Type**: Mutation  
**Auth**: Public (uses invite token)

```typescript
await trpc.copsoq.submitResponse.mutate({
  inviteToken: "abc123xyz",
  responses: {
    1: 3, 2: 4, 3: 2, // ... all 76 questions (1-5 scale)
  },
  demographics: {
    ageGroup: "30-39",
    gender: "female",
    yearsInCompany: "5-10"
  }
});
```

#### `copsoq.generateReport`
Generate aggregated report from responses.

**Type**: Query  
**Auth**: Required

```typescript
const report = await trpc.copsoq.generateReport.query({
  assessmentId: "copsoq-123"
});
// Returns: Report with dimension scores, risk classification, statistics
```

---

### 6. Clients Router

Manage clients for pricing proposals.

#### `clients.list`
Get all clients for a tenant.

**Type**: Query  
**Auth**: Required  
**Tenant Context**: Required

```typescript
const clients = await trpc.clients.list.query();
// Returns: Client[]
```

#### `clients.create`
Create a new client.

**Type**: Mutation  
**Auth**: Required

```typescript
const client = await trpc.clients.create.mutate({
  name: "Client Corp",
  cnpj: "98.765.432/0001-10",
  contactName: "John Doe",
  contactEmail: "john@clientcorp.com",
  contactPhone: "+55 11 98765-4321",
  street: "Main St",
  number: "123",
  city: "São Paulo",
  state: "SP",
  zipCode: "01234-567",
  companySize: "medium" // "small" | "medium" | "large"
});
```

---

### 7. Services Router

Manage service catalog.

#### `services.list`
Get all services for a tenant.

**Type**: Query  
**Auth**: Required  
**Tenant Context**: Required

```typescript
const services = await trpc.services.list.query();
// Returns: Service[]
```

#### `services.create`
Create a new service.

**Type**: Mutation  
**Auth**: Required

```typescript
const service = await trpc.services.create.mutate({
  name: "NR-01 Diagnostic Assessment",
  description: "Complete psychosocial risk assessment",
  category: "assessment", // "assessment" | "training" | "consulting" | "compliance"
  basePrice: 50000, // in cents (R$ 500.00)
  unitType: "project", // "project" | "hours" | "sessions"
  estimatedDuration: 40 // hours
});
```

---

### 8. Pricing Parameters Router

Configure pricing calculations.

#### `pricingParameters.get`
Get pricing parameters for a tenant.

**Type**: Query  
**Auth**: Required  
**Tenant Context**: Required

```typescript
const params = await trpc.pricingParameters.get.query();
// Returns: PricingParameters
```

#### `pricingParameters.update`
Update pricing parameters.

**Type**: Mutation  
**Auth**: Required

```typescript
await trpc.pricingParameters.update.mutate({
  taxRegime: "simples_nacional", // "mei" | "simples_nacional" | "lucro_presumido" | "autonomous"
  fixedCosts: 500000, // R$ 5,000.00
  laborCosts: 1000000, // R$ 10,000.00
  productiveHoursPerMonth: 160,
  profitMargin: 30, // 30%
  // Discount tiers
  discountTier1Min: 1000000, // R$ 10,000
  discountTier1Rate: 5,
  discountTier2Min: 5000000,
  discountTier2Rate: 10,
  discountTier3Min: 10000000,
  discountTier3Rate: 15
});
```

---

### 9. Proposals Router

Manage commercial proposals.

#### `proposals.list`
Get all proposals for a tenant.

**Type**: Query  
**Auth**: Required  
**Tenant Context**: Required

```typescript
const proposals = await trpc.proposals.list.query();
// Returns: Proposal[]
```

#### `proposals.create`
Create a new proposal.

**Type**: Mutation  
**Auth**: Required

```typescript
const proposal = await trpc.proposals.create.mutate({
  clientId: "client-123",
  title: "Q1 2025 Services Proposal",
  validUntil: new Date("2025-03-31"),
  items: [
    {
      serviceId: "service-1",
      quantity: 1,
      unitPrice: 50000
    },
    {
      serviceId: "service-2",
      quantity: 3,
      unitPrice: 20000
    }
  ]
});
```

#### `proposals.generateFromAssessment`
Automatically generate proposal from risk assessment.

**Type**: Mutation  
**Auth**: Required

```typescript
const proposal = await trpc.proposals.generateFromAssessment.mutate({
  assessmentId: "assessment-123",
  clientId: "client-456",
  sendEmail: true // optional - send email to client
});
// Returns: Proposal with recommended services based on risk level
```

---

### 10. Assessment Proposals Router

Link assessments to generated proposals.

#### `assessmentProposals.getByAssessment`
Get proposal generated from an assessment.

**Type**: Query  
**Auth**: Required

```typescript
const link = await trpc.assessmentProposals.getByAssessment.query({
  assessmentId: "assessment-123"
});
// Returns: { proposalId, riskLevel, recommendedServices }
```

---

## Error Handling

All tRPC calls return typed errors:

```typescript
try {
  await trpc.tenants.create.mutate({ ... });
} catch (error) {
  if (error instanceof TRPCClientError) {
    console.error('Error code:', error.data.code);
    console.error('Message:', error.message);
  }
}
```

Common error codes:
- `UNAUTHORIZED`: Not authenticated
- `FORBIDDEN`: Insufficient permissions
- `BAD_REQUEST`: Invalid input data
- `NOT_FOUND`: Resource not found
- `INTERNAL_SERVER_ERROR`: Server error

---

## Pagination

List endpoints support pagination:

```typescript
const result = await trpc.tenants.list.query({
  page: 1,
  perPage: 50 // default: 30, max: 100
});
```

---

## Audit Logging

All mutations are automatically logged to the audit trail with:
- User ID
- Tenant ID
- Action type
- Timestamp
- Changes made

Access audit logs via the Audit Logs page in the UI.

---

## Type Definitions

All types are automatically inferred from the schema. Import types from:

```typescript
import type { Tenant, Sector, Person, RiskAssessment } from '@/types';
```

---

## Rate Limit Headers

Responses include rate limit information:

```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1638360000
```

---

## Health Check

Check API health:

```
GET /health
GET /api/health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-05T19:00:00.000Z",
  "uptime": 3600,
  "memory": { ... },
  "blockedIPs": 2,
  "suspiciousIPs": 5
}
```

---

## WebSocket Support

Real-time notifications are handled via tRPC subscriptions (future feature).

---

## SDKs

### TypeScript/JavaScript

Use the tRPC client:

```typescript
import { trpc } from '@/lib/trpc';

const tenants = await trpc.tenants.list.query();
```

### Other Languages

Use REST endpoints (auto-generated from tRPC routes):

```bash
curl -X POST https://api.example.com/api/trpc/tenants.create \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Corp", "cnpj": "12.345.678/0001-90"}'
```

---

## Support

For API support, contact: support@blackbelt.com.br
