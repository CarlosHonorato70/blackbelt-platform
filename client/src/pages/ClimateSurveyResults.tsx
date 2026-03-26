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
} from "recharts";

export default function ClimateSurveyResults() {
  usePageMeta({ title: "Resultados da Pesquisa" });
  const { exportPdf, isExporting } = usePdfExport();
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const { id: surveyId } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
  const completionRate = results?.completionRate ?? 0;
  const questionAverages = results?.questionAverages ?? [];
  const responseDistribution = results?.responseDistribution ?? [];

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
                {results?.surveyTitle || "Carregando..."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || !tenantId || !surveyId}
            onClick={() => exportPdf(() => trpc.nr01Pdf.exportClimateSurvey.mutate({ tenantId: tenantId!, surveyId: surveyId! }))}
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

            {responseDistribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribuicao de Respostas</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={responseDistribution}
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
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="score1" name="1 - Muito Ruim" fill="#ef4444" stackId="a" />
                      <Bar dataKey="score2" name="2 - Ruim" fill="#f97316" stackId="a" />
                      <Bar dataKey="score3" name="3 - Regular" fill="#eab308" stackId="a" />
                      <Bar dataKey="score4" name="4 - Bom" fill="#22c55e" stackId="a" />
                      <Bar dataKey="score5" name="5 - Excelente" fill="#3b82f6" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
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
