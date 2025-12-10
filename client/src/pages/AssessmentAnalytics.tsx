import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Download, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth.tsx";

export default function AssessmentAnalytics() {
  const { user } = useAuth();

  const assessmentsQuery = trpc.assessments.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  const assessments = assessmentsQuery.data || [];

  // Dados para gráficos
  const riskDistribution = [
    { name: "Baixo Risco", value: 0, color: "#10b981" },
    { name: "Médio Risco", value: 0, color: "#f59e0b" },
    { name: "Alto Risco", value: 0, color: "#f97316" },
    { name: "Crítico", value: 0, color: "#ef4444" },
  ];

  const dimensionData = [
    { dimension: "Demanda", score: 65 },
    { dimension: "Controle", score: 72 },
    { dimension: "Apoio", score: 68 },
    { dimension: "Liderança", score: 75 },
    { dimension: "Comunidade", score: 70 },
    { dimension: "Significado", score: 78 },
    { dimension: "Confiança", score: 73 },
    { dimension: "Justiça", score: 71 },
    { dimension: "Insegurança", score: 45 },
    { dimension: "Saúde Mental", score: 62 },
    { dimension: "Burnout", score: 58 },
    { dimension: "Violência", score: 35 },
  ];

  const timelineData = [
    { month: "Jan", avgScore: 65, respondents: 45 },
    { month: "Fev", avgScore: 68, respondents: 52 },
    { month: "Mar", avgScore: 70, respondents: 58 },
    { month: "Abr", avgScore: 67, respondents: 61 },
    { month: "Mai", avgScore: 72, respondents: 65 },
    { month: "Jun", avgScore: 75, respondents: 72 },
  ];

  const sectorComparison = [
    { sector: "TI", score: 78, respondents: 25 },
    { sector: "RH", score: 72, respondents: 18 },
    { sector: "Vendas", score: 68, respondents: 32 },
    { sector: "Operações", score: 65, respondents: 28 },
    { sector: "Financeiro", score: 71, respondents: 15 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Análise de Avaliações</h1>
        <p className="text-gray-600 mt-2">
          Dashboard consolidado com estatísticas e tendências de riscos
          psicossociais
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total de Respondentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">312</div>
            <p className="text-xs text-gray-600 mt-1">+15% vs mês anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Score Médio Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">68</div>
            <p className="text-xs text-gray-600 mt-1">Risco Médio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              Casos Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">28</div>
            <p className="text-xs text-gray-600 mt-1">9% dos respondentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Tendência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">↑ 5%</div>
            <p className="text-xs text-gray-600 mt-1">Melhora em 6 meses</p>
          </CardContent>
        </Card>
      </div>

      {/* GRAFICOS */}
      <Tabs defaultValue="dimensions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dimensions">Dimensões</TabsTrigger>
          <TabsTrigger value="timeline">Tendência Temporal</TabsTrigger>
          <TabsTrigger value="sectors">Por Setor</TabsTrigger>
          <TabsTrigger value="distribution">Distribuição de Risco</TabsTrigger>
        </TabsList>

        {/* DIMENSOES */}
        <TabsContent value="dimensions">
          <Card>
            <CardHeader>
              <CardTitle>Scores por Dimensão COPSOQ-II</CardTitle>
              <CardDescription>
                Comparativo de scores em cada dimensão avaliada
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dimensionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="dimension"
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Evolução Temporal</CardTitle>
              <CardDescription>
                Score médio e número de respondentes ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgScore"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Score Médio"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="respondents"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Respondentes"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETORES */}
        <TabsContent value="sectors">
          <Card>
            <CardHeader>
              <CardTitle>Comparativo por Setor</CardTitle>
              <CardDescription>
                Análise de riscos psicossociais por departamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={sectorComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sector" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="score" fill="#f59e0b" name="Score Médio" />
                  <Bar
                    dataKey="respondents"
                    fill="#3b82f6"
                    name="Respondentes"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DISTRIBUICAO */}
        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Risco</CardTitle>
              <CardDescription>
                Percentual de respondentes por nível de risco
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-4">
                  {riskDistribution.map(item => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${item.value}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                      <span className="font-bold text-sm">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* RECOMENDACOES */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendações Estratégicas</CardTitle>
          <CardDescription>
            Ações prioritárias baseadas na análise consolidada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 mb-2">
              Prioridade 1: Casos Críticos
            </h4>
            <p className="text-sm text-red-800 mb-3">
              28 respondentes com risco crítico necessitam intervenção imediata
            </p>
            <Button size="sm" className="bg-red-600 hover:bg-red-700">
              Gerar Plano de Ação
            </Button>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">
              Prioridade 2: Dimensões Críticas
            </h4>
            <p className="text-sm text-orange-800 mb-2">
              Focar em: Violência (35), Burnout (58), Saúde Mental (62)
            </p>
            <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
              <li>Implementar programa de prevenção de assédio e violência</li>
              <li>Oferecer suporte psicológico especializado</li>
              <li>Revisar carga de trabalho e prazos</li>
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              Prioridade 3: Manutenção
            </h4>
            <p className="text-sm text-blue-800">
              Manter boas práticas em dimensões com scores altos (Liderança,
              Significado)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* BOTOES DE ACAO */}
      <div className="flex gap-4">
        <Button className="flex-1">
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório Executivo
        </Button>
        <Button variant="outline" className="flex-1">
          Compartilhar com Gestores
        </Button>
      </div>
    </div>
  );
}
