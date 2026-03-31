import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Activity, Database, HardDrive, AlertTriangle, CheckCircle, XCircle, RefreshCw, Server, Clock, Send, Bot, User, MessageSquare, GitBranch, ShieldAlert, Code2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Markdown from "react-markdown";

const statusColors = {
  ok: "bg-green-500",
  warning: "bg-yellow-500",
  critical: "bg-red-500",
};

const statusLabels = {
  ok: "Saudavel",
  warning: "Atencao",
  critical: "Critico",
};

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "ok") return <CheckCircle className="h-5 w-5 text-green-500" />;
  if (status === "warning") return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

type ChatMessage = { id: string; role: string; content: string };

export default function AdminMonitoring() {
  const [isRunning, setIsRunning] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const chatInitMutation = (trpc as any).adminMonitoring.chatInit.useMutation({
    onSuccess: (data: any) => setConversationId(data.id),
  });

  const chatHistoryQuery = (trpc as any).adminMonitoring.chatHistory.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId }
  );

  const chatSendMutation = (trpc as any).adminMonitoring.chatSend.useMutation({
    onMutate: () => setIsTyping(true),
    onSuccess: (data: any) => {
      setChatMessages(prev => [...prev, data.userMessage, data.assistantMessage]);
      setIsTyping(false);
    },
    onError: () => setIsTyping(false),
  });

  useEffect(() => {
    if (!conversationId) chatInitMutation.mutate({});
  }, []);

  useEffect(() => {
    if (chatHistoryQuery.data && chatMessages.length === 0) {
      setChatMessages(chatHistoryQuery.data);
    }
  }, [chatHistoryQuery.data]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  const handleChatSend = () => {
    if (!chatInput.trim() || !conversationId || isTyping) return;
    chatSendMutation.mutate({ conversationId, content: chatInput.trim() });
    setChatInput("");
  };

  const statusQuery = (trpc as any).adminMonitoring.getStatus.useQuery(undefined, {
    refetchInterval: 30000,
  });

  const flowHealthQuery = (trpc as any).adminMonitoring.getFlowHealth.useQuery(undefined, {
    refetchInterval: 60000,
  });

  const codeIntegrityQuery = (trpc as any).adminMonitoring.getCodeIntegrity.useQuery(undefined, {
    refetchInterval: 120000,
  });

  const errorLogQuery = (trpc as any).adminMonitoring.getErrorLog.useQuery();

  const historyQuery = (trpc as any).adminMonitoring.getHistory.useQuery({ limit: 20 });

  const maintenanceQuery = (trpc as any).adminMonitoring.maintenanceHistory.useQuery({ limit: 10 });

  const [isRunningE2E, setIsRunningE2E] = useState(false);
  const [e2eResults, setE2EResults] = useState<any>(null);

  const runE2EMutation = (trpc as any).adminMonitoring.runE2ETests.useMutation({
    onSuccess: (data: any) => {
      setE2EResults(data);
      setIsRunningE2E(false);
    },
    onError: () => setIsRunningE2E(false),
  });

  const runCheckMutation = (trpc as any).adminMonitoring.runCheck.useMutation({
    onSuccess: () => {
      statusQuery.refetch();
      historyQuery.refetch();
      setIsRunning(false);
    },
    onError: () => setIsRunning(false),
  });

  const data = statusQuery.data;
  const errors = errorLogQuery.data?.lines ?? [];
  const history = historyQuery.data ?? [];

  return (
    <DashboardLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Monitoramento da Plataforma
          </h1>
          <p className="text-muted-foreground">
            Status em tempo real e historico de verificacoes
          </p>
        </div>
        <Button
          onClick={() => { setIsRunning(true); runCheckMutation.mutate({}); }}
          disabled={isRunning}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
          {isRunning ? "Verificando..." : "Executar Check"}
        </Button>
      </div>

      {/* Status geral */}
      {data && (
        <Card className={data.status !== "ok" ? "border-red-500 border-2" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`h-4 w-4 rounded-full ${statusColors[data.status as keyof typeof statusColors]}`} />
              <span className="text-lg font-semibold">
                Status Geral: {statusLabels[data.status as keyof typeof statusLabels]}
              </span>
              <span className="text-sm text-muted-foreground ml-auto">
                Atualizado automaticamente a cada 30s
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SamurAI Flow Health */}
      {flowHealthQuery.data && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-[#c8a55a]" />
                Saude do Fluxo SamurAI
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Monitoramento das 18 etapas NR-01 por empresa
              </p>
            </div>
            <div className="flex gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{flowHealthQuery.data.totalFlows}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{flowHealthQuery.data.activeFlows}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{flowHealthQuery.data.completedFlows}</p>
                <p className="text-xs text-muted-foreground">Concluidos</p>
              </div>
              <div>
                <p className={`text-2xl font-bold ${flowHealthQuery.data.stuckFlows.length > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {flowHealthQuery.data.stuckFlows.length}
                </p>
                <p className="text-xs text-muted-foreground">Travados</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Distribuicao por fase */}
            {flowHealthQuery.data.phaseDistribution.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Distribuicao por Fase</p>
                <div className="flex flex-wrap gap-2">
                  {flowHealthQuery.data.phaseDistribution.map((p: any) => (
                    <Badge key={p.phase} variant="outline" className="text-xs">
                      {p.label}: <strong className="ml-1">{p.count}</strong>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Fluxos travados */}
            {flowHealthQuery.data.stuckFlows.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase mb-2 flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Fluxos Travados
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa (ID)</TableHead>
                      <TableHead>Fase Atual</TableHead>
                      <TableHead>Sem Atividade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flowHealthQuery.data.stuckFlows.map((f: any) => (
                      <TableRow key={f.conversationId}>
                        <TableCell className="font-mono text-xs">{f.companyId}</TableCell>
                        <TableCell className="text-sm">{f.phaseLabel}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{f.daysSinceActivity}d</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                Nenhum fluxo travado — todos os processos estao progredindo normalmente.
              </div>
            )}

            {/* Integridade de dados */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Integridade de Dados NR-01</p>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { label: "COPSOQ Total", value: flowHealthQuery.data.dataIntegrity.copsoqTotal },
                  { label: "COPSOQ Ativo", value: flowHealthQuery.data.dataIntegrity.copsoqInProgress },
                  { label: "COPSOQ OK", value: flowHealthQuery.data.dataIntegrity.copsoqCompleted },
                  { label: "Inventarios", value: flowHealthQuery.data.dataIntegrity.riskAssessmentsTotal },
                  { label: "Planos Acao", value: flowHealthQuery.data.dataIntegrity.actionPlansTotal },
                  { label: "Certificados", value: flowHealthQuery.data.dataIntegrity.certificatesTotal },
                ].map(item => (
                  <div key={item.label} className="text-center p-2 bg-muted rounded-lg">
                    <p className="text-lg font-bold">{item.value}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integridade do Codigo */}
      {codeIntegrityQuery.data && (
        <Card className={codeIntegrityQuery.data.status === "critical" ? "border-red-500 border-2" : codeIntegrityQuery.data.status === "warning" ? "border-yellow-500 border-2" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-blue-500" />
                Integridade do Codigo
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                E2E, erros, build, vulnerabilidades de dependencias
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className={`text-3xl font-bold ${codeIntegrityQuery.data.score >= 80 ? "text-green-600" : codeIntegrityQuery.data.score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                  {codeIntegrityQuery.data.score}
                </p>
                <p className="text-xs text-muted-foreground">Score /100</p>
              </div>
              <StatusIcon status={codeIntegrityQuery.data.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* E2E */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Testes E2E</p>
                {codeIntegrityQuery.data.e2e.lastRun ? (
                  <>
                    <div className="flex items-center gap-1">
                      {codeIntegrityQuery.data.e2e.status === "passing"
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <XCircle className="h-4 w-4 text-red-500" />}
                      <span className="font-bold text-sm">{codeIntegrityQuery.data.e2e.passed}/{codeIntegrityQuery.data.e2e.total}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(codeIntegrityQuery.data.e2e.lastRun).toLocaleString("pt-BR")}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Nenhum registrado</p>
                )}
              </div>
              {/* Build */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Build Artifact</p>
                <div className="flex items-center gap-1">
                  {codeIntegrityQuery.data.buildArtifact.exists
                    ? <CheckCircle className="h-4 w-4 text-green-500" />
                    : <XCircle className="h-4 w-4 text-red-500" />}
                  <span className="font-bold text-sm">{codeIntegrityQuery.data.buildArtifact.exists ? "Presente" : "Ausente"}</span>
                </div>
                {codeIntegrityQuery.data.buildArtifact.ageMins !== null && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {codeIntegrityQuery.data.buildArtifact.ageMins < 60
                      ? `${codeIntegrityQuery.data.buildArtifact.ageMins}min atras`
                      : `${Math.round(codeIntegrityQuery.data.buildArtifact.ageMins / 60)}h atras`}
                  </p>
                )}
              </div>
              {/* Vulnerabilidades */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Vulnerabilidades</p>
                <div className="flex items-center gap-1">
                  {codeIntegrityQuery.data.auditIssues === 0
                    ? <CheckCircle className="h-4 w-4 text-green-500" />
                    : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  <span className="font-bold text-sm">{codeIntegrityQuery.data.auditIssues} alta/critica</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">npm audit</p>
              </div>
              {/* Erros recorrentes */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Erros Recorrentes</p>
                <div className="flex items-center gap-1">
                  {codeIntegrityQuery.data.errorPatterns.length === 0
                    ? <CheckCircle className="h-4 w-4 text-green-500" />
                    : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  <span className="font-bold text-sm">{codeIntegrityQuery.data.errorPatterns.length} padrao(oes)</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">ultimas 24h</p>
              </div>
            </div>

            {/* Resumo */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Resumo</p>
              <div className="flex flex-wrap gap-2">
                {codeIntegrityQuery.data.summary.map((s: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>

            {/* Padroes de erro */}
            {codeIntegrityQuery.data.errorPatterns.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Padroes de Erro (24h)</p>
                <div className="space-y-1">
                  {codeIntegrityQuery.data.errorPatterns.map((e: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                      <span className="font-mono truncate max-w-xs">{e.message}</span>
                      <Badge variant="secondary">{e.count}x</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cards de metricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* App */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aplicacao</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-lg font-bold">Online</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Uptime: {formatUptime(data.app.uptime)} | Node {data.app.nodeVersion}
                </p>
              </>
            ) : (
              <span className="text-muted-foreground">Carregando...</span>
            )}
          </CardContent>
        </Card>

        {/* Database */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Banco de Dados</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data ? (
              <>
                <div className="flex items-center gap-2">
                  {data.database.connected
                    ? <CheckCircle className="h-4 w-4 text-green-500" />
                    : <XCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-lg font-bold">
                    {data.database.connected ? "Conectado" : "Desconectado"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">MySQL 8.0</p>
              </>
            ) : (
              <span className="text-muted-foreground">Carregando...</span>
            )}
          </CardContent>
        </Card>

        {/* Memory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Memoria</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data ? (
              <>
                <div className="flex items-center gap-2">
                  <StatusIcon status={data.memory.memoryStatus} />
                  <span className="text-lg font-bold">{data.memory.heapPercent}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full ${
                      data.memory.heapPercent >= 90 ? "bg-red-500" :
                      data.memory.heapPercent >= 75 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min(data.memory.heapPercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.memory.heapUsedMB}MB / {data.memory.maxHeapMB ?? data.memory.heapTotalMB}MB (RSS: {data.memory.rssMB}MB)
                </p>
              </>
            ) : (
              <span className="text-muted-foreground">Carregando...</span>
            )}
          </CardContent>
        </Card>

        {/* Errors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Erros (24h)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data ? (
              <>
                <div className="flex items-center gap-2">
                  {data.errors24h === 0
                    ? <CheckCircle className="h-4 w-4 text-green-500" />
                    : data.errors24h < 10
                    ? <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    : <XCircle className="h-4 w-4 text-red-500" />}
                  <span className="text-lg font-bold">{data.errors24h}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.errors24h === 0 ? "Nenhum erro" : `${data.errors24h} erro(s) registrado(s)`}
                </p>
              </>
            ) : (
              <span className="text-muted-foreground">Carregando...</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Backup & Disco */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Ultimo Backup</CardTitle>
            </CardHeader>
            <CardContent>
              {data.lastBackup ? (
                <div className="space-y-1">
                  <p className="font-mono text-sm">{data.lastBackup.file}</p>
                  <p className="text-sm text-muted-foreground">
                    Tamanho: {data.lastBackup.sizeMB}MB | Data: {new Date(data.lastBackup.date).toLocaleString("pt-BR")}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhum backup encontrado</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Recursos do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-sm">RAM Total: {data.disk.totalGB}GB | Livre: {data.disk.freeGB}GB</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      data.disk.usedPercent >= 90 ? "bg-red-500" :
                      data.disk.usedPercent >= 75 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ width: `${data.disk.usedPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.disk.usedPercent}% em uso
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historico de Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historico de Verificacoes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma verificacao registrada. Clique em "Executar Check" para iniciar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Memoria</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Erros</TableHead>
                  <TableHead>Alerta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((check: any) => {
                  const d = check.details;
                  return (
                    <TableRow key={check.id}>
                      <TableCell className="text-sm">
                        {new Date(check.checkedAt).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={check.status === "ok" ? "default" : "destructive"}>
                          {statusLabels[check.status as keyof typeof statusLabels] ?? check.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {d?.memory?.heapPercent ?? "?"}%
                      </TableCell>
                      <TableCell>
                        {d?.database?.connected
                          ? <CheckCircle className="h-4 w-4 text-green-500" />
                          : <XCircle className="h-4 w-4 text-red-500" />}
                      </TableCell>
                      <TableCell className="text-sm">{d?.errors24h ?? "?"}</TableCell>
                      <TableCell>
                        {check.alertSent
                          ? <Badge variant="destructive">Enviado</Badge>
                          : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ultimos Erros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Log de Erros Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum erro recente.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mensagem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((line: string, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs whitespace-pre-wrap break-all">
                        {line}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* E2E Tests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Testes E2E de Negocio
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Testa fluxos reais: registro, login, subscription, COPSOQ, billing
            </p>
          </div>
          <Button
            onClick={() => { setIsRunningE2E(true); runE2EMutation.mutate({}); }}
            disabled={isRunningE2E}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunningE2E ? "animate-spin" : ""}`} />
            {isRunningE2E ? "Rodando..." : "Rodar Testes"}
          </Button>
        </CardHeader>
        <CardContent>
          {e2eResults ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${e2eResults.passed ? "bg-green-500" : "bg-red-500"}`} />
                <span className="font-semibold">
                  {e2eResults.passedTests}/{e2eResults.totalTests} testes passaram
                </span>
                <span className="text-sm text-muted-foreground">
                  ({e2eResults.duration}ms)
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teste</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tempo</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {e2eResults.results.map((t: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{t.name}</TableCell>
                      <TableCell>
                        {t.passed
                          ? <Badge variant="default">OK</Badge>
                          : <Badge variant="destructive">FALHOU</Badge>}
                      </TableCell>
                      <TableCell className="text-sm">{t.duration}ms</TableCell>
                      <TableCell className="text-sm text-red-600 max-w-xs truncate">
                        {t.error || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Clique em "Rodar Testes" para verificar os fluxos de negocio.
              Testes rodam automaticamente a cada 6 horas.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Manutencoes Automaticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(maintenanceQuery.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhuma manutencao registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resolucao</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(maintenanceQuery.data ?? []).map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">
                      {new Date(m.requestedAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.status === "completed" ? "default" : m.status === "pending" ? "secondary" : "destructive"}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {m.resolution || "Aguardando..."}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Chat IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Klinikos IA
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Converse com Klinikos para diagnosticar e entender o estado da plataforma
          </p>
        </CardHeader>
        <CardContent>
          {/* Messages */}
          <div className="border rounded-lg mb-3">
            <ScrollArea className="h-80 p-4">
              {chatMessages.length === 0 && !isTyping && (
                <div className="text-center text-muted-foreground py-12">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Pergunte qualquer coisa sobre a plataforma.</p>
                  <p className="text-xs mt-1">Ex: "Como esta a memoria?" ou "Teve algum erro hoje?"</p>
                </div>
              )}
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 mb-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    {msg.role === "assistant" ? (
                      <Markdown className="text-sm prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                        {msg.content}
                      </Markdown>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </ScrollArea>
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleChatSend(); } }}
              placeholder="Pergunte sobre a plataforma..."
              disabled={isTyping || !conversationId}
            />
            <Button
              onClick={handleChatSend}
              disabled={!chatInput.trim() || isTyping || !conversationId}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  );
}
