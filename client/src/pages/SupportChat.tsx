/**
 * Support Chat — AI Support Agent
 * Chat interface for platform support (FAQ + ticket creation)
 */

import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Headphones, Send, Bot, User, Plus, MessageSquare, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  actions?: Array<{ type: string; label: string; path?: string }>;
  createdAt?: any;
}

export default function SupportChat() {
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // tRPC mutations/queries
  const createConversation = trpc.supportAgent.getOrCreateConversation.useMutation({
    onSuccess: (data) => setConversationId(data.id),
  });

  const { data: history } = trpc.supportAgent.getHistory.useQuery(
    { conversationId: conversationId! },
    { enabled: !!conversationId, refetchInterval: false }
  );

  const sendMessage = trpc.supportAgent.sendMessage.useMutation({
    onMutate: () => setIsTyping(true),
    onSuccess: (data) => {
      setLocalMessages((prev) => [...prev, data.userMessage, data.assistantMessage]);
      setIsTyping(false);
      setInputValue("");
    },
    onError: () => setIsTyping(false),
  });

  const newConversation = trpc.supportAgent.newConversation.useMutation({
    onSuccess: (data) => {
      setConversationId(data.id);
      setLocalMessages([]);
    },
  });

  // Auto-create conversation on mount
  useEffect(() => {
    if (!conversationId) {
      createConversation.mutate();
    }
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [localMessages, history, isTyping]);

  const handleSend = () => {
    if (!inputValue.trim() || !conversationId || isTyping) return;
    sendMessage.mutate({ conversationId, content: inputValue.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleActionClick = (action: any) => {
    if (action.path) {
      navigate(action.path);
    } else if (action.label === "Abrir Ticket" && conversationId) {
      sendMessage.mutate({ conversationId, content: "abrir ticket" });
    }
  };

  // Combine history + local messages (dedup by id)
  const allMessages = (() => {
    const historyMsgs = history || [];
    const ids = new Set(historyMsgs.map((m: any) => m.id));
    const newMsgs = localMessages.filter((m) => !ids.has(m.id));
    return [...historyMsgs, ...newMsgs];
  })();

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-120px)] max-h-[800px]">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col border rounded-lg bg-background">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Headphones className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg">Suporte BlackBelt</h2>
                <p className="text-xs text-muted-foreground">Assistente de suporte inteligente</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => newConversation.mutate()}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Conversa
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4 max-w-3xl mx-auto">
              {allMessages.map((msg: ChatMessage) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                      msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === "user" ? "items-end" : ""}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-muted rounded-tl-sm"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {msg.actions.map((action: any, i: number) => (
                          <Button
                            key={i}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => handleActionClick(action)}
                          >
                            {action.path ? (
                              <ExternalLink className="h-3 w-3 mr-1" />
                            ) : (
                              <MessageSquare className="h-3 w-3 mr-1" />
                            )}
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
                    <Headphones className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
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
                placeholder="Digite sua duvida..."
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
        </div>

        {/* Quick Links Sidebar */}
        <div className="hidden lg:block w-72 ml-4">
          <div className="border rounded-lg p-4 bg-background">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Perguntas Rapidas
            </h3>
            <div className="space-y-2">
              {[
                "Como cadastrar uma empresa?",
                "Como importar planilha?",
                "Como funciona o COPSOQ?",
                "Como gerar os PDFs?",
                "Como redefinir minha senha?",
                "Quais sao os planos?",
                "O que e o SamurAI?",
                "Como abrir um ticket?",
              ].map((question, i) => (
                <button
                  key={i}
                  className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (conversationId && !isTyping) {
                      setInputValue(question);
                      sendMessage.mutate({ conversationId, content: question });
                    }
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
