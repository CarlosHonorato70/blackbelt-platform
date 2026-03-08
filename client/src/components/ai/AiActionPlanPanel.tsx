/**
 * AiActionPlanPanel — Exibe plano de acao NR-01 gerado pela IA.
 *
 * Permite gerar novo plano ou exibir acoes existentes com:
 * - Cards por acao com tipo, prioridade, prazo, responsavel
 * - Cronograma mensal visual (12 colunas)
 * - KPIs e impacto esperado
 * - Acoes gerais obrigatorias
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  Loader2,
  CheckCircle2,
  Sparkles,
  Calendar,
  Target,
  Check,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface AiActionPlanPanelProps {
  assessmentId: string;
  inventoryReady: boolean;
  onPlanGenerated?: () => void;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  elimination: "Eliminação",
  substitution: "Substituição",
  engineering: "Engenharia",
  administrative: "Administrativa",
  ppe: "EPI",
};

const ACTION_TYPE_COLORS: Record<string, string> = {
  elimination: "bg-green-100 text-green-800 border-green-200",
  substitution: "bg-teal-100 text-teal-800 border-teal-200",
  engineering: "bg-blue-100 text-blue-800 border-blue-200",
  administrative: "bg-purple-100 text-purple-800 border-purple-200",
  ppe: "bg-gray-100 text-gray-800 border-gray-200",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export default function AiActionPlanPanel({
  assessmentId,
  inventoryReady,
  onPlanGenerated,
}: AiActionPlanPanelProps) {
  const [planData, setPlanData] = useState<any>(null);
  const [sectorName, setSectorName] = useState("");

  const planQuery = (trpc as any).ai.getPlan.useQuery(
    { assessmentId },
    { enabled: !!assessmentId }
  );

  const generateMutation = (trpc as any).ai.generatePlan.useMutation({
    onSuccess: (data: any) => {
      setPlanData(data);
      planQuery.refetch();
      toast.success("Plano de ação gerado com sucesso!", {
        description: `${data.actions?.length || 0} ações de mitigação criadas`,
      });
      onPlanGenerated?.();
    },
    onError: (error: any) => {
      toast.error(`Erro ao gerar plano: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate({
      assessmentId,
      sectorName: sectorName || undefined,
    });
  };

  // Dados do plano (do state local ou da query)
  const actions = planData?.actions || planQuery.data?.actions || [];
  const generalActions = planData?.generalActions || [];
  const monitoringStrategy = planData?.monitoringStrategy || "";
  const hasPlan = actions.length > 0;

  // Contagem por prioridade
  const priorityCounts = actions.reduce(
    (acc: Record<string, number>, action: any) => {
      const p = action.priority || "medium";
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (!inventoryReady) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="w-5 h-5" />
            Etapa 3: Plano de Ação
          </CardTitle>
          <CardDescription>
            Complete a Etapa 2 (Inventário de Riscos) antes de gerar o plano de
            ação.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!hasPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" />
            Etapa 3: Plano de Ação NR-01
          </CardTitle>
          <CardDescription>
            Gere automaticamente o Plano de Ação para mitigação dos riscos
            psicossociais identificados, conforme NR-01 item 1.5.5.2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plan-sector">Setor / Departamento</Label>
            <Input
              id="plan-sector"
              placeholder="Ex: Administrativo"
              value={sectorName}
              onChange={(e) => setSectorName(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando plano de ação...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar Plano de Ação via IA
              </>
            )}
          </Button>
          {generateMutation.isPending && (
            <p className="text-sm text-muted-foreground">
              A IA está elaborando medidas de controle baseadas na hierarquia
              NR-01 (eliminação → coletiva → administrativa → EPI)...
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Exibir plano
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Etapa 3: Plano de Ação NR-01
            </CardTitle>
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700"
            >
              <ClipboardList className="w-3 h-3 mr-1" />
              {actions.length} ações
            </Badge>
          </div>
          <CardDescription>
            Plano gerado conforme NR-01 item 1.5.5.2 — Medidas de Prevenção
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Resumo por prioridade */}
      <div className="grid grid-cols-4 gap-3">
        {(["urgent", "high", "medium", "low"] as const).map((p) => (
          <Card key={p} className="p-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={PRIORITY_COLORS[p]}>
                {PRIORITY_LABELS[p]}
              </Badge>
              <span className="text-2xl font-bold">
                {priorityCounts[p] || 0}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabela de acoes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            Ações Específicas de Mitigação
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risco Identificado</TableHead>
                  <TableHead>Medida de Controle</TableHead>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead className="w-[90px]">Prioridade</TableHead>
                  <TableHead className="w-[120px]">Responsável</TableHead>
                  <TableHead className="w-[90px]">Prazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.map((action: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm max-w-[200px]">
                      {action.title || action.riskIdentified || "—"}
                    </TableCell>
                    <TableCell className="text-sm max-w-[250px]">
                      {action.description || action.controlMeasure || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          ACTION_TYPE_COLORS[action.actionType] ||
                          ACTION_TYPE_COLORS.administrative
                        }
                      >
                        {ACTION_TYPE_LABELS[action.actionType] ||
                          action.actionType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          PRIORITY_COLORS[action.priority] ||
                          PRIORITY_COLORS.medium
                        }
                      >
                        {PRIORITY_LABELS[action.priority] || action.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {action.responsibleRole || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {action.deadline
                        ? new Date(action.deadline).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cronograma Mensal */}
      {actions.some((a: any) => a.monthlySchedule) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Cronograma Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Ação</TableHead>
                    {MONTHS.map((m) => (
                      <TableHead
                        key={m}
                        className="text-center w-[45px] text-xs"
                      >
                        {m}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions
                    .filter((a: any) => a.monthlySchedule)
                    .map((action: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">
                          {action.title || action.riskIdentified || `Ação ${i + 1}`}
                        </TableCell>
                        {(action.monthlySchedule || []).map(
                          (active: boolean, mi: number) => (
                            <TableCell key={mi} className="text-center p-1">
                              {active ? (
                                <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </TableCell>
                          )
                        )}
                        {/* Pad if monthlySchedule has less than 12 items */}
                        {Array.from({
                          length: Math.max(
                            0,
                            12 - (action.monthlySchedule?.length || 0)
                          ),
                        }).map((_, pi) => (
                          <TableCell key={`pad-${pi}`} className="text-center p-1">
                            <span className="text-gray-300">—</span>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs e Impacto */}
      {actions.some((a: any) => a.kpiIndicator || a.expectedImpact) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              KPIs e Impacto Esperado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {actions
              .filter((a: any) => a.kpiIndicator || a.expectedImpact)
              .map((action: any, i: number) => (
                <div key={i} className="border rounded-lg p-3">
                  <p className="text-sm font-medium">
                    {action.title || action.riskIdentified || `Ação ${i + 1}`}
                  </p>
                  {action.kpiIndicator && (
                    <p className="text-xs text-blue-700 mt-1">
                      KPI: {action.kpiIndicator}
                    </p>
                  )}
                  {action.expectedImpact && (
                    <p className="text-xs text-green-700 mt-1">
                      Impacto: {action.expectedImpact}
                    </p>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Acoes Gerais */}
      {generalActions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Ações Gerais Obrigatórias
            </CardTitle>
            <CardDescription>
              Medidas organizacionais de aplicação contínua
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {generalActions.map((ga: any, i: number) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{ga.title}</span>
                  <Badge variant="secondary" className="text-xs">
                    {ga.frequency}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {ga.description}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Responsável: {ga.responsibleRole}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Estrategia de Monitoramento */}
      {monitoringStrategy && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Estratégia de Monitoramento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{monitoringStrategy}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
