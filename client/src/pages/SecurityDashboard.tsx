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
  Monitor,
  Key,
  Smartphone,
  Copy,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export default function SecurityDashboard() {
  const { selectedTenant } = useTenant();
  const { data: user } = trpc.auth.me.useQuery();
  const effectiveId = (typeof selectedTenant === "string" ? selectedTenant : selectedTenant?.id) || user?.tenantId;

  // Local state for add-IP form
  const [newIP, setNewIP] = useState("");
  const [newIPDescription, setNewIPDescription] = useState("");

  // 2FA state
  const [twoFAStep, setTwoFAStep] = useState<"idle" | "setup" | "verify" | "backup">("idle");
  const [twoFASecret, setTwoFASecret] = useState("");
  const [twoFAQrUrl, setTwoFAQrUrl] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFABackupCodes, setTwoFABackupCodes] = useState<string[]>([]);
  const [twoFADisableCode, setTwoFADisableCode] = useState("");
  const [twoFARegenCode, setTwoFARegenCode] = useState("");

  // ── tRPC Queries ──────────────────────────────────────────────────────
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = trpc.security.getSecurityStats.useQuery(undefined, {
    enabled: !!effectiveId,
  });

  const {
    data: alerts = [],
    isLoading: alertsLoading,
    refetch: refetchAlerts,
  } = trpc.security.listAlerts.useQuery(
    { page: 1, perPage: 50 },
    { enabled: !!effectiveId }
  );

  const {
    data: loginAttempts = [],
    refetch: refetchLogins,
  } = trpc.security.listLoginAttempts.useQuery(
    { page: 1, perPage: 50 },
    { enabled: !!effectiveId }
  );

  const {
    data: whitelistedIPs = [],
    refetch: refetchIPs,
  } = trpc.security.listWhitelistedIPs.useQuery(undefined, {
    enabled: !!effectiveId,
  });

  const {
    data: activeSessions = [],
    refetch: refetchSessions,
  } = (trpc as any).security.listSessions.useQuery(undefined, {
    enabled: !!effectiveId,
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

  const revokeSessionMutation = (trpc as any).security.revokeSession.useMutation({
    onSuccess: () => {
      toast.success("Sessão revogada");
      refetchSessions();
      refetchStats();
    },
    onError: (err: any) =>
      toast.error("Erro ao revogar sessão", { description: err.message }),
  });

  const revokeAllSessionsMutation = (trpc as any).security.revokeAllSessions.useMutation({
    onSuccess: () => {
      toast.success("Todas as sessões foram revogadas");
      refetchSessions();
      refetchStats();
    },
    onError: (err: any) =>
      toast.error("Erro ao revogar sessões", { description: err.message }),
  });

  // ── 2FA tRPC ─────────────────────────────────────────────────────────
  const {
    data: twoFAStatus,
    isLoading: twoFALoading,
    refetch: refetchTwoFA,
  } = (trpc as any).twoFactor.getStatus.useQuery(undefined, {
    enabled: !!effectiveId,
  });

  const enableTwoFAMutation = (trpc as any).twoFactor.enable.useMutation({
    onSuccess: (data: any) => {
      setTwoFASecret(data.secret);
      setTwoFAQrUrl(data.qrCodeURL);
      setTwoFAStep("setup");
      toast.success("Escaneie o QR code com seu app autenticador");
    },
    onError: (err: any) =>
      toast.error("Erro ao ativar 2FA", { description: err.message }),
  });

  const verifyTwoFAMutation = (trpc as any).twoFactor.verify.useMutation({
    onSuccess: (data: any) => {
      setTwoFABackupCodes(data.backupCodes);
      setTwoFAStep("backup");
      setTwoFACode("");
      refetchTwoFA();
      toast.success("2FA ativado com sucesso!");
    },
    onError: (err: any) =>
      toast.error("Codigo invalido", { description: err.message }),
  });

  const disableTwoFAMutation = (trpc as any).twoFactor.disable.useMutation({
    onSuccess: () => {
      setTwoFAStep("idle");
      setTwoFADisableCode("");
      refetchTwoFA();
      toast.success("2FA desativado");
    },
    onError: (err: any) =>
      toast.error("Erro ao desativar 2FA", { description: err.message }),
  });

  const regenBackupMutation = (trpc as any).twoFactor.regenerateBackupCodes.useMutation({
    onSuccess: (data: any) => {
      setTwoFABackupCodes(data.backupCodes);
      setTwoFAStep("backup");
      setTwoFARegenCode("");
      toast.success("Codigos de backup regenerados");
    },
    onError: (err: any) =>
      toast.error("Erro ao regenerar codigos", { description: err.message }),
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
    refetchSessions();
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
  if (!effectiveId) {
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
            <TabsTrigger value="sessions">Sessões Ativas</TabsTrigger>
            <TabsTrigger value="2fa">Autenticação 2FA</TabsTrigger>
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

          {/* ── Sessões Ativas ─────────────────────────────────────── */}
          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Sessões Ativas</CardTitle>
                  <CardDescription>
                    Gerencie as sessões conectadas à sua conta
                  </CardDescription>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={revokeAllSessionsMutation.isPending}
                  onClick={() =>
                    revokeAllSessionsMutation.mutate({ currentSessionId: "" })
                  }
                >
                  {revokeAllSessionsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Ban className="h-4 w-4 mr-1" />
                  )}
                  Revogar Todas
                </Button>
              </CardHeader>
              <CardContent>
                {(activeSessions as any[]).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Monitor className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Nenhuma sessão ativa encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(activeSessions as any[]).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between border-b pb-4 last:border-0"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={session.active ? "default" : "secondary"}>
                              {session.active ? "Ativa" : "Inativa"}
                            </Badge>
                            <span className="text-sm font-medium font-mono">
                              {session.ipAddress || "IP desconhecido"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatTimeAgo(session.lastActivity || session.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-md">
                            UA: {session.userAgent || "Desconhecido"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Criada: {new Date(session.createdAt).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-4 shrink-0 text-destructive hover:text-destructive"
                          disabled={revokeSessionMutation.isPending}
                          onClick={() =>
                            revokeSessionMutation.mutate({ sessionId: session.id })
                          }
                        >
                          {revokeSessionMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          Revogar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Autenticacao 2FA ──────────────────────────────────── */}
          <TabsContent value="2fa" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5" />
                      Autenticacao em Duas Etapas (2FA)
                    </CardTitle>
                    <CardDescription>
                      Proteja sua conta com autenticacao TOTP via app autenticador
                    </CardDescription>
                  </div>
                  {twoFAStatus?.enabled && (
                    <Badge className="bg-green-600 text-white">
                      <Shield className="h-3 w-3 mr-1" />
                      2FA Ativo
                    </Badge>
                  )}
                  {!twoFAStatus?.enabled && !twoFALoading && (
                    <Badge variant="secondary">
                      2FA Inativo
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {twoFALoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !twoFAStatus?.enabled && twoFAStep === "idle" ? (
                  /* ── Not enabled, show enable button ── */
                  <div className="text-center py-6">
                    <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-4">
                      A autenticacao em duas etapas adiciona uma camada extra de seguranca a sua conta.
                    </p>
                    <Button
                      onClick={() => enableTwoFAMutation.mutate()}
                      disabled={enableTwoFAMutation.isPending}
                    >
                      {enableTwoFAMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Shield className="h-4 w-4 mr-2" />
                      )}
                      Ativar 2FA
                    </Button>
                  </div>
                ) : twoFAStep === "setup" ? (
                  /* ── Setup: QR code + secret + verify ── */
                  <div className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-sm text-muted-foreground text-center">
                        Escaneie o QR code abaixo com seu app autenticador (Google Authenticator, Authy, etc.)
                      </p>
                      <img
                        src={`https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(twoFAQrUrl)}`}
                        alt="QR Code 2FA"
                        className="border rounded-lg p-2"
                        width={200}
                        height={200}
                      />
                      <div className="w-full max-w-md">
                        <p className="text-xs text-muted-foreground mb-1 text-center">
                          Ou insira a chave manualmente:
                        </p>
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <code className="flex-1 text-sm font-mono text-center break-all">
                            {twoFASecret}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(twoFASecret);
                              toast.success("Chave copiada!");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="max-w-md mx-auto space-y-3">
                      <label className="text-sm font-medium">
                        Digite o codigo de 6 digitos do app:
                      </label>
                      <Input
                        type="text"
                        placeholder="000000"
                        value={twoFACode}
                        onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="text-center text-lg tracking-widest"
                        maxLength={6}
                      />
                      <Button
                        className="w-full"
                        onClick={() => verifyTwoFAMutation.mutate({ code: twoFACode })}
                        disabled={twoFACode.length !== 6 || verifyTwoFAMutation.isPending}
                      >
                        {verifyTwoFAMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Confirmar
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={() => {
                          setTwoFAStep("idle");
                          setTwoFACode("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : twoFAStep === "backup" ? (
                  /* ── Backup codes display ── */
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800 mb-2">
                        Salve seus codigos de backup em um local seguro!
                      </p>
                      <p className="text-xs text-yellow-700">
                        Estes codigos so serao exibidos uma vez. Use-os para acessar sua conta caso perca acesso ao app autenticador.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                      {twoFABackupCodes.map((code, i) => (
                        <div
                          key={i}
                          className="p-2 bg-muted rounded text-center font-mono text-sm"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(twoFABackupCodes.join("\n"));
                          toast.success("Codigos copiados!");
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Todos
                      </Button>
                      <Button
                        onClick={() => {
                          setTwoFAStep("idle");
                          setTwoFABackupCodes([]);
                        }}
                      >
                        Concluir
                      </Button>
                    </div>
                  </div>
                ) : twoFAStatus?.enabled ? (
                  /* ── Enabled state: disable + regenerate ── */
                  <div className="space-y-6">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <p className="text-sm font-medium text-green-800">
                          2FA esta ativo desde {twoFAStatus.verifiedAt
                            ? new Date(twoFAStatus.verifiedAt).toLocaleDateString("pt-BR")
                            : "data desconhecida"}
                        </p>
                      </div>
                      <p className="text-xs text-green-700">
                        Sua conta esta protegida com autenticacao em duas etapas.
                      </p>
                    </div>

                    {/* Disable 2FA */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Desativar 2FA</CardTitle>
                        <CardDescription>
                          Insira um codigo do app autenticador para desativar
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <Input
                              type="text"
                              placeholder="Codigo de 6 digitos ou backup"
                              value={twoFADisableCode}
                              onChange={(e) => setTwoFADisableCode(e.target.value)}
                              maxLength={12}
                            />
                          </div>
                          <Button
                            variant="destructive"
                            disabled={!twoFADisableCode || disableTwoFAMutation.isPending}
                            onClick={() => disableTwoFAMutation.mutate({ code: twoFADisableCode })}
                          >
                            {disableTwoFAMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-1" />
                            )}
                            Desativar 2FA
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Regenerate backup codes */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Regenerar Codigos de Backup</CardTitle>
                        <CardDescription>
                          Gere novos codigos de backup (os anteriores serao invalidados)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <Input
                              type="text"
                              placeholder="Codigo de 6 digitos"
                              value={twoFARegenCode}
                              onChange={(e) => setTwoFARegenCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              maxLength={6}
                            />
                          </div>
                          <Button
                            variant="outline"
                            disabled={twoFARegenCode.length !== 6 || regenBackupMutation.isPending}
                            onClick={() => regenBackupMutation.mutate({ code: twoFARegenCode })}
                          >
                            {regenBackupMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-1" />
                            )}
                            Regenerar Codigos
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
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

/**
 * SecurityDashboard content without DashboardLayout wrapper.
 * Used by AuditLogs page to embed security functionality as a tab.
 */
export function SecurityDashboardContent() {
  const { selectedTenant } = useTenant();

  // Local state for add-IP form
  const [newIP, setNewIP] = useState("");
  const [newIPDescription, setNewIPDescription] = useState("");

  // 2FA state
  const [twoFAStep, setTwoFAStep] = useState<"idle" | "setup" | "verify" | "backup">("idle");
  const [twoFASecret, setTwoFASecret] = useState("");
  const [twoFAQrUrl, setTwoFAQrUrl] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFABackupCodes, setTwoFABackupCodes] = useState<string[]>([]);
  const [twoFADisableCode, setTwoFADisableCode] = useState("");
  const [twoFARegenCode, setTwoFARegenCode] = useState("");

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = trpc.security.getSecurityStats.useQuery(undefined, {
    enabled: !!effectiveId,
  });

  const {
    data: alerts = [],
    isLoading: alertsLoading,
    refetch: refetchAlerts,
  } = trpc.security.listAlerts.useQuery(
    { page: 1, perPage: 50 },
    { enabled: !!effectiveId }
  );

  const {
    data: loginAttempts = [],
    refetch: refetchLogins,
  } = trpc.security.listLoginAttempts.useQuery(
    { page: 1, perPage: 50 },
    { enabled: !!effectiveId }
  );

  const {
    data: whitelistedIPs = [],
    refetch: refetchIPs,
  } = trpc.security.listWhitelistedIPs.useQuery(undefined, {
    enabled: !!effectiveId,
  });

  const {
    data: activeSessions = [],
    refetch: refetchSessions,
  } = (trpc as any).security.listSessions.useQuery(undefined, {
    enabled: !!effectiveId,
  });

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

  const revokeSessionMutation = (trpc as any).security.revokeSession.useMutation({
    onSuccess: () => {
      toast.success("Sessão revogada");
      refetchSessions();
      refetchStats();
    },
    onError: (err: any) =>
      toast.error("Erro ao revogar sessão", { description: err.message }),
  });

  const revokeAllSessionsMutation = (trpc as any).security.revokeAllSessions.useMutation({
    onSuccess: () => {
      toast.success("Todas as sessões foram revogadas");
      refetchSessions();
      refetchStats();
    },
    onError: (err: any) =>
      toast.error("Erro ao revogar sessões", { description: err.message }),
  });

  const {
    data: twoFAStatus,
    isLoading: twoFALoading,
    refetch: refetchTwoFA,
  } = (trpc as any).twoFactor.getStatus.useQuery(undefined, {
    enabled: !!effectiveId,
  });

  const enableTwoFAMutation = (trpc as any).twoFactor.enable.useMutation({
    onSuccess: (data: any) => {
      setTwoFASecret(data.secret);
      setTwoFAQrUrl(data.qrCodeURL);
      setTwoFAStep("setup");
      toast.success("Escaneie o QR code com seu app autenticador");
    },
    onError: (err: any) =>
      toast.error("Erro ao ativar 2FA", { description: err.message }),
  });

  const verifyTwoFAMutation = (trpc as any).twoFactor.verify.useMutation({
    onSuccess: (data: any) => {
      setTwoFABackupCodes(data.backupCodes);
      setTwoFAStep("backup");
      setTwoFACode("");
      refetchTwoFA();
      toast.success("2FA ativado com sucesso!");
    },
    onError: (err: any) =>
      toast.error("Codigo invalido", { description: err.message }),
  });

  const disableTwoFAMutation = (trpc as any).twoFactor.disable.useMutation({
    onSuccess: () => {
      setTwoFAStep("idle");
      setTwoFADisableCode("");
      refetchTwoFA();
      toast.success("2FA desativado");
    },
    onError: (err: any) =>
      toast.error("Erro ao desativar 2FA", { description: err.message }),
  });

  const regenBackupMutation = (trpc as any).twoFactor.regenerateBackupCodes.useMutation({
    onSuccess: (data: any) => {
      setTwoFABackupCodes(data.backupCodes);
      setTwoFAStep("backup");
      setTwoFARegenCode("");
      toast.success("Codigos de backup regenerados");
    },
    onError: (err: any) =>
      toast.error("Erro ao regenerar codigos", { description: err.message }),
  });

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
    refetchSessions();
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

  if (statsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm text-muted-foreground">
          Carregando painel de segurança...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Painel de Segurança
          </h2>
          <p className="text-muted-foreground text-sm">
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

      {/* Inner Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts">Alertas de Segurança</TabsTrigger>
          <TabsTrigger value="logins">Tentativas de Login</TabsTrigger>
          <TabsTrigger value="whitelist">IPs Whitelist</TabsTrigger>
          <TabsTrigger value="sessions">Sessões Ativas</TabsTrigger>
          <TabsTrigger value="2fa">Autenticação 2FA</TabsTrigger>
        </TabsList>

        {/* Alertas de Segurança */}
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

        {/* Tentativas de Login */}
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

        {/* IPs Whitelist */}
        <TabsContent value="whitelist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>IPs Autorizados (Whitelist)</CardTitle>
              <CardDescription>
                Endereços IP autorizados para acesso à plataforma
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

        {/* Sessões Ativas */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sessões Ativas</CardTitle>
                <CardDescription>
                  Gerencie as sessões conectadas à sua conta
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled={revokeAllSessionsMutation.isPending}
                onClick={() =>
                  revokeAllSessionsMutation.mutate({ currentSessionId: "" })
                }
              >
                {revokeAllSessionsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Ban className="h-4 w-4 mr-1" />
                )}
                Revogar Todas
              </Button>
            </CardHeader>
            <CardContent>
              {(activeSessions as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Nenhuma sessão ativa encontrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(activeSessions as any[]).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={session.active ? "default" : "secondary"}>
                            {session.active ? "Ativa" : "Inativa"}
                          </Badge>
                          <span className="text-sm font-medium font-mono">
                            {session.ipAddress || "IP desconhecido"}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {formatTimeAgo(session.lastActivity || session.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate max-w-md">
                          UA: {session.userAgent || "Desconhecido"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Criada: {new Date(session.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-4 shrink-0 text-destructive hover:text-destructive"
                        disabled={revokeSessionMutation.isPending}
                        onClick={() =>
                          revokeSessionMutation.mutate({ sessionId: session.id })
                        }
                      >
                        {revokeSessionMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <XCircle className="h-3 w-3 mr-1" />
                        )}
                        Revogar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Autenticacao 2FA */}
        <TabsContent value="2fa" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Autenticacao em Duas Etapas (2FA)
                  </CardTitle>
                  <CardDescription>
                    Proteja sua conta com autenticacao TOTP via app autenticador
                  </CardDescription>
                </div>
                {twoFAStatus?.enabled && (
                  <Badge className="bg-green-600 text-white">
                    <Shield className="h-3 w-3 mr-1" />
                    2FA Ativo
                  </Badge>
                )}
                {!twoFAStatus?.enabled && !twoFALoading && (
                  <Badge variant="secondary">
                    2FA Inativo
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {twoFALoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !twoFAStatus?.enabled && twoFAStep === "idle" ? (
                <div className="text-center py-6">
                  <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mb-4">
                    A autenticacao em duas etapas adiciona uma camada extra de seguranca a sua conta.
                  </p>
                  <Button
                    onClick={() => enableTwoFAMutation.mutate()}
                    disabled={enableTwoFAMutation.isPending}
                  >
                    {enableTwoFAMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    Ativar 2FA
                  </Button>
                </div>
              ) : twoFAStep === "setup" ? (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Escaneie o QR code abaixo com seu app autenticador (Google Authenticator, Authy, etc.)
                    </p>
                    <img
                      src={`https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(twoFAQrUrl)}`}
                      alt="QR Code 2FA"
                      className="border rounded-lg p-2"
                      width={200}
                      height={200}
                    />
                    <div className="w-full max-w-md">
                      <p className="text-xs text-muted-foreground mb-1 text-center">
                        Ou insira a chave manualmente:
                      </p>
                      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <code className="flex-1 text-sm font-mono text-center break-all">
                          {twoFASecret}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(twoFASecret);
                            toast.success("Chave copiada!");
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="max-w-md mx-auto space-y-3">
                    <label className="text-sm font-medium">
                      Digite o codigo de 6 digitos do app:
                    </label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                    <Button
                      className="w-full"
                      onClick={() => verifyTwoFAMutation.mutate({ code: twoFACode })}
                      disabled={twoFACode.length !== 6 || verifyTwoFAMutation.isPending}
                    >
                      {verifyTwoFAMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Confirmar
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setTwoFAStep("idle");
                        setTwoFACode("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : twoFAStep === "backup" ? (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-2">
                      Salve seus codigos de backup em um local seguro!
                    </p>
                    <p className="text-xs text-yellow-700">
                      Estes codigos so serao exibidos uma vez. Use-os para acessar sua conta caso perca acesso ao app autenticador.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                    {twoFABackupCodes.map((code, i) => (
                      <div
                        key={i}
                        className="p-2 bg-muted rounded text-center font-mono text-sm"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(twoFABackupCodes.join("\n"));
                        toast.success("Codigos copiados!");
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Todos
                    </Button>
                    <Button
                      onClick={() => {
                        setTwoFAStep("idle");
                        setTwoFABackupCodes([]);
                      }}
                    >
                      Concluir
                    </Button>
                  </div>
                </div>
              ) : twoFAStatus?.enabled ? (
                <div className="space-y-6">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="text-sm font-medium text-green-800">
                        2FA esta ativo desde {twoFAStatus.verifiedAt
                          ? new Date(twoFAStatus.verifiedAt).toLocaleDateString("pt-BR")
                          : "data desconhecida"}
                      </p>
                    </div>
                    <p className="text-xs text-green-700">
                      Sua conta esta protegida com autenticacao em duas etapas.
                    </p>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Desativar 2FA</CardTitle>
                      <CardDescription>
                        Insira um codigo do app autenticador para desativar
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <Input
                            type="text"
                            placeholder="Codigo de 6 digitos ou backup"
                            value={twoFADisableCode}
                            onChange={(e) => setTwoFADisableCode(e.target.value)}
                            maxLength={12}
                          />
                        </div>
                        <Button
                          variant="destructive"
                          disabled={!twoFADisableCode || disableTwoFAMutation.isPending}
                          onClick={() => disableTwoFAMutation.mutate({ code: twoFADisableCode })}
                        >
                          {disableTwoFAMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-1" />
                          )}
                          Desativar 2FA
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Regenerar Codigos de Backup</CardTitle>
                      <CardDescription>
                        Gere novos codigos de backup (os anteriores serao invalidados)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <Input
                            type="text"
                            placeholder="Codigo de 6 digitos"
                            value={twoFARegenCode}
                            onChange={(e) => setTwoFARegenCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            maxLength={6}
                          />
                        </div>
                        <Button
                          variant="outline"
                          disabled={twoFARegenCode.length !== 6 || regenBackupMutation.isPending}
                          onClick={() => regenBackupMutation.mutate({ code: twoFARegenCode })}
                        >
                          {regenBackupMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-1" />
                          )}
                          Regenerar Codigos
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
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
  );
}
