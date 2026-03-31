import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, AlertTriangle, CheckCircle2, Clock, Brain, RefreshCw, MessageSquare, X, Plus, Trash2, FileDown, Save, Pencil } from "lucide-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useToast } from "@/hooks/use-toast";

function AgentChatPage() {
  usePageMeta({ title: "SamurAI — Assistente NR-01" });
  const { toast } = useToast();

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

  // Edit proposal modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProposalId, setEditProposalId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTotalValue, setEditTotalValue] = useState(0);
  const [editDiscount, setEditDiscount] = useState(0);
  const [editValidUntil, setEditValidUntil] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editItems, setEditItems] = useState<Array<{ id?: string; serviceName: string; quantity: number; unitPrice: number }>>([]);
  const [editNewServiceName, setEditNewServiceName] = useState("");
  const [editNewQuantity, setEditNewQuantity] = useState(1);
  const [editNewUnitPrice, setEditNewUnitPrice] = useState(0);

  // Fetch proposal for editing
  const { data: editProposalData, refetch: refetchProposal } = trpc.proposals.getById.useQuery(
    { id: editProposalId! },
    { enabled: !!editProposalId }
  );

  // Update proposal mutation
  const updateProposal = trpc.proposals.update.useMutation({
    onSuccess: () => {
      toast({ title: "Proposta atualizada com sucesso!" });
      setEditModalOpen(false);
      // Don't auto-send email — let user click the button
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message || "Tente novamente", variant: "destructive" });
    },
  });

  const addItemMutation = trpc.proposals.addItem.useMutation();
  const removeItemMutation = trpc.proposals.removeItem.useMutation();

  // Populate edit form when proposal data loads
  useEffect(() => {
    if (editProposalData && editModalOpen) {
      setEditTitle(editProposalData.title || "");
      setEditDescription(editProposalData.description || "");
      setEditTotalValue(editProposalData.totalValue / 100);
      setEditDiscount(editProposalData.discountPercent || 0);
      setEditValidUntil(editProposalData.validUntil ? new Date(editProposalData.validUntil).toISOString().split("T")[0] : "");
      setEditContactEmail(editProposalData.contactEmail || "");
      setEditItems((editProposalData.items || []).map((it: any) => ({
        id: it.id,
        serviceName: it.serviceName,
        quantity: it.quantity,
        unitPrice: it.unitPrice / 100,
      })));
    }
  }, [editProposalData, editModalOpen]);

  // Open edit modal
  const openEditModal = (proposalId: string) => {
    setEditProposalId(proposalId);
    setEditModalOpen(true);
    refetchProposal();
  };

  // Save proposal edits
  const handleEditSave = async () => {
    if (!editProposalId || !editProposalData) return;

    try {
      // Handle items: remove deleted, add new
      const originalIds = new Set((editProposalData.items || []).map((it: any) => it.id));
      const currentIds = new Set(editItems.filter(it => it.id).map(it => it.id));

      // Remove deleted items
      for (const origId of originalIds) {
        if (!currentIds.has(origId)) {
          await removeItemMutation.mutateAsync({ itemId: origId });
        }
      }

      // Add new items (no id)
      for (const item of editItems) {
        if (!item.id && item.serviceName.trim()) {
          await addItemMutation.mutateAsync({
            proposalId: editProposalId,
            serviceName: item.serviceName,
            quantity: item.quantity,
            unitPrice: Math.round(item.unitPrice * 100),
            subtotal: Math.round(item.unitPrice * item.quantity * 100),
            technicalHours: 0,
          });
        }
      }

      // Calculate totals
      const subtotal = Math.round(editItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0) * 100);
      const discountAmount = Math.round(subtotal * editDiscount / 100);
      const totalValue = subtotal - discountAmount;

      await updateProposal.mutateAsync({
        id: editProposalId,
        title: editTitle,
        description: editDescription,
        subtotal,
        discount: discountAmount,
        discountPercent: editDiscount,
        taxes: 0,
        totalValue: totalValue > 0 ? totalValue : Math.round(editTotalValue * 100),
        validUntil: editValidUntil ? new Date(editValidUntil) : undefined,
      });
    } catch (err) {
      // Error handled by mutation
    }
  };

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
  const { data: alerts } = trpc.agent.getAlerts.useQuery({ limit: 10 }, { refetchInterval: 30000 });

  // Auto-process alerts: when proposal is approved or COPSOQ responses arrive, auto-continue the flow
  const processedAlertIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!alerts || !conversationId) return;
    const autoTypes = ["proposal_approved", "copsoq_responses_ready"];
    const toProcess = alerts.filter(
      (a) => !a.dismissed && autoTypes.includes(a.alertType) && !processedAlertIds.current.has(a.id)
    );
    if (toProcess.length === 0) return;
    for (const alert of toProcess) {
      processedAlertIds.current.add(alert.id);
      dismissAlert.mutate({ id: alert.id });
      sendMessage.mutate({ conversationId, content: "continuar" });
    }
  }, [alerts, conversationId]);

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
      content: "Olá! Sou o **SamurAI**, seu especialista em conformidade NR-01 para riscos psicossociais.\n\nPosso ajudá-lo a:\n- Cadastrar uma nova empresa e iniciar o processo NR-01\n- Acompanhar o progresso de conformidade\n- Gerar avaliações, inventários e planos de ação\n- Responder dúvidas sobre a legislação\n\nPara começar, me informe:\n1. **CNPJ** da empresa\n2. **Número de funcionários**\n3. **Email** para envio da documentação\n\nOu escolha uma empresa já cadastrada.",
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
            <h3 className="text-lg font-semibold">SamurAI</h3>
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

            {/* Proposal approval banners */}
            {alerts?.filter(a => a.alertType === "proposal_approved").map(alert => (
              <div key={alert.id} className="mx-4 mt-3 p-3 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between gap-3">
                <span className="text-sm text-green-800 flex-1">✅ {alert.message}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-green-400 text-green-700 shrink-0"
                  onClick={() => {
                    dismissAlert.mutate({ id: alert.id });
                    if (conversationId) {
                      sendMessage.mutate({ conversationId, content: "continuar" });
                    }
                  }}
                >
                  Continuar fluxo
                </Button>
              </div>
            ))}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
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
                          <Markdown
                            components={{
                              a: ({ href, children, ...props }) => {
                                const isPdfLink = href && href.startsWith("/api/pdf/");
                                if (isPdfLink) {
                                  return (
                                    <a
                                      href={href}
                                      download
                                      className="inline-flex items-center gap-1 text-primary underline hover:text-primary/80 font-medium"
                                      {...props}
                                    >
                                      <FileDown className="h-3.5 w-3.5 inline flex-shrink-0" />
                                      {children}
                                    </a>
                                  );
                                }
                                return (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline hover:text-primary/80"
                                    {...props}
                                  >
                                    {children}
                                  </a>
                                );
                              },
                            }}
                          >
                            {msg.content}
                          </Markdown>
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
                                // Edit proposal opens modal instead of sending message
                                if (action.type === "edit_proposal" && action.params?.proposalId) {
                                  openEditModal(action.params.proposalId);
                                  return;
                                }
                                if (conversationId) {
                                  sendMessage.mutate({
                                    conversationId,
                                    content: `Executar: ${action.label}`,
                                  });
                                }
                              }}
                            >
                              {action.type === "edit_proposal" && <Pencil className="h-3 w-3 mr-1" />}
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
            </div>

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
      {/* Edit Proposal Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditModalOpen(false)}>
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><Pencil className="h-5 w-5" /> Editar Proposta</h2>
                <p className="text-sm text-muted-foreground">Edite os campos abaixo e clique em Salvar</p>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wide">Dados da Proposta</h3>

              <div className="space-y-2">
                <Label htmlFor="edit-title">Título *</Label>
                <Input id="edit-title" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-desc">Descrição</Label>
                <Textarea id="edit-desc" value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email do Cliente</Label>
                <Input id="edit-email" type="email" value={editContactEmail} onChange={e => setEditContactEmail(e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Valor Total (R$)</Label>
                  <Input type="number" step="0.01" value={editTotalValue} onChange={e => setEditTotalValue(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <Input type="number" value={editDiscount} onChange={e => setEditDiscount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Validade</Label>
                  <Input type="date" value={editValidUntil} onChange={e => setEditValidUntil(e.target.value)} />
                </div>
              </div>

              <h3 className="text-sm font-bold text-primary uppercase tracking-wide pt-2">Itens da Proposta</h3>

              <div className="space-y-2">
                <button
                  className="text-sm text-primary hover:underline font-medium"
                  onClick={() => setEditItems(prev => [...prev, { serviceName: "", quantity: 1, unitPrice: 0 }])}
                >
                  + Adicionar novo item
                </button>

                <div className="grid grid-cols-[1fr_60px_100px_32px] gap-2 text-xs font-medium text-muted-foreground">
                  <span>Nome do Serviço</span>
                  <span>Qtd</span>
                  <span>Preço Unit. (R$)</span>
                  <span></span>
                </div>

                {editItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_60px_100px_32px] gap-2 items-center">
                    <Input
                      value={item.serviceName}
                      onChange={e => {
                        const updated = [...editItems];
                        updated[idx].serviceName = e.target.value;
                        setEditItems(updated);
                      }}
                      placeholder="Nome do serviço..."
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e => {
                        const updated = [...editItems];
                        updated[idx].quantity = parseInt(e.target.value) || 1;
                        setEditItems(updated);
                      }}
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={e => {
                        const updated = [...editItems];
                        updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                        setEditItems(updated);
                      }}
                      className="text-sm"
                    />
                    <button
                      onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {editItems.length > 0 && (
                <div className="text-right text-sm font-medium text-muted-foreground">
                  Subtotal: R$ {editItems.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t">
              <Button variant="outline" onClick={() => { setEditModalOpen(false); setEditProposalId(null); }}>Cancelar</Button>
              <Button onClick={handleEditSave} disabled={updateProposal.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateProposal.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default AgentChatPage;
