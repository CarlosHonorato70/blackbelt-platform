import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Ticket, Send, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { open: "Aberto", in_progress: "Em andamento", waiting_customer: "Aguardando", resolved: "Resolvido", closed: "Fechado" };
const statusColors: Record<string, string> = { open: "bg-blue-100 text-blue-800", in_progress: "bg-yellow-100 text-yellow-800", waiting_customer: "bg-orange-100 text-orange-800", resolved: "bg-green-100 text-green-800", closed: "bg-gray-100 text-gray-800" };
const priorityColors: Record<string, string> = { low: "bg-gray-100 text-gray-800", medium: "bg-blue-100 text-blue-800", high: "bg-orange-100 text-orange-800", critical: "bg-red-100 text-red-800" };

export default function AdminSupportTickets() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const utils = trpc.useUtils();

  const { data: tickets, isLoading } = (trpc as any).supportTickets.adminList.useQuery(statusFilter !== "all" ? { status: statusFilter } : undefined);
  const { data: stats } = (trpc as any).supportTickets.adminStats.useQuery();
  const detail = (trpc as any).supportTickets.adminGet.useQuery({ id: selectedId! }, { enabled: !!selectedId });

  const replyMutation = (trpc as any).supportTickets.adminReply.useMutation({
    onSuccess: () => { toast.success("Resposta enviada!"); setReplyMsg(""); utils.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const statusMutation = (trpc as any).supportTickets.adminUpdateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); utils.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const statsByStatus = stats?.byStatus?.reduce((acc: any, s: any) => ({ ...acc, [s.status]: Number(s.count) }), {}) || {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Tickets de Suporte (Admin)</h1>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {["open", "in_progress", "waiting_customer", "resolved", "closed"].map(s => (
            <Card key={s} className="cursor-pointer hover:border-primary" onClick={() => setStatusFilter(s)}>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{statsByStatus[s] || 0}</p>
                <p className="text-xs text-muted-foreground">{statusLabels[s]}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedId && detail.data ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}><ArrowLeft className="h-4 w-4 mr-1" />Voltar</Button>
                <div className="flex-1"><CardTitle>{detail.data.ticket.title}</CardTitle><CardDescription>Tenant: {detail.data.tenantName} | {detail.data.ticket.description}</CardDescription></div>
                <Select value={detail.data.ticket.status} onValueChange={(v) => statusMutation.mutate({ ticketId: selectedId, status: v })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {detail.data.messages?.map((m: any) => (
                  <div key={m.message.id} className={"p-3 rounded-lg " + (m.message.isInternal ? "bg-yellow-50 border border-yellow-200" : "bg-muted")}>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span className="font-medium">{m.userName || "Usuario"} {m.message.isInternal ? "(Nota interna)" : ""}</span>
                      <span>{new Date(m.message.createdAt).toLocaleString("pt-BR")}</span>
                    </div>
                    <p className="text-sm">{m.message.message}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><input type="checkbox" id="internal" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} /><label htmlFor="internal" className="text-sm">Nota interna (nao visivel ao cliente)</label></div>
                <div className="flex gap-2">
                  <Textarea placeholder="Digite sua resposta..." value={replyMsg} onChange={(e) => setReplyMsg(e.target.value)} rows={2} />
                  <Button onClick={() => replyMutation.mutate({ ticketId: selectedId, message: replyMsg, isInternal })} disabled={!replyMsg.trim() || replyMutation.isPending}><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Todos os Tickets</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Filtrar" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? <div className="flex justify-center py-8"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
              : tickets?.length > 0 ? (
                <div className="space-y-2">
                  {tickets.map((t: any) => (
                    <div key={t.ticket.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedId(t.ticket.id)}>
                      <div className="flex-1"><h4 className="font-medium text-sm">{t.ticket.title}</h4><p className="text-xs text-muted-foreground">{t.tenantName} - {t.userName} - {new Date(t.ticket.createdAt).toLocaleDateString("pt-BR")}</p></div>
                      <div className="flex gap-2"><Badge className={statusColors[t.ticket.status]}>{statusLabels[t.ticket.status]}</Badge><Badge className={priorityColors[t.ticket.priority]}>{t.ticket.priority}</Badge></div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-12"><Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p>Nenhum ticket encontrado</p></div>}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
