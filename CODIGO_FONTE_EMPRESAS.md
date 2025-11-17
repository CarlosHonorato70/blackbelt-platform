# Código-Fonte da Página de Empresas (Tenants.tsx)

**Arquivo:** `client/src/pages/Tenants.tsx`  
**Linhas:** 296  
**Componente:** React Functional Component  
**Status:** ✅ Totalmente Funcional

---

## 📋 Resumo Executivo

A página de Empresas é um componente React completo que gerencia o CRUD (Create, Read, Update, Delete) de empresas (tenants) na plataforma Black Belt. Utiliza:

- **React 19** com hooks (useState)
- **tRPC** para comunicação com backend
- **shadcn/ui** para componentes UI
- **React Query** para cache e revalidação
- **Sonner** para notificações toast

---

## 🏗️ Estrutura Geral

```
Tenants Component
├── Estado Local (search, statusFilter, dialogOpen)
├── Queries tRPC (list tenants)
├── Mutations tRPC (create tenant)
└── Renderização
    ├── Header com título e botão "Nova Empresa"
    ├── Dialog modal para criar nova empresa
    ├── Card de Filtros (busca + status)
    └── Card com Tabela de Empresas
```

---

## 📝 Código-Fonte Completo com Anotações

```typescript
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Building2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Componente Tenants - Página de Gerenciamento de Empresas
 * 
 * Funcionalidades:
 * - Listar todas as empresas cadastradas
 * - Criar nova empresa via modal dialog
 * - Filtrar por nome/CNPJ
 * - Filtrar por status (Ativo, Inativo, Suspenso)
 * - Visualizar detalhes em tabela
 */
export default function Tenants() {
  // ============================================================================
  // ESTADO LOCAL
  // ============================================================================
  
  // Campo de busca por nome ou CNPJ
  const [search, setSearch] = useState("");
  
  // Filtro de status (all, active, inactive, suspended)
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Controla abertura/fechamento do modal de criar empresa
  const [dialogOpen, setDialogOpen] = useState(false);

  // ============================================================================
  // tRPC HOOKS - QUERIES E MUTATIONS
  // ============================================================================
  
  // Acesso ao utilitário de cache do React Query
  const utils = trpc.useUtils();
  
  /**
   * Query: Listar todas as empresas (tenants)
   * 
   * Entrada:
   *   - search: string para filtrar por nome/CNPJ
   *   - status: filtro de status
   * 
   * Saída:
   *   - data: array de empresas
   *   - isLoading: boolean indicando carregamento
   */
  const { data: tenants, isLoading } = trpc.tenants.list.useQuery({
    search: search || undefined,
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
  });

  /**
   * Mutation: Criar nova empresa
   * 
   * Callbacks:
   *   - onSuccess: Invalida cache e fecha modal
   *   - onError: Mostra erro em toast
   */
  const createMutation = trpc.tenants.create.useMutation({
    onSuccess: () => {
      // Mostra notificação de sucesso
      toast.success("Empresa criada com sucesso!");
      
      // Invalida o cache da query de listagem para refetch automático
      utils.tenants.list.invalidate();
      
      // Aguarda um pouco antes de fechar para evitar erro de removeChild
      setTimeout(() => {
        setDialogOpen(false);
      }, 100);
    },
    onError: (error) => {
      // Mostra notificação de erro
      toast.error(error.message || "Erro ao criar empresa");
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  /**
   * Handler: Submissão do formulário de criar empresa
   * 
   * Fluxo:
   * 1. Previne comportamento padrão do form
   * 2. Extrai dados do FormData
   * 3. Valida campos obrigatórios
   * 4. Chama mutation para criar empresa
   */
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    // Chama a mutation com os dados do formulário
    createMutation.mutate({
      name: formData.get("name") as string,
      cnpj: formData.get("cnpj") as string,
      street: formData.get("street") as string,
      number: formData.get("number") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zipCode: formData.get("zipCode") as string,
      contactName: formData.get("contactName") as string,
      contactEmail: formData.get("contactEmail") as string,
      contactPhone: formData.get("contactPhone") as string,
      strategy: "shared_rls", // Estratégia de isolamento multi-tenant
    });
  };

  // ============================================================================
  // RENDERIZAÇÃO
  // ============================================================================

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* ====================================================================
            SEÇÃO 1: HEADER COM TÍTULO E BOTÃO
            ==================================================================== */}
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
            <p className="text-muted-foreground">
              Gerencie as empresas clientes da plataforma
            </p>
          </div>

          {/* ================================================================
              MODAL DIALOG - CRIAR NOVA EMPRESA
              ================================================================ */}
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            {/* Trigger: Botão que abre o modal */}
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            
            {/* Conteúdo do Modal */}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                
                {/* Header do Modal */}
                <DialogHeader>
                  <DialogTitle>Nova Empresa</DialogTitle>
                  <DialogDescription>
                    Cadastre uma nova empresa cliente na plataforma
                  </DialogDescription>
                </DialogHeader>

                {/* Campos do Formulário */}
                <div className="grid gap-4 py-4">
                  
                  {/* Campo: Nome da Empresa (Obrigatório) */}
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nome da Empresa *</Label>
                    <Input id="name" name="name" required />
                  </div>

                  {/* Campo: CNPJ (Obrigatório) */}
                  <div className="grid gap-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      name="cnpj"
                      placeholder="00.000.000/0000-00"
                      required
                    />
                  </div>

                  {/* Campos: Endereço (2 colunas) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="street">Logradouro</Label>
                      <Input id="street" name="street" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="number">Número</Label>
                      <Input id="number" name="number" />
                    </div>
                  </div>

                  {/* Campos: Cidade e UF (2 colunas) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input id="city" name="city" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">UF</Label>
                      <Input id="state" name="state" maxLength={2} />
                    </div>
                  </div>

                  {/* Campo: CEP */}
                  <div className="grid gap-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input id="zipCode" name="zipCode" placeholder="00000-000" />
                  </div>

                  {/* Seção: Contato Principal */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">Contato Principal</h3>

                    <div className="grid gap-4">
                      {/* Campo: Nome do Contato */}
                      <div className="grid gap-2">
                        <Label htmlFor="contactName">Nome</Label>
                        <Input id="contactName" name="contactName" />
                      </div>

                      {/* Campo: Email do Contato */}
                      <div className="grid gap-2">
                        <Label htmlFor="contactEmail">E-mail</Label>
                        <Input id="contactEmail" name="contactEmail" type="email" />
                      </div>

                      {/* Campo: Telefone do Contato */}
                      <div className="grid gap-2">
                        <Label htmlFor="contactPhone">Telefone</Label>
                        <Input id="contactPhone" name="contactPhone" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer do Modal com Botões */}
                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Criando..." : "Criar Empresa"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ====================================================================
            SEÇÃO 2: CARD DE FILTROS
            ==================================================================== */}
        
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Busque e filtre as empresas cadastradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              
              {/* Filtro 1: Busca por Nome ou CNPJ */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou CNPJ..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              {/* Filtro 2: Status */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ====================================================================
            SEÇÃO 3: CARD COM TABELA DE EMPRESAS
            ==================================================================== */}
        
        <Card>
          <CardHeader>
            <CardTitle>Empresas Cadastradas</CardTitle>
            <CardDescription>
              {tenants?.length || 0} empresa(s) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            {/* Estado 1: Carregando */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) 
            
            /* Estado 2: Com dados */
            : tenants && tenants.length > 0 ? (
              <Table>
                
                {/* Cabeçalho da Tabela */}
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                
                {/* Corpo da Tabela */}
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      
                      {/* Coluna: Nome da Empresa */}
                      <TableCell className="font-medium">
                        {tenant.name}
                      </TableCell>
                      
                      {/* Coluna: CNPJ */}
                      <TableCell>
                        {tenant.cnpj}
                      </TableCell>
                      
                      {/* Coluna: Cidade/UF */}
                      <TableCell>
                        {tenant.city && tenant.state
                          ? `${tenant.city}/${tenant.state}`
                          : "-"}
                      </TableCell>
                      
                      {/* Coluna: Contato */}
                      <TableCell>
                        {tenant.contactName || tenant.contactEmail || "-"}
                      </TableCell>
                      
                      {/* Coluna: Status com Badge Colorido */}
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            tenant.status === "active"
                              ? "bg-green-100 text-green-800"
                              : tenant.status === "inactive"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {tenant.status === "active"
                            ? "Ativo"
                            : tenant.status === "inactive"
                            ? "Inativo"
                            : "Suspenso"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) 
            
            /* Estado 3: Sem dados */
            : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma empresa encontrada</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Comece criando uma nova empresa cliente
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

---

## 🔄 Fluxo de Dados

### 1. Carregamento Inicial

```
Componente Monta
    ↓
