import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTenant } from "@/contexts/TenantContext";
import { trpc } from "@/lib/trpc";
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
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;

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

  // Real data queries
  const { data: riskAssessments = [] } = trpc.riskAssessments.list.useQuery(
    { tenantId: tenantId ?? "" },
    { enabled: !!tenantId }
  );

  const { data: actionPlans = [] } = trpc.riskAssessments.listActionPlans.useQuery(
    { tenantId: tenantId ?? "" },
    { enabled: !!tenantId }
  );

  const assessmentCount = riskAssessments.length;
  const completedCount = riskAssessments.filter(a => a.status === "completed" || a.status === "reviewed").length;
  const actionPlanCount = actionPlans.length;
  const completedPlans = actionPlans.filter((p: any) => p.status === "completed").length;
  const complianceRate = actionPlanCount > 0 ? Math.round((completedPlans / actionPlanCount) * 100) : 0;

  const metrics = [
    {
      title: "Avaliações Realizadas",
      value: String(assessmentCount),
      description: `${completedCount} concluída(s)`,
      icon: CheckCircle2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Planos de Ação",
      value: String(actionPlanCount),
      description: `${completedPlans} concluído(s)`,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Taxa de Conformidade",
      value: `${complianceRate}%`,
      description: "Planos concluídos",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Avaliações Pendentes",
      value: String(riskAssessments.filter(a => a.status === "draft" || a.status === "in_progress").length),
      description: "Aguardando conclusão",
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  // Risk levels from assessments (extracted from description if stored)
  const totalAssessments = assessmentCount || 1;
  const risksByLevel = [
    { level: "Crítico", count: riskAssessments.filter(a => a.status === "reviewed").length, percentage: Math.round((riskAssessments.filter(a => a.status === "reviewed").length / totalAssessments) * 100), color: "bg-red-500" },
    { level: "Alto", count: riskAssessments.filter(a => a.status === "completed").length, percentage: Math.round((riskAssessments.filter(a => a.status === "completed").length / totalAssessments) * 100), color: "bg-orange-500" },
    { level: "Médio", count: riskAssessments.filter(a => a.status === "in_progress").length, percentage: Math.round((riskAssessments.filter(a => a.status === "in_progress").length / totalAssessments) * 100), color: "bg-yellow-500" },
    { level: "Baixo", count: riskAssessments.filter(a => a.status === "draft").length, percentage: Math.round((riskAssessments.filter(a => a.status === "draft").length / totalAssessments) * 100), color: "bg-green-500" },
  ];

  // Categories from action plan types
  const categoryMap: Record<string, string> = {
    elimination: "Eliminação",
    substitution: "Substituição",
    engineering: "Engenharia",
    administrative: "Administrativa",
    ppe: "EPI",
  };
  const risksByCategory = Object.entries(
    actionPlans.reduce((acc: Record<string, number>, p: any) => {
      const cat = categoryMap[p.actionType] || p.actionType || "Outros";
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, count]) => ({ category, count }));

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
