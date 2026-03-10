import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { trpc } from "@/lib/trpc";
import { Search, Calendar, Zap, Percent, ArrowUpDown } from "lucide-react";

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [extraDays, setExtraDays] = useState(7);
  const [discountPercent, setDiscountPercent] = useState(10);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");

  const detailQuery = (trpc as any).adminSubscriptions.adminGetSubscriptionDetails.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  const extendTrialMut = (trpc as any).adminSubscriptions.adminExtendTrial.useMutation({
    onSuccess: () => { toast({ title: "Trial estendido com sucesso" }); detailQuery.refetch(); setActiveDialog(null); setReason(""); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const activatePlanMut = (trpc as any).adminSubscriptions.adminActivatePlan.useMutation({
    onSuccess: () => { toast({ title: "Plano ativado com sucesso" }); detailQuery.refetch(); setActiveDialog(null); setReason(""); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const applyDiscountMut = (trpc as any).adminSubscriptions.adminApplyDiscount.useMutation({
    onSuccess: () => { toast({ title: "Desconto aplicado com sucesso" }); detailQuery.refetch(); setActiveDialog(null); setReason(""); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const forceChangeMut = (trpc as any).adminSubscriptions.adminForceChangePlan.useMutation({
    onSuccess: () => { toast({ title: "Plano alterado com sucesso" }); detailQuery.refetch(); setActiveDialog(null); setReason(""); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const handleSearch = () => setTenantId(searchInput.trim());

  const sub = detailQuery.data?.subscription;
  const tenant = detailQuery.data?.tenant;
  const plan = detailQuery.data?.plan;
  const availablePlans = detailQuery.data?.availablePlans || [];

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    trialing: "bg-blue-100 text-blue-800",
    past_due: "bg-yellow-100 text-yellow-800",
    canceled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gerenciar Assinaturas</h1>
        <p className="text-muted-foreground">Ajuste manual de assinaturas dos tenants</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Buscar Tenant</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input placeholder="ID do Tenant..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
            <Button onClick={handleSearch}>Buscar</Button>
          </div>
        </CardContent>
      </Card>

      {detailQuery.isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {tenant && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{tenant.name}</CardTitle>
              <CardDescription>CNPJ: {tenant.cnpj} | ID: {tenant.id}</CardDescription>
            </CardHeader>
            <CardContent>
              {sub ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={statusColors[sub.status] || ""}>{sub.status}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plano</p>
                    <p className="font-medium">{plan?.displayName || sub.planId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preço Atual</p>
                    <p className="font-medium">R$ {((sub.currentPrice || 0) / 100).toFixed(2)}/{sub.billingCycle === "yearly" ? "ano" : "mês"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Trial até</p>
                    <p className="font-medium">{sub.trialEnd ? new Date(sub.trialEnd).toLocaleDateString("pt-BR") : "N/A"}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Nenhuma assinatura encontrada.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveDialog("extendTrial")}>
              <CardContent className="pt-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="font-medium">Estender Trial</p>
                <p className="text-xs text-muted-foreground">Adicionar dias ao teste</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveDialog("activatePlan")}>
              <CardContent className="pt-6 text-center">
                <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="font-medium">Ativar Plano</p>
                <p className="text-xs text-muted-foreground">Ativar sem pagamento</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveDialog("applyDiscount")}>
              <CardContent className="pt-6 text-center">
                <Percent className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <p className="font-medium">Aplicar Desconto</p>
                <p className="text-xs text-muted-foreground">Reduzir preço</p>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveDialog("changePlan")}>
              <CardContent className="pt-6 text-center">
                <ArrowUpDown className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <p className="font-medium">Trocar Plano</p>
                <p className="text-xs text-muted-foreground">Upgrade / downgrade</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Extend Trial */}
      <Dialog open={activeDialog === "extendTrial"} onOpenChange={(o) => !o && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Estender Trial</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Dias extras</Label><Input type="number" value={extraDays} onChange={(e) => setExtraDays(Number(e.target.value))} min={1} max={365} /></div>
            <div className="grid gap-2"><Label>Motivo</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo do ajuste..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancelar</Button>
            <Button onClick={() => extendTrialMut.mutate({ tenantId, extraDays, reason })} disabled={!reason || extendTrialMut.isPending}>{extendTrialMut.isPending ? "Salvando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Plan */}
      <Dialog open={activeDialog === "activatePlan"} onOpenChange={(o) => !o && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ativar Plano</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Plano</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{availablePlans.map((pl: any) => <SelectItem key={pl.id} value={pl.id}>{pl.displayName} - R$ {((pl.monthlyPrice || 0) / 100).toFixed(2)}/mês</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Ciclo</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent></Select>
            </div>
            <div className="grid gap-2"><Label>Motivo</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancelar</Button>
            <Button onClick={() => activatePlanMut.mutate({ tenantId, planId: selectedPlanId, billingCycle, reason })} disabled={!reason || !selectedPlanId || activatePlanMut.isPending}>{activatePlanMut.isPending ? "Salvando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Discount */}
      <Dialog open={activeDialog === "applyDiscount"} onOpenChange={(o) => !o && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Aplicar Desconto</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2"><Label>Desconto (%)</Label><Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(Number(e.target.value))} min={1} max={100} /></div>
            <div className="grid gap-2"><Label>Motivo</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancelar</Button>
            <Button onClick={() => applyDiscountMut.mutate({ tenantId, discountPercent, reason })} disabled={!reason || applyDiscountMut.isPending}>{applyDiscountMut.isPending ? "Salvando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan */}
      <Dialog open={activeDialog === "changePlan"} onOpenChange={(o) => !o && setActiveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Trocar Plano</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Novo Plano</Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{availablePlans.map((pl: any) => <SelectItem key={pl.id} value={pl.id}>{pl.displayName} - R$ {((pl.monthlyPrice || 0) / 100).toFixed(2)}/mês</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Ciclo</Label>
              <Select value={billingCycle} onValueChange={setBillingCycle}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Mensal</SelectItem><SelectItem value="yearly">Anual</SelectItem></SelectContent></Select>
            </div>
            <div className="grid gap-2"><Label>Motivo</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)}>Cancelar</Button>
            <Button onClick={() => forceChangeMut.mutate({ tenantId, newPlanId: selectedPlanId, billingCycle, reason })} disabled={!reason || !selectedPlanId || forceChangeMut.isPending}>{forceChangeMut.isPending ? "Salvando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
