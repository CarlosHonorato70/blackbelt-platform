import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Mail, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function ReminderManagement() {
  const [selectedAssessment, setSelectedAssessment] = useState<string>("");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");

  // Listar avaliações
  const assessmentsQuery = trpc.assessments.list.useQuery(
    { tenantId: selectedTenantId },
    { enabled: !!selectedTenantId }
  );

  // Listar lembretes
  const remindersQuery = trpc.reminders.listByAssessment.useQuery(
    { assessmentId: selectedAssessment },
    { enabled: !!selectedAssessment }
  );

  // Obter estatísticas
  const statsQuery = trpc.reminders.getStatistics.useQuery(
    { assessmentId: selectedAssessment },
    { enabled: !!selectedAssessment }
  );

  // Trigger agendador
  const triggerMutation = trpc.reminders.triggerScheduler.useMutation({
    onSuccess: () => {
      remindersQuery.refetch();
      statsQuery.refetch();
    },
  });

  // Enviar lembrete manual
  const sendReminderMutation = trpc.reminders.sendManualReminder.useMutation({
    onSuccess: () => {
      remindersQuery.refetch();
      statsQuery.refetch();
    },
  });

  const assessments = assessmentsQuery.data || [];
  const reminders = remindersQuery.data || [];
  const stats = statsQuery.data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "bounced":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 className="w-4 h-4" />;
      case "failed":
        return <XCircle className="w-4 h-4" />;
      case "bounced":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de Lembretes</h1>
        <p className="text-gray-600 mt-2">
          Acompanhe e gerencie lembretes automáticos para colaboradores que ainda não responderam
        </p>
      </div>

      {/* Seleção de Avaliação */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Avaliação</CardTitle>
          <CardDescription>Escolha uma avaliação para gerenciar lembretes</CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={selectedAssessment}
            onChange={(e) => setSelectedAssessment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Selecione uma avaliação --</option>
            {assessments.map((assessment: any) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.title} ({assessment.status})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedAssessment && stats && (
        <>
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total de Convites</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalInvites}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {stats.completedInvites} respondidos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Resposta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.responseRate}%</div>
                <p className="text-xs text-gray-600 mt-1">
                  {stats.pendingInvites} pendentes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Lembretes Enviados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalReminders}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {stats.failedReminders} falhados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Média por Convite</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageRemindersPerInvite}</div>
                <p className="text-xs text-gray-600 mt-1">lembretes por pessoa</p>
              </CardContent>
            </Card>
          </div>

          {/* Ações */}
          <Card>
            <CardHeader>
              <CardTitle>Ações</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button
                onClick={() => triggerMutation.mutate()}
                disabled={triggerMutation.isPending}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {triggerMutation.isPending ? "Executando..." : "Executar Agendador"}
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                O agendador verifica automaticamente a cada 1 hora e envia lembretes conforme necessário.
              </p>
            </CardContent>
          </Card>

          {/* Tabela de Lembretes */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Lembretes</CardTitle>
              <CardDescription>
                Últimos lembretes enviados para esta avaliação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reminders.length === 0 ? (
                <p className="text-gray-600 text-center py-8">
                  Nenhum lembrete enviado ainda para esta avaliação
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Respondente</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Lembrete</TableHead>
                        <TableHead>Data de Envio</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Próximo Lembrete</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reminders.map((reminder: any) => (
                        <TableRow key={reminder.id}>
                          <TableCell className="font-medium">
                            {reminder.respondentName}
                          </TableCell>
                          <TableCell>{reminder.respondentEmail}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {reminder.reminderNumber}º Lembrete
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(reminder.sentAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(reminder.status)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(reminder.status)}
                                {reminder.status === "sent" && "Enviado"}
                                {reminder.status === "failed" && "Falha"}
                                {reminder.status === "bounced" && "Rejeitado"}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {reminder.nextReminderAt
                              ? new Date(reminder.nextReminderAt).toLocaleDateString("pt-BR")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base">Como Funciona o Sistema de Lembretes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-900 space-y-2">
              <p>
                • <strong>1º Lembrete:</strong> Enviado 2 dias após o convite inicial
              </p>
              <p>
                • <strong>2º Lembrete:</strong> Enviado 5 dias após o convite inicial
              </p>
              <p>
                • <strong>3º Lembrete:</strong> Enviado 9 dias após o convite inicial
              </p>
              <p>
                • <strong>Expiração:</strong> Convites expiram após 14 dias
              </p>
              <p>
                • <strong>Automático:</strong> O agendador executa automaticamente a cada 1 hora
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
