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
  demands: "Demanda",
  control: "Controle",
  socialSupport: "Apoio Social",
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
  demands: "#ef4444",
  control: "#3b82f6",
  socialSupport: "#22c55e",
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
  const data = trendsQuery.data;

  const chartData = data ?? [];
  const assessments = data ?? [];

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
                      <TableHead>Score Geral</TableHead>
                      <TableHead>Variação</TableHead>
                      <TableHead>Tendência</TableHead>
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
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <span className="text-lg font-semibold">
                              {Math.round(assessment.overallScore ?? 0)}
                            </span>
                            <span className="text-muted-foreground text-sm"> / 100</span>
                          </TableCell>
                          <TableCell>
                            {idx === assessments.length - 1 ? (
                              <span className="text-muted-foreground">-</span>
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
