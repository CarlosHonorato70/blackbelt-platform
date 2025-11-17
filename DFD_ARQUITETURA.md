# Diagrama de Fluxo de Dados (DFD) - Black Belt Platform

## 1. DFD Nível 0 - Visão Geral do Sistema

```mermaid
graph TB
    User["👤 Usuário<br/>(Browser)"]
    Frontend["🖥️ Frontend<br/>(React 19)"]
    Backend["⚙️ Backend<br/>(Express + tRPC)"]
    Database["💾 Database<br/>(MySQL)"]
    Auth["🔐 OAuth 2.0<br/>(Manus)"]
    
    User -->|HTTP/HTTPS| Frontend
    Frontend -->|tRPC Calls| Backend
    Backend -->|SQL Queries| Database
    Backend -->|Validate Token| Auth
    Database -->|Data| Backend
    Backend -->|JSON Response| Frontend
    Frontend -->|Render UI| User
    Auth -->|JWT Token| Backend
```

---

## 2. DFD Nível 1 - Fluxo de Autenticação

```mermaid
graph LR
    subgraph Client["🖥️ FRONTEND (React)"]
        LoginBtn["Login Button"]
        LoginModal["Login Modal"]
        TokenStorage["localStorage<br/>(JWT Token)"]
    end
    
    subgraph Auth["🔐 AUTENTICAÇÃO"]
        OAuthServer["OAuth 2.0<br/>(Manus)"]
        Callback["Callback Handler<br/>(/api/oauth/callback)"]
    end
    
    subgraph Server["⚙️ BACKEND (Express)"]
        Context["createContext()"]
        SessionCookie["Session Cookie<br/>(JWT)"]
    end
    
    LoginBtn -->|Redirect to| OAuthServer
    OAuthServer -->|Authorize| LoginModal
    LoginModal -->|Code| Callback
    Callback -->|Create Session| SessionCookie
    SessionCookie -->|Set Cookie| TokenStorage
    TokenStorage -->|Include in Requests| Context
    Context -->|Validate User| Server
```

---

## 3. DFD Nível 1 - Fluxo de Requisição tRPC

```mermaid
graph TB
    subgraph Frontend["🖥️ FRONTEND (React 19)"]
        Component["React Component"]
        Hook["useQuery/useMutation<br/>(tRPC Hook)"]
        Client["tRPC Client<br/>(lib/trpc.ts)"]
        Cache["React Query Cache"]
    end
    
    subgraph Network["🌐 REDE"]
        HTTP["HTTP POST<br/>/api/trpc/[procedure]"]
    end
    
    subgraph Backend["⚙️ BACKEND (Express + tRPC)"]
        Router["tRPC Router"]
        Procedure["Procedure Handler"]
        Validation["Zod Validation"]
        Auth["Auth Check<br/>(protectedProcedure)"]
    end
    
    subgraph Database["💾 DATABASE"]
        Query["SQL Query"]
        Table["MySQL Table"]
    end
    
    Component -->|Call Hook| Hook
    Hook -->|Prepare Request| Client
    Client -->|Serialize Data| HTTP
    HTTP -->|POST Request| Router
    Router -->|Route to| Procedure
    Procedure -->|Validate Input| Validation
    Validation -->|Check Auth| Auth
    Auth -->|Execute| Query
    Query -->|Fetch Data| Table
    Table -->|Return Data| Query
    Query -->|Return Result| Procedure
    Procedure -->|Serialize Response| HTTP
    HTTP -->|JSON Response| Client
    Client -->|Update Cache| Cache
    Cache -->|Re-render| Component
```

---

## 4. DFD Nível 2 - Fluxo de Dados Multi-Tenant

