import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, BarChart3, CheckCircle2, Loader2, FileDown } from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function ClimateSurveyResults() {
  usePageMeta({ title: "Resultados da Pesquisa" });
  const { exportPdf, isExporting } = usePdfExport();
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const { id: surveyId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const exportClimateSurveyMutation = trpc.nr01Pdf.exportClimateSurvey.useMutation();

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

  if (!surveyId) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Pesquisa não encontrada.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const { data: results, isLoading } = trpc.climateSurveys.getResults.useQuery(
    { surveyId, tenantId },
    { enabled: !!surveyId && !!tenantId }
  );

  const totalResponses = results?.totalResponses ?? 0;
  const averageScore = results?.averageScore ?? 0;
  const completionRate = (results as any)?.completionRate ?? 0;
  const riskDistribution = (results as any)?.riskDistribution ?? { low: 0, medium: 0, high: 0, critical: 0 };
  const inviteStatus = (results as any)?.inviteStatus ?? { total: 0, sent: 0, completed: 0, expired: 0 };
  const responseDistribution = results?.responseDistribution ?? {};
  const questionAverages = Object.entries(responseDistribution).map(([label, val]: [string, any]) => ({
    label,
    average: val.average ?? 0,
    count: val.count ?? 0,
  }));
  const responseDistributionArray = questionAverages;

  const RISK_COLORS: Record<string, string> = { low: "#22c55e", medium: "#eab308", high: "#f97316", critical: "#ef4444" };
  const RISK_LABELS: Record<string, string> = { low: "Baixo", medium: "Médio", high: "Alto", critical: "Crítico" };
  const riskChartData = Object.entries(riskDistribution)
    .filter(([_, v]) => (v as number) > 0)
    .map(([key, value]) => ({ name: RISK_LABELS[key] || key, value: value as number, color: RISK_COLORS[key] || "#888" }));

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/climate-surveys")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Resultados da Pesquisa</h1>
              <p className="text-muted-foreground">
                Resultados
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || !tenantId || !surveyId}
            onClick={() => exportPdf(() => exportClimateSurveyMutation.mutateAsync({ tenantId: tenantId!, surveyId: surveyId! }))}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total de Respostas</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalResponses}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Media Geral</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageScore.toFixed(1)}</div>
                  <p className="text-xs text-muted-foreground">de 5.0</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Conclusao</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completionRate.toFixed(0)}%</div>
                </CardContent>
              </Card>
            </div>

            {questionAverages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Media por Pergunta</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={questionAverages.map((q: any, i: number) => ({
                        question: q.label || `P${i + 1}`,
                        media: q.average ?? 0,
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="question"
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis domain={[0, 5]} />
                      <Tooltip />
                      <Bar dataKey="media" name="Media" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Risk Distribution + Invite Status */}
            {totalResponses > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                {riskChartData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribuição por Nível de Risco</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={riskChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, value }) => `${name}: ${value}`}
                            outerRadius={100}
                            dataKey="value"
                          >
                            {riskChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Status dos Convites</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total de Convites</span>
                      <span className="font-bold">{inviteStatus.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Respondidos</span>
                      <span className="font-bold text-green-600">{inviteStatus.completed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pendentes</span>
                      <span className="font-bold text-yellow-600">{inviteStatus.sent}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Expirados</span>
                      <span className="font-bold text-red-600">{inviteStatus.expired}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full transition-all"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-center">{completionRate}% concluído</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {totalResponses === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sem respostas ainda</h3>
                  <p className="text-muted-foreground">
                    Aguardando respostas dos participantes para exibir os resultados.
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
