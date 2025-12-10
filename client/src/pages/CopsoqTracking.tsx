import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Mail,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth.tsx";

export default function CopsoqTracking() {
  const { user } = useAuth();
  const [assessmentId, setAssessmentId] = useState("");
  const [selectedAssessment, setSelectedAssessment] = useState<string | null>(
    null
  );

  // Buscar estatísticas de resposta
  const statsQuery = trpc.webhook.getResponseStats.useQuery(
    { assessmentId: selectedAssessment || "" },
    { enabled: !!selectedAssessment }
  );

  // Buscar lista de respostas
  const responsesQuery = trpc.webhook.listResponses.useQuery(
    {
      assessmentId: selectedAssessment || "",
      tenantId: user?.id || "default-tenant",
    },
    { enabled: !!selectedAssessment && !!user?.id }
  );

  const stats = statsQuery.data;
  const responses = responsesQuery.data || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-gray-400" />;
      case "expired":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className="bg-green-100 text-green-800">Respondido</Badge>
        );
      case "pending":
        return <Badge className="bg-gray-100 text-gray-800">Pendente</Badge>;
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Expirado</Badge>;
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Visualizado</Badge>
        );
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-red-600 font-bold";
      case "high":
        return "text-orange-600 font-bold";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getRiskLevelLabel = (level: string) => {
    switch (level) {
      case "critical":
        return "Crítico";
      case "high":
        return "Alto";
      case "medium":
        return "Médio";
      case "low":
        return "Baixo";
      default:
        return "N/A";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Rastreamento de Respostas COPSOQ-II
        </h1>
        <p className="text-gray-600 mt-2">
          Acompanhe o status de resposta dos colaboradores e visualize os
          resultados das avaliações
        </p>
      </div>

      {/* Seletor de Avaliação */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Avaliação</CardTitle>
          <CardDescription>
            Digite o ID da avaliação para visualizar o rastreamento de respostas
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="ID da Avaliação (ex: copsoq_assess_...)"
            value={assessmentId}
            onChange={e => setAssessmentId(e.target.value)}
          />
          <Button
            onClick={() => setSelectedAssessment(assessmentId)}
            disabled={!assessmentId}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Carregar
          </Button>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Convites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvites}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Respondidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.responded}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Taxa de Resposta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.responseRate}%</div>
              <Progress value={stats.responseRate} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela de Respostas */}
      {selectedAssessment && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes de Respostas</CardTitle>
            <CardDescription>
              Lista completa de respondentes e status de resposta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {responsesQuery.isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Carregando respostas...</p>
              </div>
            ) : responses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma resposta encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data de Envio</TableHead>
                      <TableHead>Data de Resposta</TableHead>
                      <TableHead>Nível de Risco</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map(response => (
                      <TableRow key={response.inviteId}>
                        <TableCell className="font-medium">
                          {response.respondentName}
                        </TableCell>
                        <TableCell>{response.respondentEmail}</TableCell>
                        <TableCell>
                          {response.respondentPosition || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(response.status)}
                            {getStatusBadge(response.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {response.sentAt
                            ? new Date(response.sentAt).toLocaleDateString(
                                "pt-BR"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {response.completedAt
                            ? new Date(response.completedAt).toLocaleDateString(
                                "pt-BR"
                              )
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {response.response ? (
                            <span
                              className={getRiskLevelColor(
                                response.response.overallRiskLevel || "low"
                              )}
                            >
                              {getRiskLevelLabel(
                                response.response.overallRiskLevel || "low"
                              )}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {response.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              Reenviar
                            </Button>
                          )}
                          {response.status === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                            >
                              Ver Resultado
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
    </div>
  );
}