```mermaid
graph TB
    subgraph Client["🖥️ FRONTEND"]
        TenantSelector["Tenant Selector<br/>(Modal)"]
        LocalStorage["localStorage<br/>(tenantId)"]
        Header["Request Header<br/>(x-tenant-id)"]
    end
    
    subgraph Server["⚙️ BACKEND"]
        Context["createContext()"]
        ExtractTenant["Extract tenantId<br/>from Header"]
        TenantContext["ctx.tenantId"]
    end
    
    subgraph DB["💾 DATABASE"]
        RLS["Row-Level Security<br/>(WHERE tenantId = ?)"]
        DataA["Tenant A Data"]
        DataB["Tenant B Data"]
    end
    
    TenantSelector -->|Select Tenant| LocalStorage
    LocalStorage -->|Store tenantId| Header
    Header -->|Include in Request| Context
    Context -->|Extract| ExtractTenant
    ExtractTenant -->|Set| TenantContext
    TenantContext -->|Filter Query| RLS
    RLS -->|Isolate Data| DataA
    RLS -->|Isolate Data| DataB
    DataA -->|Return Only A| Server
    DataB -->|Return Only B| Server
```

---

## 5. DFD Nível 2 - Fluxo de CRUD (Create, Read, Update, Delete)

```mermaid
graph TB
    subgraph Frontend["🖥️ FRONTEND"]
        Form["Form Component"]
        Submit["Submit Handler"]
        Mutation["useMutation<br/>(tRPC)"]
    end
    
    subgraph Backend["⚙️ BACKEND"]
        CreateProc["create Procedure"]
        Validation["Validate Input<br/>(Zod)"]
        AuthCheck["Check Auth<br/>(protectedProcedure)"]
        TenantCheck["Verify tenantId"]
    end
    
    subgraph DBHelpers["📚 DB HELPERS"]
        CreateFunc["createClient()<br/>createService()<br/>createProposal()"]
        BuildQuery["Build INSERT Query"]
    end
    
    subgraph Database["💾 DATABASE"]
        Insert["INSERT INTO table"]
        Commit["COMMIT"]
        Return["SELECT * FROM"]
    end
    
    Form -->|User Input| Submit
    Submit -->|Call Mutation| Mutation
    Mutation -->|POST /api/trpc/create| CreateProc
    CreateProc -->|Validate| Validation
    Validation -->|Check| AuthCheck
    AuthCheck -->|Verify| TenantCheck
    TenantCheck -->|Execute| CreateFunc
    CreateFunc -->|Generate| BuildQuery
    BuildQuery -->|Execute| Insert
    Insert -->|Confirm| Commit
    Commit -->|Fetch| Return
    Return -->|Serialize| CreateProc
    CreateProc -->|JSON Response| Mutation
    Mutation -->|Update Cache| Frontend
    Frontend -->|Show Success| Form
```

---

## 6. DFD Nível 2 - Fluxo de Precificação

```mermaid
graph TB
    subgraph Frontend["🖥️ FRONTEND"]
        ProposalForm["Proposal Form"]
        ClientSelect["Select Client"]
        ServiceSelect["Select Services"]
        Calculate["Calculate Button"]
    end
    
    subgraph Backend["⚙️ BACKEND"]
        ProposalRouter["proposals Router"]
        PricingRouter["pricing Router"]
        GetParams["getPricingParameters()"]
        CalcFunc["calculateProposal()"]
    end
    
    subgraph Database["💾 DATABASE"]
        ClientTable["clients Table"]
        ServiceTable["services Table"]
        ParamTable["pricingParameters Table"]
    end
    
    subgraph Calculation["🧮 CÁLCULOS"]
        Subtotal["Subtotal = Σ(qty × price)"]
        Discount["Discount = subtotal × %"]
        Taxes["Taxes = (subtotal - discount) × rate"]
        Total["Total = subtotal - discount + taxes"]
    end
    
    ProposalForm -->|Select| ClientSelect
    ClientSelect -->|Fetch| ProposalRouter
    ProposalRouter -->|Query| ClientTable
    ClientTable -->|Return Data| ProposalRouter
    
    ProposalForm -->|Select| ServiceSelect
    ServiceSelect -->|Fetch| ProposalRouter
    ProposalRouter -->|Query| ServiceTable
    ServiceTable -->|Return Data| ProposalRouter
    
    ProposalForm -->|Click| Calculate
    Calculate -->|Get Params| PricingRouter
    PricingRouter -->|Query| ParamTable
    ParamTable -->|Return Params| PricingRouter
    
    PricingRouter -->|Execute| CalcFunc
    CalcFunc -->|Calculate| Subtotal
    Subtotal -->|Apply| Discount
    Discount -->|Apply| Taxes
    Taxes -->|Calculate| Total
    Total -->|Return Result| PricingRouter
    PricingRouter -->|JSON| Frontend
    Frontend -->|Display| ProposalForm
```

