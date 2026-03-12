import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { usePageMeta } from "@/hooks/usePageMeta";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  action_plan: "Plano de Ação",
  compliance_doc: "Documento",
  assessment: "Avaliação",
  certificate: "Certificado",
  milestone: "Marco",
};

const ENTITY_TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  action_plan: "default",
  compliance_doc: "secondary",
  assessment: "outline",
  certificate: "default",
  milestone: "secondary",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  sent: { label: "Enviado", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
  acknowledged: { label: "Confirmado", className: "bg-green-100 text-green-800 hover:bg-green-100" },
  expired: { label: "Expirado", className: "bg-gray-100 text-gray-800 hover:bg-gray-100" },
};

export default function DeadlineAlerts() {
  usePageMeta({ title: "Alertas de Prazos" });
  const { selectedTenant } = useTenant();
  const tenantId = typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id;
  const [activeTab, setActiveTab] = useState<"upcoming" | "all">("upcoming");

  const allAlertsQuery = trpc.deadlineAlerts.list.useQuery(
    { tenantId: tenantId! },
    { enabled: !!tenantId }
  );

  const upcomingQuery = trpc.deadlineAlerts.getUpcoming.useQuery(
    { tenantId: tenantId!, days: 30 },
    { enabled: !!tenantId }
  );

  const autoGenerateMutation = trpc.deadlineAlerts.autoGenerate.useMutation({
    onSuccess: () => {
      toast.success("Alertas gerados com sucesso!");
      allAlertsQuery.refetch();
      upcomingQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const acknowledgeMutation = trpc.deadlineAlerts.acknowledge.useMutation({
    onSuccess: () => {
      toast.success("Alerta confirmado!");
      allAlertsQuery.refetch();
      upcomingQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

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

  const alerts = activeTab === "upcoming" ? upcomingQuery.data : allAlertsQuery.data;
  const isLoading = activeTab === "upcoming" ? upcomingQuery.isLoading : allAlertsQuery.isLoading;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BellRing className="h-6 w-6" />
              Alertas de Prazos
            </h1>
            <p className="text-muted-foreground">
              Gerencie alertas e notificações de prazos importantes
            </p>
          </div>
          <Button
            onClick={() => autoGenerateMutation.mutate({ tenantId: tenantId! })}
            disabled={autoGenerateMutation.isPending}
          >
            {autoGenerateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Gerar Alertas Automáticos
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={activeTab === "upcoming" ? "default" : "outline"}
            onClick={() => setActiveTab("upcoming")}
          >
            <Clock className="mr-2 h-4 w-4" />
            Próximos 30 dias
          </Button>
          <Button
            variant={activeTab === "all" ? "default" : "outline"}
            onClick={() => setActiveTab("all")}
          >
            <Bell className="mr-2 h-4 w-4" />
            Todos
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === "upcoming" ? "Alertas dos Próximos 30 Dias" : "Todos os Alertas"}
            </CardTitle>
            <CardDescription>
              {activeTab === "upcoming"
                ? "Prazos que vencem nos próximos 30 dias"
                : "Histórico completo de alertas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !alerts || (alerts as any[]).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum alerta encontrado.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(alerts as any[]).map((alert: any) => {
                    const statusCfg = STATUS_CONFIG[alert.status] || STATUS_CONFIG.pending;
                    return (
                      <TableRow key={alert.id}>
                        <TableCell className="max-w-[300px] truncate">
                          {alert.message}
                        </TableCell>
                        <TableCell>
                          {new Date(alert.alertDate).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={ENTITY_TYPE_VARIANTS[alert.entityType] || "outline"}>
                            {ENTITY_TYPE_LABELS[alert.entityType] || alert.entityType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusCfg.className}>
                            {statusCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{alert.channel || "—"}</TableCell>
                        <TableCell className="text-right">
                          {alert.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                acknowledgeMutation.mutate({
                                  id: alert.id,
                                  tenantId: tenantId!,
                                })
                              }
                              disabled={acknowledgeMutation.isPending}
                            >
                              {acknowledgeMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="mr-1 h-4 w-4" />
                                  Confirmar
                                </>
                              )}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
