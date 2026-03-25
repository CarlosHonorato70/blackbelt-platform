import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle, Clock, AlertCircle, XCircle, Mail, Users, BarChart3, ShieldCheck,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";

export default function CopsoqTracking() {
  usePageMeta({ title: "Respostas COPSOQ" });
  const { selectedTenant } = useTenant();
  const { data: user } = trpc.auth.me.useQuery();
  const effectiveId = (typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id) || user?.tenantId;

  // Fetch assessments for this tenant
  const assessmentsQuery = trpc.assessments.list.useQuery(undefined, { enabled: !!effectiveId });
  const assessments = assessmentsQuery.data || [];

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);

  // Auto-select latest assessment
  useEffect(() => {
    if (assessments.length > 0 && !selectedAssessmentId) {
      setSelectedAssessmentId(assessments[0].id);
    }
  }, [assessments, selectedAssessmentId]);

  // Fetch invites for selected assessment
  const invitesQuery = trpc.webhook.getResponseStats.useQuery(
    { assessmentId: selectedAssessmentId || "" },
    { enabled: !!selectedAssessmentId }
  );

  const responsesQuery = trpc.webhook.listResponses.useQuery(
    { assessmentId: selectedAssessmentId || "", tenantId: effectiveId || "" },
    { enabled: !!selectedAssessmentId && !!effectiveId }
  );

  const stats = invitesQuery.data;
  const responses = responsesQuery.data || [];

  if (!effectiveId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending": case "sent": return <Clock className="w-5 h-5 text-yellow-500" />;
      case "expired": return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-green-100 text-green-800">Respondido</Badge>;
      case "pending": case "sent": return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case "expired": return <Badge className="bg-red-100 text-red-800">Expirado</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getRiskBadge = (level: string) => {
    const map: Record<string, { label: string; className: string }> = {
      critical: { label: "Crítico", className: "bg-red-100 text-red-800 border-red-200" },
      high: { label: "Alto", className: "bg-orange-100 text-orange-800 border-orange-200" },
      medium: { label: "Médio", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      low: { label: "Baixo", className: "bg-green-100 text-green-800 border-green-200" },
    };
    const r = map[level] || { label: "N/A", className: "bg-gray-100 text-gray-500" };
    return <Badge className={r.className}>{r.label}</Badge>;
  };

  const getScoreBar = (score: number | null | undefined, label: string) => {
    if (score == null) return null;
    const color = score >= 75 ? "bg-red-500" : score >= 50 ? "bg-yellow-500" : "bg-green-500";
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-20 text-gray-600">{label}</span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div className={`${color} rounded-full h-2`} style={{ width: `${Math.min(score, 100)}%` }} />
        </div>
        <span className="w-8 text-right font-medium">{score}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Respostas COPSOQ-II</h1>
        <p className="text-gray-600 mt-2">
          Acompanhe o status de resposta e visualize os resultados anônimos da avaliação
        </p>
      </div>

      {/* Aviso de Anonimato */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          <strong>Sigilo garantido:</strong> As respostas são anônimas. Não é possível identificar qual colaborador respondeu cada questionário.
        </p>
      </div>

      {/* Seletor de Avaliação */}
      {assessments.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selecionar Avaliação</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            {assessments.map((a: any) => (
              <Button
                key={a.id}
                variant={selectedAssessmentId === a.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAssessmentId(a.id)}
              >
                {a.title || a.id}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Convites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">{stats.totalInvites}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Respondidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.responded}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taxa de Resposta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.responseRate}%</div>
              <Progress value={stats.responseRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela Anônima */}
      {selectedAssessmentId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Respostas Anônimas
            </CardTitle>
            <CardDescription>
              Resultados individuais sem identificação do respondente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responsesQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : responses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhuma resposta encontrada para esta avaliação.</div>
            ) : (
              <div className="space-y-4">
                {responses.map((r: any) => (
                  <Card key={r.inviteId} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(r.status)}
                          <span className="font-medium text-gray-700">{r.respondentLabel}</span>
                          {getStatusBadge(r.status)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {r.completedAt
                            ? `Respondido em ${new Date(r.completedAt).toLocaleDateString("pt-BR")}`
                            : r.sentAt
                            ? `Enviado em ${new Date(r.sentAt).toLocaleDateString("pt-BR")}`
                            : "—"
                          }
                        </div>
                      </div>

                      {r.response && (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">Nível de Risco Geral:</span>
                            {getRiskBadge(r.response.overallRiskLevel)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {getScoreBar(r.response.demandScore, "Demanda")}
                            {getScoreBar(r.response.controlScore, "Controle")}
                            {getScoreBar(r.response.supportScore, "Apoio")}
                            {getScoreBar(r.response.leadershipScore, "Liderança")}
                            {getScoreBar(r.response.communityScore, "Comunidade")}
                            {getScoreBar(r.response.meaningScore, "Significado")}
                            {getScoreBar(r.response.burnoutScore, "Burnout")}
                          </div>
                        </div>
                      )}

                      {!r.response && (r.status === "pending" || r.status === "sent") && (
                        <div className="mt-3 text-sm text-gray-400 italic">
                          Aguardando resposta do colaborador...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {assessments.length === 0 && !assessmentsQuery.isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Nenhuma avaliação COPSOQ-II encontrada para esta empresa.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