---

## 7. DFD Nível 2 - Fluxo de Auditoria

```mermaid
graph TB
    subgraph User["👤 USUÁRIO"]
        Action["Perform Action<br/>(Create/Update/Delete)"]
    end
    
    subgraph Frontend["🖥️ FRONTEND"]
        Component["Component"]
        Mutation["Mutation Call"]
    end
    
    subgraph Backend["⚙️ BACKEND"]
        Procedure["Procedure Handler"]
        AuditLog["logAudit()"]
        BuildLog["Build Log Entry"]
    end
    
    subgraph Database["💾 DATABASE"]
        MainTable["Main Table<br/>(clients, services, etc)"]
        AuditTable["auditLogs Table"]
    end
    
    Action -->|Trigger| Component
    Component -->|Call| Mutation
    Mutation -->|Execute| Procedure
    Procedure -->|Perform Action| MainTable
    MainTable -->|Confirm| Procedure
    Procedure -->|Capture| AuditLog
    AuditLog -->|Build Entry| BuildLog
    BuildLog -->|Include:<br/>- userId<br/>- action<br/>- oldValues<br/>- newValues<br/>- timestamp<br/>- ipAddress| AuditTable
    AuditTable -->|Store| Database
```

---

## 8. DFD Nível 3 - Fluxo Completo de Avaliação NR-01

```mermaid
graph TB
    subgraph Frontend["🖥️ FRONTEND - RiskAssessments.tsx"]
        List["List Assessments"]
        Form["Assessment Form"]
        Submit["Submit Form"]
        Export["Export Button"]
    end
    
    subgraph Backend["⚙️ BACKEND"]
        ListProc["list Procedure"]
        CreateProc["create Procedure"]
        ExportProc["export Procedure"]
        GetDB["getDb()"]
    end
    
    subgraph DBHelpers["📚 DB HELPERS"]
        ListFunc["listRiskAssessments()"]
        CreateFunc["createRiskAssessment()"]
        GetFactors["getRiskFactors()"]
    end
    
    subgraph Database["💾 DATABASE"]
        AssessTable["riskAssessments"]
        FactorTable["riskFactors"]
        PersonTable["people"]
        SectorTable["sectors"]
    end
    
    List -->|Load| ListProc
    ListProc -->|Execute| ListFunc
    ListFunc -->|Query| GetDB
    GetDB -->|SELECT| AssessTable
    AssessTable -->|Join| FactorTable
    FactorTable -->|Join| PersonTable
    PersonTable -->|Join| SectorTable
    SectorTable -->|Return Data| ListFunc
    ListFunc -->|Serialize| ListProc
    ListProc -->|JSON Array| Frontend
    Frontend -->|Display Table| List
    
    Form -->|Fill Data| Submit
    Submit -->|POST| CreateProc
    CreateProc -->|Validate| CreateFunc
    CreateFunc -->|INSERT| AssessTable
    AssessTable -->|Confirm| CreateFunc
    CreateFunc -->|INSERT Items| FactorTable
    FactorTable -->|Confirm| CreateFunc
    CreateFunc -->|Return ID| CreateProc
    CreateProc -->|Success| Frontend
    
    Export -->|Click| ExportProc
    ExportProc -->|Fetch Data| ListFunc
    ListFunc -->|Get All| AssessTable
    AssessTable -->|Format| ExportProc
    ExportProc -->|JSON/Excel/PDF| Frontend
    Frontend -->|Download| User["📥 User"]
```

---

## 9. DFD Nível 3 - Fluxo de Validação e Segurança

