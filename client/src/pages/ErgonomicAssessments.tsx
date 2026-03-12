import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Loader2,
  Plus,
  Activity,
} from "lucide-react";

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

export default function ErgonomicAssessments() {
  usePageMeta({ title: "Avaliações Ergonômicas" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    assessorName: "",
    assessmentDate: "",
    methodology: "",
  });

  const listQuery = trpc.ergonomicAssessments.list.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId }
  );

  const createMutation = trpc.ergonomicAssessments.create.useMutation({
    onSuccess: () => {
      toast.success("Avaliação ergonômica criada com sucesso!");
      setCreateOpen(false);
      setFormData({ title: "", assessorName: "", assessmentDate: "", methodology: "" });
      listQuery.refetch();
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

  const handleCreate = () => {
    if (!formData.title || !formData.assessorName || !formData.assessmentDate) {
      toast.error("Preencha os campos obrigatórios.");
      return;
    }
    createMutation.mutate({
      tenantId: tenantId!,
      title: formData.title,
      assessorName: formData.assessorName,
      assessmentDate: formData.assessmentDate,
      methodology: formData.methodology || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Avaliações Ergonômicas
            </h1>
            <p className="text-muted-foreground">
              Gerencie avaliações ergonômicas dos postos de trabalho
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Avaliação
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Avaliações</CardTitle>
            <CardDescription>Clique em uma avaliação para ver detalhes</CardDescription>
          </CardHeader>
          <CardContent>
            {listQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !listQuery.data || (listQuery.data as any[]).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhuma avaliação ergonômica encontrada.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Avaliador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Nível de Risco</TableHead>
                    <TableHead>Itens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(listQuery.data as any[]).map((assessment: any) => {
                    const statusCfg = STATUS_CONFIG[assessment.status] || STATUS_CONFIG.draft;
                    const riskCfg = RISK_LEVEL_CONFIG[assessment.overallRiskLevel] || RISK_LEVEL_CONFIG.acceptable;
                    return (
                      <TableRow
                        key={assessment.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/ergonomic-assessments/${assessment.id}`)}
                      >
                        <TableCell className="font-medium">{assessment.title}</TableCell>
                        <TableCell>{assessment.assessorName}</TableCell>
                        <TableCell>
                          {new Date(assessment.assessmentDate).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={riskCfg.className}>{riskCfg.label}</Badge>
                        </TableCell>
                        <TableCell>{assessment.itemCount ?? 0}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Avaliação Ergonômica</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Avaliação Setor Administrativo"
                />
              </div>
              <div>
                <Label htmlFor="assessor">Avaliador *</Label>
                <Input
                  id="assessor"
                  value={formData.assessorName}
                  onChange={(e) => setFormData({ ...formData, assessorName: e.target.value })}
                  placeholder="Nome do avaliador"
                />
              </div>
              <div>
                <Label htmlFor="date">Data da Avaliação *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.assessmentDate}
                  onChange={(e) => setFormData({ ...formData, assessmentDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="methodology">Metodologia</Label>
                <Textarea
                  id="methodology"
                  value={formData.methodology}
                  onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                  placeholder="Descreva a metodologia utilizada"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Avaliação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
