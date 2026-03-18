import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, AlertTriangle, CheckCircle2, Clock, Brain, RefreshCw, MessageSquare, X, Plus, Trash2 } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";

function AgentChatPage() {
  usePageMeta({ title: "Assistente IA NR-01" });

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [localMessages, setLocalMessages] = useState<Array<{
    id: string;
    role: string;
    content: string;
    actions?: Array<{ type: string; label: string; params: Record<string, any> }>;
    createdAt?: any;
  }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Create/get conversation
  const createConversation = trpc.agent.getOrCreateConversation.useMutation({
    onSuccess: (data) => {
      setConversationId(data.id);
    },
  });

  // Fetch history
  const { data: history } = trpc.agent.getHistory.useQuery(
    { conversationId: conversationId!, limit: 100 },
    { enabled: !!conversationId }
  );

  // Fetch NR-01 status
  const { data: nr01Status } = trpc.agent.getStatus.useQuery({});

  // Fetch alerts
  const { data: alerts } = trpc.agent.getAlerts.useQuery({ limit: 10 });

  // Send message
  const sendMessage = trpc.agent.sendMessage.useMutation({
    onMutate: () => setIsTyping(true),
    onSuccess: (data) => {
      setLocalMessages((prev) => [
        ...prev,
        { id: data.userMessage.id, role: "user", content: data.userMessage.content },
        {
          id: data.assistantMessage.id,
          role: "assistant",
          content: data.assistantMessage.content,
          actions: data.assistantMessage.actions,
        },
      ]);
      setIsTyping(false);
    },
    onError: () => setIsTyping(false),
  });

  // Dismiss alert
  const dismissAlert = trpc.agent.dismissAlert.useMutation();

  // New conversation
  const newConversation = trpc.agent.newConversation.useMutation({
    onSuccess: (data) => {
      setConversationId(data.id);
      setLocalMessages([]);
    },
  });

  // Delete conversation
  const deleteConversation = trpc.agent.deleteConversation.useMutation({
    onSuccess: () => {
      setConversationId(null);
      setLocalMessages([]);
      // Create a fresh conversation
      createConversation.mutate({});
    },
  });

  // Init conversation
  useEffect(() => {
    if (!conversationId) {
      createConversation.mutate({});
    }
  }, []);

  // Sync history to local messages
  useEffect(() => {
    if (history && history.length > 0 && localMessages.length === 0) {
      setLocalMessages(
        history.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          actions: m.actions || [],
        }))
      );
    }
  }, [history]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim() || !conversationId || isTyping) return;
    const msg = inputValue.trim();
    setInputValue("");
    sendMessage.mutate({ conversationId, content: msg });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPhaseIcon = (status: string) => {
    if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (status === "in_progress") return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
    return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "critical") return "destructive";
    if (severity === "high") return "destructive";
    if (severity === "warning") return "secondary";
    return "outline";
  };

  // Welcome message if no history
  const displayMessages = localMessages.length > 0 ? localMessages : [
    {
      id: "welcome",
      role: "assistant",
      content: "Olá! Sou o Assistente BlackBelt, seu especialista em conformidade NR-01 para riscos psicossociais.\n\nPosso ajudá-lo a:\n- Cadastrar uma nova empresa e iniciar o processo NR-01\n- Acompanhar o progresso de conformidade\n- Gerar avaliações, inventários e planos de ação\n- Responder dúvidas sobre a legislação\n\nPara começar, me informe o **CNPJ** da empresa ou escolha uma empresa já cadastrada.",
      actions: [],
    },
  ];

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
        {/* Chat Panel */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Chat Header — fixed outside scroll */}
          <div className="flex items-center gap-2 bg-card border rounded-t-lg py-3 px-4 z-10 flex-shrink-0">
            <Brain className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Assistente IA NR-01</h3>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1"
                onClick={() => newConversation.mutate({})}
                disabled={isTyping}
                title="Novo chat"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo Chat
              </Button>
              {conversationId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Excluir esta conversa? Esta ação não pode ser desfeita.")) {
                      deleteConversation.mutate({ conversationId });
                    }
                  }}
                  disabled={isTyping}
                  title="Excluir chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
          <Card className="flex flex-1 flex-col overflow-hidden rounded-t-none border-t-0">

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {displayMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div
                      className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                      }`}
                    >
                      {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === "user" ? "items-end" : ""}`}>
                      <div
                        className={`rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-sm whitespace-pre-wrap"
                            : "bg-muted rounded-tl-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-li:my-0 prose-table:my-2 prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-table:text-xs"
                        }`}
                      >
                        {msg.role === "user" ? msg.content : (
                          <Markdown>{msg.content}</Markdown>
                        )}
                      </div>
                      {/* Action buttons */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {msg.actions.map((action: any, i: number) => (
                            <Button
                              key={i}
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                if (conversationId) {
                                  sendMessage.mutate({
                                    conversationId,
                                    content: `Executar: ${action.label}`,
                                  });
                                }
                              }}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-muted">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-4 flex-shrink-0">
              <div className="flex gap-2 max-w-3xl mx-auto">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  disabled={isTyping || !conversationId}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isTyping || !conversationId}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Status Panel (hidden on small screens) */}
        <div className="hidden lg:flex w-80 flex-col gap-4">
          {/* NR-01 Progress */}
          <Card className="flex-1 overflow-hidden">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm font-medium">Progresso NR-01</CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1 max-h-[50vh]">
              <CardContent className="p-3 space-y-1">
                {nr01Status?.phases ? (
                  nr01Status.phases.map((phase: any) => (
                    <div
                      key={phase.phase}
                      className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 text-xs"
                    >
                      {getPhaseIcon(phase.status)}
                      <span className="flex-1 truncate">{phase.name}</span>
                      <span className="text-muted-foreground">{phase.progress}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground p-2">Selecione uma empresa para ver o progresso.</p>
                )}
                {nr01Status && (
                  <div className="pt-2 mt-2 border-t">
                    <div className="flex items-center justify-between text-xs px-2">
                      <span className="font-medium">Progresso geral</span>
                      <span className="font-bold text-primary">{nr01Status.overallProgress}%</span>
                    </div>
                    <div className="mx-2 mt-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${nr01Status.overallProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </Card>

          {/* Alerts */}
          <Card>
            <CardHeader className="py-3 px-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Alertas</CardTitle>
                {alerts && alerts.length > 0 && (
                  <Badge variant="destructive" className="text-xs">{alerts.length}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2 max-h-[30vh] overflow-y-auto">
              {alerts && alerts.length > 0 ? (
                alerts.map((alert: any) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-xs"
                  >
                    <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                      alert.severity === "critical" ? "text-red-500" :
                      alert.severity === "high" ? "text-orange-500" :
                      alert.severity === "warning" ? "text-yellow-500" : "text-blue-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{alert.title}</p>
                      <p className="text-muted-foreground line-clamp-2">{alert.message}</p>
                    </div>
                    <button
                      onClick={() => dismissAlert.mutate({ id: alert.id })}
                      className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhum alerta ativo</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default AgentChatPage;
