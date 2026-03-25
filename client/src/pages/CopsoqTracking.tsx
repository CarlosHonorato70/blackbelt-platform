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
  CheckCircle, Clock, AlertCircle, XCircle, Mail, Users, BarChart3,
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

  const getRiskLabel = (level: string) => {
    const map: Record<string, { label: string; color: string }> = {
      critical: { label: "Crítico", color: "text-red-600 font-bold" },
      high: { label: "Alto", color: "text-orange-600 font-bold" },
      medium: { label: "Médio", color: "text-yellow-600" },
      low: { label: "Baixo", color: "text-green-600" },
    };
    const r = map[level] || { label: "N/A", color: "text-gray-500" };
    return <span className={r.color}>{r.label}</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Respostas COPSOQ-II</h1>
        <p className="text-gray-600 mt-2">
          Acompanhe o status de resposta dos colaboradores e visualize os resultados individuais
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

      {/* Tabela */}
      {selectedAssessmentId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Respostas Individuais
            </CardTitle>
            <CardDescription>
              Status de cada colaborador convidado para a avaliação COPSOQ-II
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responsesQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">Carregando...</div>
            ) : responses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Nenhuma resposta encontrada para esta avaliação.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Envio</TableHead>
                      <TableHead>Resposta</TableHead>
                      <TableHead>Nível de Risco</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((r: any) => (
                      <TableRow key={r.inviteId || r.id}>
                        <TableCell className="font-medium">{r.respondentName || "—"}</TableCell>
                        <TableCell>{r.respondentEmail}</TableCell>
                        <TableCell>{r.respondentPosition || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(r.status)}
                            {getStatusBadge(r.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {r.sentAt ? new Date(r.sentAt).toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell>
                          {r.completedAt ? new Date(r.completedAt).toLocaleDateString("pt-BR") : "—"}
                        </TableCell>
                        <TableCell>
                          {r.response?.overallRiskLevel ? getRiskLabel(r.response.overallRiskLevel) : "—"}
                        </TableCell>
                        <TableCell>
                          {(r.status === "pending" || r.status === "sent") && (
                            <Button size="sm" variant="outline" className="text-xs">
                              <Mail className="w-3 h-3 mr-1" /> Reenviar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
