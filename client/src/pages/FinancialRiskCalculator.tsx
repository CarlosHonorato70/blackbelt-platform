import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  Calculator,
  DollarSign,
  Save,
  Loader2,
  AlertTriangle,
} from "lucide-react";

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function parseBRL(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

interface FinancialParams {
  averageSalary: number;
  headcount: number;
  replacementCost: number;
  dailyAbsenteeismCost: number;
  penaltyPerWorker: number;
  averageLitigationCost: number;
}

const INITIAL_PARAMS: FinancialParams = {
  averageSalary: 0,
  headcount: 0,
  replacementCost: 0,
  dailyAbsenteeismCost: 0,
  penaltyPerWorker: 0,
  averageLitigationCost: 0,
};

const BAR_COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function FinancialRiskCalculator() {
  usePageMeta({ title: "Calculadora de Risco Financeiro" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;

  const [params, setParams] = useState<FinancialParams>(INITIAL_PARAMS);

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

  const paramsQuery = trpc.financialCalculator.getParameters.useQuery({ tenantId });
  const calcQuery = trpc.financialCalculator.calculate.useQuery({ tenantId });
  const updateMutation = trpc.financialCalculator.updateParameters.useMutation({
    onSuccess: () => {
      toast.success("Parâmetros atualizados com sucesso!");
      paramsQuery.refetch();
      calcQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar parâmetros");
    },
  });

  useEffect(() => {
    if (paramsQuery.data) {
      setParams({
        averageSalary: paramsQuery.data.averageSalary ?? 0,
        headcount: paramsQuery.data.headcount ?? 0,
        replacementCost: paramsQuery.data.replacementCost ?? 0,
        dailyAbsenteeismCost: paramsQuery.data.dailyAbsenteeismCost ?? 0,
        penaltyPerWorker: paramsQuery.data.penaltyPerWorker ?? 0,
        averageLitigationCost: paramsQuery.data.averageLitigationCost ?? 0,
      });
    }
  }, [paramsQuery.data]);

  const results = calcQuery.data;

  const chartData = results
    ? [
        { name: "Absenteísmo", value: results.absenteeismCost ?? 0 },
        { name: "Turnover", value: results.turnoverCost ?? 0 },
        { name: "Multas NR-01", value: results.penaltyCost ?? 0 },
        { name: "Litígios", value: results.litigationCost ?? 0 },
      ]
    : [];

  const totalRisk = results?.totalRiskCost ?? 0;

  function handleSave() {
    updateMutation.mutate({ tenantId: tenantId!, ...params });
  }

  function updateParam(key: keyof FinancialParams, value: string) {
    setParams((prev) => ({ ...prev, [key]: parseBRL(value) }));
  }

  const paramFields = [
    { key: "averageSalary" as const, label: "Salário Médio" },
    { key: "headcount" as const, label: "Headcount" },
    { key: "replacementCost" as const, label: "Custo de Reposição" },
    { key: "dailyAbsenteeismCost" as const, label: "Custo Diário Absenteísmo" },
    { key: "penaltyPerWorker" as const, label: "Multa por Trabalhador" },
    { key: "averageLitigationCost" as const, label: "Custo Médio Litígio" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Calculator className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Calculadora de Risco Financeiro</h1>
            <p className="text-muted-foreground">
              Estime o impacto financeiro dos riscos psicossociais na sua organização
            </p>
          </div>
        </div>

        {paramsQuery.isLoading || calcQuery.isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Parameters Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Parâmetros Financeiros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paramFields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label>{field.label}</Label>
                    <div className="relative">
                      {field.key !== "headcount" && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          R$
                        </span>
                      )}
                      <Input
                        type="number"
                        className={field.key !== "headcount" ? "pl-10" : ""}
                        value={params[field.key] || ""}
                        onChange={(e) => updateParam(field.key, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="w-full mt-4"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Parâmetros
                </Button>
              </CardContent>
            </Card>

            {/* Right: Results */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Custo Anual Absenteísmo</p>
                    <p className="text-xl font-bold text-blue-600 mt-1">
                      {formatBRL(results?.absenteeismCost ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Custo Turnover</p>
                    <p className="text-xl font-bold text-yellow-600 mt-1">
                      {formatBRL(results?.turnoverCost ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Risco de Multas NR-01</p>
                    <p className="text-xl font-bold text-red-600 mt-1">
                      {formatBRL(results?.penaltyCost ?? 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Risco Litígios</p>
                    <p className="text-xl font-bold text-purple-600 mt-1">
                      {formatBRL(results?.litigationCost ?? 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Total Risk Card */}
              <Card className="border-2 border-primary bg-primary/5">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <AlertTriangle className="h-6 w-6 text-primary" />
                    <p className="text-sm font-semibold text-primary uppercase tracking-wide">
                      Custo Total de Risco
                    </p>
                  </div>
                  <p className="text-4xl font-bold text-primary">{formatBRL(totalRisk)}</p>
                  <p className="text-sm text-muted-foreground mt-2">Estimativa anual</p>
                </CardContent>
              </Card>

              {/* Bar Chart */}
              {chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Comparativo de Custos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value: number) => [formatBRL(value), "Custo"]}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {chartData.map((_, idx) => (
                            <Cell key={idx} fill={BAR_COLORS[idx]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
