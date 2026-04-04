import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  History,
  FileDown,
  ArrowLeft,
} from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useNavigate } from "react-router-dom";

const DIMENSION_LABELS: Record<string, string> = {
  demand: "Demanda",
  control: "Controle",
  support: "Apoio Social",
  leadership: "Liderança",
  community: "Comunidade",
  meaning: "Significado",
  trust: "Confiança",
  justice: "Justiça",
  insecurity: "Insegurança",
  mentalHealth: "Saúde Mental",
  burnout: "Burnout",
  violence: "Violência",
};

const DIMENSION_COLORS: Record<string, string> = {
  demand: "#ef4444",
  control: "#3b82f6",
  support: "#22c55e",
  leadership: "#f59e0b",
  community: "#8b5cf6",
  meaning: "#06b6d4",
  trust: "#ec4899",
  justice: "#14b8a6",
  insecurity: "#f97316",
  mentalHealth: "#6366f1",
  burnout: "#dc2626",
  violence: "#78716c",
};

// Higher is worse for these dimensions (reversed)
const NEGATIVE_DIMENSIONS = new Set(["demand", "insecurity", "burnout", "violence"]);

export default function AssessmentTrends() {
  usePageMeta({ title: "Histórico e Tendências" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const navigate = useNavigate();
  const { exportPdf, isExporting } = usePdfExport();
  const exportAssessmentTrendsMutation = trpc.nr01Pdf.exportAssessmentTrends.useMutation();

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

  const trendsQuery = trpc.psychosocialDashboard.getHistoricalTrends.useQuery({ tenantId });
  const rawData = trendsQuery.data ?? [];

  // Transform backend data for chart (flatten dimensions to root keys + add date)
  const chartData = rawData.map((item: any) => ({
    date: item.generatedAt ? new Date(item.generatedAt).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }) : "—",
    ...item.dimensions,
  }));

  // Compute overall score and delta per assessment
  const assessments = rawData.map((item: any, idx: number) => {
    const dims = item.dimensions || {};
    const dimValues = Object.values(dims).filter((v): v is number => v !== null && v !== undefined);
    const overallScore = dimValues.length > 0 ? Math.round(dimValues.reduce((a: number, b: number) => a + b, 0) / dimValues.length) : 0;

    // Average delta across all dimensions
    const deltaValues = Object.values(item.deltas || {}).filter((v): v is number => v !== null);
    const avgDelta = deltaValues.length > 0 ? deltaValues.reduce((a: number, b: number) => a + b, 0) / deltaValues.length : 0;

    // Find top improved and declined dimensions
    const dimDeltas = Object.entries(item.deltas || {})
      .filter(([_, v]) => v !== null)
      .map(([key, value]) => {
        const shortKey = key.replace("average", "").replace("Score", "");
        const dimKey = shortKey.charAt(0).toLowerCase() + shortKey.slice(1);
        return { dimKey, delta: value as number };
      })
      .sort((a, b) => b.delta - a.delta);

    const topImproved = dimDeltas.filter(d => d.delta > 2).slice(0, 2);
    const topDeclined = dimDeltas.filter(d => d.delta < -2).slice(0, 2);

    return {
      id: item.reportId,
      date: item.generatedAt,
      title: item.title,
      totalRespondents: item.totalRespondents,
      overallScore,
      delta: avgDelta,
      topImproved,
      topDeclined,
    };
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <History className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Histórico e Tendências</h1>
              <p className="text-muted-foreground">
                Acompanhe a evolução dos indicadores psicossociais ao longo do tempo
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || !tenantId}
            onClick={() => exportPdf(() => exportAssessmentTrendsMutation.mutateAsync({ tenantId: tenantId! }))}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>

        {trendsQuery.isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum dado histórico disponível</p>
              <p className="text-sm mt-1">
                Realize avaliações para começar a visualizar tendências.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução das Dimensões</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    {Object.keys(DIMENSION_LABELS).map((key) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={DIMENSION_LABELS[key]}
                        stroke={DIMENSION_COLORS[key]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Assessment History Table */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Avaliações</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Respondentes</TableHead>
                      <TableHead>Score Geral</TableHead>
                      <TableHead>Variação</TableHead>
                      <TableHead>Tendência</TableHead>
                      <TableHead>Destaques</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assessments.map((assessment: any, idx: number) => {
                      const delta = assessment.delta ?? 0;
                      const trend =
                        delta > 1
                          ? "improvement"
                          : delta < -1
                          ? "decline"
                          : "stable";

                      return (
                        <TableRow key={assessment.id ?? idx}>
                          <TableCell className="font-medium">
                            {assessment.date
                              ? new Date(assessment.date).toLocaleDateString("pt-BR")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {assessment.totalRespondents ?? "—"}
                          </TableCell>
                          <TableCell>
                            <span className="text-lg font-semibold">
                              {Math.round(assessment.overallScore ?? 0)}
                            </span>
                            <span className="text-muted-foreground text-sm"> / 100</span>
                          </TableCell>
                          <TableCell>
                            {idx === 0 ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <span
                                className={
                                  delta > 0
                                    ? "text-green-600 font-medium"
                                    : delta < 0
                                    ? "text-red-600 font-medium"
                                    : "text-muted-foreground"
                                }
                              >
                                {delta > 0 ? "+" : ""}
                                {delta.toFixed(1)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {trend === "improvement" ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                Melhora
                              </Badge>
                            ) : trend === "decline" ? (
                              <Badge className="bg-red-100 text-red-800 border-red-200" variant="outline">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                Declínio
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-800 border-gray-200" variant="outline">
                                <Minus className="h-3 w-3 mr-1" />
                                Estável
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {assessment.topImproved?.map((d: any) => (
                                <Badge key={d.dimKey} variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                  {DIMENSION_LABELS[d.dimKey] || d.dimKey} +{d.delta.toFixed(0)}
                                </Badge>
                              ))}
                              {assessment.topDeclined?.map((d: any) => (
                                <Badge key={d.dimKey} variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">
                                  <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                                  {DIMENSION_LABELS[d.dimKey] || d.dimKey} {d.delta.toFixed(0)}
                                </Badge>
                              ))}
                              {!assessment.topImproved?.length && !assessment.topDeclined?.length && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
