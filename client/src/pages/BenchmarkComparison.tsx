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
import { BarChart3, Loader2, Database, TrendingUp, TrendingDown, FileDown } from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";
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
  demand: "Demanda de Trabalho",
  control: "Controle",
  support: "Apoio Social",
  leadership: "Liderança",
  community: "Comunidade",
  meaning: "Significado do Trabalho",
  trust: "Confiança",
  justice: "Justiça",
  insecurity: "Insegurança",
  mentalHealth: "Saúde Mental",
  burnout: "Burnout",
  violence: "Violência e Assédio",
};

export default function BenchmarkComparison() {
  usePageMeta({ title: "Benchmark Comparativo" });
  const { exportPdf, isExporting } = usePdfExport();
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const [selectedSector, setSelectedSector] = useState<string>("");
  const exportBenchmarkMutation = trpc.nr01Pdf.exportBenchmark.useMutation();

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

  const benchmarksQuery = trpc.benchmark.listBenchmarks.useQuery({});
  const sectorBenchmarks = (benchmarksQuery.data ?? []).filter((b: any) => b.dataSource === "sector");

  const { data: comparison, refetch, isLoading } = trpc.benchmark.getComparison.useQuery(
    { tenantId, ...(selectedSector ? { sectorCode: selectedSector } : {}) },
    { enabled: !!tenantId }
  );

  const seedMutation = trpc.benchmark.seedBenchmarkData.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Dados de benchmark carregados! ${data.total || 9} registros.`);
      benchmarksQuery.refetch();
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao carregar dados de benchmark");
    },
  });

  // Build dimensions array from company + benchmark objects
  const dimensionKeys = Object.keys(DIMENSION_LABELS);
  const company = comparison?.company;
  const benchmark = comparison?.benchmark;
  const hasBenchmarkData = !!company && !!benchmark;

  const radarData = dimensionKeys.map((key) => ({
    dimension: DIMENSION_LABELS[key],
    empresa: (company as any)?.[key] ?? 0,
    benchmark: (benchmark as any)?.[key] ?? 0,
  }));

  const benchmarkLabel = selectedSector
    ? sectorBenchmarks.find((b: any) => b.sectorCode === selectedSector)?.sectorName || "Setor"
    : "Média Nacional";

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Benchmark Comparativo COPSOQ-II</h1>
            <p className="text-muted-foreground">
              Compare os resultados da sua empresa com referências nacionais e setoriais
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || !tenantId}
            onClick={() => exportPdf(() => exportBenchmarkMutation.mutateAsync({ tenantId: tenantId! }))}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>

        {!hasBenchmarkData && !isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sem dados de benchmark</h3>
              <p className="text-muted-foreground mb-6">
                Carregue os dados de referência nacional e setorial para comparar com os resultados da sua empresa.
              </p>
              <Button onClick={() => seedMutation.mutate({})} disabled={seedMutation.isPending}>
                {seedMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Carregar Dados de Referência (Nacional + 8 Setores)
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Sector selector */}
            {sectorBenchmarks.length > 0 && (
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium whitespace-nowrap">Comparar com:</span>
                    <Select value={selectedSector} onValueChange={(v) => setSelectedSector(v === "__national__" ? "" : v)}>
                      <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Média Nacional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__national__">Média Nacional (n=5.000)</SelectItem>
                        {sectorBenchmarks.map((b: any) => (
                          <SelectItem key={b.sectorCode} value={b.sectorCode}>
                            {b.sectorName} (n={b.sampleSize?.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {comparison?.sampleSize ? (
                      <Badge variant="secondary" className="whitespace-nowrap">
                        Amostra: {comparison.sampleSize.toLocaleString()} respondentes
                      </Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Gráfico Radar — Empresa vs. {benchmarkLabel}
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
                      name={benchmarkLabel}
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
                <CardTitle>Detalhamento por Dimensão</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dimensão</TableHead>
                      <TableHead className="text-right">Empresa</TableHead>
                      <TableHead className="text-right">{benchmarkLabel}</TableHead>
                      <TableHead className="text-right">Diferença</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dimensionKeys.map((key) => {
                      const companyScore = (company as any)?.[key] ?? 0;
                      const benchmarkScore = (benchmark as any)?.[key] ?? 0;
                      const diff = companyScore - benchmarkScore;
                      const isPositive = diff >= 0;
                      return (
                        <TableRow key={key}>
                          <TableCell className="font-medium">
                            {DIMENSION_LABELS[key]}
                          </TableCell>
                          <TableCell className="text-right">{companyScore}</TableCell>
                          <TableCell className="text-right">{benchmarkScore}</TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              {diff > 0 ? "+" : ""}{diff}
                            </span>
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