```mermaid
graph TB
    subgraph Client["🖥️ FRONTEND"]
        Input["User Input"]
        ClientValidation["Client-side<br/>Validation<br/>(Optional)"]
    end
    
    subgraph Network["🌐 NETWORK"]
        Request["HTTP Request<br/>+ Headers<br/>+ Cookies"]
    end
    
    subgraph Server["⚙️ BACKEND"]
        Context["createContext()"]
        AuthMiddleware["Auth Middleware"]
        TenantMiddleware["Tenant Middleware"]
        ProcedureAuth["protectedProcedure"]
        ZodValidation["Zod Validation"]
        BusinessLogic["Business Logic"]
    end
    
    subgraph Security["🔐 SECURITY"]
        JWT["JWT Token<br/>Validation"]
        TenantCheck["Tenant ID<br/>Verification"]
        RLS["Row-Level<br/>Security"]
    end
    
    Input -->|User Types| ClientValidation
    ClientValidation -->|Valid| Request
    Request -->|Sent| Context
    Context -->|Extract Token| AuthMiddleware
    AuthMiddleware -->|Validate| JWT
    JWT -->|Valid| TenantMiddleware
    TenantMiddleware -->|Extract| TenantCheck
    TenantCheck -->|Valid| ProcedureAuth
    ProcedureAuth -->|Check| ZodValidation
    ZodValidation -->|Valid| BusinessLogic
    BusinessLogic -->|Apply| RLS
    RLS -->|Filter Data| Server
    Server -->|Return Result| Client
```

---

## 10. DFD Nível 3 - Fluxo de Cache e Revalidação

```mermaid
graph TB
    subgraph Frontend["🖥️ FRONTEND"]
        Component["Component"]
        Query["useQuery()"]
        Cache["React Query<br/>Cache"]
        Stale["Stale Data"]
    end
    
    subgraph Backend["⚙️ BACKEND"]
        Procedure["Procedure"]
        DB["Database"]
    end
    
    Component -->|First Load| Query
    Query -->|Check Cache| Cache
    Cache -->|Miss| Procedure
    Procedure -->|Fetch| DB
    DB -->|Return| Procedure
    Procedure -->|Return Data| Query
    Query -->|Store| Cache
    Query -->|Render| Component
    
    Component -->|Second Load<br/>(within TTL)| Query
    Query -->|Check Cache| Cache
    Cache -->|Hit| Query
    Query -->|Return Cached| Component
    
    Component -->|Mutation| Procedure
    Procedure -->|Execute| DB
    DB -->|Confirm| Procedure
    Procedure -->|Success| Component
    Component -->|Invalidate| Cache
    Cache -->|Clear| Stale
    Stale -->|Refetch| Query
    Query -->|Fresh Data| Procedure
    Procedure -->|Return| Query
    Query -->|Update Cache| Cache
    Cache -->|Render| Component
```

---

## 11. Fluxo de Dados - Exemplo Prático: Criar Proposta

```mermaid
sequenceDiagram
    participant User as 👤 Usuário
    participant Frontend as 🖥️ Frontend<br/>(React)
    participant tRPC as ⚙️ tRPC Router
    participant DB as 📚 DB Helper
    participant MySQL as 💾 MySQL
    
    User->>Frontend: Clica "Criar Proposta"
    Frontend->>Frontend: Abre Modal
    User->>Frontend: Preenche Formulário
    User->>Frontend: Clica "Salvar"
    
    Frontend->>tRPC: POST /api/trpc/proposals.create<br/>{clientId, title, items, ...}
    
    tRPC->>tRPC: Extrai tenantId do header
    tRPC->>tRPC: Valida com Zod
    tRPC->>tRPC: Verifica autenticação
    
    tRPC->>DB: createProposal(data)
    DB->>DB: Gera ID único
    DB->>MySQL: INSERT INTO proposals
    MySQL->>MySQL: Confirma inserção
    MySQL-->>DB: ID da proposta
    
    DB->>DB: Para cada item
    DB->>MySQL: INSERT INTO proposalItems
    MySQL-->>DB: Confirmação
    
    DB->>MySQL: SELECT * FROM proposals WHERE id = ?
    MySQL-->>DB: Dados completos
    DB-->>tRPC: Retorna objeto Proposal
    
    tRPC-->>Frontend: JSON Response<br/>{id, clientId, title, items, ...}
    Frontend->>Frontend: Atualiza React Query Cache
    Frontend->>Frontend: Re-renderiza componente
    Frontend-->>User: Mostra "Proposta criada!"
    Frontend->>Frontend: Redireciona para lista
```

---

## 12. Arquitetura em Camadas - Fluxo Vertical

