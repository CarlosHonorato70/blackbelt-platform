import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardList,
  Plus,
  Loader2,
  MoreHorizontal,
  Calendar,
  Trash2,
  ArrowRightCircle,
  FileDown,
  Pencil,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

const ACTION_TYPE_LABELS: Record<string, string> = {
  elimination: "Eliminação",
  substitution: "Substituição",
  engineering: "Engenharia",
  administrative: "Administrativa",
  ppe: "EPI",
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Baixa", className: "bg-gray-100 text-gray-700 border-gray-200" },
  medium: { label: "Média", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  high: { label: "Alta", className: "bg-orange-100 text-orange-800 border-orange-200" },
  urgent: { label: "Urgente", className: "bg-red-100 text-red-800 border-red-200" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  in_progress: { label: "Em Andamento", className: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "Concluído", className: "bg-green-100 text-green-800 border-green-200" },
  cancelled: { label: "Cancelado", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const defaultForm = {
  title: "",
  description: "",
  actionType: "administrative",
  priority: "medium",
  deadline: "",
  budget: "",
};

const defaultEditForm = {
  id: "",
  title: "",
  description: "",
  actionType: "administrative",
  priority: "medium",
  status: "pending" as string,
  deadline: "",
  budget: "",
  monthlySchedule: null as boolean[] | null,
  kpiIndicator: "",
  expectedImpact: "",
};

export default function ActionPlans() {
  const { selectedTenant } = useTenant();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...defaultEditForm });

  const utils = trpc.useUtils();

  // ── Queries & Mutations ─────────────────────────────────────────────
  const plansQuery = trpc.riskAssessments.listActionPlans.useQuery(
    { tenantId: selectedTenant?.id ?? "" },
    { enabled: !!selectedTenant }
  );

  const createMutation = trpc.riskAssessments.createActionPlan.useMutation({
    onSuccess: () => {
      toast.success("Plano de ação criado com sucesso!");
      setCreateDialogOpen(false);
      setForm({ ...defaultForm });
      utils.riskAssessments.listActionPlans.invalidate();
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const updateMutation = trpc.riskAssessments.updateActionPlan.useMutation({
    onSuccess: () => {
      toast.success("Plano atualizado!");
      setEditDialogOpen(false);
      utils.riskAssessments.listActionPlans.invalidate();
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const deleteMutation = trpc.riskAssessments.deleteActionPlan.useMutation({
    onSuccess: () => {
      toast.success("Plano removido!");
      utils.riskAssessments.listActionPlans.invalidate();
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  // ── Handlers ────────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!selectedTenant) return toast.error("Selecione uma empresa primeiro");
    if (!form.title.trim()) return toast.error("O título é obrigatório");

    createMutation.mutate({
      tenantId: selectedTenant.id,
      title: form.title,
      description: form.description || undefined,
      actionType: form.actionType,
      priority: form.priority,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      budget: form.budget ? Math.round(parseFloat(form.budget) * 100) : undefined,
    });
  };

  const handleStatusChange = (id: string, status: "pending" | "in_progress" | "completed" | "cancelled") => {
    updateMutation.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const handleOpenEdit = (plan: any) => {
    setEditForm({
      id: plan.id,
      title: plan.title || "",
      description: plan.description || "",
      actionType: plan.actionType || "administrative",
      priority: plan.priority || "medium",
      status: plan.status || "pending",
      deadline: plan.deadline ? new Date(plan.deadline).toISOString().split("T")[0] : "",
      budget: plan.budget ? String(plan.budget / 100) : "",
      monthlySchedule: plan.monthlySchedule ?? null,
      kpiIndicator: plan.kpiIndicator || "",
      expectedImpact: plan.expectedImpact || "",
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editForm.title.trim()) return toast.error("O titulo e obrigatorio");
    updateMutation.mutate({
      id: editForm.id,
      title: editForm.title,
      description: editForm.description || undefined,
      actionType: editForm.actionType,
      priority: editForm.priority,
      status: editForm.status as any,
      deadline: editForm.deadline ? new Date(editForm.deadline) : undefined,
      budget: editForm.budget ? Math.round(parseFloat(editForm.budget) * 100) : undefined,
    });
  };

  const handleExportPdf = () => {
    if (!selectedTenant) return toast.error("Selecione uma empresa primeiro");
    window.open(`/api/pdf/plano/${selectedTenant.id}`, "_blank");
  };

  const plans = plansQuery.data ?? [];

  // ── Contadores ──────────────────────────────────────────────────────
  const countByStatus = {
    pending: plans.filter((p: any) => p.status === "pending").length,
    in_progress: plans.filter((p: any) => p.status === "in_progress").length,
    completed: plans.filter((p: any) => p.status === "completed").length,
  };

  // ── Render ──────────────────────────────────────────────────────────
  if (!selectedTenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma empresa para ver os planos de ação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardList className="w-8 h-8" />
            Planos de Ação
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as ações de mitigação de riscos psicossociais
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPdf} disabled={plans.length === 0}>
            <FileDown className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{countByStatus.pending}</div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{countByStatus.in_progress}</div>
            <p className="text-sm text-muted-foreground">Em Andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{countByStatus.completed}</div>
            <p className="text-sm text-muted-foreground">Concluídos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Planos</CardTitle>
          <CardDescription>
            {plans.length} plano(s) de ação registrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {plansQuery.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum plano de ação ainda</p>
              <p className="text-sm mt-1">
                Crie um novo plano clicando no botão acima ou a partir da página de Análise de Avaliações.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Orçamento</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan: any) => {
                  const priority = PRIORITY_CONFIG[plan.priority] || PRIORITY_CONFIG.medium;
                  const status = STATUS_CONFIG[plan.status] || STATUS_CONFIG.pending;
                  const actionType = ACTION_TYPE_LABELS[plan.actionType] || plan.actionType;

                  return (
                    <TableRow key={plan.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenEdit(plan)}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Pencil className="w-3.5 h-3.5 mt-1 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium">{plan.title}</p>
                            {plan.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-xs">
                                {plan.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{actionType}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priority.className}>
                          {priority.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.className}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {plan.deadline ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(plan.deadline).toLocaleDateString("pt-BR")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {plan.budget ? (
                          `R$ ${(plan.budget / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {plan.status !== "in_progress" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(plan.id, "in_progress")}>
                                <ArrowRightCircle className="w-4 h-4 mr-2 text-blue-600" />
                                Iniciar
                              </DropdownMenuItem>
                            )}
                            {plan.status !== "completed" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(plan.id, "completed")}>
                                <ArrowRightCircle className="w-4 h-4 mr-2 text-green-600" />
                                Concluir
                              </DropdownMenuItem>
                            )}
                            {plan.status !== "pending" && plan.status !== "cancelled" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(plan.id, "pending")}>
                                <ArrowRightCircle className="w-4 h-4 mr-2 text-yellow-600" />
                                Voltar a Pendente
                              </DropdownMenuItem>
                            )}
                            {plan.status !== "cancelled" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(plan.id, "cancelled")}>
                                <ArrowRightCircle className="w-4 h-4 mr-2 text-gray-500" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(plan.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog — Novo Plano */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Plano de Ação</DialogTitle>
            <DialogDescription>
              Registre uma nova ação para mitigação de riscos
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new-title">Título *</Label>
              <Input
                id="new-title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Ex: Programa de prevenção ao burnout"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-desc">Descrição</Label>
              <Textarea
                id="new-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Detalhes sobre a ação a ser tomada..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo de Ação</Label>
                <Select
                  value={form.actionType}
                  onValueChange={(v) => setForm((p) => ({ ...p, actionType: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elimination">Eliminação</SelectItem>
                    <SelectItem value="substitution">Substituição</SelectItem>
                    <SelectItem value="engineering">Engenharia</SelectItem>
                    <SelectItem value="administrative">Administrativa</SelectItem>
                    <SelectItem value="ppe">EPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="new-deadline">Prazo</Label>
                <Input
                  id="new-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-budget">Orçamento (R$)</Label>
                <Input
                  id="new-budget"
                  type="number"
                  placeholder="0,00"
                  value={form.budget}
                  onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !form.title.trim()}
            >
              {createMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</>
              ) : (
                "Criar Plano"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — Editar Plano */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plano de Ação</DialogTitle>
            <DialogDescription>
              Revise e ajuste os campos do plano
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-desc">Descrição</Label>
              <Textarea
                id="edit-desc"
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo de Ação</Label>
                <Select
                  value={editForm.actionType}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, actionType: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elimination">Eliminação</SelectItem>
                    <SelectItem value="substitution">Substituição</SelectItem>
                    <SelectItem value="engineering">Engenharia</SelectItem>
                    <SelectItem value="administrative">Administrativa</SelectItem>
                    <SelectItem value="ppe">EPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select
                  value={editForm.priority}
                  onValueChange={(v) => setEditForm((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-deadline">Prazo</Label>
                <Input
                  id="edit-deadline"
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) => setEditForm((p) => ({ ...p, deadline: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-budget">Orçamento (R$)</Label>
                <Input
                  id="edit-budget"
                  type="number"
                  placeholder="0,00"
                  value={editForm.budget}
                  onChange={(e) => setEditForm((p) => ({ ...p, budget: e.target.value }))}
                />
              </div>
            </div>

            {/* Cronograma mensal (read-only) */}
            {editForm.monthlySchedule && Array.isArray(editForm.monthlySchedule) && (
              <div className="grid gap-2">
                <Label>Cronograma Mensal</Label>
                <div className="flex gap-1 flex-wrap">
                  {MONTH_LABELS.map((month, idx) => (
                    <span
                      key={month}
                      className={`text-xs px-2 py-1 rounded border ${
                        editForm.monthlySchedule![idx]
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {month}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* KPI e Impacto esperado (read-only info) */}
            {editForm.kpiIndicator && (
              <div className="grid gap-2">
                <Label>Indicador KPI</Label>
                <p className="text-sm text-muted-foreground bg-muted rounded p-2">{editForm.kpiIndicator}</p>
              </div>
            )}
            {editForm.expectedImpact && (
              <div className="grid gap-2">
                <Label>Impacto Esperado</Label>
                <p className="text-sm text-muted-foreground bg-muted rounded p-2">{editForm.expectedImpact}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending || !editForm.title.trim()}
            >
              {updateMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
