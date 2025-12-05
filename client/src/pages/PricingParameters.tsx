import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PricingParameters() {
  const [formData, setFormData] = useState({
    monthlyFixedCost: 0,
    laborCost: 0,
    productiveHoursPerMonth: 160,
    defaultTaxRegime: "MEI" as "MEI" | "SN" | "LP" | "autonomous",
    riskAdjustment: 0,
    seniorityAdjustment: 0,
  });

  const { data: parameters, isLoading } = trpc.pricingParameters.get.useQuery();
  const updateMutation = trpc.pricingParameters.update.useMutation();

  useEffect(() => {
    if (parameters) {
      setFormData({
        monthlyFixedCost: parameters.monthlyFixedCost || 0,
        laborCost: parameters.laborCost || 0,
        productiveHoursPerMonth: parameters.productiveHoursPerMonth || 160,
        defaultTaxRegime: parameters.defaultTaxRegime || "MEI",
        riskAdjustment: parameters.riskAdjustment || 0,
        seniorityAdjustment: parameters.seniorityAdjustment || 0,
      });
    }
  }, [parameters]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(formData);
      toast.success("Parâmetros de precificação atualizados com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar parâmetros");
    }
  };

  const calculateHourlyRate = () => {
    const totalCost = formData.monthlyFixedCost + formData.laborCost;
    const hourlyRate = totalCost / formData.productiveHoursPerMonth;
    return hourlyRate.toFixed(2);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <p className="text-center text-gray-500">Carregando...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Parâmetros de Precificação</h1>
          <p className="text-gray-600">
            Configure os parâmetros para cálculo de propostas
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Custos Operacionais</CardTitle>
              <CardDescription>
                Configure os custos mensais da empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Custo Fixo Mensal (R$)
                </label>
                <Input
                  type="number"
                  value={formData.monthlyFixedCost}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      monthlyFixedCost: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Ex: 5000"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Custo de Mão de Obra Mensal (R$)
                </label>
                <Input
                  type="number"
                  value={formData.laborCost}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      laborCost: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Ex: 8000"
                />
              </div>

              <div>
                <label className="text-sm font-medium">
                  Horas Produtivas por Mês
                </label>
                <Input
                  type="number"
                  value={formData.productiveHoursPerMonth}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      productiveHoursPerMonth:
                        parseFloat(e.target.value) || 160,
                    })
                  }
                  placeholder="Ex: 160"
                />
              </div>

              <div className="bg-blue-50 p-4 rounded">
                <p className="text-sm text-gray-600">Valor da Hora Técnica</p>
                <p className="text-2xl font-bold text-blue-600">
                  R$ {calculateHourlyRate()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configurações Tributárias</CardTitle>
              <CardDescription>
                Configure regime tributário e ajustes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  Regime Tributário Padrão
                </label>
                <select
                  value={formData.defaultTaxRegime}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      defaultTaxRegime: e.target.value as
                        | "MEI"
                        | "SN"
                        | "LP"
                        | "autonomous",
                    })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="MEI">
                    MEI (Microempreendedor Individual)
                  </option>
                  <option value="SN">SN (Simples Nacional)</option>
                  <option value="LP">LP (Lucro Presumido)</option>
                  <option value="autonomous">Autônomo</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Ajuste de Risco (%)
                </label>
                <Input
                  type="number"
                  value={formData.riskAdjustment}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      riskAdjustment: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentual adicional para projetos com maior risco
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Ajuste de Senioridade (%)
                </label>
                <Input
                  type="number"
                  value={formData.seniorityAdjustment}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      seniorityAdjustment: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Ex: 15"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Percentual adicional para consultores sênior
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo de Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Custo Fixo Mensal:</span>
              <span className="font-medium">
                R$ {formData.monthlyFixedCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Custo de MO Mensal:</span>
              <span className="font-medium">
                R$ {formData.laborCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Custo Total Mensal:</span>
              <span className="font-medium">
                R$ {(formData.monthlyFixedCost + formData.laborCost).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Valor da Hora Técnica:</span>
              <span className="font-bold text-lg">
                R$ {calculateHourlyRate()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} size="lg" className="w-full">
          Salvar Parâmetros
        </Button>
      </div>
    </DashboardLayout>
  );
}
