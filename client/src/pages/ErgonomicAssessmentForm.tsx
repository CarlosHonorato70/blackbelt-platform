import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  ClipboardCheck,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  workstation: "Posto de Trabalho",
  posture: "Postura",
  repetition: "Repetição",
  lighting: "Iluminação",
  noise: "Ruído",
  organization: "Organização",
  psychosocial: "Psicossocial",
};

const RISK_LEVEL_CONFIG: Record<string, { label: string; className: string }> = {
  acceptable: { label: "Aceitável", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  moderate: { label: "Moderado", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  high: { label: "Alto", className: "bg-orange-100 text-orange-800 hover:bg-orange-100" },
  critical: { label: "Crítico", className: "bg-red-100 text-red-800 hover:bg-red-100" },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
  in_progress: { label: "Em Andamento", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  completed: { label: "Concluída", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  reviewed: { label: "Revisada", className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
};

const STATUS_OPTIONS = ["draft", "in_progress", "completed", "reviewed"];

export default function ErgonomicAssessmentForm() {
  usePageMeta({ title: "Avaliação Ergonômica" });
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState({
    category: "",
    factor: "",
    riskLevel: "",
    observation: "",
    recommendation: "",
  });

  const assessmentQuery = trpc.ergonomicAssessments.get.useQuery(
    { id: id!, tenantId: tenantId! },
    { enabled: !!id && !!tenantId }
  );

  const updateMutation = trpc.ergonomicAssessments.update.useMutation({
    onSuccess: () => {
      toast.success("Avaliação atualizada!");
      assessmentQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const addItemMutation = trpc.ergonomicAssessments.addItem.useMutation({
    onSuccess: () => {
      toast.success("Item adicionado!");
      setAddItemOpen(false);
      setItemForm({ category: "", factor: "", riskLevel: "", observation: "", recommendation: "" });
      assessmentQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteItemMutation = trpc.ergonomicAssessments.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Item removido!");
      assessmentQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!tenantId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Selecione uma empresa para continuar.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (assessmentQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const assessment = assessmentQuery.data as any;
  if (!assessment) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Avaliação não encontrada.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const items = (assessment.items || []) as any[];
  const groupedItems: Record<string, any[]> = {};
  items.forEach((item: any) => {
    const cat = item.category || "other";
    if (!groupedItems[cat]) groupedItems[cat] = [];
    groupedItems[cat].push(item);
  });

  const handleAddItem = () => {
    if (!itemForm.category || !itemForm.factor || !itemForm.riskLevel) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    addItemMutation.mutate({
      assessmentId: id!,
      tenantId: tenantId!,
      category: itemForm.category,
      factor: itemForm.factor,
      riskLevel: itemForm.riskLevel,
      observation: itemForm.observation || undefined,
      recommendation: itemForm.recommendation || undefined,
    });
  };

  const handleStatusChange = (newStatus: string) => {
    updateMutation.mutate({
      id: id!,
      tenantId: tenantId!,
      status: newStatus,
    });
  };

  const statusCfg = STATUS_CONFIG[assessment.status] || STATUS_CONFIG.draft;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <Button variant="ghost" onClick={() => navigate("/ergonomic-assessments")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">{assessment.title}</CardTitle>
                <CardDescription>
                  Avaliador: {assessment.assessorName} | Data:{" "}
                  {new Date(assessment.assessmentDate).toLocaleDateString("pt-BR")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                <Select value={assessment.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Alterar status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_CONFIG[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          {assessment.methodology && (
            <CardContent>
              <p className="text-sm text-muted-foreground">
                <strong>Metodologia:</strong> {assessment.methodology}
              </p>
            </CardContent>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Itens da Avaliação</h2>
          <Button onClick={() => setAddItemOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Item
          </Button>
        </div>

        {Object.keys(groupedItems).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <ClipboardCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Nenhum item adicionado. Clique em "Adicionar Item" para começar.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedItems).map(([category, catItems]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-base">
                  {CATEGORY_LABELS[category] || category}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fator</TableHead>
                      <TableHead>Nível de Risco</TableHead>
                      <TableHead>Observação</TableHead>
                      <TableHead>Recomendação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catItems.map((item: any) => {
                      const riskCfg = RISK_LEVEL_CONFIG[item.riskLevel] || RISK_LEVEL_CONFIG.acceptable;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.factor}</TableCell>
                          <TableCell>
                            <Badge className={riskCfg.className}>{riskCfg.label}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {item.observation || "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {item.recommendation || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                deleteItemMutation.mutate({
                                  id: item.id,
                                  tenantId: tenantId!,
                                })
                              }
                              disabled={deleteItemMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}

        <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Item de Avaliação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Categoria *</Label>
                <Select
                  value={itemForm.category}
                  onValueChange={(v) => setItemForm({ ...itemForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="factor">Fator *</Label>
                <Input
                  id="factor"
                  value={itemForm.factor}
                  onChange={(e) => setItemForm({ ...itemForm, factor: e.target.value })}
                  placeholder="Descreva o fator avaliado"
                />
              </div>
              <div>
                <Label>Nível de Risco *</Label>
                <Select
                  value={itemForm.riskLevel}
                  onValueChange={(v) => setItemForm({ ...itemForm, riskLevel: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RISK_LEVEL_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="observation">Observação</Label>
                <Textarea
                  id="observation"
                  value={itemForm.observation}
                  onChange={(e) => setItemForm({ ...itemForm, observation: e.target.value })}
                  placeholder="Observações sobre o fator"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="recommendation">Recomendação</Label>
                <Textarea
                  id="recommendation"
                  value={itemForm.recommendation}
                  onChange={(e) => setItemForm({ ...itemForm, recommendation: e.target.value })}
                  placeholder="Recomendações de melhoria"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddItemOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddItem} disabled={addItemMutation.isPending}>
                {addItemMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
