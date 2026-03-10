import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { LifeBuoy, Plus, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { open: "Aberto", in_progress: "Em andamento", waiting_customer: "Aguardando resposta", resolved: "Resolvido", closed: "Fechado" };
const statusColors: Record<string, string> = { open: "bg-blue-100 text-blue-800", in_progress: "bg-yellow-100 text-yellow-800", waiting_customer: "bg-orange-100 text-orange-800", resolved: "bg-green-100 text-green-800", closed: "bg-gray-100 text-gray-800" };
const priorityLabels: Record<string, string> = { low: "Baixa", medium: "Media", high: "Alta", critical: "Critica" };
const priorityColors: Record<string, string> = { low: "bg-gray-100 text-gray-800", medium: "bg-blue-100 text-blue-800", high: "bg-orange-100 text-orange-800", critical: "bg-red-100 text-red-800" };

export default function SupportTickets() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const utils = trpc.useUtils();

  const { data: tickets, isLoading } = (trpc as any).supportTickets.list.useQuery();
  const ticketDetail = (trpc as any).supportTickets.get.useQuery({ id: selectedTicketId! }, { enabled: !!selectedTicketId });

  const createMutation = (trpc as any).supportTickets.create.useMutation({
    onSuccess: () => { toast.success("Ticket criado com sucesso!"); utils.invalidate(); setShowCreate(false); },
    onError: (e: any) => toast.error(e.message),
  });

  const messageMutation = (trpc as any).supportTickets.addMessage.useMutation({
    onSuccess: () => { toast.success("Mensagem enviada!"); setNewMessage(""); utils.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createMutation.mutate({ title: fd.get("title") as string, description: fd.get("description") as string, priority: fd.get("priority") as string || "medium", category: fd.get("category") as string || "technical" });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-3xl font-bold">Suporte</h1><p className="text-muted-foreground">Abra e acompanhe seus tickets de suporte</p></div>
          <Button onClick={() => setShowCreate(true)}><Plus className="mr-2 h-4 w-4" />Novo Ticket</Button>
        </div>

        {selectedTicketId && ticketDetail.data ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{ticketDetail.data.ticket.title}</CardTitle>
                  <CardDescription>{ticketDetail.data.ticket.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={statusColors[ticketDetail.data.ticket.status]}>{statusLabels[ticketDetail.data.ticket.status]}</Badge>
                  <Badge className={priorityColors[ticketDetail.data.ticket.priority]}>{priorityLabels[ticketDetail.data.ticket.priority]}</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedTicketId(null)}>Voltar</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {ticketDetail.data.messages?.map((m: any) => (
                  <div key={m.message.id} className="p-3 rounded-lg bg-muted">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-medium">{m.userName || "Usuario"}</span>
                      <span>{new Date(m.message.createdAt).toLocaleString("pt-BR")}</span>
                    </div>
                    <p className="text-sm">{m.message.message}</p>
                  </div>
                ))}
              </div>
              {ticketDetail.data.ticket.status !== "closed" && (
                <div className="flex gap-2">
                  <Input placeholder="Digite sua mensagem..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                  <Button onClick={() => messageMutation.mutate({ ticketId: selectedTicketId!, message: newMessage })} disabled={!newMessage.trim() || messageMutation.isPending}><Send className="h-4 w-4" /></Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Meus Tickets</CardTitle><CardDescription>{tickets?.length || 0} ticket(s)</CardDescription></CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
              : tickets?.length > 0 ? (
                <div className="space-y-3">
                  {tickets.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedTicketId(t.id)}>
                      <div className="flex-1">
                        <h4 className="font-medium">{t.title}</h4>
                        <p className="text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={statusColors[t.status]}>{statusLabels[t.status]}</Badge>
                        <Badge className={priorityColors[t.priority]}>{priorityLabels[t.priority]}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12"><LifeBuoy className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="text-lg font-semibold">Nenhum ticket</h3><p className="text-sm text-muted-foreground mt-2">Abra um ticket para receber suporte</p></div>
              )}
            </CardContent>
          </Card>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader><DialogTitle>Novo Ticket de Suporte</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label htmlFor="title">Titulo *</Label><Input id="title" name="title" required /></div>
                <div className="grid gap-2"><Label htmlFor="description">Descricao *</Label><Textarea id="description" name="description" rows={4} required /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Prioridade</Label>
                    <Select name="priority" defaultValue="medium"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Media</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Critica</SelectItem></SelectContent></Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Categoria</Label>
                    <Select name="category" defaultValue="technical"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="technical">Tecnico</SelectItem><SelectItem value="billing">Cobranca</SelectItem><SelectItem value="feature_request">Sugestao</SelectItem><SelectItem value="bug">Bug</SelectItem><SelectItem value="other">Outro</SelectItem></SelectContent></Select>
                  </div>
                </div>
              </div>
              <DialogFooter><Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Criando..." : "Criar Ticket"}</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
