import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Users,
  BarChart3,
  AlertTriangle,
  Activity,
  Loader2,
  FileDown,
  Share2,
  Building2,
  UserCheck,
} from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useState } from "react";
import { toast } from "sonner";

const DIMENSION_LABELS: Record<string, string> = {
  demands: "Demanda",
  control: "Controle",
  socialSupport: "Apoio Social",
  leadership: "Liderança",
  community: "Comunidade",
  meaning: "Significado",
  trust: "Confiança",
  justice: "Justiça",
  insecurity: "Insegurança",
  mentalHealth: "Saúde Mental",
  burnout: "Burnout",
  violence: "Violência",
};

const DIMENSION_KEYS = Object.keys(DIMENSION_LABELS);

function getDimensionColor(score: number): string {
  if (score >= 66) return "bg-green-500";
  if (score >= 33) return "bg-yellow-500";
  return "bg-red-500";
}

function getDimensionTextColor(score: number): string {
  if (score >= 66) return "text-green-700";
  if (score >= 33) return "text-yellow-700";
  return "text-red-700";
}

function getDimensionBg(score: number): string {
  if (score >= 66) return "bg-green-50 border-green-200";
  if (score >= 33) return "bg-yellow-50 border-yellow-200";
  return "bg-red-50 border-red-200";
}