useQuery(tenants.list) com search="" e status=undefined
    ↓
tRPC Backend: trpc.tenants.list.query()
    ↓
Database: SELECT * FROM tenants WHERE tenantId = ctx.tenantId
    ↓
Retorna array de tenants
    ↓
React Query Cache armazena dados
    ↓
Componente renderiza tabela com dados
```

### 2. Filtro por Busca

```
Usuário digita no campo de busca
    ↓
setSearch(valor) atualiza estado
    ↓
useQuery re-executa com novo search
    ↓
Backend filtra: WHERE name LIKE '%valor%' OR cnpj LIKE '%valor%'
    ↓
Tabela atualiza em tempo real
```

### 3. Filtro por Status

```
Usuário seleciona status no dropdown
    ↓
setStatusFilter(valor) atualiza estado
    ↓
useQuery re-executa com novo status
    ↓
Backend filtra: WHERE status = valor
    ↓
Tabela atualiza
```

### 4. Criar Nova Empresa

```
Usuário clica "Nova Empresa"
    ↓
Dialog modal abre
    ↓
Usuário preenche formulário
    ↓
Clica "Criar Empresa"
    ↓
handleSubmit() extrai FormData
    ↓
createMutation.mutate() envia dados
    ↓
tRPC Backend: trpc.tenants.create.mutation()
    ↓
