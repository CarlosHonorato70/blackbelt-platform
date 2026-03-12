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
} from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";

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
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const { exportPdf, isExporting } = usePdfExport();

  const [editItem, setEditItem] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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

  function handleGenerate() {
    generateMutation.mutate({ tenantId: tenantId! });
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
              variant="outline"
              size="sm"
              disabled={isExporting || !tenantId}
              onClick={() => exportPdf(() => trpc.nr01Pdf.exportPcmsoIntegration.mutate({ tenantId: tenantId! }))}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? "Exportando..." : "Exportar PDF"}
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
