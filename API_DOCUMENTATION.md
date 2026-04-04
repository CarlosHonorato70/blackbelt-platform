# API Documentation - Black Belt Platform

## Overview

The Black Belt Platform uses [tRPC](https://trpc.io/) for type-safe API communication between the client and server. All endpoints are automatically type-checked and provide full IntelliSense support.

## Base URL

- **Development**: `http://localhost:3000/api/trpc`
- **Production**: `https://blackbeltconsultoria.com/api/trpc`

## Autenticacao

A plataforma utiliza **bcrypt-12 password hashing + HMAC-signed session cookies + 2FA opcional (TOTP)**. O cookie de sessao e gerenciado automaticamente pelo cliente e enviado como HTTP-only cookie.

### Cadeia de Procedures (Middleware)

```
public -> protected -> tenant -> subscribed -> admin
```

- **public**: Sem autenticacao (ex: submissao de pesquisa via token)
- **protected**: Requer sessao autenticada
- **tenant**: Requer selecao de tenant ativo
- **subscribed**: Requer plano ativo (assinatura vigente)
- **admin**: Requer role admin (bypassa todas as permissoes RBAC)

### Wire Format

- Formato: **Raw JSON (non-batch)**
- Mutations: `POST /api/trpc/<router>.<procedure>` com body `{...}`
- Queries: `GET /api/trpc/<router>.<procedure>?input=<urlencoded>`

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

### 11. Agent Router

Agente de IA conversacional para analise de riscos psicossociais.

#### `agent.sendMessage`
Envia mensagem para o agente de IA.

**Type**: Mutation
**Auth**: Required (subscribed)

```typescript
await trpc.agent.sendMessage.mutate({
  conversationId: "conv-123",
  content: "Analise os resultados do COPSOQ do setor Administrativo",
  tenantId: "tenant-456"
});
```

#### `agent.getConversation`
Retorna uma conversa com historico de mensagens.

**Type**: Query
**Auth**: Required

#### `agent.listConversations`
Lista todas as conversas do tenant.

**Type**: Query
**Auth**: Required

#### `agent.executeAction`
Executa uma acao sugerida pelo agente (ex: gerar plano de acao, exportar PDF).

**Type**: Mutation
**Auth**: Required

---

### 12. Climate Surveys Router

Pesquisas de clima organizacional (EACT, ITRA, QVT-Walton e customizadas).

#### `climateSurveys.create`
Cria uma nova pesquisa de clima.

**Type**: Mutation
**Auth**: Required (subscribed)

```typescript
const survey = await trpc.climateSurveys.create.mutate({
  title: "Pesquisa de Clima Q1 2026",
  instrument: "eact", // "eact" | "itra" | "qvt_walton" | "custom"
  sectorId: "sector-123" // opcional
});
```

#### `climateSurveys.list`
Lista pesquisas de clima do tenant.

**Type**: Query
**Auth**: Required

#### `climateSurveys.getResults`
Retorna resultados agregados da pesquisa.

**Type**: Query
**Auth**: Required

```typescript
const results = await trpc.climateSurveys.getResults.query({
  surveyId: "survey-123"
});
// Returns:
// {
//   dimensionScores: { [dimension: string]: number },
//   responseDistribution: { [score: number]: number },
//   averageScore: number,
//   completionRate: number,
//   riskDistribution: { low: number, medium: number, high: number },
//   inviteStatus: { sent: number, completed: number, pending: number }
// }
```

---

### 13. Psychosocial Dashboard Router

Dashboard analitico para dados psicossociais.

#### `psychosocialDashboard.getDimensionScores`
Retorna scores por dimensao COPSOQ.

**Type**: Query
**Auth**: Required (subscribed)

#### `psychosocialDashboard.getSectorComparison`
Compara indicadores entre setores do tenant.

**Type**: Query
**Auth**: Required

#### `psychosocialDashboard.getHistoricalTrends`
Retorna evolucao historica dos indicadores.

**Type**: Query
**Auth**: Required

#### `psychosocialDashboard.getDemographicBreakdown`
Retorna quebra demografica (faixa etaria, genero, tempo de empresa).

**Type**: Query
**Auth**: Required

---

### 14. Risk Assessments Router (Estendido)

Alem das operacoes basicas (list, create, getById, addItem), o router inclui:

#### `riskAssessments.listActionPlans`
Lista planos de acao vinculados a avaliacoes.

**Type**: Query
**Auth**: Required

#### `riskAssessments.createActionPlan`
Cria plano de acao manual.

**Type**: Mutation
**Auth**: Required

#### `riskAssessments.updateActionPlan`
Atualiza plano de acao com metodo de verificacao e indicador de eficacia.

**Type**: Mutation
**Auth**: Required

```typescript
await trpc.riskAssessments.updateActionPlan.mutate({
  id: "plan-123",
  status: "in_progress",
  verificationMethod: "Entrevista com gestores + analise de indicadores",
  effectivenessIndicator: "Reducao de 20% no absenteismo em 6 meses"
});
```

#### `riskAssessments.generateActionPlans`
Gera planos de acao automaticamente usando IA.

**Type**: Mutation
**Auth**: Required (subscribed)

```typescript
const plans = await trpc.riskAssessments.generateActionPlans.mutate({
  assessmentId: "assessment-123"
});
// Retorna planos gerados por IA com base nos riscos identificados
```

---

### 15. Compliance Checklist Router

Checklist de conformidade NR-01 com 35 itens.

#### `complianceChecklist.list`
Lista itens do checklist. No primeiro acesso, auto-seeds 35 itens padrao.

**Type**: Query
**Auth**: Required (subscribed)

```typescript
const items = await trpc.complianceChecklist.list.query();
// Returns: ChecklistItem[] (35 itens com status e evidencias)
```

#### `complianceChecklist.updateStatus`
Atualiza status de um item do checklist.

**Type**: Mutation
**Auth**: Required

```typescript
await trpc.complianceChecklist.updateStatus.mutate({
  id: "item-123",
  status: "completed",
  evidence: "Documento GRO atualizado em 2026-03-15"
});
```

---

### 16. eSocial Export Router

Exportacao de eventos para o eSocial (S-2210, S-2220, S-2240).

#### `esocialExport.list`
Lista exportacoes do tenant.

**Type**: Query
**Auth**: Required (subscribed)

#### `esocialExport.generateXml`
Gera XML do evento eSocial (S-2210/S-2220/S-2240).

**Type**: Mutation
**Auth**: Required

```typescript
const xml = await trpc.esocialExport.generateXml.mutate({
  eventType: "S-2240", // "S-2210" | "S-2220" | "S-2240"
  referenceDate: "2026-03-01",
  personIds: ["person-1", "person-2"]
});
```

#### `esocialExport.validate`
Valida XML contra schema XSD do eSocial.

**Type**: Mutation
**Auth**: Required

#### `esocialExport.submit`
Envia XML para o eSocial via SOAP com mTLS (certificado A1).

**Type**: Mutation
**Auth**: Required

#### `esocialExport.checkPendingS2240`
Verifica eventos S-2240 pendentes de envio.

**Type**: Query
**Auth**: Required

#### `esocialExport.download`
Baixa XML ou recibo de envio.

**Type**: Query
**Auth**: Required

---

### 17. NR-01 PDF Router

Geracao de relatorios PDF para conformidade NR-01.

Todos os endpoints retornam `{ filename: string, data: string }` onde `data` e o conteudo em base64.

#### Endpoints disponiveis:

| Procedure | Descricao |
|-----------|-----------|
| `nr01Pdf.exportGro` | Documento GRO (Gerenciamento de Riscos Ocupacionais) |
| `nr01Pdf.exportCopsoqReport` | Relatorio COPSOQ com analise por dimensao |
| `nr01Pdf.exportConsolidatedPgr` | PGR consolidado (Programa de Gerenciamento de Riscos) |
| `nr01Pdf.exportPcmsoIntegration` | Integracao PCMSO com dados psicossociais |
| `nr01Pdf.exportClimateSurvey` | Relatorio de pesquisa de clima |
| `nr01Pdf.exportAssessmentTrends` | Tendencias de avaliacoes ao longo do tempo |
| `nr01Pdf.exportBenchmarkComparison` | Comparacao com benchmarks do setor |

```typescript
const pdf = await trpc.nr01Pdf.exportGro.query({ assessmentId: "assessment-123" });
// Returns: { filename: "GRO_2026-04-04.pdf", data: "<base64>" }
```

---

### 18. PCMSO Integration Router

Integracao com PCMSO (Programa de Controle Medico de Saude Ocupacional).

#### `pcmsoIntegration.list`
Lista integracoes PCMSO do tenant.

**Type**: Query
**Auth**: Required (subscribed)

#### `pcmsoIntegration.generate`
Gera documento de integracao PCMSO.

**Type**: Mutation
**Auth**: Required

#### `pcmsoIntegration.listExamResults`
Lista resultados de exames ocupacionais.

**Type**: Query
**Auth**: Required

#### `pcmsoIntegration.createExamResult`
Registra resultado de exame ocupacional.

**Type**: Mutation
**Auth**: Required

#### `pcmsoIntegration.deleteExamResult`
Remove resultado de exame ocupacional.

**Type**: Mutation
**Auth**: Required

---

### 19. Benchmark Router

Benchmarks setoriais para comparacao de indicadores.

#### `benchmark.list`
Lista benchmarks disponiveis.

**Type**: Query
**Auth**: Required (subscribed)

```typescript
const benchmarks = await trpc.benchmark.list.query();
// Returns: Benchmark[]
// Nota: burnoutRate, harassmentRate e mentalLeaveRate sao retornados
// como inteiros x100 (ex: 1250 = 12.50%)
```

---

### 20. Support Agent Router

Agente de suporte LLM-powered para atendimento ao usuario.

#### `supportAgent.getOrCreateConversation`
Obtem conversa existente ou cria nova.

**Type**: Mutation
**Auth**: Required

#### `supportAgent.sendMessage`
Envia mensagem para o agente de suporte (processada por LLM).

**Type**: Mutation
**Auth**: Required

```typescript
const response = await trpc.supportAgent.sendMessage.mutate({
  conversationId: "conv-123",
  content: "Como exportar o relatorio GRO?"
});
```

#### `supportAgent.getHistory`
Retorna historico da conversa.

**Type**: Query
**Auth**: Required

#### `supportAgent.newConversation`
Inicia nova conversa descartando a anterior.

**Type**: Mutation
**Auth**: Required

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
