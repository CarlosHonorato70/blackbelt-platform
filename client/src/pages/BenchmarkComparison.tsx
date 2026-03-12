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
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import { BarChart3, Loader2, Database, TrendingUp, TrendingDown } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DIMENSION_LABELS: Record<string, string> = {
  quantitative_demands: "Exigencias Quantitativas",
  work_pace: "Ritmo de Trabalho",
  cognitive_demands: "Exigencias Cognitivas",
  emotional_demands: "Exigencias Emocionais",
  influence_at_work: "Influencia no Trabalho",
  possibilities_development: "Possibilidades de Desenvolvimento",
  meaning_of_work: "Significado do Trabalho",
  commitment: "Comprometimento",
  predictability: "Previsibilidade",
  role_clarity: "Clareza de Papel",
  social_support: "Apoio Social",
  sense_of_community: "Senso de Comunidade",
};

export default function BenchmarkComparison() {
  usePageMeta({ title: "Benchmark Nacional" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;

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

  const { data: comparison, refetch, isLoading } = trpc.benchmark.getComparison.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const seedMutation = trpc.benchmark.seedBenchmarkData.useMutation({
    onSuccess: () => {
      toast.success("Dados de referencia nacional carregados com sucesso!");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao carregar dados de benchmark");
    },
  });

  const dimensions = comparison?.dimensions || [];

  const radarData = dimensions.map((d: any) => ({
    dimension: DIMENSION_LABELS[d.key] || d.key,
    empresa: d.companyScore ?? 0,
    benchmark: d.benchmarkScore ?? 0,
  }));

  const hasBenchmarkData = dimensions.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Comparacao com Benchmark Nacional COPSOQ-II</h1>
            <p className="text-muted-foreground">
              Compare os resultados da sua empresa com a referencia nacional
            </p>
          </div>
        </div>

        {!hasBenchmarkData && !isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sem dados de benchmark</h3>
              <p className="text-muted-foreground mb-6">
                Carregue os dados de referencia nacional para comparar com os resultados da sua empresa.
              </p>
              <Button onClick={() => seedMutation.mutate({ tenantId })} disabled={seedMutation.isPending}>
                {seedMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Carregar Dados de Referencia Nacional
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Grafico Radar - Empresa vs. Benchmark
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={500}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="Sua Empresa"
                      dataKey="empresa"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                    <Radar
                      name="Benchmark Nacional"
                      dataKey="benchmark"
                      stroke="#6b7280"
                      fill="#6b7280"
                      fillOpacity={0.15}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Dimensao</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dimensao</TableHead>
                      <TableHead className="text-right">Empresa</TableHead>
                      <TableHead className="text-right">Benchmark</TableHead>
                      <TableHead className="text-right">Diferenca</TableHead>
                      <TableHead className="text-right">Percentil</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dimensions.map((d: any) => {
                      const diff = (d.companyScore ?? 0) - (d.benchmarkScore ?? 0);
                      const isPositive = diff >= 0;
                      return (
                        <TableRow key={d.key}>
                          <TableCell className="font-medium">
                            {DIMENSION_LABELS[d.key] || d.key}
                          </TableCell>
                          <TableCell className="text-right">{d.companyScore?.toFixed(1) ?? "—"}</TableCell>
                          <TableCell className="text-right">{d.benchmarkScore?.toFixed(1) ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={d.percentile >= 50 ? "default" : "secondary"}>
                              P{d.percentile ?? 0}
                            </Badge>
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
