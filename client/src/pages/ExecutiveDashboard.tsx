import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Clock,
  Activity,
  Target,
  Loader2,
  ClipboardList
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { trpc } from '@/lib/trpc';

export default function ExecutiveDashboard() {
  const { data, isLoading, error } = trpc.adminMetrics.executiveDashboard.useQuery();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6">
        <Card><CardContent className="p-6 text-center text-muted-foreground">
          Erro ao carregar dados do painel executivo.
        </CardContent></Card>
      </div>
    );
  }

  const riskTotal = data.riskDistribution.low + data.riskDistribution.medium + data.riskDistribution.high + data.riskDistribution.critical;
  const riskData = [
    { name: 'Baixo', value: data.riskDistribution.low, color: '#10b981' },
    { name: 'Moderado', value: data.riskDistribution.medium, color: '#f59e0b' },
    { name: 'Alto', value: data.riskDistribution.high, color: '#ef4444' },
    { name: 'Critico', value: data.riskDistribution.critical, color: '#7c3aed' },
  ].filter(d => d.value > 0);

  const actionData = [
    { name: 'Pendentes', value: data.actionPlans.pending, color: '#94a3b8' },
    { name: 'Em Andamento', value: data.actionPlans.inProgress, color: '#3b82f6' },
    { name: 'Concluidos', value: data.actionPlans.completed, color: '#10b981' },
  ].filter(d => d.value > 0);

  const dimLabels: Record<string, string> = {
    demand: 'Demandas',
    control: 'Controle',
    support: 'Suporte',
    leadership: 'Lideranca',
    community: 'Comunidade',
    meaning: 'Significado',
    trust: 'Confianca',
    justice: 'Justica',
    insecurity: 'Inseguranca',
    mentalHealth: 'Saude Mental',
    burnout: 'Burnout',
    violence: 'Violencia',
  };

  const copsoqRadar = data.copsoqDimensions
    ? Object.entries(data.copsoqDimensions)
        .filter(([, v]) => (v as number) > 0)
        .map(([k, v]) => ({ dimension: dimLabels[k] || k, score: v as number }))
    : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Painel Executivo</h1>
        <p className="text-muted-foreground mt-1">
          Visao consolidada da sua consultoria
        </p>
      </div>

      {/* KPIs Primarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Empresas</p>
                <h3 className="text-2xl font-bold mt-2">{data.companies.total}</h3>
                <p className="text-sm text-muted-foreground mt-1">cadastradas</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Colaboradores</p>
                <h3 className="text-2xl font-bold mt-2">{data.people.total}</h3>
                <p className="text-sm text-muted-foreground mt-1">total</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avaliacoes COPSOQ</p>
                <h3 className="text-2xl font-bold mt-2">{data.copsoq.total}</h3>
                <p className="text-sm text-muted-foreground mt-1">{data.copsoq.completed} concluidas</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conformidade</p>
                <h3 className="text-2xl font-bold mt-2">{data.actionPlans.complianceRate}%</h3>
                <p className="text-sm text-muted-foreground mt-1">{data.actionPlans.completed}/{data.actionPlans.total} acoes</p>
              </div>
              <div className={`p-3 rounded-lg ${data.actionPlans.complianceRate >= 70 ? 'bg-green-100' : 'bg-yellow-100'}`}>
                <CheckCircle2 className={`h-6 w-6 ${data.actionPlans.complianceRate >= 70 ? 'text-green-600' : 'text-yellow-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Secundarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Propostas</p>
                <h3 className="text-2xl font-bold mt-2">{data.proposals.total}</h3>
                <p className="text-sm text-muted-foreground mt-1">{data.proposals.approved} aprovadas</p>
              </div>
              <ClipboardList className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversao</p>
                <h3 className="text-2xl font-bold mt-2">{data.proposals.conversionRate}%</h3>
                <p className="text-sm text-muted-foreground mt-1">propostas aprovadas</p>
              </div>
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Planos de Acao</p>
                <h3 className="text-2xl font-bold mt-2">{data.actionPlans.total}</h3>
                <p className="text-sm text-muted-foreground mt-1">{data.actionPlans.inProgress} em andamento</p>
              </div>
              <Activity className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Riscos Identificados</p>
                <h3 className="text-2xl font-bold mt-2">{riskTotal}</h3>
                <p className="text-sm text-muted-foreground mt-1">{data.riskDistribution.high + data.riskDistribution.critical} alto/critico</p>
              </div>
              <AlertTriangle className={`h-6 w-6 ${data.riskDistribution.critical > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graficos */}
      <Tabs defaultValue="risk" className="space-y-4">
        <TabsList>
          <TabsTrigger value="risk">Distribuicao de Riscos</TabsTrigger>
          <TabsTrigger value="actions">Planos de Acao</TabsTrigger>
          {copsoqRadar.length > 0 && <TabsTrigger value="copsoq">Dimensoes COPSOQ-II</TabsTrigger>}
        </TabsList>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuicao por Nivel de Risco</CardTitle>
              </CardHeader>
              <CardContent>
                {riskData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={riskData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {riskData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhum risco identificado ainda
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento de Riscos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Baixo', value: data.riskDistribution.low, color: '#10b981' },
                    { name: 'Moderado', value: data.riskDistribution.medium, color: '#f59e0b' },
                    { name: 'Alto', value: data.riskDistribution.high, color: '#ef4444' },
                    { name: 'Critico', value: data.riskDistribution.critical, color: '#7c3aed' },
                  ].map((risk) => (
                    <div key={risk.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: risk.color }} />
                        <span className="font-medium">{risk.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{risk.value}</div>
                        <div className="text-sm text-muted-foreground">
                          {riskTotal > 0 ? Math.round((risk.value / riskTotal) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progresso dos Planos de Acao</CardTitle>
            </CardHeader>
            <CardContent>
              {actionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={actionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Quantidade" fill="#3b82f6">
                      {actionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                  Nenhum plano de acao criado ainda
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {copsoqRadar.length > 0 && (
          <TabsContent value="copsoq" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dimensoes COPSOQ-II (Media das Empresas)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={copsoqRadar}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.alerts.criticalRisks > 0 && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">{data.alerts.criticalRisks} riscos alto/critico</p>
                    <p className="text-sm text-red-700">Requerem atencao e plano de intervencao</p>
                  </div>
                </div>
              )}
              {data.alerts.pendingProposals > 0 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">{data.alerts.pendingProposals} propostas pendentes</p>
                    <p className="text-sm text-yellow-700">Aguardando resposta da empresa</p>
                  </div>
                </div>
              )}
              {data.alerts.activeCopsoq > 0 && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">{data.alerts.activeCopsoq} avaliacoes COPSOQ em andamento</p>
                    <p className="text-sm text-blue-700">Acompanhar respostas dos colaboradores</p>
                  </div>
                </div>
              )}
              {data.alerts.criticalRisks === 0 && data.alerts.pendingProposals === 0 && data.alerts.activeCopsoq === 0 && (
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-900">Tudo em dia!</p>
                    <p className="text-sm text-green-700">Nenhum alerta pendente</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Empresas Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.companies.list.length > 0 ? data.companies.list.map((company: any) => (
                <div key={company.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-sm text-muted-foreground">{company.cnpj || 'Sem CNPJ'}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-4">
                  Nenhuma empresa cadastrada ainda
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