export default function PsychosocialDashboard() {
  usePageMeta({ title: "Dashboard de Indicadores Psicossociais" });
  const { selectedTenant } = useTenant();
  const { data: user } = trpc.auth.me.useQuery();
  const tenantId = (typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id) || user?.tenantId;
  const { exportPdf, isExporting } = usePdfExport();

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

  const [activeTab, setActiveTab] = useState<"geral" | "setor" | "demografia">("geral");
  const [demographicGroup, setDemographicGroup] = useState<"ageGroup" | "gender" | "education" | "yearsInCompany">("ageGroup");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmails, setShareEmails] = useState("");

  const exportPsychosocialDashboardMutation = trpc.nr01Pdf.exportPsychosocialDashboard.useMutation();

  const summaryQuery = trpc.psychosocialDashboard.getSummary.useQuery({ tenantId });
  const trendsQuery = trpc.psychosocialDashboard.getTrends.useQuery({ tenantId });
  const sectorQuery = trpc.psychosocialDashboard.getSectorComparison.useQuery({ tenantId }, { enabled: activeTab === "setor" });
  const demographicQuery = trpc.psychosocialDashboard.getDemographicBreakdown.useQuery(
    { tenantId, groupBy: demographicGroup },
    { enabled: activeTab === "demografia" },
  );
  const disseminationsQuery = trpc.psychosocialDashboard.listDisseminations.useQuery({ tenantId });

  const disseminateMutation = trpc.psychosocialDashboard.disseminateResults.useMutation({
    onSuccess: (data) => {
      toast.success(`Resultados enviados para ${data.sentCount} trabalhadores!${data.checklistUpdated ? " Checklist NR01-1.5.3.7 atualizado." : ""}`);
      setShareDialogOpen(false);
      setShareEmails("");
      disseminationsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const summary = summaryQuery.data;
  const trends = trendsQuery.data ?? [];

  const isLoading = summaryQuery.isLoading || trendsQuery.isLoading;

  // Build radar data from summary dimensions
  const dims = summary?.dimensions as Record<string, number | null> | undefined;
  const radarData = DIMENSION_KEYS.map((key) => ({
    dimension: DIMENSION_LABELS[key],
    score: dims?.[key] ?? 0,
    fullMark: 100,
  }));

  // Build dimension scores for cards
  const dimensionScores = DIMENSION_KEYS.map((key) => ({
    key,
    label: DIMENSION_LABELS[key],
    score: dims?.[key] ?? 0,
  }));

  const summaryCards = [
    {
      title: "Total Respondentes",
      value: summary?.totalRespondents ?? 0,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Taxa de Resposta",
      value: summary?.responseRate ? `${Math.round(summary.responseRate)}%` : "0%",
      icon: BarChart3,
      color: "text-green-600",
    },
    {
      title: "Nível de Risco Geral",
      value: summary?.overallRiskLevel ?? "-",
      icon: AlertTriangle,
      color: "text-orange-600",
    },
    {
      title: "Dimensões Críticas",
      value: dims
        ? Object.values(dims).filter((v) => typeof v === "number" && v >= 3.5).length
        : 0,
      icon: Activity,
      color: "text-red-600",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard de Indicadores Psicossociais</h1>
            <p className="text-muted-foreground">
              Visão geral dos resultados COPSOQ e indicadores de saúde organizacional
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareDialogOpen(true)}
              disabled={!summary?.dimensions}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Compartilhar Resultados
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting || !tenantId}
              onClick={() => exportPdf(() => exportPsychosocialDashboardMutation.mutateAsync({ tenantId: tenantId! }))}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? "Exportando..." : "Exportar PDF"}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {summaryCards.map((card) => (
                <Card key={card.title}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{card.title}</p>
                        <p className="text-2xl font-bold mt-1">{card.value}</p>
                      </div>
                      <card.icon className={`h-8 w-8 ${card.color} opacity-80`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tab Bar: Geral | Por Setor | Por Demografia */}
            <div className="flex gap-2 border-b pb-2">
              {([
                { key: "geral", label: "Visão Geral", icon: BarChart3 },
                { key: "setor", label: "Por Setor", icon: Building2 },
                { key: "demografia", label: "Por Demografia", icon: UserCheck },
              ] as const).map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={activeTab === key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab(key)}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {label}
                </Button>
              ))}
            </div>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Dimensões COPSOQ</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Trends Area Chart */}
            {trends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tendências por Dimensão</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      {DIMENSION_KEYS.slice(0, 6).map((key, idx) => {
                        const colors = [
                          "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4",
                        ];
                        return (
                          <Area
                            key={key}
                            type="monotone"
                            dataKey={key}
                            name={DIMENSION_LABELS[key]}
                            stroke={colors[idx]}
                            fill={colors[idx]}
                            fillOpacity={0.1}
                          />
                        );
                      })}
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Dimension Cards */}
            <div>
              <h2 className="text-lg font-semibold mb-4">Scores por Dimensão</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {dimensionScores.map((dim) => (
                  <Card
                    key={dim.key}
                    className={`border ${getDimensionBg(dim.score)}`}
                  >
                    <CardContent className="p-4">
                      <p className="text-sm font-medium text-muted-foreground">{dim.label}</p>
                      <div className="flex items-end gap-2 mt-2">
                        <span className={`text-2xl font-bold ${getDimensionTextColor(dim.score)}`}>
                          {Math.round(dim.score)}
                        </span>
                        <span className="text-sm text-muted-foreground mb-0.5">/ 100</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                        <div
                          className={`h-2 rounded-full ${getDimensionColor(dim.score)}`}
                          style={{ width: `${Math.min(dim.score, 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            {/* Sector Comparison */}
            {activeTab === "setor" && (
              <Card>
                <CardHeader>
                  <CardTitle>Comparação por Setor</CardTitle>
                  <CardDescription>Scores médios COPSOQ-II por setor/departamento (conforme Guia MTE)</CardDescription>
                </CardHeader>
                <CardContent>
                  {sectorQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : sectorQuery.data && sectorQuery.data.length > 0 ? (
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={sectorQuery.data.map((s: any) => ({
                        setor: s.sectorId,
                        Demanda: s.dimensions.demand,
                        Controle: s.dimensions.control,
                        Apoio: s.dimensions.support,
                        Liderança: s.dimensions.leadership,
                        Burnout: s.dimensions.burnout,
                        Violência: s.dimensions.violence,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="setor" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Demanda" fill="#ef4444" />
                        <Bar dataKey="Controle" fill="#3b82f6" />
                        <Bar dataKey="Apoio" fill="#22c55e" />
                        <Bar dataKey="Liderança" fill="#f59e0b" />
                        <Bar dataKey="Burnout" fill="#8b5cf6" />
                        <Bar dataKey="Violência" fill="#dc2626" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma avaliação com setor definido. Crie avaliações COPSOQ com setor para visualizar a comparação.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Demographic Breakdown */}
            {activeTab === "demografia" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Segmentação Demográfica</CardTitle>
                      <CardDescription>Análise por unidade organizacional conforme exigido pelo Guia MTE</CardDescription>
                    </div>
                    <Select value={demographicGroup} onValueChange={(v) => setDemographicGroup(v as any)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ageGroup">Faixa Etária</SelectItem>
                        <SelectItem value="gender">Gênero</SelectItem>
                        <SelectItem value="education">Escolaridade</SelectItem>
                        <SelectItem value="yearsInCompany">Tempo de Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {demographicQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : demographicQuery.data && demographicQuery.data.length > 0 ? (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={demographicQuery.data.map((g: any) => ({
                          grupo: `${g.group} (${g.count})`,
                          Demanda: g.dimensions.demand,
                          Controle: g.dimensions.control,
                          Burnout: g.dimensions.burnout,
                          "Saúde Mental": g.dimensions.mentalHealth,
                          Violência: g.dimensions.violence,
                        }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="grupo" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="Demanda" fill="#ef4444" />
                          <Bar dataKey="Controle" fill="#3b82f6" />
                          <Bar dataKey="Burnout" fill="#8b5cf6" />
                          <Bar dataKey="Saúde Mental" fill="#f59e0b" />
                          <Bar dataKey="Violência" fill="#dc2626" />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {demographicQuery.data.map((g: any) => (
                          <div key={g.group} className="text-xs border rounded p-2">
                            <div className="font-medium">{g.group}</div>
                            <div className="text-muted-foreground">{g.count} respondentes</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nenhuma resposta com dados demográficos disponível.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dissemination History */}
            {(disseminationsQuery.data?.length ?? 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Histórico de Devolutivas (NR-01 item 1.5.3.7)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {disseminationsQuery.data!.map((d: any) => (
                      <div key={d.id} className="flex items-center gap-3 text-sm border rounded p-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{d.method}</Badge>
                        <span>{d.recipientCount} destinatários</span>
                        <span className="text-muted-foreground">
                          {d.sentAt ? new Date(d.sentAt).toLocaleDateString("pt-BR") : "—"}
                        </span>
                        {d.notes && <span className="text-xs text-muted-foreground truncate">{d.notes}</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Share Results Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Resultados com Trabalhadores</DialogTitle>
            <DialogDescription>
              Conforme NR-01 item 1.5.3.7, os resultados agregados e anonimizados devem ser comunicados aos trabalhadores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Emails dos destinatários (um por linha)</Label>
              <Textarea
                value={shareEmails}
                onChange={(e) => setShareEmails(e.target.value)}
                placeholder={"colaborador1@empresa.com\ncolaborador2@empresa.com"}
                rows={5}
              />
              <p className="text-xs text-muted-foreground">
                Será enviado um resumo anonimizado com scores agregados por dimensão. Nenhum dado individual é compartilhado.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
              <strong>O que será enviado:</strong> Scores médios das 12 dimensões COPSOQ-II + distribuição de risco (agregados).
              O item NR01-1.5.3.7 do checklist de conformidade será automaticamente marcado como conforme.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                const emails = shareEmails.split("\n").map((e) => e.trim()).filter((e) => e.includes("@"));
                if (emails.length === 0) { toast.error("Informe ao menos um email válido."); return; }
                disseminateMutation.mutate({ emails, method: "email" });
              }}
              disabled={disseminateMutation.isPending}
            >
              {disseminateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
              {disseminateMutation.isPending ? "Enviando..." : `Enviar para ${shareEmails.split("\n").filter((e) => e.trim().includes("@")).length} pessoas`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
