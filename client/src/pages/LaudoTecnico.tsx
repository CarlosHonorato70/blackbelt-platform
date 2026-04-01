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
import { Plus, FileText, Loader2, FileDown } from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  active: { label: "Ativo", variant: "default" },
  expired: { label: "Expirado", variant: "destructive" },
  archived: { label: "Arquivado", variant: "outline" },
};

export default function LaudoTecnico() {
  usePageMeta({ title: "Laudos Tecnicos" });
  const { exportPdf, isExporting } = usePdfExport();
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    professionalName: "",
    professionalRegistry: "",
    validFrom: "",
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

  const { data: allReports = [], refetch } = trpc.complianceReports.list.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const laudos = allReports.filter((r: any) => r.documentType === "laudo_tecnico");

  const createMutation = trpc.complianceReports.create.useMutation({
    onSuccess: () => {
      toast.success("Laudo tecnico criado com sucesso!");
      setDialogOpen(false);
      setForm({ title: "", description: "", professionalName: "", professionalRegistry: "", validFrom: "" });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar laudo tecnico");
    },
  });

  const exportLaudoTecnicoMutation = trpc.nr01Pdf.exportLaudoTecnico.useMutation();

  const handleCreate = () => {
    if (!form.title || !form.professionalName || !form.professionalRegistry) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }
    createMutation.mutate({
      tenantId,
      title: form.title,
      description: form.description,
      documentType: "laudo_tecnico",
      version: "1.0",
      signedBy: form.professionalName,
      validFrom: form.validFrom ? new Date(form.validFrom) : new Date(),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Laudos Tecnicos</h1>
            <p className="text-muted-foreground">
              Gerenciamento de laudos tecnicos de avaliacao psicossocial
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting || !tenantId}
              onClick={() => exportPdf(() => exportLaudoTecnicoMutation.mutateAsync({ tenantId: tenantId! }))}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? "Exportando..." : "Exportar PDF"}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Laudo
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Laudos Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {laudos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum laudo tecnico cadastrado ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {laudos.map((laudo: any) => {
                    const status = STATUS_CONFIG[laudo.status] || STATUS_CONFIG.draft;
                    return (
                      <TableRow key={laudo.id}>
                        <TableCell className="font-medium">{laudo.title}</TableCell>
                        <TableCell>{laudo.signedBy || "—"}</TableCell>
                        <TableCell>{laudo.professionalRegistry || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {laudo.createdAt
                            ? new Date(laudo.createdAt).toLocaleDateString("pt-BR")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Laudo Tecnico</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titulo *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Laudo de Avaliação Psicossocial"
                />
              </div>
              <div>
                <Label htmlFor="description">Descricao</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descricao detalhada do laudo..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="professionalName">Nome do Profissional *</Label>
                <Input
                  id="professionalName"
                  value={form.professionalName}
                  onChange={(e) => setForm({ ...form, professionalName: e.target.value })}
                  placeholder="Dr. Joao Silva"
                />
              </div>
              <div>
                <Label htmlFor="professionalRegistry">Registro Profissional (CRP/CRM) *</Label>
                <Input
                  id="professionalRegistry"
                  value={form.professionalRegistry}
                  onChange={(e) => setForm({ ...form, professionalRegistry: e.target.value })}
                  placeholder="CRP 06/12345"
                />
              </div>
              <div>
                <Label htmlFor="validFrom">Valido a partir de</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Laudo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
