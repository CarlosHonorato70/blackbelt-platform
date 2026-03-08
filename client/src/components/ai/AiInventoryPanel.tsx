/**
 * AiInventoryPanel — Exibe inventario de riscos NR-01 gerado pela IA.
 *
 * Permite gerar novo inventario ou exibir itens existentes com:
 * - Tabela de riscos com codigo, perigo, severidade, probabilidade
 * - Badges coloridos por nivel de risco
 * - Contagem resumida por nivel
 */

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Loader2,
  CheckCircle2,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AiInventoryPanelProps {
  assessmentId: string;
  analysisReady: boolean;
  onInventoryGenerated?: () => void;
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const RISK_LABELS: Record<string, string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  critical: "Crítico",
};

const SEVERITY_LABELS: Record<string, string> = {
  low: "Leve",
  medium: "Moderada",
  high: "Grave",
  critical: "Gravíssima",
};

const PROBABILITY_LABELS: Record<string, string> = {
  rare: "Rara",
  unlikely: "Improvável",
  possible: "Possível",
  likely: "Provável",
  certain: "Certa",
};

export default function AiInventoryPanel({
  assessmentId,
  analysisReady,
  onInventoryGenerated,
}: AiInventoryPanelProps) {
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [sectorName, setSectorName] = useState("");
  const [workerCount, setWorkerCount] = useState("");

  const inventoryQuery = (trpc as any).ai.getInventory.useQuery(
    { assessmentId },
    { enabled: !!assessmentId }
  );

  const generateMutation = (trpc as any).ai.generateInventory.useMutation({
    onSuccess: (data: any) => {
      setInventoryData(data);
      inventoryQuery.refetch();
      toast.success("Inventário de riscos gerado com sucesso!", {
        description: `${data.inventoryItems?.length || 0} riscos identificados`,
      });
      onInventoryGenerated?.();
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar inventário: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      assessmentId,
      sectorName: sectorName || undefined,
      workerCount: workerCount ? parseInt(workerCount, 10) : undefined,
    });
  };

  // Dados do inventario (do state local ou da query)
  const items =
    inventoryData?.inventoryItems || inventoryQuery.data?.items || [];
  const hasInventory = items.length > 0;

  // Contagem por nivel de risco
  const riskCounts = items.reduce(
    (acc: Record<string, number>, item: any) => {
      const level = item.riskLevel || "medium";
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (!analysisReady) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-5 h-5" />
            Etapa 2: Inventário de Riscos
          </CardTitle>
          <CardDescription>
            Complete a Etapa 1 (Análise COPSOQ-II) antes de gerar o inventário
            de riscos.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!hasInventory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Etapa 2: Inventário de Riscos NR-01
          </CardTitle>
          <CardDescription>
            Gere automaticamente o Inventário de Riscos Ocupacionais
            Psicossociais conforme NR-01 item 1.5.7.1, baseado na análise
            COPSOQ-II.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sector-name">Setor / Departamento</Label>
              <Input
                id="sector-name"
                placeholder="Ex: Administrativo"
                value={sectorName}
                onChange={(e) => setSectorName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worker-count">Número de Trabalhadores</Label>
              <Input
                id="worker-count"
                type="number"
                placeholder="Ex: 50"
                value={workerCount}
                onChange={(e) => setWorkerCount(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando inventário...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Inventário via IA
              </>
            )}
          </Button>
          {generateMutation.isPending && (
            <p className="text-sm text-muted-foreground">
              A IA está mapeando perigos psicossociais conforme o catálogo NR-01
              (P1-P92)...
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Exibir inventario
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Etapa 2: Inventário de Riscos NR-01
            </CardTitle>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              <ClipboardList className="w-3 h-3 mr-1" />
              {items.length} riscos identificados
            </Badge>
          </div>
          <CardDescription>
            Inventário gerado conforme NR-01 item 1.5.7.1 — Riscos
            Psicossociais
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Resumo por nivel de risco */}
      <div className="grid grid-cols-4 gap-3">
        {(["critical", "high", "medium", "low"] as const).map((level) => (
          <Card key={level} className="p-3">
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={RISK_COLORS[level]}
              >
                {RISK_LABELS[level]}
              </Badge>
              <span className="text-2xl font-bold">
                {riskCounts[level] || 0}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabela de itens */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Código</TableHead>
                  <TableHead>Perigo</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead className="w-[100px]">Severidade</TableHead>
                  <TableHead className="w-[100px]">Probabilidade</TableHead>
                  <TableHead className="w-[100px]">Nível</TableHead>
                  <TableHead>Controles Atuais</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.hazardCode || `R${i + 1}`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.hazard || item.observations || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.risk || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          RISK_COLORS[item.severity] || RISK_COLORS.medium
                        }
                      >
                        {SEVERITY_LABELS[item.severity] || item.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs">
                        {PROBABILITY_LABELS[item.probability] ||
                          item.probability}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          RISK_COLORS[item.riskLevel] || RISK_COLORS.medium
                        }
                      >
                        {RISK_LABELS[item.riskLevel] || item.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {item.currentControls || "Nenhum identificado"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
