import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Shield,
  AlertTriangle,
  Activity,
  Ban,
  Clock,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Globe,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export default function SecurityDashboard() {
  const { selectedTenant } = useTenant();

  // Local state for add-IP form
  const [newIP, setNewIP] = useState("");
  const [newIPDescription, setNewIPDescription] = useState("");

  // ── tRPC Queries ──────────────────────────────────────────────────────
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = trpc.security.getSecurityStats.useQuery(undefined, {
    enabled: !!selectedTenant,
  });

  const {
    data: alerts = [],
    isLoading: alertsLoading,
    refetch: refetchAlerts,
  } = trpc.security.listAlerts.useQuery(
    { page: 1, perPage: 50 },
    { enabled: !!selectedTenant }
  );

  const {
    data: loginAttempts = [],
    refetch: refetchLogins,
  } = trpc.security.listLoginAttempts.useQuery(
    { page: 1, perPage: 50 },
    { enabled: !!selectedTenant }
  );

  const {
    data: whitelistedIPs = [],
    refetch: refetchIPs,
  } = trpc.security.listWhitelistedIPs.useQuery(undefined, {
    enabled: !!selectedTenant,
  });

  // ── tRPC Mutations ────────────────────────────────────────────────────
  const resolveAlertMutation = trpc.security.resolveAlert.useMutation({
    onSuccess: () => {
      toast.success("Alerta resolvido");
      refetchAlerts();
      refetchStats();
    },
    onError: (err) =>
      toast.error("Erro ao resolver alerta", { description: err.message }),
  });

  const addIPMutation = trpc.security.addWhitelistedIP.useMutation({
    onSuccess: () => {
      toast.success("IP adicionado à whitelist");
      setNewIP("");
      setNewIPDescription("");
      refetchIPs();
      refetchStats();
    },
    onError: (err) =>
      toast.error("Erro ao adicionar IP", { description: err.message }),
  });

  const removeIPMutation = trpc.security.removeWhitelistedIP.useMutation({
    onSuccess: () => {
      toast.success("IP removido da whitelist");
      refetchIPs();
      refetchStats();
    },
    onError: (err) =>
      toast.error("Erro ao remover IP", { description: err.message }),
  });

  // ── Helpers ───────────────────────────────────────────────────────────
  const formatTimeAgo = (timestamp: string | Date) => {
    const seconds = Math.floor(
      (Date.now() - new Date(timestamp).getTime()) / 1000
    );
    if (seconds < 60) return `${seconds}s atrás`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m atrás`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h atrás`;
    return `${Math.floor(seconds / 86400)}d atrás`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const handleRefreshAll = () => {
    refetchStats();
    refetchAlerts();
    refetchLogins();
    refetchIPs();
    toast.success("Dados atualizados");
  };

  const handleAddIP = () => {
    if (!newIP.trim()) {
      toast.error("Informe um endereço IP");
      return;
    }
    addIPMutation.mutate({
      ipAddress: newIP.trim(),
      description: newIPDescription.trim() || undefined,
    });
  };

  // ── No tenant guard ───────────────────────────────────────────────────
  if (!selectedTenant) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Nenhuma empresa selecionada</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Selecione uma empresa para visualizar o painel de segurança
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────
  if (statsLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            Carregando painel de segurança...
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Painel de Segurança
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitore alertas de segurança, tentativas de login e IPs autorizados
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Alertas (30 dias)
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.totalAlerts ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Alertas Pendentes
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.unresolvedAlerts ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando resolução
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Sessões Ativas
              </CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeSessions ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Sessões em andamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Falhas de Login
              </CardTitle>
              <Ban className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.failedLoginAttempts ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tentativas falhadas (30 dias)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                IPs na Whitelist
              </CardTitle>
              <Globe className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.whitelistedIPs ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                IPs autorizados ativos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Alertas Críticos
              </CardTitle>
              <Shield className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.alertsBySeverity?.critical ?? 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Severidade crítica (30 dias)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="alerts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="alerts">Alertas de Segurança</TabsTrigger>
            <TabsTrigger value="logins">Tentativas de Login</TabsTrigger>
            <TabsTrigger value="whitelist">IPs Whitelist</TabsTrigger>
          </TabsList>

          {/* ── Alertas de Segurança ─────────────────────────────────── */}
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alertas Recentes</CardTitle>
                <CardDescription>
                  Alertas de segurança gerados nos últimos 30 dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alertsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhum alerta de segurança encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(alerts as any[]).map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start justify-between border-b pb-4 last:border-0"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                getSeverityColor(alert.severity) as any
                              }
                            >
                              {alert.severity}
                            </Badge>
                            {alert.resolved && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolvido
                              </Badge>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {formatTimeAgo(alert.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm font-medium">
                            {alert.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {alert.ipAddress && <>IP: {alert.ipAddress} &bull; </>}
                            Tipo: {alert.alertType}
                          </p>
                        </div>
                        {!alert.resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-4 shrink-0"
                            disabled={resolveAlertMutation.isPending}
                            onClick={() =>
                              resolveAlertMutation.mutate({
                                alertId: alert.id,
                              })
                            }
                          >
                            {resolveAlertMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <CheckCircle className="h-3 w-3 mr-1" />
                            )}
                            Resolver
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tentativas de Login ──────────────────────────────────── */}
          <TabsContent value="logins" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tentativas de Login</CardTitle>
                <CardDescription>
                  Registro de tentativas de autenticação recentes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(loginAttempts as any[]).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhuma tentativa de login registrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(loginAttempts as any[]).map((attempt) => (
                      <div
                        key={attempt.id}
                        className="flex items-center justify-between border-b pb-4 last:border-0"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {attempt.success ? (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Sucesso
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Falha
                              </Badge>
                            )}
                            <span className="text-sm font-medium">
                              {attempt.email}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatTimeAgo(attempt.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {attempt.ipAddress && <>IP: {attempt.ipAddress} &bull; </>}
                            {attempt.userAgent && (
                              <span className="truncate max-w-xs inline-block align-bottom">
                                UA: {attempt.userAgent}
                              </span>
                            )}
                          </p>
                          {attempt.failureReason && (
                            <p className="text-xs text-destructive">
                              Motivo: {attempt.failureReason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── IPs Whitelist ────────────────────────────────────────── */}
          <TabsContent value="whitelist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>IPs Autorizados (Whitelist)</CardTitle>
                <CardDescription>
                  Endereços IP autorizados para acesso à plataforma
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add new IP form */}
                <div className="flex items-end gap-3 p-4 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Endereço IP
                    </label>
                    <Input
                      placeholder="ex: 192.168.1.100"
                      value={newIP}
                      onChange={(e) => setNewIP(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Descrição (opcional)
                    </label>
                    <Input
                      placeholder="ex: Escritório principal"
                      value={newIPDescription}
                      onChange={(e) => setNewIPDescription(e.target.value)}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddIP}
                    disabled={addIPMutation.isPending}
                  >
                    {addIPMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1" />
                    )}
                    Adicionar
                  </Button>
                </div>

                {/* IP list */}
                {(whitelistedIPs as any[]).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Globe className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhum IP na whitelist</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(whitelistedIPs as any[]).map((ip) => (
                      <div
                        key={ip.id}
                        className="flex items-center justify-between border-b pb-4 last:border-0"
                      >
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-mono font-medium">
                            {ip.ipAddress}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ip.description || "Sem descrição"}
                            {ip.createdAt && (
                              <> &bull; Adicionado {formatTimeAgo(ip.createdAt)}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={ip.active ? "default" : "secondary"}>
                            {ip.active ? "Ativo" : "Inativo"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={removeIPMutation.isPending}
                            onClick={() =>
                              removeIPMutation.mutate({ id: ip.id })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rate Limiting Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração de Rate Limiting</CardTitle>
            <CardDescription>
              Regras de limitação de requisições aplicadas aos endpoints da API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">API Geral</p>
                  <p className="text-xs text-muted-foreground">
                    /api/* endpoints
                  </p>
                </div>
                <Badge variant="outline">100 req / 15 min</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Autenticação</p>
                  <p className="text-xs text-muted-foreground">
                    /api/auth/* endpoints
                  </p>
                </div>
                <Badge variant="outline">5 req / 15 min</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Envio de Email</p>
                  <p className="text-xs text-muted-foreground">
                    Endpoints de envio de email
                  </p>
                </div>
                <Badge variant="outline">10 req / 1 hora</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Upload de Arquivos</p>
                  <p className="text-xs text-muted-foreground">
                    Endpoints de upload
                  </p>
                </div>
                <Badge variant="outline">20 req / 1 hora</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
