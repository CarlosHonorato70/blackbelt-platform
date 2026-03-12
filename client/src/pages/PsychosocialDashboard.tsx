import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Users,
  BarChart3,
  AlertTriangle,
  Activity,
  Loader2,
  FileDown,
} from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";

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

const DIMENSION_KEYS = Object.keys(DIMENSION_LABELS);

function getDimensionColor(score: number): string {
  if (score >= 66) return "bg-green-500";
  if (score >= 33) return "bg-yellow-500";
  return "bg-red-500";
}

function getDimensionTextColor(score: number): string {
  if (score >= 66) return "text-green-700";
  if (score >= 33) return "text-yellow-700";
  return "text-red-700";
}

function getDimensionBg(score: number): string {
  if (score >= 66) return "bg-green-50 border-green-200";
  if (score >= 33) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

export default function PsychosocialDashboard() {
  usePageMeta({ title: "Dashboard de Indicadores Psicossociais" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const { exportPdf, isExporting } = usePdfExport();

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

  const summaryQuery = trpc.psychosocialDashboard.getSummary.useQuery({ tenantId });
  const trendsQuery = trpc.psychosocialDashboard.getTrends.useQuery({ tenantId });

  const summary = summaryQuery.data;
  const trends = trendsQuery.data ?? [];

  const isLoading = summaryQuery.isLoading || trendsQuery.isLoading;

  // Build radar data from summary dimensions
  const radarData = DIMENSION_KEYS.map((key) => ({
    dimension: DIMENSION_LABELS[key],
    score: summary?.dimensions?.[key] ?? 0,
    fullMark: 100,
  }));

  // Build dimension scores for cards
  const dimensionScores = DIMENSION_KEYS.map((key) => ({
    key,
    label: DIMENSION_LABELS[key],
    score: summary?.dimensions?.[key] ?? 0,
  }));

  const summaryCards = [
    {
      title: "Total Respondentes",
      value: summary?.totalRespondents ?? 0,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Taxa de Resposta",
      value: summary?.responseRate ? `${Math.round(summary.responseRate)}%` : "0%",
      icon: BarChart3,
      color: "text-green-600",
    },
    {
      title: "Nível de Risco Geral",
      value: summary?.overallRiskLevel ?? "-",
      icon: AlertTriangle,
      color: "text-orange-600",
    },
    {
      title: "Dimensões Críticas",
      value: summary?.criticalDimensions ?? 0,
      icon: Activity,
      color: "text-red-600",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard de Indicadores Psicossociais</h1>
            <p className="text-muted-foreground">
              Visão geral dos resultados COPSOQ e indicadores de saúde organizacional
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || !tenantId}
            onClick={() => exportPdf(() => trpc.nr01Pdf.exportPsychosocialDashboard.mutate({ tenantId: tenantId! }))}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {summaryCards.map((card) => (
                <Card key={card.title}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{card.title}</p>
                        <p className="text-2xl font-bold mt-1">{card.value}</p>
                      </div>
                      <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Dimensões COPSOQ</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Trends Area Chart */}
            {trends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tendências por Dimensão</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      {DIMENSION_KEYS.slice(0, 6).map((key, idx) => {
                        const colors = [
                          "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4",
                        ];
                        return (
                          <Area
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={DIMENSION_LABELS[key]}
                            stroke={colors[idx]}
                            fill={colors[idx]}
                            fillOpacity={0.1}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Dimension Cards */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Scores por Dimensão</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {dimensionScores.map((dim) => (
                  <Card
                    key={dim.key}
                    className={`border ${getDimensionBg(dim.score)}`}
                  >
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-muted-foreground">{dim.label}</p>
                      <div className="flex items-end gap-2 mt-2">
                        <span className={`text-2xl font-bold ${getDimensionTextColor(dim.score)}`}>
                          {Math.round(dim.score)}
                        </span>
                        <span className="text-sm text-muted-foreground mb-0.5">/ 100</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                        <div
                          className={`h-2 rounded-full ${getDimensionColor(dim.score)}`}
                          style={{ width: `${Math.min(dim.score, 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
