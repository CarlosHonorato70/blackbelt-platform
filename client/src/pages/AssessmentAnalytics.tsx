import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, TrendingUp, Users, AlertTriangle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth.tsx";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

export default function AssessmentAnalytics() {
  const { user } = useAuth();
  const { selectedTenant } = useTenant();
  const navigate = useNavigate();

  const assessmentsQuery = trpc.assessments.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  const assessments = assessmentsQuery.data || [];

  // ── Dados para gráficos ─────────────────────────────────────────────
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

  // ── Estado do Dialog "Gerar Plano de Ação" ──────────────────────────
  const [actionPlanDialogOpen, setActionPlanDialogOpen] = useState(false);
  const [actionPlanForm, setActionPlanForm] = useState({
    title: "Plano de Ação - Casos Críticos (28 respondentes)",
    description:
      "Intervenção imediata para 28 respondentes com risco crítico identificados na análise consolidada.\n\nDimensões prioritárias:\n- Violência: score 35 (Crítico)\n- Burnout: score 58 (Atenção)\n- Saúde Mental: score 62 (Atenção)",
    actionType: "administrative",
    priority: "urgent",
    deadline: "",
    budget: "",
  });

  const createActionPlanMutation =
    trpc.riskAssessments.createActionPlan.useMutation({
      onSuccess: () => {
        toast.success("Plano de ação criado com sucesso!", {
          description: "Redirecionando para a página de planos...",
        });
        setActionPlanDialogOpen(false);
        navigate("/action-plans");
      },
      onError: (error: any) => {
        toast.error(`Erro ao criar plano de ação: ${error.message}`);
      },
    });

  const handleCreateActionPlan = () => {
    if (!selectedTenant) {
      toast.error("Selecione uma empresa primeiro");
      return;
    }
    if (!actionPlanForm.title.trim()) {
      toast.error("O título é obrigatório");
      return;
    }

    createActionPlanMutation.mutate({
      tenantId: selectedTenant.id,
      title: actionPlanForm.title,
      description: actionPlanForm.description || undefined,
      actionType: actionPlanForm.actionType,
      priority: actionPlanForm.priority,
      deadline: actionPlanForm.deadline
        ? new Date(actionPlanForm.deadline).toISOString()
        : undefined,
      budget: actionPlanForm.budget
        ? Math.round(parseFloat(actionPlanForm.budget) * 100)
        : undefined,
    });
  };

  // ── Handler "Exportar Relatório Executivo" ──────────────────────────
  const handleExportReport = () => {
    const wb = XLSX.utils.book_new();

    // Aba 1: KPIs
    const kpiSheet = XLSX.utils.json_to_sheet([
      { Indicador: "Total de Respondentes", Valor: 312, Observação: "+15% vs mês anterior" },
      { Indicador: "Score Médio Geral", Valor: 68, Observação: "Risco Médio" },
      { Indicador: "Casos Críticos", Valor: 28, Observação: "9% dos respondentes" },
      { Indicador: "Tendência (6 meses)", Valor: "+5%", Observação: "Melhora contínua" },
    ]);
    XLSX.utils.book_append_sheet(wb, kpiSheet, "KPIs");

    // Aba 2: Dimensões COPSOQ-II
    const dimSheet = XLSX.utils.json_to_sheet(
      dimensionData.map((d) => ({
        Dimensão: d.dimension,
        Score: d.score,
        Classificação:
          d.score >= 70 ? "Adequado" : d.score >= 50 ? "Atenção" : "Crítico",
      }))
    );
    XLSX.utils.book_append_sheet(wb, dimSheet, "Dimensões COPSOQ-II");

    // Aba 3: Evolução Temporal
    const timeSheet = XLSX.utils.json_to_sheet(
      timelineData.map((t) => ({
        Mês: t.month,
        "Score Médio": t.avgScore,
        Respondentes: t.respondents,
      }))
    );
    XLSX.utils.book_append_sheet(wb, timeSheet, "Evolução Temporal");

    // Aba 4: Comparativo por Setor
    const sectorSheet = XLSX.utils.json_to_sheet(
      sectorComparison.map((s) => ({
        Setor: s.sector,
        Score: s.score,
        Respondentes: s.respondents,
      }))
    );
    XLSX.utils.book_append_sheet(wb, sectorSheet, "Por Setor");

    // Aba 5: Recomendações
    const recsSheet = XLSX.utils.json_to_sheet([
      {
        Prioridade: "1 - Urgente",
        Área: "Casos Críticos",
        Descrição: "28 respondentes com risco crítico necessitam intervenção imediata",
      },
      {
        Prioridade: "2 - Alta",
        Área: "Violência",
        Descrição: "Score 35 - Implementar programa de prevenção de assédio e violência",
      },
      {
        Prioridade: "2 - Alta",
        Área: "Burnout",
        Descrição: "Score 58 - Revisar carga de trabalho e prazos",
      },
      {
        Prioridade: "2 - Alta",
        Área: "Saúde Mental",
        Descrição: "Score 62 - Oferecer suporte psicológico especializado",
      },
      {
        Prioridade: "3 - Manutenção",
        Área: "Liderança / Significado",
        Descrição: "Manter boas práticas em dimensões com scores altos",
      },
    ]);
    XLSX.utils.book_append_sheet(wb, recsSheet, "Recomendações");

    const filename = `relatorio_executivo_riscos_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success("Relatório exportado com sucesso!", {
      description: filename,
    });
  };

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
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => setActionPlanDialogOpen(true)}
            >
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
        <Button className="flex-1" onClick={handleExportReport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório Executivo
        </Button>
        <Button variant="outline" className="flex-1">
          Compartilhar com Gestores
        </Button>
      </div>

      {/* DIALOG — Gerar Plano de Ação */}
      <Dialog open={actionPlanDialogOpen} onOpenChange={setActionPlanDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerar Plano de Ação</DialogTitle>
            <DialogDescription>
              Crie um plano de ação para os 28 casos críticos identificados
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="ap-title">Título *</Label>
              <Input
                id="ap-title"
                value={actionPlanForm.title}
                onChange={(e) =>
                  setActionPlanForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="ap-description">Descrição</Label>
              <Textarea
                id="ap-description"
                rows={4}
                value={actionPlanForm.description}
                onChange={(e) =>
                  setActionPlanForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo de Ação</Label>
                <Select
                  value={actionPlanForm.actionType}
                  onValueChange={(value) =>
                    setActionPlanForm((prev) => ({ ...prev, actionType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elimination">Eliminação</SelectItem>
                    <SelectItem value="substitution">Substituição</SelectItem>
                    <SelectItem value="engineering">Engenharia</SelectItem>
                    <SelectItem value="administrative">Administrativa</SelectItem>
                    <SelectItem value="ppe">EPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Prioridade</Label>
                <Select
                  value={actionPlanForm.priority}
                  onValueChange={(value) =>
                    setActionPlanForm((prev) => ({ ...prev, priority: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="ap-deadline">Prazo</Label>
                <Input
                  id="ap-deadline"
                  type="date"
                  value={actionPlanForm.deadline}
                  onChange={(e) =>
                    setActionPlanForm((prev) => ({
                      ...prev,
                      deadline: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ap-budget">Orçamento (R$)</Label>
                <Input
                  id="ap-budget"
                  type="number"
                  placeholder="0,00"
                  value={actionPlanForm.budget}
                  onChange={(e) =>
                    setActionPlanForm((prev) => ({
                      ...prev,
                      budget: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionPlanDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateActionPlan}
              disabled={
                createActionPlanMutation.isPending || !actionPlanForm.title.trim()
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {createActionPlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Plano de Ação"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
