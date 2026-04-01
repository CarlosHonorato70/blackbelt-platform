import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Grid3X3, AlertTriangle, Loader2, FileDown } from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";

const SEVERITY_LABELS = ["Baixa", "Média", "Alta", "Crítica"] as const;
const PROBABILITY_LABELS = ["Rara", "Improvável", "Possível", "Provável", "Certa"] as const;

const SEVERITY_KEYS = ["low", "medium", "high", "critical"] as const;
const PROBABILITY_KEYS = ["rare", "unlikely", "possible", "likely", "certain"] as const;

function getCellColor(severity: number, probability: number): string {
  const riskScore = (severity + 1) * (probability + 1);
  if (riskScore <= 4) return "bg-green-500/80 hover:bg-green-500";
  if (riskScore <= 8) return "bg-yellow-500/80 hover:bg-yellow-500";
  if (riskScore <= 12) return "bg-orange-500/80 hover:bg-orange-500";
  return "bg-red-500/80 hover:bg-red-500";
}

function getCellTextColor(severity: number, probability: number): string {
  const riskScore = (severity + 1) * (probability + 1);
  if (riskScore <= 4) return "text-green-950";
  if (riskScore <= 8) return "text-yellow-950";
  if (riskScore <= 12) return "text-orange-950";
  return "text-red-950";
}

interface RiskItem {
  id: string;
  name?: string;
  description?: string | null;
  severity: string;
  probability?: string;
  riskLevel?: string;
  riskFactorId?: string;
  hazardCode?: string | null;
}

export default function RiskMatrix() {
  usePageMeta({ title: "Matriz de Risco Psicossocial" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const { exportPdf, isExporting } = usePdfExport();

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [selectedCell, setSelectedCell] = useState<{ severity: number; probability: number } | null>(null);

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

  const exportRiskMatrixMutation = trpc.nr01Pdf.exportRiskMatrix.useMutation();

  const assessmentsQuery = trpc.riskAssessments.list.useQuery({ tenantId });
  const assessmentDetailQuery = trpc.riskAssessments.get.useQuery(
    { id: selectedAssessmentId, tenantId },
    { enabled: !!selectedAssessmentId }
  );

  const riskItems = (assessmentDetailQuery.data?.items ?? []) as RiskItem[];

  function countItems(severityIdx: number, probabilityIdx: number): number {
    return riskItems.filter(
      (item) =>
        item.severity === SEVERITY_KEYS[severityIdx] &&
        item.probability === PROBABILITY_KEYS[probabilityIdx]
    ).length;
  }

  function getItemsForCell(severityIdx: number, probabilityIdx: number): RiskItem[] {
    return riskItems.filter(
      (item) =>
        item.severity === SEVERITY_KEYS[severityIdx] &&
        item.probability === PROBABILITY_KEYS[probabilityIdx]
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Grid3X3 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Matriz de Risco Psicossocial</h1>
              <p className="text-muted-foreground">
                Visualize os riscos por severidade e probabilidade
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || !tenantId}
            onClick={() => exportPdf(() => exportRiskMatrixMutation.mutateAsync({ tenantId: tenantId! }))}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Selecionar Avaliação</CardTitle>
          </CardHeader>
          <CardContent>
            {assessmentsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando avaliações...
              </div>
            ) : (
              <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Selecione uma avaliação..." />
                </SelectTrigger>
                <SelectContent>
                  {(assessmentsQuery.data ?? []).map((assessment: any) => (
                    <SelectItem key={assessment.id} value={assessment.id}>
                      {assessment.name || assessment.title || `Avaliação ${assessment.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {selectedAssessmentId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Heatmap de Riscos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assessmentDetailQuery.isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Header row - probability labels */}
                    <div className="grid grid-cols-[120px_repeat(5,1fr)] gap-1 mb-1">
                      <div className="text-xs font-semibold text-muted-foreground text-center p-2">
                        Severidade / Probabilidade
                      </div>
                      {PROBABILITY_LABELS.map((label) => (
                        <div
                          key={label}
                          className="text-xs font-semibold text-center p-2 bg-muted rounded"
                        >
                          {label}
                        </div>
                      ))}
                    </div>

                    {/* Matrix rows - severity from critical (top) to low (bottom) */}
                    {[...SEVERITY_LABELS].reverse().map((severityLabel, reversedIdx) => {
                      const severityIdx = SEVERITY_LABELS.length - 1 - reversedIdx;
                      return (
                        <div
                          key={severityLabel}
                          className="grid grid-cols-[120px_repeat(5,1fr)] gap-1 mb-1"
                        >
                          <div className="text-xs font-semibold text-center p-2 bg-muted rounded flex items-center justify-center">
                            {severityLabel}
                          </div>
                          {PROBABILITY_LABELS.map((_, probIdx) => {
                            const count = countItems(severityIdx, probIdx);
                            return (
                              <button
                                key={probIdx}
                                onClick={() => {
                                  if (count > 0) {
                                    setSelectedCell({ severity: severityIdx, probability: probIdx });
                                  }
                                }}
                                className={`${getCellColor(severityIdx, probIdx)} ${getCellTextColor(severityIdx, probIdx)} rounded p-4 text-center transition-all cursor-pointer min-h-[60px] flex items-center justify-center`}
                              >
                                <span className="text-lg font-bold">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 text-xs">
                    <span className="font-semibold">Legenda:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-green-500" />
                      <span>Baixo</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-yellow-500" />
                      <span>Médio</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-orange-500" />
                      <span>Alto</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-red-500" />
                      <span>Crítico</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dialog showing items in selected cell */}
        <Dialog
          open={selectedCell !== null}
          onOpenChange={(open) => !open && setSelectedCell(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {selectedCell &&
                  `Riscos: ${SEVERITY_LABELS[selectedCell.severity]} / ${PROBABILITY_LABELS[selectedCell.probability]}`}
              </DialogTitle>
            </DialogHeader>
            {selectedCell && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {getItemsForCell(selectedCell.severity, selectedCell.probability).length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum item de risco nesta célula.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getItemsForCell(selectedCell.severity, selectedCell.probability).map(
                        (item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.description || "-"}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
