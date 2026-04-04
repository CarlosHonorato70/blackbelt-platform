import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Stethoscope,
  FileDown,
  ArrowLeft,
  ClipboardCheck,
} from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useNavigate } from "react-router-dom";

const PRIORITY_COLORS: Record<string, string> = {
  alta: "bg-red-100 text-red-800 border-red-200",
  media: "bg-yellow-100 text-yellow-800 border-yellow-200",
  baixa: "bg-green-100 text-green-800 border-green-200",
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export default function PgrPcmsoIntegration() {
  usePageMeta({ title: "Integração PGR/PCMSO" });
  const navigate = useNavigate();
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const { exportPdf, isExporting } = usePdfExport();

  const [editItem, setEditItem] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [examDialogOpen, setExamDialogOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    employeeName: "",
    examType: "periodico" as string,
    examDate: "",
    result: "apto" as string,
    restrictions: "",
    observations: "",
    doctorName: "",
    doctorCrm: "",
    nextExamDate: "",
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

  const exportPcmsoIntegrationMutation = trpc.nr01Pdf.exportPcmsoIntegration.useMutation();
  const exportConsolidatedPgrMutation = trpc.nr01Pdf.exportConsolidatedPgr.useMutation();

  const listQuery = trpc.pcmsoIntegration.list.useQuery({ tenantId });
  const generateMutation = trpc.pcmsoIntegration.generate.useMutation({
    onSuccess: () => {
      toast.success("Recomendações PCMSO geradas com sucesso!");
      listQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao gerar recomendações");
    },
  });

  const recommendations = listQuery.data ?? [];

  const examResultsQuery = trpc.pcmsoIntegration.listExamResults.useQuery({ tenantId });
  const examResults = examResultsQuery.data ?? [];
  const utils = trpc.useUtils();
  const createExamMutation = trpc.pcmsoIntegration.createExamResult.useMutation({
    onSuccess: () => {
      toast.success("Resultado de exame registrado!");
      setExamDialogOpen(false);
      setExamForm({ employeeName: "", examType: "periodico", examDate: "", result: "apto", restrictions: "", observations: "", doctorName: "", doctorCrm: "", nextExamDate: "" });
      utils.pcmsoIntegration.listExamResults.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteExamMutation = trpc.pcmsoIntegration.deleteExamResult.useMutation({
    onSuccess: () => { toast.success("Registro removido!"); utils.pcmsoIntegration.listExamResults.invalidate(); },
  });

  function handleGenerate() {
    // Use the latest risk assessment ID if available; fall back to empty string
    const latestAssessment = (listQuery.data as any)?.[0];
    generateMutation.mutate({ tenantId: tenantId!, riskAssessmentId: latestAssessment?.riskAssessmentId || latestAssessment?.id || "" });
  }

  function handleEdit(item: any) {
    setEditItem({ ...item });
    setEditDialogOpen(true);
  }

  function handleDelete(id: string) {
    toast.info("Funcionalidade de exclusão em desenvolvimento.");
  }

  function handleSaveEdit() {
    toast.info("Funcionalidade de edição em desenvolvimento.");
    setEditDialogOpen(false);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Stethoscope className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Integração PGR / PCMSO</h1>
              <p className="text-muted-foreground">
                Recomendações médicas ocupacionais baseadas nos riscos psicossociais
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              disabled={isExporting || !tenantId}
              onClick={() => exportPdf(() => exportConsolidatedPgrMutation.mutateAsync({ tenantId: tenantId! }))}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? "Gerando..." : "PGR Consolidado"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting || !tenantId}
              onClick={() => exportPdf(() => exportPcmsoIntegrationMutation.mutateAsync({ tenantId: tenantId! }))}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? "Exportando..." : "Exportar PCMSO"}
            </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Gerar Recomendações PCMSO
          </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recomendações PCMSO
            </CardTitle>
          </CardHeader>
          <CardContent>
            {listQuery.isLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma recomendação encontrada</p>
                <p className="text-sm mt-1">
                  Clique em "Gerar Recomendações PCMSO" para criar recomendações baseadas nos riscos identificados.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Exame</TableHead>
                    <TableHead>Frequência</TableHead>
                    <TableHead>População-Alvo</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recommendations.map((rec: any) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-medium">{rec.examType}</TableCell>
                      <TableCell>{rec.frequency}</TableCell>
                      <TableCell>{rec.targetPopulation}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={PRIORITY_COLORS[rec.priority?.toLowerCase()] ?? ""}
                        >
                          {PRIORITY_LABELS[rec.priority?.toLowerCase()] ?? rec.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(rec)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rec.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Exam Results Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Resultados de Exames PCMSO
              </CardTitle>
              <Button size="sm" onClick={() => setExamDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Exame
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {examResultsQuery.isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : examResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Nenhum resultado de exame registrado</p>
                <p className="text-sm mt-1">Clique em "Registrar Exame" para adicionar resultados.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Médico</TableHead>
                    <TableHead>Próximo Exame</TableHead>
                    <TableHead className="text-right">A��ões</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examResults.map((exam: any) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">{exam.employeeName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {{ admissional: "Admissional", periodico: "Periódico", retorno: "Retorno", mudanca_funcao: "Mudança de Função", demissional: "Demissional" }[exam.examType as string] ?? exam.examType}
                        </Badge>
                      </TableCell>
                      <TableCell>{exam.examDate ? new Date(exam.examDate).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={exam.result === "apto" ? "bg-green-100 text-green-800" : exam.result === "inapto" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}>
                          {{ apto: "Apto", inapto: "Inapto", apto_restricao: "Apto c/ Restrição" }[exam.result as string] ?? exam.result}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{exam.doctorName || "—"}{exam.doctorCrm ? ` (CRM ${exam.doctorCrm})` : ""}</TableCell>
                      <TableCell>{exam.nextExamDate ? new Date(exam.nextExamDate).toLocaleDateString("pt-BR") : "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => deleteExamMutation.mutate({ id: exam.id })}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Exam Dialog */}
        <Dialog open={examDialogOpen} onOpenChange={setExamDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Resultado de Exame</DialogTitle>
              <DialogDescription>Registre o resultado de um exame médico ocupacional (ASO)</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nome do Colaborador *</Label>
                <Input value={examForm.employeeName} onChange={(e) => setExamForm(p => ({ ...p, employeeName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Tipo de Exame</Label>
                  <Select value={examForm.examType} onValueChange={(v) => setExamForm(p => ({ ...p, examType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admissional">Admissional</SelectItem>
                      <SelectItem value="periodico">Periódico</SelectItem>
                      <SelectItem value="retorno">Retorno ao Trabalho</SelectItem>
                      <SelectItem value="mudanca_funcao">Mudança de Função</SelectItem>
                      <SelectItem value="demissional">Demissional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Data do Exame *</Label>
                  <Input type="date" value={examForm.examDate} onChange={(e) => setExamForm(p => ({ ...p, examDate: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Resultado</Label>
                <Select value={examForm.result} onValueChange={(v) => setExamForm(p => ({ ...p, result: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apto">Apto</SelectItem>
                    <SelectItem value="inapto">Inapto</SelectItem>
                    <SelectItem value="apto_restricao">Apto com Restrição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Restrições</Label>
                <Textarea rows={2} placeholder="Descreva as restrições, se houver..." value={examForm.restrictions} onChange={(e) => setExamForm(p => ({ ...p, restrictions: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea rows={2} value={examForm.observations} onChange={(e) => setExamForm(p => ({ ...p, observations: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Médico Responsável</Label>
                  <Input value={examForm.doctorName} onChange={(e) => setExamForm(p => ({ ...p, doctorName: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>CRM</Label>
                  <Input value={examForm.doctorCrm} onChange={(e) => setExamForm(p => ({ ...p, doctorCrm: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Data do Próximo Exame</Label>
                <Input type="date" value={examForm.nextExamDate} onChange={(e) => setExamForm(p => ({ ...p, nextExamDate: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExamDialogOpen(false)}>Cancelar</Button>
              <Button
                disabled={createExamMutation.isPending || !examForm.employeeName.trim() || !examForm.examDate}
                onClick={() => createExamMutation.mutate({
                  employeeName: examForm.employeeName,
                  examType: examForm.examType as any,
                  examDate: new Date(examForm.examDate),
                  result: examForm.result as any,
                  restrictions: examForm.restrictions || undefined,
                  observations: examForm.observations || undefined,
                  doctorName: examForm.doctorName || undefined,
                  doctorCrm: examForm.doctorCrm || undefined,
                  nextExamDate: examForm.nextExamDate ? new Date(examForm.nextExamDate) : undefined,
                })}
              >
                {createExamMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Registrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Recomendação</DialogTitle>
            </DialogHeader>
            {editItem && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de Exame</Label>
                  <Input
                    value={editItem.examType ?? ""}
                    onChange={(e) =>
                      setEditItem({ ...editItem, examType: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Input
                    value={editItem.frequency ?? ""}
                    onChange={(e) =>
                      setEditItem({ ...editItem, frequency: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>População-Alvo</Label>
                  <Textarea
                    value={editItem.targetPopulation ?? ""}
                    onChange={(e) =>
                      setEditItem({ ...editItem, targetPopulation: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select
                    value={editItem.priority ?? ""}
                    onValueChange={(v) => setEditItem({ ...editItem, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveEdit}>Salvar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
