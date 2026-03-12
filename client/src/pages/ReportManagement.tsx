import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import {
  ShieldAlert,
  Loader2,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  harassment: "Assedio",
  discrimination: "Discriminacao",
  violence: "Violencia",
  workload: "Sobrecarga",
  leadership: "Lideranca",
  other: "Outro",
};

const STATUS_LABELS: Record<string, string> = {
  received: "Recebida",
  investigating: "Em Investigacao",
  resolved: "Resolvida",
  dismissed: "Arquivada",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  received: "secondary",
  investigating: "default",
  resolved: "outline",
  dismissed: "destructive",
};

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "secondary",
  medium: "outline",
  high: "default",
  critical: "destructive",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta",
  critical: "Critica",
};

export default function ReportManagement() {
  usePageMeta({ title: "Gestao de Denuncias" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;

  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [detailForm, setDetailForm] = useState({
    status: "",
    resolution: "",
    assignedTo: "",
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

  const { data: reports = [], refetch } = trpc.anonymousReports.list.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const { data: stats } = trpc.anonymousReports.getStats.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const updateMutation = trpc.anonymousReports.update.useMutation({
    onSuccess: () => {
      toast.success("Denuncia atualizada com sucesso!");
      setSelectedReport(null);
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar denuncia");
    },
  });

  const handleOpenDetail = (report: any) => {
    setSelectedReport(report);
    setDetailForm({
      status: report.status || "received",
      resolution: report.resolution || "",
      assignedTo: report.assignedTo || "",
    });
  };

  const handleUpdate = () => {
    if (!selectedReport) return;
    updateMutation.mutate({
      id: selectedReport.id,
      tenantId,
      status: detailForm.status,
      resolution: detailForm.resolution || undefined,
      assignedTo: detailForm.assignedTo || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestao de Denuncias</h1>
          <p className="text-muted-foreground">
            Acompanhe e gerencie denuncias do canal anonimo
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Denuncias</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total ?? reports.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Em Investigacao</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.investigating ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Resolvidas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.resolved ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Por Severidade</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {stats?.bySeverity ? (
                  Object.entries(stats.bySeverity).map(([key, count]: [string, any]) => (
                    <Badge key={key} variant={SEVERITY_VARIANT[key] || "secondary"}>
                      {SEVERITY_LABELS[key] || key}: {count}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Denuncias Registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma denuncia registrada ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Codigo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Responsavel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report: any) => (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleOpenDetail(report)}
                    >
                      <TableCell className="font-mono font-medium">
                        {report.reportCode}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {CATEGORY_LABELS[report.category] || report.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={SEVERITY_VARIANT[report.severity] || "secondary"}>
                          {SEVERITY_LABELS[report.severity] || report.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[report.status] || "secondary"}>
                          {STATUS_LABELS[report.status] || report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {report.createdAt
                          ? new Date(report.createdAt).toLocaleDateString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell>{report.assignedTo || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Denuncia {selectedReport?.reportCode}
              </DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {CATEGORY_LABELS[selectedReport.category] || selectedReport.category}
                  </Badge>
                  <Badge variant={SEVERITY_VARIANT[selectedReport.severity] || "secondary"}>
                    {SEVERITY_LABELS[selectedReport.severity] || selectedReport.severity}
                  </Badge>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Descricao</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {selectedReport.description}
                  </div>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select
                    value={detailForm.status}
                    onValueChange={(v) => setDetailForm({ ...detailForm, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="received">Recebida</SelectItem>
                      <SelectItem value="investigating">Em Investigacao</SelectItem>
                      <SelectItem value="resolved">Resolvida</SelectItem>
                      <SelectItem value="dismissed">Arquivada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignedTo">Responsavel</Label>
                  <Input
                    id="assignedTo"
                    value={detailForm.assignedTo}
                    onChange={(e) => setDetailForm({ ...detailForm, assignedTo: e.target.value })}
                    placeholder="Nome do responsavel"
                  />
                </div>

                <div>
                  <Label htmlFor="resolution">Resolucao</Label>
                  <Textarea
                    id="resolution"
                    value={detailForm.resolution}
                    onChange={(e) => setDetailForm({ ...detailForm, resolution: e.target.value })}
                    placeholder="Descreva as acoes tomadas e a resolucao..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedReport(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Atualizar Denuncia
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
