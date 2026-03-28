import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Activity, Database, HardDrive, AlertTriangle, CheckCircle, XCircle, RefreshCw, Server, Clock, Send, Bot, User, MessageSquare } from "lucide-react";
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

  const errorLogQuery = (trpc as any).adminMonitoring.getErrorLog.useQuery();

  const historyQuery = (trpc as any).adminMonitoring.getHistory.useQuery({ limit: 20 });

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
