import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign,
  FileText,
  Clock,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
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
  Area,
  AreaChart
} from 'recharts';

// Mock data - In production, this would come from the backend
const executiveMetrics = {
  totalRevenue: 1250000,
  revenueGrowth: 23.5,
  activeClients: 47,
  clientGrowth: 12.3,
  activeAssessments: 23,
  assessmentGrowth: -5.2,
  completionRate: 87.5,
  completionGrowth: 3.1,
  avgResponseTime: 2.3,
  riskReduction: 34.2,
  proposalConversion: 68.5,
  clientSatisfaction: 4.6
};

const revenueData = [
  { month: 'Jan', revenue: 85000, proposals: 12, conversions: 8 },
  { month: 'Fev', revenue: 92000, proposals: 15, conversions: 10 },
  { month: 'Mar', revenue: 108000, proposals: 18, conversions: 13 },
  { month: 'Abr', revenue: 115000, proposals: 16, conversions: 11 },
  { month: 'Mai', revenue: 125000, proposals: 20, conversions: 14 },
  { month: 'Jun', revenue: 135000, proposals: 22, conversions: 16 }
];

const riskDistribution = [
  { name: 'Baixo', value: 35, color: '#10b981' },
  { name: 'Médio', value: 42, color: '#f59e0b' },
  { name: 'Alto', value: 18, color: '#ef4444' },
  { name: 'Crítico', value: 5, color: '#7c3aed' }
];

const industryData = [
  { sector: 'Tecnologia', assessments: 28, revenue: 420000 },
  { sector: 'Manufatura', assessments: 22, revenue: 330000 },
  { sector: 'Serviços', assessments: 18, revenue: 270000 },
  { sector: 'Saúde', assessments: 15, revenue: 225000 },
  { sector: 'Educação', assessments: 10, revenue: 150000 }
];

const copsoqTrends = [
  { month: 'Jan', demandas: 65, controle: 72, suporte: 78, recompensas: 68 },
  { month: 'Fev', demandas: 63, controle: 74, suporte: 80, recompensas: 70 },
  { month: 'Mar', demandas: 61, controle: 75, suporte: 82, recompensas: 72 },
  { month: 'Abr', demandas: 59, controle: 77, suporte: 83, recompensas: 74 },
  { month: 'Mai', demandas: 58, controle: 78, suporte: 85, recompensas: 75 },
  { month: 'Jun', demandas: 56, controle: 80, suporte: 86, recompensas: 77 }
];

const MetricCard = ({ 
  title, 
  value, 
  growth, 
  icon: Icon, 
  prefix = '', 
  suffix = '' 
}: { 
  title: string; 
  value: number | string; 
  growth?: number; 
  icon: any; 
  prefix?: string; 
  suffix?: string; 
}) => {
  const isPositive = growth ? growth > 0 : false;
  const isNegative = growth ? growth < 0 : false;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-2">
              {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}{suffix}
            </h3>
            {growth !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${
                isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
              }`}>
                {isPositive ? (
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                ) : isNegative ? (
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                ) : null}
                <span>{Math.abs(growth).toFixed(1)}% vs mês anterior</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${
            isPositive ? 'bg-green-100' : isNegative ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            <Icon className={`h-6 w-6 ${
              isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-blue-600'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function ExecutiveDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Painel Executivo</h1>
          <p className="text-muted-foreground mt-1">
            Visão consolidada de métricas e KPIs da plataforma
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="1y">Último ano</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Receita Total"
          value={executiveMetrics.totalRevenue}
          growth={executiveMetrics.revenueGrowth}
          icon={DollarSign}
          prefix="R$ "
        />
        <MetricCard
          title="Clientes Ativos"
          value={executiveMetrics.activeClients}
          growth={executiveMetrics.clientGrowth}
          icon={Users}
        />
        <MetricCard
          title="Avaliações Ativas"
          value={executiveMetrics.activeAssessments}
          growth={executiveMetrics.assessmentGrowth}
          icon={FileText}
        />
        <MetricCard
          title="Taxa de Conclusão"
          value={executiveMetrics.completionRate}
          growth={executiveMetrics.completionGrowth}
          icon={CheckCircle2}
          suffix="%"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tempo Médio de Resposta</p>
                <h3 className="text-2xl font-bold mt-2">{executiveMetrics.avgResponseTime} dias</h3>
              </div>
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Redução de Risco</p>
                <h3 className="text-2xl font-bold mt-2">{executiveMetrics.riskReduction}%</h3>
              </div>
              <TrendingDown className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversão de Propostas</p>
                <h3 className="text-2xl font-bold mt-2">{executiveMetrics.proposalConversion}%</h3>
              </div>
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Satisfação do Cliente</p>
                <h3 className="text-2xl font-bold mt-2">{executiveMetrics.clientSatisfaction}/5</h3>
              </div>
              <Zap className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Receita & Conversões</TabsTrigger>
          <TabsTrigger value="risk">Distribuição de Riscos</TabsTrigger>
          <TabsTrigger value="industry">Análise por Setor</TabsTrigger>
          <TabsTrigger value="copsoq">Tendências COPSOQ-II</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Receita e Conversão de Propostas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                    name="Receita (R$)" 
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="conversions" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Conversões" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Níveis de Risco</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Risco</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskDistribution.map((risk) => (
                    <div key={risk.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: risk.color }}
                        />
                        <span className="font-medium">{risk.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{risk.value}%</div>
                        <div className="text-sm text-muted-foreground">
                          {Math.round(risk.value * 0.47)} avaliações
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="industry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance por Setor</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={industryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sector" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="assessments" 
                    fill="#8b5cf6" 
                    name="Avaliações"
                  />
                  <Bar 
                    yAxisId="right"
                    dataKey="revenue" 
                    fill="#3b82f6" 
                    name="Receita (R$)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="copsoq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendências de Dimensões COPSOQ-II</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={copsoqTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="demandas" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Demandas Quantitativas" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="controle" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Controle e Autonomia" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="suporte" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Suporte Social" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="recompensas" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    name="Recompensas" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alerts & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Alertas e Ações Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">3 avaliações com risco crítico</p>
                  <p className="text-sm text-red-700">Requerem ação imediata e plano de intervenção</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-900">8 propostas aguardando resposta</p>
                  <p className="text-sm text-yellow-700">Média de 5 dias sem resposta</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">12 convites COPSOQ pendentes</p>
                  <p className="text-sm text-blue-700">Enviar lembretes automáticos</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Insights e Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Taxa de conversão acima da média</p>
                  <p className="text-sm text-green-700">68.5% vs meta de 60%</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <Target className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-900">Setor de Tecnologia em crescimento</p>
                  <p className="text-sm text-purple-700">+35% em avaliações no último trimestre</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
                <Activity className="h-5 w-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-medium text-indigo-900">Melhoria em indicadores COPSOQ</p>
                  <p className="text-sm text-indigo-700">Redução de 8.6% em demandas quantitativas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