```mermaid
graph TB
    subgraph Presentation["📊 PRESENTATION LAYER"]
        React["React 19 Components"]
        Hooks["Custom Hooks<br/>(useAuth, useQuery, useMutation)"]
        State["State Management<br/>(React Query, Context)"]
    end
    
    subgraph API["🔌 API LAYER"]
        tRPCClient["tRPC Client"]
        Serialization["Serialization<br/>(SuperJSON)"]
        HTTP["HTTP Transport"]
    end
    
    subgraph Business["💼 BUSINESS LOGIC LAYER"]
        Routers["tRPC Routers"]
        Procedures["Procedures<br/>(publicProcedure,<br/>protectedProcedure)"]
        Validation["Validation<br/>(Zod)"]
        Auth["Authentication<br/>(OAuth 2.0)"]
    end
    
    subgraph Data["💾 DATA ACCESS LAYER"]
        DBHelpers["Database Helpers<br/>(CRUD functions)"]
        Calculations["Calculations<br/>(Pricing, etc)"]
        Queries["Query Building"]
    end
    
    subgraph Persistence["🗄️ PERSISTENCE LAYER"]
        ORM["Drizzle ORM"]
        MySQL["MySQL Database"]
        Tables["Tables<br/>(30+ tables)"]
    end
    
    React -->|useQuery/useMutation| Hooks
    Hooks -->|Call| State
    State -->|Manage| React
    
    Hooks -->|tRPC Call| tRPCClient
    tRPCClient -->|Serialize| Serialization
    Serialization -->|HTTP POST| HTTP
    
    HTTP -->|Route| Routers
    Routers -->|Execute| Procedures
    Procedures -->|Validate| Validation
    Procedures -->|Check| Auth
    
    Procedures -->|Call| DBHelpers
    DBHelpers -->|Use| Calculations
    Calculations -->|Build| Queries
    
    Queries -->|Execute| ORM
    ORM -->|SQL| MySQL
    MySQL -->|Query| Tables
    Tables -->|Return| MySQL
    MySQL -->|Result| ORM
    ORM -->|Data| Queries
    Queries -->|Return| DBHelpers
    DBHelpers -->|Result| Procedures
    Procedures -->|Response| HTTP
    HTTP -->|JSON| tRPCClient
    tRPCClient -->|Update| State
    State -->|Re-render| React
```

---

## 13. Fluxo de Dados - Isolamento Multi-Tenant

```mermaid
graph TB
    subgraph Tenant1["🏢 TENANT A<br/>(Empresa XYZ)"]
        User1["Usuário A1"]
        Data1["Dados Tenant A"]
    end
    
    subgraph Tenant2["🏢 TENANT B<br/>(Empresa ABC)"]
        User2["Usuário B1"]
        Data2["Dados Tenant B"]
    end
    
    subgraph Backend["⚙️ BACKEND"]
        Context1["ctx.tenantId = 'A'"]
        Context2["ctx.tenantId = 'B'"]
    end
    
    subgraph Database["💾 DATABASE COMPARTILHADO"]
        RLS["WHERE tenantId = ?"]
        AllData["Todos os Dados<br/>(Tenant A + B)"]
    end
    
    User1 -->|Login| Context1
    Context1 -->|x-tenant-id: A| RLS
    RLS -->|Filter| AllData
    AllData -->|Return A only| Data1
    Data1 -->|Display| User1
    
    User2 -->|Login| Context2
    Context2 -->|x-tenant-id: B| RLS
    RLS -->|Filter| AllData
    AllData -->|Return B only| Data2
    Data2 -->|Display| User2
    
    Note1["✅ Isolamento Completo<br/>Usuário A não vê dados de B"]
    Note2["✅ Uma única tabela<br/>com RLS"]
    Note3["✅ Escalável e eficiente"]
```

---

## 14. Fluxo de Integração: Avaliação → Proposta

