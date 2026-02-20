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
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Edit2,
  Eye,
  FileText,
  MoreVertical,
  Plus,
  Shield,
  Trash2,
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

export default function RiskAssessments() {
  const { selectedTenant } = useTenant();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [sendEmailChecked, setSendEmailChecked] = useState(true);
  
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

  // Mock data - será substituído por tRPC queries quando o backend estiver pronto
  const assessments = selectedTenant
    ? [
        {
          id: "1",
          title: "Avaliação Inicial - Setor Administrativo",
          tenant: "Empresa XYZ Ltda",
          sector: "Administrativo",
          date: "2025-01-15",
          status: "completed",
          riskLevel: "medium",
          assessor: "Carlos Honorato",
        },
        {
          id: "2",
          title: "Reavaliação Anual - Produção",
          tenant: "Indústria ABC S.A.",
          sector: "Produção",
          date: "2025-01-10",
          status: "in_progress",
          riskLevel: "high",
          assessor: "Thyberê Mendes",
        },
      ]
    : [];

  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa no menu lateral para visualizar e gerenciar
            avaliações de riscos
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: "bg-gray-100 text-gray-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      reviewed: "bg-purple-100 text-purple-800",
    };
    const labels = {
      draft: "Rascunho",
      in_progress: "Em Andamento",
      completed: "Concluída",
      reviewed: "Revisada",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status as keyof typeof styles]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getRiskLevelBadge = (level: string) => {
    const styles = {
      low: { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2 },
      medium: {
        bg: "bg-yellow-100",
        text: "text-yellow-800",
        icon: AlertCircle,
      },
      high: { bg: "bg-orange-100", text: "text-orange-800", icon: AlertCircle },
      critical: { bg: "bg-red-100", text: "text-red-800", icon: AlertCircle },
    };
    const labels = {
      low: "Baixo",
      medium: "Médio",
      high: "Alto",
      critical: "Crítico",
    };
    const style = styles[level as keyof typeof styles];
    const Icon = style.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
      >
        <Icon className="h-3 w-3" />
        {labels[level as keyof typeof labels]}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Avaliações de Riscos Psicossociais
            </h1>
            <p className="text-muted-foreground">
              Gestão de riscos conforme NR-01 (Portaria MTE nº 1.419/2024)
            </p>
          </div>

          <Button onClick={() => navigate("/risk-assessments/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Avaliação
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild style={{ display: "none" }}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Avaliação
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
                    Nova Avaliação de Riscos Psicossociais
                  </DialogTitle>
                  <DialogDescription>
                    Inicie uma nova avaliação de fatores de risco psicossociais
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
                        <SelectItem value="2">Indústria ABC S.A.</SelectItem>
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
                        <SelectItem value="2">Produção</SelectItem>
                        <SelectItem value="3">Comercial</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Deixe em branco para avaliação geral da empresa
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="title">Título da Avaliação *</Label>
                    <Input
                      id="title"
                      placeholder="Ex: Avaliação Inicial - Setor Administrativo"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva o objetivo e escopo desta avaliação..."
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="assessmentDate">Data da Avaliação *</Label>
                    <Input id="assessmentDate" type="date" required />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="assessor">Avaliador Responsável *</Label>
                    <Input
                      id="assessor"
                      placeholder="Nome do profissional responsável"
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
                          Método Black Belt
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
                  <Button type="submit">Criar Avaliação</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                <p className="font-semibold text-amber-900">1. Identificação</p>
                <p className="text-xs text-amber-800">Mapeamento de perigos</p>
              </div>
              <div>
                <p className="font-semibold text-amber-900">2. Avaliação</p>
                <p className="text-xs text-amber-800">Análise de riscos</p>
              </div>
              <div>
                <p className="font-semibold text-amber-900">3. Controle</p>
                <p className="text-xs text-amber-800">Medidas de prevenção</p>
              </div>
              <div>
                <p className="font-semibold text-amber-900">4. Documentação</p>
                <p className="text-xs text-amber-800">Inventário e planos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Avaliações Cadastradas</CardTitle>
            <CardDescription>
              {assessments.length} avaliação(ões) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assessments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Empresa/Setor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Avaliador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nível de Risco</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map(assessment => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">
                        {assessment.title}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{assessment.tenant}</div>
                          <div className="text-xs text-muted-foreground">
                            {assessment.sector}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(assessment.date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>{assessment.assessor}</TableCell>
                      <TableCell>{getStatusBadge(assessment.status)}</TableCell>
                      <TableCell>
                        {getRiskLevelBadge(assessment.riskLevel)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
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
                                  "Avaliação"
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
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">
                  Nenhuma avaliação encontrada
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Comece criando uma nova avaliação de riscos psicossociais
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
                Selecione o cliente para gerar automaticamente uma proposta baseada nos riscos identificados na avaliação.
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
                  • A proposta será gerada automaticamente com base no nível de risco identificado
                  <br />
                  • Serviços recomendados serão selecionados conforme a necessidade
                  <br />
                  • O cliente receberá um email com a proposta completa (se marcado)
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
    </DashboardLayout>
  );
}
