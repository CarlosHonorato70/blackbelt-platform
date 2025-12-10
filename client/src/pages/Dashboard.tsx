import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTenant } from "@/contexts/TenantContext";
import {
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
} from "lucide-react";

export default function Dashboard() {
  const { selectedTenant } = useTenant();

  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa para visualizar o dashboard
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const metrics = [
    {
      title: "Avaliações Realizadas",
      value: "2",
      description: "Neste mês",
      icon: CheckCircle2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Riscos Identificados",
      value: "8",
      description: "Últimas 30 dias",
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Taxa de Conformidade",
      value: "75%",
      description: "NR-01 Compliance",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Colaboradores Avaliados",
      value: "1",
      description: "Nesta empresa",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const risksByLevel = [
    { level: "Crítico", count: 1, percentage: 12.5, color: "bg-red-500" },
    { level: "Alto", count: 2, percentage: 25, color: "bg-orange-500" },
    { level: "Médio", count: 3, percentage: 37.5, color: "bg-yellow-500" },
    { level: "Baixo", count: 2, percentage: 25, color: "bg-green-500" },
  ];

  const risksByCategory = [
    { category: "Organizacionais", count: 3 },
    { category: "Carga de Trabalho", count: 2 },
    { category: "Relacionamento", count: 2 },
    { category: "Violência/Assédio", count: 1 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral de riscos psicossociais -{" "}
            {typeof selectedTenant === "string"
              ? selectedTenant
              : selectedTenant?.name}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(metric => {
            const Icon = metric.icon;
            return (
              <Card key={metric.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  <div className={`${metric.bgColor} p-2 rounded-lg`}>
                    <Icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Riscos por Nível</CardTitle>
              <CardDescription>
                Classificação dos riscos identificados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {risksByLevel.map(risk => (
                <div key={risk.level} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{risk.level}</span>
                    <span className="text-sm text-muted-foreground">
                      {risk.count} ({risk.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${risk.color}`}
                      style={{ width: `${risk.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Riscos por Categoria</CardTitle>
              <CardDescription>
                Conforme Guia de Fatores de Riscos Psicossociais (MTE)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {risksByCategory.map(risk => (
                  <div key={risk.category} className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{risk.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold">
                        {risk.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Indicadores de Saúde Mental</CardTitle>
            <CardDescription>
              Métricas de bem-estar e saúde ocupacional
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Satisfação Geral
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">6.8</span>
                  <span className="text-sm text-muted-foreground">/10</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  +0.5 vs mês anterior
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Clima Organizacional
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">7.2</span>
                  <span className="text-sm text-muted-foreground">/10</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  +0.3 vs mês anterior
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Qualidade de Vida
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold">6.5</span>
                  <span className="text-sm text-muted-foreground">/10</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  -0.2 vs mês anterior
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status de Conformidade NR-01</CardTitle>
            <CardDescription>
              Portaria MTE nº 1.419/2024 - Gestão de Riscos Psicossociais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    ✓ Avaliação de Riscos Realizada
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Completo
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    ⚠ Plano de Ação Implementado
                  </span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Parcial
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    ✓ Comunicação aos Colaboradores
                  </span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    Completo
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    ⚠ Monitoramento Contínuo
                  </span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                    Pendente
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    ✗ Documentação Completa
                  </span>
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                    Incompleto
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
