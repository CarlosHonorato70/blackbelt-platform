import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import {
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  Loader2,
  Plus,
  Calendar,
  FileDown,
} from "lucide-react";
import { usePdfExport } from "@/hooks/usePdfExport";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; badgeClass: string }> = {
  pending: {
    label: "Pendente",
    icon: Clock,
    color: "text-gray-500",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
  },
  in_progress: {
    label: "Em Andamento",
    icon: Play,
    color: "text-blue-500",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  completed: {
    label: "Concluído",
    icon: CheckCircle2,
    color: "text-green-500",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
  },
  overdue: {
    label: "Atrasado",
    icon: AlertCircle,
    color: "text-red-500",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
  },
};

export default function ComplianceTimeline() {
  usePageMeta({ title: "Cronograma NR-01" });
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

  const listQuery = trpc.complianceTimeline.list.useQuery({ tenantId });
  const progressQuery = trpc.complianceTimeline.getProgress.useQuery({ tenantId });

  const seedMutation = trpc.complianceTimeline.seedDefaults.useMutation({
    onSuccess: () => {
      toast.success("Cronograma padrão NR-01 criado com sucesso!");
      listQuery.refetch();
      progressQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao criar cronograma");
    },
  });

  const updateMutation = trpc.complianceTimeline.update.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      listQuery.refetch();
      progressQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao atualizar status");
    },
  });

  const milestones = listQuery.data ?? [];
  const progress = progressQuery.data;

  const completedCount = progress?.completedCount ?? 0;
  const totalCount = progress?.totalCount ?? 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  function handleStatusChange(milestoneId: string, newStatus: string) {
    updateMutation.mutate({ id: milestoneId, tenantId: tenantId!, status: newStatus });
  }

  const isLoading = listQuery.isLoading || progressQuery.isLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Cronograma NR-01</h1>
              <p className="text-muted-foreground">
                Acompanhe as etapas de conformidade com a NR-01
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isExporting || !tenantId}
            onClick={() => exportPdf(() => trpc.nr01Pdf.exportComplianceTimeline.mutate({ tenantId: tenantId! }))}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar PDF"}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : milestones.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CalendarClock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhum cronograma encontrado</p>
              <p className="text-muted-foreground mb-6">
                Crie o cronograma padrão com as etapas exigidas pela NR-01.
              </p>
              <Button
                onClick={() => seedMutation.mutate({ tenantId: tenantId! })}
                disabled={seedMutation.isPending}
              >
                {seedMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Criar Cronograma Padrão NR-01
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Progress Bar */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Progresso Geral</p>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} de {totalCount} etapas concluídas
                  </p>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {progressPercent}% concluído
                </p>
              </CardContent>
            </Card>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

              <div className="space-y-4">
                {milestones.map((milestone: any) => {
                  const statusConfig = STATUS_CONFIG[milestone.status] ?? STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div key={milestone.id} className="relative flex gap-4 pl-2">
                      {/* Icon */}
                      <div
                        className={`z-10 flex-shrink-0 w-9 h-9 rounded-full bg-white border-2 flex items-center justify-center ${statusConfig.color}`}
                      >
                        <StatusIcon className="h-4 w-4" />
                      </div>

                      {/* Card */}
                      <Card className="flex-1">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold">{milestone.title}</h3>
                              {milestone.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {milestone.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-3">
                                <Badge variant="outline" className={statusConfig.badgeClass}>
                                  {statusConfig.label}
                                </Badge>
                                {milestone.category && (
                                  <Badge variant="secondary">{milestone.category}</Badge>
                                )}
                                {milestone.targetDate && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(milestone.targetDate).toLocaleDateString("pt-BR")}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Status change */}
                            <Select
                              value={milestone.status}
                              onValueChange={(v) => handleStatusChange(milestone.id, v)}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="in_progress">Em Andamento</SelectItem>
                                <SelectItem value="completed">Concluído</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Deadline */}
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <span className="font-semibold text-orange-800">
                    Prazo final: 26 de maio de 2026
                  </span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
