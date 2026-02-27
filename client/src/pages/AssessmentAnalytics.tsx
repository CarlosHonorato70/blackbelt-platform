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

  // Query responses for the first assessment (if any)
  const firstAssessmentId = assessments[0]?.id;
  const responsesQuery = trpc.assessments.getResponses.useQuery(
    { assessmentId: firstAssessmentId ?? "" },
    { enabled: !!firstAssessmentId }
  );
  const responses = responsesQuery.data || [];

  // ── Dados derivados das respostas reais ─────────────────────────────
  const totalRespondents = responses.length;

  const avgScore = totalRespondents > 0
    ? Math.round(responses.reduce((sum, r) => {
        const scores = [
          r.demandScore, r.controlScore, r.supportScore, r.leadershipScore,
          r.communityScore, r.meaningScore, r.trustScore, r.justiceScore,
          r.insecurityScore, r.mentalHealthScore, r.burnoutScore, r.violenceScore,
        ].filter((s): s is number => s != null);
        return sum + (scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0);
      }, 0) / totalRespondents)
    : 0;

  const criticalCount = responses.filter(r => r.overallRiskLevel === "critical").length;
  const highCount = responses.filter(r => r.overallRiskLevel === "high").length;
  const mediumCount = responses.filter(r => r.overallRiskLevel === "medium").length;
  const lowCount = responses.filter(r => r.overallRiskLevel === "low").length;

  const riskDistribution = [
    { name: "Baixo Risco", value: totalRespondents > 0 ? Math.round((lowCount / totalRespondents) * 100) : 0, color: "#10b981" },
    { name: "Médio Risco", value: totalRespondents > 0 ? Math.round((mediumCount / totalRespondents) * 100) : 0, color: "#f59e0b" },
    { name: "Alto Risco", value: totalRespondents > 0 ? Math.round((highCount / totalRespondents) * 100) : 0, color: "#f97316" },
    { name: "Crítico", value: totalRespondents > 0 ? Math.round((criticalCount / totalRespondents) * 100) : 0, color: "#ef4444" },
  ];

  const calcAvg = (field: string) =>
    totalRespondents > 0
      ? Math.round(responses.reduce((sum, r) => sum + (Number((r as any)[field]) || 0), 0) / totalRespondents)
      : 0;

  const dimensionData = [
    { dimension: "Demanda", score: calcAvg("demandScore") },
    { dimension: "Controle", score: calcAvg("controlScore") },
    { dimension: "Apoio", score: calcAvg("supportScore") },
    { dimension: "Liderança", score: calcAvg("leadershipScore") },
    { dimension: "Comunidade", score: calcAvg("communityScore") },
    { dimension: "Significado", score: calcAvg("meaningScore") },
    { dimension: "Confiança", score: calcAvg("trustScore") },
    { dimension: "Justiça", score: calcAvg("justiceScore") },
    { dimension: "Insegurança", score: calcAvg("insecurityScore") },
    { dimension: "Saúde Mental", score: calcAvg("mentalHealthScore") },
    { dimension: "Burnout", score: calcAvg("burnoutScore") },
    { dimension: "Violência", score: calcAvg("violenceScore") },
  ];

  // Timeline — group responses by month
  const timelineData = (() => {
    if (responses.length === 0) return [];
    const byMonth: Record<string, { total: number; count: number }> = {};
    for (const r of responses) {
      const date = r.completedAt ? new Date(r.completedAt) : r.createdAt ? new Date(r.createdAt) : null;
      if (!date) continue;
      const key = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      if (!byMonth[key]) byMonth[key] = { total: 0, count: 0 };
      const scores = [
        r.demandScore, r.controlScore, r.supportScore, r.leadershipScore,
        r.communityScore, r.meaningScore, r.trustScore, r.justiceScore,
      ].filter((s): s is number => s != null);
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      byMonth[key].total += avg;
      byMonth[key].count += 1;
    }
    return Object.entries(byMonth).map(([month, { total, count }]) => ({
      month,
      avgScore: Math.round(total / count),
      respondents: count,
    }));
  })();

  // Sector comparison — not available from individual responses
  const sectorComparison: { sector: string; score: number; respondents: number }[] = [];

  // ── Estado do Dialog "Gerar Plano de Ação" ──────────────────────────
  const [actionPlanDialogOpen, setActionPlanDialogOpen] = useState(false);
  const [actionPlanForm, setActionPlanForm] = useState({
    title: "",
    description: "",
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
    const riskLabel = avgScore >= 70 ? "Adequado" : avgScore >= 50 ? "Risco Médio" : avgScore > 0 ? "Risco Alto" : "Sem dados";
    const criticalPct = totalRespondents > 0 ? `${Math.round((criticalCount / totalRespondents) * 100)}% dos respondentes` : "—";
    const kpiSheet = XLSX.utils.json_to_sheet([
      { Indicador: "Total de Respondentes", Valor: totalRespondents, Observação: `${assessments.length} avaliação(ões)` },
      { Indicador: "Score Médio Geral", Valor: avgScore, Observação: riskLabel },
      { Indicador: "Casos Críticos", Valor: criticalCount, Observação: criticalPct },
      { Indicador: "Casos Alto Risco", Valor: highCount, Observação: totalRespondents > 0 ? `${Math.round((highCount / totalRespondents) * 100)}%` : "—" },
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

    // Aba 5: Recomendações (geradas a partir dos dados reais)
    const criticalDims = dimensionData.filter(d => d.score > 0 && d.score < 50).sort((a, b) => a.score - b.score);
    const attentionDims = dimensionData.filter(d => d.score >= 50 && d.score < 70);
    const goodDims = dimensionData.filter(d => d.score >= 70);
    const recs = [
      ...(criticalCount > 0 ? [{ Prioridade: "1 - Urgente", Área: "Casos Críticos", Descrição: `${criticalCount} respondente(s) com risco crítico necessitam intervenção imediata` }] : []),
      ...criticalDims.map(d => ({ Prioridade: "2 - Alta", Área: d.dimension, Descrição: `Score ${d.score} - Ação imediata necessária` })),
      ...attentionDims.map(d => ({ Prioridade: "3 - Atenção", Área: d.dimension, Descrição: `Score ${d.score} - Monitorar e implementar melhorias` })),
      ...(goodDims.length > 0 ? [{ Prioridade: "4 - Manutenção", Área: goodDims.map(d => d.dimension).join(", "), Descrição: "Manter boas práticas nas dimensões com scores adequados" }] : []),
    ];
    const recsSheet = XLSX.utils.json_to_sheet(recs.length > 0 ? recs : [{ Prioridade: "—", Área: "—", Descrição: "Sem dados suficientes para recomendações" }]);
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
            <div className="text-3xl font-bold">{totalRespondents}</div>
            <p className="text-xs text-gray-600 mt-1">{assessments.length} avaliação(ões)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Score Médio Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgScore}</div>
            <p className="text-xs text-gray-600 mt-1">
              {avgScore >= 70 ? "Adequado" : avgScore >= 50 ? "Risco Médio" : avgScore > 0 ? "Risco Alto" : "Sem dados"}
            </p>
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
            <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-gray-600 mt-1">
              {totalRespondents > 0 ? `${Math.round((criticalCount / totalRespondents) * 100)}% dos respondentes` : "Sem dados"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Alto Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{highCount}</div>
            <p className="text-xs text-gray-600 mt-1">
              {totalRespondents > 0 ? `${Math.round((highCount / totalRespondents) * 100)}% dos respondentes` : "Sem dados"}
            </p>
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
              {criticalCount > 0
                ? `${criticalCount} respondente(s) com risco crítico necessitam intervenção imediata`
                : "Nenhum caso crítico identificado até o momento"}
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
              {(() => {
                const critical = dimensionData.filter(d => d.score > 0 && d.score < 50).sort((a, b) => a.score - b.score);
                return critical.length > 0
                  ? `Focar em: ${critical.map(d => `${d.dimension} (${d.score})`).join(", ")}`
                  : "Nenhuma dimensão em nível crítico identificada";
              })()}
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
              {(() => {
                const good = dimensionData.filter(d => d.score >= 70).sort((a, b) => b.score - a.score);
                return good.length > 0
                  ? `Manter boas práticas em dimensões com scores altos (${good.map(d => d.dimension).join(", ")})`
                  : "Colete respostas COPSOQ-II para ver recomendações baseadas em dados reais";
              })()}
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
              {criticalCount > 0
                ? `Crie um plano de ação para os ${criticalCount} caso(s) crítico(s) identificado(s)`
                : "Crie um plano de ação baseado na análise das dimensões"}
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