```mermaid
graph TB
    subgraph Step1["📋 PASSO 1: Avaliação NR-01"]
        Assessment["Criar Avaliação"]
        Factors["Adicionar Fatores"]
        RiskLevel["Calcular Nível Risco"]
    end
    
    subgraph Step2["💡 PASSO 2: Recomendação"]
        Analyze["Analisar Riscos"]
        Recommend["Recomendar Serviços"]
        CalcPrice["Calcular Preço"]
    end
    
    subgraph Step3["📄 PASSO 3: Proposta"]
        CreateProposal["Criar Proposta"]
        AddItems["Adicionar Itens"]
        LinkAssessment["Vincular Avaliação"]
    end
    
    subgraph Step4["✉️ PASSO 4: Envio"]
        Format["Formatar Documento"]
        Send["Enviar Cliente"]
        Track["Rastrear Status"]
    end
    
    Assessment -->|Completa| Factors
    Factors -->|Submete| RiskLevel
    RiskLevel -->|Alto Risco| Analyze
    Analyze -->|Identifica Necessidades| Recommend
    Recommend -->|Serviços: Gestão, Treinamento| CalcPrice
    CalcPrice -->|Valor Total: R$ 50k| CreateProposal
    CreateProposal -->|Nova Proposta| AddItems
    AddItems -->|Serviço 1, 2, 3| LinkAssessment
    LinkAssessment -->|assessment_id + proposal_id| Format
    Format -->|PDF/Email| Send
    Send -->|Enviado| Track
    Track -->|Aguardando Resposta| Step4
```

---

## 15. Resumo de Componentes e Fluxos

| Componente | Função | Entrada | Saída |
|-----------|--------|---------|-------|
| **Frontend** | Interface de usuário | Ações do usuário | Requisições tRPC |
| **tRPC Router** | Roteamento de procedures | Requisição HTTP | Resposta JSON |
| **Procedure** | Lógica de negócio | Dados validados | Resultado processado |
| **DB Helper** | Acesso a dados | Parâmetros de query | Dados do banco |
| **Drizzle ORM** | Mapeamento objeto-relacional | Queries tipadas | Resultados SQL |
| **MySQL** | Persistência de dados | SQL queries | Dados brutos |

---

## 16. Fluxo de Segurança - Camadas de Proteção

```mermaid
graph TB
    subgraph Layer1["🔒 CAMADA 1: AUTENTICAÇÃO"]
        OAuth["OAuth 2.0<br/>(Manus)"]
        JWT["JWT Token<br/>(Session)"]
    end
    
    subgraph Layer2["🔒 CAMADA 2: AUTORIZAÇÃO"]
        RBAC["RBAC<br/>(Role-Based)"]
        ABAC["ABAC<br/>(Attribute-Based)"]
    end
    
    subgraph Layer3["🔒 CAMADA 3: ISOLAMENTO"]
        TenantCheck["Tenant Check<br/>(x-tenant-id)"]
        RLS["Row-Level Security<br/>(WHERE tenantId)"]
    end
    
    subgraph Layer4["🔒 CAMADA 4: VALIDAÇÃO"]
        InputValidation["Input Validation<br/>(Zod)"]
        TypeSafety["Type Safety<br/>(TypeScript)"]
    end
    
    subgraph Layer5["🔒 CAMADA 5: AUDITORIA"]
        AuditLog["Audit Logging<br/>(Todas ações)"]
        Compliance["Compliance<br/>(LGPD)"]
    end
    
    Request["Requisição"] -->|1. Valida| OAuth
    OAuth -->|2. Verifica| JWT
    JWT -->|3. Checa| RBAC
    RBAC -->|4. Valida| ABAC
    ABAC -->|5. Isola| TenantCheck
    TenantCheck -->|6. Filtra| RLS
    RLS -->|7. Valida| InputValidation
    InputValidation -->|8. Tipagem| TypeSafety
    TypeSafety -->|9. Registra| AuditLog
    AuditLog -->|10. Conformidade| Compliance
    Compliance -->|✅ Permitido| Execute["Executa Procedure"]
```

---

## Notas Importantes

1. **tRPC**: Comunica via HTTP POST para `/api/trpc/[procedure]`
2. **Serialização**: SuperJSON permite enviar Dates, Maps, Sets, etc.
3. **Cache**: React Query gerencia cache automaticamente
4. **Validação**: Zod valida entrada em tempo de execução
5. **Multi-Tenant**: Isolamento via `tenantId` em todas as queries
6. **Segurança**: 5 camadas de proteção (OAuth, RBAC, RLS, Validação, Auditoria)
7. **Performance**: Índices em colunas críticas (tenantId, userId, timestamps)
8. **Escalabilidade**: Arquitetura preparada para múltiplos tenants e alta concorrência

---

**Fim do Diagrama de Fluxo de Dados**

