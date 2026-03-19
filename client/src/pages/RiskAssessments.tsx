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
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  FileText,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Shield,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  exportToJSON,
  exportToExcel,
  generateAssessmentReport,
  exportToPDF,
} from "@/lib/exportUtils";
import { toast } from "sonner";

// ─── Severity / Probability labels ───────────────────────────────────
const SEVERITY_LABELS: Record<string, string> = {
  low: "Baixo",
  medium: "Medio",
  high: "Alto",
  critical: "Critico",
};

const PROBABILITY_LABELS: Record<string, string> = {
  rare: "Raro",
  unlikely: "Improvavel",
  possible: "Possivel",
  likely: "Provavel",
  certain: "Certo",
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-300",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-300",
};

// ─── Helper: compute risk score ───────────────────────────────────────
function computeRiskLevel(severity: string, probability: string) {
  const s = { low: 1, medium: 2, high: 3, critical: 4 }[severity] ?? 2;
  const p = { rare: 1, unlikely: 2, possible: 3, likely: 4, certain: 5 }[probability] ?? 3;
  const score = s * p;
  if (score <= 4) return "low";
  if (score <= 8) return "medium";
  if (score <= 12) return "high";
  return "critical";
}

// ─── Inline edit form for a single risk item ──────────────────────────
function RiskItemEditRow({
  item,
  assessmentId,
  onSaved,
  onCancel,
}: {
  item: any;
  assessmentId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [severity, setSeverity] = useState(item.severity);
  const [probability, setProbability] = useState(item.probability);
  const [observations, setObservations] = useState(item.observations ?? "");
  const [currentControls, setCurrentControls] = useState(item.currentControls ?? "");

  const updateMutation = trpc.riskAssessments.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Item atualizado!");
      onSaved();
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: item.id,
      assessmentId,
      severity,
      probability,
      currentControls: currentControls || undefined,
      observations: observations || undefined,
    });
  };

  return (
    <div className="space-y-3 p-3 border rounded-md bg-white">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Severidade</Label>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Probabilidade</Label>
          <Select value={probability} onValueChange={setProbability}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROBABILITY_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Controles Existentes</Label>
        <Textarea
          value={currentControls}
          onChange={(e) => setCurrentControls(e.target.value)}
          rows={2}
          className="text-xs"
          placeholder="Descreva controles existentes..."
        />
      </div>

      <div>
        <Label className="text-xs">Observacoes / Recomendacoes</Label>
        <Textarea
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          rows={2}
          className="text-xs"
          placeholder="Recomendacoes de mitigacao..."
        />
      </div>

      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-muted-foreground mr-auto">
          Nivel resultante:{" "}
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${RISK_LEVEL_COLORS[computeRiskLevel(severity, probability)]}`}>
            {SEVERITY_LABELS[computeRiskLevel(severity, probability)]}
          </span>
        </span>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={updateMutation.isPending}>
          <X className="h-3 w-3 mr-1" /> Cancelar
        </Button>
        <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────
export default function RiskAssessments() {
  const { selectedTenant } = useTenant();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [sendEmailChecked, setSendEmailChecked] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<string | null>(null);

  // Expandable rows
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: clients } = trpc.clients.list.useQuery();
  const generateProposalMutation = trpc.assessmentProposals.generateFromAssessment.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Proposta gerada com sucesso! ${data.emailSent ? "Email enviado." : ""}`,
        {
          description: `Valor: ${new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(data.totalValue / 100)}`,
        }
      );
      setProposalDialogOpen(false);
      navigate(`/proposals`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao gerar proposta");
    },
  });

  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;

  const { data: assessments = [] } = trpc.riskAssessments.list.useQuery(
    { tenantId: tenantId ?? "" },
    { enabled: !!tenantId }
  );

  // Fetch expanded assessment details (with items)
  const { data: expandedAssessment, isLoading: loadingItems } = trpc.riskAssessments.get.useQuery(
    { id: expandedId ?? "", tenantId: tenantId ?? "" },
    { enabled: !!expandedId && !!tenantId }
  );

  const deleteMutation = trpc.riskAssessments.delete.useMutation({
    onSuccess: () => {
      toast.success("Avaliacao excluida com sucesso!");
      utils.riskAssessments.list.invalidate();
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  const deleteItemMutation = trpc.riskAssessments.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Item removido!");
      if (expandedId) utils.riskAssessments.get.invalidate({ id: expandedId });
    },
    onError: (err) => toast.error(`Erro: ${err.message}`),
  });

  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa no menu lateral para visualizar e gerenciar
            avaliacoes de riscos
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      reviewed: "bg-purple-100 text-purple-800",
    };
    const labels: Record<string, string> = {
      draft: "Rascunho",
      in_progress: "Em Andamento",
      completed: "Concluida",
      reviewed: "Revisada",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.draft}`}
      >
        {labels[status] ?? status}
      </span>
    );
  };

  const getRiskLevelBadge = (level: string) => {
    const styles: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
      low: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2 },
      medium: { bg: "bg-yellow-100", text: "text-yellow-800", icon: AlertCircle },
      high: { bg: "bg-orange-100", text: "text-orange-800", icon: AlertCircle },
      critical: { bg: "bg-red-100", text: "text-red-800", icon: AlertCircle },
    };
    const labels: Record<string, string> = {
      low: "Baixo",
      medium: "Medio",
      high: "Alto",
      critical: "Critico",
    };
    const style = styles[level] ?? styles.medium;
    const Icon = style.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
      >
        <Icon className="h-3 w-3" />
        {labels[level] ?? level}
      </span>
    );
  };

  // ── Risk summary across all assessments ────────────────────────────
  const riskSummary = (() => {
    // We only have top-level data; approximate from methodology field and items if expanded
    const counts = { low: 0, medium: 0, high: 0, critical: 0, total: assessments.length };
    assessments.forEach((a: any) => {
      // Use methodology heuristic same as original code, or default medium
      const level = a.methodology === "critical" ? "critical" : "medium";
      counts[level as keyof typeof counts]++;
    });
    return counts;
  })();

  const handleExportPdf = () => {
    if (!tenantId) return;
    // Download from server PDF route
    window.open(`/api/pdf/inventario/${tenantId}`, "_blank");
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEditingItemId(null);
    } else {
      setExpandedId(id);
      setEditingItemId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Avaliacoes de Riscos Psicossociais
            </h1>
            <p className="text-muted-foreground">
              Gestao de riscos conforme NR-01 (Portaria MTE no 1.419/2024)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExportPdf}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button onClick={() => navigate("/risk-assessments/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Avaliacao
            </Button>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild style={{ display: "none" }}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Avaliacao
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  setDialogOpen(false);
                }}
              >
                <DialogHeader>
                  <DialogTitle>
                    Nova Avaliacao de Riscos Psicossociais
                  </DialogTitle>
                  <DialogDescription>
                    Inicie uma nova avaliacao de fatores de risco psicossociais
                    relacionados ao trabalho
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tenant">Empresa *</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Empresa XYZ Ltda</SelectItem>
                        <SelectItem value="2">Industria ABC S.A.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="sector">Setor (Opcional)</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Administrativo</SelectItem>
                        <SelectItem value="2">Producao</SelectItem>
                        <SelectItem value="3">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Deixe em branco para avaliacao geral da empresa
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="title">Titulo da Avaliacao *</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Avaliacao Inicial - Setor Administrativo"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Descricao</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva o objetivo e escopo desta avaliacao..."
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="assessmentDate">Data da Avaliacao *</Label>
                    <Input id="assessmentDate" type="date" required />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="assessor">Avaliador Responsavel *</Label>
                    <Input
                      id="assessor"
                      placeholder="Nome do profissional responsavel"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="methodology">Metodologia</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a metodologia" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iso45003">ISO 45003</SelectItem>
                        <SelectItem value="whsq">WHSQ (WHO)</SelectItem>
                        <SelectItem value="blackbelt">
                          Metodo Black Belt
                        </SelectItem>
                        <SelectItem value="custom">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Criar Avaliacao</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Risk Summary Badges */}
        {assessments.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-3">
              <div className="text-2xl font-bold">{riskSummary.total}</div>
              <div className="text-xs text-muted-foreground">Total Avaliacoes</div>
            </Card>
            {(["low", "medium", "high", "critical"] as const).map((level) => (
              <Card key={level} className={`p-3 border ${RISK_LEVEL_COLORS[level]}`}>
                <div className="text-2xl font-bold">{riskSummary[level]}</div>
                <div className="text-xs">{SEVERITY_LABELS[level]}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card NR-01 */}
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-amber-700" />
              <div>
                <CardTitle className="text-base">Conformidade NR-01</CardTitle>
                <CardDescription className="text-amber-900/70">
                  Gerenciamento de Riscos Ocupacionais (GRO)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="font-semibold text-amber-900">1. Identificacao</p>
                <p className="text-xs text-amber-800">Mapeamento de perigos</p>
              </div>
              <div>
                <p className="font-semibold text-amber-900">2. Avaliacao</p>
                <p className="text-xs text-amber-800">Analise de riscos</p>
              </div>
              <div>
                <p className="font-semibold text-amber-900">3. Controle</p>
                <p className="text-xs text-amber-800">Medidas de prevencao</p>
              </div>
              <div>
                <p className="font-semibold text-amber-900">4. Documentacao</p>
                <p className="text-xs text-amber-800">Inventario e planos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Avaliacoes Cadastradas</CardTitle>
            <CardDescription>
              {assessments.length} avaliacao(oes) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assessments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Empresa/Setor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Avaliador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nivel de Risco</TableHead>
                    <TableHead>Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((assessment: any) => (
                    <>
                      <TableRow
                        key={assessment.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpand(assessment.id)}
                      >
                        <TableCell>
                          {expandedId === assessment.id ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {assessment.title}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {assessment.sectorId || "Geral"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {assessment.assessmentDate ? new Date(assessment.assessmentDate).toLocaleDateString("pt-BR") : "\u2014"}
                        </TableCell>
                        <TableCell>{assessment.assessor || "\u2014"}</TableCell>
                        <TableCell>{getStatusBadge(assessment.status ?? "draft")}</TableCell>
                        <TableCell>
                          {getRiskLevelBadge(assessment.methodology === "critical" ? "critical" : "medium")}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate("/copsoq/analytics")}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/risk-assessments/${assessment.id}`)}
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  const report = generateAssessmentReport([
                                    assessment,
                                  ]);
                                  exportToPDF(
                                    report,
                                    `avaliacao_${assessment.id}_${new Date().toISOString().split("T")[0]}.txt`
                                  );
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Exportar Texto
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  exportToJSON(
                                    [assessment],
                                    `avaliacao_${assessment.id}_${new Date().toISOString().split("T")[0]}.json`
                                  );
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Exportar JSON
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  exportToExcel(
                                    [assessment],
                                    `avaliacao_${assessment.id}_${new Date().toISOString().split("T")[0]}.xlsx`,
                                    "Avaliacao"
                                  );
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Exportar Excel
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedAssessmentId(assessment.id);
                                  setProposalDialogOpen(true);
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Gerar Proposta
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setAssessmentToDelete(assessment.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* Expanded items detail */}
                      {expandedId === assessment.id && (
                        <TableRow key={`${assessment.id}-items`}>
                          <TableCell colSpan={8} className="bg-muted/30 p-0">
                            <div className="p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold">
                                  Itens de Risco ({expandedAssessment?.items?.length ?? 0})
                                </h4>
                                {expandedAssessment?.items && expandedAssessment.items.length > 0 && (
                                  <div className="flex gap-1">
                                    {(["low", "medium", "high", "critical"] as const).map((level) => {
                                      const count = expandedAssessment.items.filter((i: any) => i.riskLevel === level).length;
                                      if (!count) return null;
                                      return (
                                        <Badge key={level} variant="outline" className={`text-[10px] ${RISK_LEVEL_COLORS[level]}`}>
                                          {SEVERITY_LABELS[level]}: {count}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {loadingItems ? (
                                <div className="flex items-center justify-center py-6">
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                  <span className="ml-2 text-sm text-muted-foreground">Carregando itens...</span>
                                </div>
                              ) : expandedAssessment?.items && expandedAssessment.items.length > 0 ? (
                                <div className="space-y-2">
                                  {expandedAssessment.items.map((item: any) => (
                                    <div key={item.id}>
                                      {editingItemId === item.id ? (
                                        <RiskItemEditRow
                                          item={item}
                                          assessmentId={assessment.id}
                                          onSaved={() => {
                                            setEditingItemId(null);
                                            utils.riskAssessments.get.invalidate({ id: assessment.id });
                                          }}
                                          onCancel={() => setEditingItemId(null)}
                                        />
                                      ) : (
                                        <div className="flex items-center gap-3 p-3 border rounded-md bg-white hover:bg-gray-50">
                                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${RISK_LEVEL_COLORS[item.riskLevel]}`}>
                                            {SEVERITY_LABELS[item.riskLevel] ?? item.riskLevel}
                                          </span>

                                          <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">
                                              {item.riskFactorId}
                                              {item.hazardCode && (
                                                <span className="ml-1 text-xs text-muted-foreground">({item.hazardCode})</span>
                                              )}
                                            </div>
                                            <div className="text-xs text-muted-foreground flex gap-3">
                                              <span>Severidade: {SEVERITY_LABELS[item.severity] ?? item.severity}</span>
                                              <span>Probabilidade: {PROBABILITY_LABELS[item.probability] ?? item.probability}</span>
                                              {item.affectedPopulation && <span>Pop. afetada: {item.affectedPopulation}</span>}
                                            </div>
                                            {item.observations && (
                                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.observations}</p>
                                            )}
                                            {item.currentControls && (
                                              <p className="text-xs text-blue-700 mt-0.5 line-clamp-1">Controles: {item.currentControls}</p>
                                            )}
                                          </div>

                                          <div className="flex gap-1 shrink-0">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 w-7 p-0"
                                              onClick={() => setEditingItemId(item.id)}
                                              title="Editar item"
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                              onClick={() => {
                                                if (confirm("Remover este item de risco?")) {
                                                  deleteItemMutation.mutate({
                                                    id: item.id,
                                                    assessmentId: assessment.id,
                                                  });
                                                }
                                              }}
                                              title="Remover item"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground py-4 text-center">
                                  Nenhum item de risco nesta avaliacao. Execute o agente NR-01 para gerar itens automaticamente.
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">
                  Nenhuma avaliacao encontrada
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Comece criando uma nova avaliacao de riscos psicossociais
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Proposal Dialog */}
        <Dialog open={proposalDialogOpen} onOpenChange={setProposalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Proposta Comercial</DialogTitle>
              <DialogDescription>
                Selecione o cliente para gerar automaticamente uma proposta baseada nos riscos identificados na avaliacao.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmailChecked}
                  onChange={(e) => setSendEmailChecked(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                  Enviar proposta por email automaticamente
                </Label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-900">
                  <strong>Como funciona:</strong>
                  <br />
                  A proposta sera gerada automaticamente com base no nivel de risco identificado.
                  Servicos recomendados serao selecionados conforme a necessidade.
                  O cliente recebera um email com a proposta completa (se marcado).
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setProposalDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!selectedClientId) {
                    toast.error("Selecione um cliente");
                    return;
                  }
                  generateProposalMutation.mutate({
                    assessmentId: selectedAssessmentId,
                    clientId: selectedClientId,
                    sendEmail: sendEmailChecked,
                  });
                }}
                disabled={generateProposalMutation.isPending}
              >
                {generateProposalMutation.isPending ? "Gerando..." : "Gerar Proposta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusao</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta avaliacao? Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setAssessmentToDelete(null); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (assessmentToDelete && tenantId) {
                  deleteMutation.mutate({ id: assessmentToDelete, tenantId });
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