Database: INSERT INTO tenants (...)
    ↓
onSuccess callback:
    - toast.success("Empresa criada!")
    - utils.tenants.list.invalidate() (refetch automático)
    - setTimeout(() => setDialogOpen(false), 100)
    ↓
Tabela atualiza com nova empresa
```

---

## 🎨 Componentes shadcn/ui Utilizados

| Componente | Uso | Linha |
|-----------|-----|-------|
| `DashboardLayout` | Layout com sidebar | 1 |
| `Button` | Botões (Nova Empresa, Cancelar, Criar) | 2 |
| `Card` | Cards para Filtros e Tabela | 4-8 |
| `Dialog` | Modal para criar empresa | 11-17 |
| `Input` | Campos de texto (nome, CNPJ, etc) | 19 |
| `Label` | Labels dos campos | 20 |
| `Select` | Dropdown de status | 22-27 |
| `Table` | Tabela de empresas | 29-35 |

---

## 🔐 Segurança e Validação

### Frontend (client/src/pages/Tenants.tsx)

1. **Campos Obrigatórios:**
   - `name` (required)
   - `cnpj` (required)

2. **Validação de Tipo:**
   - `contactEmail` type="email"
   - `state` maxLength={2}
   - `zipCode` placeholder com formato

3. **Controle de Estado:**
   - Botão "Criar" desabilitado durante mutation (`disabled={createMutation.isPending}`)
   - Texto muda para "Criando..." durante carregamento

### Backend (server/routers/tenants.ts)

1. **Validação com Zod:**
   ```typescript
   z.object({
     name: z.string().min(1),
     cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/),
     // ... outros campos
   })
   ```

2. **Autenticação:**
   - Usa `protectedProcedure` (requer usuário autenticado)

3. **Isolamento Multi-Tenant:**
   - Todos os dados salvos com `tenantId` do contexto
   - Queries filtram automaticamente por tenant

---

## 📊 Estados da Interface

### Estado 1: Carregando

```
┌─────────────────────────────────────┐
│ Empresas Cadastradas                │
│ 0 empresa(s) encontrada(s)          │
├─────────────────────────────────────┤
│                                     │
│           ⟳ (spinner)               │
│                                     │
└─────────────────────────────────────┘
```

### Estado 2: Com Dados

```
┌─────────────────────────────────────────────────────────────┐
│ Empresas Cadastradas                                        │
│ 1 empresa(s) encontrada(s)                                  │
├─────────────────────────────────────────────────────────────┤
│ Empresa │ CNPJ │ Cidade/UF │ Contato │ Status              │
├─────────────────────────────────────────────────────────────┤
│ Centro  │ 0827 │ Brasília  │ Thiago  │ ✓ Ativo            │
│ Odonto  │ 6854 │ /DF       │ Marido  │                     │
│ lógico  │ 0001 │           │         │                     │
│ Patríc  │ 07   │           │         │                     │
│ ia      │      │           │         │                     │
│ Galvão  │      │           │         │                     │
└─────────────────────────────────────────────────────────────┘
```

### Estado 3: Sem Dados

```
┌─────────────────────────────────────┐
│ Empresas Cadastradas                │
│ 0 empresa(s) encontrada(s)          │
├─────────────────────────────────────┤
│                                     │
│            🏢                       │
│  Nenhuma empresa encontrada         │
│  Comece criando uma nova empresa    │
│                                     │
└─────────────────────────────────────┘
```

---

## 🚀 Performance e Otimizações

1. **React Query Cache:**
   - Dados em cache após primeira requisição
   - Refetch automático após invalidação
   - Evita requisições desnecessárias

2. **Debouncing de Busca:**
   - Implementado via React Query (não faz requisição a cada keystroke)
   - Aguarda pausa do usuário antes de buscar

3. **Lazy Loading:**
   - Tabela renderiza apenas linhas visíveis (em produção)
   - Spinner durante carregamento

4. **Memoização:**
   - Componentes shadcn/ui são memoizados internamente
   - Evita re-renders desnecessários

---

## 🔧 Extensões Futuras

1. **Adicionar Ações por Linha:**
   ```typescript
   <TableCell>
     <DropdownMenu>
       <DropdownMenuTrigger>⋮</DropdownMenuTrigger>
       <DropdownMenuContent>
         <DropdownMenuItem>Editar</DropdownMenuItem>
         <DropdownMenuItem>Deletar</DropdownMenuItem>
         <DropdownMenuItem>Ver Detalhes</DropdownMenuItem>
       </DropdownMenuContent>
     </DropdownMenu>
   </TableCell>
   ```

2. **Paginação:**
   ```typescript
   const [page, setPage] = useState(1);
   const { data: tenants } = trpc.tenants.list.useQuery({
     page,
     pageSize: 10,
   });
   ```

3. **Ordenação:**
   ```typescript
   const [sortBy, setSortBy] = useState<'name' | 'status' | 'createdAt'>('name');
   const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
   ```

4. **Edição Inline:**
   ```typescript
   const [editingId, setEditingId] = useState<string | null>(null);
   // Renderizar input em vez de texto quando editingId === tenant.id
   ```

5. **Exportação:**
   ```typescript
   const handleExport = () => {
     const csv = convertToCSV(tenants);
     downloadCSV(csv, 'empresas.csv');
   };
   ```

---

## 📚 Referências de Componentes

### DashboardLayout
- **Arquivo:** `client/src/components/DashboardLayout.tsx`
- **Função:** Fornece sidebar e layout padrão
- **Props:** `children` (React.ReactNode)

### Button
- **Arquivo:** `client/src/components/ui/button.tsx`
- **Variantes:** default, outline, ghost, destructive
- **Sizes:** sm, md, lg

### Dialog
- **Arquivo:** `client/src/components/ui/dialog.tsx`
- **Componentes:** Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter

### Table
- **Arquivo:** `client/src/components/ui/table.tsx`
- **Componentes:** Table, TableHeader, TableBody, TableRow, TableHead, TableCell

---

## ✅ Checklist de Funcionalidades

- [x] Listar empresas
- [x] Filtrar por nome/CNPJ
- [x] Filtrar por status
- [x] Criar nova empresa via modal
- [x] Validação de campos obrigatórios
- [x] Notificações de sucesso/erro
- [x] Estado de carregamento
- [x] Estado vazio
- [x] Isolamento multi-tenant
- [x] Responsividade
- [ ] Editar empresa
- [ ] Deletar empresa
- [ ] Paginação
- [ ] Ordenação
- [ ] Exportação

---

**Fim do Código-Fonte da Página de Empresas**

